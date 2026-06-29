# Kế hoạch hạ tầng triển khai dự án Rophim

## 1. Mục tiêu triển khai

Triển khai dự án theo hướng chịu được nhiều user hơn nhưng vẫn tối ưu chi phí giai đoạn đầu với **2 VPS**.

Giả định đã chốt:

- Video TikTok HLS/direct để client tự kéo băng thông video.
- VPS không gánh tải chính của `.ts` segment video.
- Tạm thời bỏ qua rủi ro TikTok direct như rate limit, link hết hạn, API đổi, client decode lag.
- Giai đoạn đầu dùng 2 VPS.
- VPS 2 vừa chạy MongoDB vừa chạy worker FFmpeg/upload/crawler.
- Có thể mở rộng sau bằng cách mua thêm VPS và kết nối thành node mới.

---

## 2. Sơ đồ tổng thể

```text
User
 |
Cloudflare DNS/CDN/WAF
 |
VPS 1 - Public/App
 |
 |-- Nginx reverse proxy
 |-- client frontend
 |-- admin frontend
 |-- webapi public API
 |-- server control/admin API
 |-- cdn-api/player/token nhẹ
 |-- Redis
 |
Private Network / VPC / WireGuard
 |
VPS 2 - Data/Worker
 |
 |-- MongoDB
 |-- FFmpeg upload/transcode worker
 |-- TikTok upload worker
 |-- crawler worker
 |-- cleanup worker
 |-- database backup job
```

---

## 3. Phân chia vai trò VPS

## VPS 1 - Public/App Node

VPS 1 là node public duy nhất ở giai đoạn đầu. Toàn bộ traffic từ user đi qua Cloudflare rồi vào VPS 1.

### Service chạy trên VPS 1

```text
Nginx
client
admin
webapi
server
cdn-api nhẹ
Redis
PM2 hoặc Docker Compose
```

### Nhiệm vụ chính

- Nhận request public từ user.
- Reverse proxy bằng Nginx.
- Chạy frontend public.
- Chạy admin UI.
- Chạy public API.
- Chạy control/admin API.
- Chạy API/player/token nhẹ cho CDN/player.
- Chạy Redis cho cache, queue, lock, progress.

### Cấu hình đề xuất

Tối thiểu:

```text
4 vCPU
8GB RAM
100-160GB NVMe
```

Khuyến nghị hơn:

```text
8 vCPU
16GB RAM
160-300GB NVMe
```

---

## VPS 2 - Data/Worker Node

VPS 2 là node nội bộ, không public các service quan trọng ra internet.

### Service chạy trên VPS 2

```text
MongoDB
worker-upload
worker-transcode
worker-crawler
worker-cleanup
backup-mongodb
```

### Nhiệm vụ chính

- Lưu MongoDB.
- Chạy FFmpeg/transcode.
- Chạy upload TikTok/HLS carrier.
- Chạy crawler TMDB/data.
- Chạy cleanup job.
- Chạy backup database định kỳ.

### Cấu hình đề xuất

Tối thiểu nên dùng:

```text
8 vCPU
32GB RAM
500GB NVMe
```

Khuyến nghị tốt hơn:

```text
16 vCPU
64GB RAM
1TB NVMe
```

Lý do VPS 2 cần mạnh hơn VPS 1:

- MongoDB cần RAM và disk I/O tốt.
- FFmpeg ăn CPU rất mạnh.
- Upload/transcode có thể tạo file tạm lớn.
- Crawler và cleanup có thể tạo thêm tải nền.

---

## 4. Network/VPC/WireGuard

Cần có mạng riêng giữa 2 VPS.

Ưu tiên:

```text
VPC/private network của nhà cung cấp VPS
```

Nếu provider không có VPC thì dùng:

```text
WireGuard
```

