# Order-matching-decision：订单匹配决策

## 1. 定义

订单匹配用于将已确认的 ServiceOrder 与一台可执行服务的 Robotaxi 进行匹配。

订单匹配采用三对象结构：

```text
OrderMatchingStrategy = 订单匹配策略对象
OrderMatchingRun = 订单匹配策略执行记录
OrderMatchingDecision = 订单匹配决策结果
```

三者关系：

```text
OrderMatchingStrategy
↓
OrderMatchingRun
↓
OrderMatchingDecision
↓
ServiceOrder / Robotaxi / Trip
```

---

## 2. 核心定位

```text
ServiceOrder = 客户服务订单
OrderMatchingStrategy = 匹配规则与算法
OrderMatchingRun = 一次匹配策略执行记录
OrderMatchingDecision = 本次匹配决策结果
Robotaxi = 可用服务资源
Trip = 服务履约记录
```

OrderMatchingStrategy 负责定义匹配规则。

OrderMatchingRun 负责记录一次策略调用。

OrderMatchingDecision 负责保存本次匹配结果。

调用方根据 OrderMatchingDecision 更新：

```text
ServiceOrder
Robotaxi
Trip
```

OrderMatchingDecision 本身不直接修改业务对象状态。

---

## 3. 对象边界

### 3.1 OrderMatchingStrategy

OrderMatchingStrategy 是可复用的匹配策略模板。

它定义：

```text
使用什么匹配算法
候选 Robotaxi 如何筛选
距离如何计算
电量如何校验
优先级如何排序
匹配失败如何返回
```

OrderMatchingStrategy 不绑定具体订单。

---

### 3.2 OrderMatchingRun

OrderMatchingRun 是一次匹配策略执行记录。

它记录：

```text
哪个 ServiceOrder 触发匹配
使用了哪个 OrderMatchingStrategy
输入候选 Robotaxi 集合
筛选过程
排序结果
是否匹配成功
失败原因
```

OrderMatchingRun 用于回溯、调试和后续优化。

---

### 3.3 OrderMatchingDecision

OrderMatchingDecision 是本次匹配决策结果。

它记录：

```text
是否匹配成功
选中了哪台 Robotaxi
为什么选中
为什么失败
匹配评分
候选车辆数量
匹配算法
```

OrderMatchingDecision 是调用方更新 ServiceOrder、Robotaxi、Trip 的依据。

---

## 4. 当前策略

当前阶段只定义一个基础策略。

|order_matching_strategy_id|strategy_name|matching_algorithm|
|---|---|---|
|OMS-001|最近可用车辆匹配策略|BASIC_NEAREST_AVAILABLE_ROBOTAXI|

当前阶段采用：

```text
候选筛选 + 最近距离优先
```

暂不做全局最优派单。

---

## 5. OrderMatchingStrategy 属性

|字段|含义|
|---|---|
|order_matching_strategy_id|订单匹配策略编号|
|strategy_name|策略名称|
|matching_algorithm|匹配算法|
|candidate_filter_rule|候选车辆筛选规则|
|distance_rule|距离计算规则|
|battery_rule|电量校验规则|
|scoring_rule|评分规则|
|strategy_status|策略状态|
|created_at|创建时间|

strategy_status：

|strategy_status|含义|
|---|---|
|ACTIVE|可使用|
|INACTIVE|不可使用|
|ARCHIVED|已归档|

---

## 6. OrderMatchingRun 属性

|字段|含义|
|---|---|
|order_matching_run_id|匹配策略执行记录编号|
|order_matching_strategy_id|使用的匹配策略|
|matching_algorithm|使用的匹配算法|
|service_order_id|关联服务订单|
|pickup_cell_id|上车 Cell|
|pickup_service_area_id|上车 ServiceArea|
|candidate_robotaxi_count|初始候选车辆数量|
|eligible_robotaxi_count|通过筛选车辆数量|
|selected_robotaxi_id|选中的 Robotaxi，可为空|
|input_snapshot|输入快照|
|candidate_snapshot|候选车辆快照|
|output_snapshot|输出快照|
|run_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|
|created_at|执行时间|

---

## 7. OrderMatchingDecision 属性

|字段|含义|
|---|---|
|order_matching_decision_id|匹配决策编号|
|order_matching_run_id|匹配执行记录编号|
|order_matching_strategy_id|匹配策略编号|
|matching_algorithm|匹配算法|
|service_order_id|关联服务订单|
|selected_robotaxi_id|选中的 Robotaxi，可为空|
|pickup_cell_id|上车 Cell|
|pickup_service_area_id|上车 ServiceArea|
|estimated_pickup_distance_km|预估接驾距离|
|estimated_pickup_duration_min|预估接驾时长|
|matching_score|匹配评分|
|decision_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|
|decision_reason|决策说明|
|created_at|创建时间|

