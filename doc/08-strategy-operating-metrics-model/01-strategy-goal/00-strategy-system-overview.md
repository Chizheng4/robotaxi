# Strategy System：战略与经营决策系统总览

## 1. 系统定位

Strategy System 是 Robotaxi 运营平台的长期经营决策层。

```text
Strategy System = 用经营数据、需求预测、供给能力和财务指标指导长期策略
```

它不直接创建服务订单，不直接执行车辆任务，也不直接维修车辆。

## 2. 当前状态

本目录当前只作为未来系统留底，不进入当前编码迭代。

当前已具备的基础：

- 自动运营模拟；
- 服务订单与履约；
- 成本记录；
- 收入记录；
- 经营指标总览、财务表现、服务经营、过程诊断；
- Fleet Operations 设计开始补齐车辆健康闭环；
- Supply System 开始区分长期供给和短期投放。

## 3. 未来闭环

```text
经营数据与指标
  ↓
需求预测
  ↓
供给缺口判断
  ↓
增长 / 供给 / 定价 / 服务策略
  ↓
Supply System 执行供给计划
  ↓
Demand / Dispatch / Fleet Operations / Metrics 反馈结果
```

## 4. 未来关注方向

|方向|说明|
|---|---|
|Demand Strategy|长期需求预测、区域需求增长、时段需求变化|
|Supply Strategy|供给规模、供给来源、车辆采购或合作策略|
|Pricing Strategy|价格弹性、补贴、峰谷定价、收入质量|
|Fleet Strategy|车辆健康、运维成本、可用率、退役周期|
|Growth Strategy|城市扩张、区域覆盖、平台合作|
|Financial Strategy|收入、成本、利润、现金流和投资回收|

## 5. 与其他系统关系

|系统|Strategy 消费 / 输出|
|---|---|
|Operating Metrics|消费经营指标、质量和趋势|
|Supply System|输出长期供给目标和供给策略|
|Fleet Operations|消费车辆可用率、维修成本、退役率等指标|
|Demand Order|消费订单规模、履约率、取消率、等待时长|
|Simulation System|用模拟结果验证策略效果|

## 6. 当前原则

1. Strategy System 当前只做方向留底，不参与 Fleet Operations 编码设计。
2. 不提前实现需求预测、供给计划或增长模型。
3. 后续进入战略层时，必须以现有业务事实、成本事实、收入事实和指标事实为基础。
4. 战略指标不能脱离底层模拟世界时间和业务单据生命周期事实。
