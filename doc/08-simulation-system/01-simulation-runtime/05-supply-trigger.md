# Supply-trigger：供给侧事件触发机制

## 1. 目的

本文档定义自动运营模拟系统中的供给侧事件触发机制。

SupplyTrigger 用于在每个 SimulationTick 中，根据当前模拟时间和 SimulationRun 中保存的 simulation_policy_snapshot，触发供给侧业务事件。

本文档只定义供给侧触发机制。

不定义：

```text
ReadinessCheckTask 创建逻辑
DeploymentTask 创建逻辑
Worker 分配逻辑
Robotaxi 状态判断逻辑
RouteExecution 行驶逻辑
供给侧业务对象内部状态流转
```

这些逻辑由对应业务对象和业务服务自行处理。

---

## 2. 核心定义

SupplyTrigger 是自动运营模拟系统中的供给侧触发器。

```text
SupplyTrigger = 基于模拟时间和配置快照触发供给侧业务事件的模拟触发机制
```

它回答的问题是：

```text
当前 Tick 是否触发运营准入事件？
当前 Tick 是否触发运营投放事件？
当前 Tick 是否触发 RouteExecution 推进事件？
当前 Tick 是否需要记录供给侧触发结果？
```

它不回答：

```text
是否有空闲 Worker？
是否有待准入 Robotaxi？
是否真正创建 ReadinessCheckTask？
是否真正创建 DeploymentTask？
是否真正推进 RouteExecution？
```

这些属于供给侧业务服务自身逻辑。

---

## 3. 核心边界

SupplyTrigger 负责：

```text
读取 SimulationRun 当前 Tick
读取 SimulationClock 当前时间上下文
读取 SimulationRun.simulation_policy_snapshot
判断供给侧触发开关
触发供给侧业务服务
记录 SimulationEvent
```

SupplyTrigger 不负责：

```text
判断 Worker 是否空闲
判断 Robotaxi 是否可用
判断 Robotaxi 是否需要准入
判断 Robotaxi 是否需要投放
判断任务是否应创建
判断任务是否应完成
直接修改 Worker 状态
直接修改 Robotaxi 状态
直接修改 Task 状态
```

边界原则：

```text
SupplyTrigger = 触发供给侧业务服务

供给侧业务服务 = 判断资源与任务逻辑

SimulationEvent = 记录触发与返回结果
```

---

## 4. 配置来源

SupplyTrigger 必须使用 SimulationRun 中保存的 simulation_policy_snapshot。

```text
SimulationRun
└── simulation_policy_snapshot
    └── supply_trigger_config
```

不能直接读取最新 SimulationPolicy。

原因：

```text
SimulationPolicy 后续可能被人工修改
但已经创建的 SimulationRun 必须按照创建时的配置继续执行
```

因此：

```text
SupplyTrigger 运行时读取 simulation_policy_snapshot
而不是读取最新 SimulationPolicy
```

这样可以保证：

```text
模拟过程可复现
运行中配置不漂移
历史结果可回溯
```

---

## 5. 输入

SupplyTrigger 每次执行时需要以下输入：

|输入|含义|
|---|---|
|simulation_run_id|当前模拟运行编号|
|simulation_policy_snapshot|当前运行使用的配置快照|
|simulation_day|当前模拟第几天|
|current_time|当前模拟时间|
|day_tick|当天 Tick|
|global_tick|全局 Tick|
|time_period|当前时间段|
|period_type|当前高峰 / 平常类型|
|is_worker_working_time|是否处于 Worker 工作时间|
|is_robotaxi_operating_time|是否处于 Robotaxi 运营时间|

说明：

```text
时间上下文来自 SimulationClock。
配置数据来自 simulation_policy_snapshot。
```

---

## 6. 输出

SupplyTrigger 执行后输出当前 Tick 的供给侧触发结果。

建议输出：

|输出|含义|
|---|---|
|readiness_trigger_result|运营准入触发结果|
|deployment_trigger_result|运营投放触发结果|
|route_execution_trigger_result|行驶记录推进触发结果|
|triggered_event_count|触发事件数量|
|no_action_count|无动作数量|
|failed_event_count|失败事件数量|
|simulation_event_ids|生成的 SimulationEvent 列表|

