# v025 自动执行计划：监控四阶段 + Trigger/Workflow 边界修正 + 父子流程串联

## 目标

1. **监控四阶段**：每个 Tick 产出完整事件链（时间触发 → 工作流 → 执行 → Tick 收口），用户可清晰看到每一步成功/失败
2. **Trigger 边界修正**：SupplyTrigger 只点火两个源头（ReadinessTask + DeploymentTask），RouteExecution 改由 WorkflowEngine 驱动
3. **父子流程串联**：DeploymentTask → RouteExecution 创建 + WorkflowEngine 自动推进
4. **执行失败可见**：执行引擎失败时在业务对象上设置失败状态，与人工操作结果一致

## 架构确认

```
SimulationTick 到达
  │
  ├── Phase 1: 时间与触发阶段
  │   ├── TICK_STARTED 事件
  │   ├── SupplyTrigger 点火 → READINESS_TASK_CREATE / DEPLOYMENT_TASK_CREATE 动作
  │   ├── DemandTrigger → SERVICE_ORDER_CREATE 动作（已有，记录事件）
  │   └── 产出：SUPPLY_TRIGGER / DEMAND_TRIGGER 事件
  │
  ├── Phase 2: 工作流获取阶段
  │   ├── WorkflowEngine 扫描所有单据（ServiceOrder/Trip/Readiness/Deployment/RouteExecution）
  │   ├── 返回待执行动作列表
  │   └── 产出：WORKFLOW_QUERIED 事件
  │
  ├── Phase 3: 执行引擎阶段
  │   ├── ExecutionEngine 逐一执行动作
  │   ├── 成功 → 业务对象状态更新 → ACTION_EXECUTED(SUCCESS) 事件
  │   ├── 失败 → 业务对象设置失败状态 → ACTION_EXECUTED(FAILED) 事件
  │   └── 产出：每条动作一个事件，含对象ID、结果、原因
  │
  └── Phase 4: Tick 收口阶段
      ├── 推进时间（advanceTick）
      ├── TICK_COMPLETED 事件（含汇总：创建X订单/执行Y动作/成功Z/失败W）
      └── 判断是否完成
```

---

## v025.1：监控四阶段事件体系

**范围**：
- `simulationEngine.js` 重构 `completeTick`：改为 `createTickEvents(simulationRun, tickContext, ...)`，产出结构化事件列表
- 每个阶段产出一个明确的事件：
  - `TICK_STARTED`：时间信息 + 时段
  - `SUPPLY_TRIGGER_COMPLETED`：触发判断结果（点火了什么）
  - `DEMAND_TRIGGER_COMPLETED`：需求生成结果（订单数）
  - `WORKFLOW_QUERIED`：发现的动作类型和数量
  - 每个 `ACTION_EXECUTED`：动作名 + 对象ID + 成功/失败 + 详情
  - `TICK_COMPLETED`：汇总统计
- `simulationLoop.js` 返回值增加诊断数据（supply/demand detail、workflow detail）
- `simulationActions.js` 的 `executeTickForRun` 刷新 businessData 后重新查询 workflow（已有 refreshBusinessData，验证可用）

**涉及文件**：`simulationEngine.js`、`simulationLoop.js`、`simulationActions.js`

**验收**：Node.js 测试显示每个 Tick 产出 6+ 条事件，消息完整中文可读。

---

## v025.2：Trigger 边界修正

**范围**：
- `simulationSupplyTrigger.js`：去掉 `route_execution_trigger_enabled` 相关逻辑，只返回 READINESS_TASK_CREATE 和 DEPLOYMENT_TASK_CREATE 两个 Action
- `simulationLoop.js`：更新 `runSupplyTrigger` 调用逻辑，直接产出 Action 列表
- WorkflowEngine：去掉 `ROUTE_EXECUTION_RULES` 中与 SupplyTrigger 重复的部分（RouteExecution 推进改为仅由 Workflow 驱动，不再依赖 supply trigger 开关）

**涉及文件**：`simulationSupplyTrigger.js`、`simulationLoop.js`、`simulationWorkflowEngine.js`

**验收**：SupplyTrigger 不再产出行进执行相关判断。RouteExecution 状态变化仅通过 WorkflowEngine 事件可见。

---

## v025.3：DeploymentTask → RouteExecution 父子链

**范围**：
- 新增 `DEPLOYMENT_TASK_RULES` 规则表到 `simulationWorkflowEngine.js`
- 新增 `handleDeploymentTaskCreate` handler 到 `simulationHandlers.js`：创建 DeploymentTask 时同步创建 RouteExecution
- 注册 handler 到 bootstrap
- `handleReadinessTaskPass` handler 增强：通过后自动创建 DeploymentTask（关联已准入的 Robotaxi）
- 子流程完成后返回父流程收口：`handleArrivalConfirm` 完成后更新关联的 DeploymentTask 状态为 COMPLETED

**涉及文件**：`simulationWorkflowEngine.js`、`simulationHandlers.js`、`main.jsx`

**验收**：Node.js 测试显示 DeploymentTask 创建 → RouteExecution 自动创建 → 路径规划 → 行驶推进 → 到达 → 完成 → DeploymentTask 收口。

---

## v025.4：执行失败在业务对象上可见

**范围**：
- `simulationHandlers.js` 中所有 handler 在失败时：除了返回 `{ success: false }`，同时在业务对象上设置失败状态
  - 定价失败 → ServiceOrder 状态设为 `PRICING_FAILED`
  - 匹配失败 → ServiceOrder 状态设为 `MATCH_FAILED`
  - 履约推进失败 → Trip 状态设为 `FAILED`
  - etc.
- 成功/失败事件消息包含目标对象 ID 和具体原因
- `simulationEngine.js` 的 `completeTick` 中事件记录包含 `related_object_type` 和 `related_object_id`

**涉及文件**：`simulationHandlers.js`、`simulationEngine.js`

**验收**：Node.js 测试中模拟失败场景（如无 Robotaxi 匹配），确认 ServiceOrder 状态显示 `MATCH_FAILED`，事件消息包含订单 ID 和失败原因。

---

## v025.5：端到端验证 + 最终归档

**范围**：
- 全链路 Node.js 验证：144 Tick 1 天模拟
- 前端服务重启验证
- VERSION.md 更新
- 大版本归档

---

## 执行规则

- 每个子版本完成后更新 VERSION.md、提交并打 tag
- 每步编译 bundle 并做语法检查
- v025.5 执行大版本归档收口
