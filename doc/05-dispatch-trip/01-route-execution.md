# RouteExecution：行驶记录

## 1. 定义

行驶记录（RouteExecution）是 Robotaxi 在某个 Task 下，对 Route 的实际执行过程记录。

```text
RouteExecution = Robotaxi 对 Route 的实际执行过程记录
```

它用于记录 Robotaxi 在任务执行过程中如何沿 Route 移动，以及移动过程中产生的位置、里程、电量、到达结果和执行状态变化。

行驶记录不是：

```text
Task
Route
Trip
```

---

## 2. 核心定位

```text
Task = 为什么移动
Route = 计划怎么移动
RouteExecution = 实际如何执行 Route
```

职责边界：

|对象|职责|
|---|---|
|Task|表达业务目标|
|Route|表达计划路径|
|行驶记录（RouteExecution）|表达路径执行过程|
|Robotaxi|执行移动|
|Trip|客户服务履约过程，后续能力|

说明：

- 行驶记录只记录移动执行过程；
- 业务目标和业务结果由对应 Task 判断；
- 前端面向运营人员展示时统一命名为 `行驶记录`。

---

## 3. 核心关系

```text
1 个行驶记录对应 1 台 Robotaxi
1 个行驶记录对应 1 个 Task
1 个行驶记录当前执行 1 条 Route
```

同时允许：

```text
Task 可以触发 Route 变化
行驶记录可以引用新的 Route
但同一时刻只能执行 1 条 Route
```

说明：

- Route 重规划不创建新的行驶记录；
- 同一行驶记录通过 `route_id` 和 `route_history` 记录当前路径与历史路径变化；
- 不同 Task 不能共用同一个行驶记录。

---

## 4. 适用范围

只要 Robotaxi 需要从一个 Cell 移动到另一个 Cell，就应创建行驶记录。

|Task 类型|是否使用行驶记录|
|---|---|
|DeploymentTask|是|
|ServiceTask|是，后续能力|
|ChargingTask 回场|是，后续能力|
|MaintenanceTask 回场|是，后续能力|
|RebalanceTask|是，后续能力|
|ReadinessCheckTask|否|

---

## 5. 核心属性

|属性|含义|
|---|---|
|route_execution_id|行驶记录编号|
|task_id|关联任务|
|task_type|关联任务类型|
|robotaxi_id|执行 Robotaxi|
|route_id|当前执行 Route|
|route_strategy_id|当前 Route 使用的路径规划策略编号|
|execution_status|行驶状态|
|origin_cell_id|起点 Cell|
|planned_target_service_area_id|计划目标 ServiceArea|
|planned_target_cell_id|计划目标 Cell|
|target_cell_id|当前 Route 目标 Cell|
|target_service_area_id|当前 Route 目标 ServiceArea|
|actual_target_service_area_id|实际停靠 ServiceArea，完成后写入|
|actual_target_cell_id|实际停靠 Cell，完成后写入|
|current_cell_id|当前 Cell|
|current_step_index|当前执行到 Route 的第几个 step|
|total_step_count|Route 总 step 数|
|distance_traveled_km|已行驶距离|
|distance_remaining_km|剩余距离|
|time_elapsed|已耗时|
|battery_consumed_percent|已消耗电量百分比|
|same_service_area_retry_allowed|异常到达时是否允许同 ServiceArea 替代目标|
|current_target_service_area_id|当前目标 ServiceArea|
|route_history|Route 变化历史|
|started_at|开始时间|
|completed_at|完成时间|
|failure_reason|失败原因，可为空|

说明：`planned_target_*` 表示关联任务创建时的原始计划目标；`target_cell_id / target_service_area_id` 表示当前 Route 目标，会随异常到达后的替代路径规划更新。

---

## 6. execution_status

行驶记录状态只表达路径执行状态。

