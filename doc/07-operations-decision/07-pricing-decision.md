# Pricing-decision：动态定价决策

## 1. 定义

动态定价用于对 ServiceOrder 进行价格预估、客户报价和最终价格确认。

动态定价采用三对象结构：

```text
PricingStrategy = 定价策略对象
PricingStrategyRun = 定价策略执行记录
PricingDecision = 定价决策结果
```

三者关系：

```text
PricingStrategy
↓
PricingStrategyRun
↓
PricingDecision
↓
ServiceOrder
```

---

## 2. 核心定位

```text
ServiceOrder = 服务订单
PricingStrategy = 定价规则与参数
PricingStrategyRun = 一次定价策略执行记录
PricingDecision = 本次定价决策结果
```

PricingStrategy 负责定义规则。

PricingStrategyRun 负责记录一次策略调用。

PricingDecision 负责保存本次定价结果，并写入 ServiceOrder。

---

## 3. 对象边界

### 3.1 PricingStrategy

PricingStrategy 是可复用的策略模板。

它定义：

```text
使用什么定价算法
起步价是多少
距离单价是多少
时间单价是多少
动态系数如何配置
适用于哪些订单场景
```

PricingStrategy 不绑定具体订单。

---

### 3.2 PricingStrategyRun

PricingStrategyRun 是一次策略执行记录。

它记录：

```text
哪个 ServiceOrder 调用了策略
调用了哪个 PricingStrategy
输入数据是什么
执行结果是什么
是否成功
失败原因是什么
```

PricingStrategyRun 用于回溯和调试。

---

### 3.3 PricingDecision

PricingDecision 是本次定价决策结果。

它记录：

```text
预估距离
预估时长
基础价格
动态系数
客户报价
最终价格
价格明细
价格说明
```

PricingDecision 是 ServiceOrder 使用的价格结果。

---

## 4. 当前策略

当前阶段只定义一个基础策略。

|pricing_strategy_id|strategy_name|pricing_algorithm|
|---|---|---|
|DPS-001|基础动态定价策略|BASIC_RULE_BASED_DYNAMIC_PRICING|
|DPS-002|基础最终费用计算策略|BASIC_FINAL_FARE_CALCULATION|

当前阶段采用：

```text
规则定价 + 配置型动态系数
```

暂不做完整利润最优化模型。

说明：

- `DPS-001` 用于服务订单价格预估；
- `DPS-002` 用于服务订单结算阶段的最终费用计算；
- 定价策略是可调用服务，只接收输入并返回 PricingStrategyRun / PricingDecision，不主动改变 ServiceOrder 状态。

---

## 5. 定价的经营含义

Robotaxi 定价不是简单公式配置。

它需要在以下目标之间做经营平衡：

```text
客户服务体验
供给成本
需求响应
车辆利用率
订单转化率
整体利润
阶段性经营投入
```

当前阶段只保留经营扩展入口，不实现复杂经营优化模型。

未来可引入：

```text
单车运营成本
单位里程能耗成本
维修折旧成本
车辆利用率
订单转化率
客户等待时间
区域供需预测
阶段性亏损预算
平台补贴策略
竞争价格策略
```

---

## 6. PricingStrategy 属性

|字段|含义|
|---|---|
|pricing_strategy_id|定价策略编号|
|strategy_name|策略名称|
|pricing_algorithm|定价算法|
|base_fare|起步价|
|distance_unit_price|距离单价|
|time_unit_price|时间单价|
|supply_demand_multiplier|供需调节系数|
|time_period_multiplier|时段系数|
|service_area_multiplier|区域系数|
|channel_multiplier|渠道系数|
|strategy_status|策略状态|
|created_at|创建时间|

strategy_status：

|strategy_status|含义|
|---|---|
|ACTIVE|可使用|
|INACTIVE|不可使用|
|ARCHIVED|已归档|

---

## 7. PricingStrategyRun 属性

