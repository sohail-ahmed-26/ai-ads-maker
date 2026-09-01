import { Router } from 'express';
import { generateVideo, approveVideo } from '../services/video.service.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// ─── POST /api/video/generate ─────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
    try {
        const { projectId, instructions } = req.body;
        if (!projectId) {
            return res.status(400).json({ success: false, message: 'Missing project reference.' });
        }

        const result = await generateVideo(projectId, instructions || '');
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Video Route Error]', err.message);
        const isClientError = [
            'Invalid', 'Missing', 'not found', 'No approved', 'timed out'
        ].some(w => err.message.includes(w));
        return res.status(isClientError ? 400 : 500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/video/approve ──────────────────────────────────────────────────
router.post('/approve', async (req, res) => {
    try {
        const { videoId } = req.body;
        if (!videoId) {
            return res.status(400).json({ success: false, message: 'Missing video reference.' });
        }

        const result = await approveVideo(videoId);
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error('[Video Route Error]', err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
});

// ─── GET /api/video/stream/:videoId ──────────────────────────────────────────
router.get('/stream/:videoId', (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        return res.status(400).send('Invalid video reference.');
    }

    const safeId = path.basename(videoId);
    const videoPath = path.join(process.cwd(), 'generated', 'video', safeId);

    if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Video file not found.');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    if (range) {
        // Byte-range support for browser video seeking
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Length', chunkSize);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        fs.createReadStream(videoPath, { start, end }).pipe(res);
    } else {
        res.setHeader('Content-Length', fileSize);
        fs.createReadStream(videoPath).pipe(res);
    }
});

// ─── GET /api/video/download/:videoId ────────────────────────────────────────
router.get('/download/:videoId', (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        return res.status(400).send('Invalid video reference.');
    }

    const safeId = path.basename(videoId);
    const videoPath = path.join(process.cwd(), 'generated', 'video', safeId);

    if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Video file not found.');
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${safeId}"`);
    fs.createReadStream(videoPath).pipe(res);
});

export default router;
