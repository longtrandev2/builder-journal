// Assembles the single self-contained Wrapped HTML page. Screen order:
// opening, hero, calendar, chapters, habits, [agent: directing, agent work, leverage], [person: repos], close.
// Optional screens render only when their data exists, so a git-only page still reads complete.
import { slugify } from '../lib/vn-format.js';
import { renderPageShell } from './wrapped-page-shell.js';
import { chartCss } from './wrapped-chart-styles.js';
import { screenCss } from './wrapped-screen-styles.js';
import { frameScreen } from './wrapped-screen-frame.js';
import { screenOpen, screenHero, screenHeatmap, screenChapters, screenHabits } from './wrapped-git-screens.js';
import { screenDirect, screenAgent, screenLeverage } from './wrapped-ai-screens.js';
import { screenRepos, screenClose, defaultHighlight } from './wrapped-closing-screens.js';

export { defaultHighlight };

const hasActions = (ai) => ai?.actions && (ai.actions.total || ai.actions.edits || ai.actions.commands || ai.actions.reads);

/** Screen specs in reading order; optional ones filtered out when their data is missing. */
export function buildScreens(data, highlight) {
  const ai = data.ai && Array.isArray(data.ai.promptHours) ? data.ai : null;
  const d = { ...data, ai };
  return [
    screenOpen(d),
    screenHero(d),
    screenHeatmap(d),
    d.chapters?.length ? screenChapters(d) : null,
    screenHabits(d),
    ai ? screenDirect(d) : null,
    hasActions(ai) ? screenAgent(d) : null,
    d.leverage?.prompts ? screenLeverage(d) : null,
    d.scope === 'person' && d.repos?.length ? screenRepos(d) : null,
    screenClose(d, highlight || defaultHighlight(d)),
  ].filter(Boolean);
}

/** @param data aggregateWrapped() output (+ optional ai / leverage / scope / repos); @param options { theme, highlight } */
export function renderWrappedHtml(data, { theme = 'dem', highlight } = {}) {
  const screens = buildScreens(data, highlight);
  const ctx = {
    owner: `Builder Wrapped của ${data.scope === 'person' ? data.repoName : data.displayName}`,
    total: screens.length,
    slug: slugify(data.repoName),
  };
  const body = `<main>\n${screens.map((s, i) => frameScreen(s, { ...ctx, index: i + 1 })).join('\n')}\n</main>`;
  return renderPageShell({ title: `${data.repoName}: Builder Wrapped`, theme, css: chartCss() + screenCss(), body });
}