示例：

```json
{
  "readiness_trigger_result": "TRIGGERED",
  "deployment_trigger_result": "TRIGGERED",
  "route_execution_trigger_result": "TRIGGERED",
  "triggered_event_count": 3,
  "no_action_count": 1,
  "failed_event_count": 0,
  "simulation_event_ids": ["SE-001", "SE-002", "SE-003"]
}
```

---

## 7. supply_trigger_config

SupplyTrigger 使用 simulation_policy_snapshot 中的 supply_trigger_config。

建议配置：

```json
{
  "supply_trigger_enabled": true,
  "readiness_trigger_enabled": true,
  "deployment_trigger_enabled": true,
  "route_execution_trigger_enabled": true
}
```

字段说明：

|字段|含义|
|---|---|
|supply_trigger_enabled|是否启用供给侧触发|
|readiness_trigger_enabled|是否触发运营准入事件|
|deployment_trigger_enabled|是否触发运营投放事件|
|route_execution_trigger_enabled|是否触发行驶记录推进事件|

---

## 8. 触发类型

当前阶段 SupplyTrigger 支持三类供给侧事件。

```text
运营准入触发
运营投放触发
RouteExecution 推进触发
```

对应关系：

|触发类型|对应业务能力|
|---|---|
|READINESS_CHECK_TRIGGER|ReadinessCheckTask 业务服务|
|DEPLOYMENT_TRIGGER|DeploymentTask 业务服务|
|ROUTE_EXECUTION_TRIGGER|RouteExecution 业务服务|

---

## 9. 运营准入触发

### 9.1 触发条件

SupplyTrigger 只判断：

```text
supply_trigger_enabled = true
AND
readiness_trigger_enabled = true
AND
is_worker_working_time = true
```

满足后触发：

```text
ReadinessCheckTask 业务服务
```

### 9.2 SupplyTrigger 不判断内容

SupplyTrigger 不判断：

```text
是否有 PENDING_INSPECTION Robotaxi
是否有 IDLE Worker
是否已经存在未完成 ReadinessCheckTask
是否可以创建任务
```

这些由 ReadinessCheckTask 业务服务自行判断。

### 9.3 返回结果

ReadinessCheckTask 业务服务可能返回：

|返回结果|含义|
|---|---|
|TASK_CREATED|创建任务成功|
|NO_CANDIDATE_ROBOTAXI|无待准入 Robotaxi|
|NO_IDLE_WORKER|无空闲 Worker|
|ROBOTAXI_ALREADY_HAS_PENDING_CHECK_TASK|Robotaxi 已有未完成任务|
|BUSINESS_FAILED|业务执行失败|

SupplyTrigger 只记录返回结果。

---

## 10. 运营投放触发

### 10.1 触发条件

SupplyTrigger 只判断：

```text
supply_trigger_enabled = true
AND
deployment_trigger_enabled = true
AND
is_robotaxi_operating_time = true
```

满足后触发：

```text
DeploymentTask 业务服务
```

### 10.2 SupplyTrigger 不判断内容

SupplyTrigger 不判断：

```text
是否有 AVAILABLE Robotaxi
Robotaxi 是否已经待命
Robotaxi 是否有 current_order_id
Robotaxi 是否有 current_task_id
是否应该创建 DeploymentTask
是否应该调用 RoutePlanningStrategy
```

这些由 DeploymentTask 业务服务自行判断。

### 10.3 返回结果

DeploymentTask 业务服务可能返回：

|返回结果|含义|
|---|---|
|TASK_CREATED|创建投放任务成功|
|NO_AVAILABLE_ROBOTAXI|无可投放 Robotaxi|
|ROBOTAXI_ALREADY_HAS_TASK|Robotaxi 已有任务|
|TARGET_UNAVAILABLE|无可用投放目标|
|BUSINESS_FAILED|业务执行失败|

SupplyTrigger 只记录返回结果。

---

## 11. RouteExecution 推进触发

### 11.1 触发条件

