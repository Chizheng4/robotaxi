# DeploymentTask：运营投放任务单

## 1. 定义

DeploymentTask 是将可运营 Robotaxi 投放到指定运营区域、ServiceArea 或待命位置的任务单。

```text
DeploymentTask = 单台 Robotaxi 的运营产能投放任务
```

它用于提前调整 Robotaxi 的空间分布，使车辆更接近未来可能发生需求的区域。

---

## 2. 核心边界

DeploymentTask 只服务于运营供给布局，不服务于具体客户订单。

```text
SupplyAdjustmentPlan → DeploymentTask
ServiceOrder → ServiceTask
```

ServiceOrder 不触发 DeploymentTask。

如果服务订单匹配到正在执行 DeploymentTask 的 Robotaxi，应由 Dispatch 中止原 DeploymentTask，并创建 ServiceTask。

---

## 3. 触发来源

DeploymentTask 的来源只有两类。

|来源|含义|
|---|---|
|SupplyAdjustmentPlan|基于需求预测和供需缺口生成的运力调整计划|
|MANUAL_OPERATION|运营人员手动创建的投放任务|

说明：

- 预测需求不直接生成任务；

- 预测需求先形成 SupplyAdjustmentPlan；

- SupplyAdjustmentPlan 再触发 DeploymentTask；

- ServiceOrder 不作为 DeploymentTask 来源。


---

## 4. 核心关系

```text
1 个 DeploymentTask 对应 1 台 Robotaxi
1 个 DeploymentTask 对应 1 个目标位置
DeploymentTask 不需要 Worker
```

Robotaxi 是自动驾驶车辆，只要处于可运营状态，就可以自主执行投放任务。

---

## 5. 创建条件

创建 DeploymentTask 必须满足：

```text
Robotaxi.availability_status = AVAILABLE
AND
Robotaxi 当前不存在不可中止任务
AND
目标位置有效
AND
目标位置允许 Robotaxi 停放 / 临停 / 待命
```

说明：

- Worker 不参与投放任务；

- Dispatch / 简化分配逻辑负责选择 Robotaxi；

- 当前阶段可先使用手动创建或简单分配，后续再接入完整 Dispatch 和 SupplyAdjustmentPlan。


---

## 6. 位置结构

DeploymentTask 必须明确起点和目标。

|字段|含义|
|---|---|
|origin_cell_id|Robotaxi 当前起点 Cell|
|target_cell_id|投放目标 Cell|
|target_zone_id|目标 Zone，可为空|
|target_service_area_id|目标 ServiceArea，可为空|
|route_id|路径规划结果，可为空|

规则：

- Robotaxi 当前位置以 `current_cell_id` 为准；

- 投放目标最终必须落到一个有效 `target_cell_id`；

- `target_service_area_id` 用于表达服务区待命或临停；

- `target_zone_id` 用于表达运营区域目标；

- Route 由路径规划系统生成。


---

## 7. 路径规划关系

DeploymentTask 不负责路径算法，只引用路径规划结果。

```text
DeploymentTask 创建
↓
路径规划系统计算 Route
↓
DeploymentTask 绑定 route_id
↓
创建 RouteExecution = WAITING_START
↓
Robotaxi 执行 Route
↓
到达 target_cell_id
↓
DeploymentTask 完成
```

当前阶段可使用简化路径规划。
后续再单独设计 Dispatch System 和 Route Planning System。

说明：

- 路径规划成功后，应立即创建 RouteExecution；

- DeploymentTask 进入 `WAITING_START` 时，必须已经有 `route_id` 和对应 RouteExecution；

- 运营投放任务单不直接推进车辆移动；

- RouteExecution 负责开始行驶、继续行驶和反馈移动结果。

如果执行中路径不可用：

```text
触发重新路径规划
↓
更新 route_id
↓
Robotaxi 继续执行
```

---

## 8. task_status

任务状态应表达下一步待执行动作。

|task_status|含义|下一步动作|
|---|---|---|
|WAITING_ROUTE|等待生成 Route|路径规划|
|WAITING_START|已有 Route 和 RouteExecution，等待 Robotaxi 开始行驶|由 RouteExecution 开始行驶|
|MOVING|Robotaxi 正在前往目标位置，行驶中|由 RouteExecution 继续行驶 / 到达|
|COMPLETED|投放完成|无|
|CANCELLED|任务已取消|无|
|FAILED|任务异常失败|人工处理|

---

## 9. 功能按钮

