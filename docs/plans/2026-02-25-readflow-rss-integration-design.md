# 设计稿：Readflow RSS 集成 + Nexus 订阅管理 + RSS 语料驱动日报/追踪 + Classic 关联面板

## 背景与目标
Nexus 需要将日报与事件追踪的数据来源统一为 Readflow（RSS 抓取与清洗微服务）输出的“清洗文章快照”，并在 Nexus 内提供订阅源与分组的管理入口。同时在 Classic 日报模式中实现“悬浮标题右侧展开关联追踪事件、点击固定面板”，且关联数据由后端预先生成（只做 URL 强关联，前端不计算关联）。

## 范围
- Readflow 集成（Robot User 登录换 JWT、配置读写、拉取清洗文章）
- Nexus 订阅管理（源 URL、分组名、启用/禁用；保存即同步）
- 日报生成改造（LLM 输入为当日清洗文章全集，不分段、不截断）
- 事件追踪改造（LLM 输入为区间清洗文章全集/候选集不截断；sources 闭环）
- 强关联生成（URL 命中 EventNode.sources）
- Classic UI（hover 展开 + click pin；读取后端预生成 relatedTrackers）

不包含：
- Readflow 抓取频率配置（由 Readflow 侧设置）
- 多租户（当前单租户、单机器人账号）

## Readflow 集成约束
### Base URL
- 默认：`https://rsscloud.198909.xyz:37891/`
- 必须支持在 Nexus 设置中可配置（覆盖默认）

### 认证与 Token
- `POST /api/auth/login`：用机器人账号（email/password）获取 `{ success, user, token }`
- JWT 有效期 30 天，无 refresh token
- Nexus 策略：内存缓存 token；请求遇到 401 时重新 login 并重试一次

### 配置读取与写回（关键避坑）
- `GET /api/rss/sync/config`（Bearer token）：返回该用户完整 configSync JSON 树
- `POST /api/rss/sync/config`：全量替换 configSync 节点（LWW）；必须全量回传
- 冲突：`updatedAt` 不更新会触发 409；处理方式为重新 GET 再合并再 POST 一次

## Nexus 订阅管理（配置面板）
### 数据项
- Feed URL（字符串）
- GroupName（字符串标签）
- Enabled（布尔）

禁用语义：
- 禁用即“不写入 Readflow 的 sources”，但 Nexus 本地仍保留该记录以便未来再启用

### 保存即同步
每次保存触发同步：
1. Robot 登录拿 token（缓存/401 自动重登一次）
2. GET `/api/rss/sync/config` 拉取全量对象
3. 合并 Nexus 配置到 `sources` 与 `settings.dailyReportSettings.groupNames`
4. 更新 `updatedAt=nowISOString()`
5. POST `/api/rss/sync/config` 全量写回
6. 如遇 409：重复 2-5 一次

合并策略（双向编辑兼容）：
- Readflow 侧 sources 若包含 Nexus 未管理的 url：默认保留
- Nexus 管理的 url：以 Nexus（enabled/groupName）为准
- groupNames：取并集，并确保包含所有启用源的 groupName

## 日报生成（RSS 语料驱动）
### 输入
- 从 Readflow 拉取当日清洗文章：`GET /api/rss/daily-reports/articles/cleaned?start=today&end=today`
- articles 字段包含：`title,url,sourceName,content,publishedAt`
- Nexus 将当日 articles 全量送入 LLM 生成日报结构（不分段、不截断）

### 输出与存储
- 保持现有 `DailyDigest` 表结构
- `rawJson` 存储：
  - categories/themes/items（现有 UI 消费）
  - 每个 item 增加 `relatedTrackers`（后端生成，Classic hover 消费）
  - 可选：保存当日 articles 以便调试/回放（如体积允许）

## 事件追踪（RSS 语料驱动）
### 输入
- 对每个 ACTIVE TrackedEvent，拉取 `lastCheckedAt ~ today` 区间的清洗文章
- 候选集策略可选（为了成本/上下文），但候选文章 content 不截断

### 输出与闭环
- 生成 EventNode 时：
  - `sources` 必须来自候选文章 url（URL 闭环，保证可追溯与强关联命中）
- 保持现有 globalSummary 综合逻辑

## 强关联生成（后端预生成）
规则：
- 对每个 digest item 的 `url`：
  - 若命中任一 `EventNode.sources`（等值匹配/必要时 URL 规范化后匹配），则关联对应 TrackedEvent
- 写入 `rawJson` 的 item：`relatedTrackers: [{ id, name, lastNodeDate, lastNodeHeadline, reason: "source_url_match" }]`

## Classic UI：悬浮展开 + 点击固定
### 行为
- 仅 Classic 模式生效
- 悬浮标题：右侧面板展示该 item 的 relatedTrackers
- 点击固定：面板锁定不随 hover 变化；提供取消固定

### 数据来源
- 直接读取 `rawJson.categories[*].themes[*].items[*].relatedTrackers`，前端不做实时关联计算

## 风险与兜底
- LLM 上下文不足：当日 articles 过大可能失败。兜底策略为：
  - 明确数据规模上限（优先）
  - 或多次调用合并（仅作为兜底方案）
- Readflow sync/config 覆盖风险：必须强制 GET→改→全量 POST，并保留 groups/filterRules 等节点

