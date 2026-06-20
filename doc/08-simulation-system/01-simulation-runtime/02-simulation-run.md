Simulation-run：模拟运行对象

## 1. 目的

本文档定义自动运营模拟系统中的 SimulationRun。

SimulationRun 表示一次完整的自动运营模拟运行。

它用于记录：

```text
本次模拟运行是谁
模拟几天
当前运行到第几天
当前运行到哪个 Tick
当前模拟时间是什么
当前处于什么运营场景
当前状态是什么
使用哪套模拟规则
最终运行结果是什么
```

SimulationRun 不只记录时间进度，也需要提供当前模拟场景信息，便于用户理解当前自动化模拟处于什么时间、什么供给侧场景、什么需求侧场景，以及当前 Tick 可能触发什么事件。

本文档只定义 SimulationRun 对象。

不定义：

```text
Tick 时间规则
SimulationEvent 事件结构
SimulationPolicy 配置内容
供给侧触发机制
需求侧触发机制
Tick 主循环
```

---

## 2. 核心定义

SimulationRun 是一次模拟运行实例。

```text
SimulationRun = 一次自动运营模拟运行记录
```

它回答的问题是：

```text
这次模拟运行的范围是什么？
当前运行到第几天、第几个 Tick？
当前时间属于什么场景？
当前是 Worker 工作时间还是非工作时间？
当前 Robotaxi 是否处于运营时间？
当前是需求高峰还是平常期？
当前 Tick 已经触发了哪些事件？
运行是否正在进行？
运行是否已完成？
运行使用哪套 SimulationPolicy？
运行结果如何？
```

SimulationRun 是自动运营模拟系统的主单据。

---

## 3. 核心定位

```text
SimulationRun = 模拟运行主单据
SimulationClock = 当前模拟时间
SimulationTick = 时间推进单位
SimulationEvent = 模拟事件记录
SimulationPolicy = 模拟规则配置
```

关系如下：

```text
SimulationPolicy
↓
SimulationRun
↓
SimulationClock
↓
SimulationTick
↓
SimulationEvent
```

说明：

```text
SimulationRun 引用 SimulationPolicy。
SimulationClock 根据 SimulationRun 当前状态计算当前模拟时间。
SimulationRun 保存当前模拟场景快照。
SimulationEvent 记录 SimulationRun 运行过程中发生的事件。
```

---

## 4. 核心属性

|字段|含义|
|---|---|
|simulation_run_id|模拟运行唯一编号|
|simulation_name|模拟运行名称|
|simulation_status|模拟运行状态|
|simulation_policy_id|使用的模拟规则配置|
|total_days|模拟总天数|
|tick_minutes|每个 Tick 对应的模拟分钟数|
|total_ticks|本次模拟总 Tick 数|
|current_day|当前模拟第几天|
|current_time|当前模拟时间|
|current_day_tick|当前天内 Tick|
|current_global_tick|当前全局 Tick|
|current_time_period|当前时间段|
|current_period_type|当前高峰 / 平常类型|
|current_supply_scene|当前供给侧场景|
|current_demand_scene|当前需求侧场景|
|current_scene_summary|当前场景摘要|
|current_tick_event_summary|当前 Tick 事件摘要|
|started_at|真实开始时间|
|paused_at|暂停时间，可为空|
|resumed_at|恢复时间，可为空|
|completed_at|完成时间，可为空|
|stopped_at|停止时间，可为空|
|failure_reason|失败原因，可为空|
|result_summary|运行结果摘要|

---

## 5. simulation_status

|simulation_status|含义|
|---|---|
|READY|已创建，尚未开始|
|RUNNING|正在自动运行|
|PAUSED|已暂停|
|COMPLETED|已完成|
|STOPPED|被人工停止|
|FAILED|运行失败|

状态说明：

```text
READY 表示 SimulationRun 已创建，但模拟时钟尚未开始推进。
RUNNING 表示系统正在自动推进 Tick。
PAUSED 表示模拟暂停，当前状态保留。
COMPLETED 表示模拟达到设定结束条件。
STOPPED 表示用户提前终止模拟。
FAILED 表示模拟运行过程中发生不可恢复错误。
```

