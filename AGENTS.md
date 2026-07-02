# AGENTS.md — AI Agent 行为规则

Robotaxi 自动驾驶运营模拟平台。前端单页 React 应用，后端 Python 静态服务。

---

## 1. 强制规则（按任务类型触发）

### 1.1 编码前：先判断任务类型

涉及代码修改时，先按任务类型读取必要规则，避免不必要的全量读取。

#### A. 版本迭代 / 跨模块闭环修改

当任务涉及版本归档、多个业务模块、闭环流程、提交标签时，必须读取：

1. `doc/iteration-rules.md` — 迭代流程、版本归档规则
2. `doc/rules/03-field-dictionary-rules.md` — 字段字典规则
3. `doc/rules/04-frontend-ux-rules.md` — 前端体验、设计系统与标准化接入规则
4. `doc/rules/05-codex-execution-rules.md` — 执行、验证与禁止行为
5. `doc/rules/field-dictionary.md` — 字段字典（文档）
6. `src/domain/fieldDictionary.js` — 字段字典（前端代码，含 fieldDictionary 和 valueDictionary）
7. 如涉及模拟运行、时间作业、自动工作流、业务单据生命周期或高速执行，还必须读取 `doc/rules/07-simulation-runtime-architecture-rules.md`

#### B. 业务对象 / 字段 / 状态 / 枚举修改

当任务新增或修改业务对象、字段、状态、枚举时，必须读取：

1. `doc/rules/03-field-dictionary-rules.md`
2. `doc/rules/field-dictionary.md`
3. `src/domain/fieldDictionary.js`

#### C. 前端页面 / 交互 / 展示修改

当任务修改前端页面、表格、详情、筛选、按钮、布局、中文展示时，必须读取：

1. `doc/rules/04-frontend-ux-rules.md`
2. `src/domain/fieldDictionary.js`

如同时涉及字段、状态或枚举，按 B 类补读字段字典文档。

#### D. 小 bug / 样式微调 / 启动脚本 / 文档修改

只读取与任务直接相关的代码或文档；不强制读取全部规则文件。

#### E. 只分析、不编码

只读取用户要求的文件、差异和必要上下文；不触发编码前强制读取。

### 1.2 字段字典：两个文件必须同时更新

新增或修改任何业务对象、字段、状态、枚举时，以下两个文件必须同步更新，缺一不可：

- `doc/rules/field-dictionary.md` — 文档版字段字典
- `src/domain/fieldDictionary.js` — 前端代码版字段字典。其中：
  - `fieldDictionary` 对象 → 用于表格列头、详情字段名的中文显示
  - `valueDictionary` 对象 → 用于状态值、枚举值的中文显示

两个文件都更新后才算完成。

### 1.3 前端展示：必须中文、必须完整布局

表格列名、按钮文案、状态标签、筛选器标签一律使用中文，不得直接展示英文枚举值或内部字段名。

业务页面必须具备：状态筛选栏、搜索过滤区、全局操作栏（如需）、表格行操作列（如需）、右侧详情面板。

### 1.4 编译与验证：修改 `src/main.jsx` 后必须做的事

1. 重新编译 `src/main.bundle.js`
2. 检查 bundle 语法
3. 重启服务
4. 验证页面可正常加载
5. 若修改 bootstrap、动态 import、运行态初始化、`loadRuntimeSnapshot`、`saveRuntimeSnapshot`、启动脚本或页面入口，必须运行真实浏览器加载检查：`node scripts/verify-browser-load.mjs`，或通过 `./start-robotaxi.command` 触发同等检查

以上任何一步失败，必须先修复再继续。

### 1.5 业务服务边界：禁止页面层拼业务闭环

新增或修改任务单、订单、行驶记录、策略执行、调度结果等业务闭环时，必须先确认底层服务边界：

- 业务单据生命周期是底层事实来源，页面按钮、策略触发、真实时间自动化和模拟运行只能调用同一业务服务；
- 运营行驶记录是 Robotaxi 执行运营任务的通用行驶服务，不属于运营投放任务私有逻辑；
- 新增任务单如果需要 Robotaxi 行驶，必须通过运营行驶记录服务化能力创建和推进，不得在页面层手写 routeExecution 对象或复用只适用于某一任务的私有推进函数；
- 模拟运行是上层扩展。新增业务对象默认不进入模拟运行主路径，除非已声明模拟接入合同并通过验证；
- 其他模型或人工开发者不得为了“页面能点通”绕过服务层。

---

## 2. 搜索与文件访问

优先通过关键词、文件名、代码结构搜索定位相关代码，避免不必要的全量遍历。

只有 1.1 中当前任务类型命中的规则文件必须完整阅读；未命中的规则文件不强制读取。

---

## 3. 完成自检清单

每轮编码结束、准备告知用户「完成」之前，按实际变更范围确认：

- [ ] **字段字典**：若涉及业务字段、状态、枚举，`doc/rules/field-dictionary.md` 和 `src/domain/fieldDictionary.js` 是否都已更新？
- [ ] **前端中文**：若涉及前端展示，表格列名、按钮、状态标签是否全部中文？
- [ ] **前端布局**：若涉及业务页面，是否保持状态筛选栏、搜索过滤区、操作列、详情面板等必要结构？
- [ ] **设计系统**：若涉及前端，是否复用 `04-frontend-ux-rules.md` 的令牌、页面模板、组件状态和验收标准，避免一次性样式？
- [ ] **Bundle**：若修改 `src/main.jsx`，`src/main.bundle.js` 是否已重新编译？
- [ ] **语法**：修改过的 JS 文件是否通过语法检查？
- [ ] **页面**：若修改前端页面或入口，页面是否可正常加载，核心路径是否可用？

命中的检查项未通过，不得声称完成。

---

## 4. 禁止行为

- 未按任务类型读取必要规则就开始编码
- 修改代码但不同步字段字典
- 前端直接展示英文枚举值或内部字段名
- 修改或删除历史归档文件
- 覆盖用户的未提交修改
- 为当前页面便利而写死业务关系
- 绕过设计系统创建仅服务单页的一次性视觉规则
- 在 `src/main.jsx` 或页面组件中拼装业务闭环对象、状态流转或 routeExecution 创建逻辑
- 将未声明模拟接入合同的新业务对象加入模拟运行扫描

---

## 5. 规则文件索引

详细规则见：

| 文件                                                | 用途            |
| ------------------------------------------------- | ------------- |
| `doc/iteration-rules.md`                          | 迭代流程、版本号、归档规则 |
| `doc/rules/01-iteration-workflow.md`              | 迭代类型与标准执行流程   |
| `doc/rules/02-version-git-rules.md`               | 版本号、提交、标签     |
| `doc/rules/03-field-dictionary-rules.md`          | 字段字典维护与中文展示   |
| `doc/rules/04-frontend-ux-rules.md`               | 前端体验、设计系统与标准化规则 |
| `doc/rules/05-codex-execution-rules.md`           | 执行要求、验证与暂停条件  |
| `doc/rules/06-document-driven-iteration-rules.md` | 文档差异驱动迭代协议    |
| `doc/rules/07-simulation-runtime-architecture-rules.md` | 模拟运行架构、性能和扩展接入规则 |
| `doc/rules/field-dictionary.md`                   | 统一字段字典正文      |
