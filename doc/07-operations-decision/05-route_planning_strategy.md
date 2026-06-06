# RoutePlanningStrategy：路径规划策略

## 1. 定义

RoutePlanningStrategy 是路径规划时使用的策略对象。

```text
RoutePlanningStrategy = 生成 Route 时采用的业务逻辑配置
```

当前阶段不实现真实路径算法，但必须记录每次 Route 是通过哪种策略生成的，便于后续分析、调试和扩展。

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

|对象|职责|
|---|---|
|DeploymentTask|决定 Robotaxi 要去哪里，以及到达后如何判断投放结果|
|RoutePlanningStrategy|定义生成 Route 时采用的策略逻辑|
|Route|记录由某个策略生成的路径结果|
|RouteExecution / 行驶记录|按 Route 执行并记录过程|
|Robotaxi|执行移动|

---

## 3. 核心属性

|字段|含义|
|---|---|
|route_strategy_id|路径规划策略编号|
|strategy_name|路径规划策略名称|
|strategy_type|路径规划策略类型|
|trigger_task_status|触发任务状态|
|origin_rule|起点选择规则|
|target_rule|终点选择规则|
|service_area_scope_rule|ServiceArea 范围规则|
|route_update_rule|Route 更新规则|
|strategy_status|策略状态|
|description|策略说明|

---

## 4. 当前策略对象

当前阶段需要 2 个 RoutePlanningStrategy。

|route_strategy_id|strategy_name|strategy_type|当前触发场景|
|---|---|---|---|
|RPS-001|初始运营投放路径规划策略|INITIAL_DEPLOYMENT_ROUTE|DeploymentTask = WAITING_ROUTE|
|RPS-002|异常到达同服务区替代路径规划策略|ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN|DeploymentTask = ARRIVAL_ABNORMAL|

---

## 5. 策略一：初始运营投放路径规划策略

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

策略规则：

|规则|内容|
|---|---|
|origin_rule|使用 Robotaxi 当前所在 Cell|
|target_rule|使用 DeploymentTask.planned_target_cell_id|
|service_area_scope_rule|不改变计划目标 ServiceArea|
|route_update_rule|创建初始 Route，并创建 / 绑定行驶记录|

流程：

```text
DeploymentTask = WAITING_ROUTE
↓
运营人员点击 路径规划
↓
使用 RPS-001
↓
生成初始 Route
↓
Route.route_strategy_id = RPS-001
↓
创建 / 绑定 RouteExecution
↓
RouteExecution.route_history 记录 INITIAL_PLANNING 和路径规划策略编号
↓
DeploymentTask = WAITING_START
RouteExecution = WAITING_START
```

---

## 6. 策略二：异常到达同服务区替代路径规划策略

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
|arrival_execution_result|异常到达类型|
|route_execution_id|当前行驶记录|

策略规则：

|规则|内容|
|---|---|
|origin_rule|使用 Robotaxi 当前异常到达位置|
|target_rule|选择同一 ServiceArea 内不同于当前异常位置、原当前目标位置的其他可用 Cell|
|service_area_scope_rule|只能在 planned_target_service_area_id 对应 ServiceArea 内选择|
|route_update_rule|更新同一个行驶记录的当前 Route，并同步更新任务单当前计划目标位置，不创建新行驶记录|

流程：

```text
DeploymentTask = ARRIVAL_ABNORMAL
↓
运营人员点击 路径规划
↓
使用 RPS-002
↓
RoutePlanning 从当前异常位置生成到替代目标点的 Route
↓
Route.route_strategy_id = RPS-002
↓
RouteExecution.route_history 追加上一条 Route 和路径规划策略编号
↓
RouteExecution.route_id = 新 Route
RouteExecution.origin_cell_id = Robotaxi 当前异常到达位置
RouteExecution.planned_target_cell_id = 替代目标 Cell
RouteExecution.target_cell_id = 替代目标 Cell
RouteExecution.current_step_index = 0
RouteExecution.execution_status = MOVING
↓
DeploymentTask.planned_target_cell_id = 替代目标 Cell
DeploymentTask.target_cell_id = 替代目标 Cell
↓
DeploymentTask = MOVING
↓
Robotaxi 在同一个行驶记录中继续行驶
```

约束：

- 不创建新的 DeploymentTask；
- 不创建新的 RouteExecution；
- 新 Route 的起点必须是 Robotaxi 当前异常到达位置；
- 新 Route 的终点必须是同一 ServiceArea 内的其他点位，并排除当前异常位置和当前目标位置；
- 异常重规划成功后，DeploymentTask 与 RouteExecution 的计划目标位置应同步为新 Route 目标；
- Route 和 route_history 都必须记录 `route_strategy_id`；
- 该过程可以重复，直到正常到达或确认无法形成有效投放结果。

---

## 7. Route 记录策略

每条由路径规划生成的 Route 都必须记录使用的策略。

|字段|含义|
|---|---|
|route_strategy_id|生成该 Route 使用的路径规划策略编号|

说明：

- 初始 Route 使用 `RPS-001`；
- 异常到达后的替代 Route 使用 `RPS-002`；
- 通过该字段可以追踪 Route 是由哪种业务逻辑生成的。

---

## 8. route_history 记录策略

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

---

## 9. 当前阶段实现原则

当前阶段 RoutePlanningStrategy 是模拟运营决策能力。

实现原则：

1. 只服务于运营投放任务；
2. 不实现真实最短路算法；
3. 不接入真实地图；
4. 初始路径规划和异常到达后的路径规划必须使用不同策略对象；
5. 生成的 Route 必须记录 `route_strategy_id`；
6. 异常到达后的路径规划必须复用同一个行驶记录；
7. Route 变化必须可追踪；
8. 运营人员通过按钮模拟未来路径规划系统的执行结果。
