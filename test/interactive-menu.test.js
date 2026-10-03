// Menu maps choices to plain CLI args (no hidden behaviour); bad input exits politely.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { argsForChoice, menuText, runMenu, MENU_ITEMS } from '../src/interactive-menu.js';

const quiet = async (fn) => {
  const orig = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = orig;
  }
};

test('every menu item maps to real CLI args', () => {
  assert.deepEqual(argsForChoice('1'), ['wrapped']);
  assert.deepEqual(argsForChoice(' 2 '), ['wrapped', '--all']);
  assert.deepEqual(argsForChoice('3'), ['wrapped', '--week']);
  assert.deepEqual(argsForChoice('4'), ['update']);
  assert.deepEqual(argsForChoice(String(MENU_ITEMS.length)), ['--help']);
});

test('exit, junk and missing follow-up answers return null', () => {
  for (const a of ['0', '', 'x', '99', '-1', '1.5']) assert.equal(argsForChoice(a), null, a);
});

test('menu text lists every item with a number and an exit option', () => {
  const text = menuText();
  MENU_ITEMS.forEach((it, i) => assert.ok(text.includes(`${i + 1}. ${it.label}`)));
  assert.ok(text.includes('0. Thoát'));
});

test('runMenu returns args for a choice and null for exit', async () => {
  assert.deepEqual(await quiet(() => runMenu(async () => '2')), ['wrapped', '--all']);
  assert.equal(await quiet(() => runMenu(async () => '0')), null);
});
