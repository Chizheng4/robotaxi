# Execution Engine：动作分发器

## 1. 目的

Execution Engine 是自动运营模拟系统中的**动作分发器（Action Dispatcher）**。

它连接 SimulationLoop 与已有业务能力：

```text
SimulationLoop → WorkflowEngine（查询规则）
    → 返回：对象X在状态A → 应触发动作Y
    → ExecutionEngine（动作分发）
    → 调用已有业务函数 → 记录 SimulationEvent
```

Execution Engine 不实现业务逻辑，只做三件事：**路由、调用、记录**。

---

## 2. 核心定位

```text
ExecutionEngine = 动作分发器

它做的事情：
  1. 接收 SimulationLoop 的触发请求（对象ID + 动作名称）
  2. 找到对应的业务函数（动作→函数映射）
  3. 调用该函数
  4. 记录调用结果 → SimulationEvent

它不做的事情：
  不判断是否应该触发（WorkflowEngine 负责）
  不实现业务逻辑（业务引擎函数负责）
  不直接修改业务对象状态（业务函数内部修改）
  不控制 Tick 节奏（SimulationLoop 负责）
```

---

## 3. 与其他模块的关系

```text
SimulationLoop（Tick 主循环）
    ↓ 查 WorkflowEngine 规则
WorkflowEngine（流转规则表）
    ↓ 返回：应触发 action
SimulationLoop
    ↓ 委托执行
ExecutionEngine（动作分发器）
    ↓ 查映射表 → 调用函数
业务引擎函数（runPricingEstimate / advanceTrip / …）
    ↓ 执行并修改状态
业务对象（ServiceOrder / Trip / Task / RouteExecution）
    ↓ 记录
SimulationEvent
```

---

## 4. Execution Engine 的职责

Execution Engine 只做三件事：

```text
1. 接收 Action
2. 调用业务服务执行
3. 记录执行结果
```

不做：

```text
不判断业务逻辑
不决定是否可执行
不做调度
不做策略计算
不修改规则
```

---

## 5. Action（执行动作模型）

Execution Engine 的核心输入是 Action。

### 5.1 Action 标准结构

```json
{
  "action_id": "ACT-001",
  "action_type": "DEPLOYMENT_TASK_EXECUTE",
  "source": "SUPPLY_TRIGGER",
  "target_type": "DeploymentTask",
  "target_id": "DT-001",
  "simulation_run_id": "SIM-RUN-001",
  "tick": 120,
  "time": "08:30",
  "payload": {},
  "created_at": "2026-01-01T08:30:00"
}
```

---

### 5.2 Action 类型分类

#### 供给侧 Action

```text
READINESS_TASK_CREATE       → createManualTask()
READINESS_TASK_ASSIGN       → assignWorker(taskId)
READINESS_TASK_START        → startCheck(taskId)
READINESS_TASK_PASS         → submitCheckResult(taskId, PASSED)
DEPLOYMENT_TASK_CREATE      → createDeploymentTasks()
ROUTE_PLAN                  → planRouteExecutionRoute(routeExecutionId)
ROUTE_EXECUTION_STEP        → advanceRouteExecution(routeExecutionId)
ARRIVAL_CONFIRM             → submitNormalArrival(routeExecutionId)
```

#### 需求侧 Action

```text
SERVICE_ORDER_CREATE        → createServiceOrderFromDemand(channel)
```

#### 订单侧 Action

```text
PRICING_EXECUTE             → estimateServiceOrderPrice(serviceOrderId)
ROBOTAXI_CALL               → callRobotaxiForServiceOrder(serviceOrderId)
ORDER_MATCHING_EXECUTE      → matchServiceOrder(serviceOrderId)
SETTLEMENT_EXECUTE          → settleServiceOrder(serviceOrderId)
PAYMENT_EXECUTE             → payServiceOrder(serviceOrderId)
```

#### 履约侧 Action

```text
TRIP_STEP_EXECUTE           → advanceTrip(tripId)
```

---

## 6. Execution Flow（执行流程）

Execution Engine 每次执行 Action：

```text
1. 接收 Action
2. 路由到对应 BusinessService
3. 执行业务逻辑
4. 更新 Domain Object 状态
5. 生成 SimulationEvent
6. 返回执行结果
```

---

## 7. 执行分发机制（Dispatcher）

Execution Engine 内部维护动作→函数的映射表：

| ActionType | 对应函数 | 所属模块 |
|---|---|---|
| READINESS_TASK_CREATE | `createManualTask()` | `src/main.jsx:972` |
| READINESS_TASK_ASSIGN | `assignWorker(taskId)` | `src/main.jsx:1062` |
| READINESS_TASK_START | `startCheck(taskId)` | `src/main.jsx:1108` |
| READINESS_TASK_PASS | `submitCheckResult(taskId, PASSED)` | `src/main.jsx:1126` |
| DEPLOYMENT_TASK_CREATE | `createDeploymentTasks()` | `src/main.jsx:1171` |
| ROUTE_PLAN | `planRouteExecutionRoute(routeExecutionId)` | `src/main.jsx:1758` |
| ROUTE_EXECUTION_STEP | `advanceRouteExecution(routeExecutionId)` | `src/main.jsx:2071` |
| ARRIVAL_CONFIRM | `submitNormalArrival(routeExecutionId)` | `src/main.jsx:2141` |
| SERVICE_ORDER_CREATE | `createServiceOrderFromDemand(channel)` | `src/main.jsx:1230` |
| PRICING_EXECUTE | `estimateServiceOrderPrice(serviceOrderId)` | `src/main.jsx:1297` |
| ROBOTAXI_CALL | `callRobotaxiForServiceOrder(serviceOrderId)` | `src/main.jsx:1397` |
| ORDER_MATCHING_EXECUTE | `matchServiceOrder(serviceOrderId)` | `src/main.jsx:1415` |
| SETTLEMENT_EXECUTE | `settleServiceOrder(serviceOrderId)` | `src/main.jsx:1508` |
| PAYMENT_EXECUTE | `payServiceOrder(serviceOrderId)` | `src/main.jsx:1569` |
| TRIP_STEP_EXECUTE | `advanceTrip(tripId)` | `src/main.jsx:1663` |

