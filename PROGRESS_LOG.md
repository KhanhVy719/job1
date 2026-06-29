# 📋 NHẬT KÝ TIẾN TRÌNH — Dự án Rophim

> Ghi lại toàn bộ công việc đã thực hiện, theo thứ tự thời gian từ đầu đến cuối.
> Cập nhật lần cuối: 2026-06-27 (Giai đoạn 8 — VidSrc embed + TikTok manual upload)

---

## 🗂️ Bối cảnh dự án

**Rophim** là hệ thống xem phim streaming, kiến trúc đa project trong một thư mục gốc `D:\rophim`:

| Project | Vai trò |
|---------|---------|
| `client` | Frontend người dùng (Next.js) |
| `admin`  | Trang quản trị (Next.js) |
| `server` | Backend API chính (Express + TypeScript) |
| `webapi` | Backend API phụ (Express + TypeScript) |
| `cdn`    | Service phân phối nội dung/video (Express + TypeScript) |
| `seggay` | Khu vực làm việc/thử nghiệm (có git) |

Tất cả service dùng chung **một MongoDB** (database `rophim`) qua Mongoose ODM.

---

## ⏱️ Dòng thời gian công việc

### Giai đoạn 1 — Test TikTok HLS bị lỗi & lấy `seggay` để bưng vào project

- Test luồng upload/stream **TikTok HLS** thì gặp lỗi.
- Lấy project `seggay` (bản thử nghiệm chạy ổn) ra để đối chiếu, rồi "bưng" phần xử lý phù hợp vào project chính.
- Từ đó xác định tính năng đầu tiên cần port: **adaptive MB-based segmenting** (chia segment video theo dung lượng).

---

### Giai đoạn 2 — Port tính năng "Adaptive MB-based Segmenting" (Chia segment theo dung lượng)

**Mục tiêu:** Chỉ port tính năng được khuyến nghị **đầu tiên** — chia segment video theo dung lượng MB thay vì cố định.

**Đã làm:**
- Thêm vào **cả 2 file** `TiktokService.ts`:
  - `server/services/TiktokService.ts`
  - `server/app/plugin/upload/tiktok/services/TiktokService.ts`
- Các helper mới: `positiveNumber()`, `mbToBytes()`, `buildSizingPolicy()`.
- `processJob` giờ tính `seg = policy.selectedSegmentDuration` kèm **vòng lặp retry-shrink 3 lần** (tự co nhỏ segment nếu vượt ngưỡng).
- `probeVideo` trả thêm `bitrate`.
- Controller `server/app/plugin/upload/tiktok/index.ts` truyền `metadata.bitrate` làm tham số thứ 5.

**Verify:** Cả 2 file pass `tsc` → **EXIT 0**.

**Xử lý sự cố trong quá trình:**
- Edit báo "String to replace not found" do context dịch chuyển sau lần sửa đầu → đọc lại vùng code hiện tại (dòng 409–538) rồi áp lại edit.
- EnterWorktree tạo worktree trong git repo `seggay` nhưng file đích nằm ở `D:\rophim\server` (không thuộc git) → ExitWorktree và sửa trực tiếp tại chỗ (đúng theo hướng dẫn harness).

---

### Giai đoạn 3 — Phân tích cơ sở dữ liệu

**Yêu cầu:** "phân tích csdl trong đây đi"

**Đã làm:** Dùng subagent quét toàn bộ model, tổng hợp:
- 5 service dùng chung 1 MongoDB.
- Các collection: Movie (hub trung tâm), Season, Episode, User, Playlist, Actor, Category, Country, Studio.
- Quan hệ 2 chiều: `Movie.seasons[] ↔ Season.movie_id`, `Season.episodes[] ↔ Episode.season_id`.
- Hai pattern kết nối: `connectDB()` (server/webapi/cdn) và `dbConnect()` (client/admin với cache `globalThis.mongoose`).

---

### Giai đoạn 4 — Đánh giá mức độ ảnh hưởng

**Yêu cầu:** "ảnh hưởng nghiêm trọng đến hệ thống không"

**Đã làm:** Phân tầng vấn đề:
- 🔴 **#1** Movie thiếu index (`year`, `type`, `status`, `view`) → COLLSCAN.
- 🔴 **#2** Dùng chung 1 DB, không cô lập → blast-radius lớn + nuốt lỗi kết nối.
- 🟡 **#3** Schema copy-paste qua 3 project → nguy cơ drift.
- 🟡 **#4** Quan hệ 2 chiều dư thừa, không transaction → nguy cơ lệch dữ liệu.
- 🟢 Việc nhẹ: `Actor.birthday` đang là String (nên Date), `Actor.movies` thiếu trong schema, log lỗi connectDB sơ sài, code Redis chết.

