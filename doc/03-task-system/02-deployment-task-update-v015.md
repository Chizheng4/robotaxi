# Deployment-task：运营投放任务单

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
|SupplyAdjustmentPlan|决定哪些区域需要增加或减少供给|
|SupplyAssignmentDecision|决定具体哪台 Robotaxi 执行供给调整|
|DeploymentTask|让单台 Robotaxi 执行投放任务|
|Route|表达某一次计划路径|
|RouteExecution|记录该任务下 Robotaxi 的完整行驶过程|
|ServiceArea|提供临停、停车、待命等空间能力|

---

## 3. 来源

DeploymentTask 的来源为：

|source_type|含义|
|---|---|
|SUPPLY_ASSIGNMENT_DECISION|来源于供给分配决策|
|MANUAL_OPERATION|来源于人工手动创建|

说明：

```text
ServiceOrder 不触发 DeploymentTask。
ServiceOrder 后续应触发 ServiceTask。
```

如果 Robotaxi 正在执行 DeploymentTask，且被服务订单匹配，应该由调度决策中止 DeploymentTask，再创建 ServiceTask。

---

## 4. 核心关系

```text
1 个 DeploymentTask 对应 1 台 Robotaxi
1 个 DeploymentTask 对应 1 个计划目标
1 个 DeploymentTask 对应 1 个 RouteExecution
DeploymentTask 不需要 Worker
```

RouteExecution 表达该 DeploymentTask 下 Robotaxi 的完整行驶过程。

```text
DeploymentTask
↓ 1:1
RouteExecution
↓ 1:N
Route / RouteHistory
```

说明：

```text
Route 可以在任务执行过程中被重新规划。
但 Route 重规划不应创建新的 RouteExecution。
同一个 DeploymentTask 下，RouteExecution 通过 current_route_id 和 route_history 记录路径变化。
```

只有当 DeploymentTask 完成、失败、取消，或 Robotaxi 切换到新的任务单时，当前 RouteExecution 才结束。

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

```text
创建 DeploymentTask 时不要求验证计划目标点位最终一定可停车或临停。
最终能否停靠，只能在 Robotaxi 实际到达目标区域后判断。
```

当前阶段可以先支持人工创建和简单分配。  
后续再接入 SupplyAdjustmentPlan 与 SupplyAssignmentDecision。

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
    
- 如果无法按照计划要求形成有效投放结果，才反馈运营决策系统重新决策。
    

字段建议：

|字段|含义|
|---|---|
|planned_target_zone_id|计划目标 Zone，可为空|
|planned_target_service_area_id|计划目标 ServiceArea|
|planned_target_cell_id|计划目标 Cell|
|actual_target_service_area_id|实际停靠 ServiceArea，可为空|
|actual_target_cell_id|实际停靠 Cell，可为空|
|arrival_execution_result|Robotaxi 到达执行结果|
|failure_reason|失败原因，可为空|

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

说明：

```text
AUTO_BY_SERVICE_AREA 表示 Robotaxi 到达后，
根据目标 ServiceArea 的能力和运营规则，
自动决定采用临停还是停车。
```

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
|ROUTE_FAILED|RouteExecution 执行失败|
|UNKNOWN|未知结果|

说明：

```text
NORMAL_ARRIVAL 可以直接推动 DeploymentTask 完成。
异常到达不能直接完成任务，必须先按 blocked_handling_policy 处理。
```

---

## 10. 到达目标区域后的执行规则

DeploymentTask 不要求在创建时完成最终停靠能力校验。

正确流程为：

```text
Robotaxi 按 RouteExecution 执行 Route
↓
RouteExecution 到达当前 Route 目标点
↓
Robotaxi 到达目标区域
↓
反馈 arrival_execution_result
↓
DeploymentTask 根据结果决定完成、继续重规划或失败
```

### 规则一：正常到达

```text
arrival_execution_result = NORMAL_ARRIVAL
↓
actual_target_cell_id = planned_target_cell_id
↓
执行 arrival_behavior
↓
DeploymentTask COMPLETED
```

### 规则二：异常到达，但同 ServiceArea 可替代

例如：

```text
planned_target_cell_id 被占用
planned_target_cell_id 被阻塞
planned_target_cell_id 不满足临停条件
planned_target_cell_id 不满足停车条件
```

如果：

```text
blocked_handling_policy = SAME_SERVICE_AREA_RETRY
```

则：

