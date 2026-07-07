# Simulation-event：模拟事件记录

## 1. 目的

本文档定义自动运营模拟系统中的 SimulationEvent。

SimulationEvent 用于记录 SimulationRun 在每个 Tick 中触发了什么事件、事件由谁触发、关联了哪个业务对象、执行结果是什么。

SimulationEvent 的作用是让自动模拟过程可观察、可追踪、可复盘。

本文档只定义模拟事件记录对象。

不定义：

```text
SimulationClock 时间规则
SimulationRun 运行状态
SimulationPolicy 配置内容
SupplyTrigger 供给侧触发逻辑
DemandTrigger 需求侧触发逻辑
业务对象内部状态流转
```

---

## 2. 核心定义

SimulationEvent 是自动运营模拟系统中的事件记录。

```text
SimulationEvent = Simulation System 在模拟运行过程中产生的事件记录
```

它用于回答：

```text
当前 Tick 触发了什么？
事件来源是什么？
事件关联了哪个业务对象？
事件是否执行成功？
事件是否被跳过？
事件失败原因是什么？
这次事件发生在模拟时间的哪个位置？
```

SimulationEvent 是模拟系统的观察记录，不是业务对象本身。

---

## 3. 核心定位

```text
SimulationRun = 一次模拟运行
SimulationTick = 一次模拟时间推进
SimulationEvent = 一次模拟事件记录
BusinessObject = 被触发或被影响的业务对象
```

关系如下：

```text
SimulationRun
↓
SimulationTick
↓
SimulationEvent
↓
BusinessObject
```

说明：

```text
SimulationRun 负责运行。
SimulationTick 负责推进时间。
SimulationEvent 负责记录本 Tick 中发生的模拟事件。
业务对象负责自身业务逻辑。
```

---

## 4. SimulationEvent 的边界

SimulationEvent 只记录事件，不执行业务逻辑。

SimulationEvent 不负责：

```text
创建 ReadinessCheckTask
创建 DeploymentTask
创建 ServiceOrder
创建 Trip
执行 PricingStrategy
执行 OrderMatchingStrategy
执行 RoutePlanningStrategy
推进 RouteExecution
推进 Trip
判断 Worker 是否空闲
判断 Robotaxi 是否可用
```

这些由对应业务对象和业务服务完成。

SimulationEvent 只记录：

```text
事件被触发了
事件调用了什么业务能力
事件产生了什么结果
事件关联了哪些对象
事件是否成功
事件是否失败
事件是否跳过
```

---

## 5. 核心属性

|字段|含义|
|---|---|
|simulation_event_id|模拟事件唯一编号|
|simulation_run_id|所属 SimulationRun|
|simulation_day|当前模拟第几天|
|simulation_time|当前模拟时间|
|day_tick|当天 Tick|
|global_tick|全局 Tick|
|event_type|事件类型|
|event_source|事件来源|
|related_object_type|关联业务对象类型|
|related_object_id|关联业务对象 ID|
|event_result|事件结果|
|failure_reason|失败原因，可为空|
|skip_reason|跳过原因，可为空|
|message|可读事件说明|
|event_payload|事件输入或输出快照|
|created_at|真实创建时间|

---

## 6. event_source

event_source 表示事件由模拟系统中的哪个模块触发。

|event_source|含义|
|---|---|
|SIMULATION_RUN|模拟运行|
|SIMULATION_CLOCK|模拟时钟|
|SUPPLY_TRIGGER|供给侧触发器|
|DEMAND_TRIGGER|需求侧触发器|
|SIMULATION_LOOP|Tick 主循环|
|BUSINESS_SERVICE|业务服务返回结果|

说明：

```text
event_source 用于区分事件来源。
```

例如：

```text
DEMAND_TRIGGER 触发订单生成事件
BUSINESS_SERVICE 返回 ServiceOrder 创建结果
```

---

## 7. related_object_type

related_object_type 表示事件关联的业务对象类型。

当前阶段支持：

|related_object_type|含义|
|---|---|
|SIMULATION_RUN|模拟运行|
|READINESS_CHECK_TASK|运营准入任务|
|DEPLOYMENT_TASK|运营投放任务|
|ROUTE_EXECUTION|运营行驶记录|
|CUSTOMER|客户|
|DEMAND_SIMULATION_RUN|需求模拟执行记录|
|SERVICE_ORDER|服务订单|
|PRICING_DECISION|定价决策|
|ORDER_MATCHING_DECISION|订单匹配决策|
|TRIP|服务履约记录|
|ROUTE_PLANNING_RUN|路径规划执行记录|
|ROUTE|路径|
|ROBOTAXI|Robotaxi|
|WORKER|Worker|

说明：

```text
一个事件可以主要关联一个对象。
如果需要关联多个对象，可在 event_payload 中记录补充对象。
```

---

## 8. event_result

event_result 表示事件结果。