|字段|含义|
|---|---|
|pricing_strategy_run_id|策略执行记录编号|
|pricing_strategy_id|使用的定价策略|
|pricing_algorithm|使用的定价算法|
|service_order_id|关联订单|
|pricing_stage|ESTIMATE / FINAL|
|price_estimation_route_id|价格预估阶段使用的 Route，可为空|
|input_snapshot|输入快照|
|output_snapshot|输出快照|
|run_result|SUCCESS / FAILED|
|failure_reason|失败原因，可为空|
|created_at|执行时间|

---

## 8. PricingDecision 属性

|字段|含义|
|---|---|
|pricing_decision_id|定价决策编号|
|pricing_strategy_run_id|定价策略执行记录编号|
|pricing_strategy_id|定价策略编号|
|pricing_algorithm|定价算法|
|service_order_id|关联订单|
|order_channel|订单渠道|
|pickup_service_area_id|上车 ServiceArea|
|dropoff_service_area_id|下车 ServiceArea|
|price_estimation_route_id|价格预估路径编号，可为空|
|estimated_distance_km|预估距离|
|estimated_duration_min|预估时长|
|actual_distance_km|实际距离，可为空|
|actual_duration_min|实际时长，可为空|
|base_fare|起步价|
|distance_unit_price|距离单价|
|time_unit_price|时间单价|
|distance_fee|距离费用|
|time_fee|时间费用|
|base_price|基础价格|
|dynamic_multiplier|综合动态系数|
|estimated_price|预估价格|
|quoted_price|客户报价|
|final_price|最终价格，可为空|
|pricing_stage|ESTIMATE / FINAL|
|pricing_result|SUCCESS / FAILED|
|pricing_breakdown_snapshot|定价明细快照|
|pricing_explanation|客户可读价格说明|
|failure_reason|失败原因，可为空|
|created_at|创建时间|

---

## 9. 价格预估 Route

服务订单价格预估前应调用路径规划策略生成一条价格预估 Route。

```text
客户需求位置 -> 上车位置 -> 下车位置
```

价格预估 Route 的规则：

1. `route_usage_type = PRICE_ESTIMATION`；
2. 保存为一条 Route，避免在 Route 管理中出现两条估价路径造成理解成本；
3. 通过 `route_segments` 记录客户需求位置到上车位置、上车位置到下车位置的分段信息；
4. Dynamic Pricing 使用该 Route 的总距离和预估时长生成报价；
5. PricingStrategy 不主动改变 ServiceOrder，调用方负责把 PricingDecision 写回订单。

---

## 10. 最终费用计算

服务订单进入结算阶段后，不应直接复用报价作为最终费用。

结算应调用最终费用计算策略：

```text
FinalFareCalculationStrategy / 最终费用计算策略
```

当前实现中使用：

|pricing_strategy_id|中文名|用途|
|---|---|---|
|DPS-002|基础最终费用计算策略|根据实际行驶距离、实际耗时和报价快照生成最终费用|

输出结果写入：

```text
final_pricing_decision_id
final_price
```

---

## 9. 定价算法

当前算法：

```text
pricing_algorithm = BASIC_RULE_BASED_DYNAMIC_PRICING
```

基础价格：

```text
base_price =
base_fare
+ estimated_distance_km × distance_unit_price
+ estimated_duration_min × time_unit_price
```

动态系数：

```text
dynamic_multiplier =
supply_demand_multiplier
× time_period_multiplier
× service_area_multiplier
× channel_multiplier
```

客户报价：

```text
quoted_price =
base_price × dynamic_multiplier
```

---

## 10. 起步价、距离单价、时间单价

当前阶段采用策略参数配置。

起步价：

```text
base_fare = 单笔订单基础服务价格
```

距离单价：

```text
distance_fee = estimated_distance_km × distance_unit_price
```

时间单价：

```text
time_fee = estimated_duration_min × time_unit_price
```

当前 Robotaxi 具备自动驾驶和电动车成本优势，因此初始价格应低于传统有人驾驶出行服务。

建议初始参数：

```json
{
  "base_fare": 3,
  "distance_unit_price": 0.6,
  "time_unit_price": 0.2
}
```

