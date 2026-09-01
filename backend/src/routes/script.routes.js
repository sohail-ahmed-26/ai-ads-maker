import { Router } from 'express';
import { generateScript, approveScript } from '../services/script.service.js';

const router = Router();

// Helper to catch async errors in routes
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        console.error('[Script Route Error]', err.message || err);
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: err.message || 'An internal server error occurred.'
        });
    });
};

// POST /api/script/generate - Generate a new script
router.post('/generate', asyncHandler(async (req, res) => {
    const { filename, description } = req.body;
    const result = await generateScript(filename, description);
    
    res.status(200).json({
        success: true,
        data: result
    });
}));

// POST /api/script/regenerate - Generate a new version of the script (same logic)
router.post('/regenerate', asyncHandler(async (req, res) => {
    const { filename, description } = req.body;
    const result = await generateScript(filename, description);
    
    res.status(200).json({
        success: true,
        data: result
    });
}));

// POST /api/script/approve - Approve a generated script for the next stage
router.post('/approve', asyncHandler(async (req, res) => {
    const { scriptId } = req.body;
    const result = await approveScript(scriptId);
    
    res.status(200).json({
        success: true,
        data: result
    });
}));

export default router;