---

### Giai đoạn 5 — Fix các vấn đề DB nghiêm trọng (lập task + tự fix)

**Yêu cầu:** "fix cả 3 cái 🔴 Nghiêm trọng ... lập task và tự fix"

#### ✅ Task #1 — Thêm index cho Movie
Áp dụng cho **cả 3 project** (`server`, `webapi`, `cdn`) trong `app/model/Movie.ts`:
```js
movieSchema.index({ type: 1 });
movieSchema.index({ status: 1 });
movieSchema.index({ year: -1 });
movieSchema.index({ view: -1 });
movieSchema.index({ type: 1, status: 1, year: -1 }); // trang danh sách
movieSchema.index({ type: 1, view: -1 });            // phim xem nhiều theo loại
movieSchema.index({ createdAt: -1 });
```

#### ✅ Task #2 — Giới hạn connection pool + log lỗi
Viết lại `utils/mongodb.ts` ở **cả 3 project**:
- `maxPoolSize` (mặc định 10, qua `MONGODB_MAX_POOL_SIZE`) + `minPoolSize` → một service không hút cạn connection cả cluster.
- `serverSelectionTimeoutMS` / `socketTimeoutMS` → fail nhanh, không treo request.
- Tái dùng kết nối khi `readyState === 1` → tránh pool trùng.
- Log lỗi chi tiết + listener `error` / `disconnected` thay vì `catch {}` nuốt lỗi.
- An toàn: cả 3 call site chỉ gọi `connectDB()`, không dùng giá trị trả về.

#### ✅ Task #3 — Chống schema drift
- Phát hiện `cdn/Country.ts` và `cdn/Season.ts` lệch (chỉ khác comment/whitespace, logic giống) → đồng bộ về bản `server`.
- Tạo `D:\rophim\check-schema-drift.mjs` — hash-so-sánh model giữa 3 project, hiện báo **🟢 tất cả đồng bộ**.

**Verify toàn bộ:** `tsc --noEmit` → server EXIT 0, cdn EXIT 0, webapi EXIT 0.

---

### Giai đoạn 6 — Tài liệu hóa

- Tạo `D:\rophim\DATABASE_ANALYSIS.md` — nghiên cứu DB đầy đủ (kiến trúc, mô hình dữ liệu, vấn đề phân tầng, fix đã làm, khuyến nghị).
- Tạo `D:\rophim\PROGRESS_LOG.md` — file này (nhật ký tiến trình).

---

### Giai đoạn 7 — Dọn nốt các vấn đề tồn đọng (🟢/🟡/🔐)

**Yêu cầu:** "lên task fix cái đã fix 1 phần và chưa fix đi r fix hết luôn"

**Bối cảnh:** Quét lại từng file để kiểm chứng (không tin log) → xác định 3 vấn đề 🔴/🟡 nghiêm trọng đã fix thật, nhưng còn 4 việc 🟢/🟡/🔐 chưa đụng. Đã fix hết.

#### ✅ Actor.movies — thêm field vào schema
- Interface đã khai `movies?` nhưng `actorSchema` thiếu. Thêm `movies: [{ type: ObjectId, ref: "Movie" }]` vào **cả 3 project**.

#### ✅ Actor.birthday: String → Date
- Đổi `birthday: { type: Date, default: null }` ở cả 3 project (interface → `Date | null`).
- `tmdb.service.ts` `ensureActors`: ép chuỗi `"YYYY-MM-DD"` từ TMDB sang `new Date()` (null nếu trống/không hợp lệ).
- Nhất quán với `import.ts` (vốn đã coi `birthday` là dateField).
- Tạo migration script `server/scripts/migrate-actor-birthday.mjs` để convert dữ liệu cũ đang là String.

#### ✅ Code Redis "chết" — phát hiện chỉ chết MỘT NỬA (log cũ ghi sai)
- `cdn/utils/redis.ts` **KHÔNG chết**: `cdn/utils/crypto/fly.ts` dùng nó chống replay token one-time. → **Giữ nguyên**.
- `webapi/utils/redis.ts` mới là code chết thật (không file nào import). → **Đã xóa**.

#### ✅ Transaction Movie↔Season↔Episode (#4)
- Tạo helper `server/utils/withTransaction.ts` — tự fallback non-transactional nếu MongoDB không phải replica set (crawler dùng upsert idempotent nên chạy lại an toàn).
- `tmdb.service.ts`: bọc ghi Movie + Season vào 1 transaction.
- `episode.service.ts`: **restructure** — tách HTTP call (`getEpisodeThumbnail`) ra khỏi transaction, gom payload trong vòng lặp rồi commit toàn bộ Episode + link Season nguyên khối (tránh giữ lock trong lúc gọi mạng).

