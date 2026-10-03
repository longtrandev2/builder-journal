// Groups chronological commits into work sessions: a gap of MORE than 2h starts a new session.
export const SESSION_GAP_MINUTES = 120;

export function groupSessions(commits, gapMinutes = SESSION_GAP_MINUTES) {
  const sessions = [];
  let current = null;
  let prevTime = null;
  for (const commit of commits) {
    const t = Date.parse(commit.date);
    if (!current || (t - prevTime) / 60000 > gapMinutes) {
      current = { commits: [] };
      sessions.push(current);
    }
    current.commits.push(commit);
    prevTime = t;
  }
  return sessions.map((s, i) => {
    const start = s.commits[0].date;
    const end = s.commits[s.commits.length - 1].date;
    return {
      index: i + 1,
      start,
      end,
      durationMinutes: Math.round((Date.parse(end) - Date.parse(start)) / 60000),
      commits: s.commits,
    };
  });
}
