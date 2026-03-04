export interface Citation {
    source: string;
    url: string;
    title: string;
    publishedAt: string;
}

// 单条归纳结论
export interface NewsItem {
    headline: string;
    summary?: string;
    bullets?: string[];
    url: string;
    citations?: Citation[];
    coveredUrls?: string[];
    source?: string;
    evidenceUrls?: string[];
}

// 核心主题 (包含多条相关新闻)
export interface NewsTheme {
    themeName: string;
    items: NewsItem[];
}

// 顶级分类
export interface NewsCategory {
    name: string;
    icon: string;
    themes?: NewsTheme[]; // 新结构：基于主题聚合
    items?: NewsItem[];   // 保留以兼容稍早的数据结构
}

// 每日新闻搜索结果
export interface DailyNewsResult {
    date: string;
    categories: NewsCategory[];
    overallSummary: string;
    items?: NewsItem[]; // 保留以兼容最早期的数据结构
    recommendedEvents: { name: string; query: string; reason: string }[];
    trackedUpdates?: TrackedUpdate[];
}

export interface TrackedUpdateHighlight {
    headline: string;
    summary?: string;
    citations: Citation[];
}

export interface TrackedUpdate {
    eventId: string;
    eventName: string;
    reason?: string;
    highlights: TrackedUpdateHighlight[];
}

// 事件追踪搜索结果
export interface EventUpdateResult {
    hasUpdate: boolean;
    nodes: {
        date: string;
        headline: string;
        content: string;
        sources: string[];
    }[];
}

// 全局摘要融合结果
export interface SynthesisResult {
    updatedSummary: string;
}

// AI Provider 接口
export interface IAIProvider {
    searchDailyNews(date: string): Promise<DailyNewsResult>;
    searchEventUpdate(eventName: string, searchQuery: string, lastCheckedDate: string): Promise<EventUpdateResult>;
    synthesizeGlobalSummary(eventName: string, oldSummary: string, newNodes: string): Promise<SynthesisResult>;
}