#### ✅ 🔐 Credential lộ trong doc.txt
- `client/doc.txt` + `admin/doc.txt` chứa secret thật (MongoDB Atlas user/pass, Upstash Redis token, thẻ test). → **Đã xóa cả 2**.
- Thêm `doc.txt` vào `.gitignore` của client + admin.

**Verify:** `tsc --noEmit` server EXIT 0, cdn EXIT 0; webapi Actor.ts byte-identical với server + load sạch qua `tsx`; `check-schema-drift.mjs` → 🟢 cả 9 model đồng bộ.

**⚠️ Còn lại cho người vận hành:**
- **ROTATE credential đã lộ** — xóa file chỉ chặn rò rỉ tiếp; secret cũ coi như đã lộ từ 7/11/2025, cần đổi MongoDB Atlas pass + tạo lại Upstash Redis token.
- **Chạy migration birthday** khi sẵn sàng: `cd server && node scripts/migrate-actor-birthday.mjs`.

---

### Giai đoạn 8 — VidSrc embed + luồng TikTok upload thủ công

**Yêu cầu:** Giữ VidSrc embed để xem ngay, đồng thời giữ pipeline TikTok upload để admin tự host thủ công từng tập.

**Thiết kế chốt:**
- `Episode.embed_url` là nguồn iframe VidSrc mặc định.
- `Episode.videos[]` là nguồn tự host/TikTok. Player ưu tiên `videos[]`; nếu rỗng thì fallback sang `embed_url`.
- Không bóc m3u8 từ VidSrc nữa (tránh Cloudflare/headless browser/chậm/dễ vỡ).

#### ✅ Model + crawler
- Thêm `embed_url` vào `Episode` ở **server/webapi/cdn** và xác minh drift đồng bộ.
- Thêm helper `buildVidSrcEmbed()` trong crawler (`VIDSRC_BASE`, mặc định `https://vidsrc.sbs`).
- `tmdb.service.ts` giờ tạo luôn **Movie + Season + Episode** trong luồng TMDB:
  - Phim lẻ: tạo `tap-full`, `embed_url=/embed/movie/{tmdb_id}`.
  - Phim bộ: tạo tập theo `episode_count`, `embed_url=/embed/tv/{tmdb_id}/{season}/{episode}`.
  - Pre-fetch season metadata trước transaction; transaction chỉ còn DB write.

#### ✅ Bỏ ophim/phimapi khỏi source
- Gỡ `runTap()` khỏi `server.ts`.
- Rewrite `crawler/index.ts` chỉ còn TMDB + cleanup.
- Xóa provider/crawler tập cũ ở server và webapi: `ophim.ts`, `phimapi.ts`, `providers/index.ts`, `episode.service.ts`, `types.ts`.

#### ✅ webapi fallback
- `webapi MovieController.getSource` trả `embed_url` trực tiếp từ episode.
- Với dữ liệu cũ chưa có `embed_url`, controller tự build fallback từ `Movie.tmdb.id` + season/tập.

#### ✅ Client player
- `client/types/Model/IEpisode.ts`: thêm `embed_url`.
- Trang xem phim chọn nguồn:
  - Có `videos[]` tự host/TikTok → dùng player CDN cũ + postMessage bảo mật.
  - Không có `videos[]` → render iframe VidSrc từ `embed_url`.
  - Không có nguồn → hiện thông báo "Chưa có nguồn phát cho tập này".

#### ✅ Upload TikTok thủ công gắn vào tập
- `server/app/plugin/upload/tiktok/index.ts` nhận thêm `episode_id`/`episodeId` và `type`.
- Sau khi upload xong, controller ghi playlist TikTok vào `Episode.videos[]`, đặt `is_default: true`, source cũ `is_default: false`.
- Kết quả upload trả thêm `playlist_url` absolute, `relative_playlist_url`, `attached_episode`.

**Verify:** server `tsc --noEmit` EXIT 0; cdn `tsc --noEmit` EXIT 0; client `tsc --noEmit` EXIT 0; webapi `MovieController` smoke OK; `check-schema-drift.mjs` → 🟢 tất cả model đồng bộ.

---

### Giai đoạn 9 — Cấu hình MongoDB Atlas local

**Yêu cầu:** Điền MongoDB Atlas URI vào `.env` và các chỗ liên quan để dự án chạy được.

**Đã làm:**
- Cập nhật `MONGODB_URI` vào `server/.env`, `webapi/.env`, `cdn/.env` (password có ký tự `@` đã được URL-encode thành `%40`).
- Thêm cấu hình pool/TLS/VidSrc tối thiểu cho backend.
- Thêm cấu hình local frontend vào `client/.env` và `admin/.env`:
  - `NEXT_PUBLIC_API_URL=http://localhost:4000`
  - `NEXT_PUBLIC_CDN=http://localhost:5000`
  - `NEXT_PUBLIC_SITE_URL` tương ứng.

