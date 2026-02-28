// 使用非常简单的内联 CSS 渲染，以适配企业微信的图文环境
export class ReportRenderer {
    renderDailyReport(date: string, digest: any, trackingResults: any[]) {
        // 若使用 mpnews，返回 HTML；若使用 markdown 返回 md 字符串。
        // 根据 WeChatService 的实现，为了简化避开素材上传限制，我们这里提供 Markdown 渲染。

        let md = `# Nexus 每日洞见 (${date})\n\n`;

        // 1. 每日新闻综述
        if (digest) {
            md += `## 📰 今日热点速递\n`;
            md += digest.content + `\n\n`;
        }

        // 2. 追踪事件更新
        md += `## 🔍 长线追踪\n`;
        const updatedEvents = trackingResults.filter(r => r.success && r.details?.updated);

        if (updatedEvents.length === 0) {
            md += `今日追踪事件暂无重大更新。\n\n`;
        } else {
            updatedEvents.forEach(evt => {
                md += `### 📌 ${evt.event}\n`;
                md += `*新增 ${evt.details.newNodesCount} 条动态*\n`;
                md += `> **最新全局脉络：**\n> ${evt.details.newSummary}\n\n`;
            });
        }

        return md;
    }
}

export const reportRenderer = new ReportRenderer();
