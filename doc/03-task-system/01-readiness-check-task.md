# ReadinessCheckTask：运营准入检查任务单

## 1. 定义

ReadinessCheckTask 是用于确认 Robotaxi 是否具备进入运营闭环资格的检查任务单。

它发生在 Robotaxi 到达 OpsCenter 后、正式投放到运营区域之前。

```text
ReadinessCheckTask = Robotaxi 从车辆资产转化为可运营车辆的准入检查单
```

---

## 2. 业务场景

Robotaxi 到达 OpsCenter 后，初始状态为：

```text
availability_status = PENDING_INSPECTION
```

系统需要确认该 Robotaxi 是否满足运营条件。

检查通过后，Robotaxi 可进入运营投放流程。
检查不通过后，Robotaxi 进入不可运营状态，并触发后续充电、清洁或维修需求。

---

## 3. 触发条件

ReadinessCheckTask 的生成需要满足：

```text
存在 availability_status = PENDING_INSPECTION 的 Robotaxi
AND
存在 worker_status = IDLE 的 Worker
AND
OpsCenter.can_inspect_robotaxi = true
```

说明：

- Robotaxi 状态是任务触发条件；

- Worker 是任务执行资源；

- OpsCenter 提供检查能力。


---

## 4. 参与对象

|对象|作用|
|---|---|
|Robotaxi|被检查车辆|
|OpsCenter|检查发生的运营中心|
|Worker|执行检查的作业人员|
|Task|承载检查流程和结果|

---

## 5. 核心属性

|属性|含义|
|---|---|
|task_id|任务唯一编号|
|task_type|固定为 READINESS_CHECK|
|task_status|任务状态|
|task_priority|默认 NORMAL|
|source_type|固定为 OPS_CENTER|
|source_id|OpsCenter ID|
|robotaxi_id|被检查 Robotaxi|
|worker_id|执行检查 Worker|
|ops_center_id|检查所在 OpsCenter|
|check_result|检查结果|
|issue_type|问题类型|
|started_at|开始时间|
|completed_at|完成时间|

---

## 6. task_status

|task_status|含义|
|---|---|
|CREATED|检查任务已创建|
|ASSIGNED|已分配 Worker|
|IN_PROGRESS|检查中|
|COMPLETED|检查完成|
|CANCELLED|任务取消|
|FAILED|任务异常失败|

说明：

```text
task_status 只表达任务生命周期。
check_result 表达检查结果。
```

---

## 7. check_result

|check_result|含义|
|---|---|
|PASSED|检查通过|
|FAILED|检查不通过|

规则：

- `task_status = COMPLETED` 时，必须有 `check_result`；

- `check_result = PASSED` 时，Robotaxi 可进入运营；

- `check_result = FAILED` 时，必须填写 `issue_type`。


---

## 8. issue_type

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

## 9. 操作流程

```text
CREATED
↓
ASSIGNED
↓
IN_PROGRESS
↓
COMPLETED / FAILED / CANCELLED
```

标准流程：

```text
系统生成检查任务
↓
分配空闲 Worker
↓
Worker 开始检查
↓
Worker 提交检查结果
↓
系统更新 Robotaxi 状态
↓
任务完成
```

---

## 10. 状态反馈

### 10.1 检查通过

```text
check_result = PASSED
↓
Robotaxi.availability_status = AVAILABLE
Worker.worker_status = IDLE
Task.task_status = COMPLETED
```

### 10.2 检查不通过

```text
check_result = FAILED
↓
Robotaxi.availability_status = UNAVAILABLE
Robotaxi.unavailable_reason = issue_type
Worker.worker_status = IDLE
Task.task_status = COMPLETED
```

### 10.3 任务异常失败

```text
task_status = FAILED
↓
Robotaxi.availability_status 保持 PENDING_INSPECTION
Worker.worker_status = IDLE
```

---

## 11. 执行能力约束

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

## 12. 示例数据

```json
{
  "task_id": "TASK-RC-001",
  "task_type": "READINESS_CHECK",
  "task_status": "ASSIGNED",
  "task_priority": "NORMAL",
  "source_type": "OPS_CENTER",
  "source_id": "OC-001",
  "robotaxi_id": "RTX-001",
  "worker_id": "WK-001",
  "ops_center_id": "OC-001",
  "check_result": null,
  "issue_type": null,
  "started_at": null,
  "completed_at": null
}
```

---

## 13. 规则

1. ReadinessCheckTask 只能发生在 OpsCenter；

2. 被检查 Robotaxi 必须处于 `PENDING_INSPECTION`；

3. 执行 Worker 必须处于 `IDLE`；

4. Worker 被分配后应变为 `BUSY`；

5. 检查完成后 Worker 应恢复为 `IDLE`；

6. 任务状态和检查结果必须分离；

7. 检查通过后 Robotaxi 变为 `AVAILABLE`；

8. 检查不通过后 Robotaxi 变为 `UNAVAILABLE`；

9. 检查不通过必须记录 `issue_type`；

10. ReadinessCheckTask 不负责维修、清洁或充电，只负责准入判断。


---

## 14. 核心原则

```text
ReadinessCheckTask = Robotaxi 运营准入判断单
```

它的核心价值是确认 Robotaxi 是否可以从 OpsCenter 进入运营闭环。