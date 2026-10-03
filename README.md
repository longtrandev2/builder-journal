# builder-journal

Nhật ký build chạy local cho thời AI. Một lệnh đọc git của bạn (và log agent nếu có) rồi kể lại đoạn đường vừa đi: trang **Wrapped** kiểu Spotify, card tuần, và bản nháp **devlog** tiếng Việt để đăng group.

Không server, không đăng nhập. Mọi con số được tính ngay trên máy bạn. Riêng `last`/`since` sẽ gửi trích đoạn diff (đã lọc bí mật, bỏ hẳn file `.env`/khóa) cho `claude` cài trên máy bạn để viết bài — giống như bạn dùng Claude Code; thêm `--narrator manual` nếu không muốn gọi AI tự động. `wrapped` không gửi gì đi đâu cả.

## Cần có

- **Node.js 18 trở lên** và **git**. Kiểm tra: `node -v` (ra `v18…` trở lên) và `git --version`. Chưa có thì cài Node bản LTS ở nodejs.org.
- Một thư mục là **git repo có commit của bạn**.
- Tuỳ chọn: **Claude Code** (lệnh `claude`) để tự viết devlog. Không có cũng chạy được Wrapped, còn devlog chuyển sang chế độ dán vào chat AI bất kỳ.

Chạy được trên Windows (PowerShell), macOS và Linux.

## Chạy lần đầu (5 phút)

**1. Mở terminal ở thư mục repo của bạn**

```powershell
# Windows PowerShell
cd D:\duong-dan\toi\repo-cua-ban
```

```bash
# macOS / Linux
cd ~/duong-dan/toi/repo-cua-ban
```

**2. Tạo trang Wrapped**

```bash
npx github:longtrandev2/builder-journal wrapped
```

Lần đầu npx tải tool về mất khoảng 20 giây, các lần sau nhanh hơn. Nếu máy có log agent, tool hỏi một câu *có cho đọc log để đếm số không* — gõ Enter là đồng ý, `n` là không.

**3. Xem kết quả**

Trình duyệt tự mở trang Wrapped. Cuộn xuống để xem từng màn, bấm **Tải ảnh** ở màn nào muốn đăng (ảnh 1080×1350, hợp Facebook), đổi giao diện ở nút tròn góc phải dưới. Terminal cũng in tóm tắt 4 con số và đường dẫn file.

**4. Viết devlog (tuỳ chọn)**

```bash
npx github:longtrandev2/builder-journal last
```

Trả lời câu *Kỳ này vấp gì nhất?* (Enter để bỏ qua). Lần đầu ở mỗi repo, tool hỏi có cho gửi trích đoạn diff (đã che bí mật) tới `claude` không — gõ `y` để đồng ý (mặc định là không; khi đó tool chuyển sang chế độ dán vào chat AI). Khoảng 20 giây sau có bản nháp bài đăng in ra màn hình và lưu vào file.

**Cài hẳn để gõ ngắn** — sau đó dùng `bj` thay cho cả dòng `npx …`:

```bash
npm i -g github:longtrandev2/builder-journal
bj wrapped
```

## File được tạo ở đâu

