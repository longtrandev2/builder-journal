// Rule catalog behind the closing "Lời nhắn": 4 groups, each rule = condition on real stats +
// priority + 1..3 ways to say it. Source of truth for wording: companion-notes-catalog.md.
// A rule whose input stats are missing (null/undefined, e.g. no agent logs) never fires: no guessing.
// Wording rules: xưng "bạn", short, no emoji, never judging, never mentions prompt text or file names.
import { fmtNum, fmtDecimal } from '../lib/vn-format.js';

export const NOTE_GROUPS = ['Sức khỏe', 'Ăn mừng', 'Nhắc nhẹ', 'Chuyện vui'];

export const has = (...v) => v.every((x) => x !== undefined && x !== null);
const pct = (p) => Math.round(p * 100);
const halfHours = (m) => fmtDecimal(Math.round(m / 30) / 2);
const hourGap = (a, b) => { const d = Math.abs(a - b) % 24; return Math.min(d, 24 - d); };
const isNight = (h) => h >= 22 || h <= 4;
// F1 second half, by the ship hour's time of day (catalog); "ca ngày" / "đêm agent làm" only when the prompt hour agrees.
const f1Tail = (a, b) => (isNight(b) && !isNight(a) ? 'Agent làm ca ngày, bạn chốt ca đêm.'
  : b >= 5 && b <= 11 && isNight(a) ? 'Đêm agent làm, sáng bạn gom lại ship.' : 'Hai ca lệch nhau mà vẫn ăn ý.');

