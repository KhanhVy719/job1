import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import MovieController from '../app/controller/film/movie';
import MetaController from '../app/controller/catalog/meta';
import AdminController from '../app/controller/admin/AdminController';
import HlsProxyController from '../app/controller/admin/HlsProxyController';
import DirectPlayController from '../app/controller/admin/DirectPlayController';

import Play from '../app/plugin/cdn/Play';
import UploadController from '../app/plugin/upload/tiktok';
import StreamController from '../app/plugin/cdn/Stream';

const router = express.Router();


const TMP_DIR = path.join(process.cwd(), "tmp");

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

const uploadMiddleware = multer({
  dest: TMP_DIR,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024, // Giới hạn 4GB (tùy chỉnh nếu cần)
  },
});

router.get('/movie/:tmdb/get',  MovieController.get);
router.get('/movie/list',  MovieController.list);
router.get('/category/list', MetaController.getAllCategories);
router.get('/country/list', MetaController.getAllCountries);
router.get('/admin/stats', AdminController.stats);
router.get('/admin/users', AdminController.users);
router.get('/admin/movies/uploaded', AdminController.uploadedMovies);
router.get('/admin/movies/:movieId/uploaded-episodes', AdminController.uploadedEpisodes);
router.delete('/admin/episodes/:episodeId/videos', AdminController.clearEpisodeVideos);
router.get('/upload/jobs', UploadController.jobs);
router.post('/upload/jobs/:jobId/cancel', UploadController.cancelJob);
router.get('/hls-proxy/playlist', HlsProxyController.playlist);
router.get('/hls-proxy/jw-direct-playlist', HlsProxyController.jwDirectPlaylist);
router.get('/hls-proxy/segment', HlsProxyController.segment);
router.post('/direct-play/session', DirectPlayController.session);
router.get('/direct-play/session', DirectPlayController.session);
router.get('/direct-play/playlist', DirectPlayController.playlist);
router.get('/direct-play/segment-meta', DirectPlayController.segmentMeta);
router.get('/direct-play/key/:jobId', DirectPlayController.key);

router.post('/movie/upload', MovieController.upload);
router.get('/', MetaController.index);


router.get(
  '/play/:episodeId', 
  Play.getSecuredEpisodeData // Hàm xử lý logic lấy data và ký URL
);

router.post(
  '/upload', 
  uploadMiddleware.single('video'), // 'video' là tên field trong FormData
  UploadController.upload
);

router.post(
  '/upload/jobs',
  uploadMiddleware.single('video'),
  UploadController.enqueue
);

router.get(
  '/key/:jobId', 
  UploadController.getKey
);


export default router;
