# RouteExecution Workflow：行驶记录闭环

## 1. 定位

RouteExecution（行驶记录）是 Robotaxi 执行路径行驶的**执行记录单据**。

RouteExecution 是 DeploymentTask 和 Trip 两种场景下的底层行驶记录——投放任务和履约服务都通过 RouteExecution 驱动 Robotaxi 沿规划路径行驶。

---

## 2. 闭环全景

```
DeploymentTask 创建 / Trip 创建
    ↓ 同步创建 RouteExecution
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

## 5. 两种使用场景

### 5.1 投放场景（DeploymentTask）

```text
DeploymentTask 创建 → 同步创建 RouteExecution
    ↓
RouteExecution 路径规划 → 行驶 → 到达
    ↓
DeploymentTask 同步完成
```

### 5.2 履约场景（Trip）

Trip 也有行驶逻辑，但 Trip 使用的是 `advanceTrip`（内部调用 `getNextTripMovementState`），不是 `advanceRouteExecution`。

因此 SimulationLoop 对履约场景的行驶推进走 `advanceTrip`，对投放场景走 `advanceRouteExecution`。

> 注：两者的行驶推进逻辑相似（逐步移动、更新位置），但分属不同的函数和数据结构。SimulationLoop 需区分场景。

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
