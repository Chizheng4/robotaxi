# RoutePlanningStrategy：路径规划策略

## 1. 定义

RoutePlanningStrategy 是用于生成 Route 的策略对象。

```text
RoutePlanningStrategy = 生成 Route 时采用的业务逻辑与算法规则
```

它决定如何将 `origin_cell_id` 到 `target_cell_id` 转化为可执行的 `Route.route_steps`，便于调用方后续执行。

RoutePlanningStrategy 是可被调用的路径规划服务。

它只负责：

```text
接收输入
执行路径规划算法
返回路径规划结果
```

它不直接改变：

```text
Task
ServiceOrder
Trip
RouteExecution
Robotaxi
```

调用方拿到策略输出后，自己决定如何创建 Route、更新状态、绑定执行记录、写入历史路径或记录事件。

RoutePlanningRun 由路径规划服务层在策略被调用时记录，用于追踪一次策略执行的输入、输出和结果。它不是 RoutePlanningStrategy 自身主动修改其他对象状态的行为。

---

## 2. 核心定位

```text
Task / ServiceOrder = 为什么移动
RoutePlanningStrategy = 如何生成路径
RoutePlanningRun = 一次路径策略执行记录
Route = 路径规划结果
RouteExecution / Trip = 实际执行与记录过程
Robotaxi = 执行移动资源
```

职责分界：

|对象|职责|
|---|---|
|Task|表达运营任务目标|
|ServiceOrder|表达客户服务订单目标|
|Trip|表达服务订单履约过程|
|RoutePlanningStrategy|根据输入生成路径规划结果|
|RoutePlanningRun|记录一次策略调用与输出结果|
|Route|保存路径规划结果|
|RouteExecution|记录运营任务下的行驶过程|
|Robotaxi|执行移动|

策略调用边界：

```text
调用方提供输入
↓
RoutePlanningStrategy 执行路径规划算法
↓
路径规划服务层记录 RoutePlanningRun
↓
RoutePlanningStrategy 返回规划结果
↓
调用方使用结果创建 / 更新 Route
↓
调用方更新 Task / ServiceOrder / Trip / RouteExecution / Robotaxi 状态
```

说明：

```text
策略本身是封装的路径规划能力。
状态变化属于调用方业务流程。
RoutePlanningRun 记录策略调用过程，由路径规划服务层生成。
Route 是策略输出落库后的路径结果。
```

---

## 3. 核心关系

运营任务场景：

```text
1 个 Task 可以触发 1 次或多次 RoutePlanningRun
1 个 RoutePlanningRun 生成 1 条 Route
1 条 Route 可以被 1 个 RouteExecution 当前执行
RouteExecution.route_history 记录 Route 变化
```

服务订单场景：

```text
1 个 ServiceOrder 可以通过 Trip 触发 1 次或多次 RoutePlanningRun
1 个 RoutePlanningRun 生成 1 条 Route
Trip 记录当前 route_id 与 route_history
```

说明：

```text
运营任务使用 RouteExecution 记录行驶过程。
服务订单使用 Trip 记录履约过程。
RoutePlanningStrategy 对二者提供统一路径规划能力。
```

---

## 4. 核心属性

|字段|含义|
|---|---|
|route_strategy_id|路径规划策略编号|
|strategy_name|策略名称|
|strategy_type|策略类型|
|planning_algorithm|路径规划算法|
|trigger_task_status|触发该策略的 Task 状态，可为空|
|trigger_order_status|触发该策略的 ServiceOrder 状态，可为空|
|trigger_trip_status|触发该策略的 Trip 状态，可为空|
|origin_rule|起点选择规则|
|target_rule|终点选择规则|
|service_area_scope_rule|ServiceArea 范围规则|
|route_generation_rule|路径生成算法规则|
|route_update_rule|异常或重规划规则|
|strategy_status|当前策略状态|
|description|策略说明|

---

## 5. 当前阶段策略对象

已实现运营任务策略：

|route_strategy_id|strategy_name|strategy_type|planning_algorithm|触发场景|
|---|---|---|---|---|
|RPS-001|初始运营投放路径规划策略|INITIAL_DEPLOYMENT_ROUTE|BFS_CELL_GRAPH|DeploymentTask = WAITING_ROUTE|
|RPS-002|异常到达同服务区替代路径规划策略|ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN|BFS_CELL_GRAPH|DeploymentTask = ARRIVAL_ABNORMAL|

