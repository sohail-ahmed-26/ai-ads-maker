import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

let ai = null;

function getAI() {
    if (!ai) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Missing Gemini API Key');
        }
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
}

export const generateSubtitles = async (audioId) => {
    try {
        const audioPath = path.join(process.cwd(), 'generated', 'audio', path.basename(audioId));
        let audioBuffer;
        try {
            audioBuffer = await fs.readFile(audioPath);
        } catch (err) {
            throw new Error('Audio file not found.');
        }

        const metadataPath = path.join(process.cwd(), 'generated', 'audio', `${path.basename(audioId)}.json`);
        let scriptText;
        try {
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            scriptText = metadata.scriptText;
        } catch (err) {
            console.warn('[Subtitle Service] Voice metadata not found, falling back to global approved script.');
            const scriptPath = path.join(process.cwd(), 'generated', 'scripts', 'approved.txt');
            scriptText = await fs.readFile(scriptPath, 'utf8');
        }

        const api = getAI();
        const systemInstruction = `You are a precise transcription and translation AI. 
Generate a valid .srt file for this audio and script.
If the audio is in Roman Urdu, translate it into natural English for the subtitles.
Use standard SRT format:
1
00:00:00,000 --> 00:00:02,500
Subtitle text here

The subtitles must be accurately timed to the provided audio. Do not output anything except the SRT content.`;

        const response = await api.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                systemInstruction,
                `Original Script: ${scriptText}`,
                {
                    inlineData: {
                        data: audioBuffer.toString('base64'),
                        mimeType: 'audio/wav'
                    }
                }
            ]
        });

        let srtContent = response.text || '';
        srtContent = srtContent.replace(/```srt\n/g, '').replace(/```/g, '').trim();

        const subtitlesPath = path.join(process.cwd(), 'generated', 'subtitles', 'approved.srt');
        await fs.mkdir(path.dirname(subtitlesPath), { recursive: true });
        await fs.writeFile(subtitlesPath, srtContent, 'utf-8');

        return { subtitles: srtContent };
    } catch (err) {
        console.error('[Subtitle Service Error]', err.message);
        throw new Error('Failed to generate subtitles: ' + err.message);
    }
};
