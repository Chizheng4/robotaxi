# v038 Fleet Operations 运维策略与任务单体验迭代计划

## 1. 迭代目标

本次迭代把 Fleet Operations 从“有任务对象”推进到“可触发、可复盘、可配置、可统一展示”的基础业务闭环。

核心目标：

1. 建立运维策略管理，支持清洁、充电、维修、故障处理、退役五类任务的核心参数配置。
2. 策略执行必须生成执行记录，并保存本次使用的策略配置快照，避免后续配置变更后无法复盘。
3. 人工触发和自动触发必须调用同一套 Fleet Operations 任务创建服务，不允许前端页面各自拼任务。
4. 五类运维任务页面必须符合统一单据页面结构：状态分类、筛选、全局操作、表格、最近任务事件、右侧详情。
5. 本轮聚焦基础业务服务，不把运维策略做进模拟运行主循环。

## 2. 业务模型

### 2.1 运维策略配置

`FleetOperationPolicy` 是运维任务生成策略配置。

关键字段：

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

### 2.2 运维策略执行

`FleetOperationPolicyRun` 是每次策略执行记录。

关键字段：

- `fleet_operation_policy_run_id`
- `fleet_operation_policy_id`
- `policy_version`
- `policy_type`
- `target_task_type`
- `run_status`
- `trigger_type`
- `policy_snapshot`
- `candidate_robotaxi_ids`
- `generated_task_ids`
- `no_action_reason`
- `result_summary`

无候选 Robotaxi 时，策略执行结果为 `NO_ACTION`，不是失败。

### 2.3 任务触发

任务触发分为两类：

1. 直接触发：Robotaxi 已明确进入需要清洁、低电、故障等状态时，直接调用任务服务创建任务。
2. 策略触发：策略扫描 Robotaxi 健康事实、阈值和运营条件，筛出候选车辆，再调用同一任务服务创建任务。

## 3. 工程实现计划

### v038.0

状态：已完成。

计划：

1. 已更新规则：明确任务单页面事件区、人工/自动共用核心服务、策略执行快照。
2. 已更新 Fleet Operations 方案文档，新增运维策略管理方案。
3. 已新增 `fleetOperationPolicyService`，提供默认策略、策略执行、直接任务申请和快照。
4. 已更新字段字典、状态注册、前端对象映射和页面配置。
5. 已新增运维策略配置、运维策略执行页面。
6. 已为五类运维任务页增加统一策略触发按钮和最近任务事件区。
7. 已新增验证脚本，覆盖策略快照、无候选、候选建单、页面接入。
8. 已重新生成 bundle，并通过提交前检查和页面资源验证。

## 4. 验收标准

1. 五类运维任务页面均有可用的人工策略触发入口。
2. 策略执行结果保留配置快照，配置变更不影响历史执行复盘。
3. 无候选车辆时显示为无动作，不被当作任务创建失败。
4. 前端字段、状态、枚举全部通过统一字段字典中文展示。
5. `scripts/check-before-commit.sh` 通过。
