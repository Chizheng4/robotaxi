# RetirementTask：Robotaxi 退役 / 报废任务单

## 1. 定义

RetirementTask 是用于将 Robotaxi 从运营系统中永久移除的任务单。

```text
RetirementTask = Robotaxi 生命周期退出任务单
```

它处理不可修复、达到报废标准、资产退役或外部供给退出等场景。

## 2. 服务化边界

RetirementTask 不直接判断 Robotaxi 是否应该退役。

退役需求应由 `RobotaxiService.shouldRetire(...)`、MaintenanceTask 维修结果、FailureHandlingTask 处置结果或资产运营决策触发，再由 RetirementTaskService 创建任务：

```text
RobotaxiService / MaintenanceTask / FailureHandlingTask 判断需要退役
  ↓
RetirementTaskService 创建 RetirementTask
  ↓
RetirementTask 执行确认、目的地分配和资产退出处理
  ↓
RobotaxiService 标记 Robotaxi 为 RETIRED
```

等待中的 RetirementTask 不占用 Robotaxi.current_task_id。退役一旦确认，Robotaxi 必须立即从可运营集合、投放集合和订单匹配集合中移除。

## 3. 触发来源

|触发来源|说明|
|---|---|
|MaintenanceTask|维修判定不可修复|
|FailureHandlingTask|故障处置判定退役|
|生命周期规则|车龄、里程、维修成本超阈值|
|资产运营决策|人工退役或供应方退出|

## 4. 状态机

|task_status|含义|下一步动作|
|---|---|---|
|CREATED|退役任务已创建|确认车辆状态|
|WAITING_ROBOTAXI_AVAILABLE|等待当前服务或任务结束|等待车辆释放|
|WAITING_RETIREMENT_APPROVAL|等待退役确认|审批或确认|
|WAITING_DESTINATION_ASSIGNMENT|等待分配退役处理位置|分配 OpsCenter / 资产处理点|
|WAITING_ROUTE|等待路径规划|路径规划|
|MOVING_TO_RETIREMENT_CENTER|前往退役处理点|行驶推进|
|ARRIVED_RETIREMENT_CENTER|到达处理点|资产处理|
|PROCESSING_RETIREMENT|退役处理中|完成处理|
|COMPLETED|退役完成|无|
|CANCELLED|取消退役|无|
|FAILED|退役处理失败|人工处理|

## 5. 完整闭环

```text
不可修复 / 达到退役标准
  ↓
创建 RetirementTask
  ↓
确认不再参与运营
  ↓
如需要移动：RouteExecution 前往退役处理点
  ↓
资产处理
  ↓
Robotaxi.availability_status = RETIRED
Robotaxi.fleet_operation_status = RETIRED
  ↓
任务完成
```

## 6. 关键规则

1. RETIRED Robotaxi 不得再参与订单匹配、投放、准入、充电、清洁和维修。
2. 退役完成后保留历史记录，用于资产、成本和经营指标分析。
3. 退役可以由维修失败触发，也可以由生命周期规则触发。
4. 如车辆无法自行行驶，后续可引入救援 / 拖车任务；第一阶段暂不展开。
5. 退役状态必须通过 RobotaxiService 统一回写，避免资产退出和运营状态不一致。

## 7. 关键字段建议

|字段|说明|
|---|---|
|task_id|退役任务编号|
|task_type|RETIREMENT|
|task_status|任务状态|
|robotaxi_id|车辆编号|
|retirement_reason|退役原因|
|source_task_id|来源任务，可为空|
|approval_status|审批状态|
|target_ops_center_id|退役处理中心|
|route_execution_id|前往处理中心的行驶记录，可为空|
|asset_exit_result|资产退出结果|
|operation_completed_at|退役业务完成时间|

## 8. 指标基础

RetirementTask 后续应支撑：

- 退役车辆数；
- 退役率；
- 平均运营寿命；
- 维修不可修复率；
- 资产退出损失；
- Fleet 可用规模变化。
