# initialization-simulation：模拟配置初始化

## 1. 目的

本文档定义自动运营模拟系统中的默认 SimulationPolicy 初始化要求。

初始化目标是生成一份可被 SimulationRun 引用的默认模拟规则配置，使后续用户创建模拟运行对象时，可以基于该配置生成 `simulation_policy_snapshot`。

本文档只负责初始化 SimulationPolicy。

不初始化：

```text
SimulationRun
SimulationEvent
SimulationTick
ServiceOrder
Trip
ReadinessCheckTask
DeploymentTask
RouteExecution
PricingDecision
OrderMatchingDecision
```

这些对象属于运行过程中创建的对象，不属于初始化范围。

---

## 2. 初始化边界

初始化的对象是：

```text
SimulationPolicy
```

初始化的结果是：

```text
一份 ACTIVE 状态的默认 SimulationPolicy
```

它用于后续：

```text
用户创建 SimulationRun
↓
SimulationRun 引用 SimulationPolicy
↓
SimulationRun 生成 simulation_policy_snapshot
↓
SimulationLoop 按 snapshot 执行
```

说明：

```text
SimulationRun 是模拟运行对象，由用户或系统操作创建。
SimulationPolicy 是模拟规则配置，可以初始化。
```

---

## 3. 初始化对象

默认初始化一个 SimulationPolicy。

```text
simulation_policy_id = SIM-POLICY-001
policy_name = 1天自动运营模拟默认配置
policy_status = ACTIVE
```

该配置用于第一阶段自动运营模拟。

---

## 4. 基础配置

|字段|默认值|含义|
|---|---|---|
|tick_minutes|10|每个 Tick 对应 10 分钟模拟时间|
|simulation_days|1|默认模拟 1 天|
|run_speed_level|FAST|默认快速运行|
|random_seed|20260101|随机种子，用于复现结果|

说明：

```text
tick_minutes 决定模拟时间粒度。
simulation_days 决定默认模拟周期。
run_speed_level 只影响真实时间中的播放速度。
random_seed 用于让随机订单序列可复现。
```

---

## 5. Worker 工作时间配置

默认 Worker 工作时间：

```text
08:00 - 20:00
```

初始化字段：

```json
{
  "worker_work_start_time": "08:00",
  "worker_work_end_time": "20:00"
}
```

说明：

```text
SimulationPolicy 只配置 Worker 工作时间。
Worker 是否空闲、是否可分配任务，由供给侧业务服务判断。
```

---

## 6. Robotaxi 运营时间配置

默认 Robotaxi 全天可运营：

```text
00:00 - 24:00
```

初始化字段：

```json
{
  "robotaxi_operating_start_time": "00:00",
  "robotaxi_operating_end_time": "24:00"
}
```

说明：

```text
SimulationPolicy 只配置 Robotaxi 运营时间。
Robotaxi 是否可接单、可投放、可行驶，由对应业务逻辑判断。
```

---

## 7. 时间段配置

默认 time_period_configs：

```json
[
  {
    "time_period": "NIGHT",
    "start_time": "00:00",
    "end_time": "06:00"
  },
  {
    "time_period": "MORNING",
    "start_time": "06:00",
    "end_time": "12:00"
  },
  {
    "time_period": "NOON",
    "start_time": "12:00",
    "end_time": "14:00"
  },
  {
    "time_period": "AFTERNOON",
    "start_time": "14:00",
    "end_time": "18:00"
  },
  {
    "time_period": "EVENING",
    "start_time": "18:00",
    "end_time": "24:00"
  }
]
```

规则：

```text
time_period_configs 必须覆盖 00:00 - 24:00。
不得存在时间缺口。
不得存在时间重叠。
```

---

## 8. 时间窗口配置

默认 time_window_configs：

