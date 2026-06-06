# DeploymentTask：运营投放任务单

## 1. 定义

DeploymentTask 是将单台可运营 Robotaxi 投放到计划目标位置的运营任务单。

```text
DeploymentTask = 单台 Robotaxi 的运营供给投放任务
```

它用于让 Robotaxi 从当前位置移动到更合适的服务区域、临停点或停车点，形成可运营供给分布。

---

## 2. 核心边界

DeploymentTask 只解决：

```text
让哪台 Robotaxi 去哪个计划目标位置
并在到达后按照计划要求形成有效投放结果
```

DeploymentTask 不解决：

```text
需求预测
供给计划生成
具体车辆分配策略
路径规划算法
行驶过程记录
客户服务履约
```

相关对象边界：

|对象|职责|
|---|---|
|SupplyAdjustmentPlan|决定哪些区域需要增加或减少供给，后续能力|
|SupplyAssignmentDecision|决定具体哪台 Robotaxi 执行供给调整，后续能力|
|DeploymentTask|让单台 Robotaxi 执行投放任务|
|Route|表达某一次计划路径|
|RouteExecution / 行驶记录|记录该任务下 Robotaxi 的完整行驶过程|
|ServiceArea|提供临停、停车、待命等空间能力|

ServiceOrder 不触发 DeploymentTask。后续 ServiceOrder 应触发 ServiceTask；如果 Robotaxi 正在执行 DeploymentTask 且被服务订单匹配，应由后续调度决策中止 DeploymentTask，再创建 ServiceTask。

---

## 3. 来源

DeploymentTask 的来源为：

|source_type|含义|
|---|---|
|SUPPLY_ASSIGNMENT_DECISION|来源于供给分配决策，后续能力|
|MANUAL_OPERATION|来源于人工手动创建|

当前 demo 先使用 `MANUAL_OPERATION` 和简单分配逻辑。

---

## 4. 核心关系

```text
1 个 DeploymentTask 对应 1 台 Robotaxi
1 个 DeploymentTask 对应 1 个计划目标
1 个 DeploymentTask 对应 1 个 RouteExecution / 行驶记录
DeploymentTask 不需要 Worker
```

RouteExecution 表达该 DeploymentTask 下 Robotaxi 的完整行驶过程。

```text
DeploymentTask
↓ 1:1
RouteExecution
↓ 1:N
Route / route_history
```

说明：

- Route 可以在任务执行过程中被重新规划；
- Route 重规划不应创建新的 RouteExecution；
- 同一个 DeploymentTask 下，RouteExecution 通过 `current_route_id` 和 `route_history` 记录路径变化；
- 只有当 DeploymentTask 完成、失败、取消，或 Robotaxi 切换到新的任务单时，当前 RouteExecution 才结束。

---

## 5. 创建条件

创建 DeploymentTask 必须满足：

```text
Robotaxi.availability_status = AVAILABLE
AND
Robotaxi 当前不存在不可中止任务
AND
计划目标位置有效
AND
计划目标所属 ServiceArea 有明确的停靠 / 临停 / 待命规则
```

说明：

- 创建 DeploymentTask 时不要求验证计划目标点位最终一定可停车或临停；
- 最终能否停靠，只能在 Robotaxi 实际到达目标区域后判断；
- 当前阶段默认支持人工创建和简单分配，后续再接入 SupplyAdjustmentPlan 与 SupplyAssignmentDecision。

---

## 6. 计划目标与实际停靠点

DeploymentTask 必须区分：

```text
计划目标 planned_target
实际停靠 actual_target
```

原因：

- 创建任务时只能确定计划目标；
- Robotaxi 到达时可能发现目标点位被占用或阻塞；
- Robotaxi 可以在同一 ServiceArea 内继续寻找替代点位；
- 异常到达后的路径规划会更新当前目标 `target_cell_id / target_service_area_id`，但不改变原始计划目标 `planned_target_*`；
- 行驶记录必须同步记录计划目标、当前目标和完成后的实际目标，避免运营人员混淆原计划点和重规划后的目标点；
- 如果无法按照计划要求形成有效投放结果，才反馈运营决策系统重新决策。

字段：

