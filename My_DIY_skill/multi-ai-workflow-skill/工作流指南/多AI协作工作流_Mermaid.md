# 多AI协作工作流 v2.1 — Mermaid流程图

> 以下图表可在支持Mermaid的Markdown渲染器中直接查看（VS Code/GitHub/Notion）。
> 如无法渲染，用浏览器打开 `多AI协作工作流_全景图.html`。

## 一、主流程

```mermaid
flowchart TD
    START([用户发起项目]) --> SP[/using-superpowers<br/>扫描全部skill/]
    SP --> P0{阶段0: brainstorming<br/>澄清需求·探索方案}
    P0 -->|用户批准设计| S1[步骤1: 确认协作模式<br/>hybrid/api_full/manual]
    P0 -->|未批准| P0
    S1 --> S2[步骤2: 定义角色<br/>CC#1中枢 + CC#2副手 + 外部5类]
    S2 --> S3[步骤3: 拆解阶段<br/>writing-plans<br/>git init 硬性前置<br/>3~7阶段·输入/输出/标准]
    S3 --> LOOP

    subgraph LOOP[阶段N循环]
        TASK[CC#1 分派任务] --> CODE{需要写代码?}
        CODE -->|高难度| WEB[web-access<br/>搜GitHub/论文]
        WEB --> COMP{竞赛模式?}
        COMP -->|是| IDEA[提取思路+伪代码<br/>→独立重写]
        COMP -->|否| REUSE[代码质量评估<br/>→复用或重写]
        IDEA --> EXT[外部模型生成]
        REUSE --> EXT
        EXT --> REVIEW1[多AI交叉审查]
        REVIEW1 --> CC2INT[CC#2整合]
        CODE -->|常规| CC2DEV[CC#2执行<br/>subagent-driven-dev]
        CODE -->|不需要| OTHER{其他任务?}
        
        OTHER -->|审查| EXTREV[外部模型独立审→CC#1综合]
        OTHER -->|提取文件| FLASH[外部模型·Flash]
        OTHER -->|生成文档| DOC[docx/pdf/xlsx]
        OTHER -->|并行任务| PAR[dispatching-parallel]
        OTHER -->|决策| DECIDE[只有CC#1]

        CC2DEV --> OUT[CC#2/外部模型产出]
        CC2INT --> OUT
        EXTREV --> OUT
        FLASH --> OUT
        DOC --> OUT
        PAR --> OUT
        DECIDE --> OUT

        OUT --> REPORT[CC#2精简汇报→CC#1]
        REPORT --> GRADE{CC#1审查分级}
        GRADE -->|A级| A[核心算法·控制流+边界]
        GRADE -->|B级| B[可视化·抽查格式]
        GRADE -->|C级| C[调参·核对清单]
        GRADE -->|重大| D[强制交叉审查]

        A --> VALVE[阶段阀门<br/>verification-before-completion]
        B --> VALVE
        C --> VALVE
        D --> CROSS[强制交叉审查<br/>标准级/会话级/单点级]
        CROSS --> BUG{发现问题?}
        BUG -->|是| DEBUG[systematic-debugging<br/>根因追溯]
        DEBUG --> FIX[CC#1综合→拍板]
        BUG -->|否| FIX
        FIX --> VALVE

        VALVE -->|通过| CKPT[📝写检查点+git tag]
        VALVE -->|需改≤3轮| TASK
        VALVE -->|驳回| TASK
        CKPT --> NEXT[同步加固→下阶段]
    end

    NEXT -->|全部通过| FINAL[项目终审<br/>硬约束+静默bug+清单]
    FINAL --> ARCHIVE[归档<br/>6类目录+复盘报告]
```

## 二、四层上下文防御

```mermaid
flowchart LR
    L1[L1·CC#2分流<br/>预防] --> L2[L2·告警信号<br/>发现]
    L2 -->|CC#1:退化/回看/跨阀门<br/>CC#2:倾倒日志/反复改/失忆| L3[L3·检查点切换<br/>修复]
    L3 -->|写项目状态_当前.md<br/>→新会话→恢复| L4[L4·磁盘快照<br/>兜底]
    L4 -->|关机/崩溃<br/>→从文件冷恢复| SAFE[状态恢复]
```

## 三、检查点操作

```mermaid
flowchart TD
    VALVE[阶段阀门通过] --> AUTO[CC#1自动输出检查点文本]
    AUTO --> BACKUP[备份到.workflow_history/]
    AUTO --> TAG[CC#2: git tag stage-X-pass]
    AUTO --> REVIEW[用户10秒人眼Review]
    REVIEW --> SAVE[保存项目状态_当前.md]

    SHUTDOWN[关机前] --> MANUAL[CC#1主动更新检查点]
    MANUAL --> SAVE

    SWITCH1[CC#1上下文老化] --> WAIT[等当前决策完成]
    WAIT --> MANUAL

    SWITCH2[CC#2上下文老化] --> QUICK[存盘→更新→新会话→汇报]
```

## 四、强制交叉审查三降级

```mermaid
flowchart TD
    MAJOR[重大结果] --> CHECK{可用外部模型?}
    CHECK -->|≥2个异构| STD[标准级<br/>A独立审+B独立审<br/>CC#1对比综合]
    CHECK -->|仅1个| SESS[会话级<br/>新Tab+清零+Temp=0<br/>执行2轮独立审查]
    CHECK -->|0个| SINGLE[单点级<br/>CC#1+CC#2自审<br/>标注:单模型·风险自担]
```

## 五、角色关系

```mermaid
flowchart TD
    CC1((CC#1<br/>中枢大脑)) -->|分发任务| CC2((CC#2<br/>副手))
    CC2 -->|精简汇报| CC1
    CC1 -->|主动驱动对话| EXT1[外部·算法生成]
    CC1 -->|主动驱动对话| EXT2[外部·代码审查]
    CC1 -->|主动驱动对话| EXT3[外部·论文审阅]
    CC1 -->|主动驱动对话| EXT4[外部·文件提取]
    CC1 -->|主动驱动对话| EXT5[外部·需求提炼]
    EXT1 -->|审查意见| CC1
    EXT2 -->|审查意见| CC1
    EXT3 -->|审查意见| CC1
    EXT4 -->|提取结果| CC1
    EXT5 -->|需求文档| CC1
    CC2 -->|整合代码| PROJ[(项目文件)]
    CC1 -->|综合→拍板| PROJ
    USER((用户)) -->|只读中继| CC1
    USER -->|只读中继| CC2
    USER -->|只读中继| EXT1
```

---

> v2.1 星型中枢架构 | 2026-05-25
