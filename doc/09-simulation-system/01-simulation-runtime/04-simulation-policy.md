# Simulation-policy：模拟规则配置

## 1. 目的

本文档定义自动运营模拟系统中的 SimulationPolicy。

SimulationPolicy 用于配置一次 SimulationRun 的运行规则，使自动运营模拟系统能够按照统一参数推进时间、触发事件、生成需求、推进任务和记录结果。

本文档只定义模拟规则配置。

不定义：

```text
SimulationRun 运行状态
SimulationClock 时间计算
SimulationEvent 事件记录
SupplyTrigger 供给侧触发逻辑
DemandTrigger 需求侧触发逻辑
业务对象内部执行逻辑
```

---

## 2. 核心定义

SimulationPolicy 是自动运营模拟系统的规则配置对象。

```text
SimulationPolicy = 一次自动运营模拟运行所使用的规则参数集合
```

它回答的问题是：

```text
这次模拟运行几天？
每个 Tick 多长？
Worker 什么时间工作？
Robotaxi 什么时间可运营？
一天如何划分时间段？
哪些时间属于高峰期？
每个时间窗口的订单数量如何生成？
Robotaxi 按什么速度行驶？
任务和履约阶段默认消耗多少 Tick？
当前是否启用异常概率？
当前是否默认正常完成？
```

SimulationPolicy 是配置模板，不是执行器。

---

## 3. 核心边界

SimulationPolicy 负责：

```text
提供模拟运行参数
提供时间窗口配置
提供订单数量分布配置
提供任务耗时配置
提供默认行为配置
提供随机种子配置
```

SimulationPolicy 不负责：

```text
推进 Tick
触发事件
创建 ServiceOrder
创建 ReadinessCheckTask
创建 DeploymentTask
创建 Trip
执行 PricingDecision
执行 OrderMatchingDecision
推进 RouteExecution
推进 Trip
判断 Worker 是否空闲
判断 Robotaxi 是否可用
```

边界原则：

```text
SimulationPolicy = 配置
SimulationRun = 使用配置运行
SimulationClock = 根据配置计算时间场景
DemandTrigger = 根据配置生成订单数量
SupplyTrigger = 根据配置判断是否触发供给侧事件
业务服务 = 根据自身逻辑执行
```

---

## 4. 与 SimulationRun 的关系

SimulationRun 必须引用一个 SimulationPolicy。

```text
SimulationPolicy
↓
SimulationRun
```

创建 SimulationRun 时，应读取 SimulationPolicy，并保存一份运行快照：

```text
simulation_policy_snapshot
```

原因：

```text
SimulationPolicy 后续可能被修改
但已经创建的 SimulationRun 必须保持可复现
```

因此，SimulationRun 实际运行时应优先使用：

```text
simulation_policy_snapshot
```

而不是直接读取最新的 SimulationPolicy。

---

## 5. 核心属性

|字段|含义|
|---|---|
|simulation_policy_id|模拟规则配置唯一编号|
|policy_name|配置名称|
|policy_status|配置状态|
|tick_minutes|每个 Tick 对应模拟分钟数|
|simulation_days|默认模拟天数|
|run_speed_level|模拟运行速度等级|
|random_seed|随机种子，可为空|
|time_period_configs|时间段配置|
|time_window_configs|时间窗口配置|
|demand_generation_config|需求生成配置|
|supply_trigger_config|供给侧触发配置|
|execution_time_config|执行耗时配置|
|default_completion_config|默认完成配置|
|exception_config|异常概率配置|
|created_at|创建时间|
|updated_at|更新时间|

---

## 6. policy_status

|policy_status|含义|
|---|---|
|DRAFT|草稿|
|ACTIVE|可使用|
|DISABLED|停用|
|ARCHIVED|归档|

规则：

```text
只有 ACTIVE 状态的 SimulationPolicy 可以被新的 SimulationRun 使用。
```

---

## 7. 时间推进配置

### 7.1 Tick 配置

当前阶段默认：

```text
tick_minutes = 10
```

含义：

```text
1 Tick = 10 分钟模拟时间
```

一天 Tick 数：

```text
ticks_per_day = 24 × 60 ÷ tick_minutes
```

如果：

```text
tick_minutes = 10
```

则：

```text
ticks_per_day = 144
```

---

### 7.2 模拟天数

当前阶段支持配置：

```text
simulation_days
```

建议默认：

```text
simulation_days = 1
```

跑通后扩展为：

```text
simulation_days = 10
```

---

### 7.3 运行速度

run_speed_level 表示真实时间与模拟 Tick 的推进关系。