Với 2 VPS ban đầu, WireGuard có thể chạy kiểu **point-to-point**, tức là 2 VPS kết nối trực tiếp với nhau qua public IP rồi tạo tunnel mã hóa. **Không cần máy chủ trung gian**.

Mô hình WireGuard point-to-point:

```text
Public Internet:
VPS 1 public IP <----------------> VPS 2 public IP

VPN nội bộ WireGuard:
VPS 1: 10.8.0.1
VPS 2: 10.8.0.2
```

Kết nối nội bộ:

```text
VPS 1 -> MongoDB VPS 2: 10.8.0.2:27017
VPS 2 -> Redis VPS 1: 10.8.0.1:6379
```

App/worker config nên dùng IP VPN:

```env
MONGODB_URI=mongodb://rophim_app:<password>@10.8.0.2:27017/rophim?authSource=admin
REDIS_URL=redis://10.8.0.1:6379
```

Firewall khi dùng WireGuard:

```text
VPS 1 public mở: 80/tcp, 443/tcp, SSH giới hạn IP, WireGuard UDP 51820
VPS 2 public mở: SSH giới hạn IP, WireGuard UDP 51820
Redis 6379 chỉ cho 10.8.0.2
MongoDB 27017 chỉ cho 10.8.0.1
```

Cloudflare không thay thế VPC/WireGuard. Cloudflare chỉ xử lý public traffic từ internet vào VPS 1.

Mô hình đúng:

```text
Cloudflare -> VPS 1
VPS 1 <-> VPS 2 qua VPC/WireGuard/WireGuard point-to-point
```

Nếu sau này có thêm VPS 3, có thể mở rộng WireGuard theo 2 kiểu:

```text
Mesh nhỏ:
VPS 1 <-> VPS 2
VPS 1 <-> VPS 3
VPS 2 <-> VPS 3

Hub-and-spoke:
VPS 1 làm hub
VPS 2/VPS 3/VPS 4 nối vào hub
```

Với 2 VPS hiện tại, chọn point-to-point là đơn giản và đủ dùng.

---

## 5. Cloudflare dùng làm gì?

Cloudflare dùng cho public traffic:

```text
DNS
SSL/TLS
CDN cache static asset
WAF cơ bản
Rate limit cơ bản
Ẩn IP origin phần nào
Cloudflare Access bảo vệ admin
```

Nên bật proxy Cloudflare cho:

```text
example.com
api.example.com
admin.example.com
server.example.com
cdn.example.com
```

Nên cấu hình:

```text
SSL/TLS: Full hoặc Full Strict
WAF basic rules
Rate limit login/upload/search nếu cần
Cache static assets
Cloudflare Access cho admin domain
```

---

## 6. Domain layout

Nên chia domain rõ theo service:

```text
example.com          -> client frontend
api.example.com      -> webapi public API
admin.example.com    -> admin frontend
server.example.com   -> server/admin control API
cdn.example.com      -> cdn-api/player nhẹ
```

Nếu sau này tách upload gateway riêng:

```text
upload.example.com   -> upload API/worker gateway
```

Giai đoạn đầu nên để upload đi qua VPS 1 rồi đẩy job sang Redis queue cho worker VPS 2 xử lý.

---

## 7. Firewall/port

## VPS 1 public mở

```text
80/tcp
443/tcp
SSH, nên giới hạn IP quản trị
```

## VPS 1 không public

```text
Redis 6379
Node internal ports
```

Redis chỉ cho phép:

```text
127.0.0.1
10.8.0.2 hoặc private IP của VPS 2
```

---

## VPS 2 public mở

```text
SSH, nên giới hạn IP quản trị
```

## VPS 2 tuyệt đối không public

```text
MongoDB 27017
worker internal ports
crawler dashboard nếu có
```

MongoDB chỉ cho phép:

```text
127.0.0.1
10.8.0.1 hoặc private IP của VPS 1
```

---

## 8. MongoDB plan

MongoDB đặt trên VPS 2.