// g = group index, p = priority (higher = stronger match), when = predicate, vars = template values, say = variants.
export const NOTE_RULES = [
  { id: 'S1', g: 0, p: 90, when: (s) => has(s.peakCommitHour) && (s.peakCommitHour >= 23 || s.peakCommitHour <= 4),
    vars: (s) => ({ hh: s.peakCommitHour === 23 ? '23h đêm' : s.peakCommitHour + 'h sáng' }),
    say: ['Code khuya nhiều đó. Tối nay thử đi ngủ trước 1h nha.', 'Cao điểm của bạn là {hh}. Ánh đèn bàn đẹp thật, nhưng giấc ngủ còn đẹp hơn.', 'Đêm là của bạn, nhưng mai cũng cần bạn tỉnh táo.'] },
  { id: 'S2', g: 0, p: 85, when: (s) => has(s.nightShare) && s.nightShare >= 0.25, vars: (s) => ({ p: pct(s.nightShare) }),
    say: ['{p}% commit của bạn diễn ra sau nửa đêm. Thỉnh thoảng cho mình một đêm ngủ trọn nhé.'] },
  { id: 'S3', g: 0, p: 80, when: (s) => has(s.streak) && s.streak >= 7, vars: (s) => ({ n: s.streak }),
    say: ['Chuỗi {n} ngày liền rồi. Nghỉ một ngày cũng không mất đà đâu.', '{n} ngày không nghỉ. Đà tốt, nhưng pin cũng cần sạc.'] },
  { id: 'S4', g: 0, p: 80, when: (s) => has(s.busiestDayMin) && s.busiestDayMin >= 360, vars: (s) => ({ h: halfHours(s.busiestDayMin), date: s.busiestDate }),
    say: ['Có ngày ngồi tới {h} tiếng. Nhớ đứng dậy vươn vai, uống nước.', 'Ngày {date} bạn làm {h} tiếng liền. Lưng với mắt chắc đang nhắn lời cảm ơn… à không, lời than.'] },
  { id: 'S5', g: 0, p: 70, when: (s) => has(s.weekendShare) && s.weekendShare >= 0.25, vars: (s) => ({ p: pct(s.weekendShare) }),
    say: ['Cuối tuần cũng nên có lúc gập laptop lại.', '{p}% công sức rơi vào thứ Bảy, Chủ nhật. Dành một buổi cho người thân nhé.'] },
  { id: 'S6', g: 0, p: 75, when: (s) => has(s.agentHoursPerDay) && s.agentHoursPerDay >= 5, vars: (s) => ({ h: fmtDecimal(s.agentHoursPerDay) }),
    say: ['Trung bình {h} tiếng mỗi ngày với agent. Cứ 50 phút đứng dậy một lần nhé.'] },
  { id: 'S7', g: 0, p: 65, when: (s) => has(s.peakPromptHour) && (s.peakPromptHour >= 22 || s.peakPromptHour <= 4) /* 22h–4h */, vars: (s) => ({ h: s.peakPromptHour }),
    say: ['Bạn ra lệnh cho agent nhiều nhất lúc {h}h. Agent không cần ngủ, nhưng bạn thì cần.'] },
  { id: 'S8', g: 0, p: 60, when: (s) => has(s.noRestStretchDays) && s.noRestStretchDays >= 30, vars: () => ({}),
    say: ['Hơn một tháng gần như không ngày nào nghỉ. Lên lịch một ngày trống thử xem.'] },
  { id: 'C1', g: 1, p: 70, when: (s) => has(s.linesShipped) && s.linesShipped >= 50000, vars: (s) => ({ n: fmtNum(s.linesShipped) }),
    say: ['{n} dòng code đã ship. Một con số đáng để khoe.', '{n} dòng. Nếu in ra giấy chắc đủ lót cả bàn làm việc.'] },
  { id: 'C2', g: 1, p: 65, when: (s) => has(s.peakWeekCommits) && s.peakWeekCommits >= 40, vars: (s) => ({ n: s.peakWeekCommits, date: s.peakWeekDate }),
    say: ['Tuần {date} bùng nổ với {n} commit. Tuần đó bạn đã làm gì vậy?'] },
  { id: 'C3', g: 1, p: 60, when: (s) => has(s.activeDays, s.totalDays) && s.activeDays / s.totalDays >= 0.5, vars: (s) => ({ n: s.activeDays, total: s.totalDays }),
    say: ['Có mặt {n}/{total} ngày. Đều đặn là siêu năng lực ít ai khoe.'] },
  { id: 'C4', g: 1, p: 55, when: (s) => has(s.repos) && s.repos >= 4, vars: (s) => ({ n: s.repos }),
    say: ['Công sức rải trên {n} repo. Đa nhiệm cỡ này thì đáng một tràng pháo tay.'] },
  { id: 'C5', g: 1, p: 60, when: (s) => has(s.testShare) && s.testShare >= 0.15, vars: (s) => ({ p: pct(s.testShare) }),
    say: ['{p}% commit là test. Bạn của tương lai sẽ cảm ơn bạn của hôm nay.'] },
  { id: 'C6', g: 1, p: 50, when: (s) => has(s.docsShare) && s.docsShare >= 0.15, vars: (s) => ({ p: pct(s.docsShare) }),
    say: ['Viết tài liệu đều tay ({p}% commit). Hiếm và quý.'] },
  { id: 'C7', g: 1, p: 60, when: (s) => has(s.linesPerPrompt) && s.linesPerPrompt >= 50, vars: (s) => ({ n: fmtNum(s.linesPerPrompt) }),
    say: ['Mỗi lệnh của bạn ra khoảng {n} dòng code. Chỉ đạo khéo đấy.'] },
  { id: 'C8', g: 1, p: 55, when: (s) => has(s.prompts, s.promptDays) && s.prompts >= 500, vars: (s) => ({ n: fmtNum(s.prompts), d: s.promptDays }),
    say: ['{n} lệnh cho agent trong {d} ngày. Bạn đang làm sếp thật sự rồi.'] },
  { id: 'N1', g: 2, p: 85, when: (s) => has(s.daysSinceLastCommit) && s.daysSinceLastCommit >= 14, vars: (s) => ({ where: has(s.repos) ? 'bạn' : 'repo này' }), // person page spans many repos
    say: ['Lâu rồi {where} chưa có commit mới. Quay lại lúc nào cũng được, không ai chấm điểm đâu.'] },
  { id: 'N2', g: 2, p: 60, when: (s) => has(s.fixShare) && s.fixShare >= 0.35, vars: (s) => ({ p: pct(s.fixShare) }),
    say: ['{p}% commit là sửa lỗi. Thêm vài cái test có khi đỡ phải sửa lại.'] },
  { id: 'N3', g: 2, p: 50, when: (s) => has(s.testShare, s.commits) && s.testShare < 0.03 && s.commits >= 50, vars: () => ({}),
    say: ['Gần như chưa thấy commit test nào. Một cái test nhỏ hôm nay, đỡ một đêm debug mai sau.'] },
  { id: 'N4', g: 2, p: 40, when: (s) => has(s.refactorShare, s.commits) && s.refactorShare < 0.03 && s.commits >= 100, vars: () => ({}),
    say: ['Viết nhiều, dọn ít. Một buổi refactor nhẹ sẽ thấy code dễ thở hơn.'] },
  { id: 'N5', g: 2, p: 35, when: (s) => has(s.mergeShare) && s.mergeShare >= 0.4, vars: (s) => ({ p: pct(s.mergeShare) }),
    say: ['Hơn {p}% là merge. Quy trình nhánh chuẩn chỉ ghê.'] },
  // F1 compares prompt hour with the ship hour measured INSIDE the agent-log window (same days on both sides).
  { id: 'F1', g: 3, p: 70, when: (s) => has(s.peakPromptHour, s.peakShipHour) && hourGap(s.peakPromptHour, s.peakShipHour) >= 4,
    vars: (s) => ({ a: s.peakPromptHour, b: s.peakShipHour, tail: f1Tail(s.peakPromptHour, s.peakShipHour) }),
    say: ['Bạn ra lệnh lúc {a}h nhưng ship lúc {b}h. {tail}'] },
  { id: 'F2', g: 3, p: 40, when: (s) => s.topWeekday === 1, vars: () => ({}), say: ['Thứ Hai là ngày năng suất nhất của bạn. Hiếm người được vậy.'] },
  { id: 'F3', g: 3, p: 40, when: (s) => s.topWeekday === 5, vars: () => ({}), say: ['Thứ Sáu vẫn ship đều. Gan dạ đấy.'] },
  { id: 'F4', g: 3, p: 45, when: (s) => has(s.models) && s.models >= 3, vars: (s) => ({ n: s.models }), say: ['Bạn đã làm việc với {n} model khác nhau. Đúng kiểu thử hết mới chọn.'] },
  { id: 'F5', g: 3, p: 40, when: (s) => has(s.editReadRatio) && s.editReadRatio >= 0.8, vars: () => ({}), say: ['Agent của bạn sửa nhiều gần bằng đọc. Tin tưởng nhau ghê.'] },
  { id: 'F6', g: 3, p: 45, when: (s) => has(s.subagentTasks) && s.subagentTasks >= 50, vars: (s) => ({ n: s.subagentTasks }), say: ['Bạn đã giao {n} việc cho subagent. Có cả một đội rồi đó.'] },
  { id: 'F7', g: 3, p: 40, when: (s) => s.topDaypart === 'sang', vars: () => ({}), say: ['Bạn là chim dậy sớm của làng code. Cà phê sáng chắc ngon lắm.'] },
];

// "Chung" group: filler so a page always has at least 2 lines, and the closing sign-offs.
export const NOTE_FALLBACK = ['Uống đủ nước, ngủ đủ giấc, ship đều tay.', 'Nhớ ăn uống đàng hoàng giữa các lần deploy.', 'Đi bộ một vòng rồi quay lại, bug sẽ tự lộ mặt.', 'Code xong nhớ ngẩng lên nhìn xa cho mắt nghỉ.'];
export const NOTE_SIGNOFFS = ['Chúc bạn build vui, ship đều, bug ít.', 'Chúc mùa build tới còn rực rỡ hơn.', 'Chúc commit sau luôn xanh.', 'Hẹn gặp lại ở Wrapped lần sau.'];