|字段|含义|
|---|---|
|planned_target_zone_id|计划目标 Zone，可为空|
|planned_target_service_area_id|计划目标 ServiceArea|
|planned_target_cell_id|计划目标 Cell|
|actual_target_service_area_id|实际停靠 ServiceArea，可为空|
|actual_target_cell_id|实际停靠 Cell，可为空|
|arrival_behavior|到达后的驻留要求|
|blocked_handling_policy|计划目标不可用时的处理策略|
|arrival_execution_result|Robotaxi 到达执行结果|
|failure_reason|失败原因，可为空|

兼容说明：当前代码中的 `target_zone_id`、`target_service_area_id`、`target_cell_id` 是旧版目标字段，后续应逐步收敛到 `planned_target_*`。

---

## 7. arrival_behavior

arrival_behavior 表示 Robotaxi 到达目标区域后的驻留要求。

|arrival_behavior|含义|
|---|---|
|AUTO_BY_SERVICE_AREA|根据 ServiceArea 能力自动选择临停或停车|
|TEMP_STOP_AND_STANDBY|临停待命|
|PARK_AND_STANDBY|停车待命|
|STOP_ONLY|临时停靠，不进入待命|
|PARK_ONLY|停车，不进入接单|
|RETURN_TO_OPS_CENTER|返回运营中心|

当前阶段主要使用：

```text
AUTO_BY_SERVICE_AREA
TEMP_STOP_AND_STANDBY
PARK_AND_STANDBY
```

---

## 8. blocked_handling_policy

blocked_handling_policy 表示 Robotaxi 到达目标后，如果计划目标点位不可用，应如何处理。

|blocked_handling_policy|含义|
|---|---|
|SAME_SERVICE_AREA_RETRY|在同一 ServiceArea 内寻找替代点位|
|FAIL_FAST|计划目标不可用时直接失败|
|WAIT_DECISION|等待运营决策系统重新决策|

当前阶段默认使用：

```text
SAME_SERVICE_AREA_RETRY
```

含义：

```text
Robotaxi 先在同 ServiceArea 内寻找满足 arrival_behavior 的替代点位。
只有无法找到有效替代点位时，DeploymentTask 才失败并反馈运营决策系统。
```

---

## 9. arrival_execution_result

arrival_execution_result 表示 Robotaxi 到达目标区域后的执行结果。

|arrival_execution_result|含义|
|---|---|
|NORMAL_ARRIVAL|正常到达，计划目标点位可用|
|ARRIVED_WITH_TARGET_OCCUPIED|到达但计划目标点位被占用|
|ARRIVED_WITH_TARGET_BLOCKED|到达但计划目标点位被阻塞|
|ARRIVED_WITH_NO_AVAILABLE_STOPPING_CELL|到达但无可临停点位|
|ARRIVED_WITH_NO_AVAILABLE_PARKING_CELL|到达但无可停车点位|
|TARGET_SERVICE_AREA_UNAVAILABLE|目标 ServiceArea 无法满足投放要求|
|ROUTE_FAILED|行驶记录执行失败|
|UNKNOWN|未知结果|

说明：

- `NORMAL_ARRIVAL` 可以直接推动 DeploymentTask 完成；
- 异常到达不能直接完成任务，必须先按 blocked_handling_policy 处理。

---

## 10. task_status

任务状态表达下一步待执行动作。

|task_status|含义|下一步动作|
|---|---|---|
|WAITING_ROUTE|等待生成初始 Route|路径规划|
|WAITING_START|已有 Route 和行驶记录，等待 Robotaxi 开始行驶|查看行驶记录|
|MOVING|Robotaxi 正在前往当前 Route 目标点|查看行驶记录|
|ARRIVED|Robotaxi 已到达当前 Route 目标点，等待到达结果处理|正常到达 / 异常到达|
|ARRIVAL_ABNORMAL|异常到达，等待同 ServiceArea 替代目标路径规划|路径规划|
|COMPLETED|投放完成|无|
|CANCELLED|任务已取消|无|
|FAILED|任务异常失败|等待运营决策系统重新决策|

说明：

- 行驶记录到达当前 Route 目标点后，DeploymentTask 应进入 `ARRIVED`；
- DeploymentTask 必须根据 arrival_execution_result 判断下一步；
- `NORMAL_ARRIVAL` 可以作为事件或瞬时结果记录，随后任务立即进入 `COMPLETED`；
- `ARRIVAL_ABNORMAL` 是可停留状态，用于人工模拟异常到达后的替代路径规划。

