# v023 自动运营模拟系统执行计划

## 1. 目的

本文档固化 `v023` 大版本迭代计划。

`v023` 的目标是构建 **自动运营模拟系统（Simulation System）**，让现有 Robotaxi 业务系统无需人工点击即可自动驱动运转，加速产生海量业务运营数据，为后续经营分析提供基础。

核心原则：

```text
模拟系统 = 自动驾驶员，不 = 业务重写者
模拟系统调用已有业务函数，不重新实现业务逻辑
模拟数据与前端 live 数据物理隔离，可同时运行互不影响
```

---

## 2. 阶段基线

```text
阶段基线版本：v022.6.1
阶段名称：自动运营模拟系统
当前执行模式：按自动计划连续执行，遇到冲突再暂停确认
当前计划起点：v023.1
当前计划终点：v023.7
设计文档目录：doc/08-simulation-system/
```

---

## 3. 设计文档索引

以下设计文档已完成方案设计，作为本轮编码依据：

| 文档 | 内容 | 状态 |
|---|---|---|
| `00-simulation-system-overview.md` | 总概：三大模块、数据沙箱架构、Monitor 行为 | ✅ |
| `01-simulation-runtime/00-simulation-overview.md` | Runtime 子模块总概 | ✅ |
| `01-simulation-runtime/01-simulation-time.md` | SimulationClock：时间段、时间窗口、场景计算 | ✅ |
| `01-simulation-runtime/02-simulation-run.md` | SimulationRun：主单据、生命周期、数据隔离、Monitor | ✅ |
| `01-simulation-runtime/03-simulation-event.md` | SimulationEvent：字段、event_type、event_result | ✅ |
| `01-simulation-runtime/04-simulation-policy.md` | SimulationPolicy：Tick配置、时间段、需求分布、自动化开关 | ✅ |
| `01-simulation-runtime/05-supply-trigger.md` | SupplyTrigger：供给侧触发机制 | ✅ |
| `01-simulation-runtime/06-demand-trigger.md` | DemandTrigger：需求侧触发机制 | ✅ |
| `01-simulation-runtime/07-simulation-loop.md` | SimulationLoop：Tick 主循环 14 步编排 | ✅ |
| `01-simulation-runtime/initialization-simulation.md` | SimulationPolicy 初始化规则 | ✅ |
| `02-workflow-engine/00-workflow-engine-overview.md` | 工作流引擎总览 | ✅ |
| `02-workflow-engine/01-service-order-workflow.md` | ServiceOrder 闭环流转规则 | ✅ |
| `02-workflow-engine/02-trip-workflow.md` | Trip 闭环流转规则 | ✅ |
| `02-workflow-engine/03-readiness-task-workflow.md` | ReadinessTask 闭环流转规则 | ✅ |
| `02-workflow-engine/04-deployment-task-workflow.md` | DeploymentTask 闭环流转规则 | ✅ |
| `02-workflow-engine/05-route-execution-workflow.md` | RouteExecution 闭环流转规则 | ✅ |
| `03-execution-engine/01-execution-engine.md` | ExecutionEngine：动作分发器架构 | ✅ |
| `03-execution-engine/02-service-extraction.md` | 15 个业务函数提取规范 | ✅ |

---

## 4. 统一执行假设

1. 模拟系统只驱动业务，不重写业务——所有业务逻辑（定价、匹配、路径规划、结算）通过调用已有函数完成。
2. 数据沙箱隔离——SimulationRun 维护独立数据上下文，与前端 live 数据物理隔离；两者可同时运行，互不影响。
3. `simulation_run_id = null` 为用户手动操作，不计入任何模拟结果；`simulation_run_id = "xxx"` 为模拟事件。
4. 策略配置和地图数据在 live 和沙箱之间共享读取（只读）。
5. Monitor 页面提供 SimulationRun 启停控制（启动/暂停/继续/停止），不提供业务对象操作按钮。
6. 业务函数提取（v023.1）是后续所有模拟子版本的前置条件，必须先完成。
7. 每个子版本只做必要 diff、必要验证和必要提交，避免重复分析和无关文件改动。
8. 字段字典在编码时同步更新（不提前补录），遵循 `doc/rules/03-field-dictionary-rules.md`。

---

## 5. 总体目标

### 5.1 业务函数提取（前置）

将 `main.jsx` 中 15 个嵌在 UI handler 中的业务函数提取为可独立调用的服务函数，供 UI 和 Simulation System 两条路径复用。

详见 `03-execution-engine/02-service-extraction.md`。

### 5.2 Simulation 核心域对象

实现 SimulationRun / SimulationPolicy / SimulationClock / SimulationEvent 类型定义、CRUD 和初始化。

详见 `01-simulation-runtime/01-04` 和 `initialization-simulation.md`。

### 5.3 Tick 主循环与触发机制

实现 SimulationLoop 主循环、SupplyTrigger、DemandTrigger，按 Tick 自动驱动供给侧和需求侧。

详见 `01-simulation-runtime/05-07`。

