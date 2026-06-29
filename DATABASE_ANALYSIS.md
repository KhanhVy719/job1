# Phân tích Cơ sở dữ liệu — Hệ thống rophim

> Tài liệu tổng hợp nghiên cứu về tầng dữ liệu (MongoDB + Mongoose) của hệ thống rophim, mức độ ảnh hưởng và các fix đã thực hiện.
> Cập nhật: 2026-06-27

---

## 1. Tổng quan kiến trúc

Hệ thống là **monorepo đa service**, dùng chung **một MongoDB duy nhất** (database `rophim`):

| Project  | Vai trò                         | Stack         | Kết nối DB              |
|----------|---------------------------------|---------------|-------------------------|
| `server` | Backend chính (API + crawler + upload) | Express + TS  | `utils/mongodb.ts`      |
| `webapi` | API phục vụ frontend            | Express + TS  | `utils/mongodb.ts`      |
| `cdn`    | Phục vụ media / streaming       | Express + TS  | `utils/mongodb.ts`      |
| `client` | Frontend người dùng             | Next.js       | `utils/mongodb.ts` (cache) |
| `admin`  | Trang quản trị                  | Next.js       | `utils/mongodb.ts` (cache) |

ODM: **Mongoose**. Tất cả service trỏ về cùng một `MONGODB_URI`.

**Local config hiện tại (Giai đoạn 10):** `server/.env`, `webapi/.env`, `cdn/.env` đã được cấu hình MongoDB Atlas URI (không ghi secret trong tài liệu) + `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1`. `utils/mongodb.ts` set DNS servers trước khi connect để Node resolver đọc được Atlas SRV. `client/.env` và `admin/.env` đã trỏ local API/CDN. Các service local đã trả HTTP 200: client `3000`, webapi `4000`, cdn `5000`, server `8000`, admin `3001`. CDN local dùng `REDIS_DISABLED=true` + in-memory replay cache nếu không có Redis thật. Admin đã cài `node_modules` và chạy trực tiếp bằng `tsx` do script `dotenv -e .env` hiện không tương thích CLI. CORS server đã whitelist `http://localhost:3001` và `http://127.0.0.1:3001`; test admin-origin tới `/api/v1/category/list` đã trả header CORS đúng. Admin sidebar từng trỏ tới nhiều route chưa tồn tại; đã bổ sung UI cơ bản cho `/ads-config`, `/short`, `/users`, `/plans`, `/categories`, `/sitemap`, `/payment-config`, `/transactions`, `/crawler`, thêm `/movies/uploaded` và API admin `/admin/stats`, `/admin/users`, `/admin/movies/uploaded`; tất cả route/API đã test HTTP 200.

---

## 2. Mô hình dữ liệu

### 2.1 Quan hệ cốt lõi

```
Movie (hub trung tâm)
 ├─ seasons[]  ──────────────►  Season
 │                                ├─ movie_id  ──► Movie  (2 chiều)
 │                                └─ episodes[] ──► Episode
 │                                                   ├─ movie_id  ──► Movie
 │                                                   └─ season_id ──► Season (2 chiều)
 ├─ studio[]   ──► Studio
 ├─ actor[]    ──► Actor
 ├─ director[] ──► Actor
 ├─ category[] ──► Category
 └─ country[]  ──► Country

User
 ├─ favorites[] ──► Movie
 └─ history[]   ──► Movie

Playlist
 ├─ user     ──► User
 └─ movies[] ──► Movie
```

### 2.2 Các collection chính

**Movie** — tài liệu trung tâm. Trường tiêu biểu: `name`, `origin_name`, `slug` (unique), `content`, `type` (default `series`), `status` (default `ongoing`), `thumb_url`/`poster_url`/`title_logo`, `trailer_url[]`, `backdrops[]`, các ref `studio/actor/director/category/country/seasons`, `quality` (default `HD`), `lang[]` (default `[1]`), `year`, `view` (default 0), `content_rating` (default `P`), object lồng `tmdb{}` và `imdb{}`, cờ `is_copyright/sub_docquyen/chieurap`.

**Season** — `movie_id` (ref Movie, required, index), `season_number`, `name`, `slug`, `overview`, `poster_path`, `air_date` (Date), `episode_count`, `episodes[]`. Unique compound `{movie_id, season_number}`.

**Episode** — phức tạp nhất. `movie_id` + `season_id` (ref, index), `name`, `slug` (index), `episode` (Number, index), `types[]`, `embed_url` (iframe VidSrc fallback), `thumbnail`, `description`, `duration`, `air_date`, `vote_average`, các sub-schema nhúng `videos[]` / `audios[]` / `subtitles[]` (đều `_id: false`), `sort_order`, `views`. Unique compound `{season_id, episode}`. Quy ước nguồn phát mới: `videos[]` = nguồn tự host/TikTok ưu tiên; `embed_url` = VidSrc fallback khi chưa có bản tự host.

