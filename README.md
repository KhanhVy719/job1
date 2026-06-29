# Rophim Source Bundle

Branch `main` chứa các phần source chính để người dùng xem phim và admin quản lý hệ thống.

## Thành phần đã đưa lên

- `client/` — giao diện người dùng Next.js, trang chủ/phim/lịch chiếu/watch page.
- `admin/` — giao diện quản trị Next.js/custom server.
- `webapi/` — public API, discovery/search/schedule/showtimes và các helper API.
- `server/` — backend quản trị, crawler/upload/socket/service hỗ trợ admin.
- `cdn/` — CDN/player/captcha/HLS proxy/JWPlayer iframe phục vụ xem phim.
- `database/` — kế hoạch và script setup MongoDB đã tách riêng trước đó.
- `DATABASE_ANALYSIS.md`, `KE_HOACH_HA_TANG_TRIEN_KHAI.md`, `PROGRESS_LOG.md` — tài liệu phân tích/triển khai hiện tại.

## Những thứ cố ý không commit

- `.env`, `.env.*`, password, token, cookie, private key/cert.
- `node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`, cache.
- `tmp/`, `backup/`, `target/`, log, dump/archive.
- Runtime upload/storage/HLS output: `upload/`, `public/upload/`, `secure_keys/`.
- Video/media lớn như `.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`.

## Ghi chú bảo mật

Repo chỉ chứa source/config template/tài liệu. Biến môi trường thật cần cấp riêng trên server hoặc qua secret manager, không commit vào Git.

## Cấu trúc chạy local tham khảo

- `client`: port `3000`
- `admin`: port `3001`
- `webapi`: port `4000`
- `cdn`: port `5000`
- `server`: port `8000`

Cần tạo `.env` riêng cho từng package dựa trên hạ tầng thực tế trước khi chạy production.
