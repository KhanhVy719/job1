import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import MovieController from '../app/controller/film/movie';
import MetaController from '../app/controller/catalog/meta';

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

router.post('/movie/upload', MovieController.upload);
router.get('/', MetaController.index);
router.get('/hello', MetaController.index2);



router.post(
  '/upload', 
  uploadMiddleware.single('video'), // 'video' là tên field trong FormData
  UploadController.upload
);

router.get(
  '/key/:jobId', 
  UploadController.getKey
);


export default router;