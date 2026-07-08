# 空间经营画像方案

## 1. 目的

本文档定义统一的 DemandProfile 需求画像对象。

DemandProfile 用于描述地图空间中某个需求相关对象的需求产生能力、需求变化特征和 Robotaxi 服务转化能力，支持：

- 需求预测；
- 供应计划；
- 运营投放；
- 服务区域能力分析；
- 经营指标诊断。

物理空间对象只描述空间事实；DemandProfile 描述空间对象的经营画像。二者必须分离。

## 2. 对象定位

DemandProfile 是独立业务对象，不属于 Place、ServiceArea 或 Zone 的内嵌字段。

它通过 `target_object_type` 和 `target_object_id` 关联不同空间对象。

```text
Map / Place / ServiceArea / Zone
  ↓
DemandProfile
  ↓
Demand Forecast Strategy
  ↓
Demand Forecast Result
  ↓
Supply Plan / Deployment Decision
```

目标设计废弃 `profile_type`。如当前实现中仍存在 `profile_type`，仅作为历史展示兼容字段，后续代码升级应迁移为 `target_object_type`。

## 3. 与物理空间模型的边界

物理空间模型：

```text
Map / Cell / Road / RoadNode / RoadSegment / Place / ServiceArea / Zone
```

描述：

- 坐标；
- 覆盖 Cell；
- 道路连通；
- 可通行性；
- 空间归属；
- 服务区物理承载边界。

DemandProfile 描述：

- 潜在需求；
- 上车概率；
- 下车概率；
- 服务容量；
- 高峰模式；
- 增长因子；
- Robotaxi 采用率；
- 供给需求评分。

禁止把人口、需求率、增长、采用率、预测结果写入物理空间对象。

## 4. 目标对象类型

|target_object_type|中文|说明|
|---|---|---|
|PLACE|地点需求画像|描述 Place 的需求产生能力|
|SERVICE_AREA|服务区域需求画像|描述 ServiceArea 的服务承载和上下车能力|
|ZONE|区域需求画像|描述 Zone 的整体经营需求，部分字段由系统计算|

## 5. 生命周期

```text
CREATED
  ↓
CONFIGURED
  ↓
CALCULATED
  ↓
ACTIVE
  ↓
UPDATED
  ↓
ARCHIVED
```

|状态|说明|
|---|---|
|CREATED|画像创建完成|
|CONFIGURED|基础参数配置完成|
|CALCULATED|系统完成计算|
|ACTIVE|正在使用|
|UPDATED|重新计算后形成新版本|
|ARCHIVED|历史版本|

## 6. 基础字段

|字段英文|中文|类型|来源|
|---|---|---|---|
|profile_id|画像编号|基础字段|系统生成|
|profile_name|画像名称|配置字段|人工配置|
|target_object_type|目标对象类型|基础字段|系统关联|
|target_object_id|目标对象编号|基础字段|系统关联|
|target_object_name|目标对象名称|派生展示字段|从关联对象读取|
|profile_version|画像版本|系统字段|系统生成|
|profile_status|画像状态|系统字段|系统维护|
|effective_from|生效时间|配置字段|人工配置或系统生成|
|effective_to|失效时间|配置字段|可为空|

示例：

```json
{
  "profile_id": "DP-001",
  "profile_name": "住宅区域需求画像",
  "target_object_type": "PLACE",
  "target_object_id": "P-001",
  "profile_version": 1,
  "profile_status": "ACTIVE",
  "effective_from": "Day 1 00:00:00",
  "effective_to": null
}
```

## 7. 配置字段

配置字段可以人工配置或外部导入。不同 `target_object_type` 启用不同字段。

### 7.1 人口属性

|字段英文|中文|适用对象|初始值|说明|
|---|---|---|---:|---|
|resident_population|常住人口|PLACE|0|地点常住人口|
|working_population|工作人口|PLACE|0|地点工作人口|
|daily_visitors|日访客量|PLACE|0|日均访客|

### 7.2 出行行为属性

|字段英文|中文|适用对象|初始值|说明|
|---|---|---|---:|---|
|trip_generation_rate|出行产生率|PLACE|0|人群每日出行产生比例|
|demand_weight|需求权重|PLACE|1|地点需求权重|
|peak_pattern|需求高峰模式|PLACE|BALANCED|需求时间分布类型|

