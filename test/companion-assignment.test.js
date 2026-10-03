// Companion: character assignment, per-screen poses, sprite kit, and how the page wires them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoCompanion, screenPose, COMPANION_IDS } from '../src/wrapped/companion-assignment.js';
import { createSpriteKit } from '../src/wrapped/companion-sprites.js';
import { renderWrappedHtml } from '../src/wrapped/wrapped-html-template.js';
import { ATTRIBUTION } from '../src/wrapped/companion-markup.js';
import { fixtureData, fixtureAi, fixtureLeverage, fixturePerson } from '../scripts/wrapped-preview-fixtures.js';

const NOW = new Date(2026, 9, 3, 12);

test('auto character follows the agent with the most prompts', () => {
  assert.equal(autoCompanion({ promptsBySource: { 'claude-code': 30, codex: 5 } }), 'cam');
  assert.equal(autoCompanion({ promptsBySource: { 'claude-code': 3, codex: 50 } }), 'lenh');
  assert.equal(autoCompanion({ promptsBySource: { 'claude-code': 7, codex: 7 } }), 'cam', 'tie goes to Claude Code');
  assert.equal(autoCompanion({ promptsBySource: { mystery: 99, codex: 1 } }), 'lenh', 'unknown sources are ignored');
  assert.equal(autoCompanion({ sources: ['codex'] }), 'lenh', 'older data without counts');
  assert.equal(autoCompanion({ promptsBySource: {}, sources: [] }), 'cu');
  assert.equal(autoCompanion(null), 'cu');
  assert.equal(autoCompanion(undefined), 'cu');
});

test('every pose of every character renders crisp pixel rects; export sprite needs no CSS', () => {
  const kit = createSpriteKit();
  assert.deepEqual(Object.keys(kit.CHARS).sort(), [...COMPANION_IDS].sort());
  for (const id of COMPANION_IDS) {
    for (const pose of Object.keys(kit.POSES)) {
      assert.match(kit.spriteSvg(id, pose), /<g class="fA"><rect/, `${id}/${pose} frame A`);
      assert.match(kit.spriteSvg(id, pose), /<g class="fB"><rect/, `${id}/${pose} frame B`);
      assert.doesNotMatch(kit.exportSvg(id, pose), /class=|fA|fB/, `${id}/${pose} export is static`);
      assert.ok(kit.ACT[pose], `${id}/${pose} has a motion timing`);
    }
    assert.match(kit.miniSvg(id), /^<svg viewBox/);
  }
});

test('hours screen dozes for night owls, other screens have fixed poses', () => {
  const night = fixtureData();
  assert.equal(night.habits.topDaypart.id, 'khuya');
  assert.equal(screenPose('gio-giac', night), 'doze');
  assert.equal(screenPose('gio-giac', { habits: { topDaypart: { id: 'chieu' } } }), 'laugh');
  assert.equal(screenPose('khep-lai', night), 'notes');
  assert.equal(screenPose('chi-dao', night), 'mega');
});

test('page: sprite for the assigned character, picker with all three, attribution, poses per screen', () => {
  const git = renderWrappedHtml(fixtureData(), { theme: 'dem', now: NOW });
  assert.match(git, /id="bj-buddy"[^>]*data-auto="cu"/, 'no agent data gives Cú');
  const ai = renderWrappedHtml(fixtureData({ ai: fixtureAi(), leverage: fixtureLeverage() }), { theme: 'dem', now: NOW });
  assert.match(ai, /id="bj-buddy"[^>]*data-auto="cam"/);
  const codexAi = { ...fixtureAi(), sources: ['codex'], promptsBySource: { codex: 765 } };
  assert.match(renderWrappedHtml(fixtureData({ ai: codexAi, leverage: fixtureLeverage() }), { now: NOW }), /data-auto="lenh"/);
  for (const c of COMPANION_IDS) assert.ok(ai.includes(`data-c="${c}"`), `picker offers ${c}`);
  assert.ok(ai.includes('data-c="auto"'));
  assert.ok(ai.includes(ATTRIBUTION), 'attribution on the page');
  const poses = [...ai.matchAll(/<section class="screen s-[\w-]+"[^>]* data-pose="(\w+)"/g)].map((m) => m[1]);
  assert.equal(poses.length, (ai.match(/<section class="screen /g) || []).length, 'every screen carries a pose');
  assert.equal(poses.at(-1), 'notes');
  assert.ok(poses.includes('mega') && poses.includes('doze'));
});

test('closing bubble: 2-3 notes + sign-off, complete in markup, deterministic within a week', () => {
  const data = fixturePerson();
  const a = renderWrappedHtml(data, { now: NOW });
  const b = renderWrappedHtml(data, { now: new Date(2026, 9, 4, 23) }); // same ISO week (Sunday)
  const bubble = (h) => h.match(/<div class="say"[\s\S]*?<p class="sr">[\s\S]*?<\/p><\/div>/)[0];
  assert.equal(bubble(a), bubble(b));
  const lines = bubble(a).match(/class="say-line/g).length;
  assert.ok(lines >= 3 && lines <= 4, 'notes (2-3) + sign-off');
  assert.match(bubble(a), /data-lead-pose="(doze|think|cheer|laugh|wave)"/);
  assert.match(bubble(a), /Lời nhắn từ Cam/);
  assert.match(bubble(a), /class="say-line sign"/);
});

test('hostile names stay escaped on a page that carries the companion', () => {
  const html = renderWrappedHtml(fixtureData({ repoName: '<script>alert(1)</script>', displayName: '<i>x</i>' }), { now: NOW });
  assert.doesNotMatch(html, /<script>alert\(1\)/);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});
