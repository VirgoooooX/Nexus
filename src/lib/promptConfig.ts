// ═══════════ Prompt Config Types & Defaults ═══════════
// Decomposition of DAILY_NEWS_PROMPT into 7 configurable modules.

export interface ItemField {
    key: string;
    type: 'string' | 'string[]' | 'object[]';
    description: string;
    required: boolean;
}

export interface CitationField {
    key: string;
    type: 'string';
    description: string;
    required: boolean;
}

export interface CategoryDef {
    name: string;
    icon: string;
}

export interface Constraint {
    text: string;
    enabled: boolean;
}

export interface OutputParams {
    overallSummaryLength: number;
    bulletsMin: number;
    bulletsMax: number;
    bulletsMaxChars: number;
    coverageTarget: number;
    maxCitationsPerItem: number;
}

export interface PromptConfig {
    editorialPrinciples: string[];
    categories: CategoryDef[];
    categoryRules: string;
    itemFields: ItemField[];
    citationFields: CitationField[];
    trackingRules: string[];
    constraints: Constraint[];
    params: OutputParams;
}

// ─── Default config extracted from current prompts.ts ───

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
    editorialPrinciples: [
        '归纳但不强行合并：不要逐条罗列新闻，但也不要把关联性弱的新闻硬塞进同一条结论。若不确定是否强关联，优先拆分为不同 items。',
        '合并门槛：只有"同一主体/同一事件/同一动作或政策/同一交易或产品发布/同一时间线进展"的新闻才允许合并成同一 item；否则必须拆分。',
        '去重不是少写：避免同义重复，但以"尽量不漏"为优先目标。可以写更多 items 来覆盖不同新闻点。',
        '强引用闭环：所有引用链接必须严格来自输入文章的 url，严禁编造/拼接 URL。',
    ],

    categories: [
        { name: '时政要闻', icon: 'landmark' },
        { name: '前沿科技', icon: 'cpu' },
        { name: '人工智能', icon: 'brain' },
        { name: '智能硬件', icon: 'smartphone' },
        { name: '商业财经', icon: 'trending-up' },
        { name: '社会民生', icon: 'users' },
        { name: '娱乐文化', icon: 'film' },
        { name: '电子游戏', icon: 'gamepad-2' },
        { name: '体育赛事', icon: 'trophy' },
    ],

    categoryRules:
        '每个分类按当日素材密度自适应输出若干核心主题（Theme），允许空缺；当某分类素材很密集时，优先增加 themes 数量（按主体/地区/行业/事件线拆分），避免一个大主题里塞入弱关联新闻。每个主题输出若干条"归纳结论"（items）。合并必须谨慎：优先用更多更细的 themes 与 items 覆盖不同新闻点，避免弱关联合并导致遗漏。每条结论都必须带所有的相关联的引用来源（括号多来源）。',

    itemFields: [
        { key: 'headline', type: 'string', description: '归纳结论句（一句话概括关键变化/趋势）', required: true },
        { key: 'url', type: 'string', description: '主引用链接（必须来自 citations[0].url；若无则用空字符串）', required: true },
        { key: 'bullets', type: 'string[]', description: '要点（简短）', required: true },
        { key: 'coveredUrls', type: 'string[]', description: '该结论覆盖到的输入文章 url（可多个；必须严格来自输入）', required: true },
        { key: 'citations', type: 'object[]', description: '引用来源列表', required: true },
    ],

    citationFields: [
        { key: 'source', type: 'string', description: '来源媒体名', required: true },
        { key: 'url', type: 'string', description: '必须来自输入文章的 url', required: true },
        { key: 'title', type: 'string', description: '必须来自输入文章的 title，且与该 url 对应', required: true },
        { key: 'publishedAt', type: 'string', description: '必须来自输入文章的 publishedAt，且与该 url 对应', required: true },
    ],

    trackingRules: [
        '你会收到 active_trackers_json（包含 eventId/eventName/query）。你必须基于输入文章判断"今天是否有实质进展"。',
        '只输出 hasUpdate=true 的事件：如果某个事件今天无实质更新，不要输出它。',
        '每个事件输出 2-4 条 highlights，每条 highlights 必须包含所有相关 citations；若找不到 citations，不要输出该 highlights；若一个事件最终没有任何 highlights，则不要输出该事件。',
    ],

    constraints: [
        { text: '只使用输入提供的文章：严禁联网搜索、严禁引入输入之外的新闻或链接。', enabled: true },
        { text: '每条 items/highlights 必须提供所有的相关的 citations（多个）；禁止空 citations 的结论出现。', enabled: true },
        { text: '绝对禁止伪造 URL：引用链接必须严格来自输入文章 url；不确定就不要引用。', enabled: true },
        { text: '输出必须严格 JSON，严禁任何 markdown 包裹。', enabled: true },
        { text: 'items 必须输出 bullets，每条 bullets 避免重复 headline。', enabled: true },
        { text: '输入不遗漏（目标 100%）：articles_json 中每篇文章的 url 都必须至少出现在某个 item.coveredUrls 中。', enabled: true },
        { text: '覆盖率优先：尽量让 citations.url 覆盖更多输入文章，避免同一个 url 在多条 items 里反复出现。', enabled: true },
        { text: '去重转载：若多篇文章标题几乎一致（转载/同稿），可以只引用其中 1 个 url，不必重复引用。', enabled: true },
        { text: '覆盖率目标（展示引用）：在不重复转载的前提下，尽量达到 distinct(citations.url) / articles_json.length 的覆盖目标。若不足，优先"先拆分 themes，再增加 items"。', enabled: true },
    ],

    params: {
        overallSummaryLength: 200,
        bulletsMin: 2,
        bulletsMax: 4,
        bulletsMaxChars: 40,
        coverageTarget: 60,
        maxCitationsPerItem: 6,
    },
};
