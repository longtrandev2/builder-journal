# builder-journal

Wrapped cho builder thời AI. Một lệnh đọc git của bạn (và log agent nếu có) rồi kể lại đoạn đường vừa đi bằng một trang **Wrapped**: dải phim commit, số buổi code, lịch từng ngày, bạn dành thời gian cho gì, giờ code nhiều nhất — và nếu bạn code cùng agent: bạn đã ra bao nhiêu lệnh, agent đã làm gì cho bạn.

**Chạy hoàn toàn trên máy bạn.** Không server, không đăng nhập, không gửi dữ liệu đi đâu. Repo private vẫn dùng được.

## Cần có

- **Node.js 18 trở lên** và **git**. Kiểm tra: `node -v` (ra `v18…` trở lên) và `git --version`. Chưa có thì cài Node bản LTS ở nodejs.org.
- Một thư mục là **git repo có commit của bạn**.

Chạy được trên Windows (PowerShell), macOS và Linux.

## Chạy lần đầu

```bash
cd duong-dan/toi/repo-cua-ban
npx builder-journal wrapped
```

Lần đầu npx tải tool về mất khoảng 20 giây. Nếu máy có log Claude Code / Codex, tool hỏi một câu *có cho đọc log để đếm số không* — Enter là đồng ý, `n` là không.

Trình duyệt tự mở trang Wrapped. Cuộn xuống xem từng màn, bấm **Tải ảnh** ở màn muốn đăng (ảnh 1080×1350, hợp Facebook), đổi giao diện ở nút tròn góc phải dưới.

**Cài hẳn để gõ ngắn:**

```bash
npm i -g builder-journal
bj              # không kèm gì: menu chọn việc
bj wrapped
```

## Cập nhật lên bản mới

```bash
bj update                              # đã cài global
npm i -g builder-journal@latest        # cách tương đương
npx builder-journal@latest wrapped     # nếu chỉ dùng npx
```

Xem bản đang dùng: `bj --version`. Thay đổi từng bản: [CHANGELOG.md](CHANGELOG.md).

## Lệnh

| Lệnh | Làm gì |
|---|---|
| `bj` | Menu đánh số chọn việc (kèm lệnh tương ứng để lần sau gõ thẳng) |
| `bj wrapped` | Wrapped của repo hiện tại (toàn bộ lịch sử) |
| `bj wrapped --all` | Wrapped của **bạn**: tự tìm mọi repo từ log agent, gộp lại |
| `bj wrapped --week` | Card 1 màn cho 7 ngày gần nhất |
| `bj update` | Cập nhật lên bản mới nhất |

### Tất cả cờ của `bj wrapped`

| Cờ | Ý nghĩa |
|---|---|
| `--repo <đường dẫn>` | repo cần wrap (mặc định: thư mục hiện tại) |
| `--author <tên\|email>` | tác giả tính là "bạn" (lặp lại được; mặc định lấy từ `.journal/config.json`) |
| `--since <Nd\|YYYY-MM-DD>` | chỉ lấy từ mốc này (vd `90d`, `2026-03-01`) |
| `--theme <đêm\|bình-minh\|giấy>` | giao diện (gõ có dấu hay không dấu đều được) |
| `--unit <week\|month\|quarter>` | đơn vị cột "số commit theo kỳ" |
| `--all` | Wrapped của bạn: mọi repo tìm thấy trong log agent |
| `--include <đường dẫn,…>` | thêm repo vào `--all` (lặp lại hoặc phân cách dấu phẩy) |
| `--exclude <tên,…>` | bỏ repo khỏi `--all` |
| `--hide-names` | đổi tên repo thành Repo A, B… trên trang, card, ảnh |
| `--week` | card 1 màn cho 7 ngày gần nhất |
| `--hardest "<câu>"` | dòng "vấp thật" trên card tuần |
| `--ai` / `--no-ai` | bật / tắt đọc log agent (nhớ lựa chọn) |
| `-y, --yes` | không hỏi: đồng ý đọc log nếu chưa từng chọn, giữ mọi repo |
| `--no-open` | không tự mở trình duyệt |

Chung: `-V, --version`, `-h, --help` (dùng được cho từng lệnh, vd `bj wrapped --help`).

## File được tạo ở đâu

