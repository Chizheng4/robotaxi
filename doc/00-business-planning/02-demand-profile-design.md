# 需求画像设计

## 1. 目的

本文档定义当前已实现的统一 `DemandProfile` 需求画像对象，是需求画像的唯一正式设计文档。

需求画像用于描述地图空间中某个需求相关对象的需求产生能力、服务承接能力、需求变化特征和 Robotaxi 服务转化能力，支撑后续：

- 长期需求预测；
- 车队生产计划；
- 供应执行；
- 供需投放；
- 服务区域能力分析；
- 经营指标诊断。

物理空间对象只描述空间事实；`DemandProfile` 描述空间对象的经营画像。二者必须分离。

## 2. 当前实现状态

v041.1 已实现：

1. 需求画像主事实收敛为统一 `demandProfiles` 数组；
2. 通过 `target_object_type / target_object_id / target_object_name` 关联 Place、ServiceArea、Zone；
3. `profile_type` 不再作为主展示和主数据口径，只保留旧数据兼容；
4. 旧 `placeDemandProfiles / serviceAreaDemandProfiles / zoneDemandProfiles` 可从统一对象拆分得到，用于旧快照和隐藏兼容页面；
5. 经营规划口径下“需求画像”页面展示统一对象，支持按对象类型配置；
6. 保存任意配置后，按 `Place -> ServiceArea -> Zone` 顺序整体重算；
7. 人工配置保存和业务初始化默认记录真实计算时间；
8. 只有未来模拟运行显式传入模拟时间上下文时，才允许记录模拟计算时间。

## 3. 对象定位

`DemandProfile` 是独立业务对象，不属于 Place、ServiceArea 或 Zone 的内嵌字段。

```text
Place / ServiceArea / Zone
  ↓
DemandProfile
  ↓
Long-term Demand Forecast
  ↓
Fleet Production Plan / Supply Execution
```

`DemandProfile` 是经营规划层画像底座，不是服务订单、履约行驶或经营指标的事实来源。真实经营结果仍以业务单据和经营指标数据池为准。

## 4. 与物理空间模型的边界

物理空间模型描述：

- 坐标；
- 覆盖 Cell；
- 道路连通；
- 可通行性；
- 空间归属；
- 服务区物理承载边界。

`DemandProfile` 描述：

- 常住人口、工作人口、日访客量；
- 出行产生率、需求权重、高峰需求比例；
- Robotaxi 采用率、服务接受率；
- 上车概率、下车概率、服务容量、等待容量、周转能力；
- 区域修正、覆盖修正、竞争修正；
- 潜在需求、预计 Robotaxi 需求、峰值需求；
- 需求分布、覆盖缺口、供给需求评分。

禁止把人口、需求率、增长、采用率、预测结果写入 Place、ServiceArea 或 Zone 本体。

## 5. 空间层级关系

当前空间经营关系为两层：

```text
Place + 周边 ServiceArea
  = SubZone（二级子区域，只表达空间组织关系）

多个 SubZone
  = Zone（一级经营区域，生成 Zone DemandProfile）
```

画像生成规则：

|对象|是否生成 DemandProfile|说明|
|---|---|---|
|Place|是|一一生成 Place 类型画像|
|ServiceArea|是|一一生成 ServiceArea 类型画像|
|SubZone|否|只提供 Place 和 ServiceArea 的包含关系|
|一级 Zone|是|汇总下级 Place / ServiceArea 画像|

## 6. 目标对象类型

|target_object_type|中文|说明|
|---|---|---|
|PLACE|地点需求画像|描述 Place 的需求产生能力|
|SERVICE_AREA|服务区域需求画像|描述 ServiceArea 的上下车和服务承载能力|
|ZONE|区域需求画像|描述一级 Zone 的整体经营需求，字段由下级画像汇总和区域修正得到|

## 7. 基础字段

|字段英文|中文|类型|来源|
|---|---|---|---|
|profile_id|画像编号|基础字段|系统生成|
|profile_name|名称|配置字段|人工配置或系统生成|
|target_object_type|目标对象类型|基础字段|系统关联|
|target_object_id|目标对象编号|基础字段|系统关联|
|target_object_name|目标对象名称|派生展示字段|从关联对象读取|
|profile_version|版本|系统字段|配置保存后递增|
|profile_status|状态|系统字段|当前为 ACTIVE|
|effective_from|生效时间|配置字段|业务生效时间|
|effective_to|失效时间|配置字段|可为空|
|calculated_at|计算时间|系统字段|人工/业务计算为真实时间；模拟触发时由模拟运行显式传入|

## 8. 配置字段

配置字段可以人工配置或外部导入。不同 `target_object_type` 启用不同字段。

### 8.1 Place 配置字段

