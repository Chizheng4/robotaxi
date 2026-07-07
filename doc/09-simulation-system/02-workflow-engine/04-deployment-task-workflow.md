# DeploymentTask Workflow：运营投放闭环

## 1. 定位

DeploymentTask（运营投放任务）是将 Robotaxi 从当前位置投放到目标运营区域的**调度单据**。

准入通过的 Robotaxi 需要被投放到指定运营区域待命。本文档定义投放任务的完整生命周期，以及 SimulationLoop 应如何自动驱动投放流程。

---

## 2. 闭环全景

```
供给侧触发（SupplyTrigger）
    ↓ 筛选可投放 Robotaxi
生成投放任务 → WAITING_START / WAITING_ROUTE
    ↓ 调用 RouteExecution 服务创建独立行驶记录
RouteExecution = WAITING_ROUTE
    ↓ RouteExecution 自身路径规划
RouteExecution = MOVING，DeploymentTask 接收“行驶已开始”结果后进入 MOVING
    ↓ 模拟系统每 Tick 触发行驶推进
行驶推进 → 逐 Tick 推进 → 到达目标
    ↓
正常到达 → ARRIVED → COMPLETED
```

---

## 3. 状态定义

以现有代码 `src/domain/taskTypes.js` 的 `DeploymentTaskStatus` 为准：

```text
WAITING_ROUTE
WAITING_START
MOVING
ARRIVED
ARRIVAL_ABNORMAL
COMPLETED
CANCELLED
FAILED
```

---

## 4. 自动化流转规则表

| 当前状态 | 触发动作 | 目标状态 | 条件 | 说明 |
|---|---|---|---|---|
| WAITING_START / WAITING_ROUTE | 创建行驶记录 | WAITING_ROUTE | deployment_trigger_enabled | 调用 RouteExecution 服务创建独立行驶记录 |
| WAITING_ROUTE | 接收行驶记录路径规划结果 | MOVING | RouteExecution 返回行驶已开始 | DeploymentTask 用自己的动作记录状态变化 |
| MOVING | 接收行驶记录到达结果 | ARRIVED | RouteExecution 返回已到达 | DeploymentTask 不记录 RouteExecution 状态本身 |
| ARRIVED | 正常到达确认结果 | COMPLETED | default_deployment_arrival_normal = true | RouteExecution 到达确认完成后，DeploymentTask 用自身动作收口 |

### 4.1 触发条件

投放任务只在以下条件满足时触发：

```text
supply_trigger_enabled = true
AND deployment_trigger_enabled = true
AND is_robotaxi_operating_time = true
```

Robotaxi 默认全天可运营（`00:00 - 24:00`）。

---

## 5. 与 RouteExecution 的关联关系（关键）

DeploymentTask 和 RouteExecution 都是独立单据。DeploymentTask 可以触发 RouteExecution 创建，但不得把 RouteExecution 的状态时间线当成自己的状态时间线。

```text
SupplyTrigger 点火
    ↓ 创建 DeploymentTask (WAITING_START)
DeploymentTask 调用 RouteExecution 服务创建行驶记录 (WAITING_ROUTE)
    ↓ WorkflowEngine 接管
RouteExecution 路径规划 → MOVING
    ↓ 返回“行驶已开始”结果
DeploymentTask → MOVING
    ↓ WorkflowEngine 每 Tick 推进
RouteExecution 行驶推进 → ARRIVED
    ↓ 返回“已到达”结果
DeploymentTask → ARRIVED
    ↓ WorkflowEngine
RouteExecution 到达确认 → COMPLETED
    ↓ 返回“正常到达已确认”结果
DeploymentTask → COMPLETED（收口）
```

关键规则：
- DeploymentTask 是独立投放任务单，RouteExecution 是独立运营行驶记录；
- RouteExecution 可由 DeploymentTask 触发创建，但创建后由 RouteExecution 自身服务推进；
- WorkflowEngine 可以驱动 RouteExecution，也必须通过业务动作结果让 DeploymentTask 用自身状态机更新；
- DeploymentTask 时间线只记录 DeploymentTask 自己的动作和状态，不记录 RouteExecution 的内部状态动作。

---

## 6. 需要调用的已有业务能力

| 动作 | 对应现有函数 | 位置 |
|---|---|---|
| 生成投放任务 | `createDeploymentTasks()` | `src/main.jsx:1171` |
| 路径规划 | `planRouteExecutionRoute(routeExecutionId)` | `src/main.jsx:1758` |
| 行驶推进 | `advanceRouteExecution(routeExecutionId)` | `src/main.jsx:2071` |
| 正常到达 | `submitNormalArrival(routeExecutionId)` | `src/main.jsx:2141` |

---

## 7. 与 SimulationLoop 的交互

SimulationLoop 每 Tick 执行：

1. 检查是否存在 `WAITING_ROUTE` 的 RouteExecution
2. 如有 → 调用 `planRouteExecutionRoute(routeExecutionId)`
3. 检查是否存在 `MOVING` 的 RouteExecution
4. 如有 → 调用 `advanceRouteExecution(routeExecutionId)`
5. 检查是否存在 `ARRIVED` 的 RouteExecution
6. 如有 → 调用 `submitNormalArrival(routeExecutionId)`

---

## 8. 不做什么

```text
不重写投放判断逻辑（isDeploymentCandidateRobotaxi 不变）
不重写路径规划逻辑（createDeploymentRoute 不变）
不重写行驶推进逻辑（advanceRouteExecution 不变）
```