说明：

```text
当前参数用于最小运营模拟。
后续可根据车辆成本、能耗、维修、利用率和经营目标调整。
```

---

## 11. 动态系数

当前支持四类系数：

|系数|含义|
|---|---|
|supply_demand_multiplier|供需调节系数|
|time_period_multiplier|时段系数|
|service_area_multiplier|区域系数|
|channel_multiplier|渠道系数|

当前默认：

```json
{
  "supply_demand_multiplier": 1.0,
  "time_period_multiplier": 1.0,
  "service_area_multiplier": 1.0,
  "channel_multiplier": 1.0
}
```

当前阶段这些系数来自 PricingStrategy 配置，不做实时模型计算。

---

## 12. 价格预估流程

ServiceOrder 创建后触发预估定价。

```text
ServiceOrder.CREATED
↓
获取 pickup_cell_id / dropoff_cell_id
↓
调用 RoutePlanningRun 估算距离和时长
↓
选择 PricingStrategy
↓
创建 PricingStrategyRun
↓
执行 BASIC_RULE_BASED_DYNAMIC_PRICING
↓
生成 PricingDecision
↓
写入 ServiceOrder
↓
ServiceOrder.WAITING_CUSTOMER_CONFIRM
```

ServiceOrder 写入字段：

```text
estimated_pricing_decision_id
estimated_distance_km
estimated_duration_min
estimated_price
quoted_price
pricing_breakdown_snapshot
pricing_explanation
```

---

## 13. 最终价格流程

订单到达目的地后触发最终定价。

当前阶段默认：

```text
final_price = quoted_price
```

原因：

```text
客户确认叫车时已经接受报价。
当前阶段优先保证价格稳定和订单闭环清晰。
```

如果客户修改目的地：

```text
使用原 PricingStrategy 重新计算价格
```

规则：

```text
起步价不变
定价策略不变
动态系数不变
仅更新距离费用和时间费用
```

ServiceOrder 写入字段：

```text
final_pricing_decision_id
actual_distance_km
actual_duration_min
final_price
```

---

## 14. pricing_stage

|pricing_stage|含义|
|---|---|
|ESTIMATE|下单前预估报价|
|FINAL|订单完成后的最终定价|

---

## 15. pricing_result / run_result

|结果|含义|
|---|---|
|SUCCESS|成功|
|FAILED|失败|

失败时不应进入下一阶段。

---

## 16. failure_reason

|failure_reason|含义|
|---|---|
|ROUTE_ESTIMATION_FAILED|路径距离或时间预估失败|
|PRICING_STRATEGY_NOT_FOUND|未找到可用定价策略|
|PRICING_CONFIG_MISSING|定价参数缺失|
|INVALID_DISTANCE|预估距离无效|
|INVALID_DURATION|预估时长无效|
|UNKNOWN|未知原因|

---

## 17. 定价明细快照

pricing_breakdown_snapshot 保存本次定价过程。

示例：

```json
{
  "base_fare": 3,
  "estimated_distance_km": 6.5,
  "distance_unit_price": 0.6,
  "distance_fee": 3.9,
  "estimated_duration_min": 18,
  "time_unit_price": 0.2,
  "time_fee": 3.6,
  "base_price": 10.5,
  "dynamic_multiplier": 1.1,
  "quoted_price": 11.55
}
```

---

## 18. 价格说明

pricing_explanation 用于前端展示。

示例：

```text
本次价格由起步价、预估里程、预估时间和当前动态系数组成。
```

当前阶段只需要简单说明。

---

## 19. 与 RoutePlanningRun 的关系

价格预估依赖路径距离和路径时间。

```text
pickup_cell_id
↓
dropoff_cell_id
↓
路径估算 / RoutePlanningRun
↓
estimated_distance_km / estimated_duration_min
↓
PricingStrategyRun
↓
PricingDecision
```

说明：

