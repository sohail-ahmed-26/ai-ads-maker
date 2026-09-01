import express from 'express';
import cors from 'cors';

// Import Routes
import uploadRoutes from './routes/upload.routes.js';
import scriptRoutes from './routes/script.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import subtitleRoutes from './routes/subtitle.routes.js';
import videoRoutes from './routes/video.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/script', scriptRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/subtitle', subtitleRoutes);
app.use('/api/video', videoRoutes);

// Base route for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

export default app;
