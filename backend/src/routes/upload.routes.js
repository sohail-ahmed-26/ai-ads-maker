import { Router } from 'express';
import multer from 'multer';
import { validateAndStoreUpload } from '../services/upload.service.js';

const router = Router();

// Configure multer for in-memory storage (we validate strictly before saving)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB hard limit at the parser level
    }
});

// Route to receive product photo and one-line product description.
router.post('/', (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.error('[Upload Error]', err.message);
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File is too large. Maximum size is 5MB.'
                });
            }
            return res.status(500).json({
                success: false,
                message: err.message || 'An internal server error occurred.'
            });
        }

        try {
        // Multer puts the file in req.file and text fields in req.body
        const file = req.file;
        const description = req.body.description;

        const result = await validateAndStoreUpload(file, description);

        return res.status(200).json({
            success: true,
            message: 'Product data uploaded successfully',
            data: result
        });
        } catch (error) {
            console.error('[Upload Error]', error.message);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                success: false,
                message: error.message || 'An internal server error occurred.'
            });
        }
    });
});

export default router;
