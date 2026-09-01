import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { composeVideo } from '../utils/ffmpeg.utils.js';


let ai = null;

function getAI() {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Missing Gemini API Key — server configuration error.');
        }
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reads a text file and returns its trimmed content, or null if missing.
 */
async function readFile(dir, filename) {
    const filePath = path.join(process.cwd(), 'generated', dir, filename);
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content.trim() || null;
    } catch {
        return null;
    }
}

/**
 * Downloads a file from a URL and writes it to the local filesystem.
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fsSync.createWriteStream(destPath);
        protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                file.close();
                return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                return reject(new Error(`Failed to download video: HTTP ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(destPath); });
        }).on('error', (err) => {
            file.close();
            reject(new Error(`Download error: ${err.message}`));
        });
    });
}

/**
 * Validates that a generated file exists and has non-zero size.
 */
async function validateFile(filePath, label) {
    try {
        const stat = await fs.stat(filePath);
        if (stat.size === 0) throw new Error(`${label} file is empty (zero bytes).`);
    } catch (err) {
        if (err.code === 'ENOENT') throw new Error(`${label} file was not created.`);
        throw err;
    }
}

// ─── Main Service Functions ────────────────────────────────────────────────────

export const generateVideo = async (projectId, userInstructions) => {
    const api = getAI();

    // 1. Validate project ID
    if (!projectId || typeof projectId !== 'string' || projectId.includes('..') || projectId.includes('/')) {
        throw new Error('Invalid or missing project reference.');
    }

    // 2. Load approved voice (approved.txt contains the wav filename)
    const approvedAudioId = await readFile('audio', 'approved.txt');
    if (!approvedAudioId) {
        throw new Error('No approved voice found. Please approve a voice before generating video.');
    }

    const audioPath = path.join(process.cwd(), 'generated', 'audio', path.basename(approvedAudioId));
    try {
        await fs.access(audioPath);
    } catch {
        throw new Error('Approved voice file not found on disk.');
    }

    // 3. Load approved script text (approved.txt contains the actual script text, not a filename)
    const scriptText = await readFile('scripts', 'approved.txt');
    if (!scriptText) {
        throw new Error('No approved script found. Please approve a script before generating video.');
    }

    // 4. Load product image from uploads/ using the filename directly
    const safeImageFilename = path.basename(projectId); // projectId = backendFilename from upload
    const imagePath = path.join(process.cwd(), 'uploads', safeImageFilename);
    try {
        await fs.access(imagePath);
    } catch {
        throw new Error(`Product image not found: ${safeImageFilename}`);
    }

    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const ext = path.extname(safeImageFilename).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';


    // 5. Build the Veo prompt
    const safeInstructions = (userInstructions || '').replace(/[`$\\]/g, ''); // sanitize
    const videoPrompt = [
        `Create a professional 9:16 vertical product advertisement video.`,
        `The product is shown in the reference image. Animate it elegantly with cinematic movement.`,
        `Marketing context from the approved script: "${scriptText.slice(0, 300)}"`,
        safeInstructions ? `Additional direction: ${safeInstructions}` : '',
        `Style: Premium advertisement, smooth camera motion, beautiful lighting, commercial quality.`,
        `Do NOT add any spoken audio — the advertisement's narration will be added separately.`
    ].filter(Boolean).join('\n');

    // 6. Submit Veo generation (image-to-video)
    console.log('[Video Service] Submitting Veo generation request...');
    let operation;
    try {
        operation = await api.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            source: {
                prompt: videoPrompt,
                image: {
                    imageBytes: imageBase64,
                    mimeType: mimeType,
                }
            },
            config: {
                numberOfVideos: 1,
                durationSeconds: 8,
                aspectRatio: '9:16',
                resolution: '720p',
            }
        });
    } catch (err) {
        console.error('[Video Service] Veo generation error:', err.message);
        throw new Error(`Veo generation failed: ${err.message}`);
    }

    // 7. Poll the long-running operation
    console.log('[Video Service] Operation started. Polling for completion...');
    const maxPolls = 30;
    const pollIntervalMs = 10000; // 10 seconds
    let polls = 0;

    while (!operation.done && polls < maxPolls) {
        polls++;
        console.log(`[Video Service] Polling ${polls}/${maxPolls}...`);
        await new Promise(r => setTimeout(r, pollIntervalMs));
        try {
            operation = await api.operations.get(operation);
        } catch (err) {
            throw new Error(`Polling failed: ${err.message}`);
        }
    }

    if (!operation.done) {
        throw new Error('Video generation timed out. Please try again.');
    }

    // 8. Extract video URL from operation response
    const generatedVideos = operation.response?.generatedVideos;
    if (!generatedVideos || generatedVideos.length === 0) {
        throw new Error('Veo returned no generated videos. Possibly filtered by safety policy.');
    }

    const videoData = generatedVideos[0];
    // The video object may have .video.uri (a GCS URI) or .uri for Gemini Developer API
    const videoUri = videoData?.video?.uri || videoData?.uri;
    if (!videoUri) {
        throw new Error('No video URI in Veo response.');
    }

    // 9. Download visual video
    const timestamp = Date.now();
    const versionSuffix = Math.random().toString(36).substring(2, 8);
    const visualFileName = `visual-${projectId}-${timestamp}-${versionSuffix}.mp4`;
    const visualVideoPath = path.join(process.cwd(), 'generated', 'video', visualFileName);

    await fs.mkdir(path.dirname(visualVideoPath), { recursive: true });

    // Append API key for authenticated download from Gemini Developer API
    const downloadUrl = videoUri.includes('?')
        ? `${videoUri}&key=${process.env.GEMINI_API_KEY}`
        : `${videoUri}?key=${process.env.GEMINI_API_KEY}`;

    console.log('[Video Service] Downloading visual video...');
    await downloadFile(downloadUrl, visualVideoPath);
    await validateFile(visualVideoPath, 'Visual video');

    // 10. FFmpeg: compose final video (approved voice replaces/adds to video audio)
    const finalFileName = `final-${projectId}-${timestamp}-${versionSuffix}.mp4`;
    const finalVideoPath = path.join(process.cwd(), 'generated', 'video', finalFileName);

    // Check for subtitles
    const subtitleApprovedPath = path.join(process.cwd(), 'generated', 'subtitles', 'approved.srt');
    let subtitlePath = null;
    try {
        await fs.access(subtitleApprovedPath);
        subtitlePath = subtitleApprovedPath;
        console.log('[Video Service] Subtitle file found, will burn subtitles.');
    } catch {
        console.log('[Video Service] No subtitle file found, proceeding without subtitles.');
    }

    console.log('[Video Service] Running FFmpeg composition...');
    try {
        await composeVideo(visualVideoPath, audioPath, subtitlePath, finalVideoPath);
    } catch (err) {
        throw new Error(`FFmpeg composition failed: ${err.message}`);
    }

    await validateFile(finalVideoPath, 'Final video');

    const finalStat = await fs.stat(finalVideoPath);

    console.log(`[Video Service] Final video ready: ${finalFileName} (${finalStat.size} bytes)`);

    return {
        videoId: finalFileName,
        visualVideoId: visualFileName,
        version: timestamp,
        sizeBytes: finalStat.size,
    };
};

export const approveVideo = async (videoId) => {
    if (!videoId || typeof videoId !== 'string') {
        throw new Error('Invalid or missing video reference.');
    }

    const safeId = path.basename(videoId);
    const videoPath = path.join(process.cwd(), 'generated', 'video', safeId);
    try {
        await fs.access(videoPath);
    } catch {
        throw new Error('Video file not found.');
    }

    const approvedPointer = path.join(process.cwd(), 'generated', 'video', 'approved.txt');
    await fs.writeFile(approvedPointer, safeId, 'utf8');

    return { approvedId: safeId };
};
