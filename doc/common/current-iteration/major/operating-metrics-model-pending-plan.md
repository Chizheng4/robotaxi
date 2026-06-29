# 后续待执行：Robotaxi 经营指标模型方案

> 当前状态：已被 `doc/06-metrics-system/00-operating-metrics-system.md` 与 `doc/common/current-iteration/major/v034-operating-metrics-system-plan.md` 取代。
>
> 本文件保留早期分析痕迹，不再作为后续编码或版本推进入口。后续经营指标系统以 `v034` 方案为准。

## 1. 文档状态

- 版本：待后续确认，不占用 `v028.1`
- 阶段：待执行方案设计
- 状态：等待 v028.1 业务状态时间线能力完成后继续
- 编码：当前禁止编码
- 时间口径：模拟时间
- 业务框架：状态指标、过程指标、结果指标

本文件保留经营指标模型的分析成果，作为后续待执行方案。当前权威版本是 `v028.1-auto-execution-plan.md`；本文件不得驱动本阶段编码。

## 2. 已确认原则

1. 经营分析默认采用模拟时间，不以真实审计时间计算运营表现。
2. 保留现有三层指标框架，但允许按更专业、可计算、可决策的经营模型重构。
3. 已存在的对象和字段以当前代码与统一字段字典为准，不在指标文档中创造同义字段。
4. 缺少字段、历史事实或业务能力时必须明确标记，不用推测值、默认值或真实时间伪造。
5. 所有字段同时给出英文名与中文名；待确认字段在确认前不进入统一字段字典。
6. 指标模型必须在业务状态时间线可稳定计算后再进入正式版本，不提前实现计算引擎与页面。

## 3. 经营指标模型的目标

指标体系必须回答三个经营问题：

1. **现在发生了什么**：车辆、需求、空间和供需压力处于什么状态。
2. **为什么会这样**：匹配、调度、路径和履约环节中，哪个过程驱动了结果。
3. **最终创造了什么价值**：需求是否被满足、收入是否形成、资源是否有效利用、成本是否可控。

指标不以“能算多少就展示多少”为目标。只有同时满足业务定义清楚、数据可追溯、计算可复现、结果可行动的指标，才进入正式指标目录。

## 4. 高级经营模型

### 4.1 因果结构

```text
状态指标 State
  ↓ 解释当时可用供给、需求和空间压力
过程指标 Process
  ↓ 解释匹配、调度、路径和履约效率
结果指标 Outcome
  ↓ 衡量需求满足、收入、成本和资源效率
经营决策 Decision
  → 调整供给、匹配、调度、定价和模拟策略
```

状态、过程、结果不是三个独立看板，而是一条可下钻的因果链。任何结果指标都应能下钻到过程驱动，再下钻到当时状态。

### 4.2 指标优先级

正式模型不把全部指标视为同等重要。

| 角色       | 指标                                        | 用途                | 当前可得性           |
| -------- | ----------------------------------------- | ----------------- | --------------- |
| 核心结果 KPI | 需求履约率 Demand Fulfillment Rate             | 衡量模拟需求最终被完成服务的比例  | 部分可得，需求请求总量仍需统一 |
| 核心结果 KPI | 实收收入 Collected Revenue                    | 衡量已支付订单形成的真实模拟收入  | 可得              |
| 核心结果 KPI | 贡献利润 Contribution Profit                  | 衡量收入扣除可变运营成本后的价值  | 不可得，缺少成本模型      |
| 核心驱动     | 匹配成功率 Match Success Rate                  | 解释需求能否进入履约        | 可得              |
| 核心驱动     | 匹配延迟 Match Latency                        | 解释订单等待分配效率        | 可推导，但需统一数值时间    |
| 核心驱动     | 接驾等待时长 Pickup Wait Time                   | 解释客户体验和车辆空间匹配     | 不可得，缺少接驾里程碑时间   |
| 核心驱动     | 车辆生产性利用率 Productive Vehicle Utilization   | 解释车辆资源是否用于有效履约    | 不可得，缺少车辆状态时长事实  |
| 经营护栏     | 履约失败率 Trip Failure Rate                   | 避免以牺牲服务质量换取收入或利用率 | 可得              |
| 经营护栏     | 低电量可运营车辆占比 Low-Battery Dispatchable Ratio | 避免短期扩张损害持续供给      | 可得              |
| 数据护栏     | 模拟时间完整率 Simulation Time Completeness      | 保证指标不是用真实时间或空值计算  | 可得              |