### 5.4 工作流引擎

实现 WorkflowEngine 规则查询——SimulationLoop 每 Tick 查询规则表，决定应触发哪个动作。

详见 `02-workflow-engine/00-05`。

### 5.5 动作分发器

实现 ExecutionEngine 动作分发器——维护动作→函数映射表，接收触发请求、调用业务函数、记录 SimulationEvent。

详见 `03-execution-engine/01-execution-engine.md`。

### 5.6 前端 Monitor 页面

新增 SimulationRun 页面：启停控制、当前时间场景卡片、SimulationEvent 事件流、result_summary。

详见 `01-simulation-runtime/02-simulation-run.md` § 7.1 和 § 17。

---

## 6. 子版本计划

### v023.1 业务函数提取

**目标**：把 `main.jsx` 中 15 个业务函数提取为可独立调用的服务函数，不改业务逻辑。

**优先级**：

| 优先级 | 函数 | 数量 |
|---|---|---|
| P0 | 价格预估 / 订单匹配 / 推进 Trip | 3 |
| P1 | 创建订单 / 呼叫 Robotaxi / 结算 / 支付 | 4 |
| P2 | ReadinessTask（4 个） | 4 |
| P3 | DeploymentTask + RouteExecution（4 个） | 4 |

**交付**：

1. 创建 `src/services/` 目录，每个业务单据一个服务文件。
2. 按 `02-service-extraction.md` 定义的标准入参/返回格式提取 P0 函数。
3. 修改 `main.jsx` 中对应 UI handler，改为调用提取后的服务函数。
4. 更新字段字典中涉及的状态和事件枚举（如有新增或修正）。
5. 确保 UI 点击行为与提取前完全一致（冒烟验证）。

**验收**：

1. P0 三个函数提取完成，UI 操作无回归。
2. P1-P3 函数可后续子版本逐步提取，不阻塞主链路。

---

### v023.2 SimulationPolicy 初始化与类型定义

**目标**：实现 SimulationPolicy 域对象和默认初始化。

**交付**：

1. 创建 `src/domain/simulationTypes.js`，定义：
   - `SimulationPolicy` 类型及 `policy_status` 枚举
   - `DemandProfile` 类型及 `distribution_type` 枚举
   - `time_period` / `period_type` 枚举
2. 创建 `src/data/simulationInitialization.js`，按 `initialization-simulation.md` 生成默认 SimulationPolicy。
3. 创建 `src/data/simulationValidation.js`，按初始化校验规则（19 条）校验配置完整性。
4. 更新字段字典。

**验收**：

1. 默认 SimulationPolicy（SIM-POLICY-001）可初始化成功。
2. 19 条校验规则全部通过。
3. 时间段覆盖 00:00-24:00，无缺口无重叠。

---

### v023.3 SimulationRun / SimulationClock / SimulationEvent

**目标**：实现模拟运行主单据、时间系统和事件记录。

**交付**：

1. 在 `simulationTypes.js` 中新增：
   - `SimulationRun` 类型及 `simulation_status` 枚举（READY / RUNNING / PAUSED / COMPLETED / STOPPED / FAILED）
   - `SimulationEvent` 类型及 `event_type` / `event_source` / `event_result` 枚举
2. 实现 `SimulationClock`：根据当前时间计算 `time_period`、`period_type`、`time_window`、供需场景。
3. 实现 `SimulationRun` 创建逻辑：引用 SimulationPolicy → 生成 `simulation_policy_snapshot` → 计算 `total_ticks`。
4. 实现 `SimulationRun` 状态流转：READY → RUNNING → PAUSED / COMPLETED / STOPPED / FAILED。
5. 实现 `SimulationEvent` 创建和查询。
6. 更新字段字典。

**验收**：

1. 可创建 SimulationRun 并正确生成 policy_snapshot。
2. SimulationClock 可正确识别当前时间对应的时间段和窗口。
3. SimulationEvent 可正确记录并关联 simulation_run_id。

---

### v023.4 SimulationLoop + SupplyTrigger + DemandTrigger

**目标**：实现 Tick 主循环和供给侧/需求侧触发。

**交付**：

1. 实现 `SimulationLoop`：按 `07-simulation-loop.md` 的 14 步执行顺序推进 Tick。
2. 实现 `SupplyTrigger`：每 Tick 根据 simulation_policy_snapshot 判断是否触发准入/投放/行驶推进。
3. 实现 `DemandTrigger`：每 Tick 根据 demand_profile 的 Poisson 分布生成订单数量，调用 DemandSimulationStrategy。
4. Tick 推进规则：`current_global_tick += 1`，达到 `total_ticks` 后 SimulationRun → COMPLETED。
5. 每个 Tick 记录 SIMULATION_TICK_STARTED / SIMULATION_TICK_COMPLETED。
6. 更新字段字典。

**验收**：

1. SimulationLoop 可单步推进 Tick（方便调试）。
2. SupplyTrigger 在 Worker 工作时间内正确触发准入事件。
3. DemandTrigger 按 Poisson 分布生成正确数量的订单。
4. 达到 total_ticks 后 SimulationRun 自动进入 COMPLETED。