---

## 6. 状态流转

正常流转：

```text
READY
↓
RUNNING
↓
COMPLETED
```

暂停与恢复：

```text
RUNNING
↓
PAUSED
↓
RUNNING
```

提前停止：

```text
RUNNING / PAUSED
↓
STOPPED
```

异常失败：

```text
RUNNING
↓
FAILED
```

---

## 7. 控制动作与 Monitor 页面

SimulationRun 支持以下控制动作。

|控制动作|前置状态|结果状态|含义|
|---|---|---|---|
|START|READY|RUNNING|开始自动模拟|
|PAUSE|RUNNING|PAUSED|暂停模拟|
|RESUME|PAUSED|RUNNING|继续模拟|
|STOP|RUNNING / PAUSED|STOPPED|提前终止模拟|
|COMPLETE|RUNNING|COMPLETED|系统自动完成|
|FAIL|RUNNING|FAILED|系统异常失败|

说明：

```text
控制动作只改变 SimulationRun 状态。
具体业务对象状态由对应业务服务和 SimulationEvent 记录。
```

### 7.1 Monitor 页面行为

SimulationRun 的 Monitor 页面用于实时查看模拟进度，权限如下：

| 操作 | Monitor 页面 | 说明 |
|---|---|---|
| START / PAUSE / RESUME / STOP | ✅ 有 | 用户可控制模拟节奏 |
| 查看模拟进度（Tick/时间/场景） | ✅ 有 | 只读展示 |
| 查看 SimulationEvent 事件流 | ✅ 有 | 可观测 |
| 手动操作业务对象（定价/匹配/行驶等） | ❌ 无 | 模拟系统自动驱动，Monitor 不提供业务操作入口 |

> 模拟内的业务对象流转完全由 SimulationLoop → WorkflowEngine → ExecutionEngine 自动驱动，Monitor 页面只提供 SimulationRun 本身的启停控制和只读观测。用户如需手动操作业务对象，应在主界面 live 数据上进行——该操作不会影响模拟运行，也不会被记录为模拟结果。

---

## 8. 创建规则

创建 SimulationRun 时必须指定：

```text
simulation_name
simulation_policy_id
total_days
tick_minutes
```

系统根据以下公式计算：

```text
total_ticks = total_days × 24 × 60 ÷ tick_minutes
```

当前阶段默认：

```text
tick_minutes = 10
```

如果模拟 1 天：

```text
total_ticks = 1 × 24 × 60 ÷ 10 = 144
```

如果模拟 10 天：

```text
total_ticks = 10 × 24 × 60 ÷ 10 = 1440
```

---

## 9. 当前时间字段

SimulationRun 运行过程中维护当前模拟位置。

|字段|含义|
|---|---|
|current_day|当前模拟第几天|
|current_time|当前模拟时间|
|current_day_tick|当天 Tick|
|current_global_tick|全局 Tick|

### 9.1 v027 连续运行关系

同一连续模拟使用 `simulation_timeline_id` 串联。后一运行通过 `previous_simulation_run_id` 指向前一运行，并满足：

```text
next.simulation_start_seconds = previous.simulation_end_seconds
next.simulation_start_at = previous.simulation_end_at
next.current_global_tick = previous.current_global_tick
```

同一时间轴只允许一个未结束运行；存在 `READY / RUNNING / PAUSED / DRAINING` 运行时，不得创建下一运行。历史节点重跑必须创建新的时间轴分支，不能覆盖主时间线。

SimulationRun 同时记录计划结束和实际结束：

- `planned_simulation_end_at`：停止产生新供给/需求触发的时间；
- `simulation_end_at`：既有工作流排空后的实际结束时间；
- 两者差值是排空阶段消耗的模拟时长。

示例：

```json
{
  "current_day": 1,
  "current_time": "08:30",
  "current_day_tick": 51,
  "current_global_tick": 51
}
```