**User** (chỉ server + webapi) — `fullname`, `email` (unique), `password` (hash), `gender`, `verify`, `avatar`, `coin` (default 1000), `level`, `vip`, `favorites[]`, `history[{movie, watchedAt}]`.

**Playlist** (chỉ server + webapi) — `name`, `user` (ref), `movies[]`.

**Actor / Category / Country / Studio** — bảng tra cứu phụ trợ.

### 2.3 Snapshot dữ liệu Atlas hiện tại
Sau khi chạy full service local, database `rophim` hiện có:
- `movies`: 504
- `seasons`: 883
- `episodes`: 10978
- `actors`: 5470
- `studios`: 995
- `categories`: 25
- `countries`: 41
- `users`: 0
- `playlists`: 0

---

## 3. Vấn đề phát hiện & mức độ ảnh hưởng

### 🔴 Nghiêm trọng

**#1 — Movie thiếu index cho truy vấn lọc/sắp xếp**
- Trước fix chỉ có index trên `name`, `slug`, `content_rating`.
- Các truy vấn phổ biến nhất (lọc theo `type`/`status`/`year`, sort theo `view`/`year`) đều **COLLSCAN** — quét toàn bộ collection.
- Ảnh hưởng: chậm tuyến tính theo số lượng phim; càng nhiều data trang danh sách/trang chủ càng lag, tốn CPU + I/O của DB.

**#2 — Dùng chung 1 DB, kết nối không kiểm soát + nuốt lỗi**
- Mọi service trỏ chung một cluster, **không giới hạn connection pool** → một service rò connection có thể làm cạn connection của cả hệ thống (blast-radius rộng).
- `connectDB()` cũ dùng `catch {}` **nuốt lỗi**, không log chi tiết → sự cố DB rất khó chẩn đoán.
- Không tái dùng kết nối → nguy cơ tạo pool trùng.

### 🟡 Trung bình

**#3 — Schema copy-paste giữa 3 project (drift risk)**
- Model được nhân bản qua `server` / `webapi` / `cdn`. Sửa một nơi quên nơi khác → lệch schema âm thầm.
- Thực tế đã có drift: `Country.ts` và `Season.ts` ở `cdn` lệch so với server (may mắn chỉ khác comment/whitespace, logic chưa lệch).

**#4 — Quan hệ 2 chiều dư thừa, không có transaction**
- `Movie.seasons[]` ↔ `Season.movie_id`, `Season.episodes[]` ↔ `Episode.season_id` lưu 2 chiều.
- Khi thêm/xóa mà không bọc transaction → nguy cơ dữ liệu lệch (mảng trỏ tới doc đã xóa, hoặc thiếu).

### 🟢 Nhẹ (đã xử lý — xem mục 4)
- ~~`Actor.birthday` đang là `String`~~ → **đã đổi sang `Date`** + migration script.
- ~~Interface `Actor` khai báo `movies?` nhưng schema không có~~ → **đã thêm field vào schema**.
- ~~Code Redis "chết"~~ → thực tế `cdn` đang dùng (`fly.ts` chống replay token); chỉ `webapi/utils/redis.ts` chết → **đã xóa**.
- `cdn` thiếu hẳn model `User` và `Playlist` (đúng theo vai trò, không phải lỗi).

---

## 4. Các fix đã thực hiện

### ✅ #1 — Thêm index cho Movie (server + webapi + cdn)
Bổ sung vào `app/model/Movie.ts` ở cả 3 project:

```ts
movieSchema.index({ type: 1 });
movieSchema.index({ status: 1 });
movieSchema.index({ year: -1 });
movieSchema.index({ view: -1 });
movieSchema.index({ type: 1, status: 1, year: -1 }); // trang danh sách: lọc + sort
movieSchema.index({ type: 1, view: -1 });            // phim xem nhiều theo loại
movieSchema.index({ createdAt: -1 });
```

Kết quả: loại bỏ COLLSCAN cho các truy vấn lọc theo loại/trạng thái/năm và sort theo lượt xem.

### ✅ #2 — Viết lại connectDB (server + webapi + cdn)
`utils/mongodb.ts` mới:
- `maxPoolSize` (mặc định 10, override qua `MONGODB_MAX_POOL_SIZE`) + `minPoolSize` → giới hạn blast-radius mà không cần tách DB ngay.
- `serverSelectionTimeoutMS` / `socketTimeoutMS` → fail nhanh thay vì treo request.
- Tái dùng kết nối khi `readyState === 1` → tránh pool trùng.
- Log lỗi chi tiết + listener `error` / `disconnected` thay vì `catch {}` nuốt lỗi.

