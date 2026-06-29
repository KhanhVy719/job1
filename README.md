# Rophim Database VPS Setup

Branch này chỉ chứa phần liên quan đến database để chuẩn bị setup MongoDB trên VPS trước.

## Nội dung

- `database/ONE_VPS_DATABASE_SETUP.md` — kế hoạch setup MongoDB trên 1 VPS giai đoạn đầu.
- `database/MONGODB_INDEX_PLAN.md` — index MongoDB cần có theo schema/source hiện tại.
- `database/templates/mongod.conf` — template cấu hình MongoDB bind private/local IP.
- `database/templates/env.database.example` — biến môi trường mẫu, không chứa secret thật.
- `database/scripts/setup-mongodb-ubuntu.sh` — script cài MongoDB/user/firewall cơ bản trên Ubuntu.
- `database/scripts/create-indexes.mongodb.js` — script tạo index cho collections quan trọng.
- `database/scripts/backup-mongodb.sh` — script backup MongoDB bằng `mongodump`.

## Nguyên tắc bảo mật

- Không commit `.env`, MongoDB URI thật, password, private key, token hoặc cookie.
- MongoDB không bind public IP.
- Port `27017` chỉ mở cho localhost/private IP/app VPS.
- Backup nên được copy ra storage ngoài VPS.