跨天示例：

```text
Day 1 / Tick 143 / 23:50
↓
Day 2 / Tick 0 / 00:00
```

---

## 10. 当前场景字段

SimulationRun 需要保存当前 Tick 对应的场景信息。

这些字段用于前端直接展示当前模拟所处的运营语境。

|字段|含义|
|---|---|
|current_time_period|当前时间段|
|current_period_type|当前高峰 / 平常类型|
|current_supply_scene|当前供给侧场景|
|current_demand_scene|当前需求侧场景|
|current_scene_summary|当前场景摘要|

### 10.1 current_time_period

|current_time_period|含义|
|---|---|
|NIGHT|夜间|
|MORNING|上午|
|NOON|中午|
|AFTERNOON|下午|
|EVENING|晚上|

### 10.2 current_period_type

|current_period_type|含义|
|---|---|
|PEAK|高峰期|
|NORMAL|平常期|

### 10.3 current_supply_scene

current_supply_scene 表示当前供给侧时间场景。

|current_supply_scene|含义|
|---|---|
|WORKER_WORKING_TIME|Worker 工作时间|
|WORKER_OFF_TIME|Worker 非工作时间|
|ROBOTAXI_OPERATING_TIME|Robotaxi 可运营时间|
|ROBOTAXI_NON_OPERATING_TIME|Robotaxi 非运营时间，当前阶段暂不使用|

说明：

```text
SimulationRun 只展示当前场景。
是否真正创建 ReadinessCheckTask 或 DeploymentTask，由供给侧业务逻辑判断。
```

### 10.4 current_demand_scene

current_demand_scene 表示当前需求侧时间场景。

|current_demand_scene|含义|
|---|---|
|NIGHT_LOW_DEMAND|夜间低需求|
|MORNING_NORMAL|上午平常期|
|MORNING_PEAK|上午高峰期|
|NOON_PEAK|中午高峰期|
|NOON_NORMAL|中午平常期|
|AFTERNOON_NORMAL|下午平常期|
|AFTERNOON_PEAK|下午高峰期|
|EVENING_PEAK|晚上高峰期|
|EVENING_NORMAL|晚上平常期|

### 10.5 current_scene_summary

current_scene_summary 用于前端展示一行可读说明。

示例：

```text
第 1 天 08:30，上午高峰期，Worker 工作时间，Robotaxi 全天可运营，当前 Tick 将按高峰需求模型生成订单。
```

---

## 11. 当前 Tick 事件摘要

SimulationRun 需要保存当前 Tick 的事件摘要，便于用户快速理解本 Tick 发生了什么。

|字段|含义|
|---|---|
|current_tick_event_summary|当前 Tick 事件摘要|

建议结构：

```json
{
  "triggered_supply_events": 2,
  "triggered_demand_events": 5,
  "created_service_orders": 5,
  "completed_trips": 3,
  "completed_deployment_tasks": 1,
  "skipped_events": 0
}
```

说明：

```text
事件明细由 SimulationEvent 记录。
SimulationRun 只保存当前 Tick 的摘要信息。
```

---

## 12. Tick 推进关系

SimulationRun 不直接定义 Tick 内部做什么。

它只记录当前 Tick 位置和当前场景快照。

Tick 推进由后续 `07-simulation-loop.md` 定义。

SimulationRun 只需要支持：

```text
current_global_tick + 1
current_day_tick + 1
current_time + tick_minutes
刷新 current_time_period
刷新 current_period_type
刷新 current_supply_scene
刷新 current_demand_scene
刷新 current_scene_summary
刷新 current_tick_event_summary
```

如果达到一天结束：

```text
current_day + 1
current_day_tick = 0
current_time = 00:00
```

如果达到 total_ticks：

```text
simulation_status = COMPLETED
```

---

## 13. 与 SimulationPolicy 的关系

SimulationRun 必须引用一个 SimulationPolicy。

```text
SimulationRun.simulation_policy_id
↓
SimulationPolicy
```