---

## 8. 匹配触发条件

ServiceOrder 进入找车阶段后触发订单匹配。

```text
ServiceOrder.order_status = WAITING_FOR_VEHICLE
```

触发流程：

```text
客户确认叫车
↓
ServiceOrder.WAITING_FOR_VEHICLE
↓
调用 OrderMatchingStrategy
↓
生成 OrderMatchingRun
↓
生成 OrderMatchingDecision
```

---

## 9. 策略输入

OrderMatchingStrategy 至少需要以下输入。

|输入|来源|
|---|---|
|service_order_id|ServiceOrder|
|pickup_cell_id|ServiceOrder|
|pickup_service_area_id|ServiceOrder|
|dropoff_cell_id|ServiceOrder|
|available_robotaxi_pool|Robotaxi|
|robotaxi_location|Robotaxi.current_cell_id|
|robotaxi_battery_percent|Robotaxi|
|robotaxi_availability_status|Robotaxi|
|current_order_id|Robotaxi.current_order_id|
|current_task_id|Robotaxi.current_task_id|

---

## 10. 候选 Robotaxi 筛选规则

候选 Robotaxi 必须满足：

```text
Robotaxi.availability_status = AVAILABLE
AND
Robotaxi.current_order_id = null
AND
Robotaxi.current_task_id = null
AND
Robotaxi.current_cell_id 可达 pickup_cell_id
AND
Robotaxi.battery_percent >= min_battery_threshold
```

当前阶段建议：

```text
min_battery_threshold = 20%
```

如果没有候选车辆：

```text
run_result = FAILED
failure_reason = NO_AVAILABLE_ROBOTAXI
```

---

## 11. 匹配算法

当前算法：

```text
matching_algorithm = BASIC_NEAREST_AVAILABLE_ROBOTAXI
```

算法步骤：

```text
读取 ServiceOrder.pickup_cell_id
↓
筛选可用 Robotaxi
↓
计算每台候选 Robotaxi 到 pickup_cell_id 的接驾距离
↓
按接驾距离从小到大排序
↓
选择距离最近的 Robotaxi
↓
生成 OrderMatchingDecision
```

当前阶段距离计算可以采用：

```text
基于 Cell 的近似距离
```

后续可升级为：

```text
基于 RPS-003 的接驾 RoutePlanningRun 距离
```

说明：

```text
当前阶段先保证匹配闭环可运行。
不要求为每台候选 Robotaxi 都执行完整 RoutePlanningRun。
```

---

## 12. 匹配评分

当前阶段使用简单评分。

```text
matching_score = 1 / (1 + estimated_pickup_distance_km)
```

距离越近，评分越高。

如果多个 Robotaxi 分数相同：

```text
优先选择 battery_percent 更高的 Robotaxi
```

如果仍然相同：

```text
随机选择 1 台
```

---

## 13. 匹配成功

匹配成功时：

```text
OrderMatchingRun.run_result = SUCCESS
OrderMatchingDecision.decision_result = SUCCESS
OrderMatchingDecision.selected_robotaxi_id = robotaxi_id
```

调用方随后执行：

```text
ServiceOrder.matched_robotaxi_id = selected_robotaxi_id
ServiceOrder.order_matching_decision_id = order_matching_decision_id
ServiceOrder.order_status = VEHICLE_ASSIGNED

Robotaxi.current_order_id = service_order_id
Robotaxi.available_for_dispatch = false

创建 Trip
Trip.service_order_id = service_order_id
Trip.robotaxi_id = selected_robotaxi_id
```

说明：

```text
以上状态变化属于调用方逻辑。
OrderMatchingDecision 只提供决策结果。
```

---

## 14. 匹配失败

匹配失败时：

```text
OrderMatchingRun.run_result = FAILED
OrderMatchingDecision.decision_result = FAILED
```

ServiceOrder 不应进入接驾阶段。

调用方随后执行：

```text
ServiceOrder.order_status = MATCH_FAILED
ServiceOrder.failure_reason = failure_reason
```

---

## 15. failure_reason

|failure_reason|含义|
|---|---|
|NO_AVAILABLE_ROBOTAXI|没有可用 Robotaxi|
|ROBOTAXI_STATE_INVALID|候选 Robotaxi 状态无效|
|ROBOTAXI_ALREADY_ASSIGNED|Robotaxi 已被其他订单或任务占用|
|PICKUP_CELL_UNREACHABLE|无法到达上车点|
|BATTERY_NOT_ENOUGH|电量不足|
|UNKNOWN|未知原因|

