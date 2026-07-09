# Long-term Demand Forecast Strategy（长期需求预测策略）设计

---

# 1. 对象定义

## 对象名称

Long-term Demand Forecast Strategy

中文：

长期需求预测策略

---

## 1.1 对象定位

Long-term Demand Forecast Strategy 用于定义企业在未来规划周期内，基于经营目标、需求画像和供应生产能力，对 Robotaxi 服务需求及车队规模需求进行预测的业务模型。

该对象负责：

- 定义预测周期；
- 定义输入数据；
- 定义计算模型；
- 定义需求转换规则；
- 定义供给需求计算方法。

---

## 1.2 核心目标

通过长期需求预测，回答：

> 在未来规划周期内，目标运营区域需要多少 Robotaxi，以及企业需要提前形成多少生产供给能力。

输出：

```
Business Target

↓

Demand Forecast Result

↓

Fleet Production Plan
```

---

# 2. 所属模块

```
00-business-planning

    01-business-target

    02-demand-profile

    03-supply-production-profile

    04-long-term-demand-forecast
```

---

# 3. 业务闭环

```
Business Target

经营目标

↓

Demand Profile

需求画像

↓

Long-term Demand Forecast Strategy

长期需求预测策略

↓

Long-term Demand Forecast Run

预测运行

↓

Long-term Demand Forecast Result

预测结果

↓

Fleet Production Plan

车队生产需求计划
```

---

# 4. 核心输入

Long-term Demand Forecast Strategy 依赖以下输入：

---

# 4.1 Business Target

经营目标

提供：

|字段|说明|
|---|---|
|forecast_horizon_years|预测周期|
|target_zone_ids|目标运营区域|
|target_service_level|目标服务水平|

---

# 4.2 Demand Profile

需求画像

提供：

## 人口因素

|字段|说明|
|---|---|
|resident_population|常住人口|
|working_population|工作人口|
|daily_visitors|日访客量|

---

## 出行因素

|字段|说明|
|---|---|
|trip_generation_rate|出行产生率|
|peak_pattern|高峰模式|

---

## Robotaxi转化因素

|字段|说明|
|---|---|
|robotaxi_adoption_rate|Robotaxi采用率|
|service_acceptance_rate|服务接受率|

---

## 增长因素

|字段|说明|
|---|---|
|growth_rate|需求增长率|

---

# 4.3 Historical Demand Data

历史需求数据

来源：

- ServiceOrder
- Trip

字段：

|字段|说明|
|---|---|
|historical_daily_orders|历史日订单量|
|historical_peak_hour_orders|历史峰值小时订单量|
|historical_demand_distribution|历史需求分布|

---

# 4.4 Supply Production Profile

供应生产画像

提供：

|字段|说明|
|---|---|
|production_lead_time_days|生产提前期|
|effective_production_capacity|有效生产能力|
|delivery_capacity|交付能力|
|inspection_lead_time_days|验证周期|

---

# 5. Strategy 对象设计

## 5.1 基础字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|strategy_id|策略编号|系统字段|唯一编号|
|strategy_name|策略名称|配置字段|策略名称|
|strategy_type|策略类型|配置字段|预测模型类型|
|status|状态|系统字段|策略状态|
|version|版本|系统字段|模型版本|

---

初始化：

```
{
  "strategy_id":"LDF-001",
  "strategy_name":"Robotaxi长期需求预测策略",
  "strategy_type":"LONG_TERM_FORECAST",
  "status":"ACTIVE",
  "version":"V1"
}
```

---

# 6. Forecast Horizon（预测周期模型）

预测周期不是固定值。

由：

```
Business Planning Horizon

+

Production Lead Time

↓

Forecast Horizon
```

确定。

---

## 计算规则

公式：

```
Forecast Horizon

=

MAX(
Business Target Period,

Production Lead Time
)
```

中文：

预测周期 =

经营目标周期与生产提前期中的最大值。

---

示例：

经营目标：

3年。

生产提前：

180天。

结果：

预测周期：

3年。

---

# 7. 需求预测计算模型

---

# 7.1 Baseline Demand Calculation

基础需求计算

目标：

确定当前稳定需求水平。

---

输入：

Demand Profile

---

计算字段：

|字段|中文|
|---|---|
|baseline_daily_demand|基础日需求|

---

公式：

```
Baseline Daily Demand

=

Current Expected Robotaxi Demand
```

---

其中：

```
Potential Demand

=

(
Resident Population

+

Working Population

+

Visitor Population
)

×

Trip Generation Rate

×

Demand Weight
```

---

```
Expected Robotaxi Demand

=

Potential Demand

×

Robotaxi Adoption Rate

×

Service Acceptance Rate
```

---

# 7.2 Growth Forecast Calculation

增长预测计算

---

输入：

- growth_rate
- forecast_horizon_years

---

计算字段：

## growth_factor

增长修正因子

公式：

```
Growth Factor

=

(1 + Growth Rate)^Forecast Years
```

---

---

## forecast_daily_demand

