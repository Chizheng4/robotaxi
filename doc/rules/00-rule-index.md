# 规则索引

本文档说明 Robotaxi 项目的规则文件结构和读取方式。

## 1. 规则入口

通用行为规则入口：根目录 `AGENTS.md`

迭代规则入口：`doc/iteration-rules.md`

## 2. 规则文件

| 文件 | 规则范围 |
|------|------|
| `01-iteration-workflow.md` | 迭代类型、执行顺序、当前迭代和历史归档 |
| `02-version-git-rules.md` | 版本号、Git 提交、tag、版本记录 |
| `03-field-dictionary-rules.md` | 字段、枚举、状态、中文显示、字典维护 |
| `04-frontend-ux-rules.md` | B 端运营平台页面布局、字体、密度、交互 |
| `05-codex-execution-rules.md` | 执行方式、验证要求、禁止行为、暂停条件 |
| `06-document-driven-iteration-rules.md` | 用户更新文档后的差异分析、确认和自动执行协议 |

## 3. 读取规则

所有编码任务必须完整读取以下文件（不分任务类型）：

1. `AGENTS.md`
2. `doc/iteration-rules.md`
3. `doc/rules/03-field-dictionary-rules.md`
4. `doc/rules/04-frontend-ux-rules.md`
5. `doc/rules/05-codex-execution-rules.md`
6. `doc/common/field-dictionary.md`

文档差异驱动迭代（用户更新文档后要求分析）额外读取：

- `doc/rules/06-document-driven-iteration-rules.md`

提交版本时额外读取：

- `doc/rules/02-version-git-rules.md`

## 4. 规则更新

规则文件只记录长期稳定的工程规则。

单次方案、临时计划、待确认内容不写入规则文件，应放入 `doc/common/current-iteration/` 或对应业务文档。
