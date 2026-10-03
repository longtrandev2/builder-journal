# builder-journal

Nhật ký build chạy local cho thời AI. Một lệnh đọc git của bạn (và log agent nếu có) rồi kể lại đoạn đường vừa đi: trang **Wrapped** kiểu Spotify, card tuần, và bản nháp **devlog** tiếng Việt để đăng group.

Không server, không đăng nhập. Mọi con số được tính ngay trên máy bạn. Riêng `last`/`since` sẽ gửi trích đoạn diff (đã lọc bí mật, bỏ hẳn file `.env`/khóa) cho `claude` cài trên máy bạn để viết bài — giống như bạn dùng Claude Code; thêm `--narrator manual` nếu không muốn gọi AI tự động. `wrapped` không gửi gì đi đâu cả.

## Thử ngay

```bash
cd repo-cua-ban
npx github:longtrandev2/builder-journal wrapped
```

Khoảng vài giây sau trình duyệt mở trang Wrapped của repo: dải phim commit, số buổi code, lịch từng ngày, bạn dành thời gian cho gì, giờ code nhiều nhất. Mỗi màn có nút **Tải ảnh** để đăng Facebook.

Cài hẳn để gõ ngắn (`bj` là tên tắt):

```bash
npm i -g github:longtrandev2/builder-journal
bj wrapped
```

## Lệnh

| Lệnh | Làm gì |
|---|---|
| `bj wrapped` | Wrapped của repo hiện tại (toàn bộ lịch sử) |
| `bj wrapped --all` | Wrapped của **bạn**: tự tìm mọi repo từ log agent, gộp lại |
| `bj wrapped --week` | Card 1 màn cho 7 ngày gần nhất |
| `bj last` | Devlog cho phần chưa kể (từ lần kể trước tới giờ) |
| `bj since 3d` / `bj since 2026-07-01` | Devlog cho một khoảng; khoảng dài hơn 14 ngày sẽ kể gộp theo tuần |
| `bj status` | Đã kể tới đâu, còn bao nhiêu commit chưa kể |

Tuỳ chọn hay dùng: `--repo <đường dẫn>`, `--author "<tên trong git>"` (lặp lại được), `--theme đêm|bình-minh|giấy`, `--unit week|month|quarter`, `--since 90d`, `--exclude ten-repo`, `--no-ai`, `--no-open`.

## Lớp AI (nếu bạn code bằng agent)

Nếu máy có log của **Claude Code** (`~/.claude/projects`) hoặc **Codex** (`~/.codex/sessions`, bản beta), Wrapped có thêm 2 màn: bạn đã ra bao nhiêu lệnh, ngồi lái agent bao nhiêu giờ thật, bảo agent làm lại mấy lần, agent đã sửa bao nhiêu file, chạy bao nhiêu lệnh.

Trang chỉ chứa **số tổng**. Không có chữ nào từ prompt của bạn. Tắt hẳn bằng `--no-ai`.

Lưu ý: Claude Code tự xoá log sau khoảng 30 ngày, nên lớp AI chỉ phủ được khoảng đó. Chạy `bj wrapped --week` mỗi tuần để giữ lại.

## Devlog

`bj last` hỏi một câu: *Kỳ này vấp gì nhất?* (Enter để bỏ qua), rồi nhờ `claude -p` viết bản nháp đúng format group:

```
ten-repo — 26/09 – 03/10/2026

3 buổi code / 14 commits / 3 mảng việc
Nổi nhất: ...
Vấp thật: ...

2-3 câu kể đã làm gì, quyết định gì, vì sao.

Thử ngay: npx github:longtrandev2/builder-journal

(AI hỗ trợ tổng hợp — số liệu đọc trực tiếp từ git)
```

Số liệu luôn do tool đếm từ git; AI chỉ viết chữ và bị cấm viết số. Không có `claude` trên máy? Tool lưu sẵn file prompt `.journal/narrator-prompt-*.md` — dán vào chat AI bất kỳ, lưu câu trả lời rồi chạy lại với `--narrative <file>`.

Sổ cái `.journal/journal.jsonl` nhớ đã kể tới commit nào, nên các lần `last` không bao giờ kể trùng hay bỏ sót. Thư mục `.journal/` tự được thêm vào `.git/info/exclude`, không lọt vào commit.

## Cách đếm

- **Buổi**: chuỗi commit cách nhau không quá 2 giờ.
- **Mảng việc**: phân loại theo hình dạng diff (file mới, đổi tên, tỉ lệ thêm/xoá, loại file), không đọc commit message: tính năng, sửa lỗi, dọn code, kiểm thử, tài liệu, hạ tầng.
- **Dòng code đã ship**: dòng thêm vào file mã nguồn (tính cả code agent viết); bỏ qua tài liệu, cấu hình, lockfile, thư mục build và bộ kit agent (`.claude/`, `.opencode/`…).
- **Giờ làm thật** (khi có log agent): tổng thời gian giữa các hoạt động cách nhau không quá 30 phút.

## Yêu cầu

Node.js 18+, git. Chạy được trên Windows, macOS, Linux.

## License

MIT. Thư viện nhúng trong trang: anime.js (MIT), Lucide (ISC), Be Vietnam Pro (OFL).