**Kiểm tra:** Ban đầu test báo `querySrv ECONNREFUSED _mongodb._tcp.cluster0...` do Node DNS resolver không dùng được DNS SRV mặc định. Đã thêm `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1` và cấu hình `utils/mongodb.ts` để gọi `dns.setServers()` trước khi connect. Test `connectDB()` hiện **OK** tới Atlas database `rophim`.

**Bảo mật:** Không ghi URI thật vào markdown/log. Credential đã từng bị gửi trong chat nên vẫn nên đổi password Atlas sau khi test.

---

### Giai đoạn 10 — Chạy full service local

**Việc đã làm:**
- Bổ sung secret local còn thiếu trong `.env` backend: `ACCESS_TOKEN_SECRET`, `TOKEN_MASTER_SECRET` (không ghi secret vào tài liệu).
- Thêm `import "dotenv/config";` sớm trong `server.ts` của `server`, `webapi`, `cdn` để ENV được load trước khi import controller/token service.
- Đổi `cdn` về `PORT=5000` để khớp `NEXT_PUBLIC_CDN=http://localhost:5000`.
- Tắt Redis thật cho CDN local bằng `REDIS_DISABLED=true`; `cdn/utils/redis.ts` dùng in-memory replay cache khi dev/local để tránh spam `Redis Error` nếu máy chưa cài Redis.

**Trạng thái chạy hiện tại:**
- `client`: `http://localhost:3000` → HTTP 200.
- `webapi`: `http://localhost:4000/api/v1/home` → HTTP 200.
- `cdn`: `http://localhost:5000` → HTTP 200.
- `server`: `http://localhost:8000` → HTTP 200.
- `admin`: `http://localhost:3001` → HTTP 200 (chạy bằng `PORT=3001 NODE_ENV=development ./node_modules/.bin/tsx server.ts`).

**Ghi chú admin:** script `npm run dev -- -p 3001` không dùng được vì `dotenv -e .env` bị resolve sang CLI không tương thích; đã chạy trực tiếp qua `tsx`. Đã chạy `npm install` trong `admin` để tạo `node_modules`.

**Fix CORS admin:** Admin chạy ở `http://localhost:3001` gọi `server` ở `http://127.0.0.1:8000`, nên đã thêm `localhost:3001` và `127.0.0.1:3001` vào whitelist CORS của `server/server.ts`. Test `OPTIONS` và `GET /api/v1/category/list` từ origin `http://localhost:3001` đều trả `Access-Control-Allow-Origin: http://localhost:3001`.

**Fix 404 menu admin:** Admin chỉ có sẵn `/`, `/movies`, `/movies/upload`, `/short/upload`. Đã thêm placeholder pages cho `/ads-config`, `/short`, `/users`, `/plans`, `/categories`, `/sitemap`, `/payment-config`, `/transactions`, `/crawler` để sidebar không còn 404. Tất cả route này test lại đều HTTP 200; chức năng chi tiết vẫn là trang “Đang hoàn thiện”.

**MongoDB Atlas hiện có dữ liệu:** `studios=995`, `movies=504`, `categories=25`, `countries=41`, `seasons=883`, `episodes=10978`, `actors=5470`, `users=0`, `playlists=0`.

---

### Giai đoạn 11 — Hoàn thiện các màn admin còn thiếu

**Yêu cầu:** Làm thật các mục admin còn thiếu và thêm mục “Phim đã upload” trong nhóm Phim.

**Đã làm:**
- Thêm API admin tối thiểu ở server:
  - `GET /api/v1/admin/stats`
  - `GET /api/v1/admin/users`
  - `GET /api/v1/admin/movies/uploaded`
- `/categories`: hiển thị thể loại + quốc gia từ backend.
- `/users`: danh sách user, tìm theo tên/email.
- `/crawler`: dashboard thống kê crawler/data hiện có.
- `/ads-config`: form cấu hình ads lưu localStorage.
- `/payment-config`: form cấu hình thanh toán lưu localStorage.
- `/transactions`: màn lịch sử nạp cơ bản, báo chưa có collection giao dịch.
- `/plans`: màn gói nâng cấp cơ bản.
- `/sitemap`: danh sách route admin quan trọng.
- `/short`: màn danh sách short cơ bản.
- `/movies/uploaded`: danh sách phim có episode chứa `videos[]` tự host/TikTok.
- Sidebar Phim thêm mục `Phim đã upload`.

