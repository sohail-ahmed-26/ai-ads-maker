import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { composeVideo, getMediaDuration, concatenateClips } from '../utils/ffmpeg.utils.js';


let ai = null;

function getAI() {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Missing Veo API Key — server configuration error.');
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

    // 3. Load approved script text (try to load from audio metadata to ensure single source of truth)
    let scriptText;
    try {
        const metadataRaw = await readFile('audio', `${approvedAudioId}.json`);
        const metadata = JSON.parse(metadataRaw);
        scriptText = metadata.scriptText;
        console.log('[Video Service] Using single-source-of-truth script from audio metadata.');
    } catch (err) {
        console.warn('[Video Service] Voice metadata not found, falling back to global approved script.');
        scriptText = await readFile('scripts', 'approved.txt');
    }

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


    // 5. Calculate Voice Duration and Determine Scenes
    let voiceDuration = 5.0;
    try {
        voiceDuration = await getMediaDuration(audioPath);
        console.log(`[Video Service] Voice duration is ${voiceDuration.toFixed(2)} seconds.`);
    } catch (err) {
        console.warn('[Video Service] Could not determine voice duration, defaulting to 5s.', err.message);
    }
    
    // Wan creates ~5.37s clips. We'll divide into 5-second scenes to cover the voice length.
    const wanClipLimit = 5.0;
    const numScenes = Math.max(1, Math.ceil(voiceDuration / wanClipLimit));
    console.log(`[Video Service] Planning ${numScenes} scene(s) to cover the advertisement.`);

    const safeInstructions = (userInstructions || '').replace(/[`$\\]/g, '').trim();
    const hasMotionKeywords = /move|pan|zoom|tilt|dolly|rotate|push|pull|walk|run|turn|slide|cinematic|camera/i.test(safeInstructions);
    
    // Split script into chunks (roughly equal size by characters for simplicity, ideally by sentences but this works reliably)
    const scriptLength = scriptText.length;
    const chunkSize = Math.ceil(scriptLength / numScenes);

    const imagePrefix = `data:${mimeType};base64,`;
    const imageUri = imagePrefix + imageBase64;
    const videoUrls = [];

    for (let i = 0; i < numScenes; i++) {
        console.log(`[Video Service] Generating Scene ${i + 1}/${numScenes}...`);
        const chunkStart = i * chunkSize;
        const chunkEnd = Math.min(scriptLength, (i + 1) * chunkSize);
        const scriptSegment = scriptText.slice(chunkStart, chunkEnd);

        const fallbackMotion = hasMotionKeywords ? '' : 
            `Create a continuous cinematic advertisement shot. The camera performs a smooth, slow push-in toward the product while maintaining stable framing. Subtle natural movement continues in the background (e.g., light reflections changing, gentle breeze). The scene must evolve throughout the shot rather than remaining static.`;

        const sceneContext = `Scene ${i + 1} of ${numScenes}. Narrative context for this scene: "${scriptSegment}"`;
        
        const videoPrompt = [
            safeInstructions ? `${safeInstructions}` : '',
            fallbackMotion,
            sceneContext,
            ``,
            `Technical Rules:`,
            `- This is a video scene. The subject and environment must exhibit continuous visible motion throughout the clip. Do not produce a static image-like result.`,
            `- Generate continuous video motion with physically plausible movement.`,
            `- Preserve the identity, colors, and text of the product in the supplied image.`,
            `- Maintain temporal continuity with previous scenes.`,
            `- Do NOT add any spoken audio or text overlays.`
        ].filter(Boolean).join('\n');

        if (!process.env.WAN_API_KEY) {
            throw new Error('WAN_API_KEY is not set in the environment.');
        }

        const submitRes = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WAN_API_KEY}`,
                'X-DashScope-Async': 'enable',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'wan2.1-i2v-turbo',
                input: {
                    img_url: imageUri,
                    prompt: videoPrompt
                }
            })
        });

        const submitData = await submitRes.json();
        if (!submitRes.ok || submitData.code) {
            throw new Error(submitData.message || submitData.code || `Failed to submit Wan task for scene ${i+1}`);
        }
        
        const taskId = submitData.output.task_id;
        console.log(`[Video Service] Scene ${i + 1} Wan task submitted. Task ID: ${taskId}`);

        let sceneVideoUrl = null;
        let polls = 0;
        while (polls < 60) {
            polls++;
            if (polls % 3 === 0) console.log(`[Video Service] Scene ${i + 1} Polling ${polls}/60...`);
            await new Promise(r => setTimeout(r, 10000));
            
            const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${process.env.WAN_API_KEY}` }
            });
            const pollData = await pollRes.json();
            
            if (pollData.output.task_status === 'SUCCEEDED') {
                sceneVideoUrl = pollData.output.video_url;
                break;
            } else if (pollData.output.task_status === 'FAILED' || pollData.output.task_status === 'UNKNOWN') {
                throw new Error(pollData.output.message || pollData.output.code || `Wan task failed for scene ${i+1}`);
            }
        }
        if (!sceneVideoUrl) throw new Error(`Scene ${i+1} timed out.`);
        videoUrls.push(sceneVideoUrl);
    }

    // 9. Download visual video clips and concatenate
    const timestamp = Date.now();
    const versionSuffix = Math.random().toString(36).substring(2, 8);
    const visualFileName = `visual-${projectId}-${timestamp}-${versionSuffix}.mp4`;
    const visualVideoPath = path.join(process.cwd(), 'generated', 'video', visualFileName);

    await fs.mkdir(path.dirname(visualVideoPath), { recursive: true });

    console.log(`[Video Service] Downloading ${videoUrls.length} visual clip(s)...`);
    const clipPaths = [];
    for (let i = 0; i < videoUrls.length; i++) {
        const clipPath = path.join(process.cwd(), 'generated', 'video', `clip-${i}-${timestamp}.mp4`);
        await downloadFile(videoUrls[i], clipPath);
        await validateFile(clipPath, `Visual clip ${i+1}`);
        clipPaths.push(clipPath);
    }

    if (clipPaths.length > 1) {
        console.log('[Video Service] Concatenating clips...');
        try {
            await concatenateClips(clipPaths, visualVideoPath);
            // clean up individual clips
            for (const cp of clipPaths) {
                try { await fs.unlink(cp); } catch (e) {}
            }
        } catch (err) {
            throw new Error(`Failed to concatenate scenes: ${err.message}`);
        }
    } else {
        // Just rename the single clip
        await fs.rename(clipPaths[0], visualVideoPath);
    }
    await validateFile(visualVideoPath, 'Master visual video');

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