---

## 11. 功能操作

|task_status|可用功能|操作结果|
|---|---|---|
|WAITING_ROUTE|路径规划|生成初始 Route，创建 / 绑定行驶记录，进入 WAITING_START|
|WAITING_START|查看行驶记录|跳转到对应行驶记录并选中|
|MOVING|查看行驶记录|跳转到对应行驶记录并选中|
|ARRIVED|查看行驶记录|在行驶记录中选择正常到达或异常到达|
|ARRIVAL_ABNORMAL|路径规划|基于异常到达位置，在同 ServiceArea 内生成替代目标 Route|
|COMPLETED|查看详情|无状态变化|
|CANCELLED|查看详情|无状态变化|
|FAILED|查看异常|无状态变化|

重要区分：

- `WAITING_ROUTE` 的路径规划是初始路径规划；
- `ARRIVAL_ABNORMAL` 的路径规划是异常到达后的替代路径规划；
- 两者逻辑不同，不能共用同一业务语义。

---

## 12. 初始路径规划

初始路径规划用于第一次将 Robotaxi 从任务起点投放到计划目标点。

```text
DeploymentTask = WAITING_ROUTE
↓
起点 = Robotaxi.current_cell_id
终点 = planned_target_cell_id
↓
RoutePlanning 生成初始 Route
↓
创建 / 绑定 RouteExecution
↓
DeploymentTask = WAITING_START
RouteExecution = WAITING_START
```

初始路径规划成功后，DeploymentTask 不直接行驶；车辆移动操作发生在行驶记录中。

---

## 13. 到达目标后的处理规则

行驶记录推进到当前 Route 目标点时，不应直接完成 DeploymentTask，而应进入到达判断。

```text
RouteExecution 到达当前 Route 目标点
↓
DeploymentTask = ARRIVED
↓
行驶记录显示：正常到达 / 异常到达
```

### 13.1 正常到达

```text
操作：正常到达
↓
arrival_execution_result = NORMAL_ARRIVAL
actual_target_cell_id = planned_target_cell_id 或当前 Route 目标 Cell
↓
执行 arrival_behavior
↓
DeploymentTask = COMPLETED
RouteExecution = COMPLETED
Robotaxi.current_task_id = null
Robotaxi.current_route_id = null
Robotaxi.motion_status = TEMP_STOPPED / PARKED
```

### 13.2 异常到达

点击 `异常到达` 时应弹出确认框。弹窗应展示：

- Robotaxi 信息；
- 行驶记录信息；
- 当前 Route 信息；
- 当前 Route 起点 / 终点；
- Robotaxi 当前位置信息；
- 异常类型选择。

确认异常后：

```text
arrival_execution_result = 选择的异常类型
DeploymentTask = ARRIVAL_ABNORMAL
RouteExecution 保持当前行驶记录
```

异常类型可使用：

|异常类型|含义|
|---|---|
|ARRIVED_WITH_TARGET_OCCUPIED|目标点位被占用|
|ARRIVED_WITH_TARGET_BLOCKED|目标点位被阻塞|
|ARRIVED_WITH_NO_AVAILABLE_STOPPING_CELL|无可临停点位|
|ARRIVED_WITH_NO_AVAILABLE_PARKING_CELL|无可停车点位|
|TARGET_SERVICE_AREA_UNAVAILABLE|目标 ServiceArea 不可用|
|UNKNOWN|未知异常|

---

## 14. 异常到达后的路径规划

当前阶段默认：

```text
blocked_handling_policy = SAME_SERVICE_AREA_RETRY
```

这表示异常到达后，允许在同一 ServiceArea 内选择其他目的点位。

异常到达后的路径规划流程：

```text
DeploymentTask = ARRIVAL_ABNORMAL
↓
操作：路径规划
↓
起点 = Robotaxi 当前异常到达位置
终点 = 当前 planned_target_service_area_id 内其他可用 Cell
↓
RoutePlanning 生成替代 Route
↓
同一个 RouteExecution 更新 current_route_id / route_id
写入 route_history
↓
DeploymentTask = MOVING
RouteExecution = MOVING
↓
Robotaxi 继续行驶
```

注意：

