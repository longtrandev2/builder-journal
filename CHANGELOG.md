# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), version theo [SemVer](https://semver.org/).

## [0.1.0] — 2026-10-03

Bản đầu tiên, làm trong buổi build thứ Bảy đầu tiên.

### Added
- `wrapped`: trang Wrapped tự chứa (1 file HTML, chạy offline) cho một repo — dải phim commit, câu hero với số buổi / commit / mảng việc / dòng code đã ship, lịch từng ngày, mảng việc, đồng hồ 24h, câu chốt.
- `wrapped --all`: Wrapped của cả người — tự tìm repo từ log agent, xác nhận danh sách trước khi xuất, `--include` / `--exclude` / `--hide-names`.
- `wrapped --week`: card 1 màn cho 7 ngày gần nhất.
- Lớp AI (khi có log Claude Code; Codex bản beta): số lệnh, giờ làm thật, số lần bảo agent làm lại, việc agent đã làm, model, chuỗi đòn bẩy lệnh → commit → dòng. Chỉ số tổng, không có nội dung prompt.
- Nút "Tải ảnh" PNG 1080×1350 cho từng màn; 3 giao diện đêm / bình minh / giấy; card SVG cho README/blog.
- `last` / `since` / `status`: devlog tiếng Việt đúng format group, hỏi một câu "vấp gì nhất", nhờ `claude -p` viết (khóa tool/MCP), fallback dán vào chat AI bất kỳ; sổ cái `.journal/journal.jsonl` không kể trùng, không bỏ sót.
- Hỏi đồng ý một lần trước khi đọc log agent và trước khi gửi diff cho AI ở mỗi repo.

### Security
- Che secret trước khi tạo prompt (key, token, chuỗi kết nối, JWT…); bỏ hẳn diff của `.env*`, khóa, chứng chỉ.
- Trang share không chứa đường dẫn tuyệt đối, email hay chữ nào từ prompt.

[0.1.0]: https://github.com/longtrandev2/builder-journal/releases/tag/v0.1.0
