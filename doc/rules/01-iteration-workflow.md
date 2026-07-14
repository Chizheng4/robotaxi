# 迭代流程规则

## 1. 迭代类型

### 1.1 Major

Major 用于整体方案变更，例如：

- 文件结构调整
- 多文档重构
- 核心对象或核心链路变化
- 系统边界变化
- 需要连续自动执行计划的阶段性目标

当前状态指针：`doc/common/current-iteration/major/major-current-iteration.md`

Major 自动执行计划文件：`doc/common/current-iteration/major/v{版本号}-auto-execution-plan.md`

历史归档目录：`doc/common/iteration-history/major/`

### 1.2 Minor

Minor 用于局部方案或局部功能修改，例如：

- 单个页面体验优化
- 单个对象字段调整
- 单个状态机修正
- 小范围文档补充

当前状态指针：`doc/common/current-iteration/minor/minor-current-iteration.md`

历史归档目录：`doc/common/iteration-history/minor/`

---

## 2. 标准流程

每轮迭代按以下顺序执行：

1. 查看 Git 当前版本和工作区状态。
2. 按 AGENTS.md 的任务类型读取必要规则；只有字段、状态或枚举变化才读取并维护完整字段字典。
3. 分析差异、冲突、疑问、风险和建议范围。
4. 与用户确认后再修改文档或代码；用户明确授权直接执行时按已确认方案连续推进。
5. **必须检查本轮是否涉及新增或修改业务对象、字段、状态、枚举——如有，必须同步更新 `doc/rules/field-dictionary.md`。**
6. 编码只覆盖已确认范围。
7. 开发中执行范围校验，完成版本记录和归档后执行一次完整提交前检查及必要的前端核心路径验证。
8. 完成后更新版本记录，并执行 `node scripts/sync-version-metadata.mjs` 同步网站版本元数据。
9. 大版本或小版本迭代完成时，必须执行对应归档操作。
10. 归档完成后再提交并打 tag。
11. **执行 AGENTS.md 规定的完成自检清单，逐项确认。**

---

## 3. 迭代归档规则

### 3.1 必须归档

无论 Major 还是 Minor，只要本轮迭代被标记为完成并形成稳定版本，都必须完成对应归档。

归档是版本完成条件，不是可选整理动作。

### 3.2 Major 归档

Major 完成时必须：

1. 将当前大版本计划文件从 `doc/common/current-iteration/major/` 移入 `doc/common/iteration-history/major/`；
2. 保留或更新 `doc/common/current-iteration/major/major-current-iteration.md`；
3. 在 `VERSION.md` 中记录本次归档；
4. 再执行提交和 tag。

Major 归档后，`doc/common/current-iteration/major/` 只允许保留：

- `major-current-iteration.md`；
- 明确标记为当前进行中的大版本计划；
- 明确标记为后续待执行且尚未获得正式版本编号的方案。

已经写入历史归档目录的完成版本计划不得继续留在 current 目录。

### 3.3 Minor 归档

Minor 完成时必须：

1. 将当前小版本迭代内容归档到 `doc/common/iteration-history/minor/` 下的新文件；
2. 清空或重置 `doc/common/current-iteration/minor/minor-current-iteration.md`；
3. 在 `VERSION.md` 中记录本次归档；
4. 再执行提交和 tag。

### 3.4 禁止事项

归档时不得：

- 覆盖已有历史归档文件；
- 删除历史归档；
- 把已完成计划继续留在 current 目录中作为当前计划；
- 在提交和 tag 之后才补做归档。

---

## 4. 文档职责

- 正式方案文档：业务定义、对象边界、字段、状态和流程的唯一真值。
- 自动执行计划：当前版本任务、顺序、状态、风险和验收标准。
- 当前状态指针：只保存版本号、计划链接、当前阶段和执行位置。
- `VERSION.md` 与历史归档：保存已完成版本，不回写当前状态指针。

用户可直接沟通需求或修改正式方案，不需要手工维护状态指针。禁止在状态指针重复粘贴方案、任务明细或历史版本内容。

## 5. 自动执行计划

用户确认自动执行后，可以按计划连续推进。

自动执行仍必须遵守：

- 每个子版本范围清晰；
- 每个子版本完成后验证；
- 每个稳定子版本更新 `VERSION.md`、提交并打 tag；
- 最后一个子版本必须完成对应 Major 或 Minor 的归档收口；
- 遇到业务冲突、范围扩大、用户方案变更或无法验证时暂停确认。

---

## 6. 范围控制

当前阶段只实现用户确认过的业务对象、初始化数据、校验规则和前端展示。

不得因为某个页面需要方便展示而提前实现未确认对象或未来系统。

不得把 minor 变更扩大为 major 变更。

不得重写无关文件。

---

## 7. 历史保护

历史版本和历史归档只用于对比、回退和追溯。

禁止覆盖历史版本、删除历史记录或修改已归档计划，除非用户明确要求修正历史文档错误。
