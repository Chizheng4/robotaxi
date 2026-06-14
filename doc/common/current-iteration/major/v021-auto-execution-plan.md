# v021 自动执行控制计划

## 1. 目的

本文档用于固化 `v021` 阶段的大版本迭代计划。

`v021` 的目标是修正 v020 服务订单与行驶闭环中的路径、状态、价格和结算细节，让系统更接近真实 Robotaxi 运营体验。

本阶段重点不是新增大量对象，而是统一以下核心链路：

```text
需求模拟
↓
服务订单创建
↓
价格预估路径规划
↓
动态定价
↓
服务履约行驶
↓
最终费用计算
↓
结算与支付
```

同时清理前端遗留状态和菜单顺序，减少运营人员理解成本。

## 2. 阶段基线

```text
阶段基线版本：v020.6.2
阶段名称：路径步骤、价格预估与最终费用闭环优化
当前执行模式：先整理计划并确认，再按子版本连续执行
当前计划起点：v021.1
当前计划终点：v021.6
```

## 3. 总体目标

### 3.1 前端运营体验目标

1. 需求订单管理菜单中，`服务订单管理` 放在 `客户管理` 之前。
2. 清理运营投放任务单中无用状态展示。
3. 清理运营行驶记录中无用状态展示。
4. 清理服务订单中无用历史状态展示。
5. 路径规划管理中，`策略执行管理` 改为 `路径规划执行`。
6. 单据表单模块统一具备最近事件 / 执行记录辅助区域。

### 3.2 Route 与行驶目标

1. `Route.route_steps` 表达完整路径 Cell 顺序，保留起点 Cell。
2. `route_steps[0] = origin_cell_id`，用于校验路径起点和连续性。
3. 起点 Cell 本身不是一次移动，不能计入移动步数。
4. `route_step_count` 等于实际移动步数，即 `route_steps.length - 1`。
5. 运营行驶记录和服务履约记录的 `继续行驶` 必须严格按关联 Route 的 step 顺序推进。
6. `继续行驶` 第一次推进到 `route_steps[1]`。
7. Route 管理中展示计算得到的路线距离。
8. Route 路径步骤展示不显示 `step_index = 0` 的起点行，只从第 1 个移动步骤开始展示。
9. Route 不直接计算或展示行驶时间；时间由行驶记录根据模拟速度或人工推进规则产生。

### 3.3 定价与结算目标

1. 服务订单价格预估必须覆盖完整服务链路距离：

```text
客户位置 -> 上车位置
+
上车位置 -> 下车位置
```

2. 动态定价策略执行前，应调用路径规划策略生成价格预估用途的 Route。
3. 价格预估用 Route 应进入 Route 管理，但必须标记为价格预估路径，不应被误认为正在执行的行驶路径。
4. 动态定价策略记录本次用于估价的 Route 信息，便于核对和排错。
5. 服务订单结算时不再直接复用报价作为最终价格。
6. 新增 `FinalFareCalculationStrategy`，中文名为 `最终费用计算策略`。
7. 服务订单结算操作调用最终费用计算策略，输入实际行驶距离、实际耗时、报价快照字段和必要费用字段，返回最终费用。

### 3.4 需求模拟目标

服务订单创建时调用需求模拟策略。

当随机得到的客户位置本身属于服务区域时：

```text
pickup_cell_id = customer_origin_cell_id
pickup_service_area_id = customer_origin 所属 ServiceArea
```

不应继续分配新的上车位置。

## 4. 核心设计原则

### 4.1 策略调用边界

策略是可被调用的服务。

策略只接收输入并返回结果，不主动改变调用方状态。

调用方负责使用策略结果更新自身状态。

适用于：

- DemandSimulationStrategy；
- RoutePlanningStrategy；
- PricingStrategy；
- FinalFareCalculationStrategy；
- OrderMatchingStrategy。

### 4.2 Route 用途区分

Route 是路径规划策略运行后的输出结果。

不同调用方生成的 Route 必须可区分用途。

确认新增或统一字段：

|字段|中文名|含义|
|---|---|---|
|route_usage_type|路径用途类型|区分价格预估、运营行驶、服务接驾、服务载客、异常重规划等|

确认值：

|值|中文|
|---|---|
|PRICE_ESTIMATION|价格预估路径|
|OPERATIONAL_EXECUTION|运营行驶路径|
|SERVICE_PICKUP|服务接驾路径|
|SERVICE_DROPOFF|服务送达路径|
|SERVICE_REPLAN|服务重规划路径|

价格预估路径确认使用：

```text
route_usage_type = PRICE_ESTIMATION
```