新增服务订单策略：

|route_strategy_id|strategy_name|strategy_type|planning_algorithm|触发场景|
|---|---|---|---|---|
|RPS-003|服务订单接驾路径规划策略|SERVICE_ORDER_PICKUP_ROUTE|BFS_CELL_GRAPH|Trip = ON_THE_WAY_PICKUP|
|RPS-004|服务订单载客路径规划策略|SERVICE_ORDER_TRIP_ROUTE|BFS_CELL_GRAPH|Trip = ON_THE_WAY_DESTINATION|
|RPS-005|目的地变更后路径重规划策略|DESTINATION_CHANGE_REPLAN|BFS_CELL_GRAPH|Trip 载客中目的地变更|
|RPS-006|服务路径异常重规划策略|SERVICE_ROUTE_EXCEPTION_REPLAN|BFS_CELL_GRAPH|Trip 接驾或载客中路径异常|

说明：

```text
RPS-001 / RPS-002 已服务运营投放任务。
RPS-003 / RPS-004 / RPS-005 / RPS-006 服务需求侧订单履约。
```

---

## 6. planning_algorithm

当前统一使用：

```text
planning_algorithm = BFS_CELL_GRAPH
```

算法基础：

```text
图节点 = RoadSegment.cell_sequence
边方向 = RoadSegment.allowed_direction
过滤 = BLOCKED / CLOSED RoadSegment
路径结果 = origin_cell_id → target_cell_id 的连续 route_steps
```

当前目标：

```text
保证 Route 连续
保证 Route 可执行
保证 Route 可校验
保证 Route 可被 RouteExecution 或 Trip 推进
```

后续可升级为：

```text
Dijkstra
A*
加权 A*
真实地图 Routing Engine
```

---

## 7. RPS-001：初始运营投放路径规划策略

用于初次将 Robotaxi 从当前位置移动到计划目标 Cell。

触发条件：

```text
DeploymentTask.task_status = WAITING_ROUTE
```

输入字段：

|字段|含义|
|---|---|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|Robotaxi 当前 Cell|
|planned_target_cell_id|DeploymentTask 计划目标 Cell|
|planned_target_service_area_id|计划目标 ServiceArea|
|road_segment_network|可通行 RoadSegment 列表|
|roadnode_network|RoadNode 连接关系|

输出：

|字段|含义|
|---|---|
|planning_result|路径规划结果|
|route_strategy_id|RPS-001|
|origin_cell_id|本次 Route 起点|
|target_cell_id|本次 Route 终点|
|road_segment_sequence|经过的 RoadSegment 顺序|
|route_steps|可执行 Cell Step 序列|
|total_distance_km|路径总距离|
|estimated_duration_min|预估时长|
|failure_reason|失败原因，可为空|

调用方通常在成功后执行：

```text
创建 Route
创建 / 绑定 RouteExecution
RouteExecution.route_history 记录 INITIAL_PLANNING
DeploymentTask.task_status = WAITING_START
```

以上状态变化属于调用方逻辑。

---

## 8. RPS-002：异常到达同服务区替代路径规划策略

用于 Robotaxi 到达目标异常时，在同一 ServiceArea 内选择其他可用目标 Cell。

触发条件：

```text
DeploymentTask.task_status = ARRIVAL_ABNORMAL
AND
DeploymentTask.blocked_handling_policy = SAME_SERVICE_AREA_RETRY
```

输入字段：

|字段|含义|
|---|---|
|robotaxi_id|执行 Robotaxi|
|current_cell_id|Robotaxi 当前异常位置|
|planned_target_service_area_id|原计划目标 ServiceArea|
|arrival_execution_result|异常到达类型|
|route_execution_id|当前行驶记录|
|service_area_context|ServiceArea 候选可用 Cell|
|road_segment_network|可通行 RoadSegment 列表|
|roadnode_network|RoadNode 连接关系|
|occupied_cell_ids|已占用 Cell|
|unavailable_cell_ids|不可用 Cell|

约束：

1. 起点 = Robotaxi 当前异常 Cell；
    
2. 终点 = 同 ServiceArea 内可用目标 Cell；
    
3. 终点必须排除当前异常位置、原始计划目标、当前目标位置和历史异常目标；
    
4. 终点不得在 `occupied_cell_ids` 中；
    
5. 终点不得在 `unavailable_cell_ids` 中；
    
