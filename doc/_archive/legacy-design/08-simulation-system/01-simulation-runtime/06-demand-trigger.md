# Demand-trigger：需求侧随机触发机制

## 1. 目的

本文档定义自动运营模拟系统中需求侧订单生成的触发机制。

需求侧触发负责根据当前模拟时间、时间段、需求强度及配置，批量生成服务订单上下文，并调用已有 DemandSimulationStrategy 完成订单内容生成。

本阶段只关注触发逻辑，不涉及订单匹配、定价或 Trip 执行。

---

## 2. 核心定义

```text
DemandTrigger = 根据模拟时间与策略配置生成需求订单上下文的触发机制
```

作用：

- 在每个 SimulationTick 触发需求生成
    
- 根据 period_type 及订单分布确定生成订单数量
    
- 调用 DemandSimulationStrategy 输出订单上下文
    
- 创建 ServiceOrder 并进入初始状态
    

---

## 3. 输入

|输入|含义|
|---|---|
|simulation_tick|当前 Tick 序号|
|simulation_time|当前模拟时间|
|simulation_run_id|当前模拟执行对象|
|simulation_policy_snapshot|运行引用的规则配置快照|

说明：

```text
simulation_policy_snapshot 来自 SimulationRun，用于保证当前运行中配置固定，不受外部 SimulationPolicy 更新影响。
```

---

## 4. 输出

|输出|含义|
|---|---|
|order_count|当前 Tick 生成的订单数量|
|demand_simulation_runs|每个订单的 DemandSimulationRun|
|service_orders|创建的 ServiceOrder 实例列表|
|SimulationEvent|记录触发事件与生成结果|

---

## 5. 时间依赖

需求生成依赖 SimulationClock 提供的上下文：

```text
current_time
time_period (MORNING / NOON / AFTERNOON / EVENING / NIGHT)
period_type (PEAK / NORMAL)
```

根据 period_type 决定本 Tick 的订单数量分布：

|period_type|order_count_distribution|
|---|---|
|PEAK|Poisson(λ=5)|
|NORMAL|Poisson(λ=2)|

---

## 6. 批量订单生成规则

1. SimulationTick 到达
    
2. 读取 simulation_policy_snapshot 中的 period_type 对应订单分布
    
3. 根据 Poisson 随机生成本 Tick 的订单数量 `N`
    
4. 循环调用 DemandSimulationStrategy `N` 次：
    
    - 生成 DemandSimulationRun
        
    - 输出客户、起点位置、上车点、下车点
        
5. 创建 `N` 个 ServiceOrder
    
6. 写入 SimulationEvent 并记录快照
    

说明：

```text
DemandTrigger 决定订单数量和触发次数
DemandSimulationStrategy 决定每个订单的具体内容
```

---

## 7. 客户选择规则

1. 仅从 Customer Pool 中筛选 `customer_status = ACTIVE`
    
2. 随机选择客户，支持高峰期和非高峰期差异化触发
    
3. 同一 Tick 内可重复选择不同客户
    
4. 客户位置和上下车点由 DemandSimulationStrategy 随机生成
    
5. 客户历史位置不影响当前订单生成
    

---

## 8. 订单上下文生成

调用 DemandSimulationStrategy：

```text
输入:
- customer_id
- location_type 权重 (PLACE 60%, ROAD_SEGMENT 30%, CELL 10%)
- customer_origin_cell_id
输出:
- pickup_service_area_id
- pickup_cell_id
- dropoff_service_area_id
- dropoff_cell_id
- random_seed (可复现)
```

---

## 9. 异常与失败条件

|failure_reason|条件|
|---|---|
|NO_ACTIVE_CUSTOMER|Customer Pool 中没有 ACTIVE 客户|
|NO_AVAILABLE_PLACE|location_type = PLACE 但无可用 Place|
|NO_AVAILABLE_ROAD_SEGMENT|location_type = ROAD_SEGMENT 但无可用 RoadSegment|
|CUSTOMER_LOCATION_INVALID|无法生成有效 customer_origin_cell_id|
|NO_AVAILABLE_PICKUP_CELL|无可用上车点|
|NO_AVAILABLE_DROPOFF_CELL|无可用下车点|

失败时：

```text
simulation_result = FAILED
不创建 ServiceOrder
记录 SimulationEvent
```

---

## 10. 核心规则

1. DemandTrigger 每个 Tick 批量生成订单
    
2. 订单数量由 SimulationRun 内的 simulation_policy_snapshot 决定
    
3. DemandSimulationStrategy 决定每个订单的客户和上下车位置
    
4. 同一 Tick 内可生成 0~N 个订单
    
5. ServiceOrder 创建完成后进入 PricingDecision
    
6. 所有生成和触发事件必须记录 SimulationEvent 快照
    
7. SimulationRun 保存引用 snapshot，保证后续可复现
    
8. 配置更新不会影响正在执行的 SimulationRun
    
9. 当前阶段不实现需求预测
    
10. 当前阶段不受 Worker 和 Robotaxi 状态限制
    

---

## 11. 示例流程

```text
当前 Tick = 51
period_type = PEAK
simulation_policy_snapshot
↓
Poisson 随机生成订单数量 N = 5
↓
循环调用 DemandSimulationStrategy 5 次
↓
生成 5 个 DemandSimulationRun
↓
创建 5 个 ServiceOrder
↓
写入 SimulationEvent
↓
进入 PricingDecision
```

说明：

```text
Tick 到达一次，可能生成多订单
数量由 period_type 决定，内容由 DemandSimulationStrategy 随机生成
```