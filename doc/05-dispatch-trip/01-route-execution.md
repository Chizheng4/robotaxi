# RouteExecution：行驶记录

## 1. 定义

RouteExecution 是 Robotaxi 在执行某个 Task 时，对指定 Route 的离散化移动执行记录。前端面向运营人员展示时统一命名为“行驶记录”。

```text
RouteExecution = Robotaxi 执行任务时的行驶过程记录
```

它不是 Task，也不是 Route，也不是 Trip。

---

## 2. 核心定位

```text
Task = 为什么要移动
Route = 计划怎么走
RouteExecution = 实际怎么走
```

示例：

```text
DeploymentTask：把 RTX-001 投放到 SA-003
Route：从当前 Cell 到目标 Cell 的规划路径
RouteExecution：RTX-001 沿 Route 一步步移动的行驶记录
```

---

## 3. 设计目的

当前系统不接入真实地图、真实车辆和真实自动驾驶数据。

因此，RouteExecution 用于模拟 Robotaxi 的移动过程，记录：

```text
车辆当前位置
当前执行到 Route 的哪一步
累计行驶距离
累计行驶时间
电量消耗
续航变化
是否到达目标
是否发生异常
```

它的价值是：

```text
把“Robotaxi 会移动”这件事，变成可观察、可操作、可计算的过程。
```

---

## 4. 适用任务

RouteExecution 可被所有需要车辆移动的 Task 复用。

|Task 类型|是否使用 RouteExecution|
|---|---|
|DeploymentTask|是|
|RebalanceTask|是|
|ParkingTask|是|
|ServiceTask|是|
|ChargingTask 回场|是|
|MaintenanceTask 回场|是|
|ReadinessCheckTask|否|

说明：

- ReadinessCheckTask 主要发生在 OpsCenter 内，不需要路径执行；

- ServiceTask 后续会同时关联 Trip，但车辆移动过程仍可由 RouteExecution 记录。

### 4.1 前端归属

RouteExecution 不是任务单，也不是静态 Route。

在运营平台前端中，RouteExecution 作为 Robotaxi 的执行过程记录展示，归属于：

```text
Robotaxi 管理
└── 行驶记录
```

说明：

- 菜单名称使用 `行驶记录`，与运营人员理解保持一致；

- 业务对象本质仍是 RouteExecution；

- 它记录 Robotaxi 在某个 Task 下如何执行 Route，不表达任务来源、业务目的或客户履约结果。

### 4.2 操作职责

当 DeploymentTask 完成路径规划后，RouteExecution 进入 `WAITING_START`。

后续车辆移动相关操作应发生在行驶记录中：

|execution_status|主要操作|反馈对象|
|---|---|---|
|WAITING_START|开始行驶|更新 RouteExecution，并反馈 Task 进入 MOVING|
|MOVING|继续行驶 / 到达目标|更新 Robotaxi 位置，并反馈 Task 完成或继续移动|
|COMPLETED|查看轨迹和结果|无状态变化|

说明：

- Task 说明为什么移动；

- Route 说明计划怎么走；

- RouteExecution 说明实际怎么走，并负责把移动结果反馈给 Task 和 Robotaxi。


---

## 5. 核心关系

```text
1 个 RouteExecution 对应 1 台 Robotaxi
1 个 RouteExecution 对应 1 个 Task
1 个 RouteExecution 引用 1 条 Route
```

不允许：

```text
1 个 RouteExecution 同时执行多个 Task
1 个 RouteExecution 同时绑定多台 Robotaxi
```

---

## 6. 核心属性

|属性|含义|
|---|---|
|route_execution_id|行驶记录唯一编号|
|task_id|关联 Task|
|task_type|关联任务类型|
|robotaxi_id|执行 Robotaxi|
|route_id|引用 Route|
|execution_status|执行状态|
|origin_cell_id|起点 Cell|
|target_cell_id|目标 Cell|
|current_cell_id|当前 Cell|
|current_step_index|当前执行到 Route 的第几步|
|total_step_count|Route 总步数|
|distance_traveled_km|已行驶距离|
|distance_remaining_km|剩余距离|
|time_elapsed|已消耗时间|
|battery_consumed_percent|已消耗电量百分比|
|started_at|开始时间|
|completed_at|完成时间|
|failure_reason|失败原因，可为空|

