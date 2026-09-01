import { spawn } from 'child_process';
import fs from 'fs';

export const composeVideo = (visualPath, voicePath, subtitlePath, outputPath) => {
    return new Promise((resolve, reject) => {
        const args = [];
        args.push('-y'); // Overwrite output
        args.push('-i', visualPath);
        args.push('-i', voicePath);
        
        args.push('-map', '0:v:0');
        args.push('-map', '1:a:0');
        
        let filterComplex = null;
        if (subtitlePath && fs.existsSync(subtitlePath)) {
            // Escape path for Windows FFmpeg
            const escapedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
            filterComplex = `subtitles='${escapedSubPath}'`;
        }
        
        if (filterComplex) {
            args.push('-vf', filterComplex);
        }
        
        args.push('-c:v', 'libx264');
        args.push('-c:a', 'aac');
        
        // The project requirement says:
        // "If the visual is longer than the narration... create a sensible final composition."
        // "-shortest" cuts the video when the audio stops. This satisfies the requirement cleanly.
        args.push('-shortest');
        
        args.push(outputPath);

        const child = spawn('ffmpeg', args);
        
        let stderr = '';
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('error', (err) => {
            if (err.code === 'ENOENT') {
                return reject(new Error('Server configuration error: FFmpeg is not installed or unavailable in PATH.'));
            }
            reject(new Error(`FFmpeg processing failure: ${err.message}`));
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve(outputPath);
            } else {
                console.error('[FFmpeg Processing Error Log]', stderr);
                reject(new Error(`FFmpeg processing failure: Process exited with code ${code}`));
            }
        });
    });
};
