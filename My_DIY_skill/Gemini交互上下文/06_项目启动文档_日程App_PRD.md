# 项目启动文档：跨端智能日程 App PRD
> 来源：项目暂定开发需求.docx
> 整理日期：2026-05-25

---

## 启动指令

```
启动多AI工作流。
项目类型：跨端智能归档日程App。
协作模式：hybrid。
```

---

## 第一部分：项目概述与核心理念

**项目定位**：个人专用的跨端智能日程管理 App

**核心理念**：本地优先（Local-First）、轻量去噪、AI 驱动输入、数字资产留存（为未来知识库提供原料）

**技术栈**：
| 层级 | 技术 |
|------|------|
| 移动端 | Expo (React Native + TypeScript) |
| PC 桌面端 | Tauri (React + TypeScript + Rust) |
| 后端/云数据库 | Supabase (PostgreSQL) |
| AI 解析层 | DeepSeek API |

---

## 第二部分：核心功能规范（PRD）

### 1. 每日日程管理（双端通用）
- 极简任务列表：创建、展示、勾选完成、软删除
- 周期性任务：支持按天/周重复规则
- 分类标签：通过颜色/Tag 区分（学业、班务工作、个人生活）

### 2. PC 端桌面全透明挂件（Tauri 专属）
- 视觉：
  - 彻底去除系统原生边框（frameless）
  - 背景全透明，无系统阴影
  - 支持毛玻璃/磨砂玻璃效果（backdrop-filter: blur）
- 交互：
  - 窗口始终置顶（Always on Top），不抢占其它软件输入焦点
  - 顶部 40px 为拖拽把手区（-webkit-app-region: drag）
  - 下方列表区可点击勾选（-webkit-app-region: no-drag）

### 3. 本地优先的双向增量同步
- 离线可用：所有增删改查首选修改本地存储（SQLite / LocalStorage），UI 零延迟响应
- 同步算法：不使用长连接。基于时间戳（updated_at）进行断点双向比对
- 触发时机：App 启动/切回前台/网络恢复时 → 先 Pull 远端，后 Push 本地
- 冲突解决：最后修改者赢（Last-Write-Wins）

### 4. AI 自然语言日程解析
- 支持大白话输入（例："明天早上8点去综合楼收齐班级综合测评表"）
- 调用 DeepSeek API，解析为标准 JSON（标题、截止时间、分类标签）
- 自动写入本地 DB

### 5. 知识库原料储备（数据留存）
- 绝对禁止物理删除：删除操作仅将 `is_deleted` 置为 true
- 完工时间戳：勾选完成时必须精确记录 `completed_at`
- 格式化导出：支持一键导出历史日程为 JSON（用于 RAG）和 Markdown（Daily Notes 风格，按日期归档）

---

## 第三部分：数据契约（Database Schema）

> 【强制约束】：本地 SQLite 与云端 Supabase 必须严格对齐以下字段。
> CC#1 需在代码入口处设置 Assert Guards 确保契约不被打破。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | UUID | 主键，客户端生成全局唯一，防自增冲突 |
| title | TEXT | 日程内容/标题 |
| tag | VARCHAR | 分类标签（学业/班务/生活） |
| notes | TEXT | 任务备注/详情描述 |
| completed | BOOLEAN | 完成状态，默认 false |
| is_deleted | BOOLEAN | 软删除标记，默认 false（核心：数据永不丢失） |
| due_date | TIMESTAMP | 任务截止或提醒时间（可为空） |
| created_at | TIMESTAMP | 创建时间，默认当前时间 |
| completed_at | TIMESTAMP | 实际勾选完成的时间（可为空） |
| updated_at | TIMESTAMP | 最后修改时间戳（用于增量同步比对） |

---

## 第四部分：工作流阶段规划

CC#1 严格按照以下 5 个阶段推进，每个阶段出口必须执行阀门审查。

### 阶段 1：数据基建与契约锁定
- **目标**：Supabase 建表、本地 SQLite 初始化、定义 TS Interface
- **审查**：A 级（严格核对 Schema 字段）

### 阶段 2：核心同步算法（高难度预警）
- **目标**：实现 Pull/Push 增量同步与 Last-Write-Wins 冲突解决
- **路由**：必须触发外部模型进行伪代码设计与脑补运行（Dry-Run），确认无误后交由 CC#2 实现

### 阶段 3：Tauri 桌面端开发
- **目标**：Rust 无边框透明窗口配置、React 拖拽区实现、桌面端 UI
- **审查**：B 级（用户需介入进行视觉验收）

### 阶段 4：Expo 移动端开发 & AI 接入
- **目标**：React Native 列表 UI、DeepSeek API 接入与 JSON 解析
- **审查**：A 级（防御性断言：确保 AI 解析的脏数据不会写入 DB）

### 阶段 5：导出功能与终审
- **目标**：Markdown/JSON 导出功能，全局静默 Bug 扫描（特别是物理删除漏洞）

---

## 第五部分：项目执行注意事项（防灾指南）

1. **保护 CC#1 上下文**：CC#1 绝对不要亲自阅读 Tauri 的 Rust 编译长报错或 Expo 的依赖冲突日志。所有环境配置、编译试错必须交由本地 CC#2 独立会话完成。

2. **UI 视觉盲区**：在阶段 3 开发透明窗口时，AI 无法"看见"界面。用户将作为"视觉传感器"，将渲染结果（如"毛玻璃未生效"）反馈给 CC#1。

3. **强制交叉审查触发点**：在阶段 2（同步算法）和阶段 5（终审）定稿前，CC#1 必须生成 `handoff_payload.txt`，由用户交由网页端外部模型（Gemini/GPT）进行独立漏洞审查。

4. **逻辑与 UI 分离**：在阶段 2，严禁 CC#2 编写任何 UI 代码，必须编写纯粹的 TypeScript 逻辑函数并跑通单测，确保同步算法的纯粹性。

---

## 启动前准备清单

- [ ] 浏览器打开一个 Claude Sonnet 或 GPT-4o 干净页面备用（高级算法审查员）
- [ ] 电脑预装 Node.js
- [ ] 电脑预装 Rust 工具链（用于 Tauri）
- [ ] 电脑预装 Expo CLI
- [ ] 准备好 Supabase 账号和项目

> 阶段 2（同步算法）是最难的。如果 CC#2 卡住，果断让它把代码 Dump 出来，贴给网页端大模型求助，不要让 CC#2 在本地死磕。
