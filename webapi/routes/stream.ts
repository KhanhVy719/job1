import express from 'express';
import StreamController from '../app/plugin/cdn/Stream';
// Assuming Play is in this location, adjust if needed
import Play from '../app/plugin/cdn/Play'; 

const router = express.Router();


router.get(
 '/play/:episodeId', 
 Play.getSecuredEpisodeData 
);

router.get("/stream/:encryptedToken", StreamController.handleStream);

router.get("/stream/:encryptedToken/seg/*", StreamController.streamSegment); 

export default router;