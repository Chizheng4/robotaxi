# v027 连续多日运营模拟时间轴自动执行计划

## 1. 版本目标

建立可连续跨运行、跨天推进的模拟时间轴，使每次 SimulationRun 不再从 Day 1 重新开始；计划触发周期结束后停止产生新业务，但继续自动排空已经触发的工作流；所有模拟生成业务数据记录独立于真实审计时间的模拟时间与来源。

## 2. 核心原则

1. 绝对模拟秒是唯一计算源，`Day N HH:MM:SS` 是统一展示结果。
2. 同一时间轴内 SimulationRun 串行创建，后一运行从前一运行的实际模拟结束时间继续。
3. 计划 Tick 结束不等于业务完成；必须经过工作流排空阶段。
4. 排空期间不再触发新的供给侧和需求侧单据，但继续推进既有工作流和执行引擎。
5. 真实审计时间与模拟业务时间分开保存，不互相覆盖。
6. 模拟结果必须可复现、可追踪、可用于后续经营指标和预测分析。

## 3. 目标模型

### 3.1 连续时间轴

- `simulation_timeline_id`：连续模拟时间轴编号。
- `previous_simulation_run_id`：上一运行编号。
- `current_simulation_seconds`：时间轴绝对模拟秒。
- `simulation_start_at` / `planned_simulation_end_at` / `simulation_end_at`：统一 `Day N HH:MM:SS`。
- `current_time`：统一展示为 `Day N HH:MM:SS`。
- `current_clock_time`：日内 `HH:MM:SS`，供时段规则计算。
- `current_run_tick`：本次运行实际 Tick，包含排空 Tick。
- `current_global_tick`：时间轴连续 Tick。

### 3.2 运行阶段

```text
READY → RUNNING → DRAINING → COMPLETED
```

- `RUNNING`：推进时钟、产生新触发、查询工作流并执行。
- `DRAINING`：停止新触发，只查询和执行既有工作流。
- `COMPLETED`：不存在待执行工作流，排空完成。
- 排空超过上限时进入 `FAILED`，记录未完成原因，不允许假完成。

### 3.3 模拟数据溯源

模拟创建或更新的业务对象统一使用：

- `record_source`：记录来源，模拟数据为 `SIMULATION`；
- `simulation_run_id`：来源运行；
- `simulation_created_at`：模拟创建时间；
- `simulation_updated_at`：最近模拟更新时间；
- `simulation_completed_at`：适用对象的模拟完成时间；
- `simulation_global_tick`：发生时的连续 Tick。

原 `created_at`、`started_at`、`completed_at` 等字段继续表示真实审计时间。

## 4. 自动执行阶段

### v027.1 连续模拟时钟与运行时间轴

状态：已完成。

- 使用绝对模拟秒推进时间，输出 `Day N HH:MM:SS`。
- 修正跨天、秒级和 Tick 事件时间偏移。
- 新运行继承前一运行实际结束时间和连续全局 Tick。
- 禁止同一时间轴存在多个未结束运行。
- 补齐字段字典、对象文档和代码级时间测试。

完成记录：

- 新增 `src/domain/simulationTime.js` 作为绝对模拟秒与显示格式的公共实现。
- SimulationRun 支持时间轴、上一运行、计划/实际结束游标和连续全局 Tick。
- SimulationEvent 改用动作发生时刻，修复推进后再记时造成的 Tick 时间偏移。
- 相同策略使用固定随机种子，不再以真实当前时间破坏复现性。
- 字段字典正文采用用户已迁移的 `doc/rules/field-dictionary.md`，同步修正规则入口。
- `node scripts/verify-simulation-continuity.mjs` 验证通过。

下一断点：在 `simulationLoop` 和 `simulationEngine.completeTick` 中实现 `DRAINING`，停止新触发但继续查询并执行工作流。

### v027.2 工作流排空阶段

状态：已完成。

- 新增 `DRAINING` 状态和中文展示。
- 计划 Tick 到期后关闭 SupplyTrigger / DemandTrigger。
- 继续 WorkflowEngine / ExecutionEngine，直到无待执行动作。
- 增加最大排空 Tick、完成摘要和失败保护。
- 验证最后 Tick 产生的业务对象能够完整闭环。

完成记录：

- SimulationLoop 在 `DRAINING` 阶段跳过 SupplyTrigger、DemandTrigger 和新建动作，仅查询既有工作流。
- 计划 Tick 到期进入 `DRAINING`，工作流为空后进入 `COMPLETED`。
- 超过 `max_drain_ticks` 未收敛时进入 `FAILED`，记录失败事件和原因。
- 新增排空开始、完成、失败事件及中文状态显示，前端将“排空中”归入进行中语义色。
- 连续时间轴验证脚本覆盖无新触发、正常排空和排空超限失败。