| Lệnh | File |
|---|---|
| `bj wrapped` | `<repo>/.journal/wrapped-YYYY-MM-DD.html` và `wrapped-card-YYYY-MM-DD.svg` |
| `bj wrapped --all` | `~/.builder-journal/wrapped-YYYY-MM-DD.html` (Windows: `C:\Users\<bạn>\.builder-journal\`) |
| `bj wrapped --week` | `<repo>/.journal/weekly-card-YYYY-MM-DD.html` |

Cùng ngày chạy lại thì ghi đè, khác ngày thì tạo file mới. Trang HTML là **một file duy nhất, chạy offline**: gửi file, mở bằng trình duyệt nào cũng được. `.journal/` tự được thêm vào `.git/info/exclude`, không bao giờ lọt vào commit.

## Lớp AI (nếu bạn code bằng agent)

Nếu máy có log của **Claude Code** (`~/.claude/projects`) hoặc **Codex** (`~/.codex/sessions`, bản beta), Wrapped có thêm 3 màn: *Bạn đã chỉ đạo* (bao nhiêu lệnh, bao nhiêu giờ làm thật, giờ ra lệnh so với giờ ship), *Agent đã làm* (sửa bao nhiêu file, chạy bao nhiêu lệnh, model nào) và *Đòn bẩy* (lệnh → commit → dòng, chỉ tính trong khoảng có log).

Lần đầu chạy, tool hỏi bạn có đồng ý cho đọc log không và nhớ lựa chọn. Không phải terminal tương tác thì mặc định không đọc — thêm `--ai`. Trang chỉ chứa **số tổng**, không có chữ nào từ prompt của bạn.

Claude Code tự xoá log cũ sau khoảng 30 ngày, nên lớp AI chỉ phủ được khoảng đó (trang ghi rõ khoảng ngày).

## Cách đếm

- **Commit**: mọi commit của bạn, **tính cả merge commit** (trang ghi rõ có bao nhiêu merge). Commit của người khác không tính.
- **Buổi**: chuỗi commit cách nhau không quá 2 giờ.
- **Mảng việc** (tính năng, sửa lỗi, dọn code, kiểm thử, tài liệu, hạ tầng): commit có tiền tố [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix(api):`, `refactor!:`, `docs:`, `test:`, `ci:`/`build:`…) được phân loại theo tiền tố (`chore:` để diff quyết định); commit không có tiền tố thì theo hình dạng diff (file mới, đổi tên, tỉ lệ thêm/xoá, loại file). Merge commit không có diff riêng nên không xếp mảng. Trang ghi rõ bao nhiêu % theo mỗi cách.
- **Dòng code đã ship**: dòng thêm vào file mã nguồn (tính cả code agent viết); bỏ qua tài liệu, cấu hình, lockfile, thư mục build và bộ kit agent (`.claude/`, `.opencode/`…).
- **Giờ làm thật** (khi có log agent): tổng thời gian giữa các hoạt động cách nhau không quá 30 phút, gộp các phiên chạy song song.

## Riêng tư

- Mọi con số tính trên máy bạn; tool **không gửi dữ liệu đi đâu**. Lần duy nhất tool dùng mạng là khi bạn tự chạy `bj update` (để npm tải bản mới).
- Log agent chỉ được đọc khi bạn đồng ý, và chỉ để đếm — trang không chứa nội dung prompt, đường dẫn hay email.
- `--hide-names` để chiếu/chia sẻ mà không lộ tên repo.

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| `Không thấy commit nào của …` | Tên/email trong git khác với trên commit. Xem tên thật bằng `git log --format="%an <%ae>" -5`, rồi chạy lại với `--author "Tên"` (lặp lại được), hoặc sửa `authors` trong `.journal/config.json`. |
| Số commit thấp hơn trên GitHub | Commit tạo trên web GitHub mang tên tài khoản GitHub của bạn — thêm tên/email đó bằng `--author` hoặc vào `authors` trong `.journal/config.json`. |
| `Thư mục không phải git repo` | `cd` vào đúng thư mục repo, hoặc thêm `--repo "<đường dẫn>"`. Đường dẫn có dấu cách thì để trong ngoặc kép. |
| Trình duyệt không tự mở | Mở tay file ở dòng `Trang: …` terminal in ra. |
| Không có màn AI | Máy không có log Claude Code/Codex trong khoảng 30 ngày, hoặc bạn đã chọn không. Bật lại: thêm `--ai`. |
| Muốn đổi lựa chọn đọc log | Chạy với `--ai` hoặc `--no-ai` (nhớ lựa chọn mới), hoặc xoá `~/.builder-journal/config.json` để được hỏi lại. |
| `--all` không có repo nào | Chế độ này tìm repo qua log agent. Thêm repo bằng tay: `--include "D:\repo-a,D:\repo-b"`. |
| npx chạy bản cũ | `npx builder-journal@latest wrapped`, hoặc cài global rồi `bj update`. |

## Chạy từ mã nguồn

```bash
git clone https://github.com/longtrandev2/builder-journal.git
cd builder-journal
npm install
node bin/builder-journal.js wrapped --repo "<đường dẫn repo bất kỳ>"
npm test
```

Nhánh: `main` = bản phát hành (có tag), `develop` = tích hợp, `feat/*` / `fix/*` mở PR vào `develop`. Commit theo [Conventional Commits](https://www.conventionalcommits.org/).

## License

MIT. Thư viện nhúng trong trang: anime.js (MIT), html-to-image (MIT), Lucide (ISC), Be Vietnam Pro (OFL); license đầy đủ đi kèm trong thư mục license của thư viện nhúng.