核心 KPI 用于判断经营结果，驱动指标用于解释原因，护栏指标用于防止指标被错误优化。

## 5. 统一指标合同

每个正式指标必须使用同一份指标合同。以下是指标定义元数据，不是本轮新增业务对象。

|英文字段|中文名称|定义|
|---|---|---|
|metric_id|指标编号|稳定唯一编号，例如 `STATE-SUPPLY-001`|
|metric_name_en|指标英文名称|统一英文业务名称|
|metric_name_cn|指标中文名称|前端和文档中文名称|
|metric_layer|指标层级|STATE、PROCESS、OUTCOME、GUARDRAIL|
|business_definition|业务定义|指标回答的经营问题|
|calculation_formula|计算公式|使用正式字段名表达的计算规则|
|numerator_definition|分子定义|分子对象、状态和过滤条件|
|denominator_definition|分母定义|分母对象、状态和过滤条件|
|time_basis|时间口径|本项目默认 SIMULATION_TIME|
|time_window|统计窗口|例如 10 分钟、小时、模拟日、SimulationRun|
|calculation_grain|计算粒度|按 Tick、时间窗、区域、车辆、订单或运行|
|dimensions|分析维度|时间、区域、车辆、渠道、策略、运行编号等|
|source_objects|来源对象|Robotaxi、ServiceOrder、Trip 等|
|source_fields|来源字段|当前字段字典中的正式字段|
|exclusion_rules|排除规则|人工数据、失败测试、空时间等处理规则|
|zero_denominator_rule|零分母规则|返回空值，不默认返回 0|
|data_readiness|数据就绪度|READY、DERIVABLE、MISSING_DATA|
|validation_rule|校验规则|范围、恒等式和跨对象对账规则|
|decision_action|决策动作|指标异常后可以采取的运营动作|

## 6. 模拟时间标准

### 6.1 默认时间

模拟经营指标只使用模拟业务时间：

|业务节点|当前正式字段|中文名称|
|---|---|---|
|对象创建|simulation_created_at|模拟创建时间|
|对象更新|simulation_updated_at|模拟更新时间|
|车辆匹配|simulation_matched_at|模拟匹配时间|
|业务完成|simulation_completed_at|模拟完成时间|
|支付完成|simulation_payment_completed_at|模拟支付完成时间|
|连续顺序|simulation_global_tick|模拟全局 Tick|
|来源运行|simulation_run_id|模拟运行编号|
|来源时间轴|SimulationRun.simulation_timeline_id|模拟时间轴编号|

`created_at`、`matched_at`、`completed_at`、`payment_completed_at` 只用于系统审计、页面性能和真实执行耗时，不进入模拟经营指标。

### 6.2 时间窗口规则

1. 时间窗口采用左闭右开 `[window_start, window_end)`。
2. 跨 SimulationRun 的指标必须按 `simulation_timeline_id` 分区，禁止混合不同时间轴。
3. 同一时间轴可跨 Day 和跨运行连续计算。
4. 缺少模拟时间的人工数据和历史数据默认排除，并单独计算数据完整率。
5. 比率指标分母为 0 时返回空值和原因，不伪装为 0%。
6. 当前 `Day N HH:MM:SS` 适合展示，但长期计算需要数值型绝对模拟秒，列入能力缺口。

## 7. 当前系统正式字段映射