MongoDB nên bind:

```text
127.0.0.1
10.8.0.2
```

Không bind public IP.

Tạo database/user riêng:

```text
database: rophim
user: rophim_app
role: readWrite
```

App trên VPS 1 dùng URI dạng:

```env
MONGODB_URI=mongodb://rophim_app:<password>@10.8.0.2:27017/rophim?authSource=admin
```

Worker trên VPS 2 có thể dùng:

```env
MONGODB_URI=mongodb://rophim_app:<password>@127.0.0.1:27017/rophim?authSource=admin
```

### Pool MongoDB

Trong code hiện tại các service dùng Mongoose với pool mặc định khoảng:

```text
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=0
```

Giai đoạn đầu nên giữ vừa phải, tránh mỗi service mở quá nhiều connection.

Gợi ý ban đầu:

```env
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=0
```

Nếu traffic tăng, tăng dần theo thực tế, ví dụ:

```env
MONGODB_MAX_POOL_SIZE=20
```

Không nên tăng bừa vì nhiều service cộng lại sẽ làm MongoDB quá tải connection.

---

## 9. Index MongoDB cần có

Các collection đọc nhiều cần index.

Gợi ý index cho movies:

```text
movies.slug
movies.tmdb
movies.name
movies.origin_name
movies.type
movies.status
movies.year
movies.categories
movies.countries
movies.createdAt
movies.updatedAt
```

Gợi ý index cho episodes:

```text
episodes.movie
episodes.slug
episodes.episode
episodes.season_id
```

Gợi ý index cho seasons:

```text
seasons.movie
seasons.slug
seasons.season_number
```

Gợi ý index cho users:

```text
users.email
users.username
```

Nếu search trở thành bottleneck lớn, sau này cân nhắc tách search sang:

```text
Meilisearch
Typesense
Elasticsearch/OpenSearch
```

Nhưng giai đoạn đầu MongoDB index + Redis cache là đủ.

---

## 10. Redis plan

Redis đặt trên VPS 1.

Redis bind:

```text
127.0.0.1
10.8.0.1
```

Worker VPS 2 kết nối Redis qua private IP:

```env
REDIS_URL=redis://10.8.0.1:6379
```

Redis dùng cho:

```text
API cache
Redis queue cho upload/transcode
Progress job upload/transcode
Crawler lock
Rate limit shared
View counter buffer
Socket.IO adapter nếu scale nhiều app node sau này
```

Trong production không nên dùng memory fallback cho Redis vì không multi-node safe.

---

## 11. Queue/worker plan

Flow upload/transcode nên chuyển về queue:

```text
Admin upload
-> API tạo job
-> Redis queue
-> VPS 2 worker xử lý
-> Progress lưu Redis
-> Result lưu MongoDB
-> Admin xem progress
```

Các queue/job nên có:

```text
upload
probe-video
download-video
transcode-hls
publish-tiktok
attach-video
crawler
cleanup
```

### Giới hạn FFmpeg concurrency

Vì VPS 2 vừa chạy MongoDB vừa chạy FFmpeg, không được để FFmpeg ăn hết CPU/RAM.

Gợi ý:

```text
VPS 2 8 vCPU: 1 FFmpeg job cùng lúc
VPS 2 16 vCPU: 2 FFmpeg job cùng lúc
```

Nếu queue backlog cao thì sau này mua thêm VPS worker mới rồi cùng kết nối Redis queue.

---

## 12. Crawler/cron plan

Hiện tại crawler/cron có rủi ro chạy trùng nếu scale nhiều process.

Nên chuyển crawler sang VPS 2 worker.

Dùng Redis lock:

```text
lock:crawler:tmdb:movie
lock:crawler:tmdb:tv
lock:ga-polling
lock:gsc-polling
lock:cleanup
```

Chỉ cho 1 process chạy crawler/polling/cleanup tại một thời điểm.

