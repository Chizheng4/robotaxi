# 经营目标设计

## 1. 定位

`BusinessTarget` 是经营规划起点，表达企业希望在指定区域和预测周期末达到的经营状态。它是管理约束，不生成市场需求、不执行预测、不直接创建生产计划。

```text
经营目标 + 需求画像 + 服务承载 + Robotaxi 能力 + 生产画像
→ 需求预测执行
→ 需求预测结果
→ 生产计划
```

## 2. 生命周期

|英文值|中文|
|---|---|
|`DRAFT`|草稿|
|`ACTIVE`|启用|
|`ARCHIVED`|归档|

同一区域和同一有效期允许保留历史目标，但一次预测执行只能选择一个明确版本并冻结快照。

## 3. 字段

### 3.1 基础与周期

|英文字段|中文字段|性质|说明|
|---|---|---|---|
|`business_target_id`|经营目标编号|系统|唯一编号|
|`target_name`|目标名称|配置|用户可识别名称|
|`target_status`|目标状态|状态|草稿、启用、归档|
|`target_version`|目标版本|系统|配置版本|
|`target_zone_ids`|目标区域列表|配置|本目标覆盖的 Zone|
|`forecast_start_date`|预测开始日期|配置|规划起点|
|`forecast_period_unit`|预测周期单位|配置|周、月、季度、年|
|`forecast_period_count`|预测周期数量|配置|大于零的整数|
|`forecast_end_date`|预测结束日期|计算|根据开始日期、单位和数量计算|

默认目标名称为“基准经营目标”，默认规划周期为 `MONTH + 12`。目标名称不嵌入时间信息，周期由独立字段表达；生产提前期不改变市场预测周期。

### 3.2 目标与规划模式

|英文字段|中文字段|性质|说明|
|---|---|---|---|
|`target_end_daily_orders`|目标期末日订单|配置|期末典型日希望完成的服务订单|
|`target_order_fulfillment_rate`|目标成熟订单履约率|配置|规划期终态订单中已完成订单的目标比例|
|`target_task_utilization_rate`|目标任务利用率|配置|Robotaxi 可运营时间用于任务的比例|
|`target_minimum_robotaxi_quantity`|目标最低 Robotaxi 数量|配置|管理层要求的最低资产规模|
|`planning_mode`|规划模式|配置|市场驱动、目标驱动或平衡规划|

`planning_mode`：

- `MARKET_LED`：按市场预测规划；
- `TARGET_LED`：按经营目标规划，同时提示市场支撑风险；
- `BALANCED`：取市场预测与目标中的较小值，默认模式。

### 3.3 基础经济性

|英文字段|中文字段|性质|
|---|---|---|
|`average_revenue_per_order`|单均收入|配置|
|`average_variable_cost_per_order`|单均变动成本|配置|
|`daily_fixed_operating_cost`|日固定运营成本|配置|
|`minimum_contribution_margin_rate`|最低经营贡献率|配置|

经济字段只用于计算盈亏平衡点、贡献毛利和目标可行区间。系统不替代管理层自动确定目标。

## 4. 校验

- 周期数量和目标日订单大于零；
- 比例字段在配置界面以百分比输入和展示，领域对象统一保存为 `[0, 1]` 比例值；
- 单均收入大于零，成本不得为负；
- 预测结束日期必须与开始日期、周期单位和数量一致；
- 启用目标必须至少关联一个有效 Zone。

## 5. 兼容

旧字段 `planning_horizon_years`、`target_service_order_count`、`target_fleet_size`、`target_asset_utilization_rate`、`target_revenue_amount` 只在旧快照加载边界转换，不再由新对象和新执行产生。