### ✅ #3 — Chống schema drift
- Đồng bộ `cdn/Country.ts` và `cdn/Season.ts` về đúng bản chuẩn (server).
- Tạo `check-schema-drift.mjs` — hash & so sánh toàn bộ model giữa 3 project, báo lỗi khi lệch. Hiện trạng: **🟢 tất cả đồng bộ**.

```bash
node check-schema-drift.mjs
```

**Verify:** `tsc --noEmit` → server / webapi / cdn đều EXIT 0.

### ✅ #4 — Transaction cho quan hệ 2 chiều (server)
- Tạo helper `server/utils/withTransaction.ts`: chạy callback trong `session.withTransaction`, **tự fallback** non-transactional nếu deployment không phải replica set (crawler dùng upsert idempotent nên chạy lại an toàn).
- `tmdb.service.ts`: bọc ghi **Movie + Season + Episode** (+ link `Movie.seasons[]` và `Season.episodes[]`) trong 1 transaction.
- Sau Giai đoạn 8, `episode.service.ts` đã bị xóa vì luồng tạo Episode chuyển hẳn sang TMDB + VidSrc embed.

```ts
await withTransaction(async (session) => {
  await Movie.findOneAndUpdate(filter, payload, { ...opts, session });
  await Season.findOneAndUpdate(filter, payload, { ...opts, session });
  await Episode.findOneAndUpdate(filter, payload, { ...opts, session });
});
```

### ✅ VidSrc embed + TikTok manual upload (Giai đoạn 8)
- Thêm `Episode.embed_url` vào model dùng chung (server/webapi/cdn).
- `tmdb.service.ts` tạo Episode trực tiếp từ TMDB và gắn `embed_url` VidSrc:
  - `movie`: `https://vidsrc.sbs/embed/movie/{tmdb_id}`.
  - `tv`: `https://vidsrc.sbs/embed/tv/{tmdb_id}/{season}/{episode}`.
- Bỏ nguồn ophim/phimapi và gỡ `runTap()` khỏi crawler.
- `webapi.getSource` fallback build `embed_url` cho dữ liệu cũ chưa backfill.
- Client player ưu tiên `videos[]` tự host/TikTok; nếu rỗng thì nhúng iframe VidSrc.
- Upload TikTok thủ công nhận `episode_id` và ghi playlist vào `Episode.videos[]` để lần xem sau ưu tiên bản tự host.

### ✅ Dọn vặt
- `Actor.birthday` String→Date (3 project) + `ensureActors` cast Date + `migrate-actor-birthday.mjs`.
- Thêm `Actor.movies` vào schema (3 project).
- Xóa code chết `webapi/utils/redis.ts`; xóa `client/doc.txt` + `admin/doc.txt` (credential lộ) + chặn qua `.gitignore`.

---

## 5. Khuyến nghị tiếp theo

| Ưu tiên | Việc | Ghi chú |
|---------|------|---------|
| ✅ Xong | ~~Bọc transaction cho Movie↔Season↔Episode (#4)~~ | `withTransaction.ts` + `tmdb.service.ts`. **Cần replica set** để transaction thật sự active; nếu standalone → tự fallback |
| ✅ Xong | ~~Bỏ ophim/phimapi, chuyển sang VidSrc embed + TikTok manual upload~~ | Giai đoạn 8: `embed_url` fallback + upload thủ công gắn `videos[]` |
| 🔴 Gấp | **ROTATE** MongoDB Atlas pass + Upstash Redis token | Secret đã lộ qua `doc.txt` và chat; xóa file không đủ |
| ✅ Xong | ~~Sửa kết nối Atlas (`querySrv ECONNREFUSED`)~~ | Đã set `MONGODB_DNS_SERVERS` + `dns.setServers()`; `connectDB()` OK |
| ⚙️ Cần chạy | `cd server && node scripts/migrate-actor-birthday.mjs` | Convert `Actor.birthday` cũ (String) sang Date |
| ⚙️ Nên làm | Backfill `embed_url` cho Episode cũ | webapi hiện đã fallback runtime; script backfill sẽ giúp dữ liệu sạch hơn |
| Trung bình | Tách package model dùng chung (`@rophim/models`) | Thay cho copy-paste; nặng hơn nhưng dứt điểm drift |
| Vận hành | Chạy `check-schema-drift.mjs` trong CI / pre-commit | Chặn drift tự động |
| Vận hành | Cân nhắc tách DB hoặc user/role riêng theo service | Giảm blast-radius triệt để |