---

## 7. execution_status

|execution_status|含义|下一步动作|
|---|---|---|
|WAITING_START|等待行驶|开始行驶|
|MOVING|正在按 Route 行驶|继续行驶 / 自动行驶 / 暂停 / 重新规划|
|PAUSED|暂停移动|继续移动|
|COMPLETED|已到达目标|无|
|FAILED|执行失败|人工处理 / 重新规划|
|CANCELLED|执行取消|无|

---

## 8. 状态与功能按钮

前端可根据 execution_status 展示操作。

|execution_status|可用功能|操作结果|
|---|---|---|
|WAITING_START|开始行驶|进入 MOVING|
|MOVING|继续行驶|更新当前位置、电量、续航和任务反馈|
|PAUSED|查看详情|当前 demo 暂不提供暂停恢复操作|
|COMPLETED|查看详情|无状态变化|
|FAILED|查看详情|无状态变化|
|CANCELLED|查看详情|无状态变化|

说明：

- 当前 demo 只实现 `开始行驶`、`继续行驶` 和 `查看详情`；
- `自动行驶`、`暂停 / 继续`、`重新规划 Route` 属于后续能力，不在当前版本功能按钮中展示。

---

## 9. 执行流程

```text
Task 创建并需要移动
↓
RoutePlanning 生成 Route
↓
创建 RouteExecution
↓
RouteExecution = WAITING_START
↓
Robotaxi 开始行驶
↓
RouteExecution = MOVING
↓
按 Route step 推进
↓
持续更新 Robotaxi 位置、电量、里程
↓
到达 target_cell_id
↓
RouteExecution = COMPLETED
↓
Task 完成或进入下一阶段
```

---

## 10. 位置更新规则

Robotaxi 的当前位置以 `current_cell_id` 为准。

每继续行驶一步：

```text
RouteExecution.current_step_index + 1
RouteExecution.current_cell_id = 当前 step 对应 Cell
Robotaxi.current_cell_id = RouteExecution.current_cell_id
```

到达终点后：

```text
Robotaxi.current_cell_id = target_cell_id
Robotaxi.current_route_id = null
```

---

## 11. 里程与电量计算

第一阶段采用简化线性计算。

```text
distance_traveled_km = 已完成 Route step 的距离累计
distance_remaining_km = Route.total_distance_km - distance_traveled_km
battery_consumed_percent = distance_traveled_km / Robotaxi.max_range_km × 100
Robotaxi.estimated_range_km = Robotaxi.estimated_range_km - 本次新增行驶距离
Robotaxi.battery_percent = Robotaxi.battery_percent - 本次新增电量消耗
```

说明：

- 当前阶段不模拟真实速度、红绿灯、拥堵和加速度；

- 后续可增加拥堵系数、载客能耗、天气影响和电池衰减。


---

## 12. Route 重新规划（后续能力）

当执行中发现当前 Route 不可用时，后续可以触发重新规划。当前 demo 不实现该操作。

```text
RouteExecution = MOVING
↓
路径异常
↓
生成新 Route
↓
RouteExecution.route_id 更新
↓
继续执行
```

典型原因：

|failure_reason|含义|
|---|---|
|ROUTE_BLOCKED|路径阻塞|
|ROAD_SEGMENT_UNAVAILABLE|道路片段不可用|
|TARGET_CHANGED|目标位置变化|
|UNKNOWN|未知原因|

---

## 13. 对 Robotaxi 的影响

RouteExecution 执行过程中，应持续更新 Robotaxi。

