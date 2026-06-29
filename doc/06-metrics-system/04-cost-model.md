# Cost And Revenue Facts：成本与收入事实层

## 1. 定位

成本与收入事实层是经营指标系统的财务基础，不是完整指标体系本身。

当前系统已经实现：

- 成本配置 `CostModelProfile` 和 `CostParameterRule`；
- 成本计算运行 `CostCalculationRun`；
- 成本记录 `CostRecord`；
- 收入生成运行 `RevenueCalculationRun`；
- 收入记录 `RevenueRecord`；
- 模拟运行完成后自动触发成本计算和收入生成。

因此本文件从“成本模型待实现方案”升级为“成本与收入事实层方案”。

## 2. 成本事实模型

成本记录采用统一明细事实表，业务对象只保存汇总结果。

第一版成本类型：

|成本类型|中文名|状态|来源|
|---|---|---|---|
|DISTANCE_COST|距离成本|已实现|RouteExecution、Trip|
|ENERGY_COST|能源成本|已实现|RouteExecution、Trip|
|LABOR_COST|人力成本|已实现|ReadinessTask、DeploymentTask|
|ASSET_DEPRECIATION_COST|资产折旧成本|已实现|RouteExecution、Trip|
|FIXED_OPERATING_COST|固定运营成本|预留|后续按运行、日期或车辆分摊|

## 3. 收入事实模型

收入记录从服务订单生成：

|收入类型|中文名|计算口径|
|---|---|---|
|RECEIVABLE_REVENUE|应收收入|final_price、estimated_price 或 quoted_price|
|COLLECTED_REVENUE|实收收入|paid_amount|
|UNRECEIVED_REVENUE|未收收入|应收收入 - 实收收入|

收入事实不重新估算定价结果，只消费服务订单已经沉淀的金额字段。

## 4. 指标消费口径

|指标问题|首选事实|
|---|---|
|收入规模|RevenueRecord|
|收款质量|RevenueRecord 中应收、实收、未收对比|
|成本规模|CostRecord|
|成本结构|CostRecord.cost_type|
|订单利润|服务订单关联 RevenueRecord - CostRecord|
|车辆利润|按 robotaxi_id 聚合收入与成本|
|任务成本|ReadinessTask、DeploymentTask 关联 CostRecord|

## 5. 数据质量规则

1. 成本和收入必须按 `simulation_run_id` 分区。
2. 指标计算前必须确认对应模拟运行的成本计算与收入生成不处于 `CALCULATING`。
3. 如果成本或收入缺失，财务指标质量状态为 `WARN` 或 `FAIL`。
4. 多次重新计算成本或收入时，指标必须使用当前模拟运行上 active run 指向的最新有效结果。
5. 不得因为缺成本而把利润默认为收入，不得因为缺收入而把收入默认为 0。

## 6. 前端展示关系

经营分析管理菜单中，成本记录和收入记录继续作为事实明细页面存在。

指标页面展示的是汇总和解释：

- 财务指标看结果；
- 成本记录看成本来源；
- 收入记录看收入来源；
- 指标详情可以跳转到成本记录和收入记录。