价格预估路径保存为一条 Route。该 Route 需要表达客户位置到上车位置、上车位置到下车位置的分段信息和总距离，避免在 Route 管理中出现两条估价路径造成运营人员理解成本。

### 4.3 Route steps 展示与移动步数语义

`route_steps` 保留完整路径顺序，包含起点。

`route_steps[0]` 不是移动动作，而是路径起点。

示例：

```text
origin_cell_id = C-01
target_cell_id = C-04

实际移动：
C-01 -> C-02 -> C-03 -> C-04

route_steps:
0 -> C-01
1 -> C-02
2 -> C-03
3 -> C-04

route_step_count = 3
```

校验规则应调整为：

1. `route_steps[0].cell_id = origin_cell_id`；
2. `route_steps[last].cell_id = target_cell_id`；
3. 相邻 step 必须连续；
4. `route_step_count = route_steps.length - 1`；
5. 行驶记录 `current_step_index = 0` 表示尚未执行任何移动 step；
6. 第一次 `继续行驶` 后进入 `route_steps[1]`。

前端展示规则：

1. Route 详情中的路径步骤不展示 `step_index = 0`；
2. 展示时从第 1 个移动步骤开始；
3. 展示字段应表达“移动步序”和“到达网格”，避免把起点误解为一次移动。

### 4.4 时间与距离边界

Route 负责：

- 路径 Cell 顺序；
- roadsegment_sequence；
- total_distance_km / total_distance_m；
- route_step_count。

Route 不负责：

- 实际行驶时间；
- 实际耗时；
- Robotaxi 速度；
- 等待时间；
- 乘客上下车时间。

PricingStrategy 可以基于 Route 距离和定价策略中的速度假设计算预估时长。

Trip / RouteExecution 可以基于人工推进次数、模拟速度或后续自动化模拟系统计算实际耗时。

当前阶段不实现完整自动化时间流，只做最小可解释的耗时规则。

## 5. 子版本计划

### v021.1 文档、字段字典与状态口径统一

目标：先把 Route steps、Route 用途、最终费用策略和无用状态口径定准。

交付：

1. 更新 RoutePlanningStrategy 文档，明确 route_steps 保留完整路径顺序并包含 origin。
2. 更新 Route / RoutePlanningRun / RouteExecution / Trip 相关文档。
3. 更新 ServiceOrder 文档，明确价格预估路径和最终费用计算策略。
4. 更新 PricingStrategy 文档，明确预估距离来自价格预估 Route。
5. 新增或补充 `FinalFareCalculationStrategy` 设计说明。
6. 更新统一字段字典，新增 route_usage_type、最终费用计算策略相关字段和值。
7. 明确前端需要隐藏的历史状态，但不删除底层兼容枚举。

验收：

1. 文档中 route_steps 起点规则、移动步数规则和展示规则一致；
2. 字段字典有中文名；
3. 价格预估 Route 与执行 Route 不混淆；
4. 最终费用策略命名统一。

### v021.2 前端菜单与状态清理

目标：清理运营人员可见的无用状态和菜单顺序。

交付：

1. `需求订单管理` 下菜单顺序调整为：

```text
需求订单管理
  服务订单管理
  客户管理
```

2. 运营投放任务单前端去除 `待路径规划` 状态筛选。
3. 运营投放任务单将 `等待行驶` 展示为 `待行驶`。
4. 运营行驶记录前端去除 `等待行驶`、`异常失败` 状态筛选。
5. 服务订单前端去除以下无用状态筛选：
   - 等待运营决策；
   - 订单失败；
   - 订单已创建；
   - 等待客户确认；
   - 等待车辆匹配；
   - 匹配失败；
   - 重复匹配失败。
6. 路径规划管理中 `策略执行管理` 改为 `路径规划执行`。

验收：

1. 前端状态筛选不显示废弃状态；
2. 底层兼容枚举不被误删；
3. 菜单顺序符合运营习惯；
4. 字段和值仍全部中文展示。

### v021.3 Route steps 展示、移动步数与 Route 距离修正

目标：保留 Route 完整路径顺序，修正移动步数、前端展示和 Route 距离表达。

交付：

1. 保持 Route 生成逻辑中的 `route_steps` 包含 origin，不重定义底层数据结构。
2. 调整 `route_step_count` 计算为 `route_steps.length - 1`。
3. 调整 Route 管理表格和详情，展示路线距离，不展示 Route 自身的时间。
4. Route 详情路径步骤隐藏 `step_index = 0` 的起点行，从第 1 个移动步骤开始展示。
5. 调整 Route 校验规则，继续校验 `route_steps[0] = origin_cell_id` 和 `route_steps[last] = target_cell_id`。
6. 调整 RoutePlanningRun 和 Route 的反查展示。
7. 保证价格预估 Route、运营行驶 Route、服务履约 Route 都使用同一 Route steps 语义。