**Verify:** Các API admin trả HTTP 200 + CORS đúng từ `http://localhost:3001`. Các route admin `/ads-config`, `/short`, `/users`, `/plans`, `/categories`, `/sitemap`, `/payment-config`, `/transactions`, `/crawler`, `/movies/uploaded` đều trả HTTP 200.

**Kiểm tra ổn định API admin:** Một lần check thấy `server` port `8000` đã tắt nên toàn bộ admin API fail `status=000`. Đã khởi động lại `server`; check 3 vòng liên tiếp các endpoint `/category/list`, `/country/list`, `/movie/list`, `/admin/stats`, `/admin/users`, `/admin/movies/uploaded` đều HTTP 200. Riêng URL `/movie/tt0050083%20/get` trả 404 do input TMDB có khoảng trắng cuối; đã trim `tmdbId` trong `admin/pages/movies/upload.tsx` trước khi gọi API và submit upload.

**Fix dữ liệu upload TikTok HLS:** Phát hiện file HLS local `server/public/upload/27/06/2026/ddffcd3e-8791-4c26-ada5-f277a1c3736f/master.m3u8` đã được tạo nhưng chưa gắn vào DB. Đã cập nhật `Buds / Tập 1` để `videos[0]` trỏ tới `http://127.0.0.1:8000/upload/27/06/2026/ddffcd3e-8791-4c26-ada5-f277a1c3736f/master.m3u8`, `server_name=TikTok HLS Local`, `is_default=true`. Verify `/admin/movies/uploaded` có `Buds` với `uploadedEpisodes=1` và `/uploaded-episodes` trả đúng URL.

**Preview HLS trong khung phim:** Tìm thấy player thật ở `cdn/public/video.html` + `cdn/public/assets/media.js`. Đã thêm mode query `video.html?src=<m3u8>&title=<name>` để JWPlayer phát trực tiếp file `.m3u8` upload. Trang `admin/pages/movies/uploaded.tsx` có nút `Preview player` nhúng iframe CDN player, `Mở player` mở tab mới, `Mở m3u8` mở link playlist thô, và `Xem VidSrc embed` để đối chiếu fallback.

**Fix URL upload bị ép về admin domain cũ:** Nguyên nhân nằm ở `server/app/controller/film/movie.ts`, hàm `MovieController.upload` đang ghi `url: process.env.NEXT_PUBLIC_BASE_URL || v.url`, khiến mọi video upload bị override thành admin domain cũ nếu ENV tồn tại. Đã sửa thành `url: v.url` để giữ đúng playlist HLS upload trả về. Verify `server tsc --noEmit` EXIT 0.

**Fix source mới upload:** Rà DB thấy còn 1 episode có `videos.url` trỏ về admin domain cũ; đã đổi sang playlist HLS local mới nhất `http://127.0.0.1:8000/upload/27/06/2026/23c28870-5fd2-4d48-9fe1-f703396a7eef/master.m3u8` cho `Annabelle: Ác Quỷ Trở Về / Tập 1`. Verify còn `remaining_super_sources=0`; `/admin/movies/uploaded` hiện trả `Annabelle: Ác Quỷ Trở Về` với `uploadedEpisodes=1`.

**Fix HLS TikTok PNG không phát được trong embed:** Playlist upload trỏ segment TikTok dạng PNG (`Content-Type: image/png`) chứa TS trong iTXt nên JWPlayer không thể phát trực tiếp. Đã thêm `server/app/controller/admin/HlsProxyController.ts` với `GET /api/v1/hls-proxy/playlist?url=...` để rewrite playlist và `GET /api/v1/hls-proxy/segment?url=...` để tải PNG, giải iTXt payload, trả `video/mp2t`. Đã cập nhật `server/routes/web.ts`, `MovieController.upload` để source upload local được bọc qua proxy, cập nhật DB source hiện tại sang proxy URL, và chỉnh admin preview không bọc proxy lặp. Verify playlist proxy trả m3u8 đã rewrite, segment proxy trả `Content-Type: video/mp2t`, `server tsc --noEmit` EXIT 0.

