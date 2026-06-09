# RoutePlanningStrategy：路径规划策略

## 1. 定义

RoutePlanningStrategy 是用于生成 Route 的策略对象。

```text
RoutePlanningStrategy = 生成 Route 时采用的业务逻辑与算法规则
```

它决定如何将 origin_cell_id 到 target_cell_id 转化为可执行的 Route.route_steps，便于 RouteExecution 实际推进。

RoutePlanningStrategy 是一个可被调用的路径规划服务。它只接收输入、执行策略内部的规划逻辑，并返回路径规划结果。

RoutePlanningStrategy 不直接改变 Task、RouteExecution、Robotaxi 或其他调用方对象的状态。调用方在拿到策略输出后，自己决定如何创建 Route、更新 Task、绑定 RouteExecution、写入 route_history 或记录事件。

---

## 2. 核心定位

```text
Task = 为什么移动
RoutePlanningStrategy = 如何生成路径
Route = 规划结果
RouteExecution = Robotaxi 执行过程
```

职责分界：

|对象|职责|
|---|---|
|Task|表达业务目标|
|RoutePlanningStrategy|根据输入生成路径规划结果|
|RoutePlanningRun|记录一次策略调用与输出结果|
|Route|保存路径规划结果|
|RouteExecution|执行 Route 并记录移动过程|
|Robotaxi|执行移动任务|

策略调用边界：

```text
调用方提供输入
↓
RoutePlanningStrategy 执行策略算法
↓
RoutePlanningStrategy 返回规划结果
↓
调用方使用结果创建 / 更新 Route、Task、RouteExecution、Robotaxi 状态
```

说明：

```text
策略本身是封装闭环；
状态变化属于调用方业务流程；
RoutePlanningRun 记录这次策略调用过程；
Route 是策略输出被调用方落库后的路径结果。
```

---

## 3. 核心关系

```text
1 个 Task 可以触发 1 个或多次 RoutePlanningRun
1 个 RoutePlanningRun 生成 1 条 Route
1 条 Route 可以被 1 个 RouteExecution 当前执行
RouteExecution.route_history 记录 Route 变化
```

一个 Task 可以触发多次路径规划。
一个 Task 当前只对应一个 RouteExecution。
同一个 RouteExecution 可以在异常到达后更换当前 Route，并通过 route_history 记录历史 Route。
异常到达后的重规划不创建新的 RouteExecution。

---

## 4. 核心属性

|字段|含义|
|---|---|
|route_strategy_id|路径规划策略编号|
|strategy_name|策略名称|
|strategy_type|策略类型|
|planning_algorithm|路径规划算法|
|trigger_task_status|触发该策略的 Task 状态|
|origin_rule|起点选择规则|
|target_rule|终点选择规则|
|service_area_scope_rule|ServiceArea 范围规则|
|route_generation_rule|路径生成算法规则|
|route_update_rule|异常或重规划规则|
|strategy_status|当前策略状态|
|description|策略说明|

---

## 5. 当前阶段策略对象

当前阶段保留两个策略对象：

|route_strategy_id|strategy_name|strategy_type|planning_algorithm|触发场景|
|---|---|---|---|---|
|RPS-001|初始运营投放路径规划策略|INITIAL_DEPLOYMENT_ROUTE|BFS_CELL_GRAPH|DeploymentTask = WAITING_ROUTE|
|RPS-002|异常到达同服务区替代路径规划策略|ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN|BFS_CELL_GRAPH|DeploymentTask = ARRIVAL_ABNORMAL|

当前阶段使用 BFS Cell Graph，目标是保证 Route 像真实出行服务路径一样连续、可执行、可校验。后续可以升级为 Dijkstra、A*、加权 A* 或真实地图 Routing Engine。

---

## 6. RPS-001：初始运营投放路径规划策略

用于初次将 Robotaxi 从当前位置移动到计划目标 Cell。

**触发条件**：

```text
DeploymentTask.task_status = WAITING_ROUTE
```

**输入字段**：