6. 终点必须能通过 RoadSegment / RoadNode 到达；
    
7. Route 和 route_history 都记录 `route_strategy_id = RPS-002`。
    

调用方通常在成功后执行：

```text
创建新 Route
更新原 RouteExecution.route_id
RouteExecution.route_history 追加 ABNORMAL_ARRIVAL_REPLAN
更新 DeploymentTask.target_cell_id
更新 RouteExecution.target_cell_id
保持 planned_target_* 不变
DeploymentTask.task_status = MOVING
RouteExecution.execution_status = MOVING
```

以上状态变化属于调用方逻辑。

---

## 9. RPS-003：服务订单接驾路径规划策略

用于服务订单匹配成功后，Robotaxi 前往客户上车点。

路径目标：

```text
Robotaxi.current_cell_id
↓
ServiceOrder.pickup_cell_id
```

触发场景：

```text
ServiceOrder = VEHICLE_ASSIGNED
Trip = ON_THE_WAY_PICKUP
```

输入字段：

|字段|来源|
|---|---|
|service_order_id|ServiceOrder|
|trip_id|Trip|
|robotaxi_id|Robotaxi|
|origin_cell_id|Robotaxi.current_cell_id|
|target_cell_id|ServiceOrder.pickup_cell_id|
|target_service_area_id|ServiceOrder.pickup_service_area_id|
|road_segment_network|RoadSegment|
|roadnode_network|RoadNode|

输出字段：

|字段|含义|
|---|---|
|route_planning_run_id|路径规划执行记录|
|route_strategy_id|RPS-003|
|route_id|接驾 Route|
|route_steps|接驾路径 Cell 序列|
|road_segment_sequence|经过的 RoadSegment 顺序|
|total_distance_km|预估接驾距离|
|estimated_duration_min|预估接驾时长|
|planning_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|

规则：

1. 起点必须是 Robotaxi 当前 Cell；
    
2. 终点必须是 ServiceOrder.pickup_cell_id；
    
3. 终点必须属于支持 pickup 的 ServiceArea；
    
4. Route 必须基于 RoadSegment.cell_sequence 生成；
    
5. Route 必须经过合法 RoadNode 连接；
    
6. Route.route_steps 必须连续、有序、可执行；
    
7. Route.route_strategy_id = RPS-003。
    

调用方通常在成功后执行：

```text
创建 Route
Trip.current_route_id = route_id
Trip.pickup_route_id = route_id
Trip.pickup_route_planning_run_id = route_planning_run_id
Trip.trip_status = ON_THE_WAY_PICKUP
Robotaxi.current_route_id = route_id
```

---

## 10. RPS-004：服务订单载客路径规划策略

用于乘客上车后，Robotaxi 从上车点前往目的地下车点。

路径目标：

```text
ServiceOrder.pickup_cell_id
↓
ServiceOrder.dropoff_cell_id
```

触发场景：

```text
Trip = ON_THE_WAY_DESTINATION
```

输入字段：

|字段|来源|
|---|---|
|service_order_id|ServiceOrder|
|trip_id|Trip|
|robotaxi_id|Robotaxi|
|origin_cell_id|ServiceOrder.pickup_cell_id|
|target_cell_id|ServiceOrder.dropoff_cell_id|
|target_service_area_id|ServiceOrder.dropoff_service_area_id|
|road_segment_network|RoadSegment|
|roadnode_network|RoadNode|

输出字段：

|字段|含义|
|---|---|
|route_planning_run_id|路径规划执行记录|
|route_strategy_id|RPS-004|
|route_id|载客 Route|
|route_steps|载客路径 Cell 序列|
|road_segment_sequence|经过的 RoadSegment 顺序|
|total_distance_km|预估载客距离|
|estimated_duration_min|预估载客时长|
|planning_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|

规则：

1. 起点为 pickup_cell_id；
    
2. 终点为 dropoff_cell_id；
    
3. 终点必须属于支持 dropoff 的 ServiceArea；
    
4. Route 必须基于 RoadSegment.cell_sequence 生成；
    
5. Route.route_steps 必须连续、有序、可执行；
    
6. Route.route_strategy_id = RPS-004。
    

调用方通常在成功后执行：

```text
创建 Route
Trip.current_route_id = route_id
Trip.service_route_id = route_id
Trip.service_route_planning_run_id = route_planning_run_id
Trip.trip_status = ON_THE_WAY_DESTINATION
Robotaxi.current_route_id = route_id
```

