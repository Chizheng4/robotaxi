# Worker：运营中心作业人员

## 1. 定义

Worker 是 OpsCenter 内部的作业资源。

Worker 负责执行运营中心内与 Robotaxi 相关的人工任务，例如检查、清洁、充电协助、维修协助等。

Worker 不属于 Map 空间对象，也不直接调度 Robotaxi。
Worker 通过 Task 执行具体作业。

---

## 2. 核心属性

|属性|含义|
|---|---|
|worker_id|Worker 唯一编号|
|ops_center_id|所属 OpsCenter|
|worker_name|Worker 名称|
|worker_role|作业角色|
|worker_status|当前状态|
|time_per_robotaxi|处理 1 台 Robotaxi 所需时间|
|max_robotaxi_per_day|每天最大处理 Robotaxi 数量|
|current_task_id|当前执行任务，可为空|

---

## 2.1 当前任务展示

Worker 当前行为由 `current_task_id` 指向的 Task 表达。前端可以展示当前任务类型和当前任务状态，但这些字段应由 Task 推导，不作为 Worker 本体冗余字段存储。

```text
Worker.current_task_id
→ Task
→ task_type / task_status
```

说明：

- `current_task_type`、`current_task_status` 是展示推导字段；

- Worker 本体只保留当前任务引用；

- Worker 与 Robotaxi 在当前任务展示规则上保持一致。

---

## 3. worker_role

|worker_role|含义|
|---|---|
|INSPECTION_OPERATOR|检查人员|
|CLEANING_OPERATOR|清洁人员|
|CHARGING_OPERATOR|充电协助人员|
|MAINTENANCE_OPERATOR|维修人员|

第一阶段默认：

```text
worker_role = INSPECTION_OPERATOR
```

---

## 4. worker_status

|worker_status|含义|
|---|---|
|IDLE|空闲，可分配任务|
|BUSY|忙碌，正在执行任务|
|OFF_DUTY|非工作中|

说明：

```text
当前阶段不使用 UNAVAILABLE 表达 Worker 状态。
如果 Worker 暂不工作，统一使用 OFF_DUTY。
```

---

## 5. 作业能力规则

第一阶段设定：

```text
time_per_robotaxi = 2
max_robotaxi_per_day = 5
```

含义：

- 每个 Worker 处理 1 台 Robotaxi 需要 2 个时间单位；

- 每个 Worker 每天最多处理 5 台 Robotaxi；

- 只有 `worker_status = IDLE` 的 Worker 可以被分配新任务。


---

## 6. 示例数据

```json
{
  "worker_id": "WK-001",
  "ops_center_id": "OC-001",
  "worker_name": "Worker-01",
  "worker_role": "INSPECTION_OPERATOR",
  "worker_status": "IDLE",
  "time_per_robotaxi": 2,
  "max_robotaxi_per_day": 5,
  "current_task_id": null
}
```

---

## 7. 关联关系

|对象|关系|
|---|---|
|OpsCenter|Worker 属于某个 OpsCenter|
|Task|Worker 通过 Task 执行具体作业|
|Robotaxi|Worker 不直接管理 Robotaxi，只通过 Task 处理 Robotaxi|

---

## 8. 规则

1. Worker 必须属于一个 OpsCenter；

2. Worker 不直接属于 Map；

3. Worker 不直接改变 Robotaxi 状态；

4. Robotaxi 状态变化应由 Task 完成后触发；

5. Worker 只表示作业资源能力；

6. Worker 当前行为由 current_task_id 指向的 Task 表达；

7. 当前阶段 Worker 只用于支撑运营中心内的检查任务。

8. 当前阶段 Worker 状态只使用 `IDLE`、`BUSY`、`OFF_DUTY`。


---

## 9. 核心原则

```text
Worker = OpsCenter 内部作业资源
```

Worker 定义作业能力，Task 定义具体作业过程。