|概念|原草案字段|当前正式字段|结论|
|---|---|---|---|
|车辆运营资格|Robotaxi.status|Robotaxi.availability_status|使用正式字段|
|车辆运动状态|Robotaxi.status|Robotaxi.motion_status|使用正式字段|
|允许匹配|未明确|Robotaxi.available_for_dispatch|使用正式字段|
|车辆电量|Robotaxi.battery_level|Robotaxi.battery_percent|使用正式字段|
|车辆位置|Robotaxi.location|Robotaxi.current_cell_id|通过 Cell 映射区域|
|订单状态|ServiceOrder.status|ServiceOrder.order_status|使用正式字段|
|订单创建时间|ServiceOrder.created_at|ServiceOrder.simulation_created_at|模拟指标必须替换|
|订单匹配时间|ServiceOrder.matched_at|ServiceOrder.simulation_matched_at|模拟指标必须替换|
|订单完成时间|ServiceOrder.completed_at|ServiceOrder.simulation_completed_at|模拟指标必须替换|
|订单金额|ServiceOrder.fare|ServiceOrder.final_price / paid_amount|区分应收与实收|
|上车位置|ServiceOrder.pickup_location|pickup_cell_id / pickup_service_area_id|使用结构化位置|
|匹配结果|MatchingDecision.status|OrderMatchingDecision.decision_result|使用正式字段|
|匹配车辆|未明确|OrderMatchingDecision.selected_robotaxi_id|使用正式字段|
|匹配评分|未明确|OrderMatchingDecision.matching_score|使用正式字段|
|履约状态|Trip.status|Trip.trip_status|使用正式字段|
|实际时长|Trip.actual_duration|ServiceOrder.actual_duration_min / Trip.time_elapsed|优先结算后的订单字段|
|预估时长|Trip.expected_duration|ServiceOrder.estimated_duration_min|使用正式字段|
|实际距离|Trip.actual_distance|ServiceOrder.actual_distance_km / Trip.distance_traveled_km|按完成状态选择|
|路径变化|Route logs|Trip.route_history / RouteExecution.route_history|可推导重规划|

### 7.1 当前字段治理差异

`available_for_dispatch`（允许订单匹配）已经存在于 Robotaxi 运行数据和 `src/domain/fieldDictionary.js`，但当前未在 `doc/rules/field-dictionary.md` 中找到对应定义。

本方案将它标记为“现有代码字段、文档字典待补齐”，而不是新字段。后续指标版本启动后，应先按字段字典双文件规则完成一致性修复，再作为正式指标来源字段使用。

## 8. 状态指标目录 State Metrics

状态指标表示指定模拟时间点或短窗口的系统快照。

