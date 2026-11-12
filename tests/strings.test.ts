import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = ['App.tsx', 'src/Paywall.tsx', 'src/useChipsStore.ts', 'game/index.html'];

test('no ellipsis characters in UI sources', () => {
  for (const f of files) assert.equal(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').includes('\u2026'), false, f);
});

test('no AI wording in UI sources', () => {
  for (const f of files) assert.equal(/\bAI\b|artificial intelligence/i.test(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')), false, f);
});

test('RevenueCat is fully removed', () => {
  const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  assert.equal(/react-native-purchases/.test(pkg), false);
  for (const f of files) assert.equal(/revenuecat|react-native-purchases/i.test(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')), false, f);
});

test('game exposes setChips for the native wallet', () => {
  assert.match(readFileSync(new URL('../game/index.html', import.meta.url), 'utf8'), /setChips: setChips/);
});
