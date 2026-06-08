# RoutePlanningStrategy：路径规划策略

## 1. 定义

RoutePlanningStrategy 是路径规划时使用的策略对象。

```text
RoutePlanningStrategy = 生成 Route 时采用的业务逻辑配置
```

RoutePlanningStrategy 用于定义：

```text
什么场景下生成 Route
从哪里作为起点
选择哪里作为目标
目标范围如何约束
生成 Route 后如何更新 Task / RouteExecution
```

当前阶段不实现真实最短路算法，但生成的 Route 必须基于 RoadSegment、RoadNode 和 ServiceArea 的结构化信息，不能脱离道路网络随意生成路径。

RoutePlanningStrategy 是可复用策略对象，不绑定某一种 Task 类型。只要业务流程需要生成或更新 Route，都可以通过 `route_strategy_id` 引用对应策略。

---

## 2. 核心边界

RoutePlanningStrategy 负责表达路径规划逻辑。

RoutePlanningStrategy 不负责：

```text
决定哪台 Robotaxi 执行任务
判断运营投放是否成功
推进 Robotaxi 行驶
记录行驶过程
处理客户订单
```

对象边界：

| 对象                    | 职责                             |
| --------------------- | ------------------------------ |
| DeploymentTask        | 决定 Robotaxi 要去哪里，以及到达后如何判断投放结果 |
| RoutePlanningStrategy | 定义生成 Route 时采用的策略逻辑            |
| RoutePlanningRun      | 记录某次路径规划策略执行过程                 |
| Route                 | 记录由某个策略生成的路径结果                 |
| RouteExecution / 行驶记录 | 按 Route 执行并记录过程                |
| Robotaxi              | 执行移动                           |
| RoadSegment           | 提供有序道路 Cell                    |
| RoadNode              | 提供 RoadSegment 连接关系            |
| ServiceArea           | 提供可停靠、临停、待命的目标候选 Cell          |

---

## 3. 核心关系

```text
Task
↓
RoutePlanningStrategy
↓
RoutePlanningRun
↓
Route
↓
RouteExecution
```

说明：

```text
RoutePlanningStrategy = 策略定义
RoutePlanningRun = 某次策略执行记录
Route = 策略执行后生成的路径结果
RouteExecution = 当前 Task 下 Robotaxi 的完整行驶记录
```

一个 Task 可以触发多次路径规划。
一个 Task 只对应一个 RouteExecution。
一个 RouteExecution 可以记录多个 Route。
多个 Route 通过 `route_history` 串联为同一次任务下的完整行驶过程。

---

## 4. 核心属性

|字段|含义|
|---|---|
|route_strategy_id|路径规划策略编号|
|strategy_name|路径规划策略名称|
|strategy_type|路径规划策略类型|
|trigger_task_status|触发任务状态|
|origin_rule|起点选择规则|
|target_rule|终点选择规则|
|service_area_scope_rule|ServiceArea 范围规则|
|route_generation_rule|Route 生成规则|
|route_update_rule|Route 更新规则|
|strategy_status|策略状态|
|description|策略说明|

---

## 5. 当前策略对象

当前阶段需要 2 个 RoutePlanningStrategy。

|route_strategy_id|strategy_name|strategy_type|当前触发场景|
|---|---|---|---|
|RPS-001|初始运营投放路径规划策略|INITIAL_DEPLOYMENT_ROUTE|DeploymentTask = WAITING_ROUTE|
|RPS-002|异常到达同服务区替代路径规划策略|ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN|DeploymentTask = ARRIVAL_ABNORMAL|

---

## 6. 策略一：初始运营投放路径规划策略

该策略用于第一次把 Robotaxi 从任务起点移动到计划目标点。

```text
route_strategy_id = RPS-001
strategy_type = INITIAL_DEPLOYMENT_ROUTE
```

触发条件：

```text
DeploymentTask.task_status = WAITING_ROUTE
```

输入：

|字段|含义|
|---|---|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|Robotaxi 当前起点|
|planned_target_cell_id|计划目标 Cell|
|planned_target_service_area_id|计划目标 ServiceArea|
|road_segment_network|可通行 RoadSegment 网络|
|roadnode_network|RoadSegment 连接关系|
|service_area_context|ServiceArea 目标能力与状态|