**Hoàn thiện direct-to-client tiết kiệm bandwidth:** Đã thêm `server/app/controller/admin/DirectPlayController.ts` và routes `POST/GET /api/v1/direct-play/session`, `GET /api/v1/direct-play/playlist`, `GET /api/v1/direct-play/segment-meta`, `GET /api/v1/direct-play/key/:jobId`. Session dùng HMAC token TTL, nonce, fingerprint UA/local-safe, rate limit memory theo scope playlist/segment/key. Secure playlist rewrite key sang endpoint guarded và segment thành `segment-meta` có signature, không đưa raw TikTok URL trực tiếp trong m3u8. CDN player `video.html?direct=1` dùng HLS.js custom loader: tải `segment-meta`, nhận TikTok URL, fetch PNG trực tiếp từ client, parse iTXt bằng `DecompressionStream`, decode TS rồi feed HLS.js; server không tải segment trong direct mode. Fix loader stats thiếu `parsing/buffering` gây `Cannot set properties of undefined (setting 'start')`. Sau khi user báo preview vẫn đen, đã test bằng browser: inline admin iframe tạo URL đúng, direct player page tự thân load OK. Thêm CSS full-height cho `html/body/#player/#direct-player`, overlay play/status vào `cdn/public/assets/media.js`, cache-bust `media.js?v=direct-preview-3` và iframe URL `v=direct-preview-3`. Sau phản hồi vòng load lệch, direct preview được chỉnh lại giống proxy hơn: `.direct-stage`, `.direct-center-ui`, spinner/play SVG nằm chính giữa, bỏ status lệch góc dưới. Verify trang direct player hiển thị nút play + controls, video paused `0:00 / 0:44`, `window.directHlsErrors=[]`, video `readyState=4`, `duration=44.2`; `server tsc --noEmit` EXIT 0.

**Redesign giao diện Phim đã upload:** Làm lại `admin/pages/movies/uploaded.tsx` theo style đồng bộ với `admin/pages/movies/index.tsx`: bỏ khối hero/gradient AI, dùng title text đơn giản, filter input floating label, table trắng viền xám, nút đen `Hiển thị danh mục`, panel danh mục source dạng border/card gọn. Action đổi theo yêu cầu: `Preview JWPlayer` dùng iframe JWPlayer/proxy giống preview proxy, `Mở direct secure` chỉ mở tab direct-to-client riêng, vẫn giữ `Preview proxy`, `Mở proxy`, `Mở m3u8 gốc`, `VidSrc embed`. Verify bằng `curl -I http://localhost:3001/movies/uploaded` trả HTTP 200 và browser snapshot hiển thị layout mới giống trang danh sách phim.

**Fix tìm kiếm client:** Sửa `client/layouts/default/Navbar.tsx` để search input desktop/mobile dùng state chung `searchQuery`, debounce gọi `API_ENDPOINTS.search` để hiện gợi ý thật thay vì placeholder `Đề xuất 1`, submit xóa suggestions và đi tới `/tim-kiem?q=<query>`. Verify `client tsc --noEmit` EXIT 0; browser test từ `http://localhost:3000/` nhập `harry` + Enter chuyển sang `/tim-kiem?q=harry` và kết quả chứa `Harry Potter`.

**Revert về TikTok HLS đúng hướng:** User xác nhận vẫn giữ cơ chế TikTok HLS làm kho segment. Đã quay lại flow cũ: `TiktokService.processJob` tạo `.ts` AES-128, nhúng TS vào PNG/iTXt, upload PNG lên TikTok rồi rewrite playlist sang URL TikTok; không giữ `.ts` public-cache làm flow chính. `MovieController.upload` và admin `movies/uploaded.tsx` quay lại dùng `/api/v1/hls-proxy/playlist` cho JWPlayer/proxy preview; direct mode vẫn là hướng riêng. Đã gỡ route/import/file `CacheHlsController`, revert `server.ts` static cache header, dọn job test cache-hls. Verify `server tsc --noEmit` EXIT 0; server restart OK; `/api/v1/hls-proxy/playlist?...master.m3u8` trả HTTP 200/no-store; `/api/v1/cache-hls/playlist` trả 404 để tránh dùng nhầm.

**JWPlayer phát TikTok PNG HLS không proxy segment:** Thêm `cdn/public/sw-tiktok-hls.js` Service Worker bắt `/sw-hls/segment`, fetch TikTok PNG trực tiếp từ browser, extract iTXt payload thành TS và trả `video/mp2t` cho JWPlayer. Rút gọn/khôi phục `cdn/public/assets/media.js` để hỗ trợ `video.html?jw-direct=1`: đăng ký Service Worker, lấy playlist qua `GET /api/v1/hls-proxy/jw-direct-playlist`, rewrite segment sang `http://localhost:5000/sw-hls/segment?...`, rồi setup JWPlayer bình thường. Thêm `HlsProxyController.jwDirectPlaylist` và route `/api/v1/hls-proxy/jw-direct-playlist`, chỉ rewrite playlist/key/segment URL, không proxy video segment. Admin `movies/uploaded.tsx` có nút `Preview JWPlayer direct` dùng mode này. Verify `node --check` cho `media.js` và SW OK, `server tsc --noEmit` EXIT 0, browser test JWPlayer hiển thị duration `00:44`, normal play UI; Network có `/api/v1/key/...` và `/sw-hls/segment?...p16-oec...`, không có `/api/v1/hls-proxy/segment` trong JW direct mode.