| 编号               | 指标中英文                              | 正式计算口径                                | 来源字段                                          | 就绪度       | 缺口或说明                         |
| ---------------- | ---------------------------------- | ------------------------------------- | --------------------------------------------- | --------- | ----------------------------- |
| STATE-SUPPLY-001 | 车辆可用率 Vehicle Availability Rate    | 可匹配车辆数 / 纳入运营车辆数                      | availability_status、available_for_dispatch    | DERIVABLE | 需确认分母是否排除永久不可用车辆              |
| STATE-SUPPLY-002 | 供给密度 Supply Density                | 区域内可匹配车辆数 / 区域面积 km²                  | current_cell_id、Zone.cell_ids、Map.cell_size_m | DERIVABLE | 需统一 Cell 到 Zone 的时间点映射        |
| STATE-SUPPLY-003 | 平均电量 Average Battery Level         | 纳入运营车辆的 avg(battery_percent)          | battery_percent、availability_status           | READY     | 建议同时展示 P10 和低电量占比，避免平均值掩盖尾部风险 |
| STATE-SUPPLY-004 | 生产中车队占比 Productive Fleet Ratio     | 有服务订单且处于履约运动状态车辆数 / 纳入运营车辆数           | current_order_id、motion_status                | DERIVABLE | 当前状态可算，历史趋势需要车辆快照             |
| STATE-DEMAND-001 | 需求强度 Demand Intensity              | 窗口内创建服务订单数 / 窗口时长                     | simulation_created_at、simulation_run_id       | DERIVABLE | 需要绝对模拟秒进行可靠分桶                 |
| STATE-DEMAND-002 | 需求空间分布 Demand Spatial Distribution | 按 pickup_service_area_id / Zone 聚合订单数 | pickup_cell_id、pickup_service_area_id         | READY     | 需定义主分析空间层级                    |
| STATE-DEMAND-003 | 需求波动指数 Demand Volatility Index     | 连续等长窗口订单数的标准差 / 均值                    | simulation_created_at                         | DERIVABLE | 需确定窗口长度和最少样本数                 |
| STATE-DEMAND-004 | 峰均需求比 Peak-to-Average Demand Ratio | 窗口峰值订单数 / 平均窗口订单数                     | simulation_created_at                         | DERIVABLE | 需定义峰值窗口和零均值规则                 |
| STATE-SYSTEM-001 | 待服务供需缺口 Unserved Demand-Supply Gap | 待匹配订单数 - 可匹配车辆数                       | order_status、available_for_dispatch           | DERIVABLE | 只允许同一时间点快照比较                  |
| STATE-SYSTEM-002 | 系统负载指数 System Load Index           | 活动服务订单数 / 可匹配及服务中车辆数                  | order_status、current_order_id                 | DERIVABLE | 需确认活动订单状态集合                   |
| STATE-SYSTEM-003 | 匹配压力指数 Matching Pressure Index     | 待分配订单数 / 可匹配车辆数                       | order_status、available_for_dispatch           | DERIVABLE | 与系统负载用途不同：仅诊断匹配入口             |
| STATE-SYSTEM-004 | 未服务需求积压 Unserved Demand Backlog    | 窗口末仍未成功匹配的订单数                         | order_status、simulation_created_at            | DERIVABLE | 替代草案中与结果层重复的服务覆盖率             |

## 9. 过程指标目录 Process Metrics

过程指标衡量需求从创建、匹配、调度、路径到履约完成的效率和质量。

|编号|指标中英文|正式计算口径|来源字段|就绪度|缺口或说明|
|---|---|---|---|---|---|
|PROCESS-MATCH-001|匹配成功率 Match Success Rate|成功匹配决策数 / 匹配执行数|decision_result、order_matching_run_id|READY|按匹配尝试计算，不按订单简单去重|
|PROCESS-MATCH-002|匹配延迟 Match Latency|simulation_matched_at - simulation_created_at|ServiceOrder 模拟时间字段|DERIVABLE|需数值型绝对模拟秒|
|PROCESS-MATCH-003|匹配失败率 Match Failure Rate|失败匹配执行数 / 匹配执行数|decision_result、failure_reason|READY|与成功率应满足近似互补关系|
|PROCESS-DISPATCH-001|调度启动延迟 Dispatch Start Latency|车辆开始接驾模拟时间 - simulation_matched_at|simulation_matched_at|MISSING_DATA|缺少车辆开始接驾的模拟里程碑时间|
|PROCESS-DISPATCH-002|匹配转履约率 Match-to-Trip Conversion Rate|创建 Trip 的已匹配订单数 / 已匹配订单数|trip_id、matched_robotaxi_id|DERIVABLE|替代含义不清的车辆分配效率|
|PROCESS-DISPATCH-003|运力重平衡频率 Rebalancing Frequency|窗口内重平衡任务数 / 窗口时长|无正式事件|MISSING_DATA|需调度/重平衡业务事件|
|PROCESS-ROUTE-001|路径效率比 Route Efficiency Ratio|基准最短距离 / 实际行驶距离|actual_distance_km|MISSING_DATA|缺少同起终点基准最短距离快照|
|PROCESS-ROUTE-002|ETA 误差 ETA Error|actual_duration_min - estimated_duration_min|ServiceOrder 两个时长字段|READY|需仅统计完成订单|
|PROCESS-ROUTE-003|重规划率 Re-routing Rate|发生重规划的 Trip 数 / 已开始 Trip 数|Trip.route_history|DERIVABLE|需统一初始路径不计为重规划|
|PROCESS-EXEC-001|接驾等待时长 Pickup Wait Time|乘客上车或车辆到达时间 - simulation_created_at|simulation_created_at|MISSING_DATA|缺少接驾到达/乘客上车模拟时间|
|PROCESS-EXEC-002|行程完成时长偏差 Trip Duration Deviation|actual_duration_min - estimated_duration_min|ServiceOrder 时长字段|READY|与 ETA Error 可共用事实但分析阶段不同|
|PROCESS-EXEC-003|履约执行成功率 Execution Success Rate|完成 Trip 数 / 已创建 Trip 数|trip_status、simulation_created_at|READY|失败、取消需分别作为护栏下钻|