策略规则：

|规则|内容|
|---|---|
|origin_rule|使用 Robotaxi 当前所在 Cell|
|target_rule|使用 DeploymentTask.planned_target_cell_id|
|service_area_scope_rule|不改变计划目标 ServiceArea|
|route_generation_rule|基于 RoadSegment.cell_sequence 和 RoadNode 连接关系生成 Route.route_steps|
|route_update_rule|创建初始 Route，并创建 / 绑定当前 Task 的 RouteExecution|

流程：

```text
DeploymentTask = WAITING_ROUTE
↓
运营人员点击 路径规划
↓
使用 RPS-001
↓
基于 RoadSegment / RoadNode 生成初始 Route
↓
Route.route_strategy_id = RPS-001
↓
Route.route_steps 生成
↓
创建 / 绑定 RouteExecution
↓
RouteExecution.route_id = 初始 Route
↓
RouteExecution.route_history 记录 INITIAL_PLANNING 和路径规划策略编号
↓
DeploymentTask = WAITING_START
RouteExecution = WAITING_START
```

约束：

1. 起点必须是 Robotaxi 当前 Cell；

2. 目标必须是 DeploymentTask.planned_target_cell_id；

3. Route 必须基于 RoadSegment.cell_sequence 生成；

4. Route 必须经过合法 RoadNode 连接；

5. Route.route_steps 必须连续、有序、可执行；

6. Route 必须记录 `route_strategy_id = RPS-001`；

7. RoutePlanningRun 必须记录 `route_strategy_id = RPS-001`；

8. Route.route_strategy_id 必须与 RoutePlanningRun.route_strategy_id 一致。


---

## 7. 策略二：异常到达同服务区替代路径规划策略

该策略用于 Robotaxi 到达目标异常后，在同一 ServiceArea 内选择替代点位。

```text
route_strategy_id = RPS-002
strategy_type = ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN
```

触发条件：

```text
DeploymentTask.task_status = ARRIVAL_ABNORMAL
AND
DeploymentTask.blocked_handling_policy = SAME_SERVICE_AREA_RETRY
```

输入：

|字段|含义|
|---|---|
|robotaxi_id|执行 Robotaxi|
|current_cell_id|Robotaxi 当前异常到达位置|
|planned_target_service_area_id|原计划目标 ServiceArea|
|current_target_cell_id|当前异常目标 Cell|
|arrival_execution_result|异常到达类型|
|route_execution_id|当前行驶记录|
|arrival_behavior|到达后的驻留要求|
|occupied_cell_ids|已占用 Cell|
|unavailable_cell_ids|不可用 Cell|
|road_segment_network|可通行 RoadSegment 网络|
|roadnode_network|RoadSegment 连接关系|
|service_area_context|当前 ServiceArea 候选点与状态|

策略规则：

|规则|内容|
|---|---|
|origin_rule|使用 Robotaxi 当前异常到达位置|
|target_rule|选择同一 ServiceArea 内不同于当前异常位置、原当前目标位置的其他可用 Cell|
|service_area_scope_rule|只能在 planned_target_service_area_id 对应 ServiceArea 内选择|
|route_generation_rule|基于 RoadSegment.cell_sequence 和 RoadNode 连接关系生成到替代目标的 Route|
|route_update_rule|更新同一个 RouteExecution 的当前 Route，并同步更新任务单当前计划目标位置，不创建新 RouteExecution|

流程：

```text
DeploymentTask = ARRIVAL_ABNORMAL
↓
运营人员点击 路径规划
↓
使用 RPS-002
↓
RoutePlanning 在同 ServiceArea 内选择替代目标 Cell
↓
从 Robotaxi 当前异常到达位置生成到替代目标点的新 Route
↓
Route.route_strategy_id = RPS-002
↓
Route.route_steps 生成
↓
RouteExecution.route_history 追加新 Route 和路径规划策略编号
↓
RouteExecution.route_id = 新 Route
RouteExecution.origin_cell_id 保持本次 Task 初始起点不变
RouteExecution.target_cell_id = 替代目标 Cell
RouteExecution.current_step_index = 0
RouteExecution.execution_status = MOVING
↓
DeploymentTask.planned_target_cell_id = 替代目标 Cell
DeploymentTask.target_cell_id = 替代目标 Cell
↓
DeploymentTask = MOVING
↓
Robotaxi 在同一个 RouteExecution 中继续行驶
```

