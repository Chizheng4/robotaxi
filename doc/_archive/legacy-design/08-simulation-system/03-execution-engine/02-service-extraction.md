# Service Extraction：业务函数提取规范

## 1. 目的

Simulation System 落地的前提条件：把嵌在 `main.jsx` UI handler 中的业务逻辑提取为**可独立调用的服务函数**。

提取后：

```text
提取前：
  UI按钮 → onClick → 直接操作 React state + 调用引擎

提取后：
  UI按钮 → onClick → serviceFunc(params) → 更新 UI state
  ExecutionEngine     → serviceFunc(params) → 记录 SimulationEvent
                         ↑ 同一个函数，两条调用路径
```

**核心原则：不改业务逻辑，只改调用方式。**

---

## 2. 标准调用约定

### 2.1 入参格式

所有提取后的函数统一使用对象参数：

```typescript
{
  // 必填：操作目标
  targetId: string,           // 如 serviceOrderId / taskId / tripId / routeExecutionId

  // 可选：附加上下文
  context?: {
    dataContext: "live" | "sandbox",  // 数据上下文
    simulationRunId?: string,          // 模拟运行时 ID（sandbox 必填）
    tick?: number,                      // 当前 Tick
    extra?: Record<string, any>,        // 其他参数
  },
}
```

### 2.2 返回格式

```typescript
{
  success: boolean,
  resultType: string,           // 如 "PRICE_ESTIMATED" / "TASK_CREATED" / "NO_ACTION"
  message: string,
  changedObjectIds?: string[],  // 受影响的业务对象 ID 列表
  data?: Record<string, any>,   // 附加数据
  failureReason?: string,       // 失败原因（success=false 时）
}
```

### 2.3 数据上下文路由

函数内部根据 `context.dataContext` 决定操作哪份数据：

```text
context.dataContext = "live"
    → 操作前端 React state（通过回调或 store）
    → 不写 SimulationEvent

context.dataContext = "sandbox"
    → 操作 SimulationRun 沙箱数据
    → 写入 SimulationEvent（带 simulation_run_id）
```

> 当前阶段建议：先提取为纯逻辑函数（接收数据作为入参、返回结果），由调用方决定结果写入 live 还是 sandbox。这样可以最小化对现有代码的改动。

---

## 3. 待提取函数清单（15 个）

### 3.1 供给侧：ReadinessTask（4 个）

#### ① 生成准入任务

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:972` `createManualTask()` |
| 当前逻辑 | 筛选待准入 Robotaxi → 创建 ReadinessCheckTask → 更新 state |
| 提取后签名 | `createReadinessTasks({ robotaxis, readinessTasks, triggerType })` |
| 返回 | `{ tasks: ReadinessTask[], eventLogs: EventLog[] }` |

#### ② 分配 Worker

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1062` `assignWorker(taskId)` |
| 当前逻辑 | 查找 IDLE Worker → 分配给 task → 更新 task 状态 → 更新 Worker 状态 |
| 提取后签名 | `assignWorker({ taskId, readinessTasks, workers })` |
| 返回 | `{ task: ReadinessTask, worker: Worker }` |

#### ③ 开始检查

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1108` `startCheck(taskId)` |
| 当前逻辑 | 校验 task 状态 → 更新为 CHECKING → 记录 event |
| 提取后签名 | `startReadinessCheck({ taskId, readinessTasks })` |
| 返回 | `{ task: ReadinessTask }` |

#### ④ 提交检查结果

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1126` `submitCheckResult(taskId, checkResult, issueType)` |
| 当前逻辑 | 按结果更新 task 状态（PASSED→COMPLETED / FAILED→…） |
| 提取后签名 | `submitReadinessCheckResult({ taskId, checkResult, issueType, readinessTasks, robotaxis })` |
| 返回 | `{ task: ReadinessTask, robotaxi: Robotaxi }` |

---

### 3.2 供给侧：DeploymentTask + RouteExecution（4 个）

#### ⑤ 生成投放任务

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1171` `createDeploymentTasks()` |
| 当前逻辑 | 筛选可投放 Robotaxi → 创建 DeploymentTask + RouteExecution → 更新 state |
| 提取后签名 | `createDeploymentTasks({ robotaxis, deploymentTasks, routeExecutions, target })` |
| 返回 | `{ tasks: DeploymentTask[], executions: RouteExecution[] }` |

#### ⑥ 路径规划（RouteExecution）

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1758` `planRouteExecutionRoute(routeExecutionId)` |
| 当前逻辑 | 获取 RouteExecution + 对应 DeploymentTask → 创建 Route → 更新 execution 状态 → 更新 task 状态 |
| 提取后签名 | `planRouteExecutionRoute({ routeExecutionId, routeExecutions, deploymentTasks, data })` |
| 返回 | `{ execution: RouteExecution, task: DeploymentTask }` |

#### ⑦ 行驶推进（RouteExecution）

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:2071` `advanceRouteExecution(routeExecutionId)` |
| 当前逻辑 | 逐步推进 RouteExecution → 更新位置/距离/电量 → 到达时自动跳转 ARRIVED |
| 提取后签名 | `advanceRouteExecution({ routeExecutionId, routeExecutions, robotaxis, data })` |
| 返回 | `{ execution: RouteExecution, robotaxi: Robotaxi }` |

#### ⑧ 正常到达确认

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:2141` `submitNormalArrival(routeExecutionId)` |
| 当前逻辑 | 提交正常到达 → execution 和 task 进入 COMPLETED |
| 提取后签名 | `submitNormalArrival({ routeExecutionId, routeExecutions, deploymentTasks, robotaxis })` |
| 返回 | `{ execution: RouteExecution, task: DeploymentTask, robotaxi: Robotaxi }` |

