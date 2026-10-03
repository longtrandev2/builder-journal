// Facade: read every supported agent's local logs, merge, aggregate. Never throws.
import { readClaudeCodeEvents } from './claude-code-log-reader.js';
import { readCodexEvents } from './codex-log-reader.js';
import { aggregateAgentActivity } from './agent-activity-aggregator.js';

/** -> aggregate object (see agent-activity-aggregator.js) or null when no prompts / no logs. */
export function readAgentActivity({ since, projects } = {}) {
  const events = [];
  for (const reader of [readClaudeCodeEvents, readCodexEvents]) {
    try {
      events.push(...reader({ since }));
    } catch {
      /* one broken agent log must not break the rest */
    }
  }
  try {
    return aggregateAgentActivity(events, { projects });
  } catch {
    return null;
  }
}
