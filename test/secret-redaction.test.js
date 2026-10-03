// Secret hygiene: redaction runs BEFORE JSON.stringify (escaped quotes), covers each token shape,
// and sensitive files never contribute diff text — in the prompt builder or the git reader.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { redactSecrets, redactDeep, isSensitiveFile, stripSensitiveDiff } from '../src/narrator/secret-redactor.js';
import { buildPrompt } from '../src/narrator/prompt-builder.js';
import { readCommits } from '../src/extractor/git-reader.js';
import { makeRepo, commitAt, cleanup } from './helpers/temp-git-repo.js';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEF123_-xyz';
const CASES = {
  'quoted json key': ['{"password": "hunter2 x"}', 'hunter2'],
  'single-quoted key': ["{'api_key': 'zzz-secret'}", 'zzz-secret'],
  'json key, numeric value': ['{"token": 123456789}', '123456789'],
  'env SECRET_KEY': ['SECRET_KEY=abcd1234efgh', 'abcd1234efgh'],
  'env OPENAI_API_KEY quoted': ['OPENAI_API_KEY="abc def"', 'abc def'],
  'env *_TOKEN': ['GITHUB_TOKEN: tok_value_123', 'tok_value_123'],
  'plain assignment': ['password = hunter2', 'hunter2'],
  'stripe sk_live': ['sk_live_abcdefghijklmn', 'abcdefghijklmn'],
  'stripe sk_test': ['key sk_test_abcdefghijklmn', 'abcdefghijklmn'],
  'stripe rk': ['rk_live_abcdefghijklmn', 'abcdefghijklmn'],
  'postgres url': ['postgres://admin:s3cr3tpw@db.host:5432/app', 's3cr3tpw'],
  'mongodb+srv url': ['mongodb+srv://u:p4ssw0rd@cluster0.mongodb.net/x', 'p4ssw0rd'],
  'mysql url': ['mysql://root:rootpw@localhost/db', 'rootpw'],
  'redis url': ['redis://default:redispw@host:6379', 'redispw'],
  'amqp url': ['amqp://guest:guestpw@rabbit', 'guestpw'],
  'google api key': ['AIzaSyA1234567890abcdefghijklmnopqrstuv', 'A1234567890abcdefghijk'],
  'slack token': ['xoxb-1234567890-abcdefghij', '1234567890-abcdefghij'],
  jwt: [`token ${JWT}`, 'eyJzdWIiOiIxMjM0NTY3ODkwIn0'],
  'bearer token': ['Authorization: Bearer abc.DEF-123_xyz+/=', 'abc.DEF-123_xyz'],
  'github token': ['ghp_abcdefghijklmnop', 'abcdefghijklmnop'],
  'aws key': ['AKIAABCDEFGHIJKLMNOP', 'ABCDEFGHIJKLMNOP'],
  'private key block': ['-----BEGIN RSA PRIVATE KEY-----\nMIIEabc\n-----END RSA PRIVATE KEY-----', 'MIIEabc'],
};

for (const [name, [input, secret]] of Object.entries(CASES)) {
  test(`redact: ${name}`, () => {
    const out = redactSecrets(input);
    assert.ok(!out.includes(secret), `leaked "${secret}" in: ${out}`);
    assert.ok(out.includes('[REDACTED]'));
  });
}

test('redact: ordinary prose / code is left alone', () => {
  const text = 'const keyboard = 1; // monkey patch, tokens.length';
  assert.equal(redactSecrets(text), text);
});

test('redactDeep redacts nested strings before stringify (escaped quotes cannot hide a secret)', () => {
  const raw = { diff: '+  "password": "hunter2"\n+  "api_key": "abc123"' };
  assert.ok(!/hunter2|abc123/.test(JSON.stringify(redactDeep(raw))));
  // The pre-fix order (stringify first) leaves the secret behind: proof of the bug being guarded.
  assert.ok(/hunter2|abc123/.test(redactSecrets(JSON.stringify(raw))), 'sanity: stringify-first defeats the regex');
});

const stats = { sessions: 1, commits: 1, chapters: { feature: 1 }, chapterCount: 1 };
const commit = (over) => ({ message: 'x', chapter: 'feature', numstat: [{ path: 'src/a.js', ins: 1, del: 0 }], ...over });