```json
[
  {
    "time_window": "NIGHT_LOW",
    "start_time": "00:00",
    "end_time": "06:00",
    "time_period": "NIGHT",
    "period_type": "LOW",
    "demand_profile_id": "DP-NIGHT-LOW"
  },
  {
    "time_window": "MORNING_NORMAL_1",
    "start_time": "06:00",
    "end_time": "08:00",
    "time_period": "MORNING",
    "period_type": "NORMAL",
    "demand_profile_id": "DP-MORNING-NORMAL"
  },
  {
    "time_window": "MORNING_PEAK",
    "start_time": "08:00",
    "end_time": "10:00",
    "time_period": "MORNING",
    "period_type": "PEAK",
    "demand_profile_id": "DP-MORNING-PEAK"
  },
  {
    "time_window": "MORNING_NORMAL_2",
    "start_time": "10:00",
    "end_time": "12:00",
    "time_period": "MORNING",
    "period_type": "NORMAL",
    "demand_profile_id": "DP-MORNING-NORMAL"
  },
  {
    "time_window": "NOON_PEAK",
    "start_time": "12:00",
    "end_time": "13:00",
    "time_period": "NOON",
    "period_type": "PEAK",
    "demand_profile_id": "DP-NOON-PEAK"
  },
  {
    "time_window": "NOON_NORMAL",
    "start_time": "13:00",
    "end_time": "14:00",
    "time_period": "NOON",
    "period_type": "NORMAL",
    "demand_profile_id": "DP-NOON-NORMAL"
  },
  {
    "time_window": "AFTERNOON_NORMAL",
    "start_time": "14:00",
    "end_time": "17:00",
    "time_period": "AFTERNOON",
    "period_type": "NORMAL",
    "demand_profile_id": "DP-AFTERNOON-NORMAL"
  },
  {
    "time_window": "AFTERNOON_PEAK",
    "start_time": "17:00",
    "end_time": "18:00",
    "time_period": "AFTERNOON",
    "period_type": "PEAK",
    "demand_profile_id": "DP-AFTERNOON-PEAK"
  },
  {
    "time_window": "EVENING_PEAK",
    "start_time": "18:00",
    "end_time": "20:00",
    "time_period": "EVENING",
    "period_type": "PEAK",
    "demand_profile_id": "DP-EVENING-PEAK"
  },
  {
    "time_window": "EVENING_NORMAL",
    "start_time": "20:00",
    "end_time": "24:00",
    "time_period": "EVENING",
    "period_type": "NORMAL",
    "demand_profile_id": "DP-EVENING-NORMAL"
  }
]
```

规则：

```text
time_window_configs 必须覆盖 00:00 - 24:00。
每个 time_window 必须关联 demand_profile_id。
NIGHT 必须有需求配置。
EVENING 必须有需求配置。
```

---

## 9. 需求生成配置

默认 demand_generation_config：

```json
{
  "demand_generation_enabled": true,
  "demand_generation_mode": "TICK_ORDER_COUNT_DISTRIBUTION",
  "max_orders_per_tick_global": 10
}
```

说明：

```text
当前阶段使用 Tick 级订单数量分布。
DemandTrigger 根据 time_window 关联的 DemandProfile 生成当前 Tick 的订单数量。
```

---

## 10. DemandProfile 初始化

默认初始化以下 DemandProfile 配置。

|demand_profile_id|时间窗口|distribution_type|lambda|min_orders_per_tick|max_orders_per_tick|
|---|---|---|--:|--:|--:|
|DP-NIGHT-LOW|夜间低需求|POISSON|0.3|0|2|
|DP-MORNING-NORMAL|上午平常期|POISSON|2|0|6|
|DP-MORNING-PEAK|上午高峰期|POISSON|5|0|10|
|DP-NOON-PEAK|中午高峰期|POISSON|4|0|8|
|DP-NOON-NORMAL|中午平常期|POISSON|2|0|5|
|DP-AFTERNOON-NORMAL|下午平常期|POISSON|2|0|6|
|DP-AFTERNOON-PEAK|下午高峰期|POISSON|4|0|8|
|DP-EVENING-PEAK|晚上高峰期|POISSON|5|0|10|
|DP-EVENING-NORMAL|晚上平常期|POISSON|2|0|6|

说明：

```text
DemandProfile 是 SimulationPolicy 中的需求数量配置。
不是 DemandSimulationStrategy。
DemandProfile 只决定当前 Tick 生成多少订单。
每笔订单的客户、起点、上车点、下车点由 DemandSimulationStrategy 生成。
```

---

## 11. DemandProfile 配置数据

