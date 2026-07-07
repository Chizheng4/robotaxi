# Outcome Metrics：结果指标层

## 1. 定义

结果指标描述模拟运行在经营层面最终创造的价值，回答“这次运营是否有效、是否赚钱、是否服务了需求”。

第一版结果指标以当前已经建立的收入记录、成本记录和业务单据完成状态为基础。

## 2. P0 结果指标目录

|指标编号|中文名|英文名|计算口径|来源字段|就绪度|
|---|---|---|---|---|---|
|OUTCOME-FIN-001|应收收入|Receivable Revenue|sum(RECEIVABLE_REVENUE.revenue_amount)|RevenueRecord|READY|
|OUTCOME-FIN-002|实收收入|Collected Revenue|sum(COLLECTED_REVENUE.revenue_amount)|RevenueRecord|READY|
|OUTCOME-FIN-003|未收收入|Unreceived Revenue|sum(UNRECEIVED_REVENUE.revenue_amount)|RevenueRecord|READY|
|OUTCOME-FIN-004|运营总成本|Total Operating Cost|sum(CostRecord.cost_amount)|CostRecord|READY|
|OUTCOME-FIN-005|贡献利润|Contribution Profit|实收收入 - 运营总成本|RevenueRecord、CostRecord|READY|
|OUTCOME-FIN-006|贡献利润率|Contribution Margin|贡献利润 / 实收收入|RevenueRecord、CostRecord|READY|
|OUTCOME-SERVICE-001|创建订单数|Created Orders|count(ServiceOrder)|ServiceOrder|READY|
|OUTCOME-SERVICE-002|完成订单数|Completed Orders|count(order_status = COMPLETED)|ServiceOrder.order_status|READY|
|OUTCOME-SERVICE-003|订单履约率|Order Fulfillment Rate|完成订单数 / 创建订单数|ServiceOrder.order_status|READY|
|OUTCOME-SERVICE-004|订单取消率|Order Cancellation Rate|取消订单数 / 创建订单数|ServiceOrder.order_status|READY|
|OUTCOME-EFF-001|单均收入|Revenue per Completed Order|实收收入 / 完成订单数|RevenueRecord、ServiceOrder|READY|
|OUTCOME-EFF-002|单均成本|Cost per Completed Order|运营总成本 / 完成订单数|CostRecord、ServiceOrder|READY|
|OUTCOME-EFF-003|单均贡献利润|Contribution Profit per Order|贡献利润 / 完成订单数|RevenueRecord、CostRecord、ServiceOrder|READY|

## 3. P1 结果指标目录

|指标编号|中文名|英文名|计算口径|来源字段|就绪度|
|---|---|---|---|---|---|
|OUTCOME-EFF-004|单车实收收入|Collected Revenue per Robotaxi|按 robotaxi_id 聚合实收收入|RevenueRecord.robotaxi_id|READY|
|OUTCOME-EFF-005|单车贡献利润|Contribution Profit per Robotaxi|单车实收收入 - 单车归因成本|RevenueRecord、CostRecord|DERIVABLE|
|OUTCOME-EFF-006|平均履约距离|Average Fulfillment Distance|完成 Trip avg(total_distance_km)|Trip.total_distance_km|READY|
|OUTCOME-EFF-007|平均履约时长|Average Fulfillment Duration|完成 Trip avg(time_elapsed)|Trip.time_elapsed|READY|
|OUTCOME-COVERAGE-001|订单服务覆盖率|Order Service Coverage Ratio|已匹配订单数 / 创建订单数|matched_robotaxi_id|READY|
|OUTCOME-COVERAGE-002|需求满足率|Demand Served Ratio|完成订单数 / 原始需求请求数|需求请求事实|MISSING_DATA|

## 4. 经营解释关系

```text
实收收入
  - 运营总成本
  = 贡献利润

贡献利润异常
  → 下钻收入：订单量、支付、未收
  → 下钻成本：距离、能源、人力、折旧
  → 下钻过程：匹配失败、路径距离、履约未完成
```

## 5. 第一版前端体验

财务指标页面建议：

1. 顶部显示应收收入、实收收入、总成本、贡献利润、贡献利润率。
2. 中部展示收入构成和成本构成，使用轻量分组条或紧凑图表。
3. 下方显示按模拟日、服务区、车辆的指标表。
4. 右侧详情展示指标定义、公式、来源记录和质量状态。

服务指标页面建议：

1. 展示订单创建、完成、取消、匹配成功、履约完成。
2. 使用流程式指标表达，不只放孤立数字。
3. 支持从失败率下钻到具体服务订单和失败原因。