|字段|含义|
|---|---|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|Robotaxi 当前 Cell|
|planned_target_cell_id|DeploymentTask 计划目标 Cell|
|planned_target_service_area_id|计划目标 ServiceArea|
|road_segment_network|可通行 RoadSegment 列表|
|roadnode_network|RoadNode 连接关系|

**策略算法**：

```text
planning_algorithm = BFS_CELL_GRAPH
图节点 = RoadSegment.cell_sequence
边方向 = RoadSegment.allowed_direction
过滤 = BLOCKED / CLOSED RoadSegment
route_steps = origin_cell_id → target_cell_id
```

**路径生成规则**：

|规则|内容|
|---|---|
|origin_rule|使用调用方传入的 Robotaxi 当前 Cell|
|target_rule|使用调用方传入的计划目标 Cell|
|service_area_scope_rule|不改变计划目标 ServiceArea|
|route_generation_rule|基于 RoadSegment.cell_sequence、RoadSegment.allowed_direction 和 RoadNode 连接关系生成 Route.route_steps|

**输出**：

|字段|含义|
|---|---|
|planning_result|路径规划结果|
|route_strategy_id|RPS-001|
|origin_cell_id|本次 Route 起点|
|target_cell_id|本次 Route 终点|
|road_segment_sequence|经过的 RoadSegment 顺序|
|route_steps|可执行 Cell Step 序列|
|failure_reason|失败原因，可为空|

调用方通常在成功后执行：

```text
创建 Route
创建 / 绑定 RouteExecution
RouteExecution.route_history 记录 INITIAL_PLANNING
DeploymentTask.task_status = WAITING_START
```

以上状态变化属于调用方逻辑，不属于 RoutePlanningStrategy 内部职责。

---

## 7. RPS-002：异常到达同服务区替代路径规划策略

用于 Robotaxi 到达目标异常时，在同一 ServiceArea 内选择其他可用目标 Cell。

**触发条件**：

```text
DeploymentTask.task_status = ARRIVAL_ABNORMAL
AND
DeploymentTask.blocked_handling_policy = SAME_SERVICE_AREA_RETRY
```

**输入字段**：

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

**策略算法**：

```text
planning_algorithm = BFS_CELL_GRAPH
BFS 在同 ServiceArea 内选择替代目标
基于 RoadSegment.cell_sequence 和 RoadNode 连接关系生成 route_steps
```

**路径生成规则**：

|规则|内容|
|---|---|
|origin_rule|使用调用方传入的 Robotaxi 当前异常到达 Cell|
|target_rule|选择同一 ServiceArea 内不同于当前异常位置、原始计划目标、当前目标位置和历史异常目标的其他可用 Cell|
|service_area_scope_rule|只能在 planned_target_service_area_id 对应 ServiceArea 内选择|
|route_generation_rule|基于 RoadSegment.cell_sequence、RoadSegment.allowed_direction 和 RoadNode 连接关系生成到替代目标的 Route.route_steps|

**约束**：

1. 起点 = Robotaxi 当前异常 Cell；

2. 终点 = ServiceArea 内可用目标 Cell；

3. 终点必须排除当前异常位置、原始计划目标、当前目标位置和本任务历史异常目标；

4. 终点不得在 occupied_cell_ids 中；

5. 终点不得在 unavailable_cell_ids 中；

6. 终点必须能通过 RoadSegment / RoadNode 到达；

7. 可重复直到正常到达或确认无法停靠；

8. Route 和 route_history 都记录 route_strategy_id。

调用方通常在成功后执行：

```text
创建新 Route
更新原 RouteExecution.current_route_id / route_id
RouteExecution.route_history 追加 ABNORMAL_ARRIVAL_REPLAN
更新 DeploymentTask.target_cell_id 与 RouteExecution.target_cell_id
保持 DeploymentTask.planned_target_* 与 RouteExecution.planned_target_* 不变
DeploymentTask.task_status = MOVING
RouteExecution.execution_status = MOVING
```

以上状态变化属于调用方逻辑，不属于 RoutePlanningStrategy 内部职责。

---

## 8. 目标 Cell 选择规则

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

