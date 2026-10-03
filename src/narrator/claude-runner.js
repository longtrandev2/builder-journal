// Runs `claude -p` headless with the prompt on stdin. Never throws: returns { ok, text, reason }
// so the caller can fall back to the manual prompt file (missing CLI, timeout, non-zero exit).
import { spawn } from 'node:child_process';
import os from 'node:os';

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
      child.kill();
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

/** Portable detection = try to spawn; on Windows retry through the shell for npm's claude.cmd shim. */
export async function runClaude(prompt, timeoutMs = 180000) {
  const first = await attempt('claude', ['-p'], prompt, timeoutMs, false);
  if (first.ok || first.reason !== 'missing' || process.platform !== 'win32') return first;
  // Fixed command string, no user input in it — safe to route through cmd.exe.
  const viaShell = await attempt('claude -p', [], prompt, timeoutMs, true);
  return viaShell.reason && /not recognized|không/i.test(viaShell.reason) ? { ok: false, reason: 'missing' } : viaShell;
}

export const REASON_TEXT = {
  missing: 'không tìm thấy lệnh claude trên máy',
  timeout: 'claude trả lời quá lâu',
};
