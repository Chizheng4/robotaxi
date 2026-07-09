# 一、整体计算链路

```
Place Demand Profile（地点需求画像）

基础输入：
人口
活动
出行行为
Robotaxi接受能力

        ↓

计算

        ↓

Place Potential Demand
Place Expected Robotaxi Demand
Place Peak Demand


        ↓


ServiceArea Demand Profile（服务区域画像）

服务转换能力：
上车概率
下车概率
容量
可达性


        ↓


Zone Demand Profile（运营区域画像）

聚合：

Place需求

+

ServiceArea服务能力

+

Zone调整因素


        ↓


Long-term Demand Forecast Strategy

        ↓

Fleet Supply Plan
```

---

# 二、Place Demand Profile 字段计算逻辑

## 1. resident_population（常住人口）

类型：

配置字段

来源：

- 城市人口数据
- 模拟初始化
- 人工配置

不计算。

---

## 2. working_population（工作人口）

类型：

配置字段

来源：

- 办公区域人口
- 企业数量
- 就业数据

不计算。

---

## 3. daily_visitors（日访客量）

类型：

配置字段

来源：

- 商业规模
- 交通枢纽客流
- 历史数据

不计算。

---

# 三、基础潜在出行需求计算

## potential_demand（潜在需求）

类型：

计算字段

定义：

> 某个地点在一天内可能产生的全部出行需求。

公式：

```
Potential Demand

=

(
Resident Population

+

Working Population

+

Daily Visitors
)

×

Trip Generation Rate

×

Demand Weight
```

中文：

潜在需求

=

（常住人口 + 工作人口 + 日访客）

× 出行产生率

× 需求权重

---

示例：

住宅区：

```
resident_population = 50000

working_population = 0

daily_visitors = 5000

trip_generation_rate = 2

demand_weight = 0.8
```

计算：

```
(50000+0+5000)

×

2

×

0.8


=

88000
```

结果：

```
potential_demand = 88000
```

---

# 四、Robotaxi需求转换

## expected_robotaxi_demand

预计Robotaxi需求

定义：

> 潜在出行需求中，最终选择Robotaxi服务的需求量。

公式：

```
Expected Robotaxi Demand

=

Potential Demand

×

Robotaxi Adoption Rate

×

Service Acceptance Rate
```

中文：

预计Robotaxi需求

=

潜在需求

×

Robotaxi采用率

×

服务接受率

---

示例：

```
potential_demand = 88000

robotaxi_adoption_rate = 0.05

service_acceptance_rate = 0.8
```

计算：

```
88000 × 0.05 × 0.8

=

3520
```

---

# 五、高峰需求计算

## peak_hour_demand

峰值小时需求

定义：

> 在高峰时间窗口内预计产生的Robotaxi需求。

输入：

- expected_robotaxi_demand
- peak_pattern

公式：

```
Peak Hour Demand

=

Expected Robotaxi Demand

×

Peak Demand Ratio
```

---

注意：

当前字段：

`peak_demand_ratio`

虽然现在放在ServiceArea画像中，但本质属于需求时间分布参数。

建议：

后续迁移到通用Demand Profile。

---

示例：

```
3520 × 0.15

=

528
```

---

# 六、增长计算

## growth_factor

增长修正因子

来源：

growth_rate

定义：

> 将当前需求水平调整到未来预测周期。

公式：

```
Growth Factor

=

(1 + Growth Rate) ^ Forecast Years
```

例如：

年度增长率：

5%

预测3年：

```
(1+0.05)^3

=

1.157
```

---

# 七、ServiceArea画像计算逻辑

ServiceArea不产生需求。

它负责：

> 将Place产生的需求转换为实际服务能力。

---

# 1. pickup_probability

上车概率

配置：

例如：

住宅附近：

0.7

含义：

该服务区承担该地点出发需求的比例。

---

# 2. dropoff_probability

下车概率

配置：

例如：

办公区：

0.8

---

# 3. accessibility_factor

可达性系数

定义：

道路、位置、停车便利程度修正。

范围：

```
0~1
```

例如：

```
0.9
```

---

# 4. Service Demand Conversion

服务区域承载需求：

公式：

```
Service Area Demand

=

Place Expected Robotaxi Demand

×

Pickup Probability

×

Accessibility Factor
```

---

例如：

```
3520

×

0.7

×

0.9

=

2217
```

---

# 八、Zone Demand Profile计算逻辑

Zone是核心。

因为：

长期需求预测输入的是Zone。

---

## 1. Zone基础聚合

## zone_expected_robotaxi_demand

公式：

```
Zone Expected Robotaxi Demand

=

Σ(Service Area Demand)
```

---

即：

所有服务区域需求求和。

---

# 2. Zone调整因素

## zone_adjustment_factor

区域经营修正。

例如：

城市战略区域：

1.2

---

## coverage_factor

服务覆盖修正。

例如：

当前只覆盖70%区域：

0.7

---

## competition_factor

竞争影响。

例如：

竞争强：

0.8

---

# 3. 最终Zone需求

## expected_robotaxi_demand

公式：

```
Zone Expected Robotaxi Demand

=

Σ(Service Area Demand)

×

Zone Adjustment Factor

×

Coverage Factor

×

Competition Factor
```

---

# 九、Zone峰值需求

## peak_hour_demand

公式：

```
Zone Peak Hour Demand

=

Zone Expected Robotaxi Demand

×

Peak Demand Ratio
```

---

# 十、供给需求评分

## supply_need_score

定义：

用于供给规划判断。

不是需求量。

是：

需求紧迫程度评分。

公式：

```
Supply Need Score

=

Demand Growth Factor

×

Peak Demand Factor

×

Coverage Gap Factor
```

---

例如：

范围：

0-100

---

# 十一、需求分布 demand_distribution

定义：

区域需求来源结构。

不是计算一个数字。

而是：

聚合摘要。

例如：

```
{
"RESIDENTIAL":0.4,
"OFFICE":0.35,
"COMMERCIAL":0.25
}
```

计算：

```
每类Place Expected Demand

/

Zone Total Demand
```

---

# 十二、字段归属重新整理

## 配置字段（Input）

来自人工/外部数据：

```
resident_population

working_population

daily_visitors

trip_generation_rate

demand_weight

peak_pattern

growth_rate

robotaxi_adoption_rate

service_acceptance_rate

pickup_probability

dropoff_probability

service_capacity

waiting_capacity

turnover_capacity

accessibility_factor

zone_adjustment_factor

coverage_factor

competition_factor
```

---

## 计算字段（Calculated）

系统计算：

```
potential_demand

expected_robotaxi_demand

peak_hour_demand

demand_distribution

growth_factor

supply_need_score

calculated_at
```

---

## 继承/聚合字段

Zone：

```
calculated_from_profile_ids
```

来源：

Place Profile + ServiceArea Profile。

---

# 十三、最终Zone进入长期预测的数据

Long-term Demand Forecast Strategy 输入：

```
Zone Demand Profile

{

expected_robotaxi_demand,

peak_hour_demand,

demand_distribution,

growth_factor,

supply_need_score

}
```

然后：

转换：

```
Demand Forecast Result

↓

Required Robotaxi Fleet

↓

Fleet Supply Plan
```