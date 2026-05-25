# multi-ai-workflow v2.1

> 星型中枢 · 多AI协作工作流框架

源于数学建模大赛 C 题问题二中使用多 AI 工具协作流程提炼蒸馏出的"角色隔离 + 交叉审查 + 检查点"等可复用协作范式，融合 superpowers 功能包体系等 17 个 Skill 整合调度，构成的一套复用性较为广泛的通用多 AI 协作工作流体系工具。

## 快速开始

双击 `multi-ai-workflow.html` 在浏览器中打开文档查看器。

或运行 `node build.js` 重新构建。

## 项目结构

```
├── multi-ai-workflow.html          # 自包含文档查看器
├── build.js                        # 构建脚本
├── viewer.js                       # 前端交互逻辑
├── sections.json                   # 文档分组配置
├── multi-ai-workflow-skill/        # 工作流 Skill 文件
│   ├── multi-ai-workflow/          # 核心文件
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── spec.md
│   │       ├── iteration.md
│   │       └── usage-guide.md
│   ├── 工作流指南/                  # 操作指南
│   ├── 小白上手教程_5分钟看懂.txt
│   └── 版本迭代全记录.md
├── Gemini交互上下文/                # Gemini 交互记录
├── 工作流研制过程文档/              # 设计文档
├── LICENSE                         # MIT License
└── README.md
```

## 核心能力

- **星型中枢**：CC#1 决策调度，CC#2 执行吞噪
- **四层防御**：分流→告警→切换→快照
- **检查点系统**：磁盘锚定，30 秒恢复全部状态
- **交叉审查**：多模型异构校验，拦截静默 Bug
- **17 Skill 联动**：深度集成 superpowers 技能包

## 作者

**MQTT**
- QQ：3388589706
- E-mail：071021mqtt@gmail.com

## 许可

MIT License © 2026 MQTT
