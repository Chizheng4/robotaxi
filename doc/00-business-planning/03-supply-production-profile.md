# 生产画像设计

## 1. 定位

`SupplyProductionProfile` 是经营规划层的生产能力配置对象。它描述企业自有生产体系在不同周期可形成和交付多少 Robotaxi，只提供预测与生产计划的能力约束，不创建资产、不执行生产、不替代运营准入。

## 2. 核心字段

|字段|中文|性质|含义|
|---|---|---|---|
|`profile_id`|画像编号|系统|唯一编号|
|`profile_name`|画像名称|配置|用户可识别名称|
|`profile_status`|画像状态|状态|启用或归档|
|`profile_version`|画像版本|系统|配置版本|
|`production_lead_time_days`|生产提前期（天）|配置|从生产计划开始到首批车辆完成生产的时间|
|`production_capacity_period_unit`|生产能力周期单位|配置|周、月、季度或年|
|`production_capacity_per_period`|每期生产能力|配置|稳定产能下每期完成数量|
|`ramp_up_periods`|产能爬坡期数|配置|达到稳定产能所需期数|
|`ramp_up_capacity_ratios`|爬坡产能比例|配置|各爬坡期相对稳定产能的比例|
|`quality_inspection_lead_time_days`|质量检验周期（天）|配置|生产完成后的工厂质量检验时间|
|`delivery_capacity_per_period`|每期交付能力|配置|每期最多完成物流交付的数量|
|`effective_from`|生效日期|版本|开始适用日期|
|`effective_to`|失效日期|版本|停止适用日期，为空表示持续有效|

`quality_inspection_lead_time_days` 不得解释为运营准入。运营准入发生在 Robotaxi 完成交付并到达运营中心之后。

## 3. 版本选择

预测执行只能选择满足以下条件的一个生产画像版本：

```text
profile_status = ACTIVE
and effective_from <= forecast_start_date
and (effective_to is null or effective_to >= forecast_start_date)
```

找不到有效画像时预测执行失败，不允许静默使用过期版本。

## 4. 生产与交付计算

```text
首批生产完成日期 = 预测开始日期 + 生产提前期

首批质量检验完成日期 = 首批生产完成日期 + 质量检验周期
```

```text
当期生产量
= min(剩余建议生产量, 每期生产能力 × 当前爬坡比例)
```

```text
当期交付量
= min(已生产未交付库存, 每期交付能力)
```

预测结果必须同时保存：

- 建议生产数量；
- 预测期内可生产数量；
- 预测期内可交付数量；
- 当期与累计生产量；
- 当期与累计交付量；
- 每期剩余 Robotaxi 缺口；
- 首批交付和全部供给完成日期。

建议生产数量表达需要纳入供应决策的完整缺口；预测期可交付数量只表达当前预测期内能形成的供给。两者不得混为一个字段。

## 5. 服务边界

```text
生产画像
  -> 约束需求预测结果
  -> 需求预测结果触发供应决策
  -> 供应决策结果生成生产计划
  -> 生产计划生成生产批次
  -> 生产批次完成生产
  -> 质量检验通过后创建待交付 Robotaxi 资产
```

生产画像不直接修改生产计划、生产批次、Robotaxi、交付单或运营准入任务。

预测期可形成供给从首批质量检验完成日期起计算。生产提前期决定首批生产完成时间，质量检验周期决定首批资产可交付时间；两者不得合并成含义不清的单一准备日期。

爬坡产能比例在配置界面以百分比列表输入，例如 `40, 70, 100`，领域对象统一保存为 `[0.4, 0.7, 1]`。

## 6. 兼容字段

`annual_production_capacity`、`monthly_production_capacity`、`delivery_capacity`、`ramp_up_months`、`inspection_lead_time_days` 只允许在旧快照迁移边界读取，新对象、配置、详情和计算不得继续产生。

## 7. 模拟运行边界

本对象属于业务底层经营规划，不接入模拟运行主扫描。未来模拟运行只能通过时间作业调用生产批次、交付等既有业务服务。
