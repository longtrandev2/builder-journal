// Which companion greets the user, and which pose it strikes on each Wrapped screen.
// Auto rule: the agent with the most prompts decides (claude-code → Cam, codex → Lệnh);
// no agent data at all → Cú, the night-owl default. The user can always override in the page.

export const COMPANION_IDS = ['cam', 'lenh', 'cu'];
const BY_SOURCE = { 'claude-code': 'cam', codex: 'lenh' };

/** @param ai data.ai (or null) → 'cam' | 'lenh' | 'cu' */
export function autoCompanion(ai) {
  if (!ai) return 'cu';
  const bySource = ai.promptsBySource && Object.keys(ai.promptsBySource).length
    ? ai.promptsBySource
    : Object.fromEntries((ai.sources || []).map((s) => [s, 1])); // older data: no counts, every source weighs the same
  const order = Object.keys(BY_SOURCE);
  const ranked = Object.entries(bySource)
    .filter(([source, n]) => BY_SOURCE[source] && n > 0)
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0])); // tie → Claude Code first
  return ranked.length ? BY_SOURCE[ranked[0][0]] : 'cu';
}

// Pose per screen id. 'notes' = the closing screen: pose comes from the lead note, then waves at the sign-off.
const POSE_BY_SCREEN = {
  'mo-dau': 'run', 'con-so': 'cheer', 'nhip-ngay': 'type', 'mang-viec': 'think',
  'chi-dao': 'mega', 'agent-lam': 'type', 'don-bay': 'cheer', 'cac-repo': 'laugh', 'khep-lai': 'notes',
};

/** Pose for a screen; the hours screen dozes off for night owls. */
export function screenPose(id, data) {
  if (id === 'gio-giac') return data.habits?.topDaypart?.id === 'khuya' ? 'doze' : 'laugh';
  return POSE_BY_SCREEN[id] || 'run';
}