如果存在多个候选 Cell，当前阶段采用简化规则：

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

## 9. 道路网络要求

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

如果无法基于 RoadSegment 和 RoadNode 生成连续路径，则策略调用应返回 FAILED，并给出 failure_reason。

---

## 10. Route 生成结果要求

策略调用成功后，调用方创建的 Route 必须包含：

|字段|含义|
|---|---|
|route_id|Route 编号|
|route_version|Route 版本|
|route_strategy_id|生成该 Route 使用的策略|
|route_planning_run_id|关联路径规划执行记录|
|task_id|关联 Task|
|route_execution_id|关联 RouteExecution|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|本次 Route 起点|
|target_cell_id|本次 Route 终点|
|road_segment_sequence|经过的 RoadSegment 顺序|
|route_steps|可执行 Cell Step 序列|
|total_distance_km|路径总距离|
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

## 11. route_history 记录策略

每次路径规划或重规划都应形成 route_history 记录。

|字段|含义|
|---|---|
|route_id|Route 编号|
|route_strategy_id|生成该 Route 使用的路径规划策略编号|
|origin_cell_id|本次 Route 起点|
|target_cell_id|本次 Route 终点|
|started_at|本次 Route 开始时间|
|ended_at|本次 Route 结束时间|
|route_change_reason|Route 变化原因|
|arrival_execution_result|触发变化的到达结果，可为空|
|trigger_type|触发方式|

route_change_reason：

|值|含义|
|---|---|
|INITIAL_PLANNING|初始路径规划|
|ABNORMAL_ARRIVAL_REPLAN|异常到达后重新规划|
|ROUTE_BLOCKED_REPLAN|路径阻塞后重新规划，后续能力|

说明：

```text
route_history 属于 RouteExecution。
route_history 用于记录同一个 Task 下的路径变化过程。
route_history 不表示多个 RouteExecution。
```

---

## 12. 路径规划执行记录

|字段|含义|
|---|---|
|route_planning_run_id|路径规划执行记录编号|
|route_strategy_id|使用的策略编号|
|planning_algorithm|使用的路径规划算法|
|task_id|关联 Task|
|route_execution_id|关联 RouteExecution|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|起点 Cell|
|target_cell_id|目标 Cell|
|result_route_id|生成的 Route|
|planning_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|
|created_at|执行时间|

说明：

```text
Route.route_strategy_id 必须与 RoutePlanningRun 一致
Route.route_planning_run_id 必须与 RoutePlanningRun.route_planning_run_id 一致
RouteHistory.route_strategy_id 必须与 Route.route_strategy_id 一致
```

---

## 13. RoutePlanning 失败条件

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

## 14. TaskEventLog

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

## 15. 当前阶段实现原则

当前阶段 RoutePlanningStrategy 是模拟路径规划决策能力。

实现原则：

1. 当前阶段主要服务于运营投放任务；

2. 当前阶段不接入真实地图；

3. 当前阶段不实现真实导航 SDK；

4. 当前阶段需要实现基于 Cell Graph 的 BFS，保证 Route 连续、正确、可执行；

5. 初始路径规划和异常到达后的路径规划必须使用不同策略对象；

6. 生成的 Route 必须记录 route_strategy_id 和 route_planning_run_id；

7. 异常到达后的路径规划必须复用同一个 RouteExecution；

8. Route 变化必须可追踪；

9. 运营人员通过按钮模拟未来路径规划系统的调用过程。

---

## 16. 核心规则

1. RoutePlanningStrategy 是可被调用的路径规划服务；

2. RoutePlanningStrategy 只接收输入并输出路径规划结果；

3. RoutePlanningStrategy 不执行 Route；

4. RoutePlanningStrategy 不直接改变 Task、RouteExecution、Robotaxi 状态；

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

19. RPS-002 不创建新的 RouteExecution；

20. RPS-002 生成的新 Route 进入原 RouteExecution.route_history；

21. 无法生成可用 Route 时，应向调用方返回失败结果和 failure_reason；

22. RoutePlanningStrategy 为可复用对象，独立于 Task 类型。
