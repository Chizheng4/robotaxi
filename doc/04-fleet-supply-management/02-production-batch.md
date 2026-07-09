# ProductionBatch：生产批次

## 1. 对象定位

`ProductionBatch` 是 `FleetProductionPlan` 的执行分解单据，用于模拟真实生产执行。

它回答：

```text
这一批要生产多少 Robotaxi？
什么时候开始？
什么时候完成？
完成后创建了哪些 Robotaxi？
```

生产批次完成后，才允许调用 Robotaxi 服务创建车辆资产。

## 2. 上游与下游

```text
FleetProductionPlan
  ↓ 创建
ProductionBatch
  ↓ 完成后调用 RobotaxiService.createRobotaxisFromProductionBatch
Robotaxi Assets
```

## 3. 核心字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|batch_id|批次编号|系统字段|唯一编号|
|batch_name|批次名称|配置字段|批次名称|
|production_plan_id|生产计划编号|关联字段|来源生产计划|
|batch_status|批次状态|状态字段|批次生命周期|
|planned_quantity|计划生产数量|继承字段|来源生产计划拆分|
|completed_quantity|已完成数量|运行态字段|本批次已形成车辆数|
|remaining_quantity|剩余数量|计算字段|计划数量 - 已完成数量|
|planned_start_date|计划开始时间|计算字段|来源计划拆分|
|planned_completion_date|计划完成时间|计算字段|来源计划拆分|
|actual_start_date|实际开始时间|运行态字段|开始生产时写入|
|actual_completion_date|实际完成时间|运行态字段|生产完成时写入|
|generated_robotaxi_ids|生成 Robotaxi 列表|运行态字段|生产完成后创建的 Robotaxi 编号|
|created_at|创建时间|系统字段|真实创建时间|
|updated_at|更新时间|系统字段|最近更新时间|

## 4. 状态机

|batch_status|中文|可用动作|下一状态|
|---|---|---|---|
|PLANNED|已计划|开始生产|MANUFACTURING|
|MANUFACTURING|生产中|完成生产|QUALITY_CHECK|
|QUALITY_CHECK|质检中|质检通过 / 质检失败|COMPLETED / FAILED|
|COMPLETED|已完成|创建 Robotaxi 资产|ASSET_CREATED|
|ASSET_CREATED|资产已创建|关闭批次|CLOSED|
|CLOSED|已关闭|查看详情|无|
|FAILED|异常失败|查看异常 / 重新处理|无|
|CANCELLED|已取消|查看详情|无|

## 5. 功能动作

### 5.1 开始生产

从 `PLANNED` 进入 `MANUFACTURING`，写入批次状态时间线。

### 5.2 完成生产

从 `MANUFACTURING` 进入 `QUALITY_CHECK`，表示生产数量已达到计划数量，但还不能创建 Robotaxi。

### 5.3 质检通过

从 `QUALITY_CHECK` 进入 `COMPLETED`。

### 5.4 创建 Robotaxi 资产

仅允许在 `COMPLETED` 状态执行。

动作：

```text
ProductionBatchService.createRobotaxiAssets(batch)
  ↓
RobotaxiService.createRobotaxisFromProductionBatch(batch_id, planned_quantity)
  ↓
Robotaxi.availability_status = PENDING_ADMISSION
Robotaxi.current_cell_id = null 或生产地位置
Robotaxi.production_batch_id = batch_id
  ↓
ProductionBatch.generated_robotaxi_ids = robotaxi_ids
ProductionBatch.batch_status = ASSET_CREATED
```

Robotaxi 仍然是独立服务化对象。生产批次不能在文档或页面层直接拼装 Robotaxi 状态。

## 6. Robotaxi 初始状态要求

生产批次创建出的 Robotaxi 必须具备现有 Robotaxi 所需基础字段，并额外建议增加：

|字段英文|中文|说明|
|---|---|---|
|production_batch_id|生产批次编号|来源批次|
|asset_source_type|资产来源类型|SELF_PRODUCTION / OWNER_NETWORK|
|asset_formed_at|资产形成时间|生产完成并创建资产的时间|

初始运营状态：

```text
availability_status = PENDING_ADMISSION
available_for_dispatch = false
operation_blocking_reason = READINESS_REQUIRED
```

## 7. 服务边界

1. 生产批次只能由生产计划创建。
2. 生产批次数量不得超过生产计划剩余数量。
3. Robotaxi 资产只能由生产批次完成后的服务动作创建。
4. 生产批次不负责车辆分配、交付或准入。
5. 生产批次状态时间线只记录批次自己的状态。

## 8. 模拟边界

当前只定义业务闭环，不接入模拟运行主路径。未来模拟推进生产时，必须调用生产批次服务动作，而不是直接创建 Robotaxi。