|run_speed_level|含义|
|---|---|
|SLOW|慢速模拟|
|NORMAL|标准模拟|
|FAST|快速模拟|
|ULTRA_FAST|超高速模拟|

示例：

```text
FAST = 真实世界 1 秒推进 1 Tick
```

说明：

```text
run_speed_level 只影响运行展示速度。
不改变模拟时间含义。
```

---

## 8. 时间段配置

每天按 24 小时模拟。

```text
00:00 - 24:00
```

time_period_configs 定义一天中的主要时间段。

|time_period|时间范围|含义|
|---|---|---|
|NIGHT|00:00 - 06:00|夜间|
|MORNING|06:00 - 12:00|上午|
|NOON|12:00 - 14:00|中午|
|AFTERNOON|14:00 - 18:00|下午|
|EVENING|18:00 - 24:00|晚上|

示例配置：

```json
{
  "time_period_configs": [
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
}
```

---

## 9. 时间窗口配置

time_window_configs 用于定义更细的高峰和平常期。

每个时间窗口必须指定：

```text
time_period
start_time
end_time
period_type
demand_profile_id
```

### 9.1 period_type

|period_type|含义|
|---|---|
|PEAK|高峰期|
|NORMAL|平常期|
|LOW|低需求期|

说明：

```text
period_type 主要用于需求侧订单数量分布选择。
```

---

### 9.2 当前阶段时间窗口

|time_window|时间范围|time_period|period_type|demand_profile_id|
|---|---|---|---|---|
|NIGHT_LOW|00:00 - 06:00|NIGHT|LOW|DP-NIGHT-LOW|
|MORNING_NORMAL_1|06:00 - 08:00|MORNING|NORMAL|DP-MORNING-NORMAL|
|MORNING_PEAK|08:00 - 10:00|MORNING|PEAK|DP-MORNING-PEAK|
|MORNING_NORMAL_2|10:00 - 12:00|MORNING|NORMAL|DP-MORNING-NORMAL|
|NOON_PEAK|12:00 - 13:00|NOON|PEAK|DP-NOON-PEAK|
|NOON_NORMAL|13:00 - 14:00|NOON|NORMAL|DP-NOON-NORMAL|
|AFTERNOON_NORMAL|14:00 - 17:00|AFTERNOON|NORMAL|DP-AFTERNOON-NORMAL|
|AFTERNOON_PEAK|17:00 - 18:00|AFTERNOON|PEAK|DP-AFTERNOON-PEAK|
|EVENING_PEAK|18:00 - 20:00|EVENING|PEAK|DP-EVENING-PEAK|
|EVENING_NORMAL|20:00 - 24:00|EVENING|NORMAL|DP-EVENING-NORMAL|

说明：

```text
晚上时间段必须单独配置。
EVENING_PEAK 和 EVENING_NORMAL 都属于需求生成的重要配置。
不能只配置白天和高峰。
```

---

## 10. Worker 工作时间配置

当前阶段 Worker 工作时间为：

```text
08:00 - 20:00
```

配置字段：

|字段|含义|
|---|---|
|worker_work_start_time|Worker 工作开始时间|
|worker_work_end_time|Worker 工作结束时间|

示例：

```json
{
  "worker_work_start_time": "08:00",
  "worker_work_end_time": "20:00"
}
```

说明：

```text
SimulationPolicy 只配置 Worker 工作时间。
SimulationClock 负责识别当前是否属于 Worker 工作时间。
SupplyTrigger 可读取该时间上下文触发供给侧事件。
Worker 是否空闲由供给侧业务逻辑判断。
```

---

## 11. Robotaxi 运营时间配置

当前阶段 Robotaxi 默认全天可运营：

```text
00:00 - 24:00
```

配置字段：

|字段|含义|
|---|---|
|robotaxi_operating_start_time|Robotaxi 运营开始时间|
|robotaxi_operating_end_time|Robotaxi 运营结束时间|

示例：

```json
{
  "robotaxi_operating_start_time": "00:00",
  "robotaxi_operating_end_time": "24:00"
}
```

说明：

```text
SimulationPolicy 只配置 Robotaxi 运营时间。
Robotaxi 是否可接单、是否可投放、是否可行驶，由对应业务逻辑判断。
```

---

## 12. 需求生成配置

### 12.1 demand_generation_config

需求生成配置用于 DemandTrigger 生成每个 Tick 的订单数量。

核心字段：

|字段|含义|
|---|---|
|demand_generation_enabled|是否启用需求生成|
|demand_generation_mode|需求生成模式|
|demand_profiles|需求配置列表|
|default_demand_profile_id|默认需求配置|
|max_orders_per_tick_global|单 Tick 全局最大订单数|
|random_seed|随机种子，可为空|