|execution_status|含义|下一步动作|
|---|---|---|
|WAITING_START|等待行驶|开始行驶|
|MOVING|正在按当前 Route 行驶|继续行驶|
|ARRIVED|已到达当前 Route 目标点，等待到达结果处理|正常到达 / 异常到达|
|ARRIVAL_ABNORMAL|异常到达，等待任务单重新路径规划|查看详情|
|PAUSED|暂停行驶|查看详情，暂停恢复为后续能力|
|COMPLETED|行驶记录已完成|查看详情|
|FAILED|执行失败|查看异常|
|CANCELLED|执行取消|查看详情|

说明：

- `ARRIVED` 表示行驶记录到达当前 Route 目标点，但不代表 DeploymentTask 已完成；
- 到达后必须由运营人员或后续系统模拟反馈正常到达 / 异常到达；
- 选择异常到达后，行驶记录必须进入 `ARRIVAL_ABNORMAL`，不再继续显示正常到达 / 异常到达操作；
- 异常到达后的路径规划入口在 DeploymentTask，由任务单驱动更新同一个行驶记录；
- 正常到达之前可以多次异常到达并多次更新当前 Route，但每次替代目标必须排除本任务中已经异常到达过的目标点；
- 如果同 ServiceArea 内没有可用替代目标，路径规划执行记录应显示失败，行驶记录保持 `ARRIVAL_ABNORMAL`，等待后续运营决策能力闭环；
- 当前阶段不实现自动行驶、暂停恢复和完整重规划系统。

---

## 7. 状态与功能按钮

前端可根据 execution_status 展示操作。

|execution_status|可用功能|操作结果|
|---|---|---|
|WAITING_START|开始行驶|进入 MOVING，并反馈 DeploymentTask 进入 MOVING|
|MOVING|继续行驶|推进一个 Route step；到达当前目标点时进入 ARRIVED|
|ARRIVED|正常到达|反馈 DeploymentTask 正常到达并完成|
|ARRIVED|异常到达|弹窗选择异常类型，反馈 DeploymentTask 进入 ARRIVAL_ABNORMAL|
|PAUSED|查看详情|当前 demo 暂不提供暂停恢复操作|
|COMPLETED|查看详情|无状态变化|
|FAILED|查看异常|无状态变化|
|CANCELLED|查看详情|无状态变化|

说明：

- `正常到达` 和 `异常到达` 只在 Robotaxi 已到达当前 Route 目标点时显示；
- `异常到达` 必须弹窗确认异常类型；
- 异常到达后的替代路径规划发生在 DeploymentTask 的 `ARRIVAL_ABNORMAL` 状态中。

---

## 8. 执行流程

```text
Task 创建并需要移动
↓
RoutePlanning 生成 Route
↓
创建 / 绑定行驶记录
↓
RouteExecution = WAITING_START
↓
Robotaxi 开始行驶
↓
RouteExecution = MOVING
↓
按 Route step 推进
↓
到达当前 Route 目标点
↓
RouteExecution = ARRIVED
↓
正常到达 / 异常到达
```

正常到达：

```text
RouteExecution = COMPLETED
DeploymentTask = COMPLETED
Robotaxi 停靠 / 临停 / 待命
```

异常到达：

```text
RouteExecution 保持当前行驶记录
RouteExecution = ARRIVAL_ABNORMAL
DeploymentTask = ARRIVAL_ABNORMAL
等待异常到达后的路径规划
```

---

## 9. 位置更新规则

Robotaxi 的当前位置以 `current_cell_id` 为准。

每继续行驶一步：

```text
RouteExecution.current_step_index + 1
RouteExecution.current_cell_id = 当前 step 对应 Cell
Robotaxi.current_cell_id = RouteExecution.current_cell_id
```

到达当前 Route 目标点后：

```text
RouteExecution.execution_status = ARRIVED
Robotaxi.current_cell_id = target_cell_id
Robotaxi.current_route_id = route_id
```

只有正常完成或任务取消后，Robotaxi 的 `current_route_id` 才清空或切换到新任务 Route。

