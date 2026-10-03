// Wrapped page + weekly card: single self-contained file, escaping, theme invariance, optional screens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderWrappedHtml } from '../src/wrapped/wrapped-html-template.js';
import { renderWeeklyCardHtml } from '../src/wrapped/weekly-card-html-template.js';
import { clockSvg } from '../src/wrapped/wrapped-clock-charts.js';
import { fixtureData, fixtureAi, fixtureLeverage, fixturePerson, fixtureWeek } from '../scripts/wrapped-preview-fixtures.js';

const AI_SCREENS = ['id="chi-dao"', 'id="agent-lam"', 'id="don-bay"'];
const markup = (html) => html.slice(html.indexOf('<body>'), html.indexOf('<script>'));
/** Page without the inlined library bodies (their source may mention @import or <link> as strings). */
const withoutScripts = (html) => html.replace(/<script>[\s\S]*?<\/script>/g, '<script></script>');
const counts = (html) => [...html.matchAll(/data-count="(\d+)"/g)].map((m) => m[1]);

function assertSelfContained(html) {
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'starts with doctype');
  assert.ok(html.trimEnd().endsWith('</html>'), 'ends with </html>');
  assert.ok(Buffer.byteLength(html) < 1024 * 1024, 'under 1MB');
  assert.doesNotMatch(html, /\b(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\//i, 'no remote src/href');
  assert.doesNotMatch(html, /url\(\s*["']?(?:https?:)?\/\//i, 'no remote url()');
  assert.doesNotMatch(withoutScripts(html), /<link\b|<script[^>]*\bsrc=|@import/i, 'no linked resources');
  assert.doesNotMatch(markup(html), /xmlns=/, 'inline svg needs no xmlns');
}

function assertCopyRules(html) {
  const body = markup(html);
  assert.doesNotMatch(body, /\p{Extended_Pictographic}/u, 'no emoji');
  assert.doesNotMatch(body, /→| · /, 'no arrow or middle-dot meta strings');
}

test('git-only page is one self-contained file with no AI screens', () => {
  const html = renderWrappedHtml(fixtureData(), { theme: 'dem' });
  assertSelfContained(html);
  assertCopyRules(html);
  for (const id of AI_SCREENS) assert.ok(!html.includes(id), `${id} absent without data.ai`);
  assert.ok(html.includes('dòng code đã ship'));
  assert.ok(html.includes('tính cả code agent viết, chỉ file mã nguồn'));
  assert.ok(!html.includes('id="cac-repo"'));
});

test('AI + leverage screens render when data.ai is present', () => {
  const html = renderWrappedHtml(fixtureData({ ai: fixtureAi(), leverage: fixtureLeverage() }), { theme: 'giay' });
  assertSelfContained(html);
  assertCopyRules(html);
  for (const id of AI_SCREENS) assert.ok(html.includes(id), `${id} present`);
  assert.ok(!html.includes('làm lại'), 'the keyword-based redo line is gone');
  assert.ok(html.includes('11,2 triệu'));
  assert.ok(html.includes('07/09 đến 03/10/2026'), 'AI log range noted');
});

test('person scope adds the repos screen and stays under 1MB', () => {
  const html = renderWrappedHtml(fixturePerson(), { theme: 'binh-minh' });
  assertSelfContained(html);
  assert.ok(html.includes('id="cac-repo"'));
  assert.ok(html.includes('Bùi Thế Vĩnh Nguyên'));
});

test('dynamic strings are escaped', () => {
  const html = renderWrappedHtml(fixtureData({ repoName: 'a<b>&c', displayName: '"x" <y>' }), { highlight: '<img src=x onerror=1>' });
  assert.ok(html.includes('a&lt;b&gt;&amp;c'));
  assert.ok(!html.includes('a<b>&c'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&quot;x&quot; &lt;y&gt;'));
});

test('theme changes the page but not the numbers', () => {
  const data = fixtureData({ ai: fixtureAi(), leverage: fixtureLeverage() });
  const dem = renderWrappedHtml(data, { theme: 'dem' });
  const giay = renderWrappedHtml(data, { theme: 'giay' });
  assert.notEqual(dem, giay);
  assert.ok(giay.includes('data-theme="giay"'));
  assert.deepEqual(counts(dem), counts(giay));
  assert.ok(counts(dem).includes('81293'));
  assert.ok(renderWrappedHtml(data, { theme: '"><script>' }).includes('data-theme="dem"'), 'unknown theme falls back');
});

test('clock does not repeat the peak hour as an axis label', () => {
  const hours = Array(24).fill(1);
  hours[0] = 9;
  const svg = clockSvg(hours, 0);
  assert.doesNotMatch(svg, /class="tick"[^>]*>0h</, 'no 0h tick when peak is 0h');
  assert.equal((svg.match(/class="tick"/g) || []).length, 3);
});

test('weekly card renders as one exportable screen', () => {
  const html = renderWeeklyCardHtml(fixtureWeek(true), { theme: 'dem' });
  assertSelfContained(html);
  assertCopyRules(html);
  assert.equal((markup(html).match(/data-export-root/g) || []).length, 1);
  assert.ok(html.includes('188 lệnh'));
  assert.ok(html.includes('Khó nhất tuần này'));
  const plain = renderWeeklyCardHtml({ ...fixtureWeek(false), hardest: undefined }, { theme: 'giay' });
  assertSelfContained(plain);
  assert.ok(!plain.includes('lệnh</b> cho agent'));
  assert.ok(!plain.includes('Khó nhất tuần này'));
});
