# ReadinessCheckTask：运营准入任务单

## 1. 定义

ReadinessCheckTask 是用于确认单台 Robotaxi 是否具备进入运营闭环资格的检查任务单。

```text
ReadinessCheckTask = 单台 Robotaxi 的运营准入任务单
```

它发生在 Robotaxi 到达 OpsCenter 后、正式投放到运营区域之前。

---

## 2. 服务化边界

ReadinessCheckTask 不自行扫描所有车辆并直接修改 Robotaxi 状态。

准入任务的创建入口应由 RobotaxiService 或 ReadinessCheckTaskService 统一承接：

```text
RobotaxiService 判断 Robotaxi 需要准入检查
  ↓
ReadinessCheckTaskService 创建准入任务
  ↓
ReadinessCheckTask 执行检查生命周期
  ↓
RobotaxiService 根据检查结果回写可运营状态
```

这样维修、故障恢复、新车上线、人工复核和后续上层自动化都可以复用同一套准入闭环。

---

## 3. 核心关系

```text
1 个 ReadinessCheckTask 对应 1 台 Robotaxi
1 个 ReadinessCheckTask 分配 1 个 Worker
```

不允许：

```text
1 个任务单包含多台 Robotaxi
1 个任务单分配多个 Worker
```

原因：

- 检查结果只对应单台 Robotaxi；
    
- 问题类型只对应单台 Robotaxi；
    
- Robotaxi 状态更新必须清晰；
    
- Worker 执行责任必须清晰。
    

---

## 4. 触发方式

ReadinessCheckTask 支持多种触发来源，但创建逻辑必须统一。

|触发方式|含义|
|---|---|
|AUTO|系统按运营配置扫描候选 Robotaxi|
|MANUAL|人工点击按钮触发|
|TASK_RESULT|维修、故障处理、退役取消等任务结果触发|

所有触发方式共用同一套后续逻辑：

```text
RobotaxiService / ReadinessCheckTaskService 查询候选 Robotaxi
↓
创建任务单
↓
分配 Worker
↓
Worker 检查
↓
提交检查结果
↓
更新 Robotaxi 状态
↓
记录消息
```

---

## 5. 创建条件

创建 ReadinessCheckTask 必须满足：

```text
Robotaxi.availability_status = PENDING_INSPECTION
OR Robotaxi.fleet_operation_status = READY_FOR_INSPECTION
AND
该 Robotaxi 当前不存在未完成的 ReadinessCheckTask
AND
OpsCenter.can_inspect_robotaxi = true
```

说明：

- Worker 是否空闲不影响任务创建；
    
- 没有空闲 Worker 时，任务停留在 `WAITING_ASSIGNMENT`；
    
- Worker 空闲后可继续分配。
    

---

## 6. 防重复规则

同一台 Robotaxi 同一时间只能存在一张未完成的 ReadinessCheckTask。

未完成状态包括：

```text
WAITING_ASSIGNMENT
WAITING_CHECK
CHECKING
```

重复触发时不创建新任务，只记录消息：

```text
ROBOTAXI_ALREADY_HAS_PENDING_CHECK_TASK
```

---

## 7. 字段字典

### 7.1 ReadinessCheckTask 字段

|英文字段|中文字段|说明|
|---|---|---|
|task_id|任务编号|任务唯一编号|
|task_type|任务类型|固定为 READINESS_CHECK|
|task_status|任务状态|当前任务等待的下一步动作|
|task_priority|任务优先级|默认 NORMAL|
|trigger_type|触发方式|AUTO / MANUAL|
|source_type|来源类型|固定为 OPS_CENTER|
|source_id|来源编号|OpsCenter ID|
|source_task_id|来源任务编号|维修、故障处理等来源任务，可为空|
|robotaxi_id|Robotaxi 编号|被检查 Robotaxi|
|worker_id|作业人员编号|执行 Worker，可为空|
|ops_center_id|运营中心编号|检查所在 OpsCenter|
|check_result|检查结果|PASSED / FAILED，可为空|
|issue_type|问题类型|检查不通过原因，可为空|
|created_at|创建时间|任务创建时间|
|assigned_at|分配时间|Worker 分配时间|
|started_at|开始时间|检查开始时间|
|completed_at|完成时间|任务完成时间|

### 7.2 TaskEventLog 字段

|英文字段|中文字段|说明|
|---|---|---|
|event_id|事件编号|事件唯一编号|
|task_id|任务编号|关联任务，可为空|
|robotaxi_id|Robotaxi 编号|关联 Robotaxi，可为空|
|worker_id|作业人员编号|关联 Worker，可为空|
|trigger_type|触发方式|AUTO / MANUAL，可为空|
|event_type|事件类型|流程事件类型|
|event_result|事件结果|SUCCESS / FAILED / SKIPPED|
|message|事件消息|运营人员可读消息|
|created_at|创建时间|事件发生时间|