|event_result|含义|
|---|---|
|SUCCESS|事件成功|
|FAILED|事件失败|
|SKIPPED|事件被跳过|
|TRIGGERED|事件已触发，等待业务服务处理|
|NO_ACTION|事件触发后无业务动作产生|

说明：

```text
NO_ACTION 不是失败。
NO_ACTION 表示事件检查或触发发生了，但业务对象根据自身逻辑没有创建新对象或没有推进状态。
```

例如：

```text
供给侧触发运营准入事件
但业务逻辑发现没有待准入 Robotaxi
则记录 NO_ACTION
```

---

## 9. 供给侧事件类型

供给侧事件由 Simulation System 触发，但资源判断和任务创建由供给侧业务逻辑完成。

|event_type|含义|
|---|---|
|SUPPLY_TRIGGER_STARTED|供给侧触发开始|
|READINESS_CHECK_TRIGGERED|触发运营准入业务逻辑|
|READINESS_CHECK_NO_ACTION|运营准入无动作|
|READINESS_CHECK_CREATED|创建运营准入任务|
|READINESS_CHECK_COMPLETED|运营准入完成|
|DEPLOYMENT_TRIGGERED|触发运营投放业务逻辑|
|DEPLOYMENT_NO_ACTION|运营投放无动作|
|DEPLOYMENT_TASK_CREATED|创建运营投放任务|
|DEPLOYMENT_TASK_COMPLETED|运营投放完成|
|ROUTE_EXECUTION_TRIGGERED|触发行驶记录推进|
|ROUTE_EXECUTION_COMPLETED|行驶记录完成|

说明：

```text
SimulationEvent 可以记录触发事件，也可以记录业务服务返回结果。
```

---

## 10. 需求侧事件类型

需求侧事件用于记录 Tick 级订单数量生成和 DemandSimulationStrategy 调用结果。

|event_type|含义|
|---|---|
|DEMAND_TRIGGER_STARTED|需求侧触发开始|
|ORDER_COUNT_GENERATED|当前 Tick 订单数量已生成|
|DEMAND_SIMULATION_TRIGGERED|触发需求模拟策略|
|DEMAND_SIMULATION_COMPLETED|需求模拟完成|
|DEMAND_SIMULATION_FAILED|需求模拟失败|
|SERVICE_ORDER_CREATED|服务订单创建|
|SERVICE_ORDER_CREATE_FAILED|服务订单创建失败|

说明：

```text
ORDER_COUNT_GENERATED 记录本 Tick 生成多少订单。
DEMAND_SIMULATION_TRIGGERED 记录每一次订单上下文生成。
```

---

## 11. 订单自动化事件类型

ServiceOrder 创建后，自动化模拟系统可以触发订单后续流程。

|event_type|含义|
|---|---|
|SERVICE_ORDER_PRICING_TRIGGERED|触发订单定价|
|SERVICE_ORDER_PRICED|订单定价完成|
|SERVICE_ORDER_AUTO_CONFIRMED|客户自动确认订单|
|ORDER_MATCHING_TRIGGERED|触发订单匹配|
|ORDER_MATCHED|订单匹配成功|
|ORDER_MATCH_FAILED|订单匹配失败|

说明：

```text
具体定价逻辑由 PricingStrategy / PricingStrategyRun / PricingDecision 完成。
具体匹配逻辑由 OrderMatchingStrategy / OrderMatchingRun / OrderMatchingDecision 完成。
```

---

## 12. Trip 自动化事件类型

Trip 事件用于记录服务履约过程的自动推进。

|event_type|含义|
|---|---|
|TRIP_CREATED|Trip 创建|
|TRIP_PICKUP_TRIGGERED|触发接驾阶段|
|TRIP_PICKUP_STARTED|接驾开始|
|TRIP_ARRIVED_PICKUP|到达上车点|
|PASSENGER_AUTO_BOARDED|乘客自动上车|
|TRIP_SERVICE_TRIGGERED|触发载客阶段|
|TRIP_SERVICE_STARTED|载客开始|
|TRIP_ARRIVED_DESTINATION|到达目的地|
|PASSENGER_AUTO_DROPPED_OFF|乘客自动下车|
|PAYMENT_AUTO_COMPLETED|支付自动完成|
|TRIP_COMPLETED|Trip 完成|

说明：

```text
当前阶段默认 Trip 正常完成。
异常事件后续版本再引入。
```

---

## 13. 路径规划事件类型

路径规划事件用于记录 Simulation System 触发路径规划相关业务能力。

|event_type|含义|
|---|---|
|ROUTE_PLANNING_TRIGGERED|触发路径规划|
|ROUTE_PLANNING_COMPLETED|路径规划完成|
|ROUTE_PLANNING_FAILED|路径规划失败|
|ROUTE_CREATED|Route 创建|

说明：

```text
RoutePlanningStrategy 负责生成路径规划结果。
SimulationEvent 只记录触发与结果。
```

---

## 14. 运行控制事件类型

