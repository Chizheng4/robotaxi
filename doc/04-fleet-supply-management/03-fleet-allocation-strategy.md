# FleetAllocationStrategy：车队分配策略

## 1. 对象定位

`FleetAllocationStrategy` 用于定义生产完成的 Robotaxi 资产如何分配到目标 Zone 和运营中心。

它回答：

```text
哪些区域需要多少 Robotaxi？
这些 Robotaxi 应该交付到哪个运营中心？
具体分配哪些 robotaxi_id？
```

当前系统只有一个 Zone 和一个运营中心，但仍保留策略、执行、结果结构，因为车辆形成后分配到哪里是供应环节的重要决策点。

## 2. 业务流程

```text
ProductionBatch.ASSET_CREATED
  ↓
可分配 Robotaxi 池
  ↓
FleetAllocationStrategy
  ↓ 执行
FleetAllocationRun
  ↓ 生成
FleetAllocationResult
  ↓ 创建
RobotaxiDeliveryOrder
```

## 3. Strategy / Run / Result

|对象|中文|职责|
|---|---|---|
|FleetAllocationStrategy|车队分配策略|保存分配规则和参数|
|FleetAllocationRun|车队分配执行|记录一次策略执行的输入、配置快照和执行状态|
|FleetAllocationResult|车队分配结果|记录某 Zone / 运营中心分配到的车辆列表|

禁止把三个对象混成一个 `Decision` 对象。

## 4. FleetAllocationStrategy 字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|strategy_id|策略编号|系统字段|唯一编号|
|strategy_name|策略名称|配置字段|策略名称|
|strategy_status|策略状态|状态字段|DRAFT / ACTIVE / ARCHIVED|
|strategy_version|策略版本|系统字段|版本|
|strategy_type|策略类型|配置字段|DEMAND_BASED_ALLOCATION|
|allocation_scope|分配范围|配置字段|按生产批次、目标区域或可分配车辆池|
|priority_rule|优先规则|配置字段|按需求缺口、运营中心容量或默认运营中心|
|created_at|创建时间|系统字段|真实创建时间|
|updated_at|更新时间|系统字段|最近更新时间|

当前策略类型：

```text
DEMAND_BASED_ALLOCATION
```

## 5. FleetAllocationRun 字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|allocation_run_id|分配执行编号|系统字段|唯一编号|
|strategy_id|策略编号|关联字段|使用的策略|
|strategy_version|策略版本|快照字段|执行时策略版本|
|strategy_snapshot|策略快照|快照字段|执行时不可变配置|
|run_status|执行状态|状态字段|CREATED / RUNNING / COMPLETED / FAILED|
|production_batch_ids|生产批次列表|输入字段|本次参与分配的批次|
|available_robotaxi_ids|可分配车辆列表|输入字段|已形成但未交付车辆|
|target_zone_ids|目标区域列表|输入字段|目标 Zone|
|started_at|开始时间|系统字段|真实开始时间|
|completed_at|完成时间|系统字段|真实完成时间|

## 6. FleetAllocationResult 字段

分配结果粒度是“某区域 / 运营中心获得一组 Robotaxi”，不是“单台 Robotaxi 有多少辆”。

|字段英文|中文|类型|说明|
|---|---|---|---|
|allocation_result_id|分配结果编号|系统字段|唯一编号|
|allocation_run_id|分配执行编号|关联字段|来源执行|
|target_zone_id|目标区域|计算字段|车辆服务目标区域|
|operation_center_id|运营中心编号|计算字段|目标运营中心|
|allocated_quantity|分配数量|计算字段|分配车辆数量|
|allocated_robotaxi_ids|分配车辆列表|计算字段|本结果包含的 Robotaxi 编号|
|result_status|结果状态|状态字段|GENERATED / CONFIRMED / USED|
|calculated_at|计算时间|系统字段|真实计算时间|

示例：

```json
{
  "allocation_result_id": "FAR-001",
  "target_zone_id": "Z-001",
  "operation_center_id": "OC-001",
  "allocated_quantity": 3,
  "allocated_robotaxi_ids": ["RTX-001", "RTX-002", "RTX-003"],
  "result_status": "GENERATED"
}
```

## 7. 分配计算

### 7.1 当前单 Zone / 单运营中心

```text
所有可分配 Robotaxi
  ↓
默认分配到 Z-001 / OC-001
```

### 7.2 多 Zone / 多运营中心扩展

未来根据：

- Zone DemandProfile；
- 长期需求预测结果；
- 运营中心容量；
- 当前车队规模；
- 区域缺口。

计算：

```text
zone_allocation_quantity =
  total_available_robotaxi
  × zone_demand_weight
```

## 8. 状态机

### 8.1 Strategy

|strategy_status|中文|说明|
|---|---|---|
|DRAFT|草稿|可编辑|
|ACTIVE|启用|可执行|
|ARCHIVED|归档|不可执行|

### 8.2 Run

|run_status|中文|说明|
|---|---|---|
|CREATED|已创建|执行记录已创建|
|RUNNING|执行中|正在计算|
|COMPLETED|已完成|已生成结果|
|FAILED|异常失败|执行失败|

### 8.3 Result

|result_status|中文|说明|
|---|---|---|
|GENERATED|已生成|结果已生成，尚未用于交付|
|CONFIRMED|已确认|运营人员确认结果|
|USED|已使用|已创建交付单|

## 9. 功能动作

1. 执行分配策略：创建 Run，保存策略快照。
2. 生成分配结果：按区域和运营中心形成 Result。
3. 确认分配结果：Result 进入 `CONFIRMED`。
4. 创建交付单：由确认后的 Result 创建 `RobotaxiDeliveryOrder`，Result 进入 `USED`。

## 10. 服务边界

1. 分配策略不创建 Robotaxi。
2. 分配策略不更新 Robotaxi 运营状态。
3. 分配结果只表达目标区域、运营中心和车辆列表。
4. 交付单创建后，才开始车辆空间转移。
5. 分配执行和结果必须保存策略快照，便于复盘。

## 11. 模拟边界

当前只设计业务闭环，不接入模拟运行主路径。
