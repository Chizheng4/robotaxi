# Robotaxi 迭代规则入口

本文档是 Robotaxi 项目的迭代规则入口。

AI Agent 通用行为规则见根目录 `AGENTS.md`。本文档补充项目特有的迭代流程、版本管理和归档规则。

---

## 1. 规则文件索引

| 文件 | 用途 |
|------|------|
| `AGENTS.md` | AI Agent 通用行为规则（强制必读入口） |
| `doc/rules/01-iteration-workflow.md` | 迭代类型、分析、确认、执行、归档流程 |
| `doc/rules/02-version-git-rules.md` | 版本号、提交、标签、版本记录规则 |
| `doc/rules/03-field-dictionary-rules.md` | 字段字典、状态枚举、中文展示规则 |
| `doc/rules/04-frontend-ux-rules.md` | 前端体验、设计系统与标准化接入规则 |
| `doc/rules/05-codex-execution-rules.md` | 执行、暂停、验证和禁止行为规则 |
| `doc/rules/06-document-driven-iteration-rules.md` | 文档差异驱动的分析、确认和自动执行协议 |
| `doc/rules/07-simulation-runtime-architecture-rules.md` | 模拟运行架构、性能和扩展接入规则 |
| `doc/rules/08-business-document-service-rules.md` | 业务单据独立服务闭环、关联驱动和财务事实边界 |

---

## 2. 版本迭代读取顺序

跨模块闭环或大中版本按以下顺序读取：

1. `AGENTS.md`
2. `doc/iteration-rules.md`
3. `doc/rules/03-field-dictionary-rules.md`
4. `doc/rules/04-frontend-ux-rules.md`
5. `doc/rules/05-codex-execution-rules.md`
6. `doc/rules/field-dictionary.md`
7. 当前迭代文件或用户指定的业务文档

单页、小修复或纯版本收口继续按 `AGENTS.md` 的实际任务类型读取；纯版本收口只补读本文件、版本 Git 规则和执行规则，不因提交标签重复读取无关字段字典。

---

## 3. 当前迭代文件

大版本状态指针：`doc/common/current-iteration/major/major-current-iteration.md`

小版本状态指针：`doc/common/current-iteration/minor/minor-current-iteration.md`

正式方案文档是业务设计唯一真值；自动执行计划只保存本版本任务、顺序、状态和验收标准；状态指针只保存当前版本、计划链接和执行位置，不重复方案、需求或历史内容。

---

## 4. 历史归档目录

大版本历史归档：`doc/common/iteration-history/major/`

小版本历史归档：`doc/common/iteration-history/minor/`

---

## 5. 核心原则

1. 先分析差异、冲突、疑问和范围，再编码。
2. 用户要求「先确认」时，不直接修改代码。
3. 业务对象、字段、状态、枚举变化必须同步统一字段字典。
4. 前端展示必须优先中文，避免暴露英文代码值。
5. 每个稳定版本必须更新 `VERSION.md`、提交并打 tag；版本号统一为 `v大阶段.能力模块.稳定迭代`。
6. 不删除历史版本，不覆盖历史归档，不重写无关文件。
7. 自动计划可以连续执行，但遇到范围扩大、业务冲突或不可验证问题必须暂停确认。
8. 每轮编码结束时必须执行 AGENTS.md 规定的完成自检清单。

---

## 6. 规则维护原则

新增规则优先合并到 `doc/rules/` 中职责最接近的文件，保持分类集中、简洁。

如确实出现新的规则类别，先在 `doc/rules/` 新增规则文件，再更新本索引。