```text
Robotaxi 在同 ServiceArea 内寻找替代点位
↓
请求 RoutePlanning 生成新的 Route
↓
RouteExecution 更新 current_route_id
↓
RouteExecution 记录 route_history
↓
Robotaxi 继续执行同一个 DeploymentTask 下的行驶过程
↓
找到满足 arrival_behavior 的替代 Cell
↓
actual_target_cell_id = alternative_cell_id
↓
执行 arrival_behavior
↓
DeploymentTask COMPLETED
```

说明：

```text
同一个 DeploymentTask 下的目标替换和路径重规划，
不创建新的 RouteExecution。
```

### 规则三：无法形成有效投放结果

如果：

```text
计划目标点位不可用
AND
同 ServiceArea 内没有可用替代点位
AND
arrival_behavior 无法完成
```

则：

```text
arrival_execution_result = TARGET_SERVICE_AREA_UNAVAILABLE
Task.task_status = FAILED
failure_reason = 对应失败原因
```

同时：

```text
结束当前 RouteExecution
反馈运营决策系统
请求重新决策该 Robotaxi
```

后续由运营决策系统决定：

```text
创建新的 DeploymentTask
或
创建其他任务单
或
取消当前投放需求
```

---

## 11. task_status

任务状态表达下一步待执行动作。

|task_status|含义|下一步动作|
|---|---|---|
|WAITING_ROUTE|等待生成 Route|路径规划|
|WAITING_START|已有 Route，等待 Robotaxi 开始执行|开始投放|
|MOVING|Robotaxi 正在前往计划目标|查看行驶记录|
|ARRIVED|Robotaxi 已到达目标区域，等待处理到达结果|判断到达结果|
|COMPLETED|投放完成|无|
|CANCELLED|任务已取消|无|
|FAILED|任务异常失败|等待运营决策系统重新决策|

说明：

```text
RouteExecution 完成不等于 DeploymentTask 完成。
RouteExecution 到达当前 Route 目标点后，DeploymentTask 应进入 ARRIVED。
DeploymentTask 必须根据 arrival_execution_result 判断下一步。
```

---

## 12. 功能操作

|task_status|可用功能|操作结果|
|---|---|---|
|WAITING_ROUTE|生成 Route|进入 WAITING_START|
|WAITING_START|开始投放|创建 / 启动 RouteExecution，进入 MOVING|
|MOVING|查看行驶记录|无状态变化|
|ARRIVED|处理到达结果|成功进入 COMPLETED，失败进入 FAILED，或继续重规划|
|COMPLETED|查看详情|无状态变化|
|CANCELLED|查看详情|无状态变化|
|FAILED|查看异常|无状态变化|

---

## 13. 与 RouteExecution 的关系

DeploymentTask 不记录具体行驶过程。

```text
DeploymentTask 创建
↓
创建 1 个 RouteExecution
↓
RoutePlanning 生成初始 Route
↓
RouteExecution 执行 Route
↓
如发生目标替换或路径异常：
    RoutePlanning 生成新 Route
    RouteExecution 更新 current_route_id
    RouteExecution 记录 route_history
↓
RouteExecution 完成该任务下的完整行驶过程
↓
DeploymentTask 根据 arrival_execution_result 完成、继续处理或失败
```

RouteExecution 负责：

```text
按 Route step 推进
更新 Robotaxi.current_cell_id
更新电量
更新里程
记录 route_history
记录行驶事件
反馈移动执行结果和到达执行结果
```

DeploymentTask 负责：

```text
定义计划目标
定义 arrival_behavior
定义 blocked_handling_policy
判断是否形成有效投放结果
更新 actual_target_cell_id
更新 Robotaxi 最终驻留状态
决定任务 COMPLETED / FAILED / CANCELLED
```

---

## 14. 任务切换规则

如果 DeploymentTask 被其他任务中止，例如 ServiceTask：

```text
DeploymentTask 被中止
↓
DeploymentTask.task_status = CANCELLED
↓
当前 RouteExecution.execution_status = CANCELLED
↓
Robotaxi 切换到新的 Task
↓
新的 Task 创建新的 RouteExecution
```

说明：

```text
不同 Task 不能共用同一个 RouteExecution。
```

---

## 15. 异常分类

DeploymentTask 需要区分两类异常。

### 15.1 路径执行异常

这类异常来自 RouteExecution。

|异常|含义|
|---|---|
|ROUTE_UNAVAILABLE|路径不可用|
|ROUTE_BLOCKED|路径阻塞|
|ROAD_SEGMENT_UNAVAILABLE|道路不可用|
|ROUTE_STEP_INVALID|Route Step 不合法|
|ROBOTAXI_FAULT|Robotaxi 行驶中故障|
|LOW_BATTERY_DURING_EXECUTION|行驶中电量不足|

