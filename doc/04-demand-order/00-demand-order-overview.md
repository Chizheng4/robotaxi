# Demand-order-overview：需求侧订单体系总览

## 1. 目的

本文档定义 Robotaxi 最小运营闭环中的需求侧订单体系。

当前系统已经完成供给侧能力：

```text
Robotaxi
OpsCenter
ReadinessCheckTask
DeploymentTask
RoutePlanningStrategy
RoutePlanningRun
Route
RouteExecution
```

从本阶段开始，系统进入需求侧订单闭环设计。

需求侧订单体系用于模拟客户发起出行需求，并完成：

```text
客户需求模拟
↓
服务订单创建
↓
价格预估
↓
客户确认
↓
订单匹配
↓
Robotaxi 接驾
↓
乘客上车
↓
Robotaxi 载客
↓
乘客下车
↓
订单完成
```

---

## 2. 核心原则

```text
供给侧任务由 Task 驱动
需求侧订单由 ServiceOrder 驱动
```

当前阶段不设计 ServiceTask。

原因：

```text
ServiceOrder 本身就是客户服务订单与履约主单据。
如果再增加 ServiceTask，会造成 ServiceOrder、ServiceTask、Trip 状态重复。
```

核心关系：

```text
Customer
↓
DemandSimulationStrategy
↓
DemandSimulationRun
↓
ServiceOrder
↓
PricingDecision
↓
OrderMatchingDecision
↓
Robotaxi
↓
Trip
↓
RoutePlanningRun
↓
Route
```

---

## 3. 核心对象

|对象|职责|
|---|---|
|Customer|客户，需求发起主体|
|DemandSimulationStrategy|需求模拟策略|
|DemandSimulationRun|需求模拟策略执行记录|
|ServiceOrder|服务订单，客户出行需求与平台服务承诺|
|PricingDecision|价格预估 / 报价决策|
|OrderMatchingDecision|订单匹配 Robotaxi 的决策|
|Robotaxi|服务执行资源|
|Trip|服务履约记录|
|RoutePlanningRun|路径规划执行记录|
|Route|路径规划结果|

---

## 4. 文件结构（仅为参考，后续可能根据实际变化）

需求订单模块：

```text
04-demand-order/
├── 00-demand-order-overview.md
├── 01-customer.md
├── 02-service-order.md
└── initialization-demand-order.md
```

履约模块：

```text
05-dispatch-trip/
├── 01-route-execution.md
├── 02-route.md
└── 03-trip.md
```

运营决策中心：

07-operations-decision/  
├── 05-route-planning-strategy.md  
├── 06-demand-simulation-strategy.md  
├── 07-pricing-decision.md  
└── 08-order-matching-decision.md

---

## 5. 订单创建方式

当前没有真实 App 或外部平台输入端，因此使用后台模拟创建订单。

支持两种创建方式：

|创建方式|含义|
|---|---|
|OWN_APP_SIMULATED_ORDER|模拟自有 App 客户下单|
|PARTNER_APP_SIMULATED_ORDER|模拟外部合作平台客户下单|

说明：

```text
虽然由后台按钮触发，但业务语义是模拟客户发起订单。
```

后台按钮不直接创建 ServiceOrder，而是先调用 DemandSimulationStrategy。

字段口径：

```text
Customer.default_order_channel = 客户默认渠道偏好，例如 OWN_APP / PARTNER_APP / MANUAL_TEST
ServiceOrder.order_channel = 本次订单来源，例如 OWN_APP_SIMULATED_ORDER / PARTNER_APP_SIMULATED_ORDER
```

二者不能混用。

---

## 6. 需求模拟策略

需求侧订单具有不确定性。

因此，客户、客户位置、上车点、下车点不应由固定规则直接生成，而应由需求模拟策略生成。

当前采用：

```text
DemandSimulationStrategy = 需求模拟策略
DemandSimulationRun = 一次需求模拟策略执行记录
```