SimulationPolicy 提供：

```text
Tick 长度
模拟天数
需求订单数量分布
Worker 工作时间
Robotaxi 运营时间
Robotaxi 模拟速度
默认正常完成规则
```

SimulationRun 不复制全部配置逻辑，只记录引用关系和关键快照。

建议保存：

```text
simulation_policy_snapshot
```

用于保证运行后可回溯。

---

## 14. 与 SimulationClock 的关系

SimulationClock 基于 SimulationRun 的当前字段生成当前时间上下文。

```text
SimulationRun.current_day
SimulationRun.current_time
SimulationRun.current_day_tick
SimulationRun.current_global_tick
↓
SimulationClock
↓
time_period
period_type
is_worker_working_time
is_robotaxi_operating_time
```

SimulationRun 保存 SimulationClock 计算后的场景快照：

```text
current_time_period
current_period_type
current_supply_scene
current_demand_scene
current_scene_summary
```

说明：

```text
SimulationClock 负责计算时间语义。
SimulationRun 负责保存当前可展示的运行场景。
```

---

## 15. 与 SimulationEvent 的关系

一个 SimulationRun 会产生多条 SimulationEvent。

```text
SimulationRun
└── SimulationEvent[]
```

SimulationEvent 记录：

```text
每个 Tick 触发了什么事件
事件执行结果是什么
关联了哪个业务对象
是否成功
是否失败
是否跳过
```

SimulationRun 不保存完整事件明细，只保存结果摘要。

事件明细由 SimulationEvent 负责。

---

## 16. 数据上下文隔离

### 16.1 核心原则

SimulationRun 维护独立的数据上下文，与前端 UI 的 live 数据物理隔离：

```text
前端 UI live 数据：
  serviceOrders[], trips[], readinessTasks[], ...
  ↑ simulation_run_id = null
  ↑ 用户手动操作，不计入任何模拟结果

SimulationRun 沙箱数据：
  simulatedOrders[], simulatedTrips[], ...
  ↑ simulation_run_id = "SIM-RUN-001"
  ↑ Tick 自动驱动，计入对应 SimulationRun 结果
```

### 16.2 共享读取

以下数据在 live 和沙箱之间共享（只读）：

```text
策略配置：PricingStrategy / OrderMatchingStrategy
数据字典：Place / RoadSegment / Cell / 地图数据
资源池：Customer[] / Robotaxi[]（只读参考，不写入）
```

### 16.3 simulation_run_id 溯源

- `simulation_run_id = null`：用户手动操作，不计入任何 SimulationRun 结果
- `simulation_run_id = "xxx"`：模拟自动触发，计入对应 SimulationRun

`result_summary` 只统计该 `simulation_run_id` 下的数据，确保模拟结果纯净。

### 16.4 同时运行

模拟运行期间，前端 UI 仍可正常使用。用户手动操作打在 live 数据上，不影响沙箱内的模拟数据。

---

## 17. 前端展示要求

SimulationRun 页面应重点展示当前模拟场景。

建议展示区域：

```text
当前时间卡片
当前供给侧场景卡片
当前需求侧场景卡片
当前 Tick 事件摘要
运行状态与控制按钮（启动/暂停/继续/停止）
```

**Monitor 页面不提供业务操作按钮**（定价/匹配/行驶等），业务流转由模拟系统自动驱动。

### 17.1 当前时间卡片

展示：

```text
第几天
当前时间
当前 Tick
当前时间段
当前 PEAK / NORMAL
```

### 17.2 当前供给侧场景卡片

展示：

```text
Worker 工作时间 / 非工作时间
Robotaxi 运营时间
供给侧事件触发状态摘要
```

### 17.3 当前需求侧场景卡片

展示：

```text
当前需求场景
当前需求模型类型
当前 Tick 生成订单数量
```

### 17.4 当前 Tick 事件摘要

展示：

```text
触发事件数
创建订单数
完成 Trip 数
完成任务数
跳过事件数
```

说明：