---

## 📦 Tổng hợp file đã thay đổi / tạo mới

### Đã sửa
| File | Thay đổi |
|------|----------|
| `server/services/TiktokService.ts` | Adaptive MB-segmenting + helpers + retry-shrink |
| `server/app/plugin/upload/tiktok/services/TiktokService.ts` | Như trên |
| `server/app/plugin/upload/tiktok/index.ts` | Truyền `metadata.bitrate` |
| `server/app/model/Movie.ts` | Thêm 7 index |
| `webapi/app/model/Movie.ts` | Thêm 7 index |
| `cdn/app/model/Movie.ts` | Thêm 7 index |
| `server/utils/mongodb.ts` | Pool limit + log lỗi + tái dùng kết nối + set DNS servers cho Atlas SRV |
| `webapi/utils/mongodb.ts` | Như trên |
| `cdn/utils/mongodb.ts` | Như trên |
| `cdn/app/model/Country.ts` | Đồng bộ với server |
| `cdn/app/model/Season.ts` | Đồng bộ với server |
| `server/app/model/Actor.ts` | `birthday` String→Date + thêm field `movies` |
| `webapi/app/model/Actor.ts` | Như trên |
| `cdn/app/model/Actor.ts` | Như trên |
| `server/app/plugin/crawler/services/tmdb.service.ts` | Cast `birthday`→Date; bọc transaction; tạo Episode + `embed_url` VidSrc |
| `server/app/plugin/crawler/index.ts` | Gỡ `runTap`, chỉ giữ TMDB + cleanup |
| `server/server.ts` | Gỡ gọi `CrawlerTool.runTap()` |
| `server/app/plugin/upload/tiktok/index.ts` | Upload thủ công gắn playlist TikTok vào `Episode.videos[]` |
| `server/app/model/Episode.ts` | Thêm `embed_url` |
| `webapi/app/model/Episode.ts` | Thêm `embed_url` |
| `cdn/app/model/Episode.ts` | Thêm `embed_url` |
| `webapi/app/controller/Film/MovieController.ts` | Fallback build `embed_url` cho episode cũ |
| `webapi/app/plugin/crawler/index.ts` | Gỡ dependency provider tập cũ |
| `client/pages/phim/[slug]/[phan]/[tap]/index.tsx` | Fallback VidSrc iframe khi không có video tự host |
| `client/types/Model/IEpisode.ts` | Thêm `embed_url` |
| `server/.env` | Cấu hình MongoDB Atlas URI + DNS servers + local settings |
| `webapi/.env` | Cấu hình MongoDB Atlas URI + DNS servers + local settings |
| `cdn/.env` | Cấu hình MongoDB Atlas URI + DNS servers + local settings |
| `client/.env` | Cấu hình endpoint local API/CDN/SITE |
| `admin/.env` | Cấu hình endpoint local API/CDN/SITE |
| `server/server.ts` | Load dotenv sớm trước import phụ thuộc ENV |
| `webapi/server.ts` | Load dotenv sớm trước import auth controller |
| `cdn/server.ts` | Load dotenv sớm trước import token service |
| `cdn/utils/redis.ts` | Thêm in-memory fallback khi `REDIS_DISABLED=true` cho local dev |
| `admin/components/PlaceholderPage.tsx` | Component placeholder cho route admin chưa triển khai |
| `admin/pages/ads-config.tsx` | Placeholder page, tránh 404 |
| `admin/pages/short/index.tsx` | Placeholder page, tránh 404 |
| `admin/pages/users.tsx` | Placeholder page, tránh 404 |
| `admin/pages/plans.tsx` | Placeholder page, tránh 404 |
| `admin/pages/categories.tsx` | Placeholder page, tránh 404 |
| `admin/pages/sitemap.tsx` | Placeholder page, tránh 404 |
| `admin/pages/payment-config.tsx` | Placeholder page, tránh 404 |
| `admin/pages/transactions.tsx` | Placeholder page, tránh 404 |
| `admin/pages/crawler.tsx` | Dashboard thống kê crawler/data cơ bản |
| `server/app/controller/admin/AdminController.ts` | API admin stats/users/uploaded movies |
| `server/routes/web.ts` | Route API admin mới |
| `admin/components/AdminCard.tsx` | Layout card dùng chung cho màn admin |
| `admin/layouts/default/Layout.tsx` | Thêm menu `Phim đã upload` |
| `admin/pages/movies/uploaded.tsx` | Danh sách phim có episode tự host/TikTok |
| `admin/pages/categories.tsx` | Màn thể loại/quốc gia thật từ API |
| `admin/pages/users.tsx` | Màn danh sách user thật từ API |
| `admin/pages/ads-config.tsx` | Form cấu hình ads local |
| `admin/pages/payment-config.tsx` | Form cấu hình thanh toán local |
| `admin/pages/plans.tsx` | Màn gói nâng cấp cơ bản |
| `admin/pages/transactions.tsx` | Màn lịch sử nạp cơ bản |
| `admin/pages/sitemap.tsx` | Màn sitemap admin cơ bản |
| `admin/pages/short/index.tsx` | Màn danh sách short cơ bản |

