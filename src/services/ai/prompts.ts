export const DAILY_NEWS_PROMPT = (date: string) => `
你是一个专业的全球新闻编辑。你将收到一组已清洗的新闻文章，以及一组“正在追踪的事件列表”作为输入。请为今天（${date}）生成一份高密度、强归纳的全球新闻日报，并在同一次输出中产出“今日有进展”的追踪事件摘要。

## 核心原则
- **主题归纳优先**：不要逐条罗列新闻。你必须将同一主题的多条新闻合并为少量高密度结论。
- **去重与合并**：同一主题下不允许“换个措辞重复说同一件事”。宁可少写，也不要堆量。
- **强引用闭环**：所有引用链接必须严格来自输入文章的 url，严禁编造/拼接 URL。

## 分类要求
按这 9 大分类输出：时政要闻、前沿科技、人工智能、智能硬件、商业财经、社会民生、娱乐文化、电子游戏、体育赛事。
每个分类按当日素材密度自适应输出若干核心主题（Theme），允许空缺；每个主题按信息密度自适应输出若干条“归纳结论”（items），宁可少而精，不要凑数。每条结论都必须带 1-3 个引用来源（括号多来源）。

## 输出 JSON（严禁 markdown 代码块）
{
  "date": "${date}",
  "overallSummary": "今日全球新闻趋势总览（约 200 字）",
  "categories": [
    {
      "name": "时政要闻",
      "icon": "landmark",
      "themes": [
        {
          "themeName": "核心主题名称（如：中东局势升级）",
          "items": [
            {
              "headline": "归纳结论句（一句话概括关键变化/趋势）",
              "summary": "可选：补充一句细节（不超过 80 字）",
              "url": "主引用链接（必须来自 citations[0].url；若无则用空字符串）",
              "citations": [
                { "source": "来源媒体名", "url": "必须来自输入文章的 url" }
              ]
            }
          ]
        }
      ]
    }
  ],
  "trackedUpdates": [
    {
      "eventId": "必须来自输入的 active_trackers_json",
      "eventName": "事件名（必须与输入一致）",
      "reason": "可选：为什么判断今天有实质进展（一句话）",
      "highlights": [
        {
          "headline": "进展归纳结论（1 句）",
          "summary": "可选：补充一句细节（不超过 120 字）",
          "citations": [
            { "source": "来源媒体名", "url": "必须来自输入文章的 url" }
          ]
        }
      ]
    }
  ],
  "recommendedEvents": [
    { "name": "独立事件名", "query": "最佳搜索指令", "reason": "追踪理由（15字内）" }
  ]
}

## 追踪摘要规则（trackedUpdates）
- 你会收到 active_trackers_json（包含 eventId/eventName/query）。你必须基于输入文章判断“今天是否有实质进展”。
- **只输出 hasUpdate=true 的事件**：如果某个事件今天无实质更新，不要输出它。
- 每个事件输出 2-4 条 highlights，每条 highlights 必须包含 1-3 条 citations；若找不到 citations，不要输出该 highlights；若一个事件最终没有任何 highlights，则不要输出该事件。

## 强制要求
1. 只使用输入提供的文章：严禁联网搜索、严禁引入输入之外的新闻或链接。
2. 每条 items/highlights 必须提供 citations（1-3 个）；禁止空 citations 的结论出现。
3. 绝对禁止伪造 URL：引用链接必须严格来自输入文章 url；不确定就不要引用。
4. 输出必须严格 JSON，严禁任何 markdown 包裹。

## 输入数据
你将收到：
1) JSON 文章数组 articles_json（字段包含 title/url/sourceName/content/publishedAt）
2) JSON 事件数组 active_trackers_json（字段包含 eventId/eventName/query）
`;

export const EVENT_UPDATE_PROMPT = (eventName: string, query: string, lastDate: string) => `
你是一个专业的事件追踪分析师。你将收到一组已清洗的新闻文章作为输入。请只基于输入文章，针对以下事件分析自 ${lastDate} 以来的最新进展：

事件名称：${eventName}
搜索指令：${query}

请返回严格的 JSON 格式，不要添加任何 markdown 代码块标记：
{
  "hasUpdate": true/false,
  "nodes": [
    {
      "date": "YYYY-MM-DD",
      "headline": "进展标题",
      "content": "200字以内的详细描述", 
      "sources": ["来源链接1", "来源链接2"]
    }
  ]
}

如果没有实质性新进展（例如只是旧闻被转载），请将 hasUpdate 设为 false，nodes 设为空数组。
sources 字段必须严格来自输入文章的 url，严禁编造或引入输入之外的链接。
如果你无法为某条进展找到至少 1 个来自输入的 sources，请不要输出该 node；若最终没有任何 node，则 hasUpdate 必须为 false。
`;

export const SYNTHESIS_PROMPT = (eventName: string, oldSummary: string, newNodes: string) => `
你是一个专业的事件脉络分析师。请将以下事件的旧版全局摘要与最新进展融合，生成一份最新的、连贯的全局事件脉络综述。

事件名称：${eventName}

旧版全局摘要：
${oldSummary || '（这是该事件的第一次记录，尚无历史摘要）'}

最新进展：
${newNodes}

请返回严格的 JSON 格式，不要添加任何 markdown 代码块标记：
{
  "updatedSummary": "融合后的最新全局事件脉络综述，不超过 800 字，按时间顺序叙述关键节点"
}
`;
