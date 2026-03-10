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
    domain: 'source' | 'format' | 'bullet' | 'coverage' | 'dedup';
    code: string; // e.g. S1, F1, B1, C1, D1
}

export interface OutputParams {
    overallSummaryLength: number;
    bulletsMin: number;
    bulletsMax: number;
    bulletsMaxChars: number;
    coverageTarget: number;
    maxCitationsPerItem: number;
}

export interface EditorialPrinciple {
    id: string;         // P1, P2, P3
    title: string;      // e.g. "编辑立场"
    subtitle: string;   // e.g. "高密度归纳，零信息遗漏"
    body: string;       // Full explanation text
}

export interface CategoryRules {
    splitStrategy: string[];
    outputRules: string[];
}

export interface PromptConfig {
    editorialPrinciples: EditorialPrinciple[];
    categories: CategoryDef[];
    categoryRules: CategoryRules;
    itemFields: ItemField[];
    citationFields: CitationField[];
    trackingRules: string[];
    constraints: Constraint[];
    params: OutputParams;
}

// ─── Default config ───

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
    editorialPrinciples: [],

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

    categoryRules: {
        splitStrategy: [],
        outputRules: [],
    },

    itemFields: [],

    citationFields: [],

    trackingRules: [],

    constraints: [],

    params: {
        overallSummaryLength: 200,
        bulletsMin: 2,
        bulletsMax: 4,
        bulletsMaxChars: 40,
        coverageTarget: 60,
        maxCitationsPerItem: 6,
    },
};

// ─── Normalize legacy DB configs to current format ───
export function normalizePromptConfig(config: PromptConfig): PromptConfig {
    const normalized = { ...config };

    // Migrate editorialPrinciples: string[] → EditorialPrinciple[]
    if (Array.isArray(normalized.editorialPrinciples) && normalized.editorialPrinciples.length > 0 && typeof normalized.editorialPrinciples[0] === 'string') {
        normalized.editorialPrinciples = (normalized.editorialPrinciples as unknown as string[]).map((s, i) => {
            const colonIdx = s.indexOf('：');
            return {
                id: `P${i + 1}`,
                title: colonIdx > 0 ? s.slice(0, colonIdx) : `原则 ${i + 1}`,
                subtitle: '',
                body: colonIdx > 0 ? s.slice(colonIdx + 1) : s,
            };
        });
    }

    // Migrate categoryRules: string → CategoryRules
    if (typeof normalized.categoryRules === 'string') {
        normalized.categoryRules = {
            splitStrategy: [(normalized.categoryRules as unknown as string)],
            outputRules: [],
        };
    }
    if (!normalized.categoryRules.splitStrategy) normalized.categoryRules = { ...normalized.categoryRules, splitStrategy: [] };
    if (!normalized.categoryRules.outputRules) normalized.categoryRules = { ...normalized.categoryRules, outputRules: [] };

    // Migrate constraints: add domain/code if missing
    if (Array.isArray(normalized.constraints) && normalized.constraints.length > 0 && !('domain' in normalized.constraints[0])) {
        normalized.constraints = normalized.constraints.map((c, i) => ({
            ...c,
            domain: 'source' as const,
            code: `R${i + 1}`,
        }));
    }

    return normalized;
}
