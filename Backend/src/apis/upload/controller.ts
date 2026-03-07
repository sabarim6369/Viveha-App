import { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadProfilePicture = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        // Generate the URL for the uploaded file
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            profileUrl: fileUrl,
            filename: req.file.filename,
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture',
            error: error.message,
        });
    }
};
