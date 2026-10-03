// Secret hygiene for everything that leaves the machine toward the narrator.
// Rule: redact EACH raw string BEFORE JSON.stringify — escaped quotes (\") defeat key/value regexes.

const KEY_WORD = '(?:secret|api[_-]?key|private[_-]?key|access[_-]?key|key|token|password|passwd|pwd|credentials?)';

// Order matters: whole-block / specific shapes first, generic key=value last.
const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[REDACTED]'],
  [/eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, '[REDACTED]'], // JWT
  // scheme://user:pass@host — keep scheme, drop credentials
  [/\b((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|rediss?|amqps?):\/\/)[^\s:@/'"]*:[^\s@'"]*@/gi, '$1[REDACTED]@'],
  [/(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{8,}/g, '[REDACTED]'],
  [/(?<![A-Za-z0-9])[sprw]k_(?:live|test)_[A-Za-z0-9]{6,}/g, '[REDACTED]'], // Stripe
  [/(?<![A-Za-z0-9])rk_[A-Za-z0-9_]{10,}/g, '[REDACTED]'],
  [/gh[pousr]_[A-Za-z0-9]{10,}/g, '[REDACTED]'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '[REDACTED]'],
  [/AKIA[0-9A-Z]{16}/g, '[REDACTED]'],
  [/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED]'], // Google API key
  [/xox[abposr]-[A-Za-z0-9-]{8,}/g, '[REDACTED]'], // Slack
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]'],
  // JSON/YAML-ish quoted key: "password": "x y"  /  'api_key': 'x'  /  "token": 123
  [new RegExp(String.raw`(["'])([\w.-]*${KEY_WORD}[\w.-]*)\1(\s*:\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,}\]]+)`, 'gi'), '$1$2$1$3"[REDACTED]"'],
  // ENV / code assignment: OPENAI_API_KEY=x, SECRET_KEY: "x", password = hunter2
  [new RegExp(String.raw`\b([A-Za-z0-9_]*(?:_|\b)${KEY_WORD}(?:_[A-Za-z0-9_]*)?)(\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|\S+)`, 'gi'), '$1$2[REDACTED]'],
];

export function redactSecrets(text) {
  return SECRET_PATTERNS.reduce((out, [re, to]) => out.replace(re, to), String(text));
}

/** Redact every string inside a plain JSON-like value (call this BEFORE JSON.stringify). */
export function redactDeep(value) {
  if (typeof value === 'string') return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)]));
  return value;
}

// Files whose CONTENT must never reach the narrator (path + counts are still fine).
const SENSITIVE_FILE_RE = /(^|\/)(\.env(\.[^/]*)?|[^/]*\.(pem|key|p12|pfx|jks|keystore)|id_(rsa|dsa|ecdsa|ed25519)[^/]*|[^/]*credentials?[^/]*\.json|secrets?\.[^/]+|\.npmrc|\.netrc)$/i;

export function isSensitiveFile(filePath) {
  return SENSITIVE_FILE_RE.test(String(filePath).split(String.fromCharCode(92)).join('/'));
}

/** Replace the diff body of sensitive files with a one-line placeholder; other files untouched. */
export function stripSensitiveDiff(patch) {
  if (!patch || !patch.includes('diff --git ')) return patch || '';
  return patch
    .split(/^(?=diff --git )/m)
    .map((section) => {
      const m = section.match(/^diff --git a\/.+? b\/(.+)$/m);
      if (!m || !isSensitiveFile(m[1].trim())) return section;
      return `diff --git b/${m[1].trim()}\n(nội dung file nhạy cảm đã ẩn — chỉ giữ đường dẫn)\n`;
    })
    .join('');
}