---

### 12.2 demand_generation_mode

|demand_generation_mode|含义|
|---|---|
|TICK_ORDER_COUNT_DISTRIBUTION|Tick 级订单数量分布|
|FIXED_ORDER_COUNT|固定订单数量|
|DISABLED|不生成订单|

当前阶段使用：

```text
TICK_ORDER_COUNT_DISTRIBUTION
```

---

## 13. 需求配置 Profile

DemandProfile 用于定义不同时间窗口的订单数量分布。

```text
DemandProfile = 某类时间窗口下的订单数量生成规则
```

每个 DemandProfile 至少包含：

|字段|含义|
|---|---|
|demand_profile_id|需求配置编号|
|profile_name|配置名称|
|distribution_type|分布类型|
|lambda|泊松分布平均值|
|max_orders_per_tick|单 Tick 最大订单数|
|min_orders_per_tick|单 Tick 最小订单数|

---

## 14. 分布类型

当前阶段建议支持：

|distribution_type|含义|
|---|---|
|POISSON|泊松分布|
|FIXED|固定数量|
|UNIFORM|均匀分布|

当前阶段默认：

```text
POISSON
```

说明：

```text
泊松分布适合模拟一定时间窗口内随机到达的订单数量。
```

---

## 15. 当前阶段需求配置