```text
当前阶段价格预估可以调用路径规划能力获得距离和时长。
价格预估阶段不应默认生成可执行 Route，也不应改变 ServiceOrder、Trip 或 Robotaxi 状态。
如果系统记录 RoutePlanningRun，应标记为估算用途，由调用方决定是否保留或关联。
```

---

## 20. 与 ServiceOrder 的关系

PricingDecision 成功后写入 ServiceOrder。

```text
PricingDecision
↓
ServiceOrder
```

ServiceOrder 不计算价格，只保存价格结果和决策关联。

---

## 21. TaskEventLog

典型事件：

|event_type|含义|
|---|---|
|PRICING_REQUESTED|请求定价|
|PRICING_STRATEGY_SELECTED|定价策略已选择|
|PRICING_STRATEGY_RUN_STARTED|定价策略执行开始|
|ROUTE_ESTIMATION_USED|使用路径预估结果|
|PRICING_COMPLETED|定价完成|
|PRICING_FAILED|定价失败|
|FINAL_PRICE_CALCULATED|最终价格生成|

---

## 22. 当前不做内容

本阶段不做：

```text
完整利润最大化模型
复杂价格弹性模型
真实竞品价格跟踪
自动补贴
优惠券
会员价
企业协议价
真实支付通道
复杂退款
```

当前只做：

```text
PricingStrategy
PricingStrategyRun
PricingDecision
基础价格公式
配置型动态系数
预估报价
最终价格
价格明细快照
价格说明
```

---

## 23. 规则

1. PricingStrategy 是可复用策略对象；
    
2. PricingStrategyRun 是一次策略执行记录；
    
3. PricingDecision 是定价决策结果；
    
4. PricingDecision 属于运营决策中心；
    
5. ServiceOrder 创建后必须先执行预估定价；
    
6. 定价失败时订单不能进入客户确认；
    
7. 起步价、距离单价、时间单价来自 PricingStrategy；
    
8. 动态系数当前来自 PricingStrategy 配置；
    
9. quoted_price 是客户确认叫车前看到的价格；
    
10. 当前阶段 final_price 默认等于 quoted_price；
    
11. 如果客户修改目的地，可重新执行 PricingStrategyRun；
    
12. PricingDecision 必须记录 pricing_algorithm；
    
13. PricingDecision 必须保存 pricing_breakdown_snapshot；
    
14. ServiceOrder 只保存定价结果，不计算价格。

---

## 24. v020 修订：订单报价快照规则

PricingDecision 是一次定价策略执行后的价格结果，ServiceOrder 是客户可见的服务承诺单据。

当客户已经看到报价后，订单中的报价信息必须固化为快照。后续 PricingStrategy 配置变化、PricingDecision 重新计算或其他模块更新，都不得改变客户已经看到并用于决策的订单报价。

ServiceOrder 应保存本次报价快照，包括：

|字段|中文名|说明|
|---|---|---|
|quote_base_fare|报价起步价|客户看到报价时使用的起步价|
|quote_distance_unit_price|报价距离单价|客户看到报价时使用的距离单价|
|quote_time_unit_price|报价时间单价|客户看到报价时使用的时间单价|
|estimated_distance_km|预估距离|客户看到报价时使用的预估距离|
|estimated_duration_min|预估时长|客户看到报价时使用的预估时长|
|quoted_price|客户报价|客户确认前看到的报价金额|
|pricing_explanation|价格说明|客户可读的价格说明|
|pricing_breakdown_snapshot|定价明细快照|本次价格构成快照|
|estimated_pricing_decision_id|预估定价决策编号|本次报价对应的 PricingDecision|

说明：

- `base_fare / distance_unit_price / time_unit_price` 属于 PricingStrategy 或 PricingDecision 的计算字段；
- `quote_base_fare / quote_distance_unit_price / quote_time_unit_price` 属于 ServiceOrder 的订单快照字段；
- 客户确认订单后，应以 ServiceOrder 保存的报价快照作为信任依据；
- 最终结算价格可重新生成 PricingDecision，但必须保留预估报价快照，不覆盖原始报价。
