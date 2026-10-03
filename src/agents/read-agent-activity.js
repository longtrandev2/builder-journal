// Facade: read every supported agent's local logs, merge, aggregate. Never throws.
// Reading is the slow part (large JSONL files): callers that need several aggregates read the
// events ONCE with readAgentEvents() and pass them to readAgentActivity({ events }).
import { readClaudeCodeEvents } from './claude-code-log-reader.js';
import { readCodexEvents } from './codex-log-reader.js';
import { aggregateAgentActivity } from './agent-activity-aggregator.js';

/** All normalized events from every agent log (one broken log never breaks the rest). */
export function readAgentEvents({ since } = {}) {
  const events = [];
  for (const reader of [readClaudeCodeEvents, readCodexEvents]) {
    try {
      events.push(...reader({ since }));
    } catch {
      /* one broken agent log must not break the rest */
    }
  }
  return events;
}

/**
 * -> aggregate object (see agent-activity-aggregator.js) or null when no prompts / no logs.
 * Pass `events` (from readAgentEvents) to skip re-reading the logs; `since` then filters in memory.
 */
export function readAgentActivity({ since, projects, events } = {}) {
  const from = since ? Date.parse(since) : null;
  const list = events ? (from ? events.filter((e) => Date.parse(e.ts) >= from) : events) : readAgentEvents({ since });
  try {
    return aggregateAgentActivity(list, { projects });
  } catch {
    return null;
  }
}
