# database/

Tài liệu và script hỗ trợ cho PostgreSQL.

> **Schema migration KHÔNG nằm ở đây.** Mọi thay đổi schema đi qua Flyway tại
> `backend/src/main/resources/db/migration/` và được chạy tự động khi backend khởi động.

| Thư mục / file | Mục đích |
|---|---|
| `seed/` | Dữ liệu mẫu cho môi trường dev (chạy thủ công, không chạy ở production). |
| `README.md` | Ghi chú về database, quy ước, lệnh hữu ích. |

## Lệnh hữu ích

```bash
# Mở psql trong container
docker exec -it edugame-postgres psql -U edugame -d edugame

# Xem lịch sử migration
docker exec edugame-postgres psql -U edugame -d edugame -c "select version, description, success from flyway_schema_history;"

# Xoá sạch dữ liệu local (mất toàn bộ data!)
docker compose down -v
```
