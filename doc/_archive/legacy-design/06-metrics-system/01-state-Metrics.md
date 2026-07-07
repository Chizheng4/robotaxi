# State Metrics：状态指标层

## 1. 定义

状态指标描述指定模拟时间点或短时间窗口内的运营系统状态，回答“当前供给、需求和系统压力如何”。

状态指标不评价最终经营结果，也不替代过程诊断。它是过程指标和结果指标的解释背景。

## 2. 当前定位

第一版状态指标暂不作为 P0 实现范围，因为当前系统还缺少车辆状态历史快照。可直接从最终对象状态计算的状态指标只能反映当前快照，不能完整表达历史趋势。

因此第一版前端中，状态指标作为经营总览的辅助模块，优先展示当前模拟运行完成后的最终状态摘要。

## 3. 状态指标目录

|指标编号|中文名|英文名|计算口径|来源字段|就绪度|
|---|---|---|---|---|---|
|STATE-SUPPLY-001|车辆可用率|Vehicle Availability Rate|可匹配车辆数 / 纳入运营车辆数|available_for_dispatch、availability_status|DERIVABLE|
|STATE-SUPPLY-002|平均电量|Average Battery Level|纳入运营车辆 avg(battery_percent)|battery_percent|READY|
|STATE-SUPPLY-003|低电量可运营车辆占比|Low Battery Dispatchable Ratio|低于阈值且可运营车辆数 / 可运营车辆数|battery_percent、available_for_dispatch|DERIVABLE|
|STATE-SUPPLY-004|生产中车队占比|Productive Fleet Ratio|服务中车辆数 / 纳入运营车辆数|current_order_id、motion_status|DERIVABLE|
|STATE-DEMAND-001|需求强度|Demand Intensity|窗口内创建服务订单数 / 窗口时长|simulation_created_at|DERIVABLE|
|STATE-DEMAND-002|需求空间分布|Demand Spatial Distribution|按 pickup_service_area_id 聚合订单数|pickup_service_area_id|READY|
|STATE-DEMAND-003|需求波动指数|Demand Volatility Index|等长窗口订单数标准差 / 均值|simulation_created_at|DERIVABLE|
|STATE-SYSTEM-001|待服务供需缺口|Unserved Demand-Supply Gap|待分配订单数 - 可匹配车辆数|order_status、available_for_dispatch|DERIVABLE|
|STATE-SYSTEM-002|匹配压力指数|Matching Pressure Index|待分配订单数 / 可匹配车辆数|order_status、available_for_dispatch|DERIVABLE|

## 4. 第一版展示建议

经营指标总览中展示状态指标时，应使用紧凑摘要：

- 当前可匹配车辆；
- 当前服务中车辆；
- 当前待分配订单；
- 平均电量；
- 低电量风险。

状态指标卡片应支持点击后在右侧详情展示公式、来源字段、分母说明和质量状态。

## 5. 后续增强

要实现真正的状态趋势，需要新增 `VehicleStateSnapshot` 或等价事实对象，按固定窗口保存车辆状态、位置、电量、任务、订单和运动状态。