SupplyTrigger 只判断：

```text
supply_trigger_enabled = true
AND
route_execution_trigger_enabled = true
```

满足后触发：

```text
RouteExecution 业务服务
```

### 11.2 SupplyTrigger 不判断内容

SupplyTrigger 不判断：

```text
是否存在 MOVING 的 RouteExecution
是否推进到下一个 Route Step
是否完成 Route
是否更新 Robotaxi 位置
是否更新电量和里程
```

这些由 RouteExecution 业务服务自行判断。

### 11.3 返回结果

RouteExecution 业务服务可能返回：

|返回结果|含义|
|---|---|
|ROUTE_EXECUTION_PROGRESS_UPDATED|行驶记录已推进|
|ROUTE_EXECUTION_COMPLETED|行驶记录已完成|
|NO_ACTIVE_ROUTE_EXECUTION|当前无行驶记录需要推进|
|ROUTE_EXECUTION_FAILED|行驶记录推进失败|

SupplyTrigger 只记录返回结果。

---

## 12. 执行流程

每个 Tick 中，SupplyTrigger 的执行流程如下：

```text
SimulationTick 到达
↓
读取 SimulationClock 当前时间上下文
↓
读取 SimulationRun.simulation_policy_snapshot
↓
读取 supply_trigger_config
↓
判断 supply_trigger_enabled
↓
触发运营准入业务服务
↓
触发运营投放业务服务
↓
触发 RouteExecution 推进业务服务
↓
记录 SimulationEvent
↓
返回供给侧触发摘要
```

说明：

```text
SupplyTrigger 只负责触发。
业务服务自行决定是否创建任务、是否推进状态、是否返回 NO_ACTION。
```

---

## 13. 触发顺序

当前阶段建议供给侧触发顺序为：

```text
ReadinessCheckTask 触发
↓
DeploymentTask 触发
↓
RouteExecution 推进触发
```

说明：

```text
准入优先于投放。
投放优先于行驶推进。
```

后续也可以调整为：

```text
先推进已执行对象
再触发新任务
```

最终执行顺序由 `07-simulation-loop.md` 统一定义。

---

## 14. SimulationEvent 记录

SupplyTrigger 必须记录 SimulationEvent。

典型事件：

|event_type|含义|
|---|---|
|SUPPLY_TRIGGER_STARTED|供给侧触发开始|
|READINESS_CHECK_TRIGGERED|触发运营准入业务服务|
|READINESS_CHECK_NO_ACTION|运营准入无动作|
|READINESS_CHECK_CREATED|运营准入任务创建|
|READINESS_CHECK_FAILED|运营准入触发失败|
|DEPLOYMENT_TRIGGERED|触发运营投放业务服务|
|DEPLOYMENT_NO_ACTION|运营投放无动作|
|DEPLOYMENT_TASK_CREATED|运营投放任务创建|
|DEPLOYMENT_TRIGGER_FAILED|运营投放触发失败|
|ROUTE_EXECUTION_TRIGGERED|触发行驶记录推进|
|ROUTE_EXECUTION_NO_ACTION|无行驶记录需要推进|
|ROUTE_EXECUTION_UPDATED|行驶记录已推进|
|ROUTE_EXECUTION_COMPLETED|行驶记录完成|
|SUPPLY_TRIGGER_COMPLETED|供给侧触发完成|

---

## 15. event_payload 示例

### 15.1 READINESS_CHECK_NO_ACTION

```json
{
  "simulation_day": 1,
  "current_time": "08:10",
  "trigger_type": "READINESS_CHECK_TRIGGER",
  "business_result": "NO_CANDIDATE_ROBOTAXI",
  "message": "当前无待准入 Robotaxi，未创建运营准入任务。"
}
```

### 15.2 DEPLOYMENT_TASK_CREATED

```json
{
  "simulation_day": 1,
  "current_time": "08:20",
  "trigger_type": "DEPLOYMENT_TRIGGER",
  "business_result": "TASK_CREATED",
  "deployment_task_id": "DT-001",
  "robotaxi_id": "RTX-001"
}
```

### 15.3 ROUTE_EXECUTION_UPDATED

