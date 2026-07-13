# ProductionBatch：生产批次

## 1. 对象定位

`ProductionBatch` 是生产计划的执行单据。批次完成时通过 Robotaxi 对象服务形成指定数量的车辆资产，但不提前赋予运营中心、当前位置或运营准入资格。

```mermaid
flowchart LR
  A["已确认生产计划"] -->|创建批次| B["已计划"]
  B -->|开始生产| C["生产中"]
  C -->|完成生产与质量确认| D["已完成"]
  D -->|形成资产| E["待交付 Robotaxi"]
```

## 2. 核心字段

`production_batch_id`、`batch_name`、`batch_status`、`supply_plan_id`、`target_zone_id`、`planned_robotaxi_count`、`produced_robotaxi_count`、`produced_robotaxi_ids`、`production_started_at`、`production_completed_at`、`created_at`、`updated_at`。

## 3. 状态与动作

|状态|中文|动作|下一状态|
|---|---|---|---|
|`PLANNED`|已计划|开始生产|`IN_PRODUCTION`|
|`IN_PRODUCTION`|生产中|完成生产|`COMPLETED`|
|`COMPLETED`|已完成|查看生成资产|无|
|`CANCELLED`|已取消|查看|无|

当前版本将生产完成和工厂质量确认收敛为“完成生产”动作；质量检验耗时属于生产画像的供给可行性计算，不新增未实现的中间状态。

## 4. 资产形成合同

新车辆必须满足：

```text
availability_status = PENDING_DELIVERY
available_for_dispatch = false
current_cell_id = null
target_ops_center_id = null
production_batch_id = 当前批次
planned_target_zone_id = 计划目标区域
```

生产批次只形成资产。区域分配策略决定目标运营中心，交付完成后才写入当前位置并进入 `PENDING_ADMISSION`。

## 5. 边界

- 只能由已确认生产计划创建。
- 只记录本批次状态，不写入生产计划或交付单状态。
- 车辆形成必须调用对象服务，页面不得批量拼装。
- 当前不进入模拟运行主路径。
