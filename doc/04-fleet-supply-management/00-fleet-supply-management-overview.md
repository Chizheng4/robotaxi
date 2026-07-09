# 供应管理总览

## 1. 目的

供应管理负责把经营规划层输出的长期供给需求，转化为 Robotaxi 资产形成、分配、交付和准入的业务执行闭环。

它回答的问题是：

```text
长期规划需要多少 Robotaxi？
企业如何通过自有生产形成这些 Robotaxi？
生产完成后车辆分配到哪里？
车辆如何交付到运营中心？
车辆如何通过准入进入可运营车队？
```

供应管理不负责经营目标设定、需求画像、供给画像和长期需求预测；这些属于 `doc/00-business-planning/` 经营规划层。

## 2. 新经营框架下的位置

```text
经营规划层
  经营目标
  ↓
  需求画像
  ↓
  供给画像
  ↓
  长期需求预测

供应执行层
  车队生产计划
  ↓
  生产批次
  ↓
  Robotaxi 资产创建
  ↓
  车队分配策略 / 执行 / 结果
  ↓
  Robotaxi 交付单
  ↓
  运营准入任务
  ↓
  可运营车队
```

## 3. 当前供给模式

当前 v041 供应管理只设计两类供给路径。

|供给路径|定位|当前版本处理|
|---|---|---|
|自有生产供给|企业自有工厂或自有生产体系形成 Robotaxi|主路径，本轮重点设计|
|车主网络供给|拥有自动驾驶私家车的车主自愿加入运营网络|快速供给路径，保留规划边界，后续单独设计|

当前不进入主路径：

- 供应商采购单；
- 车商供应闭环；
- 泛化 `SupplyOrder`；
- 独立 `FleetEntry` 对象。

原因：本轮目标是先把自有生产到可运营车队的底层闭环打通，避免同时引入多种供给来源导致对象职责分散。以上旧概念如果后续继续保留，只能作为历史兼容或未来单独设计对象，不能与本轮自有生产主路径混用。

## 4. 核心对象

|对象|中文|职责|状态|
|---|---|---|---|
|FleetProductionPlan|车队生产计划|把长期需求预测结果转为生产数量和节奏|未来实现|
|ProductionBatch|生产批次|模拟真实生产执行，完成后调用 Robotaxi 服务创建车辆资产|未来实现|
|FleetAllocationStrategy|车队分配策略|定义生产完成车辆如何分配到 Zone / 运营中心|未来实现|
|FleetAllocationRun|车队分配执行|记录一次分配策略执行过程|未来实现|
|FleetAllocationResult|车队分配结果|记录某区域 / 运营中心分配到的车辆列表|未来实现|
|RobotaxiDeliveryOrder|Robotaxi 交付单|把一批 Robotaxi 物流交付到目标运营中心|未来实现|
|ReadinessCheckTask|运营准入任务|单台 Robotaxi 的运营准入检查任务|当前已有|

## 5. 核心闭环

```text
LongTermDemandForecastResult
  ↓ 创建
FleetProductionPlan
  ↓ 确认后生成
ProductionBatch
  ↓ 执行完成后调用 Robotaxi 服务
Robotaxi Assets
  ↓ 参与
FleetAllocationStrategy / Run / Result
  ↓ 创建
RobotaxiDeliveryOrder
  ↓ 完成交付后逐车触发
ReadinessCheckTask
  ↓ 检查通过
Robotaxi.availability_status = AVAILABLE
```

## 6. 服务边界

1. 生产计划不直接创建 Robotaxi，只生成生产批次。
2. 生产批次完成后调用 Robotaxi 服务创建车辆资产。
3. 车队分配策略不创建 Robotaxi，只决定已形成车辆去哪里。
4. 交付单不创建 Robotaxi，只更新已形成车辆的目标运营中心和当前位置。
5. 交付单可以包含多台 Robotaxi；交付完成后需要为每台 Robotaxi 触发一张运营准入任务。
6. 运营准入任务是一车一单，只负责判断车辆是否具备进入运营资格。
7. Robotaxi 是独立服务化对象，任何上游单据只能通过 Robotaxi 服务创建或更新它。

## 7. 状态与事件原则

供应执行层的所有单据必须先作为独立业务单据闭环：

- 拥有自己的状态机；
- 拥有自己的可执行动作；
- 状态变化记录自己的状态时间线；
- 通过事件或服务动作驱动下游对象；
- 不把下游对象状态混入本单据状态；
- 不默认接入模拟运行主路径。

## 8. 与其他模块边界

### 8.1 与经营规划

经营规划负责产生长期目标、需求和供给约束；供应管理只消费预测结果。

```text
经营规划：未来需要多少、何时需要
供应管理：如何形成这些车辆供给
```

### 8.2 与 Robotaxi

Robotaxi 保存车辆资产事实、位置、运营状态和生命周期。生产批次、交付单、准入任务只能通过服务动作影响 Robotaxi。

### 8.3 与运营管理

供应管理输出可运营车辆；运营管理消费可运营车辆进行投放、服务履约和运维保障。

## 9. 模拟运行边界

本轮文档只设计业务底层闭环，不接入模拟运行主路径。

未来如果要让模拟运行自动推进生产批次、交付单或准入任务，必须另行声明：

- 模拟接入对象；
- 模拟时间来源；
- 时间作业类型；
- 高速运行性能边界；
- 与业务服务的调用合同。

## 10. 当前文档结构

```text
04-fleet-supply-management/
  00-fleet-supply-management-overview.md
  01-fleet-production-plan.md
  02-production-batch.md
  03-fleet-allocation-strategy.md
  04-robotaxi-delivery-order.md
  05-readiness-check-task.md
```