```json
{
  "simulation_day": 1,
  "current_time": "08:30",
  "trigger_type": "ROUTE_EXECUTION_TRIGGER",
  "business_result": "ROUTE_EXECUTION_PROGRESS_UPDATED",
  "route_execution_id": "RE-001",
  "robotaxi_id": "RTX-001",
  "current_cell_id": "C-12-10"
}
```

---

## 16. event_result 映射

SupplyTrigger 根据业务服务返回结果生成 SimulationEvent.event_result。

|业务返回|event_result|
|---|---|
|TASK_CREATED|SUCCESS|
|ROUTE_EXECUTION_PROGRESS_UPDATED|SUCCESS|
|ROUTE_EXECUTION_COMPLETED|SUCCESS|
|NO_CANDIDATE_ROBOTAXI|NO_ACTION|
|NO_IDLE_WORKER|NO_ACTION|
|NO_AVAILABLE_ROBOTAXI|NO_ACTION|
|NO_ACTIVE_ROUTE_EXECUTION|NO_ACTION|
|BUSINESS_FAILED|FAILED|

说明：

```text
NO_ACTION 不是失败。
NO_ACTION 表示触发发生了，但业务服务判断当前无需创建或推进。
```

---

## 17. 与 SimulationPolicy 的关系

SupplyTrigger 不直接读取 SimulationPolicy。

SupplyTrigger 读取：

```text
SimulationRun.simulation_policy_snapshot
```

原因：

```text
SimulationRun 创建后，其执行规则应固定。
SimulationPolicy 后续修改不应影响正在运行或已完成的 SimulationRun。
```

因此：

```text
SupplyTrigger 使用 snapshot
DemandTrigger 使用 snapshot
SimulationLoop 使用 snapshot
```

---

## 18. 与 SimulationRun 的关系

SupplyTrigger 每次执行都属于某个 SimulationRun。

```text
SimulationRun
↓
SupplyTrigger
↓
SimulationEvent
```

SimulationRun 负责保存：

```text
当前模拟时间
当前 Tick
当前场景摘要
当前 Tick 事件摘要
```

SupplyTrigger 返回的结果可用于更新：

```text
current_tick_event_summary
```

---

## 19. 与业务对象的关系

SupplyTrigger 只调用业务服务。

```text
SupplyTrigger
↓
ReadinessCheckTask Service
DeploymentTask Service
RouteExecution Service
```

业务服务负责：

```text
判断资源状态
创建任务
推进状态
返回结果
```

SupplyTrigger 负责：

```text
触发业务服务
记录返回结果
写入 SimulationEvent
```

---

## 20. 当前不做内容

当前阶段不做：

```text
供给侧资源判断
Worker 分配算法
Robotaxi 投放策略
充电调度触发
维修调度触发
复杂异常触发
优先级队列
供给侧优化决策
```

当前只做：

```text
按 Tick 触发供给侧业务服务
按配置开关决定是否触发
使用 simulation_policy_snapshot
记录 SimulationEvent
返回供给侧触发摘要
```

---

## 21. 规则

1. SupplyTrigger 是供给侧事件触发机制；
    
2. SupplyTrigger 不执行业务逻辑；
    
3. SupplyTrigger 不判断 Worker 是否空闲；
    
4. SupplyTrigger 不判断 Robotaxi 是否可用；
    
5. SupplyTrigger 不决定是否创建任务；
    
6. SupplyTrigger 只触发供给侧业务服务；
    
7. 业务服务自行判断是否创建任务或推进状态；
    
8. SupplyTrigger 必须使用 SimulationRun.simulation_policy_snapshot；
    
9. SupplyTrigger 不直接读取最新 SimulationPolicy；
    
10. 配置更新不影响正在执行的 SimulationRun；
    
11. 每次 SupplyTrigger 执行必须记录 SimulationEvent；
    
12. NO_ACTION 不代表失败；
    
13. RouteExecution 推进触发属于供给侧触发范围；
    
14. Trip 推进不属于 SupplyTrigger；
    
15. ServiceOrder 推进不属于 SupplyTrigger。