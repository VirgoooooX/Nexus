import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonLenient } from '@/services/ai/safeJsonParsing';

test('parseJsonLenient: 解析纯 JSON', () => {
    const out = parseJsonLenient<{ a: number }>('{"a":1}');
    assert.equal(out.a, 1);
});

test('parseJsonLenient: 解析 ```json fenced 输出', () => {
    const out = parseJsonLenient<{ a: number }>('```json\n{"a":1}\n```');
    assert.equal(out.a, 1);
});

test('parseJsonLenient: 可从前后有杂文本的输出提取 JSON', () => {
    const out = parseJsonLenient<{ a: number; b: string }>('好的，输出如下：\n{"a":1,"b":"x"}\n谢谢');
    assert.deepEqual(out, { a: 1, b: 'x' });
});

test('parseJsonLenient: 遇到 XML/HTML 时给出可读错误', () => {
    assert.throws(
        () => parseJsonLenient('xml\n\n<?xml version="1.0" encoding="utf-8"?><rss></rss>'),
        (e: any) => {
            const msg = String(e?.message || e);
            return msg.includes('non_json_output') && msg.includes('<?xml');
        }
    );
});

