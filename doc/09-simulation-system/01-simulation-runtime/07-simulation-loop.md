# Simulation-loop：Tick 主循环

## 1. 目的

本文档定义自动运营模拟系统中的 Tick 主循环。

SimulationLoop 用于在 SimulationRun 启动后，按照 Tick 自动推进模拟时间，并在每个 Tick 中触发供给侧、需求侧、订单、Trip 和行驶记录等已有业务能力。

本文档只定义 Tick 主循环的执行顺序和边界。

不定义：

```text
SimulationPolicy 配置内容
SimulationClock 时间计算规则
SimulationEvent 字段结构
SupplyTrigger 内部逻辑
DemandTrigger 内部逻辑
ServiceOrder 内部状态机
Trip 内部履约逻辑
RouteExecution 内部推进逻辑
```

这些由对应文档和业务服务定义。

---

## 2. 核心定义

SimulationLoop 是自动运营模拟系统中的 Tick 执行循环。

```text
SimulationLoop = 按 Tick 推进 SimulationRun 并触发自动化事件的主循环
```

它回答的问题是：

```text
每个 Tick 到来时，系统应该先做什么？
后做什么？
什么时候推进时间？
什么时候触发供给侧？
什么时候触发需求侧？
什么时候推进订单和 Trip？
什么时候记录事件？
什么时候更新 SimulationRun 当前状态？
什么时候结束 SimulationRun？
```

SimulationLoop 是自动模拟系统的运行编排器。

---

## 3. 核心定位

```text
SimulationRun = 一次模拟运行主单据
SimulationClock = 当前时间上下文计算
SimulationPolicySnapshot = 本次运行使用的规则快照
SimulationLoop = Tick 主循环编排
SupplyTrigger = 供给侧事件触发
DemandTrigger = 需求侧事件触发
SimulationEvent = 事件记录
BusinessService = 业务对象自身逻辑
```

关系如下：

```text
SimulationRun
↓
simulation_policy_snapshot
↓
SimulationLoop
↓
SimulationClock
↓
SupplyTrigger / DemandTrigger / BusinessService
↓
SimulationEvent
↓
SimulationRun 状态更新
```

说明：

```text
SimulationLoop 负责调度顺序。
SimulationLoop 不实现业务对象内部逻辑。
```

---

## 4. 核心边界

SimulationLoop 负责：

```text
读取 SimulationRun
读取 simulation_policy_snapshot
推进 Tick
刷新 SimulationClock 时间上下文
触发供给侧事件
触发需求侧事件
触发订单自动推进事件
触发 Trip 自动推进事件
触发行驶记录推进事件
记录 SimulationEvent
更新 SimulationRun 当前进度
更新当前场景摘要
判断是否完成 SimulationRun
```

SimulationLoop 不负责：

```text
判断 Worker 是否空闲
判断 Robotaxi 是否可用
判断是否创建 ReadinessCheckTask
判断是否创建 DeploymentTask
随机选择 Customer
随机生成 pickup / dropoff
计算价格
匹配 Robotaxi
规划 Route
推进 Trip 内部状态
推进 RouteExecution 内部状态
直接修改业务对象状态
```

边界原则：

```text
SimulationLoop = 编排顺序

Trigger = 触发业务服务

BusinessService = 判断和执行业务逻辑

SimulationEvent = 记录结果
```

---

## 5. 配置来源

SimulationLoop 必须使用 SimulationRun 中保存的：

```text
simulation_policy_snapshot
```

不能直接读取最新的 SimulationPolicy。

原因：

```text
SimulationPolicy 后续可能被更新
但已经创建的 SimulationRun 必须按照创建时的配置执行
```

因此：

```text
SimulationLoop 使用 snapshot
SupplyTrigger 使用 snapshot
DemandTrigger 使用 snapshot
```

这样可以保证：

```text
模拟运行可复现
配置更新不影响正在执行或已完成的 SimulationRun
历史结果可回溯
```

---

## 6. SimulationRun 状态要求

SimulationLoop 只在以下状态执行：

```text
RUNNING
DRAINING
```

如果 SimulationRun 状态为：

```text
READY
PAUSED
COMPLETED
STOPPED
FAILED
```

则 SimulationLoop 不应继续推进 Tick。

规则：

