# Robotaxi 迭代规则入口

本文档是 Robotaxi 项目的迭代规则唯一入口。

规则细则集中维护在 `doc/rules/` 目录，不再在根目录或业务对象目录重复维护同类规则。

## 1. 规则文件索引

|文件|用途|
|---|---|
|`doc/rules/00-rule-index.md`|规则目录与使用顺序|
|`doc/rules/01-iteration-workflow.md`|迭代类型、分析、确认、执行、归档流程|
|`doc/rules/02-version-git-rules.md`|版本号、提交、标签、版本记录规则|
|`doc/rules/03-field-dictionary-rules.md`|字段字典、状态枚举、中文展示规则|
|`doc/rules/04-frontend-ux-rules.md`|B 端运营平台前端体验与页面布局规则|
|`doc/rules/05-codex-execution-rules.md`|Codex 执行、暂停、验证和禁止行为规则|
|`doc/rules/06-document-driven-iteration-rules.md`|文档差异驱动的分析、确认和自动执行协议|

## 2. 默认读取顺序

Codex 每轮迭代默认先读取：

1. `doc/iteration-rules.md`
2. `doc/rules/00-rule-index.md`
3. 与本轮任务相关的规则文件
4. `doc/common/field-dictionary.md`
5. 当前迭代文件或用户指定的业务文档

## 3. 当前迭代文件

大版本当前迭代：

`doc/common/current-iteration/major/`

小版本当前迭代：

`doc/common/current-iteration/minor/minor-current-iteration.md`

## 4. 历史归档目录

大版本历史归档：

`doc/common/iteration-history/major/`

小版本历史归档：

`doc/common/iteration-history/minor/`

## 5. 核心原则

1. 先分析差异、冲突、疑问和范围，再编码。
2. 用户要求“先确认”时，不直接修改代码。
3. 业务对象、字段、状态、枚举变化必须同步统一字段字典。
4. 前端展示必须优先中文，避免暴露英文代码值。
5. 每个稳定版本必须更新 `VERSION.md`、提交并打 tag。
6. 不删除历史版本，不覆盖历史归档，不重写无关文件。
7. 自动计划可以连续执行，但遇到范围扩大、业务冲突或不可验证问题必须暂停确认。
8. 用户更新文档后，可按文档差异驱动协议进入分析、确认、执行闭环，避免重复读取无关文件。

## 6. 规则维护原则

新增规则优先放入 `doc/rules/` 中对应文件。

如确实出现新的规则类别，先在 `doc/rules/00-rule-index.md` 增加入口，再新增规则文件。

根目录 `PROJECT_ITERATION_RULES.md` 仅保留迁移说明，不再作为规则源。
