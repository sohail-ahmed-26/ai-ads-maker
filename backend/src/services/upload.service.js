import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.resolve('uploads');
const ALLOWED_MIME_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates the upload payload and securely stores the image.
 * 
 * @param {Object} file - Multer file object (memory storage)
 * @param {string} description - Product description
 * @returns {Promise<Object>} - The saved file info and trimmed description
 */
export const validateAndStoreUpload = async (file, description) => {
    // 1. Description Validation
    if (!description || typeof description !== 'string') {
        const err = new Error('Product description is required.');
        err.statusCode = 400;
        throw err;
    }
    
    const trimmedDesc = description.trim();
    if (trimmedDesc.length === 0) {
        const err = new Error('Product description cannot be empty.');
        err.statusCode = 400;
        throw err;
    }

    if (trimmedDesc.length > 500) {
        const err = new Error('Product description is too long.');
        err.statusCode = 400;
        throw err;
    }

    // 2. File Validation
    if (!file) {
        const err = new Error('Product photo is required.');
        err.statusCode = 400;
        throw err;
    }

    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
        const err = new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
        err.statusCode = 400;
        throw err;
    }

    if (file.size > MAX_FILE_SIZE) {
        const err = new Error('File is too large. Maximum size is 5MB.');
        err.statusCode = 400;
        throw err;
    }

    // 3. Secure Storage
    // Ensure the uploads directory exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    // Generate safe filename to prevent path traversal and overwrites
    const ext = ALLOWED_MIME_TYPES[file.mimetype];
    const safeFilename = `${crypto.randomUUID()}${ext}`;
    const targetPath = path.join(UPLOADS_DIR, safeFilename);

    // Save from memory buffer to disk
    await fs.writeFile(targetPath, file.buffer);

    return {
        filename: safeFilename,
        originalName: file.originalname,
        description: trimmedDesc,
        size: file.size,
        mimetype: file.mimetype
    };
};