|simulation_status|是否推进 Tick|
|---|---|
|READY|否|
|RUNNING|是|
|DRAINING|是，仅执行既有工作流，不产生新触发|
|PAUSED|否|
|COMPLETED|否|
|STOPPED|否|
|FAILED|否|

---

## 7. Tick 主循环总流程

每个 Tick 的主流程如下：

```text
检查 SimulationRun 状态
↓
读取 simulation_policy_snapshot
↓
计算当前 SimulationClock 场景
↓
记录 SIMULATION_TICK_STARTED
↓
触发已执行对象推进事件
↓
触发供给侧事件
↓
触发需求侧事件
↓
触发订单自动推进事件
↓
触发 Trip 自动推进事件
↓
记录当前 Tick 事件摘要
↓
更新 SimulationRun 当前场景快照
↓
推进到下一个 Tick
↓
记录 SIMULATION_TICK_COMPLETED
↓
判断 SimulationRun 是否完成
```

说明：

```text
先处理已在执行中的对象，再触发新事件。
```

原因：

```text
先释放上一 Tick 已完成的资源
再创建新任务或新订单
可以减少同一 Tick 内资源状态滞后
```

---

## 8. Tick 内执行顺序

当前阶段建议每个 Tick 的执行顺序为：

```text
1. 校验 SimulationRun 是否 RUNNING
2. 读取 simulation_policy_snapshot
3. 生成当前 SimulationClock
4. 记录 SIMULATION_TICK_STARTED
5. 触发 RouteExecution 推进事件
6. 触发 Trip 推进事件
7. 触发 ServiceOrder 自动推进事件
8. 触发 SupplyTrigger
9. 触发 DemandTrigger
10. 汇总当前 Tick 事件结果
11. 更新 SimulationRun 当前场景摘要
12. 推进 current_tick / current_time
13. 记录 SIMULATION_TICK_COMPLETED
14. 判断是否到达 total_ticks
```

说明：

```text
RouteExecution / Trip / ServiceOrder 的推进在前。
SupplyTrigger / DemandTrigger 的新事件触发在后。
```

这样可以保证：

```text
已完成的行驶、履约、订单状态先释放
新订单和新投放再进入系统
```

---

## 9. 已执行对象推进

SimulationLoop 可以在每个 Tick 触发已执行对象推进事件。

包括：

```text
RouteExecution 推进
Trip 推进
ServiceOrder 自动推进
```

注意：

```text
SimulationLoop 只触发推进事件。
推进逻辑由对应业务服务执行。
```

### 9.1 RouteExecution 推进

触发对象：

```text
RouteExecution BusinessService
```

触发目的：

```text
推进运营任务中的行驶记录
```

SimulationLoop 不判断：

```text
是否存在 MOVING 的 RouteExecution
是否已经到达终点
是否需要更新 Robotaxi 位置
```

这些由 RouteExecution 业务服务判断。

---

### 9.2 Trip 推进

触发对象：

```text
Trip BusinessService
```

触发目的：

```text
推进服务订单履约过程
```

SimulationLoop 不判断：

```text
是否处于接驾
是否处于载客
是否到达上车点
是否到达目的地
是否完成支付
```

这些由 Trip / ServiceOrder 相关业务服务判断。

---

### 9.3 ServiceOrder 自动推进

触发对象：

```text
ServiceOrder BusinessService
```

触发目的：

```text
推进订单定价、自动确认、订单匹配、支付等自动化流程
```

SimulationLoop 不判断：

```text
是否应该定价
是否应该自动确认
是否应该匹配 Robotaxi
是否应该支付
```

这些由 ServiceOrder 相关业务服务判断。

---

## 10. SupplyTrigger 调用

SimulationLoop 在每个 Tick 调用 SupplyTrigger。

SupplyTrigger 负责触发：

```text
运营准入事件
运营投放事件
RouteExecution 推进事件
```

说明：

```text
如果 RouteExecution 已在第 5 步推进，则 SupplyTrigger 中的 route_execution_trigger 可关闭，避免重复推进。
```

当前阶段建议：

```text
RouteExecution 推进由 SimulationLoop 统一触发
SupplyTrigger 主要负责准入和投放触发
```

最终以 SimulationPolicy 中的配置为准。

---

## 11. DemandTrigger 调用

