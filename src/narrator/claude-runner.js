// Runs `claude -p` headless with the prompt on stdin. Never throws: returns { ok, text, reason }
// so the caller can fall back to the manual prompt file (missing CLI, timeout, non-zero exit).
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';

// Narrator = pure text in, text out. Untrusted diff text must never reach tools, MCP servers or hooks.
//  --tools ""            no built-in tools at all (no Bash/Read/Write/WebFetch…)
//  --strict-mcp-config   with no --mcp-config = zero MCP servers
// Required flags: if this claude build rejects them we refuse to run (→ manual fallback), never run open.
const REQUIRED_FLAGS = ['--tools', '', '--strict-mcp-config'];
// Optional hardening (older builds may not know them): user settings only (no project/local hooks),
// no skills, and don't save the narrator call as a session (it would pollute agent-activity stats).
const OPTIONAL_FLAGS = ['--setting-sources', 'user', '--disable-slash-commands', '--no-session-persistence'];

export const narratorArgs = (hardened = true) => ['-p', ...REQUIRED_FLAGS, ...(hardened ? OPTIONAL_FLAGS : [])];

/** Kill the whole tree: on Windows the shell fallback leaves cmd.exe → node → claude behind child.kill(). */
function killTree(child) {
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } else {
    child.kill();
  }
}

function attempt(command, args, prompt, timeoutMs, useShell) {
  return new Promise((resolve) => {
    let child;
    try {
      // cwd = temp dir: keeps the user's project hooks/CLAUDE.md out of the narrator call.
      child = spawn(command, args, { cwd: os.tmpdir(), shell: useShell, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({ ok: false, reason: err.code === 'ENOENT' ? 'missing' : err.message });
      return;
    }
    let out = '';
    let errOut = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      killTree(child);
      finish({ ok: false, reason: 'timeout' });
    }, timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (d) => { out += d; });
    child.stderr.setEncoding('utf8').on('data', (d) => { errOut += d; });
    child.on('error', (err) => finish({ ok: false, reason: err.code === 'ENOENT' ? 'missing' : err.message }));
    child.on('close', (code) => {
      if (code === 0 && out.trim()) finish({ ok: true, text: out.trim() });
      else finish({ ok: false, reason: errOut.trim().split('\n').pop() || `exit ${code}` });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(prompt, 'utf8');
  });
}

/** Shell-form command string for the Windows .cmd shim ("" keeps the empty --tools value). */
const shellLine = (args) => `claude ${args.map((a) => (a === '' ? '""' : a)).join(' ')}`;

/** Portable detection = try to spawn; on Windows retry through the shell for npm's claude.cmd shim. */
async function runWith(args, prompt, timeoutMs) {
  const first = await attempt('claude', args, prompt, timeoutMs, false);
  if (first.ok || first.reason !== 'missing' || process.platform !== 'win32') return first;
  // Fixed command string, no user input in it — safe to route through cmd.exe.
  const viaShell = await attempt(shellLine(args), [], prompt, timeoutMs, true);
  return viaShell.reason && /not recognized|không/i.test(viaShell.reason) ? { ok: false, reason: 'missing' } : viaShell;
}

export async function runClaude(prompt, timeoutMs = 180000) {
  const res = await runWith(narratorArgs(true), prompt, timeoutMs);
  // Older claude without the optional flags → retry once with only the required lock-down.
  if (!res.ok && /unknown option|unrecognized/i.test(res.reason || '')) return runWith(narratorArgs(false), prompt, timeoutMs);
  return res;
}

export const REASON_TEXT = {
  missing: 'không tìm thấy lệnh claude trên máy',
  timeout: 'claude trả lời quá lâu',
};
