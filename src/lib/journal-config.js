// .journal/config.json — created with sane defaults on first run of any command.
import fs from 'node:fs';
import path from 'node:path';
import { tryGit } from './run-git.js';
import { ensureJournal, journalFile } from './journal-paths.js';

export const THEMES = ['dem', 'binh-minh', 'giay'];
export const UNITS = ['week', 'month', 'quarter'];

/** "đêm" / "Bình Minh" / "binh_minh" → "dem" / "binh-minh" (accent-insensitive). */
export function normalizeTheme(name) {
  if (!name) return null;
  const key = String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-');
  return THEMES.includes(key) ? key : null;
}

function defaultConfig(repo) {
  const name = tryGit(repo, ['config', 'user.name']);
  const email = tryGit(repo, ['config', 'user.email']);
  return {
    displayName: name || path.basename(repo),
    authors: [name, email].filter(Boolean),
    theme: 'dem',
    unit: 'week',
  };
}

/**
 * Load config, creating it on first run. Returns { config, created }.
 * Invalid / hand-broken JSON falls back to defaults (warned, not fatal).
 */
export function loadConfig(repo) {
  ensureJournal(repo);
  const file = journalFile(repo, 'config.json');
  if (!fs.existsSync(file)) {
    const config = defaultConfig(repo);
    fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
    return { config, created: true, file };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const config = { ...defaultConfig(repo), ...parsed };
    if (!Array.isArray(config.authors)) config.authors = [String(config.authors)];
    config.theme = normalizeTheme(config.theme) || 'dem';
    if (!UNITS.includes(config.unit)) config.unit = 'week';
    return { config, created: false, file };
  } catch {
    console.warn(`⚠ ${file} hỏng JSON — tạm dùng mặc định.`);
    return { config: defaultConfig(repo), created: false, file };
  }
}

/** --author flag(s) override config authors entirely. */
export function resolveAuthors(config, authorFlag) {
  const flags = [].concat(authorFlag || []).filter(Boolean);
  return flags.length ? flags : config.authors;
}