---

## 11. RPS-005：目的地变更后路径重规划策略

用于 Trip 载客过程中客户修改目的地。

路径目标：

```text
Robotaxi.current_cell_id
↓
新的 dropoff_cell_id
```

触发场景：

```text
Trip = ON_THE_WAY_DESTINATION
AND
客户修改目的地
```

输入字段：

|字段|来源|
|---|---|
|service_order_id|ServiceOrder|
|trip_id|Trip|
|robotaxi_id|Robotaxi|
|origin_cell_id|Robotaxi.current_cell_id|
|old_dropoff_cell_id|ServiceOrder 原 dropoff_cell_id|
|new_dropoff_cell_id|修改后的 dropoff_cell_id|
|new_dropoff_service_area_id|修改后的 dropoff_service_area_id|
|road_segment_network|RoadSegment|
|roadnode_network|RoadNode|

输出字段：

|字段|含义|
|---|---|
|route_planning_run_id|路径规划执行记录|
|route_strategy_id|RPS-005|
|route_id|新载客 Route|
|route_steps|新路径 Cell 序列|
|road_segment_sequence|经过的 RoadSegment 顺序|
|total_distance_km|新预估距离|
|estimated_duration_min|新预估时长|
|planning_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|

规则：

1. 目的地变更不创建新 ServiceOrder；
    
2. 目的地变更不创建新 Trip；
    
3. 新终点必须属于支持 dropoff 的 ServiceArea；
    
4. ServiceOrder 更新 dropoff_service_area_id / dropoff_cell_id；
    
5. Trip 追加 route_history；
    
6. 如影响价格，应触发新的 PricingStrategyRun；
    
7. Route.route_strategy_id = RPS-005。
    

调用方通常在成功后执行：

```text
创建新 Route
Trip.route_history 追加 DESTINATION_CHANGE_REPLAN
Trip.current_route_id = route_id
ServiceOrder.dropoff_cell_id = new_dropoff_cell_id
ServiceOrder.dropoff_service_area_id = new_dropoff_service_area_id
Robotaxi.current_route_id = route_id
```

---

## 12. RPS-006：服务路径异常重规划策略

用于服务履约过程中出现路径异常。

适用阶段：

```text
接驾阶段
载客阶段
```

典型异常：

```text
ROUTE_BLOCKED
ROAD_SEGMENT_UNAVAILABLE
TARGET_CELL_UNREACHABLE
ROBOTAXI_TEMPORARILY_BLOCKED
UNKNOWN
```

输入字段：

|字段|来源|
|---|---|
|service_order_id|ServiceOrder|
|trip_id|Trip|
|robotaxi_id|Robotaxi|
|current_cell_id|Robotaxi.current_cell_id|
|target_cell_id|当前阶段目标 Cell|
|target_service_area_id|当前阶段目标 ServiceArea|
|trip_phase|ON_THE_WAY_PICKUP / ON_THE_WAY_DESTINATION|
|exception_type|路径异常类型|
|road_segment_network|RoadSegment|
|roadnode_network|RoadNode|

输出字段：

|字段|含义|
|---|---|
|route_planning_run_id|路径规划执行记录|
|route_strategy_id|RPS-006|
|route_id|重规划 Route|
|route_steps|新路径 Cell 序列|
|road_segment_sequence|经过的 RoadSegment 顺序|
|total_distance_km|新预估距离|
|estimated_duration_min|新预估时长|
|planning_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|

规则：

1. 服务路径异常不创建新 ServiceOrder；
    
2. 服务路径异常不创建新 Trip；
    
3. 重规划成功后，Trip 更新当前 route_id；
    
4. 重规划失败时，Trip 进入异常状态；
    
5. ServiceOrder 根据 Trip 结果进入 TRIP_FAILED 或等待运营决策处理；
    
6. Route.route_strategy_id = RPS-006。
    

调用方通常在成功后执行：

```text
创建新 Route
Trip.route_history 追加 SERVICE_ROUTE_EXCEPTION_REPLAN
Trip.current_route_id = route_id
Robotaxi.current_route_id = route_id
```

---

## 13. 目标 Cell 选择规则

RoutePlanningStrategy 可从 ServiceArea 中选择目标 Cell。

候选 Cell 必须满足：

