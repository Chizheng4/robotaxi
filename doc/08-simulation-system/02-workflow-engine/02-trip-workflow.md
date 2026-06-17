# Trip Workflow：履约行驶闭环

## 1. 定位

Trip 是 Robotaxi 执行服务订单的**履约行驶单据**。

Trip 在 ServiceOrder 订单匹配成功后自动创建，记录 Robotaxi 从接驾到送达的完整行驶过程。本文档定义 Trip 的完整生命周期，以及 SimulationLoop 应如何自动推进 Trip。

---

## 2. 闭环全景

```
订单匹配成功 → 自动创建 Trip
    ↓
WAITING_ROUTE / PENDING / ASSIGNED
    ↓ advanceTrip（模拟系统每 Tick 触发）
ON_THE_WAY_PICKUP（接驾行驶中）
    ↓ advanceTrip（逐 Tick 推进行驶步数）
到达上车点 → WAITING_CUSTOMER_BOARDING
    ↓ advanceTrip
乘客上车 → CUSTOMER_ONBOARD / PASSENGER_ONBOARD
    ↓ advanceTrip
ON_THE_WAY_DESTINATION（载客行驶中）
    ↓ advanceTrip（逐 Tick 推进行驶步数）
到达目的地 → ARRIVED_DESTINATION
    ↓ （触发 ServiceOrder 结算）
SETTLING → COMPLETED
```

---

## 3. 状态定义

以现有代码 `src/domain/tripTypes.js` 的 `TripStatus` 为准：

```text
WAITING_ROUTE
PENDING
ASSIGNED
ON_THE_WAY_PICKUP
ARRIVED_PICKUP
WAITING_CUSTOMER_BOARDING
CUSTOMER_ONBOARD
PASSENGER_ONBOARD
ON_THE_WAY_DESTINATION
ARRIVED_DESTINATION
SETTLING
WAITING_OPERATION_DECISION
COMPLETED
FAILED
CANCELLED
```

配套 `TripPhase`（履约阶段）：

```text
PICKUP       → 接驾阶段
DESTINATION  → 载客阶段
COMPLETED    → 完成
```

---

## 4. 自动化流转规则表

| 当前状态 | 触发动作 | 目标状态 | 条件 | 说明 |
|---|---|---|---|---|
| WAITING_ROUTE | advanceTrip | ON_THE_WAY_PICKUP | auto_trip_progress_enabled | 跳转到接驾行驶 |
| PENDING | advanceTrip | ON_THE_WAY_PICKUP | auto_trip_progress_enabled | 同上 |
| ASSIGNED | advanceTrip | ON_THE_WAY_PICKUP | auto_trip_progress_enabled | 同上 |
| ON_THE_WAY_PICKUP | advanceTrip | WAITING_CUSTOMER_BOARDING | auto_trip_progress_enabled | 逐 Tick 推进行驶步数，到达上车点后自动跳转 |
| ARRIVED_PICKUP | advanceTrip | CUSTOMER_ONBOARD | auto_trip_progress_enabled | — |
| WAITING_CUSTOMER_BOARDING | advanceTrip | CUSTOMER_ONBOARD | auto_trip_progress_enabled | 乘客自动上车 |
| CUSTOMER_ONBOARD | advanceTrip | ON_THE_WAY_DESTINATION | auto_trip_progress_enabled | 出发前往目的地 |
| PASSENGER_ONBOARD | advanceTrip | ON_THE_WAY_DESTINATION | auto_trip_progress_enabled | 出发前往目的地 |
| ON_THE_WAY_DESTINATION | advanceTrip | ARRIVED_DESTINATION | auto_trip_progress_enabled | 逐 Tick 推进行驶步数，到达目的地后自动跳转 |
| ARRIVED_DESTINATION | advanceTrip | SETTLING → COMPLETED | auto_trip_progress_enabled | 到达后自动进入结算 |

### 4.1 行驶推进说明

`advanceTrip` 内部逻辑：

- **行驶中**（ON_THE_WAY_PICKUP / ON_THE_WAY_DESTINATION）：调用 `getNextTripMovementState`，每 Tick 前进一个行驶步数，同步更新 Robotaxi 位置和 ServiceOrder 状态。
- **到达关键点**（上车点 / 目的地）：调用 `getNextTripState`，触发状态跳转（如 `WAITING_CUSTOMER_BOARDING → CUSTOMER_ONBOARD`）。

因此 SimulationLoop 只需要每 Tick 对符合条件的 Trip 调用 `advanceTrip(tripId)`，Trip 自身的状态机逻辑决定了下一步行为。

---

## 5. 需要调用的已有业务能力

| 动作 | 对应现有函数 | 位置 |
|---|---|---|
| 推进 Trip | `advanceTrip(tripId)` | `src/main.jsx:1663` |

> `advanceTrip` 已包含完整的行驶推进逻辑，包括：逐步移动、到达关键点跳转、更新 Robotaxi 位置、同步更新 ServiceOrder 状态。SimulationLoop 只需重复调用即可。

---

## 6. Trip 与 ServiceOrder 的状态联动

`advanceTrip` 内部会调用 `updateServiceOrderForTrip(order, nextTrip)`，同步更新 ServiceOrder 的状态：

| Trip 状态变化 | ServiceOrder 同步状态 |
|---|---|
| → ON_THE_WAY_PICKUP | ON_THE_WAY_PICKUP |
| → WAITING_CUSTOMER_BOARDING | WAITING_CUSTOMER_BOARDING |
| → CUSTOMER_ONBOARD | CUSTOMER_ONBOARD |
| → ON_THE_WAY_DESTINATION | ON_THE_WAY_DESTINATION |
| → ARRIVED_DESTINATION | ARRIVED_DESTINATION |

因此 SimulationLoop **不需要**为 ServiceOrder 的这些中间状态单独触发动作——Trip 推进已经自动完成了联动。

---

## 7. 异常路径

| 场景 | 处理 |
|---|---|
| 路径异常 | `replanTripRouteException` → 重新规划路径 |
| 目的地变更 | `replanTripDestination` → 更新目标 |
| 乘客未上车 | 当前阶段不模拟（`default_passenger_boarded = true`） |
| 行驶失败 | `trip_status → FAILED`，对应 ServiceOrder 同步失败 |

> 当前阶段默认所有业务正常完成（`enable_exception_probability = false`），异常路径后续版本再引入。

---

## 8. 不做什么

```text
不重写行驶推进逻辑（advanceTrip 不变）
不重写路径规划逻辑（RoutePlanning 不变）
不重写位置更新逻辑（updateRobotaxiForTrip 不变）
不直接修改 Trip 状态（通过 advanceTrip 驱动）
```
