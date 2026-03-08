// ═══════════ Prompt Builder ═══════════
// Assembles a complete DAILY_NEWS_PROMPT from a PromptConfig.

import type { PromptConfig } from './promptConfig';

export function buildPromptFromConfig(config: PromptConfig, date: string): string {
    const lines: string[] = [];

    // ── Role ──
    lines.push(
        `你是一个专业的全球新闻编辑。你将收到一组已清洗的新闻文章，以及一组"正在追踪的事件列表"作为输入。请为今天（${date}）生成一份高密度、强归纳的全球新闻日报，并在同一次输出中产出"今日有进展"的追踪事件摘要。`,
        ''
    );

    // ── Module 1: Editorial Principles ──
    lines.push('## 核心原则');
    config.editorialPrinciples.forEach((p) => {
        lines.push(`- **${p.split('：')[0]}**：${p.split('：').slice(1).join('：')}`);
    });
    lines.push('');

    // ── Module 2 & 3: Category Definitions + Rules ──
    const categoryNames = config.categories.map((c) => c.name).join('、');
    lines.push('## 分类要求');
    lines.push(`按这 ${config.categories.length} 大分类输出：${categoryNames}。`);
    lines.push(config.categoryRules);
    lines.push('');

    // ── Module 4: JSON Schema ──
    lines.push('## 输出 JSON（严禁 markdown 代码块）');
    lines.push('{');
    lines.push(`  "date": "${date}",`);
    lines.push(`  "overallSummary": "今日全球新闻趋势总览（约 ${config.params.overallSummaryLength} 字）",`);
    lines.push('  "categories": [');
    lines.push('    {');

    const firstCat = config.categories[0] || { name: '时政要闻', icon: 'landmark' };
    lines.push(`      "name": "${firstCat.name}",`);
    lines.push(`      "icon": "${firstCat.icon}",`);
    lines.push('      "themes": [');
    lines.push('        {');
    lines.push('          "themeName": "核心主题名称（如：中东局势升级）",');
    lines.push('          "items": [');
    lines.push('            {');

    // Item fields from config
    const itemLines: string[] = [];
    for (const f of config.itemFields) {
        if (f.key === 'citations') {
            // Nest citation fields
            const citationExample: Record<string, string> = {};
            for (const cf of config.citationFields) {
                citationExample[cf.key] = cf.description;
            }
            itemLines.push(`              "citations": [\n                ${JSON.stringify(citationExample)}\n              ]`);
        } else if (f.type === 'string[]') {
            itemLines.push(`              "${f.key}": ["${f.description}"]`);
        } else {
            itemLines.push(`              "${f.key}": "${f.description}"`);
        }
    }
    lines.push(itemLines.join(',\n'));

    lines.push('            }');
    lines.push('          ]');
    lines.push('        }');
    lines.push('      ]');
    lines.push('    }');
    lines.push('  ],');

    // trackedUpdates skeleton
    lines.push('  "trackedUpdates": [');
    lines.push('    {');
    lines.push('      "eventId": "必须来自输入的 active_trackers_json",');
    lines.push('      "eventName": "事件名（必须与输入一致）",');
    lines.push('      "reason": "可选：为什么判断今天有实质进展（一句话）",');
    lines.push('      "highlights": [');
    lines.push('        {');
    lines.push('          "headline": "进展归纳结论（1 句）",');

    const citExample: Record<string, string> = {};
    for (const cf of config.citationFields) {
        citExample[cf.key] = cf.description;
    }
    lines.push(`          "citations": [\n            ${JSON.stringify(citExample)}\n          ]`);

    lines.push('        }');
    lines.push('      ]');
    lines.push('    }');
    lines.push('  ],');

    // recommendedEvents skeleton
    lines.push('  "recommendedEvents": [');
    lines.push('    { "name": "独立事件名", "query": "最佳搜索指令", "reason": "追踪理由（15字内）" }');
    lines.push('  ]');
    lines.push('}');
    lines.push('');

    // ── Module 5: Tracking Rules ──
    lines.push('## 追踪摘要规则（trackedUpdates）');
    config.trackingRules.forEach((r) => {
        lines.push(`- ${r}`);
    });
    lines.push('');

    // ── Module 6: Constraints ──
    lines.push('## 强制要求');
    const enabled = config.constraints.filter((c) => c.enabled);
    enabled.forEach((c, i) => {
        let text = c.text;
        // Inject params into relevant constraints
        if (text.includes('bullets') && !text.includes('citations')) {
            text = `items 必须输出 bullets（${config.params.bulletsMin}-${config.params.bulletsMax} 条），每条 bullets 不超过 ${config.params.bulletsMaxChars} 字，避免重复 headline。`;
        }
        if (text.includes('覆盖率目标')) {
            text = `覆盖率目标（展示引用）：在不重复转载的前提下，尽量达到 distinct(citations.url) / articles_json.length ≥ ${config.params.coverageTarget}%。若不足，优先"先拆分 themes，再增加 items"，不要强行合并弱关联新闻。`;
        }
        lines.push(`${i + 1}. ${text}`);
    });
    lines.push('');

    // ── Input description ──
    lines.push('## 输入数据');
    lines.push('你将收到：');
    lines.push('1) JSON 文章数组 articles_json（字段包含 title/url/sourceName/content/publishedAt）');
    lines.push('2) JSON 事件数组 active_trackers_json（字段包含 eventId/eventName/query）');

    return lines.join('\n');
}