| Lệnh | File |
|---|---|
| `wrapped` | `<repo>/.journal/wrapped-YYYY-MM-DD.html` và `wrapped-card-YYYY-MM-DD.svg` |
| `wrapped --all` | `~/.builder-journal/wrapped-YYYY-MM-DD.html` (Windows: `C:\Users\<bạn>\.builder-journal\`) |
| `wrapped --week` | `<repo>/.journal/weekly-card-YYYY-MM-DD.html` |
| `last` / `since` | `<repo>/.journal/devlog-YYYY-MM-DD.md` (+ sổ cái `journal.jsonl`) |

Trang HTML là **một file duy nhất, chạy offline**: gửi file, mở bằng trình duyệt nào cũng được. `.journal/` không bao giờ lọt vào commit của bạn.

## Lệnh

| Lệnh | Làm gì |
|---|---|
| `bj wrapped` | Wrapped của repo hiện tại (toàn bộ lịch sử) |
| `bj wrapped --all` | Wrapped của **bạn**: tự tìm mọi repo từ log agent, gộp lại |
| `bj wrapped --week` | Card 1 màn cho 7 ngày gần nhất |
| `bj last` | Devlog cho phần chưa kể (từ lần kể trước tới giờ) |
| `bj since 3d` / `bj since 2026-07-01` | Devlog cho một khoảng; khoảng dài hơn 14 ngày sẽ kể gộp theo tuần |
| `bj status` | Đã kể tới đâu, còn bao nhiêu commit chưa kể |

Tuỳ chọn hay dùng: `--repo <đường dẫn>`, `--author "<tên trong git>"` (lặp lại được), `--theme đêm|bình-minh|giấy`, `--unit week|month|quarter`, `--since 90d`, `--no-open`.

Riêng `wrapped`: `--all` kèm `--include <đường dẫn>` / `--exclude <tên>` / `--hide-names` (đổi tên repo thành Repo A, B… trên trang và ảnh), `--ai` / `--no-ai` (bật/tắt đọc log agent, nhớ lựa chọn), `-y, --yes` (không hỏi). Riêng `last`/`since`: `-y, --yes` (đồng ý gửi diff cho claude ở repo này), `--narrator manual`, `--narrative <file>`.

## Lớp AI (nếu bạn code bằng agent)

Nếu máy có log của **Claude Code** (`~/.claude/projects`) hoặc **Codex** (`~/.codex/sessions`, bản beta), Wrapped có thêm 3 màn: *Bạn đã chỉ đạo* (bao nhiêu lệnh, bao nhiêu giờ làm thật, bảo agent làm lại mấy lần, giờ ra lệnh so với giờ ship), *Agent đã làm* (sửa bao nhiêu file, chạy bao nhiêu lệnh, model nào) và *Đòn bẩy* (lệnh → commit → dòng, chỉ tính trong khoảng có log).

Lần đầu chạy, tool hỏi bạn có đồng ý cho đọc log không và nhớ lựa chọn. Không phải terminal tương tác thì mặc định không đọc — thêm `--ai`. Trang chỉ chứa **số tổng**, không có chữ nào từ prompt của bạn.

Lưu ý: Claude Code tự xoá log sau khoảng 30 ngày, nên lớp AI chỉ phủ được khoảng đó (trang ghi rõ khoảng ngày). Bản này chưa lưu lại số liệu cũ — sẽ có ở bản sau.

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
- **Mảng việc** (tính năng, sửa lỗi, dọn code, kiểm thử, tài liệu, hạ tầng): commit có tiền tố [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix(api):`, `refactor!:`, `docs:`, `test:`, `ci:`/`build:`…) được phân loại theo tiền tố (`chore:` là việc vặt chung chung nên để diff quyết định); commit không có tiền tố thì theo hình dạng diff (file mới, đổi tên, tỉ lệ thêm/xoá, loại file). Message tự do như "update" không dùng để phân loại. Trang ghi rõ bao nhiêu % theo mỗi cách.
- **Dòng code đã ship**: dòng thêm vào file mã nguồn (tính cả code agent viết); bỏ qua tài liệu, cấu hình, lockfile, thư mục build và bộ kit agent (`.claude/`, `.opencode/`…).
- **Giờ làm thật** (khi có log agent): tổng thời gian giữa các hoạt động cách nhau không quá 30 phút.

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| `Không thấy commit nào của …` | Tên/email trong git khác với trên commit. Xem tên thật bằng `git log --format="%an <%ae>" -5`, rồi chạy lại với `--author "Tên"` (lặp lại được cho nhiều tên/email), hoặc sửa `authors` trong `.journal/config.json`. |
| `Thư mục không phải git repo` | `cd` vào đúng thư mục repo, hoặc thêm `--repo "<đường dẫn>"`. Đường dẫn có dấu cách thì để trong ngoặc kép. |
| Trình duyệt không tự mở | Mở tay file mà terminal in ra (dòng `Trang: …`). Hoặc thêm `--no-open` nếu không muốn mở. |
| Không có màn AI | Máy không có log Claude Code/Codex trong khoảng 30 ngày, hoặc bạn đã chọn không. Bật lại: thêm `--ai`. |
| Muốn đổi lựa chọn đồng ý | Đọc log agent: chạy với `--ai` hoặc `--no-ai` (nhớ lựa chọn mới), hoặc xoá `~/.builder-journal/config.json` để được hỏi lại. Gửi diff cho AI: sửa `sendDiffToAi` trong `<repo>/.journal/config.json`. |
| `Không tìm thấy lệnh claude` / `claude trả lời quá lâu` | Tool tự chuyển sang chế độ thủ công: mở file `.journal/narrator-prompt-*.md`, copy phần dưới đường kẻ, dán vào chat AI bất kỳ, lưu câu trả lời vào `.journal/narrative.md`, rồi chạy lệnh in ra trên màn hình (có `--narrative`). |
| `Không tìm thấy commit nào trong 21 ngày` | Repo không có commit gần đây — dùng `since 2026-07-01` (mốc bất kỳ) để kể khoảng cũ, hoặc chỉ chạy `wrapped`. |
| `--all` không có repo nào | Chế độ này tìm repo qua log agent. Thêm repo bằng tay: `--include "D:\repo-a,D:\repo-b"`. |
| npx chậm hoặc bản cũ | Ghim phiên bản: `npx github:longtrandev2/builder-journal#v0.1.1 wrapped`. |

## Chạy từ mã nguồn

```bash
git clone https://github.com/longtrandev2/builder-journal.git
cd builder-journal
npm install
node bin/builder-journal.js --help
node bin/builder-journal.js wrapped --repo "<đường dẫn repo bất kỳ>"
npm test
```

Nhánh: `main` = bản phát hành (có tag), `develop` = tích hợp, `feat/*` / `fix/*` mở PR vào `develop`. Commit theo [Conventional Commits](https://www.conventionalcommits.org/). Thay đổi từng bản: [CHANGELOG.md](CHANGELOG.md).

## License

MIT. Thư viện nhúng trong trang: anime.js (MIT), html-to-image (MIT), Lucide (ISC), Be Vietnam Pro (OFL); license đầy đủ đi kèm trong thư mục license của thư viện nhúng.