```text
Cell 属于目标 ServiceArea
AND
Cell 不在 occupied_cell_ids
AND
Cell 不在 unavailable_cell_ids
AND
Cell 满足调用方传入的目标约束
AND
Cell 可通过 RoadSegment / RoadNode 到达
```

RPS-002 还必须满足：

```text
Cell != Robotaxi.current_cell_id
AND
Cell != 当前异常目标 Cell
```

如果存在多个候选 Cell，当前阶段采用：

```text
优先选择 BFS 路径步数最少的候选 Cell
```

后续可扩展为：

```text
最短距离
最低能耗
最少转向
服务区容量优先
订单概率优先
```

---

## 14. 道路网络要求

RoutePlanningStrategy 必须基于道路网络生成 Route。

道路网络至少包括：

```text
RoadSegment.cell_sequence
RoadSegment.allowed_direction
RoadSegment.segment_status
RoadNode 连接关系
ServiceArea 候选 Cell
```

RoutePlanningStrategy 不应使用无序 Road Cell 直接生成路径。

如果无法基于 RoadSegment 和 RoadNode 生成连续路径，应返回：

```text
planning_result = FAILED
failure_reason = 对应失败原因
```

---

## 15. Route 生成结果要求

策略调用成功后，调用方创建的 Route 必须包含：

|字段|含义|
|---|---|
|route_id|Route 编号|
|route_version|Route 版本|
|route_strategy_id|生成该 Route 使用的策略|
|route_planning_run_id|关联路径规划执行记录|
|task_id|关联 Task，可为空|
|route_execution_id|关联 RouteExecution，可为空|
|service_order_id|关联 ServiceOrder，可为空|
|trip_id|关联 Trip，可为空|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|本次 Route 起点|
|target_cell_id|本次 Route 终点|
|road_segment_sequence|经过的 RoadSegment 顺序|
|route_steps|可执行 Cell Step 序列|
|total_distance_km|路径总距离|
|estimated_duration_min|预估时长|
|failure_reason|失败原因，可为空|

Route 必须满足：

```text
route_steps 不为空
route_steps 按 step_index 有序
route_steps[0].cell_id = origin_cell_id
route_steps[last].cell_id = target_cell_id
相邻 step 必须连续
跨 RoadSegment 必须经过合法 RoadNode
Route.route_strategy_id = RoutePlanningRun.route_strategy_id
```

---

## 16. route_history 记录策略

运营行驶记录：

```text
route_history 属于 RouteExecution
用于记录同一个 Task 下的路径变化过程
```

服务履约记录：

```text
route_history 属于 Trip
用于记录同一个 ServiceOrder 下的服务路径变化过程
```

route_history 字段：

|字段|含义|
|---|---|
|route_id|Route 编号|
|route_strategy_id|生成该 Route 使用的路径规划策略编号|
|origin_cell_id|本次 Route 起点|
|target_cell_id|本次 Route 终点|
|started_at|本次 Route 开始时间|
|ended_at|本次 Route 结束时间|
|route_change_reason|Route 变化原因|
|trigger_type|触发方式|
|arrival_result|到达结果，可为空|
|exception_type|异常类型，可为空|

说明：

```text
arrival_result 用于记录正常到达或异常到达等执行反馈。
exception_type 仅在发生异常时记录具体异常原因。
运营行驶记录和服务履约记录都应保留这两个层次，避免把“结果”和“异常类型”混为一个字段。
```

route_change_reason：

|值|含义|
|---|---|
|INITIAL_PLANNING|初始路径规划|
|ABNORMAL_ARRIVAL_REPLAN|异常到达后重新规划|
|PICKUP_ROUTE_PLANNING|接驾路径规划|
|SERVICE_ROUTE_PLANNING|载客路径规划|
|DESTINATION_CHANGE_REPLAN|目的地变更后重规划|
|SERVICE_ROUTE_EXCEPTION_REPLAN|服务路径异常重规划|

---

## 17. 路径规划执行记录

RoutePlanningRun 至少记录：

|字段|含义|
|---|---|
|route_planning_run_id|路径规划执行记录编号|
|route_strategy_id|使用的策略编号|
|planning_algorithm|使用的路径规划算法|
|task_id|关联 Task，可为空|
|route_execution_id|关联 RouteExecution，可为空|
|service_order_id|关联 ServiceOrder，可为空|
|trip_id|关联 Trip，可为空|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|起点 Cell|
|target_cell_id|目标 Cell|
|result_route_id|生成的 Route|
|planning_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|
|created_at|执行时间|