---

## 8. 核心属性

|属性|含义|
|---|---|
|task_id|任务唯一编号|
|task_type|固定为 READINESS_CHECK|
|task_status|当前任务状态|
|task_priority|默认 NORMAL|
|trigger_type|AUTO / MANUAL|
|source_type|固定为 OPS_CENTER|
|source_id|OpsCenter ID|
|robotaxi_id|被检查 Robotaxi|
|worker_id|执行 Worker，可为空|
|ops_center_id|检查所在 OpsCenter|
|check_result|检查结果，可为空|
|issue_type|问题类型，可为空|
|created_at|创建时间|
|assigned_at|分配时间|
|started_at|开始时间|
|completed_at|完成时间|

---

## 9. task_status

任务状态应表达：

```text
当前任务正在等待什么动作
```

而不是表达：

```text
上一步已经完成了什么结果
```

|task_status|含义|下一步动作|
|---|---|---|
|WAITING_ASSIGNMENT|等待分配 Worker|分配 Worker|
|WAITING_CHECK|已分配 Worker，等待开始检查|Worker 开始检查|
|CHECKING|Worker 正在检查|提交检查结果|
|COMPLETED|检查已完成|无|
|CANCELLED|任务已取消|无|
|FAILED|任务异常失败|人工处理|

说明：

```text
task_status 表达下一步动作。
check_result 表达检查结果。
```

---

## 10. 状态与功能按钮

前端应根据 task_status 展示可用操作。

|task_status|可用功能|操作人|操作结果|
|---|---|---|---|
|WAITING_ASSIGNMENT|分配 Worker|系统 / 运营人员|成功后进入 WAITING_CHECK|
|WAITING_CHECK|开始检查|Worker|进入 CHECKING|
|CHECKING|提交检查结果|Worker|进入 COMPLETED|
|COMPLETED|查看详情|运营人员 / Worker|无状态变化|
|CANCELLED|查看详情|运营人员|无状态变化|
|FAILED|查看异常|运营人员|无状态变化|

---

## 11. 功能操作规则

### 11.1 手动触发创建任务

功能按钮：

```text
生成准入检查任务
```

操作结果：

|情况|结果|
|---|---|
|存在候选 Robotaxi|创建任务|
|不存在候选 Robotaxi|不创建任务，记录 NO_CANDIDATE_ROBOTAXI|
|Robotaxi 已有未完成任务|不创建任务，记录 ROBOTAXI_ALREADY_HAS_PENDING_CHECK_TASK|

---

### 11.2 分配 Worker

适用状态：

```text
WAITING_ASSIGNMENT
```

分配条件：

```text
worker_status = IDLE
AND
Worker 属于同一个 OpsCenter
AND
Worker.current_task_id = null
```

成功后：

```text
Task.task_status = WAITING_CHECK
Task.worker_id = worker_id
Worker.worker_status = BUSY
Worker.current_task_id = task_id
```

失败时：

```text
Task.task_status = WAITING_ASSIGNMENT
```

并记录：

```text
NO_IDLE_WORKER
```

---

### 11.3 开始检查

适用状态：

```text
WAITING_CHECK
```

操作人：

```text
已分配 Worker
```

成功后：

```text
Task.task_status = CHECKING
Task.started_at = 当前时间
```

---

### 11.4 提交检查结果

适用状态：

```text
CHECKING
```

操作人：

```text
已分配 Worker
```

提交内容：

```text
check_result = PASSED / FAILED
```

如果检查不通过，必须填写：

```text
issue_type
```

成功后：

```text
Task.task_status = COMPLETED
Task.completed_at = 当前时间
Worker.worker_status = IDLE
Worker.current_task_id = null
```

---

## 12. check_result

|check_result|含义|
|---|---|
|PASSED|检查通过|
|FAILED|检查不通过|

规则：

- `task_status = COMPLETED` 时，必须有 `check_result`；
    
- `check_result = PASSED` 时，Robotaxi 进入可运营；
    
- `check_result = FAILED` 时，必须填写 `issue_type`。
    

---

## 13. issue_type

|issue_type|含义|
|---|---|
|NONE|无问题|
|LOW_BATTERY|电量不足|
|CLEANING_REQUIRED|需要清洁|
|HARDWARE_FAULT|硬件故障|
|SENSOR_FAULT|传感器异常|
|SOFTWARE_ISSUE|软件异常|
|UNKNOWN|未知问题|

---

## 14. 状态反馈

### 14.1 检查通过

```text
check_result = PASSED
↓
RobotaxiService.markAvailableAfterFleetOperation(...)
↓
Robotaxi.availability_status = AVAILABLE
Robotaxi.fleet_operation_status = NONE
Task.task_status = COMPLETED
Worker.worker_status = IDLE
Worker.current_task_id = null
```