### Đã xóa
| File | Lý do |
|------|-------|
| `webapi/utils/redis.ts` | Code chết (không file nào import) |
| `client/doc.txt` | Credential thật bị lộ |
| `admin/doc.txt` | Credential thật bị lộ |
| `server/app/plugin/crawler/services/providers/ophim.ts` | Bỏ nguồn ophim |
| `server/app/plugin/crawler/services/providers/phimapi.ts` | Bỏ nguồn phimapi |
| `server/app/plugin/crawler/services/providers/index.ts` | Provider tập cũ không còn dùng |
| `server/app/plugin/crawler/services/episode.service.ts` | Luồng tạo Episode chuyển sang TMDB + VidSrc embed |
| `server/app/plugin/crawler/types.ts` | Type provider cũ không còn dùng |
| `webapi/app/plugin/crawler/services/providers/ophim.ts` | Bỏ nguồn ophim |
| `webapi/app/plugin/crawler/services/providers/phimapi.ts` | Bỏ nguồn phimapi |
| `webapi/app/plugin/crawler/services/providers/index.ts` | Provider tập cũ không còn dùng |
| `webapi/app/plugin/crawler/services/episode.service.ts` | Luồng tạo Episode chuyển sang TMDB + VidSrc embed |
| `webapi/app/plugin/crawler/types.ts` | Type provider cũ không còn dùng |

### Tạo mới
| File | Mục đích |
|------|----------|
| `D:\rophim\check-schema-drift.mjs` | Script tự động kiểm tra schema drift |
| `D:\rophim\DATABASE_ANALYSIS.md` | Nghiên cứu DB đầy đủ |
| `D:\rophim\PROGRESS_LOG.md` | Nhật ký tiến trình (file này) |
| `server/utils/withTransaction.ts` | Helper transaction + fallback non-replica-set |
| `server/scripts/migrate-actor-birthday.mjs` | Migration `Actor.birthday` String→Date |

---

## 🔜 Việc còn lại (chưa làm)

| Mức | Việc | Ghi chú |
|-----|------|---------|
| ✅ #4 | ~~Thêm transaction safeguard cho Movie↔Season↔Episode~~ | **Xong** (Giai đoạn 7) — `withTransaction.ts` + bọc 2 crawler service |
| ✅ | ~~`Actor.birthday` String → Date~~ | **Xong** (Giai đoạn 7) — migration script đã tạo, **cần chạy** |
| ✅ | ~~Thêm `Actor.movies` vào schema~~ | **Xong** (Giai đoạn 7) |
| ✅ | ~~Gỡ code Redis chết~~ | **Xong** (Giai đoạn 7) — xóa `webapi/utils/redis.ts`; giữ `cdn` (fly.ts dùng) |
| ✅ | ~~Xử lý credential lộ trong doc.txt~~ | **Đã xóa file** (Giai đoạn 7) — nhưng **vẫn cần ROTATE** secret |
| ✅ | ~~Bỏ ophim/phimapi, chuyển sang VidSrc embed + TikTok manual upload~~ | **Xong** (Giai đoạn 8) |
| 🟡 #3+ | Tách package model dùng chung (`@rophim/models`) | Giải pháp triệt để thay vì copy-paste |
| ⚙️ | Đưa `check-schema-drift.mjs` vào CI | Chặn drift tự động khi commit |
| 🔐 | **ROTATE** MongoDB Atlas pass + Upstash Redis token | Secret đã lộ từ 7/11/2025, xóa file không đủ |
| ⚙️ | Chạy migration: `cd server && node scripts/migrate-actor-birthday.mjs` | Convert `Actor.birthday` cũ (String) sang Date |

---

## ⚠️ Ghi chú bảo mật

- Các file `.env` chứa secret nhạy cảm (`TIKTOK_COOKIE`, STS credentials, `GOOGLE_PRIVATE_KEY`, `MONGODB_URI`, token secrets) — **chỉ tham chiếu theo tên key**, không in giá trị.
- `client/doc.txt` và `admin/doc.txt` (credential thật: MongoDB Atlas, Redis Upstash token, thẻ test) — **đã xóa** (Giai đoạn 7) + thêm `doc.txt` vào `.gitignore`. ⚠️ Secret cũ coi như đã lộ → **vẫn phải rotate**.
