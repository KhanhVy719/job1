# MongoDB index plan cho Rophim

Index dưới đây dựa trên kế hoạch hạ tầng và schema/source hiện tại. Chạy bằng `database/scripts/create-indexes.mongodb.js` sau khi restore/import dữ liệu.

## Collections chính

### movies

Đọc nhiều ở home/list/detail/search/filter.

```text
slug unique
type
status
year
view
createdAt
updatedAt
tmdb.id
imdb.id
name text/or normal index tùy chiến lược search
origin_name text/or normal index tùy chiến lược search
category
country
```

Compound gợi ý:

```text
{ type: 1, status: 1, year: -1 }
{ type: 1, view: -1 }
{ status: 1, updatedAt: -1 }
```

### seasons

```text
movie_id
slug
season_number
{ movie_id: 1, season_number: 1 } unique
```

### episodes

```text
movie_id
season_id
slug
episode
air_date
{ season_id: 1, episode: 1 } unique
{ movie_id: 1, air_date: 1 }
```

### scheduledepisodes

Dùng cho `/lich-chieu` và `/showtimes/by-date/:date`.

```text
show_date
show_time
movie_slug
source
source_id
is_active
{ show_date: 1, show_time: 1 }
{ show_date: 1, movie_slug: 1, episode: 1 } unique
{ source: 1, source_id: 1 }
```

### users

```text
email unique
username nếu collection có field này
favorites.movie nếu cần thống kê/lọc nhiều
history.movie nếu cần query lịch sử nhiều
```

## Lưu ý

- Không tạo quá nhiều index khi chưa có query thực tế vì index làm chậm write và tốn disk/RAM.
- Sau khi chạy production một thời gian, dùng `explain()` và slow query log để điều chỉnh.
- Nếu search lớn trở thành bottleneck, cân nhắc Meilisearch/Typesense/OpenSearch thay vì ép MongoDB text search.