|字段英文|中文|初始来源|说明|
|---|---|---|---|
|resident_population|常住人口|Place 类型默认值或人工配置|地点覆盖范围内常住人口|
|working_population|工作人口|Place 类型默认值或人工配置|地点覆盖范围内工作人口|
|daily_visitors|日访客量|Place 类型默认值或人工配置|日均访客量|
|trip_generation_rate|出行产生率|Place 类型默认值或人工配置|人群在一个经营周期内产生出行需求的比例|
|demand_weight|需求权重|Place 初始化权重或人工配置|地点业务强度修正|
|peak_demand_ratio|高峰需求比例|默认值或人工配置|把日需求转换为高峰窗口需求|
|robotaxi_adoption_rate|Robotaxi 采用率|默认值或人工配置|潜在需求转化为 Robotaxi 需求的比例|
|service_acceptance_rate|服务接受率|默认值或人工配置|用户接受 Robotaxi 服务的比例|
|growth_rate|增长率|默认值或人工配置|长期需求预测周期的增长率|
|forecast_years|预测年数|默认值或人工配置|用于计算增长修正|
|peak_pattern|需求高峰模式|Place 类型默认值或人工配置|需求时间分布类型|

### 8.2 ServiceArea 配置字段

|字段英文|中文|初始来源|说明|
|---|---|---|---|
|pickup_probability|上车概率|默认值或人工配置|服务区域成为上车点的概率|
|dropoff_probability|下车概率|默认值或人工配置|服务区域成为下车点的概率|
|peak_demand_ratio|高峰需求比例|默认值或人工配置|服务区域高峰承接需求比例|
|service_capacity|服务容量|ServiceArea 基础对象或人工配置|服务承载能力|
|waiting_capacity|等待容量|ServiceArea 基础对象或停车网格数量|等待承载能力|
|turnover_capacity|周转能力|服务容量估算或人工配置|单位周期周转能力|
|accessibility_factor|可达性系数|默认值或人工配置|道路与停靠便利程度修正|

### 8.3 Zone 配置字段

Zone 不直接配置人口、访客、服务容量等汇总字段，只配置区域修正类参数。

|字段英文|中文|初始来源|说明|
|---|---|---|---|
|zone_adjustment_factor|区域调整系数|默认值或人工配置|区域经营强度修正|
|coverage_factor|服务覆盖系数|默认值或人工配置|当前服务覆盖水平修正|
|competition_factor|竞争影响系数|默认值或人工配置|外部竞争影响修正|
|peak_demand_ratio|高峰需求比例|下级 Place 加权或人工配置|区域峰值需求比例|
|growth_rate|增长率|下级 Place 加权或人工配置|区域增长率|
|forecast_years|预测年数|默认值或人工配置|用于计算区域增长修正|

## 9. 自动计算字段

计算字段禁止人工配置。

|字段英文|中文|适用对象|计算逻辑|
|---|---|---|---|
|potential_demand|潜在需求|PLACE / ZONE|Place 为人口与访客乘以出行产生率和需求权重；Zone 为下级 Place 汇总|
|expected_robotaxi_demand|预计 Robotaxi 需求|PLACE / ZONE|Place 为潜在需求乘以采用率和接受率；Zone 为服务区域需求聚合后叠加区域修正|
|service_area_demand|服务区域需求|SERVICE_AREA / ZONE|ServiceArea 为关联 Place 需求转换结果；Zone 为下级 ServiceArea 汇总|
|peak_hour_demand|峰值需求|PLACE / ZONE|预计 Robotaxi 需求 × 高峰需求比例|
|growth_factor|增长修正|PLACE / ZONE|`(1 + growth_rate) ^ forecast_years`|
|demand_growth_factor|需求增长因子|ZONE|与区域增长修正一致，用于供给评分解释|
|peak_demand_factor|高峰需求因子|ZONE|区域高峰需求比例|
|coverage_gap_factor|覆盖缺口因子|ZONE|需求与服务容量之间的缺口比例|
|service_capacity|服务容量|ZONE|下级 ServiceArea 服务容量汇总|
|waiting_capacity|等待容量|ZONE|下级 ServiceArea 等待容量汇总|
|turnover_capacity|周转能力|ZONE|下级 ServiceArea 周转能力汇总|
|supply_need_score|供给需求评分|ZONE|需求增长、高峰压力和覆盖缺口形成的供给紧迫评分|
|demand_distribution|需求分布|ZONE|按 Place 类型汇总需求占比|
|calculated_from_profile_ids|计算来源画像|SERVICE_AREA / ZONE|参与计算的下级画像编号|
|profile_field_explanations|画像字段解释|全部|解释关键字段含义、来源和计算逻辑|
|profile_calculation_steps|画像计算过程|全部|解释公式、输入值、中间结果和最终结果|

## 10. 计算链路

保存任意画像配置后，系统必须整体重算：

```text
Place DemandProfile
  ↓
ServiceArea DemandProfile
  ↓
Zone DemandProfile
```

不能只重算被配置的单条画像。否则 Zone 可能读取旧 Place 或旧 ServiceArea 计算结果。