建议当前阶段配置如下：

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
晚上高峰期和晚上平常期必须配置。
否则 18:00 - 24:00 的需求生成规则会缺失。
```

---

## 16. DemandProfile 示例配置

```json
{
  "demand_profiles": [
    {
      "demand_profile_id": "DP-NIGHT-LOW",
      "profile_name": "夜间低需求",
      "distribution_type": "POISSON",
      "lambda": 0.3,
      "min_orders_per_tick": 0,
      "max_orders_per_tick": 2
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
}
```

---

## 17. 订单数量生成规则

DemandTrigger 根据当前 Tick 的 time_window 找到 demand_profile_id。

```text
SimulationClock
↓
current_time_window
↓
demand_profile_id
↓
DemandProfile
↓
order_count_distribution
↓
order_count
```

规则：

```text
random_order_count = 按 distribution_type 生成
actual_order_count = min(max(random_order_count, min_orders_per_tick), max_orders_per_tick)
```

如果：

```text
actual_order_count = 0
```

则：

```text
不调用 DemandSimulationStrategy
记录 DEMAND_NO_ORDER_GENERATED
```

如果：

```text
actual_order_count > 0
```

则：

```text
循环 actual_order_count 次调用 DemandSimulationStrategy
```

---

## 18. 随机种子配置

SimulationPolicy 应支持 random_seed。

用途：

```text
复现同一次模拟条件下的随机结果
```

规则：

```text
创建 SimulationRun 时
↓
读取 random_seed
↓
写入 simulation_policy_snapshot
```

如果 random_seed 存在：

```text
同一配置下可复现订单数量序列
```

如果 random_seed 为空：

```text
每次 SimulationRun 产生不同随机序列
```

---

## 19. 供给侧触发配置

SupplyTrigger 当前阶段只需要基础开关和时间约束配置。

|字段|含义|
|---|---|
|supply_trigger_enabled|是否启用供给侧触发|
|readiness_trigger_enabled|是否触发运营准入事件|
|deployment_trigger_enabled|是否触发运营投放事件|
|route_execution_trigger_enabled|是否触发 RouteExecution 推进事件|

示例：

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
SimulationPolicy 只配置是否触发。
是否创建任务、是否分配资源，由供给侧业务逻辑判断。
```

---

## 20. 订单自动化配置

ServiceOrder 创建后，后续自动推进可以由 SimulationPolicy 控制开关。

|字段|含义|
|---|---|
|auto_pricing_enabled|是否自动触发定价|
|auto_customer_confirm_enabled|是否自动客户确认|
|auto_order_matching_enabled|是否自动订单匹配|
|auto_trip_creation_enabled|是否自动创建 Trip|
|auto_trip_progress_enabled|是否自动推进 Trip|
|auto_payment_enabled|是否自动支付|

当前阶段建议：

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
这些配置只决定是否自动触发对应业务能力。
不重新定义业务能力本身。
```

---

## 21. 执行耗时配置

execution_time_config 用于配置当前阶段的默认耗时。

|字段|含义|默认|
|---|---|--:|
|worker_readiness_check_ticks|准入检查消耗 Tick|2|
|passenger_boarding_ticks|乘客上车消耗 Tick|1|
|dropoff_and_payment_ticks|下车与支付消耗 Tick|1|

说明：

```text
Robotaxi 行驶耗时不建议固定配置。
应由 Route.total_distance_km 和 robotaxi_speed_kmh 计算。
```

---

## 22. Robotaxi 行驶速度配置

当前阶段采用匀速模型。

字段：

```text
robotaxi_speed_kmh
```

建议默认：

```text
robotaxi_speed_kmh = 30
```

行驶时间计算：

```text
travel_time_hours = Route.total_distance_km / robotaxi_speed_kmh
travel_time_minutes = travel_time_hours × 60
required_ticks = ceil(travel_time_minutes / tick_minutes)
```

说明：

```text
速度配置属于 SimulationPolicy。
行驶执行仍由 RouteExecution 或 Trip 自身逻辑推进。
```

---

## 23. 默认完成配置

当前阶段默认事件正常完成。

default_completion_config：

|字段|含义|
|---|---|
|default_readiness_passed|准入默认通过|
|default_deployment_arrival_normal|投放默认正常到达|
|default_pickup_arrival_normal|接驾默认正常到达|
|default_passenger_boarded|乘客默认上车|
|default_service_arrival_normal|载客默认正常到达|
|default_payment_success|支付默认成功|

建议默认：

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

---

## 24. 异常概率配置

当前阶段不启用异常概率。

字段：

```text
enable_exception_probability
```

默认：

```text
enable_exception_probability = false
```

未来可扩展：

|异常|含义|
|---|---|
|readiness_failed_probability|准入失败概率|
|deployment_failed_probability|投放失败概率|
|pickup_failed_probability|接驾失败概率|
|passenger_no_show_probability|乘客未上车概率|
|trip_failed_probability|行程失败概率|
|payment_failed_probability|支付失败概率|

当前阶段只保留扩展入口，不启用。

---

## 25. 示例完整配置

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
  "time_period_configs": [
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
  ],
  "time_window_configs": [
    {
      "time_window": "NIGHT_LOW",
      "start_time": "00:00",
      "end_time": "06:00",
      "time_period": "NIGHT",
      "period_type": "LOW",
      "demand_profile_id": "DP-NIGHT-LOW"
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
  ],
  "demand_generation_config": {
    "demand_generation_enabled": true,
    "demand_generation_mode": "TICK_ORDER_COUNT_DISTRIBUTION",
    "max_orders_per_tick_global": 10
  },
  "demand_profiles": [
    {
      "demand_profile_id": "DP-NIGHT-LOW",
      "profile_name": "夜间低需求",
      "distribution_type": "POISSON",
      "lambda": 0.3,
      "min_orders_per_tick": 0,
      "max_orders_per_tick": 2
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
  ],
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
示例配置只展示重点字段。
实际实现时应补全所有 time_window_configs 和 demand_profiles。
```

---

## 26. 当前不做内容

当前阶段不做：

```text
动态修改运行中 SimulationPolicy
多 Policy 自动对比
自动参数优化
基于 Metric 的策略调参
真实需求预测
复杂客户行为模型
复杂异常概率
动态调度优化参数
```

当前只做：

```text
配置 Tick
配置模拟天数
配置时间段
配置需求订单数量分布
配置夜间 / 上午 / 中午 / 下午 / 晚上需求
配置供给侧触发开关
配置订单自动化开关
配置默认正常完成规则
配置随机种子
```

---

## 27. 规则

1. SimulationPolicy 是模拟规则配置对象；
    
2. SimulationPolicy 不执行模拟；
    
3. SimulationPolicy 不创建业务对象；
    
4. SimulationPolicy 不判断业务资源状态；
    
5. SimulationRun 必须引用 SimulationPolicy；
    
6. SimulationRun 创建时应保存 simulation_policy_snapshot；
    
7. DemandTrigger 通过 SimulationPolicy 获取订单数量分布；
    
8. SupplyTrigger 通过 SimulationPolicy 获取供给侧触发开关；
    
9. SimulationClock 通过 SimulationPolicy 获取时间段和时间窗口配置；
    
10. 所有时间段必须覆盖 00:00 - 24:00；
    
11. NIGHT 必须有需求配置；
    
12. EVENING 必须有需求配置；
    
13. 每个 time_window 必须关联 demand_profile_id；
    
14. 每个 demand_profile 必须定义 distribution_type；
    
15. 每个 demand_profile 必须定义 max_orders_per_tick；
    
16. random_seed 应写入 simulation_policy_snapshot；
    
17. 当前阶段默认不启用异常概率；
    
18. 当前阶段默认所有已触发业务正常完成；
    
19. Robotaxi 行驶耗时由 Route 距离和 robotaxi_speed_kmh 计算；
    
20. SimulationPolicy 只影响模拟触发和参数，不改变业务对象定义。