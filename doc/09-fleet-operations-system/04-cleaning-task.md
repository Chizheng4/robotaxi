# CleaningTask：Robotaxi 清洁任务单

## 1. 定义

CleaningTask 是用于将单台 Robotaxi 从需要清洁状态恢复到可运营状态的运维任务单。

```text
CleaningTask = 单台 Robotaxi 清洁恢复任务单
```

它不负责订单履约、不负责供给投放，也不负责决定车辆是否应该进入某个服务区域。

## 2. 服务化边界

CleaningTask 不直接判断 Robotaxi 是否需要清洁。

清洁需求应由 `RobotaxiService.needsCleaning(...)` 或人工操作触发，再由 CleaningTaskService 创建任务：

```text
RobotaxiService 判断需要清洁
  ↓
CleaningTaskService 创建 CleaningTask
  ↓
CleaningTask 执行等待、目的地分配、行驶、清洁作业
  ↓
RobotaxiService 根据清洁结果恢复或阻塞 Robotaxi
```

等待中的 CleaningTask 不占用 Robotaxi.current_task_id。只有任务正式开始执行、车辆不再服务订单时，才允许占用当前任务引用。

## 3. 真实运营边界

清洁需求可能在 Robotaxi 正在服务订单时产生，例如：

- 乘客下车后车内脏污；
- 车辆传感器或摄像头发现外部污渍；
- 人工运营人员标记需要清洁；
- 运营规则按服务次数、里程或清洁检查触发清洁。

如果问题不影响当前服务，Robotaxi 应优先完成当前服务订单；清洁任务先创建并等待车辆可执行。

## 4. 核心关系

|关系|说明|
|---|---|
|1 个 CleaningTask 对应 1 台 Robotaxi|清洁结果必须归因到单车|
|1 个 CleaningTask 最多绑定 1 个当前 RouteExecution|用于前往清洁目的地|
|1 个 CleaningTask 分配 1 个 Worker|第一阶段简化为单人执行|
|CleaningTask 在 OpsCenter 内执行|OpsCenter 必须具备 `can_clean_robotaxi`|

## 5. 创建条件

创建 CleaningTask 的触发条件：

```text
RobotaxiService.needsCleaning(robotaxi, context) = true
OR Robotaxi.fleet_operation_status = NEED_CLEANING
OR 车辆清洁报警触发
OR 服务完成后规则判断需要清洁
OR 人工创建清洁任务
```

防重复规则：

```text
同一 Robotaxi 同一时间只能存在一个未完成 CleaningTask
```

未完成状态包括：

```text
CREATED
WAITING_ROBOTAXI_AVAILABLE
WAITING_DESTINATION_ASSIGNMENT
WAITING_ROUTE
MOVING_TO_OPS_CENTER
ARRIVED_OPS_CENTER
WAITING_WORKER_ASSIGNMENT
READY_TO_START
IN_PROGRESS
WAITING_RESULT_CONFIRMATION
```

## 6. 状态机

|task_status|含义|下一步动作|
|---|---|---|
|CREATED|清洁任务已创建|判断车辆是否可执行|
|WAITING_ROBOTAXI_AVAILABLE|等待 Robotaxi 完成当前订单或任务|等待车辆释放|
|WAITING_DESTINATION_ASSIGNMENT|等待分配清洁 OpsCenter|分配清洁目的地|
|WAITING_ROUTE|等待生成前往清洁中心的路线|路径规划|
|MOVING_TO_OPS_CENTER|Robotaxi 前往清洁中心|行驶推进|
|ARRIVED_OPS_CENTER|已到达清洁中心|分配 Worker / 清洁位|
|WAITING_WORKER_ASSIGNMENT|等待分配清洁 Worker|分配 Worker|
|READY_TO_START|Worker 已分配，等待开始清洁|开始清洁|
|IN_PROGRESS|清洁中|提交清洁结果|
|WAITING_RESULT_CONFIRMATION|等待清洁结果确认|确认结果|
|COMPLETED|清洁完成|无|
|CANCELLED|任务取消|无|
|FAILED|任务失败|人工处理|

