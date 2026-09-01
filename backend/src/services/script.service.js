import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const UPLOADS_DIR = path.resolve('uploads');
const SCRIPTS_DIR = path.resolve('generated/scripts');

// Determine mime type from extension
const getMimeType = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
};

/**
 * Calls Gemini to generate a marketing script based on the product photo and description.
 */
export const generateScript = async (filename, description) => {
    if (!filename || !description) {
        const err = new Error('Missing project/upload reference or description.');
        err.statusCode = 400;
        throw err;
    }

    const imagePath = path.join(UPLOADS_DIR, filename);
    let imageBuffer;
    try {
        imageBuffer = await fs.readFile(imagePath);
    } catch (err) {
        const e = new Error('Product image not found on server.');
        e.statusCode = 400;
        throw e;
    }

    // Initialize Gemini SDK
    if (!process.env.GEMINI_API_KEY) {
        const err = new Error('AI provider unavailable.');
        err.statusCode = 500;
        throw err;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `You are an expert marketing copywriter for small shops. 
Write a short, punchy, 30-second video marketing script based ONLY on the provided product description and visual details of the attached product photo. 
Do NOT invent false facts, prices, discounts, certifications, or guarantees unless they are explicitly provided in the description. 
Do NOT include visual cues like [Upbeat music playing] or [Camera pans], just output the spoken text.
Make it sound energetic, professional, and appealing.`;

    const prompt = `Product Description: ${description}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                systemInstruction,
                prompt,
                { inlineData: { data: imageBuffer.toString('base64'), mimeType: getMimeType(filename) } }
            ]
        });

        let scriptContent = response.text || '';
        scriptContent = scriptContent.trim();
        
        if (!scriptContent) {
            throw new Error('AI returned an empty response.');
        }

        // Save generated script
        await fs.mkdir(SCRIPTS_DIR, { recursive: true });
        const scriptId = `script-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.txt`;
        const scriptPath = path.join(SCRIPTS_DIR, scriptId);
        await fs.writeFile(scriptPath, scriptContent, 'utf-8');

        return {
            scriptId,
            script: scriptContent
        };
    } catch (err) {
        console.error('[Gemini AI Error]', err);
        const e = new Error('AI provider failure.');
        e.statusCode = 502; // Bad Gateway / Upstream failure
        throw e;
    }
};

/**
 * Approves a previously generated script so it's ready for the Voice phase.
 */
export const approveScript = async (scriptId) => {
    if (!scriptId) {
        const err = new Error('Invalid or missing script reference.');
        err.statusCode = 400;
        throw err;
    }

    const scriptPath = path.join(SCRIPTS_DIR, scriptId);
    let scriptContent;
    try {
        scriptContent = await fs.readFile(scriptPath, 'utf-8');
    } catch (err) {
        const e = new Error('Script version not found.');
        e.statusCode = 400;
        throw e;
    }

    // Save as the approved version for the next phase
    const approvedPath = path.join(SCRIPTS_DIR, 'approved.txt');
    await fs.writeFile(approvedPath, scriptContent, 'utf-8');

    return { approvedId: scriptId };
};
