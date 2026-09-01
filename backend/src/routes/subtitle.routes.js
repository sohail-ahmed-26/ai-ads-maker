import { Router } from 'express';
const router = Router();

// Prepare/manage English subtitles.
router.post('/generate', (req, res) => {
    res.json({ message: 'Subtitle generate route placeholder' });
});

export default router;