## 10. 结果指标目录 Outcome Metrics

结果指标在模拟时间窗口内衡量业务价值、服务结果、效率和覆盖。

|编号|指标中英文|正式计算口径|来源字段|就绪度|缺口或说明|
|---|---|---|---|---|---|
|OUTCOME-FIN-001|成交金额 Gross Booking Value|完成订单 sum(final_price)|order_status、final_price、simulation_completed_at|READY|代表应收业务规模，不等于实收|
|OUTCOME-FIN-002|实收收入 Collected Revenue|已支付订单 sum(paid_amount)|payment_status、paid_amount、simulation_payment_completed_at|READY|正式收入指标|
|OUTCOME-FIN-003|运营可变成本 Variable Operating Cost|窗口内车辆、行程及任务成本之和|无正式成本事实|MISSING_DATA|需成本模型和成本事实|
|OUTCOME-FIN-004|贡献利润 Contribution Profit|实收收入 - 运营可变成本|收入与成本|MISSING_DATA|成本能力完成后计算|
|OUTCOME-SERVICE-001|订单履约率 Order Fulfillment Rate|完成订单数 / 创建订单数|order_status、simulation_created_at、simulation_completed_at|READY|衡量已进入订单系统的履约结果|
|OUTCOME-SERVICE-002|平均接驾等待时长 Average Pickup Wait Time|avg(接驾等待时长)|缺少接驾里程碑|MISSING_DATA|依赖 PROCESS-EXEC-001|
|OUTCOME-SERVICE-003|平均行程时长 Average Trip Duration|完成订单 avg(actual_duration_min)|actual_duration_min、order_status|READY|按区域、时段下钻|
|OUTCOME-EFF-001|单均成本 Cost per Completed Trip|运营可变成本 / 完成 Trip 数|成本事实、trip_status|MISSING_DATA|依赖成本模型|
|OUTCOME-EFF-002|单车实收收入 Collected Revenue per Vehicle|按 matched_robotaxi_id 聚合 paid_amount|matched_robotaxi_id、paid_amount|READY|需明确分母为参与运营车辆或产生收入车辆|
|OUTCOME-EFF-003|车辆生产性利用率 Productive Vehicle Utilization|载客与接驾时长 / 可运营时长|车辆状态历史|MISSING_DATA|当前只有最新车辆状态|
|OUTCOME-COVERAGE-001|订单服务覆盖率 Order Service Coverage Ratio|成功匹配订单数 / 创建订单数|matched_robotaxi_id、simulation_created_at|READY|保留在结果层，不在状态层重复|
|OUTCOME-COVERAGE-002|需求满足率 Demand Served Ratio|完成订单数 / 原始需求请求数|ServiceOrder、需求请求事实|MISSING_DATA|当前失败需求不一定形成订单|
|OUTCOME-COVERAGE-003|潜在需求覆盖率 Potential Demand Coverage Ratio|已服务需求数 / 潜在需求数|潜在需求事实|MISSING_DATA|封闭模拟中需显式生成潜在需求，不能称现实市场渗透率|