---

## 10. 里程与电量计算

第一阶段采用简化线性计算。

```text
distance_traveled_km = 已完成 Route step 的距离累计
distance_remaining_km = Route.total_distance_km - distance_traveled_km
battery_consumed_percent = distance_traveled_km / Robotaxi.max_range_km × 100
Robotaxi.estimated_range_km = Robotaxi.estimated_range_km - 本次新增行驶距离
Robotaxi.battery_percent = Robotaxi.battery_percent - 本次新增电量消耗
```

当前阶段不模拟真实速度、红绿灯、拥堵、加速度和车道级轨迹。

---

## 11. 正常到达

当行驶记录处于 `ARRIVED`，并选择 `正常到达`：

```text
arrival_execution_result = NORMAL_ARRIVAL
↓
RouteExecution = COMPLETED
↓
反馈 DeploymentTask
↓
DeploymentTask = COMPLETED
```

同时更新 Robotaxi：

```text
Robotaxi.current_cell_id = 当前目标 Cell
Robotaxi.current_route_id = null
Robotaxi.current_task_id = null
Robotaxi.motion_status = TEMP_STOPPED / PARKED
```

---

## 12. 异常到达

当行驶记录处于 `ARRIVED`，并选择 `异常到达`：

```text
弹出异常确认框
↓
选择异常类型
↓
确认
↓
arrival_execution_result = 选择的异常类型
DeploymentTask = ARRIVAL_ABNORMAL
```

异常确认框应展示：

- Robotaxi 编号、当前状态、当前位置；
- 行驶记录编号、状态、当前 step；
- 当前 Route 编号；
- 当前 Route 起点 / 终点；
- Robotaxi 当前 Cell 的结构化位置上下文；
- 异常类型选择。

可选异常类型：

|异常类型|含义|
|---|---|
|ARRIVED_WITH_TARGET_OCCUPIED|目标点位被占用|
|ARRIVED_WITH_TARGET_BLOCKED|目标点位被阻塞|
|ARRIVED_WITH_NO_AVAILABLE_STOPPING_CELL|无可临停点位|
|ARRIVED_WITH_NO_AVAILABLE_PARKING_CELL|无可停车点位|
|TARGET_SERVICE_AREA_UNAVAILABLE|目标 ServiceArea 不可用|
|UNKNOWN|未知异常|

---

## 13. 异常到达后的 Route 更新

异常到达后的路径规划由 DeploymentTask 的 `ARRIVAL_ABNORMAL` 状态触发。

行驶记录不新建，只更新当前 Route，并记录 route_history：

```text
DeploymentTask = ARRIVAL_ABNORMAL
↓
路径规划
↓
RouteExecution.route_history 追加旧 Route 记录
↓
RouteExecution.route_id = 新 Route
RouteExecution.origin_cell_id = Robotaxi 当前异常到达位置
RouteExecution.target_cell_id = 同 ServiceArea 内替代目标点位
RouteExecution.current_step_index = 0
RouteExecution.execution_status = MOVING
↓
Robotaxi 继续行驶
```

默认规则：

```text
same_service_area_retry_allowed = true
```

重复异常规则：

```text
ARRIVED
↓
异常到达
↓
ARRIVAL_ABNORMAL
↓
DeploymentTask 触发异常到达重规划
↓
成功：RouteExecution 更新为新 Route 并进入 MOVING
失败：RouteExecution 保持 ARRIVAL_ABNORMAL，等待后续运营决策
```

---

## 14. route_history

route_history 用于记录同一个行驶记录中经历过的 Route。

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

典型 route_change_reason：

|值|含义|
|---|---|
|INITIAL_PLANNING|初始路径规划|
|ABNORMAL_ARRIVAL_REPLAN|异常到达后重新规划|
|ROUTE_BLOCKED_REPLAN|路径阻塞后重新规划，后续能力|

---

## 15. 对 Task 的影响

行驶记录不决定业务目标，只反馈移动和到达结果。

