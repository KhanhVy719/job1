# Setup database Rophim trên 1 VPS trước

Tài liệu này tách riêng các phần liên quan database từ kế hoạch hạ tầng để triển khai MongoDB trước. Ở giai đoạn sau, app/worker có thể được đưa sang VPS khác và kết nối qua private network/VPC/WireGuard.

## 1. Phạm vi database

Database chính:

```text
MongoDB
```

Database lưu các nhóm dữ liệu chính:

```text
movies
seasons
episodes
scheduledepisodes
users
categories
countries
actors/studios
```

## 2. Cấu hình VPS tối thiểu cho node database

Nếu VPS này chỉ ưu tiên database giai đoạn đầu:

```text
4-8 vCPU
16-32GB RAM
200-500GB NVMe
```

Nếu VPS này vừa chạy MongoDB vừa chạy worker FFmpeg/upload/crawler thì nên dùng cấu hình mạnh hơn:

```text
8 vCPU+
32GB RAM+
500GB NVMe+
```

Lý do cần RAM/disk I/O tốt:

- MongoDB cần RAM cho working set/cache.
- Query phim/tập/lịch chiếu đọc nhiều cần index tốt.
- Backup/restore tạo tải disk.
- Nếu chạy cùng worker FFmpeg thì CPU/temp file có thể tranh tài nguyên với MongoDB.

## 3. Network và firewall

Giai đoạn 1 VPS database trước:

```text
MongoDB bind: 127.0.0.1
MongoDB port: 27017 không mở public
SSH: giới hạn IP quản trị nếu có thể
```

Khi tách app sang VPS khác:

```text
MongoDB bind: 127.0.0.1 + private IP/VPN IP của database VPS
App VPS -> MongoDB qua private IP/VPN IP
Không dùng public IP cho MONGODB_URI
```

Ví dụ private network sau này:

```text
App VPS:      10.8.0.1
Database VPS: 10.8.0.2
MongoDB:      10.8.0.2:27017
```

Firewall khi đã có app VPS riêng:

```text
27017/tcp chỉ allow từ 127.0.0.1 và IP private của app VPS
27017/tcp không allow từ internet
```

## 4. Database/user

Tạo database và user app riêng:

```text
database: rophim
user: rophim_app
role: readWrite trên database rophim
```

Không hardcode password vào repo. Password nhập qua biến môi trường khi chạy script.

URI mẫu trên cùng VPS:

```env
MONGODB_URI=mongodb://rophim_app:<CHANGE_ME_PASSWORD>@127.0.0.1:27017/rophim?authSource=admin
```

URI mẫu khi app ở VPS khác qua private IP:

```env
MONGODB_URI=mongodb://rophim_app:<CHANGE_ME_PASSWORD>@10.8.0.2:27017/rophim?authSource=admin
```

## 5. Pool MongoDB

Giữ pool vừa phải giai đoạn đầu để tránh nhiều service cộng dồn làm quá tải connection.

Gợi ý ban đầu:

```env
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=0
```

Khi traffic tăng mới tăng dần:

```env
MONGODB_MAX_POOL_SIZE=20
```

## 6. Backup bắt buộc

Vì MongoDB tự host nên backup phải chạy hằng ngày.

Lịch gợi ý:

```text
02:00 mỗi ngày
Giữ 7 bản daily
Giữ 4 bản weekly
Giữ 3-6 bản monthly nếu dữ liệu quan trọng
```

Không chỉ lưu backup trong cùng VPS. Sau khi dump nên upload/copy sang storage ngoài như:

```text
Cloudflare R2
Amazon S3
Backblaze B2
Google Drive
server backup riêng
```

Cần test restore sample định kỳ.

## 7. Monitoring tối thiểu

Cần monitor:

```text
CPU/RAM
disk usage
disk I/O
MongoDB connections
MongoDB slow query
backup success/fail
```

Alert tối thiểu:

```text
disk > 80%
RAM > 85%
MongoDB down
backup fail
slow query tăng bất thường
```

## 8. Checklist triển khai database trước

```text
[ ] Tạo VPS database
[ ] Setup SSH key và user deploy/admin
[ ] Update OS
[ ] Setup firewall
[ ] Install MongoDB
[ ] Bind MongoDB vào 127.0.0.1 trước
[ ] Tạo admin/root user nếu cần
[ ] Tạo database rophim
[ ] Tạo user rophim_app quyền readWrite
[ ] Cấu hình MONGODB_URI cho app/worker bằng secret ngoài repo
[ ] Restore/import database nếu có dump
[ ] Tạo MongoDB indexes cần thiết
[ ] Setup backup MongoDB hằng ngày
[ ] Copy backup ra storage ngoài VPS
[ ] Test restore sample
[ ] Setup monitoring/alert MongoDB/disk/backup
```
