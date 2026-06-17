# v024 自动执行计划：打通 Simulation 自动运营全链路

## 目标

当前 Simulation 系统 Tick 可以推进时间，但不会自动生成业务数据。ExecutionEngine 的 15 个 action handler 全部为 null，WorkflowEngine 未被 Tick 循环调用。

本版本打通 Tick → 触发器 → WorkflowEngine → ExecutionEngine → 业务函数 的完整链路，实现：
- 每 Tick 自动生成需求订单 → 自动定价 → 自动匹配 → 自动履约 → 自动支付
- 供给侧自动推进准入检查、投放、行驶执行
- 整个过程快速自动运行，直到用户暂停或停止

## 架构

```
SimulationLoop.executeTick
  ├── computeTimeContext (已有)
  ├── runSupplyTrigger (已有，仅判断)
  ├── runDemandTrigger (已有，仅判断)
  ├── ★ queryAllWorkflowRules (接入)
  ├── ★ executeActions via ExecutionEngine (接入)
  │     └── simulationHandlers (新建)
  └── completeTick (已有)
```

新增 `src/services/simulationHandlers.js`：从 main.jsx 提取纯数据处理函数，供 ExecutionEngine 注册。

---

## v024.1：注册 P0 业务处理器 + 接入 Tick 循环

**范围**：
- 新建 `simulationHandlers.js`：提取创建订单、定价、匹配、履约推进、结算、支付 6 个核心处理函数
- 每个函数签名为 `({ objectId, data, context }) => result`，返回纯数据结果，由调用方写回 state
- 在 App bootstrap 中注册这些 handler 到 ExecutionEngine
- 修改 `simulationLoop.executeTick`：增加步骤 4-6，调用 WorkflowEngine + ExecutionEngine
- 修改 `simulationActions.executeTickForRun`：传入完整业务数据上下文

**涉及文件**：`simulationHandlers.js`(新)、`simulationLoop.js`、`simulationActions.js`、`main.jsx`

**验收**：启动模拟后，Tick 事件日志显示「动作 xxx 已执行」或「未注册处理器」逐步变为「已执行」。

---

## v024.2：需求触发 → 创建订单 → 自动定价

**范围**：
- `simulationLoop` 在需求触发后，将 `demandResult.order_count` 实际用于调用 `SERVICE_ORDER_CREATE`
- `SERVICE_ORDER_CREATE` handler 调用需求模拟策略生成订单上下文，写入 serviceOrders
- 新订单状态为 CREATED，被 WorkflowEngine 匹配到 PRICING_EXECUTE 规则
- `PRICING_EXECUTE` handler 调用 `serviceOrderService.executePricing`
- 定价成功后订单进入 WAITING_ROBOTAXI_CALL

**涉及文件**：`simulationLoop.js`、`simulationHandlers.js`、`main.jsx`

**验收**：每 Tick 自动生成订单，自动完成定价，服务订单管理页面可见新增订单。

---

## v024.3：自动匹配 + 自动履约 + 自动支付

**范围**：
- ROBOTAXI_CALL handler → 自动客户确认
- ORDER_MATCHING_EXECUTE handler → 调用 `serviceOrderService.executeOrderMatching`
- 匹配成功后自动创建 Trip（TRIP_STEP_EXECUTE）
- Trip 自动推进：路径规划 → 接驾 → 上车 → 送达
- 送达后自动结算（SETTLEMENT_EXECUTE）→ 自动支付（PAYMENT_EXECUTE）
- 全部通过 autoConfig 开关控制

**涉及文件**：`simulationHandlers.js`、`simulationLoop.js`

**验收**：启动模拟后，服务订单从创建到支付完成全自动流转。履约行驶记录页面可见自动推进的 Trip。

---

## v024.4：供给侧自动推进 + 端到端验证

**范围**：
- 供给侧 trigger 产生的动作通过 ExecutionEngine 执行
- READINESS_TASK_ASSIGN → 自动分配 Worker
- READINESS_TASK_START/PASS → 自动完成准入检查
- ROUTE_PLAN/ROUTE_EXECUTION_STEP/ARRIVAL_CONFIRM → 自动推进行驶
- 快速模拟模式：run_speed_level 控制 tick 间隔
- 全链路验证：1 天模拟、10 分钟 Tick，观察所有业务数据自动生成

**涉及文件**：`simulationHandlers.js`、`simulationLoop.js`、`simulationActions.js`

**验收**：设置 1 天模拟 → 点击启动 → 全自动运行 → 模拟运行管理页面显示实时进度 → 各业务页面可见大量自动生成的数据 → 点击暂停/停止正常中断。

---

## 执行规则

- 每个子版本完成后更新 VERSION.md、提交并打 tag
- 每步编译 bundle 并做语法检查
- 遇到范围扩大或不可验证问题暂停确认
- 最后一个子版本执行大版本归档收口
