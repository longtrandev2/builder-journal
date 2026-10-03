# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), version theo [SemVer](https://semver.org/).

## [Unreleased]

### Added
- Bạn đồng hành pixel (Cam / Lệnh / Cú) trên trang Wrapped: đổi dáng theo từng màn, tự chọn theo agent dùng nhiều nhất, đổi tay trong menu giao diện (nhớ lựa chọn). Có mặt trong ảnh PNG tải về.
- Màn cuối có "Lời nhắn" từ bạn đồng hành: 2–3 câu dựa trên số liệu thật (giờ giấc, chuỗi ngày, tỉ lệ test/fix, lệnh cho agent…) và một câu chúc. Không bao giờ dùng nội dung lệnh.
- Số liệu mới: tỉ lệ commit khuya và cuối tuần, khoảng nghỉ dài nhất, số ngày từ commit gần nhất, lệnh theo từng agent, số lần giao việc cho subagent.

### Changed
- "Buổi code" (ước lượng theo khoảng cách giữa các commit) được thay bằng "ngày có mặt" (số ngày có commit, đếm chính xác) trên trang, card và terminal. Bỏ dòng "Buổi dài nhất" ở màn giờ giấc.

## [0.2.0] — 2026-10-03

### Removed
- Devlog (`last`, `since`, `status`) — sản phẩm tập trung vào Wrapped. Tool giờ **không gửi dữ liệu đi đâu**.
- Câu "bảo agent làm lại N lần" (đếm theo từ khoá, không đủ tin cậy).

### Added
- `bj update`: cập nhật lên bản mới nhất (`npm i -g builder-journal@latest`).
- README: mục Cập nhật.

### Changed
- Số commit **tính cả merge commit**; trang ghi rõ có bao nhiêu merge. Merge không có diff riêng nên không xếp mảng việc và không cộng dòng code.
- Trang cuối, card SVG và card tuần hiện lệnh cài npm: `npm i -g builder-journal`, rồi `bj wrapped`.
- Nhanh hơn: log agent chỉ đọc một lần, dò repo và đọc git song song (tối đa 8 tiến trình) — `wrapped --all` từ ~16 giây còn ~6 giây.

## [0.1.3] — 2026-10-03

### Added
- Gõ `bj` không kèm gì trong terminal → menu đánh số chọn việc (Wrapped repo / của bạn / card tuần / devlog / trạng thái / trợ giúp), in kèm lệnh tương ứng.
- Phát hành trên npm: `npx builder-journal wrapped` (cài hẳn: `npm i -g builder-journal`, rồi gõ `bj`).

### Docs
- README: bảng đầy đủ mọi lệnh và cờ (thêm `--hardest`, `--extract-only`, `--narrator-timeout`).

## [0.1.2] — 2026-10-03

### Changed
- Mảng việc: commit có tiền tố Conventional Commits (`feat:`, `fix(api):`, `refactor!:`, `docs:`, `test:`, `ci:`/`build:`…) được phân loại theo tiền tố; chỉ commit không có tiền tố mới dùng hình dạng diff. Trên 628 commit thật: 98% theo tiền tố (trước đây khớp tiền tố chỉ 67%, yếu nhất ở sửa lỗi 46%).
- Màn "Mảng việc" ghi rõ bao nhiêu % phân loại theo mỗi cách. `chore:` không ánh xạ cứng (việc vặt chung chung) — để hình dạng diff quyết định.

### Docs
- README: phần Cần có, Chạy lần đầu từng bước (Windows/macOS), File được tạo ở đâu, Gặp lỗi?, Chạy từ mã nguồn.

## [0.1.1] — 2026-10-03

### Fixed
- Mọi màn Wrapped vừa một màn hình ở 390–1920px; ảnh "Tải ảnh" luôn đúng 1080×1350, không bị cắt, biểu đồ chỉ thu nhỏ một lần.
- Màn "Bạn đã chỉ đạo" và "Đòn bẩy": so sánh giờ ra lệnh / giờ commit và chuỗi lệnh → commit → dòng chỉ tính trong khoảng có log agent; không có commit trong khoảng đó thì bỏ phần so sánh.
- Ảnh xuất giữ dòng ghi khoảng ngày của log (theo giờ địa phương), để con số không bị hiểu sai khi chia sẻ.
- Nhãn giờ trên biểu đồ dễ đọc trên điện thoại; card tuần ghi "Tuần đến …", bố cục gọn hơn.

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

[0.2.0]: https://github.com/longtrandev2/builder-journal/releases/tag/v0.2.0
[0.1.3]: https://github.com/longtrandev2/builder-journal/releases/tag/v0.1.3
[0.1.2]: https://github.com/longtrandev2/builder-journal/releases/tag/v0.1.2
[0.1.1]: https://github.com/longtrandev2/builder-journal/releases/tag/v0.1.1
[0.1.0]: https://github.com/longtrandev2/builder-journal/releases/tag/v0.1.0
