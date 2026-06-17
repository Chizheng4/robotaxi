# DeploymentTask Workflow：运营投放闭环

## 1. 定位

DeploymentTask（运营投放任务）是将 Robotaxi 从当前位置投放到目标运营区域的**调度单据**。

准入通过的 Robotaxi 需要被投放到指定运营区域待命。本文档定义投放任务的完整生命周期，以及 SimulationLoop 应如何自动驱动投放流程。

---

## 2. 闭环全景

```
供给侧触发（SupplyTrigger）
    ↓ 筛选可投放 Robotaxi
生成投放任务 → WAITING_ROUTE（同步创建 RouteExecution）
    ↓ 模拟系统自动触发路径规划
路径规划 → MOVING（DeploymentTask + RouteExecution 同步进入行驶）
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
| WAITING_ROUTE | 路径规划 | MOVING | deployment_trigger_enabled | 调用 planRouteExecutionRoute，同步创建 Route 并进入行驶 |
| MOVING | 行驶推进 | ARRIVED | — | 逐 Tick 调用 advanceRouteExecution，到达后自动跳转 |
| ARRIVED | 正常到达 | COMPLETED | default_deployment_arrival_normal = true | 调用 submitNormalArrival |

### 4.1 触发条件

投放任务只在以下条件满足时触发：

```text
supply_trigger_enabled = true
AND deployment_trigger_enabled = true
AND is_robotaxi_operating_time = true
```

Robotaxi 默认全天可运营（`00:00 - 24:00`）。

---

## 5. 与 RouteExecution 的父子关系（关键）

DeploymentTask 和 RouteExecution 是**父子关系**，不是平级关系：

```text
SupplyTrigger 点火
    ↓ 创建 DeploymentTask (WAITING_ROUTE)
DeploymentTask 创建时同步创建 RouteExecution (WAITING_ROUTE)
    ↓ WorkflowEngine 接管
RouteExecution 路径规划 → MOVING（DeploymentTask 同步 MOVING）
    ↓ WorkflowEngine 每 Tick 推进
RouteExecution 行驶推进 → ARRIVED（DeploymentTask 同步 ARRIVED）
    ↓ WorkflowEngine
RouteExecution 到达确认 → COMPLETED
    ↓ 回到父流程
DeploymentTask → COMPLETED（收口）
```

关键规则：
- DeploymentTask 是**父单据**，RouteExecution 是**子单据**
- RouteExecution 由 DeploymentTask 触发创建，不由 SupplyTrigger 直接创建
- WorkflowEngine 只需驱动 RouteExecution，DeploymentTask 状态自动同步
- RouteExecution 完成后，DeploymentTask 自动收口

RouteExecution 状态与 DeploymentTask 状态同步：

| RouteExecution 状态 | DeploymentTask 同步状态 |
|---|---|
| WAITING_ROUTE → MOVING | WAITING_ROUTE → MOVING |
| MOVING → ARRIVED | MOVING → ARRIVED |
| ARRIVED → COMPLETED | ARRIVED → COMPLETED |

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