---

### v023.5 WorkflowEngine + ExecutionEngine + 全链路串联

**目标**：实现工作流规则引擎和动作分发器，完成完整 Tick 闭环。

**交付**：

1. 实现 `WorkflowEngine`：读取各业务单据流转规则表，SimulationLoop 每 Tick 查询匹配规则。
2. 实现 `ExecutionEngine`：动作→函数映射表，接收触发请求、调用业务函数、记录 SimulationEvent。
3. 将 SimulationLoop、WorkflowEngine、ExecutionEngine 串联为完整闭环：
   ```text
   SimulationLoop 推进 Tick
   → 查询 WorkflowEngine 规则
   → ExecutionEngine 分发调用业务函数
   → 业务函数执行并修改沙箱数据
   → 记录 SimulationEvent
   → 进入下一 Tick
   ```
4. 首次跑通 ServiceOrder 主链路：需求生成 → 定价 → 呼叫 → 匹配 → Trip 推进 → 结算 → 支付 → 完成。
5. 实现 `result_summary` 生成。
6. 更新字段字典。

**验收**：

1. 一个 1 天 SimulationRun 可完整跑完，ServiceOrder 从创建到 COMPLETED。
2. 所有模拟操作记录 SimulationEvent 且带正确的 simulation_run_id。
3. result_summary 统计数据正确。

---

### v023.6 前端 Monitor 页面

**目标**：新增 SimulationRun Monitor 页面，支持启停控制和实时观测。

**交付**：

1. 新增 `SimulationRun 管理` 菜单项（位置待定，建议放在一级菜单末尾或独立分组）。
2. Monitor 页面包含：
   - SimulationRun 列表（名称、状态、进度）。
   - 创建 SimulationRun 入口（选择 SimulationPolicy、设置天数）。
   - 启停控制按钮：启动 / 暂停 / 继续 / 停止。
   - 当前时间场景卡片（第几天、当前时间、Tick、时间段、PEAK/NORMAL）。
   - 供给侧场景卡片（Worker 工作时间、Robotaxi 运营时间）。
   - 需求侧场景卡片（当前需求场景、当前 Tick 订单数量）。
   - Tick 事件摘要。
3. SimulationEvent 列表：支持按 event_type、event_result 筛选，按时间排序。
4. result_summary 展示（SimulationRun 完成后）。
5. **Monitor 页面不提供业务操作按钮**（定价/匹配/行驶等）。
6. 遵循 `doc/rules/04-frontend-ux-rules.md`。
7. 更新字段字典。

**验收**：

1. 可创建 SimulationRun 并从 Monitor 页面启动。
2. 运行中可看到实时 Tick 推进和场景信息。
3. 可暂停/继续/停止。
4. Monitor 页面无业务操作按钮。
5. 用户仍可在主界面正常手动操作 live 数据，不影响模拟。

---

### v023.7 校验、版本记录与 Major 归档

**目标**：完成 v023 大版本收口。

**交付**：

1. 执行提交前检查（代码校验、字段字典一致性）。
2. 浏览器核心路径验证：
   - 创建 SimulationPolicy。
   - 创建 SimulationRun 并启动。
   - 观察 Tick 推进和 ServiceOrder 闭环。
   - 暂停/继续/停止。
   - 前端 UI 手动操作与模拟同时运行不冲突。
3. 更新 `VERSION.md`。
4. 将本计划从 `doc/common/current-iteration/major/` 归档到 `doc/common/iteration-history/major/`。
5. 将 `major-current-iteration.md` 恢复为暂无进行中的大版本计划。
6. 提交并打 tag。

**验收**：

1. 工作区干净。
2. tag 到 `v023.7`。
3. 当前 major 目录不遗留已完成计划。

---

## 7. 暂不处理范围

1. 不实现多 SimulationRun 并发。
2. 不实现异步事件队列。
3. 不实现复杂异常概率模型（`enable_exception_probability = false`）。
4. 不实现需求预测模型。
5. 不实现经营指标 Metric 系统。
6. 不重写任何已有业务逻辑（定价、匹配、路径规划、结算引擎不变）。
7. 不改动 Robotaxi / Customer / Worker 的内部状态管理。
8. 不新增 DemandSimulationStrategy 之外的策略类型。

---

## 8. 风险与暂停条件

执行中如出现以下情况，需暂停确认：

1. 业务函数提取导致 UI 回归且无法快速修复。
2. SimulationPolicy 配置与实际业务引擎参数出现语义冲突。
3. Tick 推进频率与 React 渲染周期产生性能问题。
4. 沙箱数据上下文路由与现有 React state 管理方式不兼容。
5. 工作流规则表与实际代码状态机出现未预期的状态缺口。
6. Monitor 页面布局与现有前端规则冲突且无法通过兼容方式处理。
7. 浏览器验证发现旧本地缓存数据导致模拟页面不可用。
