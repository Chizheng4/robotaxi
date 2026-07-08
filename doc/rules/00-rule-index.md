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
| `04-frontend-ux-rules.md` | 前端结构、视觉令牌、组件状态、交互与模型接入标准 |
| `05-codex-execution-rules.md` | 执行方式、验证要求、禁止行为、暂停条件 |
| `06-document-driven-iteration-rules.md` | 用户更新文档后的差异分析、确认和自动执行协议 |
| `07-simulation-runtime-architecture-rules.md` | 模拟运行架构、性能、业务服务边界和扩展接入规则 |
| `08-business-document-service-rules.md` | 业务单据独立服务闭环、关联驱动、状态时间线和成本收入边界 |

## 3. 读取规则

根目录 `AGENTS.md` 是唯一任务分流入口。本索引不建立独立的强制读取清单；编码前应先由 `AGENTS.md` 判断任务类型，再读取对应规则。

版本迭代按 `doc/iteration-rules.md` 执行。只分析、文档修改、小型缺陷及其他任务仍以 `AGENTS.md` 的分类为准，不得因本索引重复扩大读取范围。

文档差异驱动迭代（用户更新文档后要求分析）额外读取：

- `doc/rules/06-document-driven-iteration-rules.md`

提交版本时额外读取：

- `doc/rules/02-version-git-rules.md`

## 4. 规则更新

规则文件只记录长期稳定的工程规则。

单次方案、临时计划、待确认内容不写入规则文件，应放入 `doc/common/current-iteration/` 或对应业务文档。
