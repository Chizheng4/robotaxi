# AGENTS.md — AI Agent 行为规则

Robotaxi 自动驾驶运营模拟平台。前端单页 React 应用，后端 Python 静态服务。

---

## 1. 强制规则（所有编码任务必须遵守）

### 1.1 编码前：必须读取以下文件

任何涉及代码修改的任务，在动手前必须读完：

1. `doc/iteration-rules.md` — 迭代流程、版本归档规则
2. `doc/rules/03-field-dictionary-rules.md` — 字段字典规则
3. `doc/rules/04-frontend-ux-rules.md` — 前端布局与展示规则
4. `doc/rules/05-codex-execution-rules.md` — 执行、验证与禁止行为
5. `doc/common/field-dictionary.md` — 当前字段字典

不因「任务看起来和前端无关」而跳过前端规则，不因「只是改代码」而跳过字段字典。

### 1.2 字段字典：新增或修改任何对象、字段、状态、枚举时必须同步

每次编码结束后，检查 `doc/common/field-dictionary.md` 是否已包含本轮所有新增或修改的字段。未同步不得视为完成。

### 1.3 前端展示：必须中文、必须完整布局

表格列名、按钮文案、状态标签、筛选器标签一律使用中文，不得直接展示英文枚举值或内部字段名。

业务页面必须具备：状态筛选栏、搜索过滤区、全局操作栏（如需）、表格行操作列（如需）、右侧详情面板。

### 1.4 编译与验证：修改 `src/main.jsx` 后必须做的事

1. 重新编译 `src/main.bundle.js`
2. 检查 bundle 语法
3. 重启服务
4. 验证页面可正常加载

以上任何一步失败，必须先修复再继续。

---

## 2. 搜索与文件访问

优先通过关键词、文件名、代码结构搜索定位相关代码，避免不必要的全量遍历。

但上述 1.1 列出的强制必读文件不受此限制——它们是必须完整阅读的。

---

## 3. 完成自检清单

每轮编码结束、准备告知用户「完成」之前，逐项确认：

- [ ] **字段字典**：新增/修改的字段是否已同步到 `doc/common/field-dictionary.md`？
- [ ] **前端中文**：表格列名、按钮、状态标签是否全部中文？是否有英文代码值暴露？
- [ ] **前端布局**：是否具备状态筛选栏、全局操作栏（如需）、行操作列（如需）、详情面板？
- [ ] **Bundle**：`src/main.bundle.js` 是否已从 `src/main.jsx` 重新编译？
- [ ] **语法**：bundle 语法检查是否通过？
- [ ] **页面**：服务器重启后页面是否正常加载？核心操作路径是否可用？

任何一项未通过，不得声称完成。

---

## 4. 禁止行为

- 未读完强制规则文件就开始编码
- 修改代码但不同步字段字典
- 前端直接展示英文枚举值或内部字段名
- 修改或删除历史归档文件
- 覆盖用户的未提交修改
- 为当前页面便利而写死业务关系

---

## 5. 规则文件索引

详细规则见：

| 文件 | 用途 |
|------|------|
| `doc/iteration-rules.md` | 迭代流程、版本号、归档规则 |
| `doc/rules/01-iteration-workflow.md` | 迭代类型与标准执行流程 |
| `doc/rules/02-version-git-rules.md` | 版本号、提交、标签 |
| `doc/rules/03-field-dictionary-rules.md` | 字段字典维护与中文展示 |
| `doc/rules/04-frontend-ux-rules.md` | B 端页面布局与交互规则 |
| `doc/rules/05-codex-execution-rules.md` | 执行要求、验证与暂停条件 |
| `doc/rules/06-document-driven-iteration-rules.md` | 文档差异驱动迭代协议 |
| `doc/common/field-dictionary.md` | 统一字段字典正文 |