---

### 3.3 需求侧（1 个）

#### ⑨ 创建服务订单

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1230` `createServiceOrderFromDemand(orderChannel)` |
| 当前逻辑 | 调用 DemandSimulationStrategy → 生成订单上下文 → 创建 ServiceOrder |
| 提取后签名 | `createServiceOrderFromDemand({ orderChannel, demandSimulationStrategies, serviceOrders, data })` |
| 返回 | `{ serviceOrder: ServiceOrder, demandSimulationRun: DemandSimulationRun }` |

---

### 3.4 订单侧（5 个）

#### ⑩ 价格预估

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1297` `estimateServiceOrderPrice(serviceOrderId)` |
| 当前逻辑 | 创建估价 Route → 调用 pricingEngine → 更新订单定价字段 → WAITING_ROBOTAXI_CALL |
| 提取后签名 | `estimateServiceOrderPrice({ serviceOrderId, serviceOrders, pricingStrategies, routes, data })` |
| 返回 | `{ serviceOrder: ServiceOrder, pricingDecision: PricingDecision }` |

#### ⑪ 呼叫 Robotaxi

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1397` `callRobotaxiForServiceOrder(serviceOrderId)` |
| 当前逻辑 | 校验状态 → 更新为 WAITING_ROBOTAXI_ASSIGNMENT |
| 提取后签名 | `callRobotaxiForServiceOrder({ serviceOrderId, serviceOrders })` |
| 返回 | `{ serviceOrder: ServiceOrder }` |

#### ⑫ 订单匹配

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1415` `matchServiceOrder(serviceOrderId)` |
| 当前逻辑 | 调用 orderMatchingEngine → 分配 Robotaxi → 自动创建 Trip → ON_THE_WAY_PICKUP |
| 提取后签名 | `matchServiceOrder({ serviceOrderId, serviceOrders, orderMatchingStrategies, robotaxis, data })` |
| 返回 | `{ serviceOrder: ServiceOrder, trip: Trip, robotaxi: Robotaxi }` |

#### ⑬ 结算

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1508` `settleServiceOrder(serviceOrderId, visibleOrder)` |
| 当前逻辑 | 基于 Trip 数据计算实际费用 → 更新订单 → SETTLING → WAITING_PAYMENT |
| 提取后签名 | `settleServiceOrder({ serviceOrderId, serviceOrders, trips, pricingStrategies })` |
| 返回 | `{ serviceOrder: ServiceOrder, pricingDecision: PricingDecision }` |

#### ⑭ 支付

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1569` `payServiceOrder(serviceOrderId)` |
| 当前逻辑 | 校验状态 → 扣款 → COMPLETED |
| 提取后签名 | `payServiceOrder({ serviceOrderId, serviceOrders })` |
| 返回 | `{ serviceOrder: ServiceOrder }` |

---

### 3.5 履约侧（1 个）

#### ⑮ 推进 Trip

| 项 | 值 |
|---|---|
| 当前位置 | `src/main.jsx:1663` `advanceTrip(tripId)` |
| 当前逻辑 | 逐步推进 Trip 行驶 → 到达关键点时跳转状态 → 同步更新 ServiceOrder 和 Robotaxi |
| 提取后签名 | `advanceTrip({ tripId, trips, serviceOrders, robotaxis, data })` |
| 返回 | `{ trip: Trip, serviceOrder: ServiceOrder, robotaxi: Robotaxi }` |

---

## 4. 提取后调用示例

### UI 调用（保持现有交互）

```javascript
// 用户点击「价格预估」按钮
const handleEstimatePrice = async (serviceOrderId) => {
  const result = estimateServiceOrderPrice({
    serviceOrderId,
    serviceOrders,
    pricingStrategies: data.pricingStrategies,
    routes: operationalData.routes,
    data,
  });
  if (result.success) {
    setServiceOrders(prev => prev.map(o => o.service_order_id === serviceOrderId ? result.serviceOrder : o));
  }
};
```

### ExecutionEngine 调用（模拟驱动）

```javascript
// SimulationLoop 每 Tick 触发
const tickResult = executionEngine.execute({
  actionType: "PRICING_EXECUTE",
  targetId: "SO-001",
  context: {
    dataContext: "sandbox",
    simulationRunId: "SIM-RUN-001",
    tick: 120,
  },
});
// → estimateServiceOrderPrice({ serviceOrderId: "SO-001", ...sandboxData })
// → 记录 SimulationEvent { simulation_run_id: "SIM-RUN-001", ... }
```

---

## 5. 提取优先级

| 优先级 | 函数 | 理由 |
|---|---|---|
| P0 | ⑩ 价格预估 / ⑫ 订单匹配 / ⑮ 推进 Trip | ServiceOrder 主链路核心，影响最大 |
| P1 | ⑨ 创建订单 / ⑪ 呼叫 Robotaxi / ⑬ 结算 / ⑭ 支付 | 主链路其余环节 |
| P2 | ①-④ ReadinessTask 四个函数 | 供给侧准入 |
| P3 | ⑤-⑧ DeploymentTask + RouteExecution 四个函数 | 供给侧投放 |

---

## 6. 不做什么

```text
不改变任何业务逻辑（算法/规则/策略不变）
不改变函数内部的状态转换逻辑
不引入新的抽象层（只提取，不重写）
不改变现有数据流方向（live 和 sandbox 分开管理）
```