预测日需求

公式：

```
Forecast Daily Demand

=

Baseline Daily Demand

×

Growth Factor
```

---

# 7.3 Peak Demand Calculation

峰值需求计算

---

字段：

## forecast_peak_hour_demand

预测峰值小时需求

公式：

```
Forecast Peak Hour Demand

=

Forecast Daily Demand

×

Peak Demand Ratio
```

---

# 8. Fleet Requirement Calculation

车辆需求计算

---

## 8.1 Vehicle Productivity

单车生产能力

输入：

|字段|说明|
|---|---|
|vehicle_available_hours|单车每日运营时间|
|average_trip_duration|平均服务时长|

---

公式：

```
Vehicle Productivity

=

Vehicle Available Hours × 60

÷

Average Trip Duration
```

---

# 8.2 Required Fleet Quantity

所需Robotaxi数量

公式：

```
Required Fleet Quantity

=

Forecast Peak Hour Demand

×

Average Trip Duration

÷

60
```

---

# 8.3 Fleet Gap Quantity

车辆缺口

公式：

```
Fleet Gap Quantity

=

Required Fleet Quantity

-

Current Operating Fleet
```

---

# 9. Production Constraint Calculation

生产约束计算

---

## 9.1 Supply Completion Date

预计供给完成时间

公式：

```
Supply Completion Date

=

Production Start Date

+

Production Lead Time
```

---

## 9.2 Feasible Production Quantity

可生产数量

公式：

```
Feasible Production Quantity

=

Effective Production Capacity

×

Production Period
```

---

## 9.3 Production Gap

生产缺口

公式：

```
Production Gap

=

Required Fleet Quantity

-

Feasible Production Quantity
```

---

# 10. Long-term Demand Forecast Run

## 10.1 定义

Long-term Demand Forecast Run 表示一次具体预测策略运行实例。

记录：

- 使用哪个策略；
- 使用哪些输入数据；
- 运行时间；
- 计算结果。

---

# 10.2 Run 字段

|字段英文|中文|类型|
|---|---|---|
|run_id|运行编号|系统|
|strategy_id|策略编号|系统|
|business_target_id|经营目标编号|系统|
|profile_version|画像版本|系统|
|forecast_start_date|预测开始日期|配置|
|forecast_end_date|预测结束日期|配置|
|status|运行状态|系统|
|started_at|开始时间|系统|
|completed_at|完成时间|系统|

---

# 10.3 Run状态

```
Created

↓

Running

↓

Completed

↓

Failed
```

---

# 11. Long-term Demand Forecast Result

## 11.1 定义

Long-term Demand Forecast Result 是预测策略运行后的最终业务结果。

用于生成：

Fleet Production Plan。

---

# 11.2 Result字段

## 需求结果

|字段英文|中文|
|---|---|
|forecast_period|预测周期|
|forecast_daily_demand|预测日需求|
|forecast_peak_hour_demand|预测峰值需求|
|growth_factor|增长因子|

---

## 车辆需求结果

|字段英文|中文|
|---|---|
|required_fleet_quantity|所需车辆数量|
|current_fleet_quantity|当前车辆数量|
|fleet_gap_quantity|车辆缺口|

---

## 生产约束结果

|字段英文|中文|
|---|---|
|production_lead_time_days|生产提前期|
|production_start_date|生产开始时间|
|supply_completion_date|供给完成时间|
|production_gap_quantity|生产缺口|

---

# 12. 输出 Fleet Production Plan

关系：

```
Long-term Demand Forecast Result

↓

Fleet Production Plan
```

---

Fleet Production Plan 使用：

输入：

```
fleet_gap_quantity

+

production_lead_time_days

+

effective_production_capacity
```

---

生成：

```
生产周期

↓

生产数量

↓

交付时间

↓

Robotaxi形成
```

---

# 13. 生命周期

## Strategy 生命周期

```
Draft

↓

Active

↓

Updated

↓

Archived
```

---

## Run 生命周期

```
Created

↓

Running

↓

Completed

↓

Failed
```

---

## Result 生命周期

```
Generated

↓

Confirmed

↓

Used

↓

Archived
```

---

# 14. Codex 实现约束

1. Long-term Demand Forecast Strategy 属于：

```
00-business-planning
```

2. Strategy 不保存预测结果。
3. Run 保存一次预测执行过程。
4. Result 保存预测结果。
5. Demand Profile 只提供输入参数。
6. Supply Production Profile 只提供生产能力约束。
7. Forecast Result 是 Fleet Production Plan 的创建来源；Business Target 与 Supply Production Profile 作为关联输入和约束来源。
8. 不直接由 Forecast Result 创建 Robotaxi。
9. Robotaxi 必须由 Fleet Production Plan 后续流程形成。

---

# 15. 核心原则

```
Business Target

定义未来目标


Demand Profile

描述未来需求基础


Supply Production Profile

描述供给形成能力


Long-term Demand Forecast Strategy

计算未来需要什么


Fleet Production Plan

决定如何形成供给
```
