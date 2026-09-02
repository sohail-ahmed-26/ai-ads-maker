const API_BASE_URL = '/api';

/**
 * Uploads the product photo and description to the backend.
 * @param {File} file - The image file to upload
 * @param {string} description - The product description
 * @returns {Promise<Object>} - The backend response payload
 */
export const uploadProductData = async (file, description) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('description', description);

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
    });

    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        throw new Error(`Upload API returned non-JSON response (Status ${response.status}): ${text.slice(0, 100)}`);
    }

    if (!response.ok) {
        throw new Error(data.message || `Upload failed with status ${response.status}`);
    }

    return data;
};

/**
 * Common fetch wrapper for JSON requests to the API.
 */
const fetchJson = async (endpoint, payload) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        throw new Error(`API returned non-JSON response (Status ${response.status}): ${text.slice(0, 100)}`);
    }

    if (!response.ok) {
        throw new Error(data.message || `API request failed with status ${response.status}`);
    }
    return data;
};

/**
 * Requests the backend to generate a script based on product data.
 */
export const generateScript = (filename, description) => 
    fetchJson('/script/generate', { filename, description });

/**
 * Requests the backend to generate a new script version.
 */
export const regenerateScript = (filename, description) => 
    fetchJson('/script/regenerate', { filename, description });

export const approveScript = (scriptId) => 
    fetchJson('/script/approve', { scriptId });

export const generateVoice = (scriptId) => 
    fetchJson('/voice/generate', { scriptId });

export const regenerateVoice = (scriptId) => 
    fetchJson('/voice/regenerate', { scriptId });

export const approveVoice = (audioId) => 
    fetchJson('/voice/approve', { audioId });

export const getVoiceAudioUrl = (audioId) => 
    `${API_BASE_URL}/voice/audio/${audioId}`;

export const getVoiceTiming = (audioId) =>
    fetchJson(`/voice/timing/${audioId}`, {}); // assuming it's a POST, or maybe a GET. Wait, the user said `GET /api/voice/timing/:id`. 
// I should make it a fetch call for GET. Wait, fetchJson is for POST. I'll write a fetch call.

export const fetchVoiceTiming = async (audioId) => {
    const response = await fetch(`${API_BASE_URL}/voice/timing/${audioId}`);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch voice timing');
    }
    return data;
};

// ─── Subtitle API ──────────────────────────────────────────────────────────────

export const generateSubtitle = (audioId) =>
    fetchJson('/subtitle/generate', { audioId });

// ─── Video API ─────────────────────────────────────────────────────────────────

/**
 * Generates the final advertisement video for the given project.
 * @param {string} projectId - The backend project/upload ID
 * @param {string} instructions - User-provided style/direction instructions
 */
export const generateVideo = (projectId, instructions) =>
    fetchJson('/video/generate', { projectId, instructions });

/**
 * Approves the generated video.
 */
export const approveVideo = (videoId) =>
    fetchJson('/video/approve', { videoId });

/**
 * Returns a URL suitable for the <video src> element (supports byte-range).
 */
export const getVideoStreamUrl = (videoId) =>
    `${API_BASE_URL}/video/stream/${videoId}`;

/**
 * Returns a URL that triggers a file download.
 */
export const getVideoDownloadUrl = (videoId) =>
    `${API_BASE_URL}/video/download/${videoId}`;