验收：

1. `route_steps[0]` 仍然是 origin Cell；
2. `route_steps[last]` 是目标 Cell；
3. `route_step_count = route_steps.length - 1`；
4. Route 详情不展示起点作为移动步骤；
5. Route 管理能清晰展示路径用途和距离；
6. 不破坏现有行驶记录和履约记录关联。

### v021.4 行驶记录继续行驶逻辑统一

目标：运营行驶记录和服务履约记录都严格按 Route steps 推进。

交付：

1. 运营行驶记录 `继续行驶` 每次只推进一个 route step。
2. 服务履约记录 `继续行驶` 每次只推进一个 route step。
3. `current_step_index = 0` 表示当前位置仍在 route 起点，尚未执行移动 step。
4. 第一次继续行驶后进入 `route_steps[1]`。
5. 到达最后一个 step 后进入到达状态。
6. 单据表单模块统一保留最近事件 / 执行记录辅助区域。

验收：

1. 运营行驶记录和服务履约记录推进规则一致；
2. 当前 Cell、已行驶距离、剩余距离随 step 变化；
3. 到达状态不会提前出现；
4. 最近事件能记录路径推进。

### v021.5 需求模拟与动态定价预估路径修正

目标：让服务订单创建和价格预估更符合真实运营。

交付：

1. 需求模拟策略：客户位置属于服务区时，上车位置等于客户位置。
2. 价格预估时先调用路径规划策略。
3. 生成一条价格预估 Route，表达完整估价链路：
   - 客户位置 -> 上车位置；
   - 上车位置 -> 下车位置；
   - 记录两段路径分段信息与总距离。
4. 动态定价策略使用价格预估 Route 的总距离计算预估费用。
5. 动态定价策略记录价格预估 Route 信息。
6. ServiceOrder 保存价格预估 Route / PricingDecision 关联。

验收：

1. 客户在服务区时不重新分配上车点；
2. 预估距离不是只算客户位置到上车位置；
3. 价格预估 Route 可在 Route 管理查看；
4. PricingDecision 可追溯其使用的价格预估 Route。

### v021.6 最终费用计算策略与结算闭环

目标：服务订单结算时通过策略计算最终费用。

交付：

1. 新增 `FinalFareCalculationStrategy` / `最终费用计算策略`。
2. `FinalFareCalculationStrategy` 归入动态定价管理下展示和管理，作为最终费用计算策略。
3. 新增对应执行记录和结果，或在定价执行 / 定价结果体系中明确最终费用阶段。
4. 服务订单结算操作调用最终费用计算策略。
5. 策略输入包括：
   - actual_distance_km；
   - actual_duration_min；
   - quote_base_fare；
   - quote_distance_unit_price；
   - quote_time_unit_price；
   - 其他必要费用字段。
6. 策略输出最终费用。
7. ServiceOrder 写入 `final_price` 后进入待支付。
8. 支付后订单完成。

验收：

1. 结算不再直接复用 quoted_price；
2. 最终费用可追溯到策略执行；
3. ServiceOrder 详情能显示最终费用来源；
4. 支付闭环仍然可用。

## 6. 风险与需要重点验证

1. Route steps 的展示、移动步数和继续行驶语义会影响多个模块，必须先统一校验口径再改行驶推进。
2. 价格预估 Route 进入 Route 管理后，必须通过 route_usage_type 防止误解。
3. 服务订单状态清理只影响前端展示，不应破坏旧运行态兼容。
4. 最终费用计算策略归入动态定价管理，但需避免与价格预估策略混淆。
5. 已耗时计算当前只做最小模拟，不引入完整自动化时间系统。
6. 每个子版本完成后必须更新版本记录、提交并打 tag。
7. v021 最后一个子版本必须归档本计划到 `doc/common/iteration-history/major/`。

## 7. 本阶段不做

本阶段不实现：

- 真实地图；
- 真实自动驾驶；
- 真实支付通道；
- 财务账单对象；
- 发票对象；
- 复杂取消订单；
- 完整自动化时间流系统；
- 经营指标 Metric。

## 8. 已确认决策

1. `FinalFareCalculationStrategy` 归入动态定价管理下，作为最终费用计算策略展示。
2. 价格预估路径使用 `route_usage_type = PRICE_ESTIMATION`。
3. 价格预估路径保存为一条带分段信息的 Route，不保存为两条 Route。
4. v021 按本文的 `v021.1` 至 `v021.6` 连续执行。