SimulationLoop 在每个 Tick 调用 DemandTrigger。

DemandTrigger 负责：

```text
根据 SimulationClock 当前时间场景
读取 simulation_policy_snapshot
生成当前 Tick 的 order_count
循环调用 DemandSimulationStrategy
创建 ServiceOrder
记录 SimulationEvent
```

SimulationLoop 不负责：

```text
生成订单数量
随机选择 Customer
随机生成位置
创建订单上下文
```

这些由 DemandTrigger 和 DemandSimulationStrategy 处理。

---

## 12. 当前 Tick 事件摘要

每个 Tick 完成后，SimulationLoop 应生成当前 Tick 摘要。

建议字段：

|字段|含义|
|---|---|
|triggered_supply_events|供给侧触发事件数|
|triggered_demand_events|需求侧触发事件数|
|created_service_orders|创建服务订单数|
|completed_service_orders|完成服务订单数|
|completed_trips|完成 Trip 数|
|completed_route_executions|完成 RouteExecution 数|
|no_action_events|无动作事件数|
|failed_events|失败事件数|

示例：

```json
{
  "triggered_supply_events": 2,
  "triggered_demand_events": 6,
  "created_service_orders": 5,
  "completed_service_orders": 3,
  "completed_trips": 3,
  "completed_route_executions": 1,
  "no_action_events": 1,
  "failed_events": 0
}
```

该摘要写入：

```text
SimulationRun.current_tick_event_summary
```

---

## 13. 当前场景快照更新

每个 Tick 结束前，SimulationLoop 应刷新 SimulationRun 的当前场景快照。

包括：

```text
current_time_period
current_period_type
current_supply_scene
current_demand_scene
current_scene_summary
current_tick_event_summary
```

说明：

```text
SimulationClock 负责计算时间场景。
SimulationLoop 负责将结果写入 SimulationRun。
```

---

## 14. Tick 推进规则

每个 Tick 结束后，SimulationLoop 推进模拟时间。

推进规则：

```text
current_global_tick += 1
current_day_tick += 1
current_time += tick_minutes
```

如果当前时间到达 24:00：

```text
current_day += 1
current_day_tick = 0
current_time = 00:00
```

如果达到 total_ticks：

```text
SimulationRun.simulation_status = COMPLETED
```

说明：

```text
Tick 推进只更新 SimulationRun 的模拟进度。
不直接改变业务对象状态。
```

---

## 15. SimulationEvent 记录

SimulationLoop 必须记录关键事件。

每个 Tick 至少记录：

```text
SIMULATION_TICK_STARTED
SIMULATION_TICK_COMPLETED
SIMULATION_SCENE_UPDATED
```

如果 Tick 中发生业务触发，应记录对应事件：

```text
SUPPLY_TRIGGER_STARTED
DEMAND_TRIGGER_STARTED
ORDER_COUNT_GENERATED
SERVICE_ORDER_CREATED
TRIP_COMPLETED
ROUTE_EXECUTION_COMPLETED
```

说明：

```text
事件明细由 SimulationEvent 记录。
SimulationLoop 只负责调用事件记录服务。
```

---

## 16. 异常处理

如果 Tick 执行中出现不可恢复错误：

```text
SimulationRun.simulation_status = FAILED
failure_reason = 对应原因
记录 SIMULATION_RUN_FAILED
```

如果某个业务服务执行失败，但不影响主循环：

```text
记录 FAILED 事件
SimulationRun 继续运行
```

规则：

```text
单个业务事件失败
不一定导致 SimulationRun 失败
```

只有以下情况才导致 SimulationRun 失败：

```text
simulation_policy_snapshot 缺失
SimulationClock 无法生成
SimulationRun 当前状态异常
Tick 推进失败
系统级异常
```

---

## 17. 运行完成规则

SimulationRun 完成条件：

```text
current_global_tick >= total_ticks
```

完成后：

```text
SimulationRun.simulation_status = COMPLETED
completed_at = 当前真实时间
生成 result_summary
记录 SIMULATION_RUN_COMPLETED
```

说明：

```text
SimulationRun 完成不代表所有业务对象都一定成功。
它只代表本次模拟时间已经跑完。
```

---

## 18. result_summary 生成

SimulationRun 完成后，SimulationLoop 应触发结果汇总。

result_summary 建议包含：

