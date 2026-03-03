import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrlString } from '@/services/ai/normalizeUrlString';

test('normalizeUrlString strips wrapping backticks', () => {
    assert.equal(normalizeUrlString(' `https://example.com/a` '), 'https://example.com/a');
});

test('normalizeUrlString strips wrapping quotes', () => {
    assert.equal(normalizeUrlString(' "https://example.com/a" '), 'https://example.com/a');
    assert.equal(normalizeUrlString(" 'https://example.com/a' "), 'https://example.com/a');
});

test('normalizeUrlString preserves normal url', () => {
    assert.equal(normalizeUrlString('https://example.com/a'), 'https://example.com/a');
});