## 11. Place 计算

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

```text
peak_hour_demand =
  expected_robotaxi_demand
  × peak_demand_ratio
```

```text
growth_factor =
  (1 + growth_rate) ^ forecast_years
```

Place 画像是需求来源，不计算 `service_area_demand`。

## 12. ServiceArea 计算

ServiceArea 不产生需求，它负责将关联 Place 需求转换为实际可服务需求。

```text
service_area_demand =
  Σ 关联 Place DemandProfile.expected_robotaxi_demand
  × pickup_probability
  × accessibility_factor
```

关联 Place 来源：

1. ServiceArea 自身 `place_ids`；
2. Place 的 `nearby_service_area_ids`；
3. Zone / SubZone 中包含该 ServiceArea 时的同级 Place。

旧快照中 ServiceArea 画像缺少容量字段时，必须从 ServiceArea 基础对象补齐后再参与 Zone 汇总。

## 13. Zone 计算

Zone 画像只对一级 Zone 计算。

计算时先读取一级 Zone 的 `sub_zone_ids`，再汇总这些 SubZone 绑定的 `place_ids` 与 `service_area_ids`。如果某个 Zone 暂未拆分 SubZone，则兼容使用该 Zone 自身的 `place_ids` 与 `service_area_ids`。

```text
zone potential_demand =
  Σ 子区域内 Place DemandProfile.potential_demand
```

```text
zone service_area_demand =
  Σ 子区域内 ServiceArea DemandProfile.service_area_demand
```

```text
zone expected_robotaxi_demand =
  zone service_area_demand
  × zone_adjustment_factor
  × coverage_factor
  × competition_factor
```

```text
zone peak_hour_demand =
  zone expected_robotaxi_demand
  × peak_demand_ratio
```

```text
coverage_gap_factor =
  max(0, expected_robotaxi_demand - service_capacity)
  / expected_robotaxi_demand
```

```text
supply_need_score =
  demand_growth_factor
  × peak_demand_factor
  × coverage_gap_factor
  × 100
```

```text
demand_distribution =
  每类 Place expected_robotaxi_demand
  / Zone Place 总 expected_robotaxi_demand
```

```text
calculated_from_profile_ids =
  子区域内所有 Place DemandProfile.profile_id
  +
  子区域内所有 ServiceArea DemandProfile.profile_id
```

## 14. 计算时间边界

`calculated_at` 必须表达计算动作发生的时间来源。

|触发来源|calculated_at 规则|
|---|---|
|业务初始化|真实计算时间|
|人工保存配置|真实计算时间|
|页面展示归一化|保留已有计算时间，不生成新时间|
|未来模拟运行触发|由模拟运行显式传入模拟时间|

禁止在人工配置保存、业务初始化或普通展示归一化时写入 `Day 1 00:00:00` 这类模拟时间占位。

## 15. 前端展示规则

经营规划口径下“需求画像”页面展示统一 `DemandProfile` 对象。

展示规则：

1. Zone 画像显示在第一行，服务长期需求预测和供应计划；
2. 表格前列展示关键数字；
3. Place、ServiceArea、Zone 使用同一页面和同一详情组件；
4. 配置入口按 `target_object_type` 展示不同配置字段；
5. Zone 汇总字段只读，不进入配置表单；
6. 字段解释和计算过程在详情中结构化展示；
7. 所有字段名、枚举值和嵌套 key 必须通过统一字段字典中文展示。

## 16. 初始化设计

初始化原则：

1. Place 与 ServiceArea 一一生成 DemandProfile；
2. 一级 Zone 生成 DemandProfile；
3. SubZone 不生成 DemandProfile；
4. 初始化值只支撑最小运营闭环，后续可人工配置和整体重算；
5. 不把画像字段写回 Place、ServiceArea 或 Zone；
6. 不把需求预测、车队生产计划和供应执行单据提前接入模拟运行主路径。

## 17. 旧数据兼容

兼容规则：

1. 旧 `placeDemandProfiles / serviceAreaDemandProfiles / zoneDemandProfiles` 迁移到统一 `demandProfiles`；
2. 旧 `profile_type / source_object_id / source_object_type` 只作为迁移输入，不作为主展示口径；
3. 迁移后自动计算字段按当前公式重新计算，不保留旧快照中的过期计算值；
4. 旧三类画像数组可由统一 `demandProfiles` 拆分得到，用于旧快照和隐藏兼容页面。

## 18. 后续扩展边界

后续长期需求预测、车队生产计划和供应执行单据应消费 `DemandProfile`：

```text
Zone DemandProfile
  ↓
Long-term Demand Forecast
  ↓
Fleet Production Plan
  ↓
Production Batch / Fleet Allocation Strategy
```

本轮不把 `DemandProfile` 接入模拟运行主路径。未来如需由模拟运行触发画像重算，必须声明模拟接入合同，并显式传入模拟时间上下文。