## 11. 指标维度模型

所有指标至少支持以下维度中的适用项：

|维度|当前字段或关系|状态|
|---|---|---|
|模拟时间轴|SimulationRun.simulation_timeline_id|现有，可通过 simulation_run_id 关联|
|模拟运行|simulation_run_id|现有|
|模拟日/时段|simulation_created_at、current_time_period|可推导，需数值时间|
|地图|map_id|现有|
|运营区域|zone_id / Cell 到 Zone 关系|现有关系，需统一映射服务|
|服务区域|pickup_service_area_id、dropoff_service_area_id|现有|
|车辆|robotaxi_id、matched_robotaxi_id|现有|
|订单渠道|order_channel|现有|
|匹配策略|order_matching_strategy_id|现有|
|定价策略|pricing_strategy_id|现有|
|路径策略|route_strategy_id|现有|

指标结果必须保留维度键，不只保存最终数值，否则无法下钻和复盘。

## 12. 经营指标数据能力建设清单

本清单描述为了让上述指标可真实计算而必须增加的系统能力。名称均为待确认提案。

|能力编号|能力名称|优先级|解决问题|主要产出|
|---|---|---|---|---|
|METRIC-CAP-001|模拟绝对时间服务 Simulation Absolute Time Service|P0|字符串时间难以可靠分桶、相减和跨运行计算|绝对模拟秒、窗口边界、时间轴关联|
|METRIC-CAP-002|车辆状态快照 Vehicle State Snapshot|P0|只有车辆最新状态，无法计算历史供给和利用率|每 Tick 或固定窗口车辆状态事实|
|METRIC-CAP-003|业务生命周期事件 Business Lifecycle Event|P0|订单、匹配、Trip 缺少统一里程碑时间|标准状态变化事件及模拟发生时间|
|METRIC-CAP-004|接驾与调度里程碑 Pickup and Dispatch Milestones|P0|无法计算调度延迟和接驾等待|调度开始、到达接驾点、乘客上车模拟时间|
|METRIC-CAP-005|指标定义注册表 Metric Definition Registry|P0|指标公式、字段、窗口和版本容易分叉|可版本化指标合同|
|METRIC-CAP-006|指标计算与窗口引擎 Metric Window Engine|P0|无法按统一窗口重复计算|状态、过程、结果指标计算结果|
|METRIC-CAP-007|指标数据质量校验 Metric Data Quality Validation|P0|空时间、重复对象、跨运行混算会产生假指标|完整率、唯一性、对账和范围校验|
|METRIC-CAP-008|空间维度解析 Spatial Dimension Resolver|P1|Cell、服务区、Zone 口径可能不一致|统一 Cell→ServiceArea→Zone→Map 映射|
|METRIC-CAP-009|路径基准事实 Route Benchmark Fact|P1|无法计算路径效率和可靠 ETA|基准最短距离、预计时长及算法版本|
|METRIC-CAP-010|调度与重平衡事件 Dispatch and Rebalancing Event|P1|无法衡量重平衡频率和效果|调度原因、起终区域、触发与完成时间|
|METRIC-CAP-011|运营成本模型 Operating Cost Model|P1|无法计算成本、利润和单均成本|车辆、里程、时间、任务成本规则与成本事实|
|METRIC-CAP-012|需求请求与潜在需求事实 Demand Request and Potential Demand Fact|P1|失败需求未形成订单，无法计算真实需求满足率|原始请求、生成结果、潜在需求和失败原因|
|METRIC-CAP-013|指标结果快照 Metric Observation|P1|指标只能临时计算，无法比较版本和策略|指标值、窗口、维度、定义版本和运行来源|
|METRIC-CAP-014|经营指标下钻链路 Metric Drill-down Lineage|P2|指标异常无法定位业务对象|指标结果到订单、车辆、Trip、事件的关联|

## 13. 待确认对象与字段提案