约束：

1. 不创建新的 DeploymentTask；

2. 不创建新的 RouteExecution；

3. 新 Route 的起点必须是 Robotaxi 当前异常到达位置；

4. 新 Route 的终点必须属于同一 ServiceArea；

5. 新 Route 的终点必须排除当前异常位置和当前目标位置；

6. 新 Route 的终点必须满足 DeploymentTask.arrival_behavior；

7. 新 Route 的终点不得在 occupied_cell_ids 中；

8. 新 Route 的终点不得在 unavailable_cell_ids 中；

9. 新 Route 必须基于 RoadSegment.cell_sequence 和 RoadNode 连接关系生成；

10. 异常重规划成功后，DeploymentTask 与 RouteExecution 的当前目标位置应同步为新 Route 目标；

11. Route 和 route_history 都必须记录 `route_strategy_id = RPS-002`；

12. 该过程可以重复，直到正常到达或确认无法形成有效投放结果。


---

## 8. 目标 Cell 选择规则

RoutePlanning 可从 ServiceArea 中选择目标 Cell。

候选 Cell 必须满足：

```text
Cell 属于目标 ServiceArea
AND
Cell 不在 occupied_cell_ids
AND
Cell 不在 unavailable_cell_ids
AND
Cell 满足 arrival_behavior
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
优先选择距离 Robotaxi.current_cell_id 最近的候选 Cell
```

后续可扩展为：

```text
最短路径
最低能耗
最少转向
区域容量优先
等待订单概率优先
```

---

## 9. 道路网络要求

RoutePlanning 必须基于道路网络生成 Route。

道路网络至少包括：

```text
RoadSegment.cell_sequence
RoadSegment.allowed_direction
RoadSegment.segment_status
RoadNode 连接关系
```

RoutePlanning 不应使用无序 Road Cell 直接生成路径。

如果无法基于 RoadSegment 和 RoadNode 生成连续路径，则 RoutePlanning 应失败。

---

## 10. Route 生成结果要求

RoutePlanning 生成的 Route 必须包含：

