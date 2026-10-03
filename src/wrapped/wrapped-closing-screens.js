// Person-scope repos screen + the closing screen (typed highlight, copy command, privacy note).
import { escapeHtml as e, fmtNum, fmtDate } from '../lib/vn-format.js';
import { NPX_COMMAND, PRODUCT_NAME } from '../lib/product-info.js';
import { icon } from '../vendor/lucide-icons.js';

const TOP_REPOS = 6;

/** Deterministic closing line, used when no AI-written sentence is passed in. */
export function defaultHighlight(data) {
  const { hero, habits, heatmap, displayName } = data;
  return `${fmtNum(hero.sessions)} lần ngồi xuống code, chuỗi dài nhất ${habits.streak} ngày liền, ` +
    `và tuần ${fmtDate(heatmap.peakWeek, false)} bùng nổ với ${heatmap.peakTotal} commit. Đó là mùa build của ${displayName}.`;
}

export function screenRepos(d) {
  const repos = [...d.repos].sort((a, b) => b.commits - a.commits);
  const max = Math.max(1, repos[0]?.commits || 0);
  const rows = repos.slice(0, TOP_REPOS).map((r, i) => `<div class="bar-row${i === 0 ? ' top' : ''}">
<div class="bar-text"><span class="bar-label">${e(r.name)}</span><span class="bar-sub">${fmtNum(r.sessions)} buổi, ${fmtNum(r.codeLines)} dòng</span></div>
<div class="bar-track"><div class="bar-fill" style="width:${Math.max(1, Math.round((r.commits / max) * 100))}%"></div></div>
<span class="bar-pct num">${fmtNum(r.commits)}</span></div>`).join('');
  const rest = repos.length - TOP_REPOS;
  return {
    id: 'cac-repo', kicker: 'Các repo', icon: 'folder-git-2', moment: 'bars',
    body: `<h2>Công sức rải trên <span class="hl">${fmtNum(repos.length)} repo</span>.</h2>
<div class="bars">${rows}</div>
<p class="note">Cột phải là số commit.${rest > 0 ? ` Còn ${fmtNum(rest)} repo nhỏ hơn không hiện ở đây.` : ''}</p>`,
  };
}

export function screenClose(d, highlight) {
  const privacy = d.ai
    ? 'Số liệu đọc từ git và log agent trên máy bạn. Trang chỉ chứa con số tổng, không có nội dung lệnh nào, không gửi đi đâu.'
    : 'Số liệu đọc trực tiếp từ git trên máy bạn, không gửi đi đâu.';
  return {
    id: 'khep-lai', kicker: 'Khép lại', icon: 'check', moment: 'type',
    body: `<p class="quote" data-type>${e(highlight)}</p>
<div class="cmd"><code id="cmd">${e(NPX_COMMAND)} wrapped</code><button type="button" class="btn no-export" id="copy">${icon('copy', { size: 18 })}<span>Chép lệnh</span></button></div>
<p class="note">Chạy lệnh trong thư mục repo của bạn để có trang như thế này. ${privacy}</p>
<p class="made">Làm bằng ${e(PRODUCT_NAME)}</p>`,
  };
}
