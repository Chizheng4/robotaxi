# Trip：服务履约记录

## 1. 定义

Trip 是基于 ServiceOrder 生成的 Robotaxi 服务履约记录。

```text
Trip = 记录 Robotaxi 执行 ServiceOrder 的全过程，包括接驾、载客、到达目的地及相关异常
```

Trip 用于模拟服务订单的履约执行过程，并记录 Robotaxi 在服务过程中的行驶、状态及事件信息。

Trip 不等同于 RouteExecution，后者为运营任务类行驶记录；Trip 是服务订单履约记录。

---

## 2. 核心定位

```text
ServiceOrder = 客户服务订单
Trip = 服务履约记录
RoutePlanningRun = 路径规划执行记录
RouteExecution = 运营行驶记录
Robotaxi = 执行资源
```

Trip 负责：

```text
执行 ServiceOrder 的接驾、载客和送达过程
记录 Robotaxi 当前位置与状态
记录行驶事件和异常
保存服务过程数据
```

Trip 不负责：

```text
创建 ServiceOrder
计算价格
执行动态定价策略
执行运营投放任务
创建 RouteExecution
```

---

## 3. 核心属性

|字段|含义|
|---|---|
|trip_id|服务履约记录编号|
|service_order_id|关联 ServiceOrder|
|robotaxi_id|执行 Robotaxi|
|pickup_cell_id|上车 Cell|
|pickup_service_area_id|上车 ServiceArea|
|dropoff_cell_id|下车 Cell|
|dropoff_service_area_id|下车 ServiceArea|
|current_cell_id|当前 Cell|
|current_step_index|当前执行到 Route 的 Step|
|total_step_count|Route 总 Step 数|
|distance_traveled_km|已行驶距离|
|distance_remaining_km|剩余距离|
|time_elapsed|已耗时|
|trip_status|Trip 当前状态|
|arrival_execution_result|到达结果：正常或异常|
|started_at|开始时间|
|completed_at|完成时间|
|failure_reason|失败原因，可为空|
|route_id|当前执行 Route 编号|
|route_planning_run_id|路径规划执行记录编号|
|route_history|服务履约路径历史|
|event_log|事件记录数组|

说明：

```text
Trip 包含服务订单履约全流程信息，便于追踪和分析。
```

---

## 4. trip_status

Trip 状态表示服务履约过程阶段。

|trip_status|含义|下一步动作|
|---|---|---|
|PENDING|等待 Robotaxi 接单|等待车辆匹配|
|ASSIGNED|车辆已分配|Robotaxi 前往接驾|
|ON_THE_WAY_PICKUP|接驾中|Robotaxi 继续接驾|
|ARRIVED_PICKUP|已到达上车点|等待乘客上车确认|
|PASSENGER_ONBOARD|乘客已上车|Robotaxi 前往目的地|
|ON_THE_WAY_DESTINATION|行驶中|继续前往目的地|
|ARRIVED_DESTINATION|已到达目的地|等待乘客下车及结算|
|COMPLETED|服务完成|释放 Robotaxi 为可运营|
|FAILED|服务执行失败|记录异常并通知运营决策|
|CANCELLED|服务取消|释放 Robotaxi 并结束|

---

## 5. Trip 生命周期

```text
ServiceOrder.MATCHED
↓
创建 Trip
↓
trip_status = PENDING
↓
Robotaxi 前往 pickup_cell_id
↓
trip_status = ON_THE_WAY_PICKUP
↓
Robotaxi 到达 pickup_cell_id
↓
trip_status = ARRIVED_PICKUP
↓
乘客上车确认
↓
trip_status = PASSENGER_ONBOARD
↓
Robotaxi 行驶至 dropoff_cell_id
↓
trip_status = ON_THE_WAY_DESTINATION
↓
到达 dropoff_cell_id
↓
trip_status = ARRIVED_DESTINATION
↓
乘客下车
↓
最终结算完成
↓
trip_status = COMPLETED
```

异常流程：

```text
乘客未上车 → CANCELLED
路径阻塞或 Robotaxi 故障 → FAILED
目的地变更 → ON_THE_WAY_DESTINATION 重规划 RoutePlanningRun
```

---

## 6. 与 ServiceOrder 的关系

Trip 直接关联 ServiceOrder。

```text
Trip.trip_id
↓
ServiceOrder.trip_id
```

Trip 记录服务履约全过程，ServiceOrder 保留状态和价格信息。

---

## 7. 与 Robotaxi 的关系

```text
1 个 Trip 对应 1 台 Robotaxi
1 台 Robotaxi 同一时间只能执行 1 个 Trip
Robotaxi.current_order_id = ServiceOrder.service_order_id
Robotaxi 在 Trip 执行过程中位置随 current_cell_id 更新
Trip 完成后 Robotaxi 释放为可运营状态
```

---

## 8. 与 RoutePlanningRun 的关系

```text
Trip 执行过程中可能触发新的 RoutePlanningRun
↓
生成 Route
↓
更新 current_step_index / route_id
```

---

## 9. 与 RouteExecution 的关系

Trip 与 RouteExecution 必须保持边界清晰：

- RouteExecution：运营行驶记录，由 Task 驱动
    
- Trip：服务履约记录，由 ServiceOrder 驱动
    
- 二者都可以引用 Route，但不互相复用对方的执行记录

- Trip 自身保留 route_id、route_history、事件与状态

说明：

```text
Route 是路径规划结果。
RouteExecution 是运营任务执行 Route 的记录。
Trip 是服务订单履约执行 Route 的记录。
Trip 不创建 RouteExecution，也不依赖 RouteExecution 才能推进。
```
    

---

## 10. 事件记录

Trip 执行全流程均生成 TaskEventLog。

典型事件：

|event_type|含义|
|---|---|
|TRIP_CREATED|创建 Trip|
|TRIP_STARTED|开始接驾|
|ROBOTAXI_MOVING_PICKUP|Robotaxi 前往上车|
|ROBOTAXI_ARRIVED_PICKUP|Robotaxi 到达上车点|
|PASSENGER_ONBOARD_CONFIRMED|乘客上车确认|
|TRIP_STARTED_DESTINATION|开始前往目的地|
|ROBOTAXI_MOVING_DESTINATION|Robotaxi 行驶中|
|ARRIVED_DESTINATION|到达目的地|
|PASSENGER_DROPPED_OFF|乘客下车|
|TRIP_COMPLETED|服务完成|
|TRIP_FAILED|服务履约失败|
|TRIP_CANCELLED|服务取消|
|ROUTE_REPLANNED|路径重规划|
|PAYMENT_COMPLETED|支付完成|

---

## 11. 核心规则

1. Trip 由 ServiceOrder 生成并执行；
    
2. Trip 记录服务履约全过程；
    
3. Trip 不复用 RouteExecution；二者都可以引用 Route，但执行记录独立；
    
4. Trip 当前状态由 trip_status 表示；
    
5. Trip 当前执行位置由 current_cell_id 表示；
    
6. 异常到达触发 RoutePlanningRun 重规划，Trip 状态更新；
    
7. Trip 完成后反馈 ServiceOrder，并释放 Robotaxi；
    
8. Trip 中事件记录由 TaskEventLog 保存；
    
9. Trip 与 RouteExecution 区分：Trip 为服务履约，RouteExecution 为运营行驶。