|字段|含义|
|---|---|
|route_id|Route 编号|
|route_version|Route 版本|
|route_strategy_id|生成该 Route 使用的策略|
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
route_steps 起点 = origin_cell_id
route_steps 终点 = target_cell_id
相邻 step 必须连续
跨 RoadSegment 必须经过合法 RoadNode
```

---

## 11. Route 记录策略

每条由路径规划生成的 Route 都必须记录使用的策略。

|字段|含义|
|---|---|
|route_strategy_id|生成该 Route 使用的路径规划策略编号|

说明：

```text
初始 Route 使用 RPS-001；
异常到达后的替代 Route 使用 RPS-002；
通过该字段可以追踪 Route 是由哪种业务逻辑生成的。
```

---

## 12. route_history 记录策略

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

## 13. RoutePlanningRun 路径规划执行记录

每次 RoutePlanning 都应记录一次路径规划执行记录。

|字段|含义|
|---|---|
|route_planning_run_id|路径规划执行记录编号|
|route_strategy_id|使用的路径规划策略|
|task_id|关联 Task|
|route_execution_id|关联 RouteExecution|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|起点 Cell|
|target_cell_id|目标 Cell|
|result_route_id|生成的 Route|
|planning_result|成功 / 失败|
|failure_reason|失败原因|
|created_at|执行时间|

说明：

```text
Route.route_strategy_id 必须与 RoutePlanningRun.route_strategy_id 一致。
RouteHistory.route_strategy_id 必须与 Route.route_strategy_id 一致。
```

---

## 14. RoutePlanning 失败条件

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

## 15. 与 DeploymentTask 的关系

DeploymentTask 定义计划目标和到达后处理策略。
RoutePlanningStrategy 定义 Route 的生成规则。

初始投放：

```text
DeploymentTask.planned_target_cell_id
↓
RPS-001
↓
Route
```

异常到达后：

```text
DeploymentTask.blocked_handling_policy = SAME_SERVICE_AREA_RETRY
↓
RPS-002
↓
同 ServiceArea 内替代目标 Cell
↓
新 Route
```

如果 RPS-002 无法找到可用替代目标：

```text
RoutePlanning 失败
↓
DeploymentTask FAILED
↓
反馈运营决策系统
```

---

## 16. 与 RouteExecution 的关系

RoutePlanning 生成 Route，RouteExecution 执行 Route。

```text
RoutePlanningStrategy
↓
RoutePlanningRun
↓
Route
↓
RouteExecution
```

规则：

1. RoutePlanningStrategy 不创建 RouteExecution；

2. RoutePlanningRun 不创建 RouteExecution；

3. RoutePlanning 只生成 Route；

4. 初始 Route 绑定当前 Task 的 RouteExecution；

5. 重规划 Route 更新 RouteExecution.route_id；

6. 重规划 Route 追加到 RouteExecution.route_history；

7. Route 重规划不创建新的 RouteExecution；

8. 不同 Task 才创建新的 RouteExecution。


---

## 17. TaskEventLog

典型事件：

|event_type|含义|
|---|---|
|ROUTE_PLANNING_REQUESTED|请求路径规划|
|ROUTE_PLANNING_STARTED|路径规划开始|
|ROUTE_PLANNED|Route 生成成功|
|ROUTE_PLANNING_FAILED|Route 生成失败|
|ROUTE_REPLAN_REQUESTED|请求重规划|
|ROUTE_REPLANNED|重规划成功|
|ROUTE_STRATEGY_MISMATCH|Route 策略编号不一致|
|NO_AVAILABLE_TARGET_CELL|无可用目标 Cell|
|NO_CONNECTED_ROAD_SEGMENT|无连续道路片段|

---

## 18. 当前阶段实现原则

当前阶段 RoutePlanningStrategy 是模拟路径规划决策能力。

实现原则：

1. 当前阶段主要服务于运营投放任务；

2. 当前阶段不实现真实最短路算法；

3. 当前阶段不接入真实地图；

4. 但生成的 Route 必须基于 RoadSegment.cell_sequence 和 RoadNode 连接关系；

5. 初始路径规划和异常到达后的路径规划必须使用不同策略对象；

6. 生成的 Route 必须记录 `route_strategy_id`；

7. 异常到达后的路径规划必须复用同一个 RouteExecution；

8. Route 变化必须可追踪；

9. 运营人员通过按钮模拟未来路径规划系统的执行结果。


---

## 19. 核心规则

1. RoutePlanningStrategy 只定义路径规划策略；

2. RoutePlanningStrategy 不负责执行 Route；

3. RoutePlanningStrategy 不直接决定 Task 完成；

4. RoutePlanning 必须基于 RoadSegment.cell_sequence；

5. RoutePlanning 必须基于 RoadNode 连接关系；

6. RoutePlanning 必须结合 ServiceArea 候选点选择目标；

7. RoutePlanning 生成的 Route 必须有 route_steps；

8. route_steps 必须连续、有序、可执行；

9. Route 必须记录 route_strategy_id；

10. RoutePlanningRun 必须记录 route_strategy_id；

11. RouteHistory 必须记录 route_strategy_id；

12. Route、RoutePlanningRun、RouteHistory 的 route_strategy_id 必须一致；

13. 初始投放使用 RPS-001；

14. 异常到达同 ServiceArea 替代路径规划使用 RPS-002；

15. RPS-002 不创建新的 RouteExecution；

16. RPS-002 生成的新 Route 进入原 RouteExecution.route_history；

17. 无法生成可用 Route 时，应反馈 Task 和运营决策系统。


---

## 20. 核心原则

```text
RoutePlanningStrategy = 生成 Route 时采用的业务逻辑配置
```

```text
RoadSegment 提供有序 Cell；
RoadNode 提供连接关系；
ServiceArea 提供目标候选点；
RoutePlanningStrategy 定义策略；
RoutePlanningRun 记录执行；
Route 记录结果；
RouteExecution 执行 Route。
```

```text
策略负责定义逻辑；
执行记录负责记录执行；
Route 是二者之间的路径结果。
```
