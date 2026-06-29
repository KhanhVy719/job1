import express from 'express';
import StreamController from '../app/plugin/cdn/Stream';
// Assuming Play is in this location, adjust if needed
import Play from '../app/plugin/cdn/Play'; 
const router = express.Router();

router.get('/captcha/t/:slug', Play.getFilm);
router.get('/captcha/t', Play.getFilm);
router.get('/captcha/:slug', Play.getFilm);

router.get("/stream/:encryptedToken", StreamController.handleStream);

router.get("/stream/:encryptedToken/seg/*", StreamController.streamSegment); // <-- FIX APPLIED HERE

export default router;