|Robotaxi 字段|更新方式|
|---|---|
|current_cell_id|随 RouteExecution 当前 step 更新|
|current_route_id|执行中等于 route_id，完成后清空|
|current_task_id|执行中等于 task_id|
|battery_percent|随行驶距离减少|
|estimated_range_km|随行驶距离减少|
|total_mileage_km|随行驶距离增加|
|motion_status|执行中为 MOVING，到达后为 STOPPED / PARKED|

---

## 14. 对 Task 的影响

RouteExecution 完成后，应反馈对应 Task。

### 正常完成

```text
RouteExecution.execution_status = COMPLETED
↓
Task 可进入 COMPLETED 或下一阶段
```

### 执行失败

```text
RouteExecution.execution_status = FAILED
↓
Task.task_status = FAILED 或等待重新规划
```

### 执行取消

```text
RouteExecution.execution_status = CANCELLED
↓
Task.task_status = CANCELLED
```

---

## 15. TaskEventLog

RouteExecution 全流程需要记录事件。

|event_type|含义|
|---|---|
|ROUTE_EXECUTION_CREATED|行驶记录创建|
|ROUTE_EXECUTION_STARTED|开始行驶|
|ROUTE_STEP_COMPLETED|完成一步移动|
|ROUTE_EXECUTION_PAUSED|执行暂停|
|ROUTE_EXECUTION_RESUMED|执行恢复|
|ROUTE_REPLANNED|Route 重新规划|
|ROUTE_EXECUTION_COMPLETED|到达目标|
|ROUTE_EXECUTION_FAILED|执行失败|
|ROUTE_EXECUTION_CANCELLED|执行取消|
|BATTERY_UPDATED|电量更新|
|MILEAGE_UPDATED|里程更新|

---

## 16. 当前阶段实现建议

第一阶段使用离散步骤式模拟。

支持两种操作方式：

|方式|含义|
|---|---|
|手动行驶|点击“继续行驶”，Robotaxi 前进一个 Route step|
|自动播放|系统按固定时间间隔自动推进 step|

当前阶段不做真实物理仿真。

不模拟：

```text
真实 GPS
真实车速
红绿灯
车辆加速度
复杂交通流
车道级轨迹
```

---

## 17. 示例数据

```json
{
  "route_execution_id": "RE-001",
  "task_id": "TASK-DP-001",
  "task_type": "DEPLOYMENT",
  "robotaxi_id": "RTX-001",
  "route_id": "RT-001",
  "execution_status": "MOVING",
  "origin_cell_id": "C-34-32",
  "target_cell_id": "C-20-18",
  "current_cell_id": "C-30-28",
  "current_step_index": 4,
  "total_step_count": 12,
  "distance_traveled_km": 0.8,
  "distance_remaining_km": 1.6,
  "time_elapsed": 4,
  "battery_consumed_percent": 0.2,
  "started_at": "2026-01-01T09:00:00",
  "completed_at": null,
  "failure_reason": null
}
```

---

## 18. 核心规则

1. RouteExecution 只记录车辆移动执行过程；

2. RouteExecution 不表达业务目的，业务目的由 Task 表达；

3. RouteExecution 不负责路径规划，路径规划由 RoutePlanning 生成 Route；

4. 1 个 RouteExecution 只能绑定 1 台 Robotaxi；

5. 1 个 RouteExecution 只能绑定 1 个 Task；

6. Robotaxi 位置、电量、里程必须随 RouteExecution 更新；

7. 到达目标后，RouteExecution 进入 COMPLETED；

8. RouteExecution 完成后，应反馈 Task；

9. Trip 只用于客户服务履约，不用于所有车辆移动；

10. RouteExecution 可被多个不同 Task 类型复用。


---

## 19. 核心原则

```text
RouteExecution = Robotaxi 在任务下执行 Route 的离散化移动记录
```

```text
Task 决定为什么移动；
Route 决定计划怎么走；
RouteExecution 记录实际怎么走。
```

RouteExecution 的核心价值是让 Robotaxi 的移动过程可观察、可操作、可计算，并为后续调度、任务分配和经营指标提供基础数据。