## 7. 完整闭环

```text
RobotaxiService 判断需要清洁
  ↓
创建 CleaningTask
  ↓
如 Robotaxi 正在服务订单：WAITING_ROBOTAXI_AVAILABLE
  ↓
服务完成后 Robotaxi 不再参与订单匹配
  ↓
分配具备 can_clean_robotaxi 的 OpsCenter
  ↓
创建 RouteExecution 前往 OpsCenter
  ↓
到达 OpsCenter
  ↓
分配 Worker / 清洁位
  ↓
清洁中
  ↓
提交清洁结果
  ↓
Robotaxi 恢复 AVAILABLE 或进入 PENDING_INSPECTION
```

## 8. Robotaxi 状态变化

|阶段|availability_status|fleet_operation_status|说明|
|---|---|---|---|
|服务中触发清洁|AVAILABLE|WAITING_SERVICE_COMPLETION|当前服务可继续，不再接新任务|
|服务完成待清洁|UNAVAILABLE|NEED_CLEANING|等待执行清洁任务|
|前往清洁中心|UNAVAILABLE|MOVING_TO_OPS_CENTER|通过 RouteExecution 行驶|
|清洁中|UNAVAILABLE|IN_CLEANING|作业执行中|
|清洁完成|AVAILABLE 或 PENDING_INSPECTION|NONE 或 READY_FOR_INSPECTION|取决于配置|

第一阶段建议：清洁完成后直接恢复 `AVAILABLE`。后续可配置为“清洁后必须准入复核”。

## 9. 目的地分配规则

CleaningTask 不直接写死目的地。应通过调度规则选择 OpsCenter：

1. OpsCenter 必须 `can_clean_robotaxi = true`；
2. OpsCenter 当前可用清洁能力未满；
3. 优先选择距离 Robotaxi 当前位置较近的 OpsCenter；
4. 如未来引入队列，可综合等待时间、Worker 空闲、清洁位可用性；
5. 分配结果写入任务单：
   - `target_ops_center_id`
   - `target_cell_id`
   - `route_execution_id`

## 10. Worker 与资源规则

|资源|规则|
|---|---|
|Worker|需要清洁角色或具备清洁能力|
|清洁位|第一阶段可不单独建模；后续可引入 `cleaning_bay_id`|
|OpsCenter|必须支持清洁|

如果没有 Worker，任务停留在 `WAITING_WORKER_ASSIGNMENT`，Robotaxi 保持不可运营。

## 11. 关键字段建议

|字段|说明|
|---|---|
|cleaning_task_id / task_id|任务编号|
|task_type|CLEANING|
|task_status|任务状态|
|robotaxi_id|车辆编号|
|trigger_type|AUTO / MANUAL / TASK_RESULT|
|trigger_source|TRIP_COMPLETED / SENSOR_ALERT / MANUAL / RULE|
|target_ops_center_id|目标运营中心|
|target_cell_id|目标网格|
|route_execution_id|前往清洁中心的行驶记录|
|worker_id|清洁 Worker|
|pending_since_at|开始等待车辆可执行时间|
|clean_level_before|清洁前脏污等级|
|clean_level_after|清洁后脏污等级|
|result|PASSED / FAILED|
|failure_reason|失败原因|
|operation_created_at|任务业务创建时间|
|operation_completed_at|任务业务完成时间|

## 12. 成本与指标基础

CleaningTask 后续应支撑：

- 清洁次数；
- 平均清洁耗时；
- 清洁人力成本；
- 车辆清洁占用时长；
- 清洁导致的不可运营时长；
- 清洁后可运营恢复率。

## 13. 核心原则

```text
CleaningTask 不是立即清洁按钮，而是车辆从触发清洁需要到恢复可运营的完整闭环。
```
