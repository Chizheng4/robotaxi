# RouteExecution Workflow：行驶记录闭环

## 1. 定位

RouteExecution（行驶记录）是 Robotaxi 执行路径行驶的**执行记录单据**。

RouteExecution 是 Robotaxi 执行运营任务时的通用运营行驶记录。运营投放任务、运维任务等需要 Robotaxi 空驶或调度移动时，都应调用 RouteExecution 服务。

Trip 是服务履约记录，有自己的履约行驶状态和成本 / 收入事实，不复用 RouteExecution。二者都可以引用 Route，但属于不同单据闭环。

---

## 2. 闭环全景

```
DeploymentTask / 运维任务触发行驶需求
    ↓ 调用 RouteExecution 服务创建独立行驶记录
WAITING_ROUTE
    ↓ 路径规划
MOVING
    ↓ 逐 Tick 推进（advanceRouteExecution）
每 Tick 前进一步 → 更新位置、电量、距离
    ↓ 到达目标
ARRIVED / ARRIVAL_ABNORMAL
    ↓ 提交到达结果
COMPLETED
```

---

## 3. 状态定义

以现有代码 `src/domain/taskTypes.js` 的 `RouteExecutionStatus` 为准：

```text
WAITING_ROUTE
WAITING_START
MOVING
ARRIVED
ARRIVAL_ABNORMAL
PAUSED
COMPLETED
FAILED
CANCELLED
```

---

## 4. 自动化流转规则表

| 当前状态 | 触发动作 | 目标状态 | 条件 | 说明 |
|---|---|---|---|---|
| WAITING_ROUTE | 路径规划 | MOVING | — | 调用 planRouteExecutionRoute |
| MOVING | 行驶推进 | ARRIVED | — | 调用 advanceRouteExecution，每 Tick 前进一个步数，到达目标后自动跳转 |
| ARRIVED | 正常到达 | COMPLETED | default_*_arrival_normal = true | 调用 submitNormalArrival |
| ARRIVAL_ABNORMAL | 异常到达重规划 | WAITING_ROUTE | — | 重新路径规划，回到行驶循环 |

---

## 5. 使用场景

### 5.1 运营任务行驶场景

```text
DeploymentTask / FleetOperationTask 创建或分配目的地
    ↓ 调用 RouteExecution 服务创建行驶记录
RouteExecution = WAITING_ROUTE
    ↓
RouteExecution 路径规划 → 行驶 → 到达
    ↓
源任务单接收 RouteExecution 返回的业务结果，并用源任务单自己的状态机继续闭环
```

### 5.2 履约场景（Trip）

Trip 也有行驶逻辑，但 Trip 使用自身履约行驶服务和状态机，不是 RouteExecution。

因此 SimulationLoop 对履约场景的行驶推进走 Trip 服务，对运营任务行驶场景走 RouteExecution 服务。

> 注：两者的行驶推进逻辑相似（逐步移动、更新位置、电量、距离），但分属不同单据和数据结构。SimulationLoop 需区分场景，不能混合状态时间线。

---

## 6. 需要调用的已有业务能力

| 动作 | 对应现有函数 | 位置 |
|---|---|---|
| 路径规划 | `planRouteExecutionRoute(routeExecutionId)` | `src/main.jsx:1758` |
| 行驶推进 | `advanceRouteExecution(routeExecutionId)` | `src/main.jsx:2071` |
| 正常到达 | `submitNormalArrival(routeExecutionId)` | `src/main.jsx:2141` |

---

## 7. 行驶推进详解

`advanceRouteExecution` 内部逻辑：

```text
1. 读取当前 Route（route_id）
2. 获取下一步目标 cell（route_cell_ids[current_step_index + 1]）
3. 更新 current_cell_id → 下一步 cell
4. current_step_index += 1
5. 更新 distance_traveled_km / distance_remaining_km
6. 更新 time_elapsed
7. 更新 battery_consumed_percent
8. 更新 Robotaxi 位置（current_cell_id, motion_status）
9. 如果到达终点 → execution_status = ARRIVED
```

SimulationLoop 只需每 Tick 调用一次 `advanceRouteExecution`，内部自动判断是否到达。

---

## 8. 与 SimulationLoop 的交互

RouteExecution 的推进由 SimulationLoop 统一管理，不走 SupplyTrigger：

- SimulationLoop § 8 步骤 5：`触发 RouteExecution 推进事件`
- SupplyTrigger 的 `route_execution_trigger_enabled` 建议关闭（避免重复推进）

最终以 SimulationPolicy 配置为准。

---

## 9. 不做什么

```text
不重写路径规划逻辑（createDeploymentRoute 不变）
不重写行驶推进逻辑（advanceRouteExecution 不变）
不重写位置更新逻辑（Robotaxi 位置更新在 advanceRouteExecution 内部）
```