test('prompt: secrets in commit message, file path and diff never reach the data block', () => {
  const sessions = [{ start: '2026-10-01T10:00:00Z', durationMinutes: 5, chapters: ['feature'], commits: [commit({
    message: 'rotate "password": "msgsecret1" now',
    numstat: [{ path: 'config/sk_live_pathsecret99.json', ins: 1, del: 0 }],
    patchExcerpt: '+  "password": "diffsecret2"\n+DATABASE_URL=postgres://u:pgsecret3@h/db',
  })] }];
  const prompt = buildPrompt({ repo: '/x/demo', stats, rangeLabel: 'x', sessions, hardest: 'API_KEY=hardsecret4' });
  for (const leak of ['msgsecret1', 'pathsecret99', 'diffsecret2', 'pgsecret3', 'hardsecret4']) assert.ok(!prompt.includes(leak), leak);
});

test('prompt: backfill weekly digest commit messages are redacted too', () => {
  const weekly = [{ tuan_tu: '2026-09-01', vi_du_commit: ['add token = weeklysecret5 to config'] }];
  const prompt = buildPrompt({ repo: '/x/demo', stats, rangeLabel: 'x', weekly, hardest: '' });
  assert.ok(!prompt.includes('weeklysecret5'));
});

test('sensitive files: detected by name; diff body dropped, other files kept', () => {
  for (const f of ['.env', '.env.production', 'cfg/.env.local', 'a/server.pem', 'k/site.key', 'id_rsa', 'ssh/id_rsa.pub', 'x.p12', 'credentials.json', 'gcp-credentials.json', 'config/secrets.yml', 'secrets.json']) {
    assert.ok(isSensitiveFile(f), f);
  }
  for (const f of ['src/app.js', 'README.md', 'docs/keys-explained.md', 'src/keyboard.js', 'package.json']) assert.ok(!isSensitiveFile(f), f);
  assert.ok(isSensitiveFile(['cfg', '.env'].join(String.fromCharCode(92))), 'windows separators');
  const patch = 'diff --git a/.env b/.env\n+AWS=plainvalue\ndiff --git a/src/a.js b/src/a.js\n+const ok = 1;\n';
  const out = stripSensitiveDiff(patch);
  assert.ok(!out.includes('plainvalue'));
  assert.ok(out.includes('.env') && out.includes('const ok = 1'));
});

test('prompt: patch excerpt of a .env change is dropped, path + counts stay', () => {
  const sessions = [{ start: 'x', durationMinutes: 1, chapters: ['infra'], commits: [commit({
    numstat: [{ path: '.env', ins: 2, del: 0 }],
    patchExcerpt: 'diff --git a/.env b/.env\n+HARMLESS_LOOKING=zebra-value-77\n',
  })] }];
  const prompt = buildPrompt({ repo: '/x/demo', stats, rangeLabel: 'x', sessions, hardest: '' });
  assert.ok(!prompt.includes('zebra-value-77'));
  assert.ok(prompt.includes('.env +2 -0'));
});

test('git-reader patches: .env body dropped at the source, lockfile excluded, source diff kept', () => {
  const dir = makeRepo();
  const git = (...a) => spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
  try {
    commitAt(dir, 5, { file: 'src/a.js' });
    fs.writeFileSync(path.join(dir, '.env'), 'HARMLESS_LOOKING=zebra-value-77\n');
    fs.writeFileSync(path.join(dir, 'package-lock.json'), '{"lock":"lockfile-body-88"}\n');
    fs.writeFileSync(path.join(dir, 'src', 'b.js'), 'export const b = 2;\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'mixed');
    const { commits } = readCommits(dir, { authors: ['Tester'], withPatch: true });
    const mixed = commits.find((c) => c.message === 'mixed');
    assert.ok(mixed.patchExcerpt.includes('export const b = 2'));
    assert.ok(!mixed.patchExcerpt.includes('zebra-value-77'), '.env body leaked');
    assert.ok(!mixed.patchExcerpt.includes('lockfile-body-88'), 'lockfile not excluded');
    assert.ok(mixed.numstat.some((f) => f.path === '.env'), 'path + counts still reported');
  } finally {
    cleanup(dir);
  }
});