### 7.3 Robotaxi 转化属性

|字段英文|中文|适用对象|初始值|说明|
|---|---|---|---:|---|
|robotaxi_adoption_rate|Robotaxi 采用率|PLACE|0|潜在需求转化比例|
|service_acceptance_rate|服务接受率|PLACE|1|用户接受 Robotaxi 服务比例|

### 7.4 服务区域能力属性

|字段英文|中文|适用对象|初始值|说明|
|---|---|---|---:|---|
|pickup_probability|上车概率|SERVICE_AREA|0.5|成为上车点的概率|
|dropoff_probability|下车概率|SERVICE_AREA|0.5|成为下车点的概率|
|peak_demand_ratio|高峰需求比例|SERVICE_AREA|1|高峰时段需求放大比例|
|service_capacity|服务容量|SERVICE_AREA|0|服务承载能力|
|waiting_capacity|等待容量|SERVICE_AREA|0|等待容量|
|turnover_capacity|周转能力|SERVICE_AREA|0|单位周期周转能力|
|accessibility_factor|可达性系数|SERVICE_AREA|1|道路可达性修正|

### 7.5 区域修正属性

Zone 类型 DemandProfile 不直接配置人口或地点需求字段，而是聚合 Place 与 ServiceArea 类型 DemandProfile。

|字段英文|中文|适用对象|初始值|说明|
|---|---|---|---:|---|
|zone_adjustment_factor|区域调整系数|ZONE|1|区域经营修正|
|coverage_factor|服务覆盖系数|ZONE|1|服务覆盖修正|
|competition_factor|竞争影响系数|ZONE|1|竞争影响修正|
|growth_factor|增长修正|ZONE|1|区域增长修正|

## 8. 计算字段

计算字段禁止人工配置。

|字段英文|中文|适用对象|计算逻辑|
|---|---|---|---|
|potential_demand|潜在需求|PLACE / ZONE|Place 为人口与访客 × 出行产生率；Zone 为下级画像聚合|
|expected_robotaxi_demand|预计 Robotaxi 需求|PLACE / ZONE|潜在需求 × Robotaxi 采用率 × 服务接受率，并叠加区域修正|
|peak_hour_demand|峰值需求|PLACE / ZONE|预计 Robotaxi 需求 × 高峰比例|
|demand_distribution|需求分布|ZONE|下级画像构成摘要|
|supply_need_score|供给需求评分|ZONE|预计需求与服务容量的关系|
|calculated_from_profile_ids|计算来源画像|ZONE|区域画像引用的下级画像编号|
|calculated_at|计算时间|全部|系统计算时间|

### 8.1 Place 计算

```text
potential_demand =
  (resident_population + working_population + daily_visitors)
  × trip_generation_rate
  × demand_weight
```

```text
expected_robotaxi_demand =
  potential_demand
  × robotaxi_adoption_rate
  × service_acceptance_rate
```

### 8.2 Zone 计算

```text
zone potential_demand =
  Σ Place DemandProfile.potential_demand
```

```text
zone expected_robotaxi_demand =
  Σ Place DemandProfile.expected_robotaxi_demand
  × zone_adjustment_factor
  × coverage_factor
  × competition_factor
```

```text
supply_need_score =
  expected_robotaxi_demand / Σ ServiceArea DemandProfile.service_capacity
```

## 9. 初始化设计

### 9.1 初始化原则

DemandProfile 初始化需要：

1. 与空间对象一一关联；
2. 不把画像字段写回 Place、ServiceArea 或 Zone；
3. Zone 画像由 Place 和 ServiceArea 画像聚合计算；
4. 初始化值只支撑最小运营闭环，后续可配置和重算；
5. 未来长期需求预测和短期需求预测只能读取 DemandProfile 和历史业务数据。

### 9.2 Place 类型初始化

Place 类型 DemandProfile 与 Place 一一对应。

示例：

