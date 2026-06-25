# v029 运营成本模型自动迭代执行计划

## 1. 文档状态

- 版本：`v029`
- 迭代类型：大版本
- 阶段：实现完成
- 状态：已完成并通过验收
- 编码：已完成
- 方案来源：`doc/06-metrics-system/04-cost-model.md`
- 目标边界：成本结构、成本配置、成本计算、成本记录、业务单据成本展示
- 非目标：利润、ROI、完整经营指标体系、真实充电日志、真实工资日志

## 2. 本版本目标

v029 建设 Robotaxi 自动化运营模拟的成本事实层，使模拟完成后可以根据成本配置计算业务单据消耗的运营成本，并在前端形成可查看、可解释、可追溯的成本记录。

核心结果：

1. 用户可维护一份成本模型配置。
2. 用户可在模拟运行完成后执行“计算运营成本”。
3. 系统生成统一成本记录。
4. 系统将成本汇总回写到服务订单、履约行驶记录、运营行驶记录、运营准入任务和运营投放任务。
5. 前端详情可以查看成本摘要、成本构成和成本明细。

## 3. 已确认原则

1. 第一版采用配置估算，不要求真实充电日志和真实工资日志。
2. 成本记录采用统一 `CostRecord`，业务对象保存成本汇总。
3. 各业务单据都需要有成本记录查看能力。
4. 折旧第一版优先按公里计算，预留按小时、按天。
5. 本版本只做成本结构，不进入利润和完整指标体系。
6. 成本计算不改变模拟 Tick、工作流执行和业务状态。
7. 成本配置与模拟规则配置、工作流时效配置分离。

## 4. 实施范围

### 4.1 新增业务能力

|能力|说明|
|---|---|
|成本模型配置|配置距离、电价、能耗、人力、车辆购置成本、残值和寿命里程|
|成本计算运行|记录一次成本计算的配置快照、状态、进度、结果和错误|
|成本记录|统一记录业务对象产生的每一类成本明细|
|业务成本汇总|将成本金额汇总回写到业务单据|
|成本详情展示|在业务对象详情中展示成本摘要、构成和明细|

### 4.2 覆盖业务对象

|业务对象|成本处理|
|---|---|
|SimulationRun|提供计算入口和计算运行记录|
|RouteExecution|计算距离、能源和折旧成本|
|Trip|计算接驾、载客和重规划路径的距离、能源和折旧成本|
|ServiceOrder|汇总关联 Trip 的成本，不重复计算|
|ReadinessTask|计算 Worker 人力成本|
|DeploymentTask|计算 Worker 人力成本，并汇总关联运营行驶记录成本|

## 5. 数据模型设计

### 5.1 CostModelProfile

中文名称：成本模型配置

核心字段：

- `cost_model_profile_id`：成本模型配置编号
- `profile_name`：配置名称
- `profile_version`：配置版本
- `profile_status`：配置状态
- `currency_code`：币种
- `distance_cost_per_km`：每公里距离成本
- `electricity_price_per_kwh`：每千瓦时电价
- `energy_consumption_kwh_per_km`：每公里耗电量
- `worker_cost_per_hour`：作业人员每小时成本
- `worker_cost_per_minute`：作业人员每分钟成本
- `robotaxi_purchase_cost`：Robotaxi 购置成本
- `robotaxi_residual_value`：Robotaxi 残值
- `expected_lifetime_km`：预计寿命里程
- `depreciation_method`：折旧方式
- `fixed_operating_cost_per_day`：每日固定运营成本

### 5.2 CostCalculationRun

中文名称：成本计算运行

核心字段：

- `cost_calculation_run_id`：成本计算运行编号
- `simulation_run_id`：模拟运行编号
- `cost_model_profile_snapshot`：成本模型配置快照
- `calculation_status`：计算状态
- `processed_object_count`：已处理对象数
- `generated_cost_record_count`：生成成本记录数
- `total_cost_amount`：总成本金额
- `error_count`：错误数量
- `calculation_errors`：计算错误

### 5.3 CostRecord

中文名称：成本记录

核心字段：

- `cost_record_id`：成本记录编号
- `simulation_run_id`：模拟运行编号
- `cost_calculation_run_id`：成本计算运行编号
- `source_object_type`：来源对象类型
- `source_object_id`：来源对象编号
- `robotaxi_id`：Robotaxi 编号
- `worker_id`：作业人员编号
- `cost_type`：成本类型
- `quantity`：成本数量
- `quantity_unit`：数量单位
- `unit_cost`：单位成本
- `cost_amount`：成本金额
- `calculation_formula`：计算公式
- `calculation_basis`：计算依据
- `simulation_cost_occurred_at`：模拟成本发生时间

