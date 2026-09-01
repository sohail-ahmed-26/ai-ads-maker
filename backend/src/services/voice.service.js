import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';

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

export const generateVoice = async (scriptId) => {
    try {
        // 1. Verify and read the approved script
        if (!scriptId) {
            throw new Error('Invalid script reference');
        }

        const scriptPath = path.join(process.cwd(), 'generated', 'scripts', path.basename(scriptId));
        let scriptText;
        try {
            scriptText = await fs.readFile(scriptPath, 'utf8');
        } catch (err) {
            console.error('Error reading script:', err);
            throw new Error('Script version not found');
        }

        if (!scriptText || scriptText.trim() === '') {
            throw new Error('Approved script is empty');
        }

        // 2. Setup Gemini TTS request using Interactions API
        const api = getAI();
        const systemInstruction = "Speak cheerfully and professionally: ";

        const interaction = await api.interactions.create({
            model: 'gemini-3.1-flash-tts-preview',
            input: `${systemInstruction}${scriptText}`,
            response_format: { type: 'audio' },
            generation_config: {
                speech_config: [
                    { voice: 'Kore' } // Supported default voice
                ]
            }
        });

        // 3. Extract the audio
        if (!interaction.output_audio || !interaction.output_audio.data) {
            throw new Error('No audio data returned from Gemini TTS.');
        }

        // 4. Decode base64 PCM and construct a valid WAV file
        const pcmBuffer = Buffer.from(interaction.output_audio.data, 'base64');
        const sampleRate = interaction.output_audio.sample_rate || 24000;
        const numChannels = interaction.output_audio.channels || 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataLength = pcmBuffer.length;

        // Create 44-byte WAV header
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + dataLength, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
        wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
        wavHeader.writeUInt16LE(numChannels, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(byteRate, 28);
        wavHeader.writeUInt16LE(blockAlign, 32);
        wavHeader.writeUInt16LE(bitsPerSample, 34);
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(dataLength, 40);

        const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

        const ext = 'wav';
        const timestamp = Date.now();
        const versionSuffix = Math.random().toString(36).substring(2, 10);
        const audioFileName = `voice-${timestamp}-${versionSuffix}.${ext}`;
        const audioPath = path.join(process.cwd(), 'generated', 'audio', audioFileName);

        await fs.mkdir(path.dirname(audioPath), { recursive: true });
        await fs.writeFile(audioPath, wavBuffer);

        return {
            audioId: audioFileName,
            version: timestamp, // Using timestamp as version
            audioUrl: `/api/voice/audio/${audioFileName}`,
            format: ext
        };

    } catch (err) {
        console.error('[Voice Service Error]', err.message);
        if (err.message.includes('API Key') || err.message.includes('Script version not found') || err.message.includes('Invalid script reference') || err.message.includes('empty')) {
            throw err;
        }
        throw new Error('AI provider failure.');
    }
};

export const approveVoice = async (audioId) => {
    if (!audioId) {
        throw new Error('Invalid or missing audio reference.');
    }
    
    const audioPath = path.join(process.cwd(), 'generated', 'audio', path.basename(audioId));
    try {
        await fs.access(audioPath);
    } catch(err) {
        throw new Error('Audio version not found.');
    }
    
    const approvedFilePath = path.join(process.cwd(), 'generated', 'audio', 'approved.txt');
    await fs.writeFile(approvedFilePath, audioId, 'utf8');

    return {
        approvedId: audioId
    };
};
