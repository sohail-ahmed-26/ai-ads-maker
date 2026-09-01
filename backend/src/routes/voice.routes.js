import { Router } from 'express';
import { generateVoice, approveVoice } from '../services/voice.service.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// Generate voice from the approved script.
router.post('/generate', async (req, res) => {
    try {
        const { scriptId } = req.body;
        if (!scriptId) {
            return res.status(400).json({ success: false, message: 'Missing approved script reference.' });
        }
        
        const result = await generateVoice(scriptId);
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Voice Route Error]', err.message);
        const status = err.message.includes('not found') || err.message.includes('Invalid') || err.message.includes('Missing') || err.message.includes('empty') ? 400 : 500;
        return res.status(status).json({ success: false, message: err.message });
    }
});

// Regenerate voice (Try Again).
router.post('/regenerate', async (req, res) => {
    try {
        const { scriptId } = req.body;
        if (!scriptId) {
            return res.status(400).json({ success: false, message: 'Missing approved script reference.' });
        }
        
        const result = await generateVoice(scriptId);
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Voice Route Error]', err.message);
        const status = err.message.includes('not found') || err.message.includes('Invalid') || err.message.includes('Missing') || err.message.includes('empty') ? 400 : 500;
        return res.status(status).json({ success: false, message: err.message });
    }
});

// Voice approval workflow.
router.post('/approve', async (req, res) => {
    try {
        const { audioId } = req.body;
        if (!audioId) {
            return res.status(400).json({ success: false, message: 'Missing audio reference.' });
        }
        
        const result = await approveVoice(audioId);
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Voice Route Error]', err.message);
        const status = err.message.includes('not found') || err.message.includes('Invalid') || err.message.includes('Missing') ? 400 : 500;
        return res.status(status).json({ success: false, message: err.message });
    }
});

// Safely serve audio files.
router.get('/audio/:audioId', (req, res) => {
    const { audioId } = req.params;
    if (!audioId) {
        return res.status(400).send('Invalid audio reference');
    }
    
    // Prevent directory traversal
    const safeAudioId = path.basename(audioId);
    const audioPath = path.join(process.cwd(), 'generated', 'audio', safeAudioId);
    
    // Check if file exists
    if (!fs.existsSync(audioPath)) {
        return res.status(404).send('Audio file not found');
    }
    
    // Set proper content type based on extension
    if (audioPath.endsWith('.wav')) {
        res.setHeader('Content-Type', 'audio/wav');
    } else if (audioPath.endsWith('.mp3')) {
        res.setHeader('Content-Type', 'audio/mp3');
    } else {
        res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    res.sendFile(audioPath);
});

export default router;