### 5.4 业务对象成本汇总字段

拟新增：

- `total_cost_amount`：总成本金额
- `distance_cost_amount`：距离成本金额
- `energy_cost_amount`：能源成本金额
- `labor_cost_amount`：人力成本金额
- `asset_depreciation_cost_amount`：资产折旧成本金额
- `cost_calculated_at`：成本计算时间
- `cost_calculation_run_id`：成本计算运行编号

进入编码前必须同步：

1. `doc/rules/field-dictionary.md`
2. `src/domain/fieldDictionary.js`

## 6. 计算规则

### 6.1 距离成本

```text
distance_cost = distance_km × distance_cost_per_km
```

### 6.2 能源成本

```text
energy_kwh = distance_km × energy_consumption_kwh_per_km
energy_cost = energy_kwh × electricity_price_per_kwh
```

### 6.3 人力成本

```text
labor_cost = operation_seconds / 3600 × worker_cost_per_hour
```

### 6.4 按公里折旧

```text
depreciable_value = robotaxi_purchase_cost - robotaxi_residual_value
depreciation_cost_per_km = depreciable_value / expected_lifetime_km
asset_depreciation_cost = distance_km × depreciation_cost_per_km
```

### 6.5 服务订单汇总

```text
service_order_total_cost = sum(cost_records where related_order_id = service_order_id)
```

服务订单不重复计算 Trip 已产生的行驶成本。

## 7. 前端体验计划

### 7.1 菜单

建议在现有信息架构中新增：

```text
经营分析
├── 成本模型配置
└── 成本计算记录
```

如果经营分析模块尚未建立，第一版可先挂入：

```text
自动运营模拟
├── 成本模型配置
└── 模拟运行管理
```

### 7.2 模拟运行操作

在已完成 SimulationRun 的操作区增加：

```text
计算运营成本
重新计算运营成本
```

操作后需要展示：

- 计算中状态；
- 计算完成提示；
- 生成成本记录数；
- 总成本；
- 错误数量。

计算相关事件应进入模拟运行事件展示体系。

### 7.3 业务详情成本展示

业务详情新增“成本”Tab。Tab 结构：

1. 成本摘要；
2. 成本构成；
3. 成本明细；
4. 计算依据；
5. 错误提示。

前端必须保持中文展示，不得展示英文枚举值。

## 8. 自动执行步骤

### 阶段 1：规则与字段准备

1. 读取版本迭代、字段字典、前端体验和执行规则。
2. 将成本对象、字段、枚举同步到字段字典文档和前端字段字典。
3. 确认现有业务对象的成本汇总字段命名统一。

### 阶段 2：领域模型

1. 新增成本类型枚举。
2. 新增成本模型配置默认数据。
3. 新增成本计算运行数据结构。
4. 新增成本记录数据结构。

### 阶段 3：计算引擎

1. 实现成本配置快照。
2. 实现 RouteExecution 成本计算。
3. 实现 Trip 成本计算。
4. 实现 ServiceOrder 成本汇总。
5. 实现 ReadinessTask 和 DeploymentTask 人力成本计算。
6. 实现错误记录和部分成功状态。

### 阶段 4：前端接入

1. 新增成本模型配置页面。
2. 新增成本计算记录展示。
3. 在 SimulationRun 增加计算运营成本入口。
4. 在业务单据详情新增成本展示。
5. 复用现有结构化详情和设计系统，不写一次性样式。

### 阶段 5：验证与归档

1. 运行字段字典一致性检查。
2. 运行成本计算验证脚本。
3. 重新编译前端 bundle。
4. 验证页面可正常加载。
5. 归档大版本计划。
6. 提交并打 `v029` tag。

## 9. 验收标准

1. 有且只有一份 ACTIVE 成本模型配置。
2. 已完成 SimulationRun 可以计算运营成本。
3. 成本计算生成 CostRecord。
4. 业务对象可展示成本汇总和明细。
5. 服务订单成本来自关联 Trip 汇总，不重复计算。
6. 运营投放任务能汇总关联运营行驶记录成本。
7. 缺少距离、时间或配置时，进入错误列表，不静默按 0 处理。
8. 前端全部中文展示。
9. 字段字典双文件同步。
10. 页面启动无白屏。

## 10. 暂停确认条件

编码过程中遇到以下情况必须暂停并向用户确认：

1. 需要引入完整经营分析菜单，而当前信息架构不足以承载。
2. 发现现有业务对象缺少必要关联，无法可靠归因成本。
3. 成本字段命名与既有字段字典发生冲突。
4. 需要修改模拟执行逻辑才能完成成本计算。
5. 需要进入利润、ROI 或完整指标体系计算。