当前阶段先定义一个基础策略：

```text
DSS-001：基础随机需求模拟策略
```

作用：

```text
随机选择 Customer
随机生成客户需求位置
映射 pickup_service_area_id / pickup_cell_id
随机生成 dropoff_service_area_id / dropoff_cell_id
输出订单创建上下文
```

说明：

```text
DemandSimulationStrategy 不等于 DemandForecast。
当前阶段是可控随机需求模拟，不是需求预测。
```

---

## 7. 需求随机性

每次模拟创建订单：

```text
后台点击创建订单
↓
传入 order_channel
↓
调用 DemandSimulationStrategy
↓
生成 DemandSimulationRun
↓
输出订单创建上下文
↓
创建 ServiceOrder
↓
触发 PricingDecision
↓
等待客户确认
```

不允许：

```text
为所有客户批量创建订单
按固定顺序轮流创建订单
为所有 Place 固定创建订单
```

---

## 8. 位置原则

客户当前位置不一定在 ServiceArea。

客户可以位于：

```text
Place
RoadSegment 附近
普通 Cell
```

但上车点和下车点必须映射到支持服务的 ServiceArea：

```text
客户当前位置
↓
pickup_service_area_id / pickup_cell_id
```

```text
目的地
↓
dropoff_service_area_id / dropoff_cell_id
```

---

## 9. 订单核心流程

```text
模拟客户下单
↓
DemandSimulationRun
↓
ServiceOrder.CREATED
↓
PricingDecision 生成报价
↓
ServiceOrder.WAITING_CUSTOMER_CONFIRM
↓
客户确认 / 取消
↓
ServiceOrder.WAITING_FOR_VEHICLE
↓
OrderMatchingDecision 匹配 Robotaxi
↓
ServiceOrder.VEHICLE_ASSIGNED
↓
Trip.ON_THE_WAY_PICKUP
↓
Robotaxi 接驾
↓
乘客上车确认
↓
Trip.ON_THE_WAY_DESTINATION
↓
Robotaxi 载客
↓
乘客下车确认
↓
支付完成
↓
Trip.COMPLETED
↓
ServiceOrder.COMPLETED
↓
Robotaxi 释放为可运营供给
```

---

## 10. 取消边界

客户在上车确认前可以取消订单。

允许取消的阶段：

```text
WAITING_CUSTOMER_CONFIRM
WAITING_FOR_VEHICLE
VEHICLE_ASSIGNED
VEHICLE_ON_THE_WAY_TO_PICKUP
VEHICLE_ARRIVED_PICKUP
WAITING_PASSENGER_BOARDING
```

乘客上车确认后，订单进入履约阶段，取消规则后续扩展。

---

## 11. 当前不做内容

本阶段不做：

```text
真实 App 接入
真实外部平台 API
ServiceTask
复杂动态定价
需求预测生成订单
自动订单洪峰模拟
完整结算系统
客户画像
优惠券
投诉售后
```

当前只做：

```text
客户模拟
需求随机模拟
订单模拟
价格预估
客户确认 / 取消
订单匹配
接驾
载客
支付
订单完成
```

---

## 12. 核心规则

1. ServiceOrder 是需求侧客户订单；
    
2. ServiceOrder 是客户服务履约主单据；
    
3. 当前阶段不设计 ServiceTask；
    
4. Customer 是 ServiceOrder 的发起主体；
    
5. 订单创建先调用 DemandSimulationStrategy；
    
6. DemandSimulationRun 记录一次需求模拟执行；
    
7. ServiceOrder 应记录 demand_simulation_run_id；
    
8. 客户当前位置不一定在 ServiceArea；
    
9. 上下车点必须映射到 ServiceArea；
    
10. PricingDecision 负责价格预估；
    
11. OrderMatchingDecision 负责订单匹配；
    
12. Trip 记录服务履约过程；
    
13. 订单完成后 Robotaxi 释放为可运营供给。
