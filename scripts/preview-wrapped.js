#!/usr/bin/env node
// Renders fixture Wrapped pages into .journal-preview/ (gitignored) for visual QA:
// git-only / with agent data / person scope, each in all 3 themes, plus weekly cards.
// Usage: node scripts/preview-wrapped.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderWrappedHtml } from '../src/wrapped/wrapped-html-template.js';
import { renderWeeklyCardHtml } from '../src/wrapped/weekly-card-html-template.js';
import { PALETTES } from '../src/wrapped/wrapped-theme-styles.js';
import { fixtureData, fixtureAi, fixtureLeverage, fixturePerson, fixtureWeek } from './wrapped-preview-fixtures.js';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.journal-preview');
fs.mkdirSync(OUT, { recursive: true });

const variants = {
  git: () => fixtureData(),
  ai: () => fixtureData({ ai: fixtureAi(), leverage: fixtureLeverage() }),
  person: () => fixturePerson(),
};

for (const theme of Object.keys(PALETTES)) {
  for (const [name, make] of Object.entries(variants)) {
    const file = path.join(OUT, `wrapped-${name}-${theme}.html`);
    fs.writeFileSync(file, renderWrappedHtml(make(), { theme }));
  }
  fs.writeFileSync(path.join(OUT, `week-ai-${theme}.html`), renderWeeklyCardHtml(fixtureWeek(true), { theme }));
  fs.writeFileSync(path.join(OUT, `week-git-${theme}.html`), renderWeeklyCardHtml(fixtureWeek(false), { theme }));
}

for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith('.html')).sort()) {
  console.log(`${f}  ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} KB`);
}