```text
用户查看 SimulationRun 时，应能马上知道当前模拟处于什么运营场景。
```

---

## 18. result_summary

SimulationRun 完成后生成 result_summary。

当前阶段建议记录：

|字段|含义|
|---|---|
|total_customers|客户总数|
|total_robotaxis|Robotaxi 总数|
|total_workers|Worker 总数|
|total_service_orders|服务订单总数|
|completed_service_orders|完成订单数|
|failed_service_orders|失败订单数|
|total_trips|Trip 总数|
|completed_trips|完成 Trip 数|
|total_deployment_tasks|投放任务总数|
|completed_deployment_tasks|完成投放任务数|
|total_simulation_events|事件总数|

说明：

```text
当前 result_summary 只做运行摘要。
经营指标 Metric 后续再设计。
```

---

## 19. 示例数据

```json
{
  "simulation_run_id": "SIM-RUN-001",
  "simulation_name": "1天自动运营模拟",
  "simulation_status": "RUNNING",
  "simulation_policy_id": "SIM-POLICY-001",
  "total_days": 1,
  "tick_minutes": 10,
  "total_ticks": 144,
  "current_day": 1,
  "current_time": "08:30",
  "current_day_tick": 51,
  "current_global_tick": 51,
  "current_time_period": "MORNING",
  "current_period_type": "PEAK",
  "current_supply_scene": "WORKER_WORKING_TIME",
  "current_demand_scene": "MORNING_PEAK",
  "current_scene_summary": "第 1 天 08:30，上午高峰期，Worker 工作时间，Robotaxi 全天可运营。",
  "current_tick_event_summary": {
    "triggered_supply_events": 2,
    "triggered_demand_events": 5,
    "created_service_orders": 5,
    "completed_trips": 3,
    "completed_deployment_tasks": 1,
    "skipped_events": 0
  },
  "started_at": "2026-01-01T09:00:00",
  "paused_at": null,
  "resumed_at": null,
  "completed_at": null,
  "stopped_at": null,
  "failure_reason": null,
  "result_summary": null
}
```

---

## 20. 当前不做内容

当前阶段不做：

```text
多 SimulationRun 并发运行
SimulationRun 复制环境快照
SimulationRun 回滚
SimulationRun 分支对比
复杂经营指标分析
利润分析
供需平衡指标
仿真参数自动优化
```

当前只做：

```text
创建一次模拟运行
启动模拟
暂停模拟
继续模拟
停止模拟
完成模拟
记录当前 Tick
记录当前场景上下文
记录当前 Tick 事件摘要
记录运行摘要
```

---

## 21. 规则

1. SimulationRun 是自动运营模拟的主单据；
    
2. 一次 SimulationRun 对应一次完整模拟运行；
    
3. SimulationRun 必须引用 SimulationPolicy；
    
4. SimulationRun 只记录运行状态、当前模拟进度和当前场景快照；
    
5. SimulationRun 不定义业务对象逻辑；
    
6. SimulationRun 不直接创建 ServiceOrder；
    
7. SimulationRun 不直接创建 Task；
    
8. SimulationRun 不直接推进 Trip；
    
9. Tick 主循环由 `07-simulation-loop.md` 定义；
    
10. SimulationEvent 负责记录事件明细；
    
11. SimulationClock 负责计算时间语义；
    
12. SimulationRun 负责保存当前可展示的运行场景；
    
13. SimulationRun 页面必须能展示当前供给侧和需求侧场景；
    
14. SimulationRun 完成后应生成 result_summary；
    
15. 当前阶段不做复杂经营指标 Metric；
    
16. 模拟数据与前端 live 数据物理隔离，可同时运行互不影响；
    
17. simulation_run_id = null 为用户手动操作，不计入任何模拟结果；
    
18. result_summary 只统计 simulation_run_id 匹配的数据；
    
19. Monitor 页面提供 SimulationRun 启停控制，不提供业务对象操作入口；
    
20. 策略配置和地图数据在 live 和沙箱之间共享读取（只读）。
