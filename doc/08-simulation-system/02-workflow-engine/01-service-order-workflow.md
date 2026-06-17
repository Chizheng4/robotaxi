# ServiceOrder Workflow：服务订单闭环

## 1. 定位

ServiceOrder 是自动运营模拟系统的**核心业务单据**。

本文档定义 ServiceOrder 从创建到完成的完整生命周期，以及 SimulationLoop 在每个环节应自动触发的动作。

---

## 2. 闭环全景

```
需求生成（DemandSimulation）
    ↓ 创建 ServiceOrder
订单创建 → WAITING_PRICE_ESTIMATE
    ↓ 模拟系统自动触发价格预估
价格预估 → WAITING_ROBOTAXI_CALL
    ↓ 模拟系统自动触发呼叫 Robotaxi
呼叫 Robotaxi → WAITING_ROBOTAXI_ASSIGNMENT
    ↓ 模拟系统自动触发订单匹配
订单匹配 → ON_THE_WAY_PICKUP（同步创建 Trip）
    ↓ Trip 自动推进（见 02-trip-workflow）
Trip 履约中 → ON_THE_WAY_PICKUP → WAITING_CUSTOMER_BOARDING
    ↓
乘客上车 → CUSTOMER_ONBOARD → ON_THE_WAY_DESTINATION
    ↓
到达目的地 → ARRIVED_DESTINATION
    ↓ 模拟系统自动触发结算
结算 → SETTLING
    ↓ 模拟系统自动触发支付
支付 → WAITING_PAYMENT
    ↓
完成 → COMPLETED
```

---

## 3. 状态定义

以现有代码 `src/domain/serviceOrderTypes.js` 的 `ServiceOrderStatus` 为准：

```text
CREATED
WAITING_PRICE_ESTIMATE
WAITING_ROBOTAXI_CALL
WAITING_ROBOTAXI_ASSIGNMENT
ROBOTAXI_ASSIGNMENT_FAILED
ON_THE_WAY_PICKUP
WAITING_CUSTOMER_BOARDING
CUSTOMER_ONBOARD
ON_THE_WAY_DESTINATION
ARRIVED_DESTINATION
SETTLING
WAITING_PAYMENT
MATCH_FAILED
MATCHING_FAILED
CANCELLED
COMPLETED
FAILED
```

---

## 4. 自动化流转规则表

SimulationLoop 每 Tick 查询此表，匹配 `当前状态 + 条件` 后触发对应动作。

| 当前状态 | 触发动作 | 目标状态 | 条件 | 说明 |
|---|---|---|---|---|
| WAITING_PRICE_ESTIMATE | 价格预估 | WAITING_ROBOTAXI_CALL | auto_pricing_enabled = true | 调用 runPricingEstimate |
| WAITING_ROBOTAXI_CALL | 呼叫 Robotaxi | WAITING_ROBOTAXI_ASSIGNMENT | — | 调用 callRobotaxiForServiceOrder |
| WAITING_ROBOTAXI_ASSIGNMENT | 订单匹配 | ON_THE_WAY_PICKUP | auto_order_matching_enabled = true | 匹配成功自动创建 Trip |
| SETTLING | 支付 | COMPLETED | auto_payment_enabled = true | 调用 payServiceOrder |
| ARRIVED_DESTINATION | 结算 | SETTLING | auto_settlement_enabled = true | 调用 settleServiceOrder |

### 4.1 中间状态说明

以下状态由 Trip 推进自动驱动，不需要 SimulationLoop 额外触发 ServiceOrder 动作：

| 状态 | 驱动来源 | 说明 |
|---|---|---|
| ON_THE_WAY_PICKUP | 订单匹配成功时设置 | 同步创建 Trip |
| WAITING_CUSTOMER_BOARDING | Trip 到达上车点 | advanceTrip 内部更新 |
| CUSTOMER_ONBOARD | 乘客上车 | advanceTrip 内部更新 |
| ON_THE_WAY_DESTINATION | 出发前往目的地 | advanceTrip 内部更新 |
| ARRIVED_DESTINATION | Trip 到达目的地 | advanceTrip 内部更新 |

> 注：这些中间状态的流转由 Trip 的 advanceTrip 函数驱动，ServiceOrder 的状态同步更新发生在 advanceTrip 内部的 `updateServiceOrderForTrip` 调用中。SimulationLoop 不需要为这些状态单独触发 ServiceOrder 动作。

---

## 5. 需要调用的已有业务能力

| 动作 | 对应现有函数 | 位置 |
|---|---|---|
| 价格预估 | `estimateServiceOrderPrice(serviceOrderId)` | `src/main.jsx:1297` |
| 呼叫 Robotaxi | `callRobotaxiForServiceOrder(serviceOrderId)` | `src/main.jsx:1397` |
| 订单匹配 | `matchServiceOrder(serviceOrderId)` | `src/main.jsx:1415` |
| 结算 | `settleServiceOrder(serviceOrderId)` | `src/main.jsx:1508` |
| 支付 | `payServiceOrder(serviceOrderId)` | `src/main.jsx:1569` |

> 实现 Simulation System 时，需将这些函数从 UI handler 中提取为可独立调用的服务函数，供 UI 和 SimulationLoop 两条路径复用。

---

## 6. 自动化开关

ServiceOrder 各环节的自动触发由 `SimulationPolicy.service_order_auto_config` 控制：

```json
{
  "auto_pricing_enabled": true,
  "auto_customer_confirm_enabled": true,
  "auto_order_matching_enabled": true,
  "auto_trip_creation_enabled": true,
  "auto_trip_progress_enabled": true,
  "auto_payment_enabled": true
}
```

当前阶段建议全部开启。

---

## 7. 异常路径

| 环节 | 异常 | 处理 |
|---|---|---|
| 价格预估失败 | `order_status → FAILED` | 记录 SimulationEvent，该订单终止 |
| 订单匹配失败 | `order_status → ROBOTAXI_ASSIGNMENT_FAILED` | 记录 SimulationEvent，下一 Tick 可重试匹配 |
| 结算失败 | `event_type = SETTLEMENT_FAILED` | 记录 SimulationEvent，当前阶段不自动重试 |
| 用户取消 | `order_status → CANCELLED` | 模拟系统当前阶段不模拟取消场景 |

---

## 8. 不做什么

```text
不重写定价逻辑（pricingEngine 不变）
不重写匹配逻辑（orderMatchingEngine 不变）
不重写结算逻辑（serviceOrderSettlement 不变）
不重写 Trip 内部状态推进（advanceTrip 不变）
```
