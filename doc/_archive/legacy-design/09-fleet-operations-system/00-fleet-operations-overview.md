# Fleet Operations System：车队运维闭环总览

## 1. 系统定位

Fleet Operations System 是 Robotaxi 运营体系中的车队运维闭环，核心职责是让 Robotaxi 在真实运营过程中持续恢复到可运营状态。

```text
Fleet Operations = 保证 Robotaxi 健康、补能、清洁、维修、准入和退出的业务闭环
```

它不负责需求预测、供给计划、订单匹配、服务履约和短期投放再平衡。

运维策略管理是 Fleet Operations 的触发层，用于把 Robotaxi 健康事实、人工操作和周期性扫描转化为清洁、充电、维修、故障处理、退役任务单。策略执行必须保留配置快照，便于复盘当时为什么生成或未生成任务。

## 2. 边界

### 2.1 Fleet Operations 负责

|范围|说明|
|---|---|
|运营准入|新车、维修后或重新上线前的可运营检查|
|清洁|车辆脏污、订单后清洁、周期清洁|
|充电|低电量、计划补能、运营中心充电|
|维修|硬件、传感器、软件、轮胎、电池等维修|
|故障处理|故障确认、故障分级、转维修或退役判断|
|退役报废|车辆生命周期结束和资产退出|
|运维行驶|Robotaxi 前往 OpsCenter 或运维资源点的行驶过程|

### 2.2 Fleet Operations 不负责

|不负责范围|所属系统|
|---|---|
|长期需求预测|Strategy System|
|长期供给来源、生产、供应商、车主网络接入|Supply System|
|短期投放、再平衡、待命分布|Supply System|
|客户订单匹配|Dispatch / Demand Order|
|客户服务履约|Service Order / Trip|
|经营指标计算|Operating Metrics|

DeploymentTask 属于 Supply System。它处理可运营 Robotaxi 在服务网络中的位置分布，不处理 Robotaxi 健康恢复。

## 3. 设计原则

1. Robotaxi 运维状态和业务任务分离。
2. Robotaxi 健康事实属于 Robotaxi 本体，统一由 RobotaxiService 判断。
3. 任务单表达下一步待执行动作，而不是只表达上一步结果。
4. Robotaxi 正在服务订单时，非致命运维任务可先创建并等待车辆可执行。
5. 运维任务需要先确定 OpsCenter / 资源位 / Worker，再执行作业。
6. Robotaxi 前往运维目的地时，复用现有 RouteExecution 运营行驶记录。
7. 运维完成后更新 Robotaxi 可运营状态；维修和故障恢复后可进入准入检查。
8. Fleet Operations 只消费调度和运营状态，不另写订单履约或投放逻辑。
9. 运维策略只负责识别候选与触发任务创建，实际任务创建必须复用统一任务服务。

## 4. 架构约束

Fleet Operations 是在现有 Robotaxi、OpsCenter、Worker、RouteExecution、TimedOperation 等基础能力之上的业务扩展，不应为了新增任务单轻易改动已有稳定闭环。

必须遵守：

1. 已经稳定运行的业务功能不轻易改动；必须改动时先确认影响边界。
2. 新任务单必须以服务化方式接入，不直接写死跨对象关系。
3. RobotaxiService 是 Robotaxi 可运营判断、健康判断和运维任务触发的统一入口。
4. 各任务单服务只负责自身生命周期，不替代 RobotaxiService 做全局状态判断。
5. 订单匹配、投放、运维、经营分析等上层模块只消费统一服务和业务事实，不重复实现判断逻辑。
6. 字段、状态、枚举进入实现阶段时必须同步统一字段字典、前端显示、后端字段和迭代规则。
7. 前端展示必须面向用户角色表达，不暴露内部枚举、临时字段或工程概念。
8. 架构优先保持简单清晰；只有当真实业务复杂度出现时，才增加新的对象、队列或资源模型。

## 5. 核心闭环

```text
Robotaxi 健康事实变化
  ↓
RobotaxiService 判断需要运维
  ↓
创建对应 Fleet Operation Task
  ↓
如车辆正在服务或行驶，任务等待车辆可执行
  ↓
车辆完成当前服务后变为不可运营或待运维
  ↓
分配 OpsCenter / 充电桩 / 清洁位 / 维修工位 / Worker
  ↓
创建 RouteExecution 前往运维目的地
  ↓
Robotaxi 到达 OpsCenter
  ↓
分配具体作业资源并开始作业
  ↓
提交作业结果
  ↓
恢复 AVAILABLE / 进入 PENDING_INSPECTION / 进入 RETIRED
```

## 6. 与现有系统关系

|现有对象|Fleet Operations 使用方式|
|---|---|
|Robotaxi|读取和更新运维状态、可用状态、当前位置、当前任务引用|
|OpsCenter|作为清洁、充电、维修、检查和退役处理设施|
|Worker|执行准入、清洁、维修、故障诊断等人工任务|
|RouteExecution|记录 Robotaxi 前往运维目的地的行驶过程|
|TimedOperation|作业耗时、充电耗时、维修耗时和到达识别|
|CostRecord|后续记录清洁、充电、维修、人力、折旧和停运成本|

## 7. 任务单目录

| 文档                                 | 对象                        | 说明                          |
| ---------------------------------- | ------------------------- | --------------------------- |
| `01-robotaxi-fleet-state-model.md`         | Robotaxi 运维状态模型           | 定义分层状态，避免单一 Robotaxi.status |
| `02-robotaxi-operational-health-model.md`  | Robotaxi 运营健康模型           | 定义健康事实、可运营判断和运维任务触发入口       |
| `03-readiness-check-task.md`               | ReadinessCheckTask        | 运营准入任务                      |
| `04-cleaning-task.md`                      | CleaningTask              | 清洁任务                        |
| `05-charging-task.md`                      | ChargingTask              | 充电任务                        |
| `06-maintenance-task.md`                   | MaintenanceTask           | 维修任务                        |
| `07-failure-handling-task.md`              | FailureHandlingTask       | 故障处理任务                      |
| `08-retirement-task.md`                    | RetirementTask            | 退役 / 报废任务                   |
| `09-fleet-operations-workflow.md`          | Fleet Operations Workflow | 统一触发、等待、目的地分配和行驶闭环          |

## 8. 不设置 FleetOperationRequirement 任务单

本阶段不新增单独的 `FleetOperationRequirement` 业务单据。

原因：

1. 运维需求通常可以直接由 Robotaxi 状态、报警、阈值或人工操作触发对应任务单；
2. 多一张需求单会让“需求单 → 任务单”链路过重，不符合最小运营闭环；
3. 第一阶段更重要的是把任务等待、目的地分配、行驶、资源分配和作业结果闭环做正确；
4. 后续如果需要复杂排队、合并、优先级优化，可再扩展为运维需求池或运维工单池。

因此，Fleet Operations 使用 `09-fleet-operations-workflow.md` 记录统一触发与调度规则。

## 9. 与未来供给和战略系统的关系

Fleet Operations 会影响供给可用量，但不决定供给策略。

```text
Fleet Operations 输出可运营车辆集合
Supply System 决定这些车辆如何投放和再平衡
Strategy System 决定长期需求、供给和增长方向
```

后续指标体系应基于 Fleet Operations 沉淀的数据计算：

- 可运营车辆数；
- 运维占用车辆数；
- 平均恢复时长；
- 清洁 / 充电 / 维修成本；
- 车辆故障率；
- 退役率；
- Fleet Availability。
