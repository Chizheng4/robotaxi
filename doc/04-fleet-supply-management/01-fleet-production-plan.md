# FleetProductionPlan：车队生产计划

## 1. 对象定位

`FleetProductionPlan` 用于把长期需求预测结果转换为未来 Robotaxi 自有生产安排。

它回答：

```text
未来缺多少 Robotaxi？
需要在什么时间窗口生产？
需要拆成哪些生产批次？
```

它不直接创建 Robotaxi。

## 2. 上游输入

|输入对象|作用|
|---|---|
|LongTermDemandForecastResult|提供目标周期所需车队规模、当前车队规模、车辆缺口|
|BusinessTarget|提供目标区域、规划周期和服务目标|
|SupplyProductionProfile|提供生产提前期、产能、爬坡和交付能力|

`FleetProductionPlan` 必须由长期需求预测结果创建，不允许人工无来源创建生产计划。

## 3. 下游输出

```text
FleetProductionPlan
  ↓ 生成
ProductionBatch
```

生产计划只负责拆分批次。Robotaxi 资产只能由生产批次完成后调用 Robotaxi 服务创建。

## 4. 核心字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|production_plan_id|生产计划编号|系统字段|唯一编号|
|plan_name|计划名称|配置字段|计划名称|
|plan_status|计划状态|状态字段|生产计划生命周期|
|business_target_id|经营目标编号|关联字段|来源经营目标|
|forecast_result_id|预测结果编号|关联字段|来源长期需求预测结果|
|production_profile_id|供给画像编号|关联字段|来源供应生产画像|
|target_zone_ids|目标区域|继承字段|需要形成供给的 Zone|
|required_fleet_quantity|目标所需车辆数|继承字段|预测结果输出|
|current_fleet_quantity|当前运营车辆数|计算字段|从 Robotaxi 资产统计|
|fleet_gap_quantity|车辆供给缺口|计算字段|目标所需车辆数 - 当前运营车辆数|
|planned_production_quantity|计划生产数量|计算字段|本计划需要生产的 Robotaxi 数量|
|production_start_date|计划生产开始时间|计算字段|根据交付目标和生产提前期推导|
|production_end_date|计划生产完成时间|计算字段|根据生产数量和产能推导|
|production_period_months|生产周期（月）|计算字段|计划生产数量 / 月生产能力|
|generated_batch_ids|生成批次列表|运行态字段|由计划生成的 ProductionBatch 编号|
|created_at|创建时间|系统字段|真实创建时间|
|updated_at|更新时间|系统字段|最近更新时间|

## 5. 计算规则

```text
fleet_gap_quantity =
  required_fleet_quantity - current_fleet_quantity
```

```text
planned_production_quantity =
  max(0, fleet_gap_quantity)
```

```text
production_period_months =
  ceil(planned_production_quantity / monthly_production_capacity)
```

```text
production_start_date =
  required_delivery_date - production_lead_time_days
```

## 6. 状态机

|plan_status|中文|可用动作|下一状态|
|---|---|---|---|
|DRAFT|草稿|确认计划|CONFIRMED|
|CONFIRMED|已确认|生成生产批次|BATCH_CREATED|
|BATCH_CREATED|已生成批次|开始执行批次|EXECUTING|
|EXECUTING|执行中|批次全部完成|COMPLETED|
|COMPLETED|已完成|关闭计划|CLOSED|
|CLOSED|已关闭|查看详情|无|
|CANCELLED|已取消|查看详情|无|
|FAILED|异常失败|查看异常|无|

## 7. 功能动作

### 7.1 创建生产计划

触发来源：

```text
LongTermDemandForecastResult.status = COMPLETED
```

规则：

1. 同一预测结果只能创建一张未取消的生产计划；
2. 如果车辆缺口小于等于 0，可以创建零缺口计划，也可以记录无需生产结果；
3. 创建后写入生产计划首态时间线。

### 7.2 确认计划

确认后计划进入可生成批次状态。

### 7.3 生成生产批次

根据 `planned_production_quantity` 和生产画像的月产能拆分 `ProductionBatch`。

```text
FleetProductionPlan.CONFIRMED
  ↓
ProductionBatch × N
  ↓
FleetProductionPlan.BATCH_CREATED
```

### 7.4 汇总批次完成

当所有关联批次都完成或关闭后，生产计划进入 `COMPLETED`。

## 8. 服务边界

1. 生产计划服务负责创建计划、计算缺口、确认计划、生成批次、汇总批次状态。
2. 生产计划不得直接创建 Robotaxi。
3. 生产计划不得直接触发车队分配策略；只有生产批次形成 Robotaxi 后，车辆才进入分配策略输入池。
4. 生产计划状态时间线只记录生产计划自己的状态。

## 9. 模拟边界

本对象当前只定义业务闭环，不接入模拟运行主路径。未来接入模拟时，模拟时间作业只能调用生产计划服务动作。