以下字段仅存在于方案中，状态为 `PROPOSED`。用户确认后，必须先同步两个字段字典，再编码。

### 13.1 通用模拟事实时间

|英文字段|中文名称|用途|
|---|---|---|
|simulation_occurred_at|模拟发生时间|事件发生时的 `Day N HH:MM:SS`|
|simulation_occurred_seconds|模拟发生绝对秒|时间轴起点后的整数秒，供排序、分桶和相减|
|simulation_timeline_id|模拟时间轴编号|隔离不同连续模拟时间轴|
|simulation_run_id|模拟运行编号|关联来源 SimulationRun|
|simulation_global_tick|模拟全局 Tick|保持事件发生顺序|

后三项已在部分对象存在；新事实对象必须复用，不创建同义字段。

### 13.2 VehicleStateSnapshot 车辆状态快照

|英文字段|中文名称|用途|
|---|---|---|
|vehicle_state_snapshot_id|车辆状态快照编号|快照唯一编号|
|robotaxi_id|Robotaxi 编号|快照车辆|
|availability_status|运营可用状态|复用车辆正式字段|
|motion_status|物理运动状态|复用车辆正式字段|
|available_for_dispatch|允许订单匹配|复用车辆正式字段|
|battery_percent|当前电量（%）|复用车辆正式字段|
|current_cell_id|当前所在网格|复用车辆正式字段|
|current_order_id|当前服务订单|复用车辆正式字段|
|current_task_id|当前任务|复用车辆正式字段|
|simulation_occurred_seconds|模拟发生绝对秒|快照时间|

### 13.3 BusinessLifecycleEvent 业务生命周期事件

|英文字段|中文名称|用途|
|---|---|---|
|business_event_id|业务事件编号|事件唯一编号|
|business_object_type|业务对象类型|ServiceOrder、Trip、Robotaxi 等|
|business_object_id|业务对象编号|来源对象编号|
|business_event_type|业务事件类型|创建、匹配、调度、接驾、上车、完成等|
|previous_status|变更前状态|复用通用状态变化字段|
|next_status|变更后状态|复用通用状态变化字段|
|robotaxi_id|Robotaxi 编号|关联车辆|
|service_order_id|服务订单编号|关联订单|
|trip_id|履约行驶记录编号|关联 Trip|
|simulation_occurred_at|模拟发生时间|展示时间|
|simulation_occurred_seconds|模拟发生绝对秒|计算时间|

建议的事件类型提案：

|英文值|中文名称|
|---|---|
|ORDER_CREATED|订单已创建|
|ORDER_MATCHED|订单已匹配|
|DISPATCH_STARTED|调度已开始|
|PICKUP_ARRIVED|已到达接驾点|
|PASSENGER_BOARDED|乘客已上车|
|TRIP_STARTED|履约已开始|
|TRIP_COMPLETED|履约已完成|
|PAYMENT_COMPLETED|支付已完成|
|REBALANCING_STARTED|运力重平衡已开始|
|REBALANCING_COMPLETED|运力重平衡已完成|

### 13.4 RouteBenchmarkFact 路径基准事实

|英文字段|中文名称|用途|
|---|---|---|
|route_benchmark_fact_id|路径基准事实编号|基准唯一编号|
|origin_cell_id|起点网格编号|复用正式字段|
|target_cell_id|目标网格编号|复用正式字段|
|benchmark_distance_km|基准距离（公里）|同条件最短或标准距离|
|benchmark_duration_min|基准时长（分钟）|同条件标准预计时长|
|planning_algorithm|路径规划算法|复用正式字段|
|route_strategy_id|路径规划策略编号|复用正式字段|
|simulation_run_id|模拟运行编号|来源运行|

### 13.5 OperatingCostFact 运营成本事实

