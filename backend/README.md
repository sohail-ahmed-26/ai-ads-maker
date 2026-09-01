# AI Ad Maker for Small Shops - Backend

This is the minimal backend structure for the AI Ad Maker for Small Shops project.

## Structure Overview

- `src/routes/`: Express API endpoints (upload, script, voice, subtitle, video).
- `src/services/`: Core logic for external integrations and processing.
- `src/utils/`: Shared utilities (e.g., FFmpeg wrapper).
- `uploads/`: Temporary/persistent storage for uploaded product images.
- `generated/`: Output directories for generated assets (scripts, audio, subtitles, video).

## Getting Started

1. Run `npm install` to install dependencies (express, cors, dotenv).
2. Set up your `.env` file (see `.env` for basic config).
3. Run `npm start` to start the server.
4. Run `npm run dev` to start the server in watch mode (requires Node >= 18.11 for `--watch`).
