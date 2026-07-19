# 需求与服务承载画像设计

## 1. 定位

`DemandProfile` 是经营规划层独立画像对象，通过 `target_object_type / target_object_id` 关联 Place、ServiceArea 或 Zone。空间对象保存物理事实，画像保存经营配置和计算结果。

```text
Place 产生需求
ServiceArea 表达服务承载
Zone 汇总需求与承载
```

SubZone 只表达空间组织关系，不生成画像。

## 2. 固定归属

- 一个 Place 可以拥有多个 ServiceArea；
- 一个 ServiceArea 通过 `parent_place_id` 固定归属一个 Place；
- ServiceArea 不产生、分配或折减需求；
- Zone 需求等于所属 Place 需求之和；
- Zone 容量等于所属 ServiceArea 容量之和。

## 3. 通用字段

|英文字段|中文字段|性质|
|---|---|---|
|`profile_id`|画像编号|系统|
|`profile_name`|画像名称|配置|
|`target_object_type`|目标对象类型|关联|
|`target_object_id`|目标对象编号|关联|
|`target_object_name`|目标对象名称|展示|
|`profile_version`|画像版本|系统|
|`profile_status`|画像状态|状态|
|`effective_from`|生效时间|配置|
|`effective_to`|失效时间|配置|
|`calculated_at`|计算时间|系统|
|`profile_field_explanations`|画像字段解释|展示|
|`profile_calculation_steps`|画像计算过程|展示|

人工和业务操作记录真实时间；只有模拟运行显式传入模拟时间上下文时才记录模拟时间。

## 4. Place 需求画像

### 4.1 配置字段

|英文字段|中文字段|
|---|---|
|`resident_population`|常住人口|
|`working_population`|工作人口|
|`daily_visitors`|日访客量|
|`resident_trip_weight`|居民出行权重|
|`worker_trip_weight`|工作人口出行权重|
|`visitor_trip_weight`|访客出行权重|
|`trip_generation_rate`|日出行产生率|
|`demand_weight`|地点需求强度系数|
|`robotaxi_adoption_rate`|Robotaxi 采用率|
|`service_acceptance_rate`|服务接受率|
|`competition_retention_rate`|竞争保留率|
|`place_period_growth_rate`|地点周期增长率|
|`growth_rate_unit`|增长率周期单位|
|`growth_rate_source`|增长率来源|
|`growth_rate_updated_at`|增长率更新时间|
|`busiest_hour_share`|最繁忙小时占比|

新初始化的地点画像统一使用 `robotaxi_adoption_rate = 0.6`、`service_acceptance_rate = 0.7`、`competition_retention_rate = 0.4`。运行态只迁移版本 1 且仍保持旧默认组合 `0.18 / 0.9 / 0.85` 的未配置画像；用户已修改或版本大于 1 的画像必须保留原值。

### 4.2 计算

```text
daily_population_exposure
= resident_population × resident_trip_weight
+ working_population × worker_trip_weight
+ daily_visitors × visitor_trip_weight

potential_daily_trips
= daily_population_exposure
× trip_generation_rate
× demand_weight

baseline_addressable_daily_orders
= potential_daily_trips
× robotaxi_adoption_rate
× service_acceptance_rate
× competition_retention_rate

baseline_peak_hour_orders
= baseline_addressable_daily_orders × busiest_hour_share
```

出行产生率和需求权重各参与一次。Place 不保存本次预测周期和增长因子。

## 5. ServiceArea 服务承载画像

### 5.1 配置字段

|英文字段|中文字段|
|---|---|
|`parent_place_id`|归属地点编号|
|`waiting_robotaxi_capacity`|等待 Robotaxi 容量|
|`pickup_position_capacity`|上车位容量|
|`dropoff_position_capacity`|下车位容量|
|`average_service_stop_duration_min`|平均站点停靠时长（分钟）|
|`operating_hours_per_day`|每日开放小时数|
|`accessibility_factor`|可达性系数|
|`capacity_availability_rate`|容量可用率|

### 5.2 计算

```text
position_throughput_per_hour = 60 / average_service_stop_duration_min

effective_pickup_capacity_per_hour
= pickup_position_capacity × position_throughput_per_hour
× accessibility_factor × capacity_availability_rate

effective_dropoff_capacity_per_hour
= dropoff_position_capacity × position_throughput_per_hour
× accessibility_factor
× capacity_availability_rate

effective_daily_pickup_capacity
= effective_pickup_capacity_per_hour × operating_hours_per_day

effective_daily_dropoff_capacity
= effective_dropoff_capacity_per_hour × operating_hours_per_day
```

ServiceArea 只表达一个地点附近的接驾、送达、等待与周转承载，不生成市场需求。上车位与下车位必须分别计算，不能在单个 ServiceArea 内提前取最小值；真正的端到端瓶颈在 Zone 汇总后判断。

## 6. Zone 规划画像

Zone 汇总字段禁止人工配置：

```text
baseline_addressable_daily_orders = Σ Place.baseline_addressable_daily_orders
baseline_peak_hour_orders = Σ Place.baseline_peak_hour_orders
effective_daily_pickup_capacity = Σ ServiceArea.effective_daily_pickup_capacity
effective_daily_dropoff_capacity = Σ ServiceArea.effective_daily_dropoff_capacity
effective_pickup_capacity_per_hour = Σ ServiceArea.effective_pickup_capacity_per_hour
effective_dropoff_capacity_per_hour = Σ ServiceArea.effective_dropoff_capacity_per_hour

effective_daily_capacity
= min(effective_daily_pickup_capacity, effective_daily_dropoff_capacity)

effective_peak_hour_capacity
= min(effective_pickup_capacity_per_hour, effective_dropoff_capacity_per_hour)

zone_period_growth_rate
= Σ(Place.baseline_addressable_daily_orders × Place.place_period_growth_rate)
  / Σ Place.baseline_addressable_daily_orders
```

## 7. 整体重算

保存任意画像配置后必须执行同一画像计算服务：

```text
全部 Place → 全部 ServiceArea → 全部 Zone
```

初始化、人工配置和未来外部导入复用同一计算服务。不得只更新当前记录后让 Zone 消费旧结果。

## 8. 校验与兼容

- 比例在配置界面以百分比输入和展示，领域对象统一保存为 `[0, 1]`；增长率大于 `-1`；
- 新初始化地点的出行产生率按地点类型设置：住宅区为 60%，其他地点为 90%；历史用户配置不被默认值覆盖；
- ServiceArea 必须存在唯一有效 `parent_place_id`；
- Zone 汇总必须满足需求守恒；上车与下车容量分别守恒，端到端容量等于两端汇总能力的较小值；
- 旧 `average_service_time_min`、`service_capacity_per_hour` 只在旧快照迁移时读取，新画像统一写入明确的停靠时长与上车、下车承载字段；
- 计算字段不得人工配置；
- `peak_pattern` 当前不参与预测计算，新画像不再保存或展示；高峰容量使用可计算的 `busiest_hour_share`；
- 旧 `expected_robotaxi_demand`、`service_area_demand`、`growth_factor`、`forecast_years`、`pickup_probability`、`dropoff_probability` 只在旧快照迁移时读取；
- 经营画像归属迁移不得删除仍被地图、订单或行驶业务使用的空间关系字段。
