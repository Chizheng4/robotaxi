# Simulation-time：模拟时间机制（更新版）

## 1. 目的

本文档定义自动运营模拟系统中的时间机制及场景信息显示规则。

时间机制用于为 Simulation System 提供统一的模拟时间基础，使供给侧事件、需求侧事件、任务推进、车辆行驶和服务履约都能够在同一套时间体系下运行。

同时提供每个时间点的场景信息，包括 Worker 工作状态、Robotaxi 可运营状态、需求侧时间段及高峰/平常期，以便前端和用户体验展示。

---

## 2. 核心定义

Simulation Time 是系统内部用于自动运营模拟的虚拟时间。

```text
Simulation Time = 自动运营模拟系统中的虚拟运营时间 + 场景信息
```

它不等于真实世界时间。

Simulation Time 用于回答：

```text
当前是第几天？
当前是几点？
当前处于哪个时间段？
当前是高峰期还是平常期？
当前是否属于 Worker 工作时间？
当前是否属于 Robotaxi 运营时间？
当前 Tick 应触发哪些模拟事件？
当前场景信息显示：Worker / Robotaxi / 需求侧状态
```

---

## 3. 时间对象关系

```text
SimulationRun
↓
SimulationClock
↓
SimulationTick
↓
SimulationEvent
```

说明：

|对象|职责|
|---|---|
|SimulationRun|表示一次完整模拟运行|
|SimulationClock|维护当前模拟时间及场景信息|
|SimulationTick|推进模拟时间单位，触发事件窗口|
|SimulationEvent|记录模拟时间内发生的事件|

---

## 4. Tick 定义

SimulationTick 是模拟系统的最小时间推进单位。

当前阶段设定：

```text
1 Tick = 10 分钟
一天共 144 Tick
10 天共 1440 Tick
```

Tick 同时作为场景判断窗口。

---

## 5. Tick 时间场景显示

每个 Tick 的 SimulationClock 应输出以下场景信息：

|字段|含义|
|---|---|
|simulation_day|当前模拟第几天|
|current_time|当前模拟时间|
|current_tick|当前 Tick 序号|
|tick_minutes|每个 Tick 对应分钟数|
|time_period|当前时间段（MORNING / NOON / AFTERNOON / EVENING / NIGHT）|
|period_type|PEAK / NORMAL|
|is_worker_working_time|当前 Tick 是否属于 Worker 工作时间|
|is_robotaxi_operating_time|当前 Tick 是否属于 Robotaxi 可运营时间|

示例：

```json
{
  "simulation_day": 1,
  "current_time": "08:30",
  "current_tick": 51,
  "tick_minutes": 10,
  "time_period": "MORNING",
  "period_type": "PEAK",
  "is_worker_working_time": true,
  "is_robotaxi_operating_time": true
}
```

说明：

- 前端展示时可根据该场景信息显示当前模拟时间、工作状态、可运营状态及高峰/平常期。
    
- SimulationClock 不判断资源状态，不创建业务对象，只提供时间上下文和场景信息。
    

---

## 6. 时间段与高峰定义

每天划分时间段：

|time_period|时间范围|含义|
|---|---|---|
|MORNING|06:00 - 12:00|上午|
|NOON|12:00 - 14:00|中午|
|AFTERNOON|14:00 - 18:00|下午|
|EVENING|18:00 - 24:00|晚上|
|NIGHT|00:00 - 06:00|夜间（低需求期）|

高峰和平常期：

|time_window|时间范围|time_period|period_type|
|---|---|---|---|
|06:00 - 08:00|上午平常期|MORNING|NORMAL|
|08:00 - 10:00|上午高峰期|MORNING|PEAK|
|10:00 - 12:00|上午平常期|MORNING|NORMAL|
|12:00 - 13:00|中午高峰期|NOON|PEAK|
|13:00 - 14:00|中午平常期|NOON|NORMAL|
|14:00 - 17:00|下午平常期|AFTERNOON|NORMAL|
|17:00 - 18:00|下午高峰期|AFTERNOON|PEAK|
|18:00 - 20:00|晚上高峰期|EVENING|PEAK|
|20:00 - 24:00|晚上平常期|EVENING|NORMAL|
|00:00 - 06:00|夜间低需求|NIGHT|NORMAL|

说明：

- period_type 用于需求侧订单生成规模判定。
    
- time_period、period_type、is_worker_working_time、is_robotaxi_operating_time 都可作为场景信息向前端或调试展示。
    

---

## 7. Worker 与 Robotaxi 时间约束

|资源|工作时间|说明|
|---|---|---|
|Worker|08:00 - 20:00|SimulationClock 识别时间，实际触发由 SupplyTrigger 或任务逻辑处理|
|Robotaxi|00:00 - 24:00|全天可运营，SimulationClock 仅提供可运营状态，不触发任务|

说明：

- SimulationClock 不判断资源空闲。
    
- 任务创建、执行由对应业务对象逻辑触发。
    

---

## 8. Tick 推进规则

每 Tick 推进 SimulationClock：

```text
current_time += tick_minutes
day_tick += 1
global_tick += 1
```

如果当前时间到达 24:00：

```text
simulation_day += 1
current_time = 00:00
day_tick = 0
```

如果达到 SimulationRun 设定结束天数：

```text
SimulationRun = COMPLETED
```

---

## 9. 核心规则

1. Simulation Time 提供统一时间上下文和场景信息；
    
2. Tick 为模拟时间推进单位；
    
3. 每天 144 个 Tick；
    
4. 高峰 / 平常期通过 period_type 判定；
    
5. Worker 工作时间通过 is_worker_working_time 显示；
    
6. Robotaxi 运营时间通过 is_robotaxi_operating_time 显示；
    
7. SimulationClock 不创建业务对象；
    
8. SimulationClock 不判断资源状态；
    
9. 场景信息用于前端展示和调试。

---

## 10. v027 连续模拟时间标准

从 v027 起，SimulationClock 使用 `current_simulation_seconds` 作为唯一计算源，不再以字符串时间做累计运算。

统一展示格式：

```text
Day N HH:MM:SS
```

运行时同时保留：

|字段|职责|
|---|---|
|`current_simulation_seconds`|同一模拟时间轴上的绝对模拟秒|
|`current_time`|面向用户的 `Day N HH:MM:SS`|
|`current_clock_time`|供每日时间窗口判断的 `HH:MM:SS`|
|`current_global_tick`|同一时间轴连续累计的 Tick|
|`current_run_tick`|当前 SimulationRun 内实际执行的 Tick|

`tick_seconds` 是统一计算粒度，旧 `tick_minutes` 仅用于兼容换算。跨午夜推进必须保留剩余秒数，不得直接丢弃为 `00:00:00`。

SimulationEvent 使用动作实际发生时刻；运行游标只能在本 Tick 事件记录完成后推进，避免事件时间偏移一个 Tick。
