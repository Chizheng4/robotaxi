# MaintenanceTask：Robotaxi 维修任务单

## 1. 定义

MaintenanceTask 是用于处理 Robotaxi 硬件、软件、传感器、电池、轮胎等维修事项的运维任务单。

```text
MaintenanceTask = 单台 Robotaxi 维修恢复任务单
```

维修任务通常比清洁和充电风险更高，但当前阶段维修完成后直接恢复可运营。是否增加维修后准入复核应作为未来可配置策略，不作为当前默认闭环。

## 2. 服务化边界

MaintenanceTask 不直接判断 Robotaxi 是否需要维修。

维修需求应由 `RobotaxiService.needsMaintenance(...)`、FailureHandlingTask 处置结果或人工操作触发，再由 MaintenanceTaskService 创建任务：

```text
RobotaxiService / FailureHandlingTask 判断需要维修
  ↓
MaintenanceTaskService 创建 MaintenanceTask
  ↓
MaintenanceTask 执行等待、目的地分配、行驶、维修作业
  ↓
RobotaxiService 根据维修结果恢复可运营、保持故障阻塞或转退役
```

等待中的 MaintenanceTask 不占用 Robotaxi.current_task_id。只有任务正式开始执行、车辆不再服务订单时，才允许占用当前任务引用。

## 3. 触发来源

|触发来源|说明|
|---|---|
|FailureHandlingTask|故障诊断后转维修|
|车辆自检报警|硬件、传感器、软件异常|
|周期保养|里程或时间达到保养阈值|
|人工创建|运营人员手动创建|
|服务异常|履约中发现车辆问题|

## 4. 状态机

|task_status|含义|下一步动作|
|---|---|---|
|CREATED|维修任务已创建|判断车辆是否可执行|
|WAITING_ROBOTAXI_AVAILABLE|等待当前服务或任务结束|等待车辆释放|
|WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT|等待分配维修 OpsCenter / 工位|分配目的地|
|WAITING_ROUTE|等待前往维修点路径|路径规划|
|MOVING_TO_MAINTENANCE_CENTER|前往维修点|行驶推进或拖车，第一阶段使用行驶记录|
|ARRIVED_MAINTENANCE_CENTER|到达维修点|分配维修资源|
|WAITING_RESOURCE_ASSIGNMENT|等待维修 Worker / 工位|分配资源|
|READY_TO_REPAIR|准备维修|开始维修|
|REPAIRING|维修中|维修完成|
|COMPLETED|维修完成|恢复可运营或触发下一排队任务|
|CANCELLED|任务取消|无|
|FAILED|维修失败|人工处理 / 转退役|

## 5. 完整闭环

```text
故障或保养触发
  ↓
创建 MaintenanceTask
  ↓
如当前服务可完成：等待服务完成
  ↓
任务被接管后 Robotaxi 进入运维中
  ↓
分配维修 OpsCenter / 工位 / Worker
  ↓
RouteExecution 前往维修点
  ↓
维修中
  ↓
维修完成
  ↓
维修成功：恢复可运营，并按待执行队列触发下一任务
维修失败：保持运维中 / 异常失败，必要时转 RetirementTask
```

## 6. Robotaxi 状态变化

|阶段|运营状态|当前任务 / 队列|
|---|---|---|
|维修任务排队|保持当前运营状态|进入 pending_task_queue|
|维修任务接管|运维中|current_task = MaintenanceTask|
|前往维修点|运维中|关联 RouteExecution|
|维修中|运维中|MaintenanceTask = REPAIRING|
|维修成功|可运营|按队列触发下一任务或空闲|
|维修失败|运维中 / 异常失败|等待人工处理或转退役|
|不可修复|已退役|RetirementTask 完成后进入已退役|

## 7. 维修类型

|maintenance_type|说明|
|---|---|
|SENSOR|传感器维修|
|HARDWARE|硬件维修|
|SOFTWARE|软件修复|
|BATTERY|电池维修|
|TIRE|轮胎维修|
|BODY|车身维修|
|SCHEDULED_SERVICE|周期保养|
|UNKNOWN|未知维修|

## 8. 关键字段建议

|字段|说明|
|---|---|
|task_id|维修任务编号|
|task_type|MAINTENANCE|
|task_status|任务状态|
|robotaxi_id|车辆编号|
|maintenance_type|维修类型|
|failure_source_task_id|来源故障处理任务，可为空|
|target_ops_center_id|目标运营中心|
|maintenance_bay_id|维修工位，第一阶段可为空|
|worker_id|维修 Worker|
|route_execution_id|前往维修点的行驶记录|
|pending_since_at|开始等待车辆可执行时间|
|diagnosis_summary|诊断摘要|
|repair_result|REPAIRED / NOT_REPAIRABLE / PARTIALLY_REPAIRED|
|requires_readiness_check|是否需要准入复核，当前默认 false；未来可配置|

## 9. 成本与指标基础

MaintenanceTask 后续应支撑：

- 维修次数；
- 平均维修耗时；
- 维修成本；
- 故障到恢复时间；
- 维修后准入通过率；
- 不可修复率；
- 车辆停运损失。