```text
total_service_orders
completed_service_orders
failed_service_orders
total_trips
completed_trips
total_deployment_tasks
completed_deployment_tasks
total_simulation_events
```

说明：

```text
当前阶段 result_summary 只做运行摘要。
复杂经营指标 Metric 后续单独设计。
```

---

## 19. 与 SimulationPolicy 的关系

SimulationLoop 不直接读取最新 SimulationPolicy。

SimulationLoop 使用：

```text
SimulationRun.simulation_policy_snapshot
```

这样保证：

```text
运行过程不受配置更新影响
历史运行结果可复现
```

---

## 20. 与 SupplyTrigger 的关系

SimulationLoop 调用 SupplyTrigger。

SupplyTrigger 负责：

```text
触发供给侧业务服务
返回供给侧触发结果
记录或返回 SimulationEvent
```

SimulationLoop 负责：

```text
决定何时调用 SupplyTrigger
汇总 SupplyTrigger 返回结果
更新 current_tick_event_summary
```

---

## 21. 与 DemandTrigger 的关系

SimulationLoop 调用 DemandTrigger。

DemandTrigger 负责：

```text
生成 order_count
调用 DemandSimulationStrategy
创建 ServiceOrder
记录或返回 SimulationEvent
```

SimulationLoop 负责：

```text
决定何时调用 DemandTrigger
汇总 DemandTrigger 返回结果
更新 current_tick_event_summary
```

---

## 22. 与业务对象的关系

SimulationLoop 只触发业务服务。

```text
SimulationLoop
↓
BusinessService
↓
BusinessObject
```

业务服务负责：

```text
判断状态
执行业务逻辑
创建对象
推进状态
返回结果
```

SimulationLoop 负责：

```text
按顺序调用
汇总结果
记录事件
推进 Tick
```

---

## 23. 当前不做内容

当前阶段不做：

```text
复杂调度器
异步事件队列
多 SimulationRun 并发
分布式任务调度
事件重试机制
复杂失败补偿
实时可视化播放控制
经营指标计算
```

当前只做：

```text
单 SimulationRun 自动推进
按 Tick 执行主循环
触发已有业务服务
记录 SimulationEvent
更新 SimulationRun 当前场景和摘要
生成 result_summary
```

---

## 24. 规则

1. SimulationLoop 是 Tick 主循环；
    
2. SimulationLoop 只在 SimulationRun = RUNNING 时执行；
    
3. SimulationLoop 必须使用 simulation_policy_snapshot；
    
4. SimulationLoop 不直接读取最新 SimulationPolicy；
    
5. SimulationLoop 不执行业务对象内部逻辑；
    
6. SimulationLoop 不判断 Worker 是否空闲；
    
7. SimulationLoop 不判断 Robotaxi 是否可用；
    
8. SimulationLoop 不随机选择 Customer；
    
9. SimulationLoop 不直接创建 ServiceOrder；
    
10. SimulationLoop 只调用 Trigger 和 BusinessService；
    
11. Tick 内应先推进已执行对象，再触发新事件；
    
12. 每个 Tick 必须记录 SimulationEvent；
    
13. 每个 Tick 必须更新 current_tick_event_summary；
    
14. 每个 Tick 必须更新当前场景快照；
    
15. Tick 推进只更新 SimulationRun 模拟进度；
    
16. 单个业务事件失败不一定导致 SimulationRun 失败；
    
17. SimulationRun 达到 total_ticks 后进入 DRAINING；
    
18. SimulationRun 完成后应生成 result_summary。

---

## 16. v027 工作流排空阶段

计划触发 Tick 达到 `total_ticks` 时，SimulationRun 不得直接完成，而是进入：

```text
RUNNING → DRAINING → COMPLETED
```

`DRAINING` 每个 Tick 只计算连续模拟时间、查询既有 ServiceOrder、Trip、ReadinessTask、DeploymentTask 和 RouteExecution 的工作流，并通过 ExecutionEngine 执行动作。此阶段不得调用 SupplyTrigger 或 DemandTrigger，也不得产生新的需求或供给业务单据。

工作流动作数为 0 时完成运行。达到 `max_drain_ticks` 仍有动作时，运行进入 `FAILED` 并记录未收敛原因；不得为了结束运行而把未完成对象强制标记成功。