|task_status|可用功能|操作方|结果|
|---|---|---|---|
|WAITING_ROUTE|路径规划|系统 / 运营人员|进入 WAITING_START，并创建 RouteExecution|
|WAITING_START|查看行驶记录|运营人员|跳转到对应行驶记录并选中|
|MOVING|查看行驶记录|运营人员|跳转到对应行驶记录并选中|
|COMPLETED|查看详情|运营人员|无|
|CANCELLED|查看详情|运营人员|无|
|FAILED|查看异常|运营人员|无|

---

## 10. 中止规则

DeploymentTask 默认可中止。

典型中止场景：

```text
Robotaxi 正在执行 DeploymentTask
↓
ServiceOrder 触发 Dispatch
↓
该 Robotaxi 被选中执行服务订单
↓
DeploymentTask 进入 CANCELLED
↓
生成 ServiceTask
```

说明：

- ServiceOrder 不触发 DeploymentTask；

- ServiceOrder 可以通过 Dispatch 中止 DeploymentTask；

- 中止后必须记录 TaskEventLog。


---

## 11. 状态反馈

### 11.1 投放完成

```text
Task.task_status = COMPLETED
Robotaxi.current_cell_id = target_cell_id
Robotaxi.current_route_id = null
```

如果目标属于 ServiceArea：

```text
Robotaxi 位于该 ServiceArea 覆盖 Cell
```

如果目标属于 Zone：

```text
Robotaxi 进入该 Zone 的可运营供给分布
```

---

### 11.2 投放取消

```text
Task.task_status = CANCELLED
Robotaxi.current_task_id = null 或切换为新的 ServiceTask
Robotaxi.current_route_id = null 或更新为新任务 Route
```

---

### 11.3 投放失败

```text
Task.task_status = FAILED
failure_reason = ROUTE_UNAVAILABLE / TARGET_UNAVAILABLE / ROBOTAXI_UNAVAILABLE / UNKNOWN
```

---

## 12. 核心属性

|属性|含义|
|---|---|
|task_id|任务唯一编号|
|task_type|固定为 DEPLOYMENT|
|task_status|当前任务状态|
|task_priority|默认 LOW|
|trigger_type|AUTO / MANUAL|
|source_type|SUPPLY_ADJUSTMENT_PLAN / MANUAL_OPERATION|
|source_id|来源对象 ID，可为空|
|robotaxi_id|执行 Robotaxi|
|origin_cell_id|起点 Cell|
|target_cell_id|目标 Cell|
|target_zone_id|目标 Zone，可为空|
|target_service_area_id|目标 ServiceArea，可为空|
|route_id|Route ID，可为空|
|interruptible|默认 true|
|created_at|创建时间|
|started_at|开始时间|
|completed_at|完成时间|
|failure_reason|失败原因，可为空|

---

## 13. TaskEventLog

典型事件：

|event_type|含义|
|---|---|
|MANUAL_TRIGGER_STARTED|手动触发开始|
|SUPPLY_PLAN_TRIGGER_STARTED|运力调整计划触发开始|
|TASK_CREATED|投放任务创建成功|
|ROUTE_PLANNED|Route 生成成功|
|DEPLOYMENT_STARTED|投放开始|
|ROUTE_REPLANNED|Route 重新规划|
|DEPLOYMENT_COMPLETED|投放完成|
|DEPLOYMENT_CANCELLED|投放取消|
|DEPLOYMENT_FAILED|投放失败|
|SERVICE_TASK_INTERRUPTED_DEPLOYMENT|服务任务中止投放任务|

---

## 14. 核心规则

1. DeploymentTask 只用于运营供给布局；

2. ServiceOrder 不触发 DeploymentTask；

3. ServiceOrder 应触发 ServiceTask；

4. DeploymentTask 可以被高优先级 ServiceTask 中止；

5. DeploymentTask 不需要 Worker；

6. 1 个 DeploymentTask 只能对应 1 台 Robotaxi；

7. 1 个 DeploymentTask 必须有 1 个目标 Cell；

8. Route 由路径规划系统生成；

9. 当前阶段可使用简化路径规划和手动创建；

10. 后续再接入 SupplyAdjustmentPlan、Dispatch System 和 Route Planning System。


---

## 15. 核心原则

```text
DeploymentTask = 预测供给调整驱动的 Robotaxi 空间投放任务
```

```text
ServiceOrder 触发服务任务，不触发投放任务。
```

DeploymentTask 的核心价值是让可运营 Robotaxi 提前移动到更合适的位置，形成更好的区域供给分布。