下一断点：将 Tick 时间上下文贯穿所有模拟 handler，为需求、供给及派生业务对象写入统一模拟审计字段。

### v027.3 业务对象模拟时间溯源

状态：已完成。

- 为需求、供给及后续工作流对象增加统一模拟审计字段。
- 保留真实时间字段，人工操作不伪造模拟时间。
- 将运行编号、模拟时间和全局 Tick 贯穿执行上下文。
- 同步两个字段字典与前端中文详情展示。

完成记录：

- 执行上下文贯穿 `simulationRunId`、发生时刻和连续全局 Tick。
- DemandSimulationRun、ServiceOrder、定价、匹配、Trip、准入任务、投放任务、RouteExecution 和 Robotaxi 写入统一模拟审计字段。
- 真实审计时间继续保留，模拟时间不覆盖 `created_at`、`matched_at`、`completed_at` 等字段。
- 定价估算与路径编号移除真实当前时间和全局随机数依赖，改为模拟上下文确定性结果。
- 新增模拟业务数据时间与来源审计文档，两个字段字典同步完成。
- 验证脚本已检查需求单据和供给任务的模拟创建时间、来源运行和全局 Tick。

下一断点：执行双运行跨天、最后 Tick 业务排空、模拟审计字段、页面交互与持久化端到端验证，然后完成大版本归档。

### v027.4 多日连续模拟与大版本归档

状态：已完成。

- 验证至少两个连续 SimulationRun 跨天衔接。
- 验证自然结束后排空、无新触发、最终业务闭环。
- 验证模拟时间溯源和随机种子可复现性。
- 重建前端 bundle，执行页面核心路径和双桌面尺寸检查。
- 更新 `VERSION.md`，归档本计划，提交并标记 `v027.4`，完成 v027 大版本。

完成记录：

- 浏览器连续创建并运行三个 SimulationRun，时间从 `Day 1 00:00:00` 连续推进到 `Day 3 15:00:00`，后一运行均从前一运行实际结束时间和全局 Tick 继续。
- 第三次运行刷新后从全局 Tick 227 自动续跑至 Tick 378；计划触发窗口结束后经过 9 个排空 Tick，既有工作流全部完成后自然进入“已完成”。
- 运行快照与 SimulationEvent 迁移至 IndexedDB 分库存储，解决长时间运行超过 localStorage 容量后无法持久化的问题；页面刷新后恢复业务数据、编号序列和活动运行。
- 模拟事件区保留完整历史存储并采用最近 300 条受控渲染窗口，避免多日模拟产生上万条 DOM 记录拖慢页面。
- SimulationRun 详情补齐时间轴、计划/实际结束、运行 Tick、全局 Tick 和排空进度，继续通过统一字段字典显示中文字段与状态。
- 1440 x 900 与 1280 x 720 浏览器验收无页面级横向溢出、空白或遮挡，模拟列表、详情和事件区保持完整可用。
- `node scripts/verify-simulation-continuity.mjs`、前端 bundle 语法检查和提交前检查全部通过。

下一断点：无。v027 大版本完成并归档。

## 5. 验收标准

- [x] 第一次运行显示 `Day 1 HH:MM:SS`，第二次运行从第一次实际结束时间继续。
- [x] 跨午夜推进不会丢失剩余秒数，Day 和日内时间正确。
- [x] 事件记录使用动作实际发生时刻，不提前或滞后一个 Tick。
- [x] 计划结束后不再创建新的需求/供给单据。
- [x] 最后 Tick 已产生的对象继续执行到业务终态。
- [x] 排空无法收敛时明确失败并可诊断。
- [x] 模拟生成对象同时具有真实审计时间和模拟时间来源。
- [x] 相同策略、时间轴起点和随机种子可复现。
- [x] 字段和状态全部通过统一字段字典中文展示。
- [x] 代码检查、页面运行和核心路径验证通过。

## 6. 中断与续作协议

每完成一个阶段立即更新本文件：

1. 将状态改为“已完成”；
2. 记录实现文件和验证命令；
3. 写明下一阶段的第一个动作；
4. 未完成阶段保持“进行中”或“待执行”；
5. 不在阶段未验证时提前提交稳定版本。

如 Codex 使用量中断，下次直接读取本文件、`git status` 和最后一个完成阶段，从第一个未完成检查项继续。
