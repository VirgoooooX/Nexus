# Digest Citation Titles & UI Expand Implementation Plan

> **Goal:** 让日报 citations 携带并强校验 title；Classic 改为点击展开追踪/引用；Masonry 移除“打开引用”。

**Architecture**
- 扩展 citations 为 `{source,url,title}`，并在服务端归一化阶段以输入 articles 的 `url->title` 映射回填/校验，缺失 title 的 citation 直接丢弃。
- Classic 视图用 `expandedItemKey` 管理展开状态；右侧面板只跟随 hovered item，不再提供 pin。

---

### Task 1: Extend citations with required title

**Files**
- Modify: `src/services/ai/types.ts`
- Modify: `src/services/ai/prompts.ts`
- Modify: `src/services/ai/AISearchService.ts`

**Steps**
1. 将 `Citation` 扩展为 `{ source: string; url: string; title: string }`。
2. 更新日报 prompt：要求 citations 输出 `title`，且必须来自输入文章并与 url 对应。
3. 在 `AISearchService` 内新增 `buildAllowedUrlToTitle(articles)`，并在 `normalizeCitations()` 中按 url 回填/覆盖 title；title 缺失则丢弃该 citation。
4. 将 `normalizeNewsItem()` 与 trackedUpdates 的 citations 归一化链路全部串上 title 映射。

**Verification**
- 运行 `npm run build`，确认 TypeScript 通过。

---

### Task 2: Classic view click-to-expand (no pin)

**Files**
- Modify: `src/components/dashboard/LayoutWrapper.tsx`

**Steps**
1. 移除 `pinnedItem` 状态与相关 UI（Pinned 标识与 unpin 按钮）。
2. 新增 `expandedItemKey`，点击 item 切换展开/收起。
3. 展开区：
   - 若 `relatedTrackers` 有值，渲染追踪列表并可跳转事件页面。
   - 否则渲染 citations 列表，链接文字优先使用 citation.title；title/url 缺失的 citation 不展示。

**Verification**
- 本地打开 classic 视图：点击有追踪的条目能展开追踪列表；无追踪时展开引用列表；引用链接可打开且不触发折叠。

---

### Task 3: Masonry remove redundant “打开引用”

**Files**
- Modify: `src/components/dashboard/views/MasonryView.tsx`

**Steps**
1. 移除卡片底部“打开引用”文案与 icon。
2. 清理无用 import。

**Verification**
- 本地打开 masonry 视图：确认无“打开引用”行，item 仍可点击跳转。

---

### Task 4: Project-level verification

**Steps**
1. 运行 `npm run build`
2. 运行 `npm run lint`