```json
[
  {
    "demand_profile_id": "DP-NIGHT-LOW",
    "profile_name": "夜间低需求",
    "distribution_type": "POISSON",
    "lambda": 0.3,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 2
  },
  {
    "demand_profile_id": "DP-MORNING-NORMAL",
    "profile_name": "上午平常期",
    "distribution_type": "POISSON",
    "lambda": 2,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 6
  },
  {
    "demand_profile_id": "DP-MORNING-PEAK",
    "profile_name": "上午高峰期",
    "distribution_type": "POISSON",
    "lambda": 5,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 10
  },
  {
    "demand_profile_id": "DP-NOON-PEAK",
    "profile_name": "中午高峰期",
    "distribution_type": "POISSON",
    "lambda": 4,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 8
  },
  {
    "demand_profile_id": "DP-NOON-NORMAL",
    "profile_name": "中午平常期",
    "distribution_type": "POISSON",
    "lambda": 2,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 5
  },
  {
    "demand_profile_id": "DP-AFTERNOON-NORMAL",
    "profile_name": "下午平常期",
    "distribution_type": "POISSON",
    "lambda": 2,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 6
  },
  {
    "demand_profile_id": "DP-AFTERNOON-PEAK",
    "profile_name": "下午高峰期",
    "distribution_type": "POISSON",
    "lambda": 4,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 8
  },
  {
    "demand_profile_id": "DP-EVENING-PEAK",
    "profile_name": "晚上高峰期",
    "distribution_type": "POISSON",
    "lambda": 5,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 10
  },
  {
    "demand_profile_id": "DP-EVENING-NORMAL",
    "profile_name": "晚上平常期",
    "distribution_type": "POISSON",
    "lambda": 2,
    "min_orders_per_tick": 0,
    "max_orders_per_tick": 6
  }
]
```

---

## 12. 供给侧触发配置

默认 supply_trigger_config：

```json
{
  "supply_trigger_enabled": true,
  "readiness_trigger_enabled": true,
  "deployment_trigger_enabled": true,
  "route_execution_trigger_enabled": true
}
```

说明：

```text
该配置只决定是否触发供给侧业务服务。
是否创建任务、是否推进状态，由供给侧业务服务判断。
```

---

## 13. ServiceOrder 自动化配置

默认 service_order_auto_config：

```json
{
  "auto_pricing_enabled": true,
  "auto_customer_confirm_enabled": true,
  "auto_order_matching_enabled": true,
  "auto_trip_creation_enabled": true,
  "auto_trip_progress_enabled": true,
  "auto_payment_enabled": true
}
```

说明：

```text
该配置只决定是否自动触发订单后续业务能力。
不重新定义定价、匹配、Trip、支付逻辑。
```

---

## 14. 执行耗时配置

默认 execution_time_config：

```json
{
  "worker_readiness_check_ticks": 2,
  "passenger_boarding_ticks": 1,
  "dropoff_and_payment_ticks": 1
}
```

说明：

```text
该配置只定义固定等待或处理耗时。
Robotaxi 行驶耗时由 Route.total_distance_km 和 robotaxi_speed_kmh 计算。
```

---

## 15. Robotaxi 速度配置

默认：

```json
{
  "robotaxi_speed_kmh": 30
}
```

行驶 Tick 计算规则：

```text
travel_time_hours = Route.total_distance_km / robotaxi_speed_kmh
travel_time_minutes = travel_time_hours × 60
required_ticks = ceil(travel_time_minutes / tick_minutes)
```

---

## 16. 默认完成配置

默认 default_completion_config：

```json
{
  "default_readiness_passed": true,
  "default_deployment_arrival_normal": true,
  "default_pickup_arrival_normal": true,
  "default_passenger_boarded": true,
  "default_service_arrival_normal": true,
  "default_payment_success": true
}
```

说明：

```text
当前阶段默认所有已触发业务正常完成。
异常、失败、取消后续版本再引入。
```

---

## 17. 异常概率配置

当前阶段默认：

```json
{
  "enable_exception_probability": false
}
```

说明：

```text
当前阶段不启用异常概率。
只保留后续扩展入口。
```

---

## 18. 完整默认 SimulationPolicy

默认初始化生成：

