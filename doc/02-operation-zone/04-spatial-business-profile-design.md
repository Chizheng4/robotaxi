# 空间经营画像方案

## 1. 目的

本文档定义运营区域层面的空间经营画像模型。

空间经营画像用于支持：

- 需求预测；
- 供给规划；
- 运营投放；
- 服务区域能力分析；
- 经营指标诊断。

物理空间对象只描述空间事实；经营画像对象描述空间的经营含义。

## 2. 与物理空间模型的边界

物理空间模型：

```text
Map / Cell / Road / RoadSegment / Place
```

描述：

- 坐标；
- 覆盖 Cell；
- 道路连通；
- 可通行性；
- 空间归属。

空间经营画像：

```text
PlaceDemandProfile
ServiceAreaDemandProfile
ZoneDemandProfile
```

描述：

- 潜在需求；
- 上车概率；
- 下车概率；
- 服务容量；
- 高峰模式；
- 增长因子；
- Robotaxi 采用率。

## 3. PlaceDemandProfile

### 3.1 定义

PlaceDemandProfile 用于描述 Place 的需求产生能力。

Place 本体仍只保存空间事实，画像对象通过 `place_id` 关联 Place。

### 3.2 建议字段

| 字段                     | 说明           |
| ---------------------- | ------------ |
| profile_id             | 画像编号         |
| place_id               | 关联地点         |
| resident_population    | 常住人口         |
| working_population     | 工作人口         |
| daily_visitors         | 日访客          |
| trip_generation_rate   | 出行产生率        |
| demand_weight          | 需求权重         |
| peak_pattern           | 需求高峰模式       |
| growth_rate            | 增长率          |
| robotaxi_adoption_rate | Robotaxi 采用率 |
| effective_from         | 生效时间         |
| effective_to           | 失效时间，可为空     |

## 4. ServiceAreaDemandProfile

### 4.1 定义

ServiceAreaDemandProfile 用于描述 ServiceArea 的需求承载能力和服务能力。

ServiceArea 本体仍保存服务区域空间事实，例如覆盖 Cell、关联道路和服务类型。

### 4.2 建议字段

|字段|说明|
|---|---|
|profile_id|画像编号|
|service_area_id|关联服务区域|
|pickup_probability|上车概率|
|dropoff_probability|下车概率|
|peak_demand_ratio|高峰需求比例|
|service_capacity|服务容量|
|waiting_capacity|等待容量|
|turnover_capacity|周转能力|
|effective_from|生效时间|
|effective_to|失效时间，可为空|

## 5. ZoneDemandProfile

### 5.1 定义

ZoneDemandProfile 是基于区域内空间画像、历史需求和预测规则计算形成的动态经营画像。

### 5.2 输入

```text
PlaceDemandProfile
  +
ServiceAreaDemandProfile
  +
历史服务数据
  +
区域修正因子
```

### 5.3 建议字段

|字段|说明|
|---|---|
|profile_id|画像编号|
|zone_id|关联运营区域|
|potential_demand|潜在需求|
|expected_robotaxi_demand|预计 Robotaxi 需求|
|peak_hour_demand|峰值需求|
|demand_distribution|需求分布|
|growth_factor|增长修正|
|supply_need_score|供给需求评分|
|effective_from|生效时间|
|effective_to|失效时间，可为空|

## 6. 画像计算关系

```text
PlaceDemandProfile
  ↓
ServiceAreaDemandProfile
  ↓
ZoneDemandProfile
  ↓
长期需求预测
  ↓
供应规划
  ↓
运营投放和供给再平衡
```

## 7. 设计原则

1. **画像对象独立**

   画像对象不写入 Place、ServiceArea、Zone 本体，避免物理空间事实和经营预测事实耦合。

2. **画像可版本化**

   同一地点或区域在不同时间可以有不同画像，支持预测、模拟和复盘。

3. **画像服务于经营，不替代业务事实**

   画像用于预测和规划；真实服务订单、履约行驶和经营指标仍以业务单据事实为准。

4. **先设计，后实现**

   当前文档是方案设计。进入代码升级前，必须补充字段字典、初始化数据、计算服务和模拟接入合同。

## 8. 对代码升级的影响

如进入代码实现，建议拆为独立阶段：

1. 增加画像对象字段字典；
2. 增加初始化画像数据；
3. 增加画像查询服务；
4. 长期需求预测读取画像服务；
5. 供给规划和运营投放消费预测结果，而不是直接读取画像字段；
6. 经营分析展示画像解释，但不把画像数据当成真实业务结果。