|英文字段|中文名称|用途|
|---|---|---|
|operating_cost_fact_id|运营成本事实编号|成本事实唯一编号|
|cost_type|成本类型|能源、里程、时间、维护、任务等|
|cost_amount|成本金额|本次成本金额|
|cost_currency|成本币种|当前模拟建议 CNY|
|robotaxi_id|Robotaxi 编号|关联车辆|
|service_order_id|服务订单编号|关联订单|
|trip_id|履约行驶记录编号|关联履约|
|distance_km|计费距离（公里）|成本计算距离|
|duration_min|计费时长（分钟）|成本计算时长|
|cost_rule_id|成本规则编号|关联规则版本|
|simulation_occurred_seconds|模拟发生绝对秒|成本归属时间|

### 13.6 DemandRequestFact 需求请求事实

|英文字段|中文名称|用途|
|---|---|---|
|demand_request_fact_id|需求请求事实编号|原始需求唯一编号|
|demand_simulation_run_id|需求模拟执行编号|复用正式字段|
|request_result|请求结果|成功形成订单或失败|
|failure_reason|失败原因|复用正式字段|
|customer_id|客户编号|复用正式字段|
|pickup_cell_id|上车网格编号|复用正式字段|
|dropoff_cell_id|下车网格编号|复用正式字段|
|potential_demand_count|潜在需求数量|用于潜在需求覆盖分析|
|simulation_occurred_seconds|模拟发生绝对秒|需求发生时间|

## 14. 实现前置顺序

后续指标版本启动后，实现必须遵守以下依赖顺序：

1. 确认指标目录、指标合同和主 KPI。
2. 确认待建对象与字段命名，更新两个统一字段字典。
3. 先建设绝对模拟时间、生命周期事件和车辆状态快照。
4. 再建设成本、需求请求、路径基准和空间维度事实。
5. 建立数据质量验证后，才实现指标计算引擎。
6. 指标计算结果通过对账后，才进入经营分析前端。

禁止先做看板，再用临时前端计算补齐数据缺口。

## 15. 指标验证原则

1. 比率范围必须在 `[0, 1]`，超出视为数据错误。
2. 匹配成功率与匹配失败率按同一尝试集合对账。
3. 成交金额、实收收入、成本和利润必须满足财务恒等关系。
4. 完成 Trip 必须能关联 ServiceOrder、Robotaxi 和 SimulationRun。
5. 所有模拟指标记录必须具有时间轴、模拟运行和数值时间。
6. 聚合结果必须能下钻到来源业务对象。
7. 相同数据、指标版本和维度条件必须得到相同结果。
8. 旧数据缺少模拟时间时必须明确排除并报告完整率。

## 16. 本阶段不做

- 不修改业务对象和统一字段字典。
- 不实现指标计算代码。
- 不新增经营分析页面。
- 不为缺失字段生成默认值。
- 不将现实市场数据与封闭模拟数据混合。
- 不把所有指标都定义为核心 KPI。

## 17. 用户审阅清单

请在本文件中直接勾选或修改：

- [ ] 确认状态、过程、结果三层因果结构。
- [ ] 确认模拟时间为默认经营分析时间。
- [ ] 确认核心 KPI、驱动指标和护栏指标的优先级。
- [ ] 确认状态层不重复保留“服务覆盖率”，改用“未服务需求积压”。
- [ ] 确认收入拆分为成交金额与实收收入。
- [ ] 确认“市场渗透率”改为封闭模拟可解释的“潜在需求覆盖率”。
- [ ] 确认经营指标数据能力建设清单的 P0/P1/P2 优先级。
- [ ] 确认待建对象名称。
- [ ] 确认待建英文字段和中文名称。
- [ ] 确认指标模型只在业务状态时间线完成后进入正式版本。

## 18. 后续启动条件

只有 v028.1 业务状态时间线方案完成，且用户完成第 17 节审阅并明确确认后，本方案才能：

1. 获得新的正式版本编号；
2. 将方案状态改为已确认；
3. 更新统一字段字典和版本计划；
4. 再进入指标数据能力与计算引擎实现。

在此之前，本文件保持为待执行设计，不提前归档为完成版本。
