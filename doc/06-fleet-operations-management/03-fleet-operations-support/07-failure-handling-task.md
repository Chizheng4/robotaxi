# FailureHandlingTask：Robotaxi 故障处理任务单

## 1. 定义

FailureHandlingTask 是用于确认、分级和处置 Robotaxi 故障事件的任务单。

```text
FailureHandlingTask = 故障确认与处置决策任务单
```

它不直接等同于维修。故障处理的结果可能是误报、可继续运营、转维修、强制停运或退役。

## 2. 服务化边界

FailureHandlingTask 不直接维修 Robotaxi，也不直接决定所有后续作业。

故障需求应由 `RobotaxiService.hasActiveFailure(...)`、行驶异常、人工上报或运营故障规则触发，再由 FailureHandlingTaskService 创建任务：

```text
RobotaxiService 判断存在故障
  ↓
FailureHandlingTaskService 创建 FailureHandlingTask
  ↓
FailureHandlingTask 执行诊断和处置决策
  ↓
根据处置结果调用 RobotaxiService / MaintenanceTaskService / RetirementTaskService
```

等待中的 FailureHandlingTask 不占用 Robotaxi.current_task_id。高风险和严重故障可以通过中断策略立即阻塞当前任务；低/中风险可等待当前服务完成。

## 3. 触发来源

|触发来源|说明|
|---|---|
|车辆自检报警|传感器、硬件、软件、电池异常|
|行驶异常|运营行驶或履约行驶中异常|
|人工上报|运营人员或客户反馈|
|运营故障规则|按阈值、报警或异常事件触发故障|

## 4. 严重程度

|failure_severity|含义|当前服务处理|
|---|---|---|
|LOW|低风险，可完成当前服务|服务完成后处理|
|MEDIUM|中风险，建议停止接新任务|服务完成后处理或人工判断|
|HIGH|高风险，应立即停止运营|进入异常处理|
|CRITICAL|严重故障，不应继续行驶|后续需要救援 / 中止服务，第一阶段暂不展开|

第一阶段可先支持 `LOW / MEDIUM`，即不影响当前服务完成。

## 5. 状态机

|task_status|含义|下一步动作|
|---|---|---|
|CREATED|故障处理任务已创建|判断严重程度|
|WAITING_ROBOTAXI_AVAILABLE|等待当前服务完成|等待车辆释放|
|WAITING_DIAGNOSIS_ASSIGNMENT|等待分配诊断 Worker|分配 Worker|
|DIAGNOSING|诊断中|提交诊断结果|
|COMPLETED|处理完成|无|
|CANCELLED|任务取消|无|
|FAILED|处理失败|人工处理|

## 6. 处置结果

|disposition_result|说明|
|---|---|
|FALSE_ALARM|误报，无需处理|
|CONTINUE_OPERATION|可继续运营|
|NEEDS_MAINTENANCE|需要维修|
|NEEDS_RETIREMENT|不可修复，进入退役|
|WAIT_MANUAL_DECISION|等待人工决策|

## 7. 完整闭环

```text
RobotaxiService 判断故障事件
  ↓
创建 FailureHandlingTask
  ↓
判断是否允许当前服务完成
  ↓
如可完成：等待服务完成
  ↓
诊断 Worker 分配
  ↓
故障诊断
  ↓
处置结果：
  - 误报 / 已处理：恢复可运营
  - 需维修：创建 MaintenanceTask
  - 不可修复：创建 RetirementTask
```

## 8. Robotaxi 状态变化

|阶段|运营状态|当前任务 / 队列|
|---|---|---|
|故障任务排队|保持当前运营状态|进入 pending_task_queue|
|故障任务接管|运维中|current_task = FailureHandlingTask|
|诊断中|运维中|FailureHandlingTask = DIAGNOSING|
|诊断完成|可运营|当前阶段直接恢复可运营|
|转维修|运维中|创建 / 排队 MaintenanceTask|
|转退役|运维中|创建 / 排队 RetirementTask，退役完成后已退役|

## 9. 关键字段建议

|字段|说明|
|---|---|
|task_id|故障处理任务编号|
|task_type|FAILURE_HANDLING|
|task_status|任务状态|
|robotaxi_id|车辆编号|
|failure_event_id|故障事件编号|
|failure_type|故障类型|
|failure_severity|故障严重程度|
|allow_current_service_completion|是否允许完成当前服务|
|worker_id|诊断 Worker|
|pending_since_at|开始等待车辆可执行时间|
|diagnosis_result|诊断结果|
|disposition_result|处置结果|
|maintenance_task_id|关联维修任务，可为空|
|retirement_task_id|关联退役任务，可为空|

## 10. 核心原则

```text
FailureHandlingTask 解决“这是什么故障、该怎么处置”，MaintenanceTask 解决“如何修复”。
```