处理原则：

```text
路径执行异常先由 RouteExecution 记录。
RouteExecution 失败后反馈 DeploymentTask。
DeploymentTask 再进入 FAILED 或等待运营决策系统处理。
```

### 15.2 目标停靠异常

这类异常来自 Robotaxi 到达目标区域后的实际停靠判断。

|异常|含义|
|---|---|
|TARGET_CELL_OCCUPIED|计划目标 Cell 被占用|
|TARGET_CELL_BLOCKED|计划目标 Cell 被阻塞|
|TARGET_SERVICE_AREA_FULL|目标 ServiceArea 已满|
|NO_AVAILABLE_STOPPING_CELL|无可临停 Cell|
|NO_AVAILABLE_PARKING_CELL|无可停车 Cell|
|TARGET_SERVICE_AREA_UNAVAILABLE|整个目标区域不可用|
|UNKNOWN|未知异常|

处理原则：

```text
Robotaxi 先按 blocked_handling_policy 尝试自处理。
只有无法形成有效投放结果时，DeploymentTask 才失败。
```

---

## 16. 状态反馈

### 16.1 投放完成

```text
Task.task_status = COMPLETED
Robotaxi.current_cell_id = actual_target_cell_id
Robotaxi.current_task_id = null
Robotaxi.current_route_id = null
Robotaxi.motion_status = TEMP_STOPPED / PARKED
RouteExecution.execution_status = COMPLETED
```

如果 arrival_behavior 包含 STANDBY：

```text
Robotaxi 可进入后续供给匹配计算
```

---

### 16.2 投放失败

```text
Task.task_status = FAILED
Task.failure_reason = 对应异常原因
arrival_execution_result = 对应到达执行结果
RouteExecution.execution_status = FAILED / COMPLETED
```

说明：

```text
如果 Robotaxi 已经完成行驶但无法停靠，RouteExecution 可以是 COMPLETED，
DeploymentTask 是 FAILED。
如果 Route 本身执行失败，RouteExecution 是 FAILED。
```

同时：

```text
向运营决策系统发送异常消息
请求重新决策 Robotaxi
```

---

### 16.3 投放取消

```text
Task.task_status = CANCELLED
RouteExecution.execution_status = CANCELLED
Robotaxi.current_task_id = null 或切换为新任务
Robotaxi.current_route_id = null 或更新为新任务 Route
```

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
|ROUTE_REPLANNED|Route 重规划|
|ROUTE_EXECUTION_COMPLETED|行驶记录完成|
|ARRIVAL_RESULT_REPORTED|Robotaxi 反馈到达结果|
|TARGET_CELL_OCCUPIED|计划目标 Cell 被占用|
|TARGET_CELL_BLOCKED|计划目标 Cell 被阻塞|
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
    
5. 1 个 DeploymentTask 只能对应 1 个 RouteExecution；
    
6. RouteExecution 内部可以记录多个 Route 版本；
    
7. Route 重规划不创建新的 RouteExecution；
    
8. 不同 Task 不能共用同一个 RouteExecution；
    
9. DeploymentTask 必须有计划目标；
    
10. DeploymentTask 必须有 arrival_behavior；
    
11. DeploymentTask 必须有 blocked_handling_policy；
    
12. 计划目标与实际停靠点必须分离；
    
13. 创建任务时不要求验证最终停靠能力；
    
14. RouteExecution 到达不等于 DeploymentTask 完成；
    
15. Robotaxi 到达后必须反馈 arrival_execution_result；
    
16. NORMAL_ARRIVAL 可以推动任务完成；
    
17. 异常到达必须先按 blocked_handling_policy 处理；
    
18. Robotaxi 可以在同 ServiceArea 内寻找替代点位；
    
19. 无法形成有效投放结果时，DeploymentTask 才进入 FAILED；
    
20. DeploymentTask 失败后必须反馈运营决策系统；
    
21. 行驶过程由 RouteExecution 记录。
    

---

## 19. 核心原则

```text
DeploymentTask = 单台 Robotaxi 的运营供给投放任务
```

```text
1 个 DeploymentTask 对应 1 个 RouteExecution；
RouteExecution 是该任务下 Robotaxi 的完整行驶记录；
Route 可以重规划，但 RouteExecution 不应更换；
任务切换时，RouteExecution 才结束并更换。
```

```text
计划目标不是实际停靠点；
RouteExecution 到达不是投放完成；
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