运行控制事件用于记录 SimulationRun 的控制动作。

|event_type|含义|
|---|---|
|SIMULATION_RUN_CREATED|模拟运行创建|
|SIMULATION_RUN_STARTED|模拟运行开始|
|SIMULATION_RUN_PAUSED|模拟运行暂停|
|SIMULATION_RUN_RESUMED|模拟运行继续|
|SIMULATION_RUN_STOPPED|模拟运行停止|
|SIMULATION_RUN_COMPLETED|模拟运行完成|
|SIMULATION_RUN_FAILED|模拟运行失败|

---

## 15. Tick 事件类型

Tick 事件用于记录每次 Tick 推进。

|event_type|含义|
|---|---|
|SIMULATION_TICK_STARTED|Tick 开始|
|SIMULATION_TICK_COMPLETED|Tick 完成|
|SIMULATION_SCENE_UPDATED|当前场景上下文更新|
|SIMULATION_STATE_SNAPSHOT_CREATED|状态快照生成|

说明：

```text
每个 Tick 至少应记录 SIMULATION_TICK_STARTED 和 SIMULATION_TICK_COMPLETED。
```

---

## 16. event_payload

event_payload 用于记录事件快照。

不同事件可保存不同内容。

### 16.1 ORDER_COUNT_GENERATED 示例

```json
{
  "period_type": "PEAK",
  "distribution": "Poisson(lambda=5)",
  "order_count": 6
}
```

### 16.2 SERVICE_ORDER_CREATED 示例

```json
{
  "service_order_id": "SO-001",
  "customer_id": "CU-018",
  "pickup_cell_id": "C-12-18",
  "dropoff_cell_id": "C-28-26"
}
```

### 16.3 ORDER_MATCHED 示例

```json
{
  "service_order_id": "SO-001",
  "order_matching_decision_id": "OMD-001",
  "selected_robotaxi_id": "RTX-006"
}
```

### 16.4 TRIP_COMPLETED 示例

```json
{
  "trip_id": "TRIP-001",
  "service_order_id": "SO-001",
  "robotaxi_id": "RTX-006"
}
```

---

## 17. message

message 是事件的可读说明，用于前端展示。

示例：

```text
第 1 天 08:30，上午高峰期，当前 Tick 生成 6 个服务订单。
```

```text
第 1 天 08:40，订单 SO-001 匹配 Robotaxi RTX-006 成功。
```

```text
第 1 天 09:00，Trip TRIP-001 已完成。
```

说明：

```text
message 应优先使用中文，便于运营人员理解。
```

---

## 18. 与 SimulationRun 的关系

一个 SimulationRun 会产生多条 SimulationEvent。

```text
SimulationRun
└── SimulationEvent[]
```

SimulationRun 保存运行摘要。

SimulationEvent 保存事件明细。

```text
SimulationRun = 当前运行状态和摘要
SimulationEvent = 每个 Tick 的事件过程
```

---

## 19. 与 SimulationTick 的关系

每个 Tick 可以产生多条 SimulationEvent。

```text
SimulationTick
└── SimulationEvent[]
```

例如一个 Tick 中可能同时发生：

```text
Tick 开始
供给侧触发
需求侧生成订单
服务订单定价
订单匹配
Trip 推进
Tick 完成
```

因此：

```text
1 个 Tick ≠ 1 个事件
1 个 Tick 可以包含多个事件
```

---

## 20. 前端展示要求

SimulationEvent 页面应支持：

```text
按 SimulationRun 查看事件
按 Tick 查看事件
按事件类型筛选
按事件结果筛选
按业务对象筛选
查看事件详情
查看 event_payload
```

建议列表字段：

```text
模拟运行
模拟时间
Tick
事件类型
事件来源
关联对象
事件结果
事件说明
```

---

## 21. 当前不做内容

当前阶段不做：

```text
复杂事件回放
事件补偿机制
事件重试机制
事件订阅系统
事件总线
分布式事件处理
异步消息队列
```

当前只做：

```text
记录模拟事件
记录事件结果
记录关联对象
记录事件快照
支持前端查看和筛选
```

---

## 22. 规则

1. SimulationEvent 是模拟事件记录；
    
2. SimulationEvent 不执行业务逻辑；
    
3. SimulationEvent 不判断业务状态；
    
4. SimulationEvent 必须属于一个 SimulationRun；
    
5. SimulationEvent 必须记录模拟时间和 Tick；
    
6. 一个 Tick 可以产生多条 SimulationEvent；
    
7. 事件明细由 SimulationEvent 记录；
    
8. SimulationRun 只保存摘要；
    
9. event_payload 保存事件快照；
    
10. message 应优先中文展示；
    
11. 事件结果必须明确 SUCCESS / FAILED / SKIPPED / TRIGGERED / NO_ACTION；
    
12. 供给侧 NO_ACTION 不代表失败；
    
13. 当前阶段不做事件重试和事件补偿。