# Fleet Operations Workflow：统一触发、等待与调度工作流

## 1. 文档定位

本文件不是业务任务单设计，而是 Fleet Operations 各类任务共用的触发、等待、目的地分配、行驶和作业执行规则。

本阶段不创建独立 `FleetOperationRequirement` 任务单。

## 2. 为什么不需要 FleetOperationRequirement

运维需求本质上可以由 Robotaxi 状态、报警、阈值、服务完成事件或人工操作触发，但触发入口必须经过 `RobotaxiService` 的运营健康判断。

如果第一阶段增加一张 Requirement 单，会形成：

```text
Robotaxi 状态 / 报警
  → Requirement
  → CleaningTask / ChargingTask / MaintenanceTask
```

这会增加用户理解成本和工程复杂度。当前最小闭环更适合：

```text
Robotaxi 状态 / 报警 / 服务完成事件
  → RobotaxiService 判断运营健康
  → 创建对应 Fleet Operation Task
```

后续当出现复杂排队、合并、优先级优化、跨任务资源统筹时，再扩展运维需求池。

## 3. 统一触发模型

统一触发模型遵循 `02-robotaxi-operational-health-model.md`：

```text
触发事件
  ↓
RobotaxiService 读取 Robotaxi 健康事实
  ↓
判断是否需要清洁 / 充电 / 维修 / 故障处理 / 退役
  ↓
调用对应 Fleet Task Service 创建任务
```

|触发类型|来源|可能任务|
|---|---|---|
|车辆自检|Robotaxi 报警|Cleaning / Charging / FailureHandling|
|服务完成|Trip / ServiceOrder 完成|Cleaning / Charging|
|运营规则|时间、里程、电量、故障报警|Cleaning / Charging / Maintenance / FailureHandling|
|人工操作|运营人员手动标记|任意 Fleet Operation Task|
|任务结果|故障诊断、维修结果|Maintenance / Retirement / Readiness|

## 4. 统一等待模型

当 Robotaxi 正在执行服务订单或不可立即中断的任务时：

```text
创建运维任务
  ↓
任务进入 WAITING_ROBOTAXI_AVAILABLE
  ↓
Robotaxi 完成当前服务
  ↓
系统阻止 Robotaxi 接新订单或新投放任务
  ↓
运维任务继续执行
```

第一阶段默认：清洁、低电充电、低/中风险故障可以等待当前服务完成。

高风险故障、严重事故、无法继续行驶等场景暂不展开，后续进入异常履约和救援体系。

## 5. 统一目的地分配模型

运维任务执行前，需要分配目的地。

|任务|目的地要求|
|---|---|
|CleaningTask|OpsCenter.can_clean_robotaxi = true|
|ChargingTask|OpsCenter.can_charge_robotaxi = true，后续可绑定 charger_id|
|MaintenanceTask|OpsCenter.can_repair_robotaxi = true，后续可绑定 maintenance_bay_id|
|FailureHandlingTask|可在当前位置诊断或前往 OpsCenter，第一阶段优先 OpsCenter|
|RetirementTask|退役处理中心或具备接收能力的 OpsCenter|
|ReadinessCheckTask|OpsCenter.can_inspect_robotaxi = true|

目的地分配原则：

1. 先满足设施能力；
2. 再考虑距离；
3. 再考虑资源容量和等待时间；
4. 后续可加入成本、队列、优先级和服务区供给影响。

## 6. 运维行驶模型

如果 Robotaxi 不在目标 OpsCenter：

```text
Fleet Operation Task
  ↓
创建 / 绑定 RouteExecution
  ↓
RoutePlanning 生成前往目标 OpsCenter 的路径
  ↓
TimedOperation 推进行驶
  ↓
到达后反馈任务单
```

RouteExecution 仍然是 Robotaxi 行驶事实来源。Fleet Operations 不重新实现路径规划或行驶逻辑。

## 7. 统一资源分配模型

到达 OpsCenter 后，任务进入资源分配阶段：

|任务|资源|
|---|---|
|ReadinessCheckTask|Worker|
|CleaningTask|Worker / 清洁位|
|ChargingTask|充电桩 / 可选 Worker|
|MaintenanceTask|维修 Worker / 维修工位|
|FailureHandlingTask|诊断 Worker|
|RetirementTask|审批 / 资产处理资源|

没有资源时，任务保持等待状态，Robotaxi 保持不可运营。

## 8. 统一完成模型

|任务完成|Robotaxi 后续状态|
|---|---|
|ReadinessCheckTask 通过|可运营|
|CleaningTask 完成|可运营，并按待执行队列触发下一任务|
|ChargingTask 完成|可运营，并按待执行队列触发下一任务|
|MaintenanceTask 完成|当前阶段可运营；未来可配置准入复核|
|FailureHandlingTask 完成|当前阶段可运营|
|FailureHandlingTask 转维修|创建 / 排队 MaintenanceTask|
|FailureHandlingTask 转退役|创建 / 排队 RetirementTask|
|RetirementTask 完成|已退役|

## 9. 上层系统接入原则

1. 上层系统只负责触发业务动作或传入时间上下文。
2. 上层系统不得自建运维判断，必须调用 RobotaxiService 和对应任务单服务。
3. 运维任务的状态推进必须复用业务动作服务。
4. 任务作业耗时使用工作流时效配置或运维配置。
5. 行驶耗时继续使用 RouteExecution / TimedOperation。
6. 成本和指标消费任务单、状态时间线、RouteExecution 和资源使用事实。

## 10. 后续扩展

当 Fleet Operations 复杂度上升，可以扩展：

- 运维需求池；
- 资源预约；
- 充电桩模型；
- 清洁位 / 维修工位模型；
- 优先级队列；
- 救援 / 拖车任务；
- 运维排班；
- 车辆健康评分。
