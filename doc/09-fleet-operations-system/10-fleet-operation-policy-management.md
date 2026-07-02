# 运维策略管理

## 1. 定位

运维策略管理用于把 Robotaxi 的健康事实、运营状态和人工触发转化为清洁、充电、维修、故障处理、退役任务单。

它属于 Fleet Operations 基础业务层，不属于模拟运行特有逻辑。模拟运行、真实自动化和人工触发都应该调用同一套策略与任务服务。

## 2. 对象

### 2.1 FleetOperationPolicy

运维策略配置，表示一类运维任务生成规则。

基础字段：

- `fleet_operation_policy_id`
- `policy_name`
- `policy_type`
- `target_task_type`
- `policy_status`
- `policy_version`
- `policy_parameters`
- `low_peak_start_time`
- `low_peak_end_time`
- `service_order_count_threshold`
- `service_duration_minutes_threshold`
- `battery_percent_threshold`
- `maintenance_due_days_threshold`
- `failure_severity_threshold`
- `retirement_score_threshold`
- `created_at`
- `updated_at`

### 2.2 FleetOperationPolicyRun

运维策略执行记录，表示一次策略扫描和任务生成结果。

基础字段：

- `fleet_operation_policy_run_id`
- `fleet_operation_policy_id`
- `policy_version`
- `policy_type`
- `target_task_type`
- `run_status`
- `trigger_type`
- `execution_scope`
- `policy_snapshot`
- `candidate_robotaxi_ids`
- `generated_task_ids`
- `no_action_reason`
- `result_summary`
- `started_at`
- `completed_at`

执行结果：

- `SUCCEEDED`：发现候选并成功生成任务；
- `PARTIALLY_SUCCEEDED`：部分候选生成任务，部分因已有未完成任务等原因跳过；
- `NO_ACTION`：策略正常执行，但没有符合条件的 Robotaxi；
- `FAILED`：策略服务异常或输入无效。

## 3. 触发方式

### 3.1 直接触发

当 Robotaxi 本身明确触发需要清洁、低电、故障等状态时，可以直接调用任务服务创建对应任务。

直接触发不需要策略扫描，但仍必须调用同一任务创建服务，避免人工入口和自动入口生成不同结构的任务。

### 3.2 策略触发

策略触发先扫描 Robotaxi 集合，识别候选车辆，再调用任务服务创建任务。

清洁策略第一阶段支持：

- 低峰时间窗口；
- 服务订单数量阈值；
- 服务时长阈值；
- Robotaxi 已标记为需要清洁。

充电策略第一阶段支持：

- 电量百分比阈值；
- 电量运营状态为低电或临界。

维修、故障处理、退役策略第一阶段优先消费 Robotaxi 当前健康字段。

## 4. 前端体验

运维策略管理包含：

1. 运维策略配置：展示策略名称、类型、目标任务、状态、版本、关键参数。
2. 运维策略执行：展示执行结果、触发方式、候选车辆、生成任务和策略快照。

五类运维任务页面必须提供人工触发策略按钮，并在最近任务事件中记录策略执行开始、无候选、任务创建成功、重复任务跳过和执行失败。

## 5. 工程原则

1. 策略服务只返回执行结果和更新后的对象，不在调用方不可见处直接写全局状态。
2. 任务创建统一走 `fleetOperationTaskService`。
3. 策略执行快照是不可变复盘证据，不依赖当前配置。
4. 新增策略参数、状态或枚举必须同步统一字段字典。