- 异常到达后的路径规划不创建新的 DeploymentTask；
- 异常到达后的路径规划不创建新的 RouteExecution；
- 新 Route 的起点是 Robotaxi 当前异常到达位置；
- 新 Route 的目标是同一 ServiceArea 内的其他点位，并排除当前异常到达点、原计划目标点和当前目标点；
- 新 Route 生成后，DeploymentTask 和 RouteExecution 的当前目标必须同步更新；
- 该流程重复执行，直到 Robotaxi 正常到达并完成投放，或确认无法形成有效投放结果。

---

## 15. route_history

同一个 DeploymentTask 下，行驶记录可能经历多条 Route。Route 变化必须记录在 route_history 中。

route_history 至少包含：

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
|ROUTE_BLOCKED_REPLAN|路径阻塞后重新规划|

---

## 16. 任务切换规则

如果 DeploymentTask 被其他任务中止，例如后续 ServiceTask：

```text
DeploymentTask = CANCELLED
↓
当前 RouteExecution = CANCELLED
↓
Robotaxi 切换到新的 Task
↓
新的 Task 创建新的 RouteExecution
```

不同 Task 不能共用同一个 RouteExecution。

---

## 17. TaskEventLog

典型事件：

|event_type|含义|
|---|---|
|TASK_CREATED|投放任务创建|
|ROUTE_EXECUTION_CREATED|行驶记录创建|
|ROUTE_REQUESTED|请求路径规划|
|ROUTE_PLANNED|Route 生成|
|DEPLOYMENT_STARTED|投放开始|
|ROBOTAXI_MOVING|Robotaxi 行驶中|
|ROUTE_EXECUTION_ARRIVED|行驶记录到达当前目标|
|ARRIVAL_NORMAL|正常到达|
|ARRIVAL_ABNORMAL|异常到达|
|ROUTE_REPLANNED|Route 重规划|
|TARGET_REPLACED_WITHIN_SERVICE_AREA|在同 ServiceArea 内替换目标 Cell|
|TARGET_SERVICE_AREA_UNAVAILABLE|目标 ServiceArea 不可用|
|DECISION_SYSTEM_NOTIFIED|已通知运营决策系统|
|DEPLOYMENT_COMPLETED|投放完成|
|DEPLOYMENT_CANCELLED|投放取消|
|DEPLOYMENT_FAILED|投放失败|

---

## 18. 核心规则

1. DeploymentTask 只用于运营供给投放；
2. ServiceOrder 不触发 DeploymentTask；
3. DeploymentTask 不需要 Worker；
4. 1 个 DeploymentTask 只能绑定 1 台 Robotaxi；
5. 1 个 DeploymentTask 只能对应 1 个 RouteExecution / 行驶记录；
6. Route 重规划不创建新的 RouteExecution；
7. 不同 Task 不能共用同一个 RouteExecution；
8. DeploymentTask 必须有计划目标；
9. DeploymentTask 必须有 arrival_behavior；
10. DeploymentTask 必须有 blocked_handling_policy；
11. 计划目标与实际停靠点必须分离；
12. 创建任务时不要求验证最终停靠能力；
13. 行驶记录到达不等于 DeploymentTask 完成；
14. Robotaxi 到达后必须反馈 arrival_execution_result；
15. NORMAL_ARRIVAL 可以推动任务完成；
16. 异常到达必须先按 blocked_handling_policy 处理；
17. 当前阶段默认允许 Robotaxi 在同 ServiceArea 内寻找替代点位；
18. 无法形成有效投放结果时，DeploymentTask 才进入 FAILED；
19. DeploymentTask 失败后必须反馈运营决策系统；
20. 行驶过程由 RouteExecution 记录。

---

## 19. 核心原则

```text
DeploymentTask = 单台 Robotaxi 的运营供给投放任务
```

```text
计划目标不是实际停靠点；
行驶记录到达不是投放完成；
正常到达才可以直接完成投放；
异常到达必须先按遇阻策略处理；
无法形成有效投放结果时才反馈运营决策系统重新决策。
```

```text
DeploymentTask 决定去哪里；
Route 决定当前计划怎么走；
RouteExecution 记录本任务下实际怎么走；
Robotaxi 到达后决定实际停在哪里；
运营决策系统负责异常后的重新决策。
```