```json
{
  "profile_id": "DP-P-001",
  "profile_name": "住宅生活区 A 需求画像",
  "target_object_type": "PLACE",
  "target_object_id": "P-001",
  "profile_status": "ACTIVE",
  "resident_population": 50000,
  "working_population": 0,
  "daily_visitors": 5000,
  "trip_generation_rate": 2.5,
  "demand_weight": 0.9,
  "peak_pattern": "MORNING_OUTBOUND",
  "robotaxi_adoption_rate": 0.05,
  "service_acceptance_rate": 0.8
}
```

类型建议：

|Place 类型|初始化规则|
|---|---|
|RESIDENTIAL|`resident_population > 0`，`working_population = 0`，`peak_pattern = MORNING_OUTBOUND`|
|OFFICE|`resident_population = 0`，`working_population > 0`，`peak_pattern = EVENING_OUTBOUND`|
|COMMERCIAL|`daily_visitors > 0`，`peak_pattern = ALL_DAY_STABLE`|

### 9.3 ServiceArea 类型初始化

ServiceArea 类型 DemandProfile 与 ServiceArea 一一对应。

示例：

```json
{
  "profile_id": "DP-SA-001",
  "profile_name": "SA-001 服务区域需求画像",
  "target_object_type": "SERVICE_AREA",
  "target_object_id": "SA-001",
  "profile_status": "ACTIVE",
  "pickup_probability": 0.7,
  "dropoff_probability": 0.3,
  "peak_demand_ratio": 1.25,
  "service_capacity": 5,
  "waiting_capacity": 10,
  "turnover_capacity": 20,
  "accessibility_factor": 0.9
}
```

### 9.4 Zone 类型初始化

当前初始化 1 个主 Zone。Zone 类型 DemandProfile 与 Zone 一一对应，但字段主要由系统计算。

计算输入：

```text
Place DemandProfile
  +
ServiceArea DemandProfile
  +
历史服务数据
  +
区域修正因子
```

示例：

```json
{
  "profile_id": "DP-Z-001",
  "profile_name": "最小运营测试区需求画像",
  "target_object_type": "ZONE",
  "target_object_id": "Z-001",
  "profile_status": "ACTIVE",
  "zone_adjustment_factor": 1,
  "coverage_factor": 1,
  "competition_factor": 1,
  "growth_factor": 1,
  "potential_demand": 100000,
  "expected_robotaxi_demand": 5000,
  "peak_hour_demand": 800,
  "demand_distribution": "COMMUTE_PATTERN",
  "supply_need_score": 1.2,
  "calculated_from_profile_ids": ["DP-P-001", "DP-SA-001"],
  "calculated_at": "Day 1 00:00:00"
}
```

## 10. 计算关系

```text
Place DemandProfile
  ↓
ServiceArea DemandProfile
  ↓
Zone DemandProfile
  ↓
长期需求预测
  ↓
供应计划
  ↓
运营投放和供给再平衡
```

## 11. 设计原则

1. **统一对象**

   DemandProfile 是一个统一对象，通过 `target_object_type` 区分 Place、ServiceArea 和 Zone。

2. **画像对象独立**

   DemandProfile 不写入 Place、ServiceArea、Zone 本体，避免物理空间事实和经营预测事实耦合。

3. **字段可配置，计算可重算**

   配置字段变更后，需要触发对应画像重算；Zone 画像需要联动下级画像重算结果。

4. **画像服务于经营，不替代业务事实**

   画像用于预测和规划；真实服务订单、履约行驶和经营指标仍以业务单据事实为准。

5. **兼容现有实现**

   当前代码如仍使用 `placeDemandProfiles / serviceAreaDemandProfiles / zoneDemandProfiles` 三组数组，应视为过渡实现。进入代码升级时，需要收敛为统一 DemandProfile 服务，前端菜单继续展示为“需求画像”对象。

## 12. 对代码升级的影响

本文档目前是方案设计，不直接表示已经实现。

如进入代码实现，建议拆为独立阶段：

1. 字段字典增加 `target_object_type / target_object_id / target_object_name`，废弃 `profile_type`；
2. 初始化数据收敛为统一 `demandProfiles`；
3. 增加 DemandProfile 查询、配置和重算服务；
4. 长期需求预测读取 DemandProfile 服务；
5. 供给计划和运营投放消费预测结果，而不是直接读取空间对象字段；
6. 经营分析展示画像解释，但不把画像数据当成真实业务结果。