---

## 16. 与 RoutePlanningRun 的关系

当前阶段 OrderMatchingStrategy 不强制调用 RoutePlanningRun。

原因：

```text
匹配阶段需要快速筛选候选 Robotaxi。
如果每台候选车辆都完整执行路径规划，会增加当前最小闭环复杂度。
```

当前阶段：

```text
OrderMatchingStrategy 使用 Cell 近似距离完成匹配
```

匹配成功后：

```text
Trip.ON_THE_WAY_PICKUP
↓
RPS-003
↓
RoutePlanningRun
↓
Route
```

未来可升级为：

```text
对候选 Robotaxi 批量计算接驾 RoutePlanningRun
以 estimated_pickup_duration_min 最短作为匹配依据
```

---

## 17. 与 ServiceOrder 的关系

OrderMatchingDecision 成功后写入 ServiceOrder。

```text
OrderMatchingDecision
↓
ServiceOrder
```

ServiceOrder 保存：

```text
matched_robotaxi_id
order_matching_decision_id
matched_at
```

ServiceOrder 不自己选择 Robotaxi。

---

## 18. 与 Trip 的关系

匹配成功后，调用方创建 Trip。

```text
OrderMatchingDecision.SUCCESS
↓
Trip.CREATED
```

Trip 负责后续服务履约：

```text
接驾
等待上车
载客
到达目的地
下车确认
服务完成
```

OrderMatchingDecision 不负责 Trip 履约过程。

---

## 19. 与 Robotaxi 的关系

匹配成功后，调用方锁定 Robotaxi。

```text
Robotaxi.current_order_id = service_order_id
Robotaxi.available_for_dispatch = false
```

规则：

1. 1 台 Robotaxi 同一时间只能绑定 1 个 ServiceOrder；
    
2. 1 个 ServiceOrder 同一时间只能匹配 1 台 Robotaxi；
    
3. Robotaxi 被匹配后不可再参与其他订单匹配；
    
4. ServiceOrder 完成、取消或失败后，Robotaxi 才释放。
    

---

## 20. TaskEventLog

典型事件：

|event_type|含义|
|---|---|
|ORDER_MATCHING_REQUESTED|请求订单匹配|
|ORDER_MATCHING_STRATEGY_SELECTED|匹配策略已选择|
|ORDER_MATCHING_RUN_STARTED|匹配策略执行开始|
|ORDER_MATCHING_COMPLETED|匹配完成|
|ORDER_MATCHING_FAILED|匹配失败|
|ROBOTAXI_SELECTED|选中 Robotaxi|
|ROBOTAXI_ASSIGNED_TO_ORDER|Robotaxi 绑定订单|
|TRIP_CREATED_AFTER_MATCHING|匹配成功后创建 Trip|

---

## 21. 当前不做内容

本阶段不做：

```text
全局最优派单
多车多单组合优化
批量订单匹配
竞价派单
客户等级优先
复杂车辆偏好
基于未来需求预测的派单
强化学习调度
```

当前只做：

```text
OrderMatchingStrategy
OrderMatchingRun
OrderMatchingDecision
候选车辆筛选
最近可用车辆匹配
匹配结果记录
匹配失败记录
匹配成功后创建 Trip
```

---

## 22. 规则

1. OrderMatchingStrategy 是可复用匹配策略对象；
    
2. OrderMatchingRun 是一次策略执行记录；
    
3. OrderMatchingDecision 是匹配决策结果；
    
4. OrderMatchingDecision 属于运营决策中心；
    
5. OrderMatchingDecision 不直接改变 ServiceOrder、Trip、Robotaxi 状态；
    
6. 调用方负责根据匹配结果更新业务对象；
    
7. 当前阶段 matching_algorithm = BASIC_NEAREST_AVAILABLE_ROBOTAXI；
    
8. 匹配前必须筛选可用 Robotaxi；
    
9. Robotaxi 必须未绑定其他 ServiceOrder；
    
10. Robotaxi 必须未绑定不可中止 Task；
    
11. Robotaxi 必须满足最低电量要求；
    
12. 当前阶段优先选择距离 pickup_cell_id 最近的 Robotaxi；
    
13. 匹配成功后 ServiceOrder 进入 VEHICLE_ASSIGNED；
    
14. 匹配成功后创建 Trip；
    
15. 匹配失败后 ServiceOrder 进入 MATCH_FAILED；
    
16. ServiceOrder 不自己选择 Robotaxi；
    
17. Trip 不自己选择 Robotaxi；
    
18. Robotaxi 被匹配后不可重复参与其他订单匹配。