Không nên chạy crawler tự động trong app startup khi scale nhiều instance.

---

## 13. Cache plan

## Cache Cloudflare

Cache các file static:

```text
/_next/static/*
/assets/*
/public/*
poster/backdrop nếu là public asset
player js/css
```

Không cache:

```text
admin API
auth API
upload API
user personalized data
```

## Cache Redis

Cache endpoint đọc nhiều:

| Endpoint | TTL gợi ý |
|---|---:|
| `/api/v1/home` | 30-120s |
| `/api/v1/phim/:slug` | 1-10 phút |
| `/api/v1/watch/:slug/:episode_slug` | 30-300s |
| `/api/v1/menu/the-loai` | 10-60 phút |
| `/api/v1/menu/quoc-gia` | 10-60 phút |
| `/api/v1/duyet-tim` | 30-120s |

View counter nên buffer qua Redis rồi flush về MongoDB theo batch, tránh mỗi lượt xem lại `$inc` trực tiếp vào MongoDB.

---

## 14. Nginx plan

Nginx chạy trên VPS 1.

Route:

```text
example.com          -> client
api.example.com      -> webapi
admin.example.com    -> admin
server.example.com   -> server
cdn.example.com      -> cdn-api
```

Nginx cần hỗ trợ:

```text
WebSocket upgrade
proxy timeout
upload body size nếu upload qua VPS 1
X-Forwarded-For
X-Forwarded-Proto
X-Real-IP
```

Nếu upload file lớn qua VPS 1:

```nginx
client_max_body_size 5G;
proxy_request_buffering off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

---

## 15. Backup plan

Vì MongoDB tự host trên VPS 2 nên backup là bắt buộc.

Backup nên chạy hằng ngày:

```text
mongodump
gzip/nén
upload backup ra ngoài VPS 2
```

Nơi lưu backup:

```text
Cloudflare R2
Amazon S3
Backblaze B2
Google Drive
server backup riêng
```

Lịch đề xuất:

```text
02:00 mỗi ngày
Giữ 7 bản daily
Giữ 4 bản weekly
Giữ 3-6 bản monthly nếu dữ liệu quan trọng
```

Không nên chỉ lưu backup trong VPS 2, vì nếu VPS 2 mất disk thì mất cả database lẫn backup.

Nên định kỳ test restore sample.

---

## 16. Monitoring/alert

## VPS 1 cần monitor

```text
CPU/RAM
network
Nginx 4xx/5xx
API latency
Node process restart
Redis memory
Redis connections
disk usage
```

## VPS 2 cần monitor

```text
CPU/RAM
disk usage
disk I/O
MongoDB connections
MongoDB slow query
worker queue backlog
FFmpeg job running
temp folder size
backup success/fail
```

Alert tối thiểu:

```text
disk > 80%
RAM > 85%
CPU 100% kéo dài
MongoDB down
Redis down
backup fail
queue backlog cao
Nginx 502/504 tăng
```

---

## 17. Bảo mật

Checklist bảo mật bắt buộc:

```text
MongoDB không public
Redis không public
Worker port không public
SSH dùng key
Tắt SSH password nếu được
Firewall chỉ mở 80/443/SSH
Admin dùng Cloudflare Access hoặc IP allowlist
Upload route bắt buộc admin auth
Delete route bắt buộc admin auth
Rate limit login/upload/search
Không log token/cookie/key
.env không commit
Backup mã hóa nếu chứa dữ liệu nhạy cảm
Rotate secret nếu từng lộ trong repo/log
```

Admin domain nên được bảo vệ thêm:

```text
Cloudflare Access
hoặc VPN
hoặc IP allowlist
```

---

## 18. Thứ tự triển khai thực tế

```text
[ ] Mua 2 VPS cùng region/datacenter
[ ] Setup Cloudflare DNS
[ ] Setup SSH key và user deploy
[ ] Update OS
[ ] Setup firewall
[ ] Setup VPC hoặc WireGuard giữa 2 VPS
[ ] Test private network VPS 1 <-> VPS 2
[ ] Setup MongoDB trên VPS 2
[ ] Bind MongoDB vào 127.0.0.1 và private IP
[ ] Tạo MongoDB database/user
[ ] Setup Redis trên VPS 1
[ ] Bind Redis vào 127.0.0.1 và private IP
[ ] Restore/import database vào VPS 2
[ ] Tạo MongoDB index cần thiết
[ ] Setup backup MongoDB ra storage ngoài
[ ] Deploy app services trên VPS 1
[ ] Deploy worker services trên VPS 2
[ ] Setup Nginx reverse proxy trên VPS 1
[ ] Setup SSL/Cloudflare
[ ] Setup Cloudflare Access cho admin
[ ] Test user flow: home/detail/watch
[ ] Test admin flow: login/upload/preview
[ ] Test worker flow: queue/transcode/crawler
[ ] Test backup/restore sample
[ ] Setup monitoring/alert
```

---

## 19. Điểm nghẽn chính khi nhiều user

Vì video TikTok HLS/direct được client tự kéo, VPS không còn gánh băng thông segment video chính. Các điểm nghẽn còn lại là:

```text
1. FFmpeg/upload/transcode trên VPS 2
2. MongoDB trên VPS 2
3. API/cache trên VPS 1
4. Redis queue/cache/lock/progress
5. Crawler/cron chạy trùng
6. Local temp/key/manifest state
7. Admin/upload security
8. Backup/monitoring
```

Ưu tiên xử lý:

```text
1. Tách worker khỏi request HTTP dài
2. Dùng Redis queue
3. Cache endpoint đọc nhiều
4. Tạo index MongoDB
5. Buffer view counter qua Redis
6. Dùng lock cho crawler/cron
7. Backup MongoDB hằng ngày
```

---

## 20. Kế hoạch mở rộng sau này

## Nếu nghẽn FFmpeg/upload

Thêm VPS worker:

```text
VPS 3 = worker FFmpeg/upload thứ 2
```

Kết nối:

```text
VPS 3 -> Redis queue VPS 1
VPS 3 -> MongoDB VPS 2
```

Worker mới chỉ cần consume cùng Redis queue là scale được.

---

## Nếu nghẽn MongoDB vì VPS 2 vừa DB vừa worker

Tách MongoDB ra VPS riêng:

```text
VPS 2 = worker only
VPS 3 = MongoDB riêng
```

Đây có thể là hướng nâng cấp quan trọng nhất nếu traffic và upload đều tăng.

---

## Nếu nghẽn API/web

Thêm app node:

```text
VPS 3 = app node 2
```

Khi có từ 2 app node trở lên mới cần load balancing thật sự:

```text
Cloudflare Load Balancing
hoặc Nginx/HAProxy LB
```

Lúc đó Redis cần dùng cho:

```text
session/rate limit shared
Socket.IO adapter
cache shared
queue shared
lock shared
```

---

## 21. Kết luận

Mô hình 2 VPS hợp lý nhất giai đoạn đầu:

```text
VPS 1:
- Nginx
- client
- admin
- webapi
- server
- cdn-api nhẹ
- Redis

VPS 2:
- MongoDB
- FFmpeg/upload worker
- crawler worker
- cleanup worker
- backup job
```

Bắt buộc nên có:

```text
Cloudflare cho public traffic
VPC hoặc WireGuard giữa 2 VPS
MongoDB/Redis không public
Backup MongoDB hằng ngày
Redis queue/cache/lock/progress
Nginx reverse proxy
Admin protection
Monitoring/alert
```

Giai đoạn 2 VPS **chưa cần load balancing thật sự**. Chỉ cần Nginx reverse proxy trên VPS 1. Load balancing chỉ cần khi sau này có thêm app node thứ 2.
