// Ask-once consent for the two privacy-sensitive features, remembered so nobody is nagged twice:
//  1. reading local agent logs (global, ~/.builder-journal/config.json)
//  2. sending redacted diff excerpts to `claude` for the devlog (per repo, .journal/config.json)
// Non-interactive shells never get a prompt: the safe choice applies and a hint explains the flag.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { saveConfig } from './journal-config.js';

const GLOBAL_DIR = path.join(os.homedir(), '.builder-journal');
const GLOBAL_FILE = path.join(GLOBAL_DIR, 'config.json');

export function readGlobalConfig() {
  try {
    return JSON.parse(fs.readFileSync(GLOBAL_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

export function writeGlobalConfig(patch) {
  fs.mkdirSync(GLOBAL_DIR, { recursive: true });
  fs.writeFileSync(GLOBAL_FILE, JSON.stringify({ ...readGlobalConfig(), ...patch }, null, 2) + '\n');
}

/** Default terminal question; injectable for tests. Returns the raw answer. */
export async function askTerminal(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

const isYes = (answer, defaultYes) => {
  const a = String(answer || '').trim().toLowerCase();
  if (!a) return defaultYes;
  return ['y', 'yes', 'c', 'co', 'có', 'ok', 'u', 'ừ'].includes(a);
};

/**
 * Agent-log consent. opts.ai: true (--ai) / false (--no-ai) / undefined (ask once).
 * @returns {Promise<boolean>}
 */
export async function ensureAiLogConsent(opts, { ask = askTerminal, interactive = process.stdin.isTTY } = {}) {
  if (opts.ai === false) {
    writeGlobalConfig({ readAgentLogs: false });
    return false;
  }
  if (opts.ai === true || opts.yes) {
    writeGlobalConfig({ readAgentLogs: true });
    return true;
  }
  const stored = readGlobalConfig().readAgentLogs;
  if (typeof stored === 'boolean') return stored;
  if (!interactive) {
    console.log('Bỏ qua log agent (chưa được đồng ý) — thêm --ai để bật.');
    return false;
  }
  const yes = isYes(await ask(
    'Đọc log agent trên máy (Claude Code / Codex) để đếm số lệnh, giờ làm thật?\n' +
    'Chỉ lấy số tổng, không có chữ nào từ prompt lên trang. Nhớ lựa chọn cho các lần sau. [Y/n] ',
  ), true);
  writeGlobalConfig({ readAgentLogs: yes });
  return yes;
}

/**
 * Per-repo consent before diff excerpts leave the machine via `claude`. Declined → manual mode.
 * @returns {Promise<boolean>} true = may call claude
 */
export async function ensureNarratorConsent(repo, config, opts, { ask = askTerminal, interactive = process.stdin.isTTY } = {}) {
  if (opts.yes) {
    saveConfig(repo, { ...config, sendDiffToAi: true });
    return true;
  }
  if (typeof config.sendDiffToAi === 'boolean') return config.sendDiffToAi;
  if (!interactive) {
    console.log('Chưa được đồng ý gửi diff cho AI ở repo này — dùng chế độ thủ công (thêm --yes để đồng ý).');
    return false;
  }
  const yes = isYes(await ask(
    'Viết devlog cần gửi trích đoạn diff (đã che secret, bỏ file .env/key) cho `claude` trên máy bạn,\n' +
    'tức là tới nhà cung cấp AI mà claude đang dùng. Repo công ty/khách hàng thì cân nhắc.\n' +
    'Đồng ý cho repo này? (không → chế độ thủ công, tự dán vào chat AI) [y/N] ',
  ), false);
  saveConfig(repo, { ...config, sendDiffToAi: yes });
  return yes;
}

/**
 * Person mode: show discovered repos, let the user drop some before anything is rendered.
 * @returns {Promise<Array>} kept repos
 */
export async function confirmRepos(repos, opts, { ask = askTerminal, interactive = process.stdin.isTTY } = {}) {
  console.log('\nRepo sẽ có trên trang:');
  repos.forEach((r, i) => console.log(`  ${i + 1}. ${r.name}`));
  if (opts.yes || !interactive) return repos;
  const answer = await ask('Bỏ repo nào? (gõ số, cách nhau dấu phẩy — Enter để giữ hết) ');
  const drop = new Set(String(answer).split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= repos.length));
  return repos.filter((_, i) => !drop.has(i + 1));
}

/** --hide-names: stable "Repo A, Repo B…" aliases (order = list order). */
export function aliasNames(names) {
  const map = new Map();
  names.forEach((n) => {
    if (!map.has(n)) map.set(n, `Repo ${String.fromCharCode(65 + (map.size % 26))}${map.size >= 26 ? Math.floor(map.size / 26) : ''}`);
  });
  return map;
}