> 实现 Simulation System 时，需将这些函数从 main.jsx 中提取为可独立调用的服务函数，供 UI 和 ExecutionEngine 两条路径复用。

---

## 8. 业务函数职责边界

ExecutionEngine 调用的业务函数负责：

```text
判断是否可执行（状态校验）
执行具体业务逻辑
更新业务对象状态
返回执行结果
```

不负责：

```text
不负责 Action 调度（ExecutionEngine 负责）
不负责 Tick 控制（SimulationLoop 负责）
不负责 Trigger 判断（WorkflowEngine 负责）
```

---

## 9. Execution Result（执行结果）

每个 Action 执行后必须返回结果：

```json
{
  "action_id": "ACT-001",
  "status": "SUCCESS",
  "result_type": "TASK_CREATED",
  "message": "DeploymentTask 创建成功",
  "changed_objects": [
    {
      "type": "DeploymentTask",
      "id": "DT-001"
    }
  ]
}
```

---

## 10. SimulationEvent 记录

Execution Engine 必须生成事件：

|event_type|含义|
|---|---|
|ACTION_RECEIVED|接收 Action|
|ACTION_EXECUTED|执行完成|
|ACTION_FAILED|执行失败|
|DOMAIN_STATE_CHANGED|状态变更|
|BUSINESS_RESULT_EMITTED|业务结果输出|

---

## 11. 与 Trigger 的关系

Trigger 不执行，只生成 Action：

```text
Trigger → Action
ExecutionEngine → 执行 Action
```

说明：

```text
Trigger = 是否发生
ExecutionEngine = 如何执行
```

---

## 12. 与 SimulationLoop 的关系

SimulationLoop 只负责：

```text
收集 Trigger
生成 Action
提交 ExecutionEngine
```

不负责：

```text
不执行业务
不修改状态
不处理 Task
```

---

## 13. 与业务对象关系

ExecutionEngine 不直接修改业务对象状态。它通过调用已有业务函数间接驱动状态变更：

```text
ExecutionEngine
   ↓ 调用
业务引擎函数（runPricingEstimate / advanceTrip / …）
   ↓ 内部修改
业务对象状态变更
   ↓ 记录
SimulationEvent
```

> 注：业务对象的状态变更由业务引擎函数内部完成。ExecutionEngine 只负责路由调用和记录结果，不成为唯一状态变更入口。

---

## 14. 幂等性规则

Execution Engine 必须保证：

```text
同一个 Action_id 只能执行一次
重复 Action 必须忽略
```

规则：

|条件|行为|
|---|---|
|未执行|执行|
|已执行|忽略|
|执行失败|记录失败|

---

## 15. 执行失败处理

如果 BusinessService 执行失败，必须做到：

```text
1. 记录 ACTION_FAILED 事件（含失败原因）
2. 业务对象保留失败状态（与人工操作结果一致）
   例如：匹配失败 → ServiceOrder.order_status = MATCH_FAILED
   例如：定价失败 → ServiceOrder.order_status = PRICING_FAILED
3. 返回失败原因（用户可在前端对应单据页面看到失败记录）
4. 不重试（当前阶段）
```

核心原则：**自动化执行的失败结果必须与人工通过 UI 操作产生的失败结果完全一致**。用户在对应业务单据页面应能看到相同的失败状态和原因，便于排查问题。

---

## 16. 性能模型（当前阶段）

当前版本采用同步执行模型：

```text
Action → Immediate Execution → Result
```

不使用：

```text
异步队列
分布式执行
延迟执行
```

---

## 17. Execution Engine 的核心价值

Execution Engine 的核心作用：

```text
把“模拟系统”变成“可运行系统”
```

它实现三件事：

```text
1. Trigger → Action
2. Action → Execution
3. Execution → 可观测结果
```

---

## 18. 与经营分析系统的关系

Execution Engine 产生的数据是经营系统基础：

```text
Action Log
SimulationEvent
Domain State Change
```

可用于：

- 利用率分析
    
- 成功率分析
    
- 时延分析
    
- 供需匹配效率
    
- Robotaxi 空驶率
    

---

## 19. 当前不做内容

当前阶段不做：

```text
分布式执行
异步队列
任务重试机制
复杂调度系统
AI调度优化
实时流处理
多引擎协同
```

---

## 20. 核心规则

1. Execution Engine 成为系统唯一状态变更入口是未来架构目标，当前版本不强制落地
    
2. Trigger 不执行，只生成 Action
    
3. BusinessService 不负责调度
    
4. SimulationLoop 不负责业务执行
    
5. Action 必须可追踪
    
6. Action 必须幂等
    
7. Execution 必须生成 SimulationEvent
    
8. 当前阶段 Domain Object 状态由业务服务和现有交互流程负责更新
    
9. 当前采用同步执行模型
    
10. 所有执行必须可回放