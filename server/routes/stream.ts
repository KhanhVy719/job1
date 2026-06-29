import express from 'express';
import StreamController from '../app/plugin/cdn/Stream';
// Assuming Play is in this location, adjust if needed
import Play from '../app/plugin/cdn/Play'; 

const router = express.Router();

// --- Main Routes ---

// 1. Route to get the initial secure/encrypted token
router.get(
 '/play/:episodeId', 
 Play.getSecuredEpisodeData // Handles fetching data and generating the encrypted token
);

// 2. Route for the initial HLS manifest request (index.m3u8 or similar)
// This is handled by StreamController.handleStream to fetch and rewrite the manifest.
router.get("/stream/:encryptedToken", StreamController.handleStream);

// 3. Route for all subsequent segment (.ts) and child playlist (.m3u8) requests
// This must be routed to streamSegment to download/proxy the actual media file.
// The '*' wildcard allows matching the filename (e.g., 'segment001.ts', '360p.m3u8')
router.get("/stream/:encryptedToken/seg/*", StreamController.streamSegment); // <-- FIX APPLIED HERE

export default router;