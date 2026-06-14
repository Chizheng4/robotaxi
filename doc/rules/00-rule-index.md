# 规则索引

本文档用于说明 Robotaxi 项目的规则文件结构和读取方式。

## 1. 规则入口

唯一入口：

`doc/iteration-rules.md`

## 2. 规则文件

|文件|规则范围|
|---|---|
|`01-iteration-workflow.md`|迭代类型、执行顺序、当前迭代和历史归档|
|`02-version-git-rules.md`|版本号、Git 提交、tag、版本记录|
|`03-field-dictionary-rules.md`|字段、枚举、状态、中文显示、字典维护|
|`04-frontend-ux-rules.md`|B 端运营平台页面布局、字体、密度、交互|
|`05-codex-execution-rules.md`|Codex 工作方式、验证要求、禁止行为|
|`06-document-driven-iteration-rules.md`|用户更新文档后的差异分析、确认和自动执行协议|

## 3. 读取规则

每轮迭代先读入口文件，再按任务类型读取对应规则。

文档分析类任务至少读取：

1. `doc/iteration-rules.md`
2. `doc/rules/01-iteration-workflow.md`
3. `doc/rules/03-field-dictionary-rules.md`
4. `doc/rules/06-document-driven-iteration-rules.md`
5. 用户指定文档或 Git diff 涉及的文档

编码类任务至少读取：

1. `doc/iteration-rules.md`
2. `doc/rules/01-iteration-workflow.md`
3. `doc/rules/03-field-dictionary-rules.md`
4. `doc/rules/05-codex-execution-rules.md`
5. `doc/rules/06-document-driven-iteration-rules.md`
6. 相关业务文档和代码

前端类任务额外读取：

1. `doc/rules/04-frontend-ux-rules.md`

提交版本类任务额外读取：

1. `doc/rules/02-version-git-rules.md`

文档差异驱动迭代额外读取：

1. `doc/rules/06-document-driven-iteration-rules.md`

## 4. 规则更新

规则文件只记录长期稳定的工程规则。

单次方案、临时计划、待确认内容不写入规则文件，应放入 `doc/common/current-iteration/` 或对应业务文档。