一致性要求：

```text
Route.route_strategy_id 必须与 RoutePlanningRun 一致
Route.route_planning_run_id 必须与 RoutePlanningRun.route_planning_run_id 一致
RouteHistory.route_strategy_id 必须与 Route.route_strategy_id 一致
```

---

## 18. RoutePlanning 失败条件

|failure_reason|含义|
|---|---|
|ORIGIN_CELL_INVALID|起点 Cell 无效|
|TARGET_CELL_INVALID|目标 Cell 无效|
|TARGET_SERVICE_AREA_UNAVAILABLE|目标 ServiceArea 不可用|
|NO_AVAILABLE_TARGET_CELL|无可用目标 Cell|
|NO_CONNECTED_ROAD_SEGMENT|无连续 RoadSegment|
|ROAD_SEGMENT_BLOCKED|道路片段阻塞|
|ROADNODE_CONNECTION_INVALID|RoadNode 连接无效|
|ROUTE_STEPS_EMPTY|route_steps 为空|
|ROUTE_STRATEGY_MISMATCH|Route 策略编号不一致|
|UNKNOWN|未知原因|

---

## 19. TaskEventLog

|event_type|含义|
|---|---|
|ROUTE_PLANNING_REQUESTED|请求路径规划|
|ROUTE_PLANNING_STARTED|路径规划开始|
|ROUTE_PLANNED|Route 生成成功|
|ROUTE_PLANNING_FAILED|Route 生成失败|
|ROUTE_REPLAN_REQUESTED|请求重规划|
|ROUTE_REPLANNED|Route 重规划完成|
|ROUTE_STRATEGY_MISMATCH|Route 策略编号不一致|
|NO_AVAILABLE_TARGET_CELL|无可用目标 Cell|
|NO_CONNECTED_ROAD_SEGMENT|无连续道路片段|

---

## 20. 当前阶段不做内容

当前阶段不做：

```text
自动驾驶真实控制
真实地图导航
实时交通预测
多车协同路径规划
复杂绕路优化
客户偏好路线
多目的地路径规划
```

当前阶段已支持或计划支持：

```text
运营投放路径规划
运营异常到达同服务区替代路径规划
接驾路径规划
载客路径规划
目的地变更后重规划
服务路径异常重规划
RoutePlanningRun 记录
Route 结果记录
```

---

## 21. 规则

1. RoutePlanningStrategy 是可被调用的路径规划服务；
    
2. RoutePlanningStrategy 只接收输入并输出路径规划结果；
    
3. RoutePlanningStrategy 不执行 Route；
    
4. RoutePlanningStrategy 不直接改变 Task、ServiceOrder、Trip、RouteExecution、Robotaxi 状态；
    
5. 调用方负责根据策略输出更新自己的业务状态；
    
6. 必须记录 planning_algorithm；
    
7. 当前阶段 planning_algorithm = BFS_CELL_GRAPH；
    
8. RoutePlanning 必须基于 RoadSegment.cell_sequence；
    
9. RoutePlanning 必须基于 RoadNode 连接关系；
    
10. RoutePlanning 必须遵循 RoadSegment.allowed_direction；
    
11. RoutePlanning 必须过滤 BLOCKED / CLOSED RoadSegment；
    
12. route_steps 必须连续、有序、可执行；
    
13. Route 必须记录 route_strategy_id；
    
14. RoutePlanningRun 必须记录 route_strategy_id 和 planning_algorithm；
    
15. RouteHistory 必须记录 route_strategy_id；
    
16. Route、RoutePlanningRun、RouteHistory 的 route_strategy_id 必须一致；
    
17. 初始投放使用 RPS-001；
    
18. 异常到达同 ServiceArea 替代路径规划使用 RPS-002；
    
19. 接驾使用 RPS-003；
    
20. 载客使用 RPS-004；
    
21. 目的地变更使用 RPS-005；
    
22. 服务路径异常使用 RPS-006；
    
23. RPS-002 不创建新的 RouteExecution；
    
24. RPS-005 / RPS-006 不创建新的 Trip；
    
25. 无法生成可用 Route 时，应向调用方返回失败结果和 failure_reason；
    
26. RoutePlanningStrategy 为可复用对象，独立于调用方业务类型。