|行驶记录结果|Task 处理|
|---|---|
|ARRIVED + NORMAL_ARRIVAL|DeploymentTask 进入 COMPLETED|
|ARRIVED + 异常类型|DeploymentTask 进入 ARRIVAL_ABNORMAL|
|FAILED|Task 进入失败处理或等待决策系统处理|
|CANCELLED|Task 进入取消处理|

---

## 16. TaskEventLog

典型事件：

|event_type|含义|
|---|---|
|ROUTE_EXECUTION_CREATED|创建行驶记录|
|ROUTE_EXECUTION_STARTED|开始行驶|
|ROUTE_STEP_COMPLETED|完成一步移动|
|ROUTE_EXECUTION_ARRIVED|到达当前 Route 目标点|
|ARRIVAL_NORMAL|正常到达|
|ARRIVAL_ABNORMAL|异常到达|
|ROUTE_REPLANNED|Route 重规划完成|
|ROUTE_EXECUTION_COMPLETED|行驶记录完成|
|ROUTE_EXECUTION_FAILED|执行失败|
|ROUTE_EXECUTION_CANCELLED|执行取消|
|BATTERY_UPDATED|电量更新|
|MILEAGE_UPDATED|里程更新|

---

## 17. 核心规则

1. 行驶记录只负责记录 Route 的执行过程；
2. 行驶记录不表达业务目标；
3. 行驶记录不负责路径规划；
4. 行驶记录必须绑定 1 台 Robotaxi；
5. 行驶记录必须绑定 1 个 Task；
6. 行驶记录当前只能执行 1 条 Route；
7. Route 重规划不创建新的行驶记录；
8. 行驶记录必须按 Route step 顺序执行；
9. Robotaxi 位置必须随行驶记录更新；
10. Robotaxi 电量与里程必须随行驶记录更新；
11. 行驶记录到达不等于 Task 完成；
12. 行驶记录正常到达后才反馈 DeploymentTask 完成；
13. 行驶记录异常到达后应反馈 DeploymentTask 进入 ARRIVAL_ABNORMAL；
14. 行驶记录可以在执行过程中更换 Route；
15. 行驶记录异常不直接创建新 Task。

---

## 18. 核心原则

```text
RouteExecution = Robotaxi 对 Route 的实际执行记录
```

```text
Task 决定为什么移动；
Route 决定计划怎么移动；
RouteExecution 记录实际如何执行 Route。
```

行驶记录的核心价值是让 Robotaxi 的移动过程可观察、可操作、可计算，并为后续调度、计划、任务和经营指标提供基础数据。

---

## 19. v020 修订：运营行驶记录路径规划职责

RouteExecution 是运营行驶记录，是运营投放任务下 Robotaxi 行驶过程的执行记录。

v020 起，运营投放的路径规划入口迁移到 RouteExecution：

|状态值|中文显示|可执行操作|
|---|---|---|
|WAITING_ROUTE|待路径规划|路径规划|
|MOVING|行驶中|继续行驶|
|ARRIVED|已到达|正常到达 / 异常到达|
|ARRIVAL_ABNORMAL|异常到达|路径规划|
|COMPLETED|已完成|查看详情|
|FAILED|失败|查看详情|

规则：

1. RouteExecution 在 `WAITING_ROUTE` 时调用 RoutePlanningStrategy；
2. RoutePlanningStrategy 只返回 Route，不修改调用方状态；
3. RouteExecution 根据 RoutePlanningRun 和 Route 更新 `route_id`、`route_history`、`origin_cell_id`、`target_cell_id`；
4. 初始路径规划成功后，RouteExecution 进入 `MOVING`；
5. 异常到达后的路径规划仍更新同一个 RouteExecution，不创建新的运营行驶记录；
6. 当同服务区没有可用替代目标时，RoutePlanningRun 和 RouteExecution 应记录失败，DeploymentTask 暂时保持异常到达等待后续运营决策。