### 14.2 检查不通过

```text
check_result = FAILED
↓
RobotaxiService.markUnavailableForFleetOperation(...)
↓
Robotaxi.availability_status = UNAVAILABLE
Robotaxi.fleet_operation_status 根据 issue_type 进入 NEED_CLEANING / NEED_CHARGING / NEED_MAINTENANCE / BROKEN
Robotaxi.operation_blocking_reason = issue_type
Task.task_status = COMPLETED
Worker.worker_status = IDLE
Worker.current_task_id = null
```

### 14.3 任务异常失败

```text
task_status = FAILED
↓
Robotaxi.availability_status 保持 PENDING_INSPECTION
Worker.worker_status = IDLE
Worker.current_task_id = null
```

---

## 15. TaskEventLog

ReadinessCheckTask 全流程需要记录事件消息。

典型 event_type：

|event_type|含义|
|---|---|
|AUTO_TRIGGER_STARTED|自动触发开始|
|MANUAL_TRIGGER_STARTED|手动触发开始|
|NO_CANDIDATE_ROBOTAXI|没有候选 Robotaxi|
|TASK_CREATED|任务创建成功|
|ROBOTAXI_ALREADY_HAS_PENDING_CHECK_TASK|Robotaxi 已有未完成检查任务|
|NO_IDLE_WORKER|没有空闲 Worker|
|WORKER_ASSIGNED|Worker 分配成功|
|CHECK_STARTED|检查开始|
|CHECK_SUBMITTED|检查结果已提交|
|ROBOTAXI_MARKED_AVAILABLE|Robotaxi 标记为可运营|
|ROBOTAXI_MARKED_UNAVAILABLE|Robotaxi 标记为不可运营|
|TASK_FAILED|任务异常失败|

基础字段：

|属性|含义|
|---|---|
|event_id|事件唯一编号|
|task_id|关联任务，可为空|
|robotaxi_id|关联 Robotaxi，可为空|
|worker_id|关联 Worker，可为空|
|trigger_type|AUTO / MANUAL，可为空|
|event_type|事件类型|
|event_result|SUCCESS / FAILED / SKIPPED|
|message|可读消息|
|created_at|发生时间|

---

## 16. Worker 能力约束

第一阶段 Worker 检查能力规则：

```text
time_per_robotaxi = 2
max_robotaxi_per_day = 5
```

含义：

- 每个 Worker 检查 1 台 Robotaxi 需要 2 个时间单位；
    
- 每个 Worker 每天最多检查 5 台 Robotaxi；
    
- 只有 `worker_status = IDLE` 的 Worker 可以被分配任务。
    

---

## 17. 示例数据

```json
{
  "task_id": "TASK-RC-001",
  "task_type": "READINESS_CHECK",
  "task_status": "WAITING_CHECK",
  "task_priority": "NORMAL",
  "trigger_type": "AUTO",
  "source_type": "OPS_CENTER",
  "source_id": "OC-001",
  "robotaxi_id": "RTX-001",
  "worker_id": "WK-001",
  "ops_center_id": "OC-001",
  "check_result": null,
  "issue_type": null,
  "created_at": "2026-01-01T09:00:00",
  "assigned_at": "2026-01-01T09:00:00",
  "started_at": null,
  "completed_at": null
}
```

---

## 18. 核心规则

1. ReadinessCheckTask 只能发生在 OpsCenter；
    
2. 1 个 ReadinessCheckTask 只能对应 1 台 Robotaxi；
    
3. 1 个 ReadinessCheckTask 只能分配 1 个 Worker；
    
4. 被检查 Robotaxi 必须处于 `PENDING_INSPECTION`；
    
5. 同一台 Robotaxi 不得存在多个未完成 ReadinessCheckTask；
    
6. Worker 必须属于同一个 OpsCenter；
    
7. Worker 分配成功后应变为 `BUSY`；
    
8. Worker 检查完成后应恢复为 `IDLE`；
    
9. task_status 应表达下一步待执行动作；
    
10. check_result 应表达检查结果；
    
11. 检查通过后 Robotaxi 变为 `AVAILABLE`；
    
12. 检查不通过后 Robotaxi 变为 `UNAVAILABLE`；
    
13. 检查不通过必须记录 `issue_type`；
    
14. ReadinessCheckTask 不负责维修、清洁或充电；
    
15. 自动触发和手动触发共用同一套创建、分配和执行逻辑；
    
16. 前端功能按钮必须由 task_status 决定；
    
17. 全流程必须记录 TaskEventLog。
    

---

## 19. 核心原则

```text
ReadinessCheckTask = 单台 Robotaxi 的运营准入判断单
```

```text
任务状态决定当前可用功能。
操作完成推动任务状态变化。
检查结果决定 Robotaxi 是否进入运营。
```
