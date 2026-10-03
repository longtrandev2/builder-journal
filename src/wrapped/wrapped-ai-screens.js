// Agent-era screens, rendered only when data.ai / data.leverage exist (Claude Code / Codex logs).
// Privacy: only aggregate counts reach this file; no prompt text is ever rendered.
import { escapeHtml as e, fmtNum, fmtDate, fmtRange, fmtDecimal, fmtCompact, fmtHours, fmtDuration, localIsoDate } from '../lib/vn-format.js';
import { icon } from '../vendor/lucide-icons.js';
import { hourDuelSvg } from './wrapped-clock-charts.js';
import { count } from './wrapped-screen-frame.js';

const SOURCE_LABELS = { 'claude-code': 'Claude Code', codex: 'Codex' };
const peakOf = (arr) => arr.indexOf(Math.max(...arr));

/** "Theo log Claude Code trên máy, từ 07/09 đến 03/10/2026." — AI history only covers local logs. */
export function aiRangeNote(ai) {
  const names = (ai.sources || []).map((s) => SOURCE_LABELS[s] || s).join(' và ') || 'agent';
  return `Số liệu agent đọc từ log ${e(names)} còn trên máy, từ ${fmtRange(localIsoDate(ai.range.from), localIsoDate(ai.range.to), ' đến ')}. ` +
    'Claude Code tự xoá log cũ sau khoảng 30 ngày, nên phần này chỉ phủ khoảng đó.';
}

function stat(value, label) {
  const v = typeof value === 'number' ? count(value, 'big num') : `<span class="big">${value}</span>`;
  return `<div class="stat">${v}<span class="stat-label">${label}</span></div>`;
}

export function screenDirect(d) {
  const ai = d.ai;
  const pPeak = Number.isInteger(ai.peakPromptHour) ? ai.peakPromptHour : peakOf(ai.promptHours);
  // Same window as the prompts (agent-log range), never the whole git history. No commits in that
  // window (ai.commitHours null) → show the prompt side only, never a misleading comparison.
  const hasCommits = Array.isArray(ai.commitHours);
  const commitHours = hasCommits ? ai.commitHours : Array(24).fill(0);
  const cPeak = peakOf(commitHours);
  const contrast = !hasCommits
    ? `Ra lệnh nhiều nhất lúc <b>${pPeak}h</b>. Trong khoảng có log chưa có commit nào.`
    : pPeak === cPeak
      ? `Ra lệnh và ship cùng một khung giờ: <b>${pPeak}h</b>.`
      : `Ra lệnh nhiều nhất lúc <b>${pPeak}h</b>, ship nhiều nhất lúc <b>${cPeak}h</b>.`;
  const busy = ai.busiestDay
    ? stat(fmtDate(ai.busiestDay.date, false), `ngày cày nhất, ${fmtDuration(Math.round(ai.busiestDay.minutes))}`) : '';
  return {
    id: 'chi-dao', kicker: 'Bạn đã chỉ đạo', icon: 'message-square-text', moment: 'direct',
    body: `<div class="ai-grid"><div><div class="hero">
<div class="hero-main">${count(ai.prompts, 'mega num')}<p class="hero-label">lệnh đã gõ cho agent</p></div>
<div class="stats">${stat(fmtHours(ai.activeMinutes), 'làm việc thật')}${stat(ai.agentSessions, 'phiên agent')}${busy}</div>
</div>
</div>
<div><figure class="duel-box">${hourDuelSvg(ai.promptHours, commitHours)}
<figcaption class="legend"><span class="key up">lệnh cho agent</span>${hasCommits ? '<span class="key down">commit</span>' : ''}</figcaption></figure>
<p class="lead">${contrast}</p></div></div>
<p class="note range-note">${aiRangeNote(ai)}</p>`,
  };
}

const ACTIONS = [
  ['edits', 'pencil-line', 'lần sửa file'],
  ['commands', 'square-terminal', 'lệnh terminal'],
  ['reads', 'file-search', 'lần đọc file'],
  ['other', 'layers', 'việc khác'],
];

export function screenAgent(d) {
  const { actions, models = [], tokens } = d.ai;
  const total = actions.total || ACTIONS.reduce((s, [k]) => s + (actions[k] || 0), 0) || 1;
  const used = ACTIONS.filter(([k]) => actions[k] > 0);
  const stack = used.map(([k]) => `<span class="seg seg-${k}" style="flex-grow:${actions[k]}"></span>`).join('');
  const list = used.map(([k, ic, label]) => `<li class="act-${k}">${icon(ic)}${count(actions[k], 'act-num num')}<span>${label}</span></li>`).join('');
  const modelTotal = models.reduce((s, m) => s + m.count, 0) || 1;
  const modelRows = models.slice(0, 4).map((m) => {
    const pct = Math.round((m.count / modelTotal) * 100);
    return `<li><span class="m-name">${e(m.name)}</span><span class="m-bar"><i style="width:${Math.max(2, pct)}%"></i></span><span class="num">${pct}%</span></li>`;
  }).join('');
  const out = tokens?.output ? `<div class="tokens"><p class="meta-title">Token agent viết ra</p><span class="big">${fmtCompact(tokens.output)}</span>
<p class="note">Không cộng token đầu vào: phần lớn là ngữ cảnh đọc lại từ cache.</p></div>` : '';
  return {
    id: 'agent-lam', kicker: 'Agent đã làm', icon: 'cpu', moment: 'agent',
    body: `<h2>Trong lúc đó, agent làm <span class="hl">${fmtNum(total)} việc</span> theo lệnh của bạn.</h2>
<div class="stack" role="img" aria-label="Tỉ lệ các loại việc agent đã làm">${stack}</div>
<ul class="acts">${list}</ul>
<div class="agent-meta">${modelRows ? `<div class="models"><p class="meta-title">Mô hình đã dùng</p><ol>${modelRows}</ol></div>` : ''}${out}</div>`,
  };
}

export function screenLeverage(d) {
  const lv = d.leverage;
  const node = (n, label, cls = '') => `<div class="node${cls}">${count(n, 'big num')}<span>${label}</span></div>`;
  // "cứ 0,9 lệnh thành một commit" reads wrong: flip to commits-per-prompt when a prompt yields >= 1 commit.
  const perCommit = !(lv.commitsPerPrompt > 0) ? ''
    : lv.commitsPerPrompt >= 1 ? `, mỗi lệnh ra <b>${fmtDecimal(lv.commitsPerPrompt)} commit</b>`
      : `, cứ <b>${fmtDecimal(1 / lv.commitsPerPrompt)} lệnh</b> thành một commit`;
  const range = d.ai?.range ? ` Tính trong khoảng có log agent, ${fmtRange(localIsoDate(d.ai.range.from), localIsoDate(d.ai.range.to), ' đến ')}.` : '';
  return {
    id: 'don-bay', kicker: 'Đòn bẩy', icon: 'link', moment: 'chain',
    body: `<h2>Mỗi lệnh của bạn đi được bao xa.</h2>
<div class="chain">${node(lv.prompts, 'lệnh')}<i class="link" aria-hidden="true"></i>${node(lv.commits, 'commit')}<i class="link" aria-hidden="true"></i>${node(lv.codeLines, 'dòng code', ' last')}</div>
<p class="lead">Trung bình một lệnh ra <b>${fmtDecimal(lv.linesPerPrompt, 0)} dòng code</b>${perCommit}.</p>
<p class="note range-note">Dòng code tính cả phần agent viết, chỉ file mã nguồn.${range}</p>`,
  };
}