```json
{
  "simulation_policy_id": "SIM-POLICY-001",
  "policy_name": "1天自动运营模拟默认配置",
  "policy_status": "ACTIVE",
  "tick_minutes": 10,
  "simulation_days": 1,
  "run_speed_level": "FAST",
  "random_seed": 20260101,
  "worker_work_start_time": "08:00",
  "worker_work_end_time": "20:00",
  "robotaxi_operating_start_time": "00:00",
  "robotaxi_operating_end_time": "24:00",
  "demand_generation_config": {
    "demand_generation_enabled": true,
    "demand_generation_mode": "TICK_ORDER_COUNT_DISTRIBUTION",
    "max_orders_per_tick_global": 10
  },
  "supply_trigger_config": {
    "supply_trigger_enabled": true,
    "readiness_trigger_enabled": true,
    "deployment_trigger_enabled": true,
    "route_execution_trigger_enabled": true
  },
  "service_order_auto_config": {
    "auto_pricing_enabled": true,
    "auto_customer_confirm_enabled": true,
    "auto_order_matching_enabled": true,
    "auto_trip_creation_enabled": true,
    "auto_trip_progress_enabled": true,
    "auto_payment_enabled": true
  },
  "execution_time_config": {
    "worker_readiness_check_ticks": 2,
    "passenger_boarding_ticks": 1,
    "dropoff_and_payment_ticks": 1
  },
  "robotaxi_speed_kmh": 30,
  "default_completion_config": {
    "default_readiness_passed": true,
    "default_deployment_arrival_normal": true,
    "default_pickup_arrival_normal": true,
    "default_passenger_boarded": true,
    "default_service_arrival_normal": true,
    "default_payment_success": true
  },
  "enable_exception_probability": false
}
```

说明：

```text
time_period_configs、time_window_configs、demand_profiles 应作为该 SimulationPolicy 的配置组成部分一并保存。
```

---

## 19. 初始化校验规则

SimulationPolicy 初始化后必须校验：

1. simulation_policy_id 不为空；
    
2. policy_status = ACTIVE；
    
3. tick_minutes > 0；
    
4. simulation_days > 0；
    
5. robotaxi_speed_kmh > 0；
    
6. time_period_configs 覆盖 00:00 - 24:00；
    
7. time_window_configs 覆盖 00:00 - 24:00；
    
8. time_window_configs 不存在时间重叠；
    
9. 每个 time_window 必须关联 demand_profile_id；
    
10. 每个 demand_profile_id 必须存在；
    
11. 每个 DemandProfile 必须配置 distribution_type；
    
12. 每个 DemandProfile 必须配置 max_orders_per_tick；
    
13. max_orders_per_tick_global 必须大于等于所有 DemandProfile 的 max_orders_per_tick；
    
14. NIGHT 必须有需求配置；
    
15. EVENING 必须有需求配置；
    
16. supply_trigger_config 必须存在；
    
17. service_order_auto_config 必须存在；
    
18. execution_time_config 必须存在；
    
19. default_completion_config 必须存在；
    
20. enable_exception_probability 当前默认 false。
    

---

## 20. 初始化输出

初始化完成后，应输出：

```text
SimulationPolicy 初始化成功
simulation_policy_id = SIM-POLICY-001
policy_status = ACTIVE
```

同时输出校验结果：

```text
time_period_configs 校验通过
time_window_configs 校验通过
demand_profiles 校验通过
trigger_config 校验通过
default_completion_config 校验通过
```

说明：

```text
初始化完成后，不创建 SimulationRun。
用户需要在运行入口中创建 SimulationRun。
```

---

## 21. 当前不做内容

当前阶段不做：

```text
创建 SimulationRun
创建 SimulationEvent
创建 SimulationTick
创建 ServiceOrder
创建 Trip
创建 ReadinessCheckTask
创建 DeploymentTask
创建 RouteExecution
初始化 Metric
初始化异常概率模型
初始化需求预测模型
多套 SimulationPolicy 对比
运行中修改 SimulationPolicy
```

当前只做：

```text
创建默认 SimulationPolicy
配置时间段
配置时间窗口
配置 DemandProfile
配置供给侧触发开关
配置订单自动化开关
配置执行耗时
配置默认完成规则
配置随机种子
校验配置完整性
```

---

## 22. 规则

1. initialization-simulation 只初始化 SimulationPolicy；
    
2. 不初始化 SimulationRun；
    
3. 不初始化 SimulationEvent；
    
4. 不初始化任何任务单、订单、决策记录、执行记录；
    
5. SimulationPolicy 是基础配置对象，可以初始化；
    
6. SimulationRun 是运行对象，由用户创建；
    
7. SimulationEvent 是运行事件，由 SimulationLoop 记录；
    
8. 默认 SimulationPolicy 必须为 ACTIVE；
    
9. 默认时间段必须覆盖 24 小时；
    
10. 默认时间窗口必须覆盖 24 小时；
    
11. NIGHT 和 EVENING 必须配置需求规则；
    
12. DemandProfile 必须完整；
    
13. 初始化完成后必须输出校验结果；
    
14. 后续 SimulationRun 创建时引用该 SimulationPolicy；
    
15. SimulationRun 创建时再生成 simulation_policy_snapshot。 