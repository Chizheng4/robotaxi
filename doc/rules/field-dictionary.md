# 统一字段字典

## 1. 目的

本文档集中维护 Robotaxi 运营模拟系统的字段英文名、中文名、字段性质和含义。

用途：

1. 代码、初始化数据和对象引用使用稳定的英文字段名；
2. 前端表格、详情栏、筛选项和操作上下文优先显示中文名；
3. 文档、初始化数据、校验规则和代码使用同一套字段定义；
4. 区分底层持久化字段、运行态字段、聚合展示字段和校验结果字段；
5. 字段新增、删除或改名时，应先更新本文档和对应对象文档，再修改代码。

字段性质：

|字段性质|含义|
|---|---|
|持久化字段|属于对象自身，应写入初始化数据或后续存储|
|运行态字段|运行过程中变化的对象状态，当前阶段可存在于前端运行态数据中|
|聚合展示字段|根据对象关系动态计算，用于前端解释上下文，不写入底层对象|
|校验结果字段|由初始化校验过程生成，不属于业务对象|
|兼容字段|兼容旧数据或旧前端展示，后续应逐步收敛|

---

## 1.1 Cost Model：运营成本模型

### 1.1.1 CostModelProfile：成本模型配置

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|cost_model_profile_id|成本模型配置编号|持久化字段|成本模型配置唯一编号|
|profile_name|配置名称|持久化字段|用户可识别的配置名称|
|profile_version|配置版本|持久化字段|配置版本号|
|profile_status|配置状态|持久化字段|DRAFT、ACTIVE、ARCHIVED|
|description|配置说明|持久化字段|配置适用场景说明|
|currency_code|币种|持久化字段|成本金额币种，默认 CNY|
|distance_cost_per_km|每公里距离成本|持久化字段|行驶距离对应的可变成本单价|
|electricity_price_per_kwh|每千瓦时电价|持久化字段|能源成本电价|
|energy_consumption_kwh_per_km|每公里耗电量|持久化字段|Robotaxi 行驶能耗估算参数|
|worker_cost_per_hour|作业人员每小时成本|持久化字段|Worker 人力成本小时单价|
|worker_cost_per_minute|作业人员每分钟成本|持久化字段|Worker 人力成本分钟单价，可由小时成本换算|
|robotaxi_purchase_cost|Robotaxi 购置成本|持久化字段|车辆购置成本|
|robotaxi_residual_value|Robotaxi 残值|持久化字段|车辆折旧残值|
|expected_lifetime_km|预计寿命里程|持久化字段|按公里折旧时使用的寿命里程|
|depreciation_method|折旧方式|持久化字段|PER_KM、PER_HOUR、PER_DAY|
|fixed_operating_cost_per_day|每日固定运营成本|持久化字段|固定运营成本预留配置|
|cost_parameter_rules|成本配置项|持久化字段|成本模型下的逐项可配置参数列表|
|created_at|创建时间|持久化字段|真实审计创建时间|
|updated_at|更新时间|持久化字段|真实审计更新时间|
|activated_at|生效时间|持久化字段|真实审计生效时间|

### 1.1.2 CostCalculationRun：成本计算运行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|cost_calculation_run_id|成本计算运行编号|持久化字段|成本计算批次唯一编号|
|simulation_run_id|模拟运行编号|持久化字段|来源 SimulationRun|
|cost_model_profile_id|成本模型配置编号|持久化字段|使用的成本模型配置|
|cost_model_profile_version|成本模型配置版本|持久化字段|使用的配置版本|
|cost_model_profile_snapshot|成本模型配置快照|持久化字段|本次计算使用的不可变配置快照|
|calculation_status|计算状态|运行态字段|QUEUED、CALCULATING、SUCCEEDED、PARTIALLY_SUCCEEDED、FAILED|
|calculation_progress_percent|计算进度（%）|运行态字段|成本计算进度|
|processed_object_count|已处理业务对象数|运行态字段|本次计算处理的业务对象数量|
|generated_cost_record_count|生成成本记录数|运行态字段|本次计算生成的 CostRecord 数量|
|total_cost_amount|总成本金额|运行态字段|本次计算得到的总成本|
|error_count|错误数量|运行态字段|本次计算错误数量|
|calculation_errors|计算错误列表|运行态字段|结构化错误列表|
|algorithm_version|计算算法版本|持久化字段|成本计算算法版本|
|started_at|开始时间|持久化字段|真实审计开始时间|
|completed_at|完成时间|持久化字段|真实审计完成时间|

### 1.1.3 CostParameterRule：成本配置项

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|cost_parameter_rule_id|成本配置项编号|持久化字段|成本配置项唯一编号|
|cost_parameter_key|成本配置键|持久化字段|对应成本模型字段|
|cost_parameter_name|成本配置名称|持久化字段|用户可读配置项名称|
|cost_parameter_group|成本配置分组|持久化字段|DISTANCE_COST、ENERGY_COST 等|
|parameter_unit|参数单位|持久化字段|CURRENCY_PER_KM、CURRENCY_PER_HOUR 等|
|configured_value|配置值|持久化字段|当前配置值|
|cost_parameter_status|成本配置状态|持久化字段|ENABLED、RESERVED、DISABLED|
|participates_in_calculation|参与计算|持久化字段|是否参与当前成本计算|
|display_order|显示顺序|持久化字段|前端展示顺序|

### 1.1.4 CostRecord：成本记录

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|cost_record_id|成本记录编号|持久化字段|成本明细唯一编号|
|simulation_run_id|模拟运行编号|持久化字段|来源 SimulationRun|
|cost_calculation_run_id|成本计算运行编号|持久化字段|来源成本计算批次|
|cost_model_profile_id|成本模型配置编号|持久化字段|使用的成本模型配置|
|source_object_type|来源对象类型|持久化字段|readinessTask、deploymentTask、cleaningTask、chargingTask、maintenanceTask、failureHandlingTask、retirementTask、routeExecution、serviceOrder、trip|
|source_object_id|来源对象编号|持久化字段|来源业务对象主键|
|source_page|来源页面|运行态字段|事件归属页面，用于最近任务事件按表单过滤，不作为业务状态|
|related_order_id|关联服务订单|持久化字段|关联服务订单编号，可为空|
|related_trip_id|关联履约行驶记录|持久化字段|关联 Trip 编号，可为空|
|related_route_execution_id|关联运营行驶记录|持久化字段|关联 RouteExecution 编号，可为空|
|deployment_task_id|运营投放任务编号|持久化字段|关联运营投放任务编号，可为空|
|robotaxi_id|Robotaxi 编号|持久化字段|关联车辆，可为空|
|worker_id|作业人员编号|持久化字段|关联 Worker，可为空|
|cost_type|成本类型|持久化字段|DISTANCE_COST、ENERGY_COST、LABOR_COST、ASSET_DEPRECIATION_COST、FIXED_OPERATING_COST|
|quantity|成本数量|持久化字段|距离、用电量或工时数量|
|quantity_unit|数量单位|持久化字段|km、kWh、hour、minute、day|
|unit_cost|单位成本|持久化字段|对应成本单价|
|cost_amount|成本金额|持久化字段|本条成本金额|
|currency_code|币种|持久化字段|成本币种|
|calculation_formula|计算公式|持久化字段|生成本成本记录的公式|
|calculation_basis|计算依据|持久化字段|来源字段、路径、时长等结构化依据|
|route_ids|路径编号列表|持久化字段|计算依据中使用的路径编号集合|
|distance_source|距离来源|持久化字段|成本计算使用的距离来源字段或对象|
|operation_seconds|操作耗时（秒）|持久化字段|人力成本计算使用的操作耗时|
|duration_source|时长来源|持久化字段|操作耗时的来源字段或状态时间线|
|simulation_cost_occurred_at|模拟成本发生时间|持久化字段|成本发生对应的模拟时间|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 1.1.5 RevenueRecord：收入记录

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|revenue_record_id|收入记录编号|持久化字段|收入明细唯一编号|
|simulation_run_id|模拟运行编号|持久化字段|来源 SimulationRun|
|revenue_calculation_run_id|收入生成运行编号|持久化字段|来源收入生成批次|
|service_order_id|服务订单编号|持久化字段|来源服务订单|
|customer_id|客户编号|持久化字段|关联客户，可为空|
|robotaxi_id|Robotaxi 编号|持久化字段|关联车辆，可为空|
|revenue_type|收入类型|持久化字段|RECEIVABLE_REVENUE、COLLECTED_REVENUE、UNRECEIVED_REVENUE|
|revenue_amount|收入金额|持久化字段|本条收入金额|
|currency_code|币种|持久化字段|收入币种|
|revenue_basis_field|收入依据字段|持久化字段|生成收入的来源金额字段|
|simulation_revenue_occurred_at|模拟收入发生时间|持久化字段|收入对应的模拟时间|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 1.1.6 RevenueCalculationRun：收入生成运行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|revenue_calculation_run_id|收入生成运行编号|持久化字段|收入生成批次唯一编号|
|simulation_run_id|模拟运行编号|持久化字段|来源 SimulationRun|
|calculation_status|计算状态|运行态字段|QUEUED、CALCULATING、SUCCEEDED、PARTIALLY_SUCCEEDED、FAILED|
|calculation_progress_percent|计算进度（%）|运行态字段|收入生成进度|
|processed_object_count|已处理业务对象数|运行态字段|本次处理服务订单数量|
|generated_revenue_record_count|生成收入记录数|运行态字段|本次生成 RevenueRecord 数量|
|total_receivable_revenue_amount|应收收入总额|运行态字段|本次应收收入总额|
|total_collected_revenue_amount|实收收入总额|运行态字段|本次实收收入总额|
|total_unreceived_revenue_amount|未收收入总额|运行态字段|本次未收收入总额|
|error_count|错误数量|运行态字段|本次错误数量|
|calculation_errors|计算错误列表|运行态字段|结构化错误列表|
|algorithm_version|计算算法版本|持久化字段|收入生成算法版本|
|started_at|开始时间|持久化字段|真实审计开始时间|
|completed_at|完成时间|持久化字段|真实审计完成时间|

### 1.1.7 业务对象成本与收入汇总字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|total_cost_amount|总成本金额|运行态字段|业务对象关联成本总额|
|distance_cost_amount|距离成本金额|运行态字段|业务对象关联距离成本|
|energy_cost_amount|能源成本金额|运行态字段|业务对象关联能源成本|
|labor_cost_amount|人力成本金额|运行态字段|业务对象关联人力成本|
|asset_depreciation_cost_amount|资产折旧成本金额|运行态字段|业务对象关联资产折旧成本|
|cost_calculated_at|成本计算时间|运行态字段|最近一次成本计算真实时间|
|cost_calculation_run_id|成本计算运行编号|运行态字段|最近一次成本计算批次|
|cost_records|成本明细|聚合展示字段|业务对象关联的成本记录明细|
|cost_calculation_status|成本计算状态|运行态字段|SimulationRun 上的成本计算状态|
|cost_calculation_progress_percent|成本计算进度（%）|运行态字段|SimulationRun 上的成本计算进度|
|active_cost_calculation_run_id|当前成本计算运行编号|运行态字段|SimulationRun 当前使用的成本计算批次|
|cost_result_summary|成本结果摘要|运行态字段|SimulationRun 成本计算汇总|
|cost_calculation_errors|成本计算错误|运行态字段|SimulationRun 成本计算错误|
|revenue_calculation_status|收入生成状态|运行态字段|SimulationRun 上的收入生成状态|
|revenue_calculation_progress_percent|收入生成进度（%）|运行态字段|SimulationRun 上的收入生成进度|
|active_revenue_calculation_run_id|当前收入生成运行编号|运行态字段|SimulationRun 当前使用的收入生成批次|
|total_receivable_revenue_amount|应收收入总额|运行态字段|SimulationRun 应收收入总额|
|total_collected_revenue_amount|实收收入总额|运行态字段|SimulationRun 实收收入总额|
|total_unreceived_revenue_amount|未收收入总额|运行态字段|SimulationRun 未收收入总额|
|revenue_calculated_at|收入生成时间|运行态字段|最近一次收入记录生成真实时间|
|revenue_calculation_run_id|收入生成运行编号|运行态字段|最近一次收入生成批次|
|revenue_records|收入明细|聚合展示字段|服务订单关联的收入记录明细|
|revenue_result_summary|收入结果摘要|运行态字段|SimulationRun 收入生成汇总|
|revenue_calculation_errors|收入生成错误|运行态字段|SimulationRun 收入生成错误|

### 1.1.8 成本与收入枚举中文

|英文值|中文名|用途|
|---|---|---|
|DISTANCE_COST|距离成本|成本类型|
|ENERGY_COST|能源成本|成本类型|
|LABOR_COST|人力成本|成本类型|
|ASSET_DEPRECIATION_COST|资产折旧成本|成本类型|
|FIXED_OPERATING_COST|固定运营成本|成本类型|
|RECEIVABLE_REVENUE|应收收入|收入类型|
|COLLECTED_REVENUE|实收收入|收入类型|
|UNRECEIVED_REVENUE|未收收入|收入类型|
|PER_KM|按公里折旧|折旧方式|
|PER_HOUR|按小时折旧|折旧方式|
|PER_DAY|按天折旧|折旧方式|
|OPERATING_COST_CALCULATION_STARTED|运营成本计算开始|模拟事件类型|
|OPERATING_COST_CALCULATION_COMPLETED|运营成本计算完成|模拟事件类型|
|OPERATING_COST_CALCULATION_FAILED|运营成本计算失败|模拟事件类型|
|COST_DISTANCE_MISSING|缺少成本距离|成本计算错误|
|COST_DURATION_MISSING|缺少成本时长|成本计算错误|
|COST_CALCULATION_FAILED|成本计算失败|成本计算错误|
|REVENUE_AMOUNT_MISSING|缺少收入金额|收入生成错误|
|REVENUE_CALCULATION_FAILED|收入生成失败|收入生成错误|
|REAL_TIME|真实时间|时间模式|
|SIMULATION_TIMED_OPERATION|模拟时间作业|触发来源|
|MANUAL_OR_SERVICE|人工或服务触发|触发来源|

## 1.1.9 任务优先级调度配置

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|config_id|配置编号|持久化字段|优先级配置唯一编号|
|config_status|配置状态|运行态字段|ACTIVE、DISABLED|
|priority_rank|优先级排序|持久化字段|各任务类型优先级数值映射。前端不再单独展示任务优先级配置页，由任务规划策略统一承载|
|interrupt_policy|中断策略|持久化字段|哪些任务类型的中断标记。来源为任务规划策略|
|allow_queuing|允许排队|持久化字段|是否允许任务排队。来源为任务规划策略|
|max_queue_size|最大排队数量|持久化字段|单个 Robotaxi 最大排队任务数。来源为任务规划策略|
|source_strategy_name|来源策略名称|运行态字段|兼容旧优先级配置读取时记录对应任务规划策略名称|

## 1.1.10 RobotaxiTaskPlanningStrategy：任务规划策略

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|robotaxi_task_planning_strategy_id|任务规划策略编号|持久化字段|策略唯一编号|
|strategy_name|策略名称|持久化字段|用户可识别的策略名称|
|strategy_status|策略状态|运行态字段|ACTIVE、DRAFT、ARCHIVED|
|planning_algorithm|规划算法|持久化字段|ROBOTAXI_STATE_TASK_PLANNING|
|priority_rank|优先级排序|持久化字段|各任务类型进入 Robotaxi 队列时的优先级；空闲 Robotaxi 视为当前队列长度为 0，同样由本策略裁决|
|queue_policy|排队策略|持久化字段|订单、投放、运维占用中是否允许内部任务排队及最大队列长度；当前无任务和有排队任务属于同一规划策略输入|
|allow_queue_when_service_order_active|服务订单中允许排队|持久化字段|Robotaxi 当前执行服务订单时是否允许内部运维任务排队|
|allow_queue_when_deployment_active|投放任务中允许排队|持久化字段|Robotaxi 当前执行投放任务时是否允许内部运维任务排队|
|allow_queue_when_fleet_operation_active|运维任务中允许排队|持久化字段|Robotaxi 当前执行运维任务时是否允许其他兼容运维任务排队|
|phase_rules|阶段规则|持久化字段|FIRST_ADMISSION、ADMISSION_REMEDIATION、READY_NOT_DEPLOYED、ACTIVE_OPERATION、RETIRED 各阶段允许的任务类型|
|compatibility_rules|兼容规则|持久化字段|同一 Robotaxi 已有未完成运维任务时，新任务类型是否可共存|
|failure_trigger_policy|故障触发策略|持久化字段|故障任务触发限制，如 MOVING_ONLY|
|external_assignment_queue_policy|外部分配队列策略|持久化字段|外部订单/投放分配必须通过任务规划策略裁决，不能由独立任务调度策略再次决定|
|created_at|创建时间|持久化字段|真实审计创建时间|
|updated_at|更新时间|持久化字段|真实审计更新时间|

### RobotaxiTaskPlanningRun：任务规划执行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|robotaxi_task_planning_run_id|任务规划执行编号|持久化字段|任务规划执行唯一编号|
|robotaxi_task_planning_strategy_id|任务规划策略编号|持久化字段|来源任务规划策略|
|strategy_name|策略名称|持久化字段|执行时使用的策略名称|
|robotaxi_id|Robotaxi 编号|持久化字段|本次规划裁决的 Robotaxi|
|requested_assignment_type|请求分配类型|持久化字段|SERVICE_ORDER、DEPLOYMENT_TASK、FLEET_OPERATION_TASK 等|
|requested_task_type|请求任务类型|持久化字段|具体业务任务类型，可为空|
|trigger_source|触发来源|持久化字段|真实触发本次规划的来源，页面预览不生成执行|
|trigger_object_type|触发对象类型|持久化字段|触发对象类型，如 serviceOrder、fleetOperationPolicy|
|trigger_object_id|触发对象编号|持久化字段|触发对象编号|
|run_status|执行状态|运行态字段|SUCCEEDED、REJECTED、FAILED|
|planning_decision|规划决策|运行态字段|CREATE_NOW、QUEUE、REJECT 等|
|decision_reason|决策原因|运行态字段|本次规划裁决原因|
|composite_state|综合状态|持久化字段|本次规划使用的 Robotaxi 综合状态快照|
|strategy_snapshot|策略快照|持久化字段|本次执行使用的任务规划策略配置快照|
|input_snapshot|输入快照|持久化字段|本次执行关键输入|
|output_snapshot|输出快照|持久化字段|本次执行关键输出|
|created_at|创建时间|持久化字段|真实审计创建时间|

### RobotaxiTaskPlanningResult：任务规划结果

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|robotaxi_task_planning_result_id|任务规划结果编号|持久化字段|任务规划结果唯一编号|
|robotaxi_task_planning_run_id|任务规划执行编号|持久化字段|来源任务规划执行|
|robotaxi_task_planning_strategy_id|任务规划策略编号|持久化字段|来源任务规划策略|
|robotaxi_id|Robotaxi 编号|持久化字段|本次规划裁决的 Robotaxi|
|requested_assignment_type|请求分配类型|持久化字段|SERVICE_ORDER、DEPLOYMENT_TASK、FLEET_OPERATION_TASK 等|
|requested_task_type|请求任务类型|持久化字段|具体业务任务类型，可为空|
|decision_result|决策结果|运行态字段|PLANNING_ALLOWED、PLANNING_QUEUED、PLANNING_REJECTED、PLANNING_FAILED|
|planning_decision|规划决策|运行态字段|CREATE_NOW、QUEUE、REJECT 等|
|decision_reason|决策原因|运行态字段|本次规划裁决原因|
|message|消息|运行态字段|面向运营人员的裁决说明|
|queue_sequence|排队序号|运行态字段|任务进入 Robotaxi 待执行队列后的序号，按策略优先级和已有队列计算|
|queue_entry|队列项|运行态字段|进入队列时的队列项快照|
|queue_snapshot|队列快照|运行态字段|本次任务规划后完整重排队列快照，队列序号必须唯一连续|
|composite_state|综合状态|持久化字段|本次规划使用的 Robotaxi 综合状态快照|
|created_at|创建时间|持久化字段|真实审计创建时间|

### Robotaxi 综合状态字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|lifecycle_stage|生命周期阶段|运行态字段|PRE_OPERATION、IN_OPERATION、RETIRED|
|operation_phase|运营阶段|运行态字段|FIRST_ADMISSION、ADMISSION_REMEDIATION、READY_NOT_DEPLOYED、ACTIVE_OPERATION、RETIRED|
|operation_status|运营状态|运行态字段|面向运营分配的可运营/不可运营门槛|
|vehicle_motion_state|车辆空间状态|运行态字段|车辆物理空间状态，如停车中、临停中、行驶中|
|current_assignment_state|当前占用状态|运行态字段|NONE、READINESS_TASK、DEPLOYMENT_TASK、SERVICE_ORDER、FLEET_OPERATION_TASK|
|current_assignment|当前占用对象|运行态字段|当前绑定的订单或任务对象摘要|
|current_task_priority|当前任务优先级|运行态字段|当前执行任务在任务规划策略中的优先级|
|has_operational_history|已有运营历史|运行态字段|是否已经有过投放或服务订单运营历史|
|has_readiness_history|已有准入历史|运行态字段|是否已经有过运营准入任务|
|open_fleet_task_count|未完成运维任务数|运行态字段|该 Robotaxi 当前未终态运维任务数量|
|pending_queue_size|待执行队列数量|运行态字段|该 Robotaxi pending_task_queue 中的任务数量|
|next_pending_task|下一排队任务|运行态字段|按 queue_sequence 排序后的下一个待执行任务|
|composite_state|综合状态|运行态字段|任务规划策略裁决时使用的综合状态快照|
|planning_decision|规划决策|运行态字段|任务规划策略输出的决策|
|allowed|是否允许|运行态字段|任务规划策略是否允许本次分配|
|decision|决策|运行态字段|任务规划策略输出决策|
|reason|原因|运行态字段|任务规划策略输出原因|
|priority|优先级|运行态字段|进入 Robotaxi 队列时使用的任务优先级|

### Robotaxi 任务规划枚举中文

|英文值|中文名|用途|
|---|---|---|
|ROBOTAXI_STATE_TASK_PLANNING|Robotaxi 综合状态任务规划|规划算法|
|PRE_OPERATION|运营预备阶段|生命周期阶段|
|IN_OPERATION|运营阶段|生命周期阶段|
|FIRST_ADMISSION|首次准入阶段|运营阶段|
|ADMISSION_REMEDIATION|准入修复阶段|运营阶段|
|READY_NOT_DEPLOYED|准入后待投放|运营阶段|
|ACTIVE_OPERATION|持续运营阶段|运营阶段|
|UNKNOWN|未知|车辆空间状态|
|NONE|无占用|当前占用状态|
|READINESS_TASK|运营准入任务|当前占用状态 / 分配类型|
|SERVICE_ORDER|服务订单|当前占用状态 / 分配类型|
|DEPLOYMENT_TASK|运营投放任务|当前占用状态 / 分配类型|
|FLEET_OPERATION_TASK|运维任务|当前占用状态 / 分配类型|
|RETIREMENT_ACTION|退役生命周期动作|分配类型|
|CREATE_NOW|立即创建|规划决策|
|QUEUE|进入队列|规划决策|
|REJECT|拒绝|规划决策|
|PLANNING_ALLOWED|允许执行|任务规划结果|
|PLANNING_QUEUED|已进入队列|任务规划结果|
|PLANNING_REJECTED|已拒绝|任务规划结果|
|PLANNING_FAILED|规划失败|任务规划结果|
|SUCCEEDED|规划成功|任务规划执行状态|
|REJECTED|规划拒绝|任务规划执行状态|
|MERGE|合并|规划决策|
|UPGRADE|升级|规划决策|
|INTERRUPT|中断当前任务|规划决策|
|MOVING_ONLY|仅行驶或运营异常触发|故障触发策略|
|INTERNAL_QUEUE_FIRST|内部任务队列优先|外部分配队列策略|
|WAIT_CURRENT_ASSIGNMENT_COMPLETION|等待当前任务完成|任务规划原因|
|ROBOTAXI_READY_FOR_FLEET_OPERATION_TASK|允许创建并执行运维任务|任务规划原因|
|ROBOTAXI_READY_FOR_EXTERNAL_ASSIGNMENT|允许分配外部运营任务|任务规划原因|
|FIRST_ADMISSION_ALLOWED|允许创建运营准入任务|任务规划原因|
|ROBOTAXI_RETIRED|Robotaxi 已退役|任务规划原因|
|RETIREMENT_IS_LIFECYCLE_ACTION|退役属于生命周期动作|任务规划原因|
|UNKNOWN_ASSIGNMENT_TYPE|未知分配类型|任务规划原因|
|INVALID_ROBOTAXI|Robotaxi 不存在|任务规划原因|
|ROBOTAXI_ALREADY_HAS_READINESS_TASK|Robotaxi 已有准入任务|任务规划原因|
|ROBOTAXI_NOT_IN_ADMISSION_PHASE|Robotaxi 不在准入阶段|任务规划原因|
|ROBOTAXI_NOT_OPERATIONALLY_AVAILABLE|Robotaxi 当前不可运营|任务规划原因|
|ROBOTAXI_ALREADY_ASSIGNED|Robotaxi 当前已有执行任务|任务规划原因|
|ROBOTAXI_INTERNAL_TASK_QUEUE_FIRST|内部任务队列优先|任务规划原因|
|ROBOTAXI_NEEDS_CLEANING|Robotaxi 需要清洁|任务规划原因|
|ROBOTAXI_NEEDS_CHARGING|Robotaxi 需要充电|任务规划原因|
|ROBOTAXI_NEEDS_MAINTENANCE|Robotaxi 需要维修|任务规划原因|
|ROBOTAXI_HAS_FAILURE|Robotaxi 存在故障|任务规划原因|
|ROBOTAXI_NOT_ADMITTED_FOR_SERVICE_ORDER|Robotaxi 尚未完成准入|任务规划原因|
|MISSING_FLEET_OPERATION_TASK_TYPE|缺少运维任务类型|任务规划原因|
|FIRST_ADMISSION_ONLY_ALLOWS_READINESS|首次准入阶段仅允许准入任务|任务规划原因|
|READY_NOT_DEPLOYED_HAS_NO_FLEET_OPERATION_NEED|准入后未投放车辆无需普通运维|任务规划原因|
|TASK_TYPE_NOT_ALLOWED_IN_PHASE|当前阶段不允许该任务类型|任务规划原因|
|FAILURE_HANDLING_REQUIRES_ACTIVE_OPERATION_EXCEPTION|故障处理需要行驶或运营异常触发|任务规划原因|
|INCOMPATIBLE_FLEET_OPERATION_TASK_EXISTS|存在不兼容运维任务|任务规划原因|


## 1.2 Operating Metrics：经营指标系统

### 1.2.1 MetricDefinition：指标定义

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|metric_definition_id|指标定义编号|持久化字段|稳定唯一指标编号|
|metric_name_cn|指标中文名|持久化字段|前端展示中文名称|
|metric_name_en|指标英文名|持久化字段|指标英文业务名称|
|metric_layer|指标层级|持久化字段|STATE、PROCESS、OUTCOME、QUALITY|
|metric_domain|指标领域|持久化字段|DEMAND、ASSET、FINANCE、SERVICE、EFFICIENCY 等|
|business_definition|业务定义|持久化字段|指标回答的经营问题|
|calculation_formula|计算公式|持久化字段|使用正式字段描述的计算公式|
|source_objects|来源对象|持久化字段|指标消费的业务对象或事实对象|
|source_fields|来源字段|持久化字段|指标消费的正式字段|
|time_basis|时间口径|持久化字段|SIMULATION_TIME（模拟时间）|
|default_time_window|默认时间窗|持久化字段|SIMULATION_RUN（单次模拟运行）、DAY、HOUR、10_MINUTE|
|zero_denominator_rule|零分母规则|持久化字段|NULL_WITH_REASON（按原因置空）|
|supported_dimensions|支持维度|持久化字段|simulation_run_id、service_area_id 等|
|data_readiness|数据就绪度|持久化字段|READY、DERIVABLE、MISSING_DATA|
|display_unit|展示单位|持久化字段|currency、percent、count、second、minute、km|
|higher_is_better|越高越好|持久化字段|指标趋势解释方向|
|metric_status|指标状态|持久化字段|ACTIVE、RESERVED、DISABLED|
|definition_version|定义版本|持久化字段|指标定义版本|

### 1.2.2 MetricCalculationRun：指标计算运行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|metric_calculation_run_id|指标计算运行编号|持久化字段|指标计算批次唯一编号|
|metric_scope_type|指标统计范围|持久化字段|SIMULATION_RUN、OPERATING_PERIOD|
|metric_period_type|指标统计周期|持久化字段|SIMULATION_RUN、ALL、LATEST_DAY、LATEST_7_DAYS|
|metric_period_label|指标统计周期显示|运行态字段|前端展示的统计周期范围|
|simulation_run_id|模拟运行编号|兼容字段|单次模拟运行计算来源；经营周期计算为空|
|simulation_run_ids|来源模拟运行编号列表|持久化字段|经营周期纳入统计的模拟运行集合|
|simulation_timeline_id|模拟时间轴编号|持久化字段|来源连续模拟时间轴|
|calculation_status|计算状态|运行态字段|QUEUED、CALCULATING、SUCCEEDED、PARTIALLY_SUCCEEDED、FAILED|
|calculation_progress_percent|计算进度（%）|运行态字段|指标计算进度|
|metric_definition_count|指标定义数|运行态字段|本次纳入计算的指标定义数量|
|generated_metric_observation_count|生成指标观测数|运行态字段|生成 MetricObservation 数量|
|error_count|错误数量|运行态字段|指标质量或计算错误数量|
|calculation_errors|计算错误列表|运行态字段|结构化错误列表|
|algorithm_version|计算算法版本|持久化字段|指标计算算法版本|
|started_at|开始时间|持久化字段|真实审计开始时间|
|completed_at|完成时间|持久化字段|真实审计完成时间|

### 1.2.3 MetricObservation：指标观测

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|metric_observation_id|指标观测编号|持久化字段|指标观测唯一编号|
|metric_calculation_run_id|指标计算运行编号|持久化字段|来源指标计算批次|
|metric_definition_id|指标定义编号|持久化字段|来源指标定义|
|metric_scope_type|指标统计范围|持久化字段|SIMULATION_RUN、OPERATING_PERIOD|
|metric_period_type|指标统计周期|持久化字段|SIMULATION_RUN、ALL、LATEST_DAY、LATEST_7_DAYS|
|metric_period_label|指标统计周期显示|运行态字段|前端展示的统计周期范围|
|simulation_run_id|模拟运行编号|兼容字段|单次模拟运行计算来源；经营周期计算为空|
|simulation_run_ids|来源模拟运行编号列表|持久化字段|经营周期纳入统计的模拟运行集合|
|simulation_timeline_id|模拟时间轴编号|持久化字段|来源连续模拟时间轴|
|window_type|时间窗类型|持久化字段|SIMULATION_RUN、OPERATING_PERIOD、DAY、HOUR、10_MINUTE|
|window_start_seconds|窗口开始秒|持久化字段|绝对模拟秒窗口开始|
|window_end_seconds|窗口结束秒|持久化字段|绝对模拟秒窗口结束|
|window_label|窗口显示名|运行态字段|前端可读时间窗|
|dimension_type|维度类型|持久化字段|GLOBAL、SIMULATION_DAY、SIMULATION_HOUR、DEMAND_TIME_SEGMENT、SERVICE_AREA、ROBOTAXI、ORDER_CHANNEL|
|dimension_id|维度编号|持久化字段|具体维度值|
|metric_value|指标值|运行态字段|指标计算结果|
|metric_unit|指标单位|运行态字段|currency、percent、count 等|
|numerator_value|分子值|运行态字段|比率指标分子|
|denominator_value|分母值|运行态字段|比率指标分母|
|quality_status|质量状态|运行态字段|PASS、WARN、FAIL|
|quality_reason|质量说明|运行态字段|指标质量解释|
|source_record_count|来源记录数|运行态字段|参与计算的来源记录数|
|source_object_refs|来源对象引用|运行态字段|可下钻来源对象|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 1.2.4 SimulationRun 指标汇总字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|metric_calculation_status|指标计算状态|运行态字段|SimulationRun 上的指标计算状态|
|metric_calculation_progress_percent|指标计算进度（%）|运行态字段|SimulationRun 上的指标计算进度|
|active_metric_calculation_run_id|当前指标计算运行编号|运行态字段|当前使用的指标计算批次|
|metric_result_summary|指标结果摘要|运行态字段|指标计算结果摘要|
|metric_calculation_errors|指标计算错误|运行态字段|指标计算质量问题或错误|

### 1.2.5 指标枚举中文

|英文值|中文名|用途|
|---|---|---|
|STATE|状态指标|指标层级|
|PROCESS|过程指标|指标层级|
|OUTCOME|结果指标|指标层级|
|QUALITY|质量指标|指标层级|
|FINANCE|财务|指标领域|
|SERVICE|服务|指标领域|
|EFFICIENCY|效率|指标领域|
|MATCHING|匹配|指标领域|
|ROUTING|路径|指标领域|
|SUPPLY|供给|指标领域|
|DEMAND|需求|指标领域|
|QUALITY|质量|指标领域|
|ACTIVE|启用|指标状态|
|RESERVED|预留|指标状态|
|DISABLED|停用|指标状态|
|READY|可直接计算|数据就绪度|
|DERIVABLE|可推导|数据就绪度|
|MISSING_DATA|缺少数据|数据就绪度|
|SIMULATION_RUN|模拟运行|时间窗类型|
|OPERATING_PERIOD|经营周期|指标统计范围 / 时间窗类型|
|ALL|全量经营周期|指标统计周期|
|LATEST_DAY|最近 1 个模拟日|指标统计周期|
|LATEST_7_DAYS|最近 7 个模拟日|指标统计周期|
|DAY|模拟日|时间窗类型|
|HOUR|小时|时间窗类型|
|10_MINUTE|10 分钟|时间窗类型|
|GLOBAL|全局|维度类型|
|SERVICE_AREA|服务区|维度类型|
|ROBOTAXI|Robotaxi|维度类型|
|ORDER_CHANNEL|订单渠道|维度类型|
|PASS|通过|质量状态|
|WARN|提示|质量状态|
|FAIL|失败|质量状态|
|currency|金额|指标单位 / 展示单位|
|percent|比例|指标单位 / 展示单位|
|count|数量|指标单位 / 展示单位|
|second|秒|指标单位 / 展示单位|
|km|公里|指标单位 / 展示单位|

### 1.1.9 工作流状态边枚举中文

|英文值|中文名|用途|
|---|---|---|
|READINESS_ASSIGN|准入任务分配状态边|工作流状态边|
|READINESS_START|准入检查开始状态边|工作流状态边|
|READINESS_PASS|准入检查通过状态边|工作流状态边|
|READINESS_FAIL|准入检查不通过状态边|工作流状态边|
|ROUTE_MOVE|运营行驶推进状态边|工作流状态边|
|ROUTE_ARRIVAL|运营到达确认状态边|工作流状态边|
|ROUTE_ARRIVAL_ABNORMAL|运营异常到达确认状态边|工作流状态边|
|DEPLOYMENT_PLAN|投放路径规划投影状态边|工作流状态边|
|DEPLOYMENT_MOVE|投放行驶推进投影状态边|工作流状态边|
|DEPLOYMENT_ARRIVAL|投放到达确认投影状态边|工作流状态边|
|DEPLOYMENT_ARRIVAL_ABNORMAL|投放异常到达确认投影状态边|工作流状态边|
|ORDER_PRICE|订单估价状态边|工作流状态边|
|ORDER_CALL|订单呼叫 Robotaxi 状态边|工作流状态边|
|ORDER_MATCH|订单匹配状态边|工作流状态边|
|ORDER_PICKUP_ARRIVAL|订单接驾到达投影状态边|工作流状态边|
|ORDER_BOARD|订单客户上车投影状态边|工作流状态边|
|ORDER_DESTINATION_PLAN|订单送达路径规划投影状态边|工作流状态边|
|ORDER_DESTINATION_ARRIVAL|订单到达目的地投影状态边|工作流状态边|
|ORDER_DROPOFF|订单客户下车投影状态边|工作流状态边|
|ORDER_SETTLE|订单结算状态边|工作流状态边|
|ORDER_PAY|订单支付状态边|工作流状态边|
|TRIP_PICKUP_PLAN|履约接驾路径规划状态边|工作流状态边|
|TRIP_PICKUP_MOVE|履约接驾行驶状态边|工作流状态边|
|TRIP_BOARD|履约客户上车状态边|工作流状态边|
|TRIP_DESTINATION_PLAN|履约送达路径规划状态边|工作流状态边|
|TRIP_DESTINATION_MOVE|履约送达行驶状态边|工作流状态边|
|TRIP_DROPOFF|履约客户下车状态边|工作流状态边|
|CLEANING_DESTINATION_ASSIGN|清洁分配目的站点状态边|工作流状态边|
|CLEANING_ROUTE_PLAN|清洁路径规划结果状态边|工作流状态边|
|CLEANING_ROUTE_MOVE|清洁行驶进展结果状态边|工作流状态边|
|CLEANING_ROUTE_ARRIVAL|清洁到达结果状态边|工作流状态边|
|CLEANING_WORKER_ASSIGN|清洁分配 Worker 状态边|工作流状态边|
|CLEANING_WORK_START|清洁开始状态边|工作流状态边|
|CLEANING_WORK_COMPLETE|清洁完成状态边|工作流状态边|
|CHARGING_DESTINATION_ASSIGN|充电分配目的站点状态边|工作流状态边|
|CHARGING_ROUTE_PLAN|充电路径规划结果状态边|工作流状态边|
|CHARGING_ROUTE_MOVE|充电行驶进展结果状态边|工作流状态边|
|CHARGING_ROUTE_ARRIVAL|充电到达结果状态边|工作流状态边|
|CHARGING_WORKER_ASSIGN_CONNECT|充电接入分配 Worker 状态边|工作流状态边|
|CHARGING_CONNECT|接入充电头状态边|工作流状态边|
|CHARGING_COMPLETE|充电完成状态边|工作流状态边|
|CHARGING_WORKER_ASSIGN_DISCONNECT|断开电源分配 Worker 状态边|工作流状态边|
|CHARGING_DISCONNECT|断开电源状态边|工作流状态边|
|MAINTENANCE_DESTINATION_ASSIGN|维修分配目的站点状态边|工作流状态边|
|MAINTENANCE_ROUTE_PLAN|维修路径规划结果状态边|工作流状态边|
|MAINTENANCE_ROUTE_MOVE|维修行驶进展结果状态边|工作流状态边|
|MAINTENANCE_ROUTE_ARRIVAL|维修到达结果状态边|工作流状态边|
|MAINTENANCE_WORKER_ASSIGN|维修分配 Worker 状态边|工作流状态边|
|MAINTENANCE_WORK_START|维修开始状态边|工作流状态边|
|MAINTENANCE_WORK_COMPLETE|维修完成状态边|工作流状态边|
|FAILURE_DIAGNOSIS_ASSIGN|故障诊断分配 Worker 状态边|工作流状态边|
|FAILURE_DIAGNOSIS_COMPLETE|故障诊断完成状态边|工作流状态边|
|RETIREMENT_APPROVE_TO_DESTINATION|退役确认后分配目的站点状态边|工作流状态边|
|RETIREMENT_APPROVE_AT_CENTER|退役确认后直接处理状态边|工作流状态边|
|RETIREMENT_REJECT|退役驳回状态边|工作流状态边|
|RETIREMENT_DESTINATION_ASSIGN|退役分配目的站点状态边|工作流状态边|
|RETIREMENT_ROUTE_PLAN|退役路径规划结果状态边|工作流状态边|
|RETIREMENT_ROUTE_MOVE|退役行驶进展结果状态边|工作流状态边|
|RETIREMENT_ROUTE_ARRIVAL|退役到达结果状态边|工作流状态边|
|RETIREMENT_PROCESS_COMPLETE|退役处理完成状态边|工作流状态边|

---

## 2. Map：地图

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|map_id|地图编号|持久化字段|地图唯一编号|
|map_name|地图名称|持久化字段|地图名称|
|map_width_m|地图宽度（米）|持久化字段|地图宽度|
|map_height_m|地图高度（米）|持久化字段|地图高度|
|cell_size_m|网格边长（米）|持久化字段|Cell 边长|
|grid_cols|网格列数|持久化字段|地图横向 Cell 数量|
|grid_rows|网格行数|持久化字段|地图纵向 Cell 数量|
|total_cells|网格总数|持久化字段|Cell 总数|
|coordinate_type|坐标类型|持久化字段|模拟地图使用的坐标体系|

---

## 3. Cell：网格单元

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|cell_id|网格编号|持久化字段|Cell 唯一编号|
|map_id|地图编号|持久化字段|所属 Map|
|row|行号|持久化字段|所在网格行号|
|col|列号|持久化字段|所在网格列号|
|base_cell_type|基础空间类型|持久化字段|Cell 的互斥基础类型|
|traversable|是否可通行|持久化字段|车辆是否可以通行|

### 3.1 Cell 聚合展示字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|related_map|所属地图|聚合展示字段|该 Cell 所属 Map|
|related_zones|所属运营区域|聚合展示字段|覆盖该 Cell 的 Zone / SubZone 列表|
|related_roads|所属道路|聚合展示字段|通过 RoadSegment 反查得到的 Road 列表|
|related_road_segments|所属道路片段|聚合展示字段|覆盖该 Cell 的 RoadSegment 列表|
|related_road_nodes|道路节点|聚合展示字段|位于该 Cell 的 RoadNode 列表|
|related_service_areas|服务区域|聚合展示字段|覆盖该 Cell 的 ServiceArea 列表|
|related_places|地点 / 需求来源|聚合展示字段|覆盖该 Cell 的 Place 列表|
|related_ops_centers|关联运营中心|聚合展示字段|覆盖该 Cell 的 OpsCenter 列表|
|related_robotaxis|停放 Robotaxi|聚合展示字段|当前位于该 Cell 的 Robotaxi 列表|
|operational_space_coverage|运营空间覆盖|聚合展示字段|说明该 Cell 是否被运营中心等运营设施覆盖|
|service_eligibility|服务能力判断|聚合展示字段|说明该 Cell 是否可作为服务区域，以及原因|

---

## 4. Road：道路

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|road_id|道路编号|持久化字段|道路唯一编号|
|map_id|地图编号|持久化字段|所属 Map|
|road_name|道路名称|持久化字段|道路名称|
|road_type|道路类型|持久化字段|道路等级或道路场景类型|
|road_status|道路状态|持久化字段|道路整体状态|
|road_segment_ids|道路片段列表|持久化字段|包含的 RoadSegment 列表|

---

## 5. RoadNode：道路节点

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|road_node_id|道路节点编号|持久化字段|道路节点唯一编号|
|map_id|地图编号|持久化字段|所属 Map|
|cell_id|所在网格编号|持久化字段|所在 Cell|
|row|行号|持久化字段|所在 Cell 行号|
|col|列号|持久化字段|所在 Cell 列号|
|x|模拟坐标 X|持久化字段|模拟坐标 x|
|y|模拟坐标 Y|持久化字段|模拟坐标 y|
|node_type|节点类型|持久化字段|道路节点类型|
|node_status|节点状态|持久化字段|道路节点状态|

---

## 6. RoadSegment：道路片段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|road_segment_id|道路片段编号|持久化字段|道路片段唯一编号|
|road_id|道路编号|持久化字段|所属 Road|
|map_id|地图编号|持久化字段|所属 Map|
|start_node_id|起点道路节点|持久化字段|起点 RoadNode|
|end_node_id|终点道路节点|持久化字段|终点 RoadNode|
|cell_ids|覆盖道路网格|兼容字段|覆盖的 ROAD Cell 列表，当前阶段保留兼容|
|cell_sequence|有序道路网格|持久化字段|按通行顺序排列的 ROAD Cell 列表|
|distance_m|道路片段长度（米）|持久化字段|道路片段长度|
|total_distance_km|道路片段长度（公里）|持久化字段|道路片段长度，公里单位|
|direction|通行方向|持久化字段|cell_sequence 默认方向|
|allowed_direction|允许通行方向|持久化字段|允许正向、反向、双向或关闭|
|speed_limit_kmh|限速（公里 / 小时）|持久化字段|道路限速|
|traversable|是否可通行|持久化字段|车辆是否可通行|
|segment_status|道路片段状态|持久化字段|道路片段状态|
|service_area_ids|服务区域列表|持久化字段|关联的 ServiceArea 列表|

---

## 7. Place：地点 / 需求来源

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|place_id|地点编号|持久化字段|地点唯一编号|
|map_id|地图编号|持久化字段|所属 Map|
|place_name|地点名称|持久化字段|地点名称|
|place_type|地点类型|持久化字段|现实场景或土地使用类型|
|place_status|地点状态|持久化字段|地点状态|
|cell_ids|覆盖地点网格|持久化字段|覆盖的 PLACE Cell 列表|
|demand_weight|需求权重|持久化字段|相对需求强度|
|peak_pattern|需求高峰模式|持久化字段|需求时间分布模式|
|nearby_service_area_ids|附近服务区域列表|持久化字段|附近可服务区域列表|

---

## 8. ServiceArea：服务区域

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|service_area_id|服务区域编号|持久化字段|服务区域唯一编号|
|map_id|地图编号|持久化字段|所属 Map|
|service_area_name|服务区域名称|持久化字段|服务区域名称|
|service_area_type|服务区域类型|持久化字段|主要服务区用途|
|service_area_status|服务区域状态|持久化字段|服务区域当前状态|
|cell_ids|覆盖道路网格|持久化字段|服务区覆盖的 ROAD Cell 列表|
|road_segment_ids|关联道路片段列表|持久化字段|关联 RoadSegment 列表|
|place_ids|关联地点列表|持久化字段|关联 Place 列表，可为空|
|zone_id|运营区域编号|持久化字段|所属 Zone，可为空|
|pickup_cell_ids|可上车网格|持久化字段|支持上车的 Cell 列表|
|dropoff_cell_ids|可下车网格|持久化字段|支持下车的 Cell 列表|
|temp_stop_cell_ids|可临停网格|持久化字段|支持临停的 Cell 列表|
|parking_cell_ids|可停车网格|持久化字段|支持停车的 Cell 列表|
|standby_cell_ids|可待命网格|持久化字段|支持待命的 Cell 列表|
|occupied_cell_ids|已占用网格|运行态字段|当前已被占用的 Cell 列表|
|unavailable_cell_ids|不可用网格|运行态字段|当前不可用的 Cell 列表|
|capacity|车辆容量|持久化字段|最大可容纳 Robotaxi 数量|
|current_robotaxi_count|当前 Robotaxi 数量|运行态字段|当前位于该服务区的 Robotaxi 数量|
|name|服务区域名称|兼容字段|兼容旧前端展示|
|segment_ids|关联道路片段列表|兼容字段|兼容旧初始化与校验|
|covered_cell_ids|覆盖道路网格|兼容字段|兼容旧地图绘制|

### 8.1 vehicle_capabilities：车辆侧停靠能力

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|can_stop_for_service|允许服务停靠|持久化字段|是否允许车辆为上车 / 下车进行停靠|
|can_short_wait|允许短时等待|持久化字段|是否允许车辆短时间停靠等待|
|can_stage|允许待命排队|持久化字段|是否允许车辆调度驻留 / 排队|
|can_long_park|允许长时间停放|持久化字段|是否允许车辆长时间停放|

---

## 9. Zone：运营区域

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|zone_id|运营区域编号|持久化字段|运营区域唯一编号|
|map_id|地图编号|持久化字段|所属 Map|
|parent_zone_id|父级区域编号|持久化字段|父级 Zone，可为空|
|zone_name|区域名称|持久化字段|运营区域名称|
|zone_level|区域层级|持久化字段|运营区域层级|
|zone_type|区域类型|持久化字段|运营区域业务类型|
|zone_status|区域状态|持久化字段|运营区域状态|
|cell_ids|覆盖网格列表|持久化字段|覆盖的 Cell 列表|
|road_segment_ids|道路片段列表|持久化字段|包含的 RoadSegment 列表|
|place_ids|地点列表|持久化字段|包含的 Place 列表|
|service_area_ids|服务区域列表|持久化字段|包含的 ServiceArea 列表|
|sub_zone_ids|子区域列表|持久化字段|子 Zone 列表|

### 9.1 空间经营画像字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|profile_id|画像编号|持久化字段|画像唯一编号|
|profile_type|画像类型|派生展示字段|需求画像来源类型：地点、服务区或区域|
|profile_status|画像状态|持久化字段|画像是否可用|
|source_object_id|来源对象编号|派生展示字段|画像关联的 Place、ServiceArea 或 Zone 编号|
|source_object_name|来源对象名称|派生展示字段|画像关联对象的中文名称|
|source_object_type|来源对象类型|派生展示字段|画像关联对象类型|
|resident_population|常住人口|配置字段|地点常住人口|
|working_population|工作人口|配置字段|地点工作人口|
|daily_visitors|日访客量|配置字段|地点日访客量|
|trip_generation_rate|出行产生率|配置字段|人群产生出行需求的比例|
|demand_weight|需求权重|配置字段|地点需求权重|
|peak_pattern|需求高峰模式|配置字段|地点高峰模式|
|growth_rate|增长率|配置字段|地点需求增长率|
|robotaxi_adoption_rate|Robotaxi 采用率|配置字段|潜在需求中采用 Robotaxi 的比例|
|effective_from|生效时间|配置字段|画像开始生效时间|
|effective_to|失效时间|配置字段|画像失效时间，可为空|
|pickup_probability|上车概率|配置字段|服务区成为上车点的概率|
|dropoff_probability|下车概率|配置字段|服务区成为下车点的概率|
|peak_demand_ratio|高峰需求比例|配置字段|高峰时段需求放大比例|
|service_capacity|服务容量|配置字段|服务区承载服务能力|
|waiting_capacity|等待容量|配置字段|服务区可等待容量|
|turnover_capacity|周转能力|配置字段|服务区单位周期周转能力|
|potential_demand|潜在需求|计算字段|由地点画像计算得到的潜在需求|
|expected_robotaxi_demand|预计 Robotaxi 需求|计算字段|由画像和采用率计算的 Robotaxi 需求|
|peak_hour_demand|峰值需求|计算字段|高峰小时需求|
|demand_distribution|需求分布|计算字段|区域需求来源分布摘要|
|growth_factor|增长修正|计算字段|区域增长修正因子|
|supply_need_score|供给需求评分|计算字段|用于供给规划和投放判断的需求评分|
|calculated_from_profile_ids|计算来源画像|计算字段|区域画像计算引用的画像编号|
|calculated_at|计算时间|计算字段|画像计算时间|

---

## 10. OpsCenter：运营中心

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|ops_center_id|运营中心编号|持久化字段|运营中心唯一编号|
|ops_center_name|运营中心名称|持久化字段|运营中心名称|
|place_id|地点编号|持久化字段|关联的 OPS_CENTER 类型 Place|
|map_id|地图编号|持久化字段|所属 Map|
|cell_ids|覆盖网格列表|持久化字段|运营中心覆盖 Cell|
|service_area_ids|服务区域列表|持久化字段|附近车辆出入和待命 ServiceArea|
|capacity|车辆容量|持久化字段|运营中心内部最大车辆容量|
|ops_center_status|运营中心状态|持久化字段|当前设施状态|
|can_receive_robotaxi|允许接收 Robotaxi|持久化字段|是否可以接收车辆|
|can_park_robotaxi|允许停放 Robotaxi|持久化字段|是否可以内部停放车辆|
|can_inspect_robotaxi|允许准入检查|持久化字段|是否可以执行运营准入检查|
|can_clean_robotaxi|允许清洁|持久化字段|是否可以清洁车辆|
|can_charge_robotaxi|允许充电|持久化字段|是否可以为车辆充电|
|can_repair_robotaxi|允许维修|持久化字段|是否可以维修车辆|
|can_release_robotaxi|允许投放 Robotaxi|持久化字段|是否可以通过运营投放任务将车辆投放进入运营|
|operation_capability_zones|运维职能区域|持久化字段|按运维任务职能划分的可作业、可停放、待命、接入道路和调度目的 Cell 容器|
|capability_type|职能类型|持久化字段|区域对应的运维能力类型|
|work_cell_ids|作业网格|持久化字段|可以执行清洁、充电、维修等作业的内部 Cell|
|access_cell_ids|接入道路网格|持久化字段|连接运营中心的道路接入 Cell，不得作为作业目的地|
|dispatch_target_cell_ids|可调度目的网格|持久化字段|运维调度策略允许选择的目的 Cell|

---

## 11. Robotaxi：自动驾驶服务车辆

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|robotaxi_id|Robotaxi 编号|持久化字段|车辆唯一编号|
|fleet_id|车队编号|持久化字段|所属车队|
|model_name|车型名称|持久化字段|车型名称|
|automation_level|自动驾驶等级|持久化字段|L4 或 L5|
|seat_capacity|座位数|持久化字段|可载客座位数|
|battery_capacity_kwh|电池容量（千瓦时）|持久化字段|电池容量|
|max_range_km|满电续航（公里）|持久化字段|满电最大续航|
|service_type|服务类型|持久化字段|支持的服务类型|
|current_battery_kwh|当前电量（千瓦时）|运行态字段|当前剩余电量，按千瓦时表达|
|battery_percent|当前电量（%）|运行态字段|当前剩余电量百分比|
|estimated_range_km|剩余续航（公里）|运行态字段|根据当前电量计算的剩余续航|
|availability_status|运营状态|运行态字段|Robotaxi 主运营状态：待准入、可运营、运维中、已退役|
|motion_status|运动状态|运行态字段|车辆当前运动形态|
|current_cell_id|当前所在网格|运行态字段|车辆当前位置|
|current_route_id|当前路径|运行态字段|当前执行 Route，可为空|
|current_task_id|当前任务|运行态字段|当前关联 Task，可为空|
|current_order_id|当前服务订单|运行态字段|当前关联 ServiceOrder，可为空|
|current_order_status|当前服务订单状态|聚合展示字段|由 current_order_id 关联 ServiceOrder 推导|
|current_task_type|当前任务类型|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_task_status|当前任务状态|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_route_execution_id|当前行驶记录|聚合展示字段|当前关联 RouteExecution，可为空，展示推导字段|
|location_summary|位置摘要|聚合展示字段|由 current_cell_id 通过 CellContext 推导|
|fleet_operation_status|车队运维状态|兼容字段|旧版运维恢复状态，主流程以当前任务和运营状态为准|
|operation_tags|运维标记|兼容展示字段|旧版运维标记聚合展示，主展示以当前任务和排队任务为准|
|needs_cleaning|需要清洁标记|兼容字段|旧版清洁标记，不作为新运维任务主流程来源|
|needs_charging|需要充电标记|兼容字段|旧版充电标记，不作为新运维任务主流程来源|
|needs_maintenance|需要维修标记|兼容字段|旧版维修标记，不作为新运维任务主流程来源|
|pending_task_queue|待执行任务队列|运行态字段|Robotaxi 运维任务排队列表|
|cleanliness_status|清洁状态|运行态字段|车辆是否需要清洁或正在清洁|
|battery_operation_status|电量运营状态|运行态字段|电量是否满足运营、是否低电或充电中|
|maintenance_status|维修状态|运行态字段|车辆维修周期和维修状态|
|failure_status|故障状态|运行态字段|车辆故障报警和处置状态|
|retirement_status|退役状态|运行态字段|车辆是否运营中、待退役评估或已退役|
|operation_blocking_reason|运营阻塞原因|运行态字段|车辆不可运营的业务原因|
|pending_fleet_task_type|待执行运维任务类型|运行态字段|等待车辆可执行的运维任务类型|
|pending_fleet_task_id|待执行运维任务编号|运行态字段|等待车辆可执行的运维任务编号|
|last_health_check_at|最近健康检查时间|运行态字段|最近一次 Robotaxi 运营健康检查时间|
|lifetime_distance_km|累计行驶距离（公里）|运行态字段|Robotaxi 运营行驶记录与履约行驶记录累计行驶距离|
|lifetime_battery_consumed_kwh|累计耗电（千瓦时）|运行态字段|Robotaxi 运营行驶记录与履约行驶记录累计消耗电量|
|lifetime_battery_consumed_percent|累计耗电（%）|兼容字段|旧版累计耗电百分比，主展示和成本计算使用 kWh|
|lifetime_charged_energy_kwh|累计充电量（千瓦时）|运行态字段|Robotaxi 已完成充电任务累计充入电量|
|completed_service_order_count|已服务订单数|运行态字段|Robotaxi 已完成服务订单数量|
|completed_cleaning_count|已清洁次数|运行态字段|Robotaxi 已完成清洁任务数量|
|completed_charging_count|已充电次数|运行态字段|Robotaxi 已完成充电任务数量|
|completed_maintenance_count|已维修次数|运行态字段|Robotaxi 已完成维修任务数量|

说明：

- `current_order_id` 表达服务订单占用，优先级高于运营任务；
- `current_task_id` 表达运营供给侧任务占用；
- Robotaxi 不能同时存在 `current_order_id` 和 `current_task_id`；
- 前端当前任务展示应优先展示服务订单，其次展示运营任务。

### 11.1 Fleet Operations 任务公共字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|source_task_id|来源任务编号|持久化字段|触发当前任务的来源任务，可为空|
|target_ops_center_id|目标运营中心|持久化字段|任务目标 OpsCenter|
|pending_since_at|开始等待时间|运行态字段|任务开始等待 Robotaxi 可执行的时间|
|operation_created_at|业务创建时间|持久化字段|任务业务创建时间|
|operation_completed_at|业务完成时间|运行态字段|任务业务完成时间|
|work_started_at|作业开始时间|运行态字段|作业人员开始处理运维任务的时间|
|clean_level_before|清洁前等级|持久化字段|清洁任务执行前的脏污等级|
|clean_level_after|清洁后等级|运行态字段|清洁任务执行后的清洁等级|
|battery_percent_before|充电前电量（%）|持久化字段|充电开始前电量|
|target_battery_percent|目标电量（%）|持久化字段|充电目标电量|
|battery_percent_after|充电后电量（%）|运行态字段|充电完成后电量|
|robotaxi_current_battery_kwh|当前电量（千瓦时）|持久化字段|充电任务创建或激活时从 Robotaxi 获取的当前电量|
|robotaxi_battery_capacity_kwh|总电量（千瓦时）|持久化字段|充电任务创建或激活时从 Robotaxi 获取的电池容量|
|charged_energy_kwh|已充电量（千瓦时）|运行态字段|本次充电任务完成后实际充入 Robotaxi 的电量，用于充电能源成本计算|
|charger_id|充电桩编号|持久化字段|充电任务绑定的充电桩，可为空|
|charging_started_at|充电开始时间|运行态字段|充电作业开始时间|
|charging_completed_at|充电完成时间|运行态字段|充电作业完成时间|
|maintenance_type|维修类型|持久化字段|维修任务类型|
|failure_source_task_id|来源故障任务|持久化字段|维修任务来源故障处理任务，可为空|
|maintenance_bay_id|维修工位编号|持久化字段|维修工位，可为空|
|diagnosis_summary|诊断摘要|运行态字段|维修或故障诊断摘要|
|repair_result|维修结果|运行态字段|维修任务结果|
|requires_readiness_check|需要准入复核|运行态字段|维修后是否必须进入准入检查|
|failure_event_id|故障事件编号|持久化字段|故障事件编号，可为空|
|failure_type|故障类型|持久化字段|故障分类|
|failure_severity|故障严重程度|运行态字段|LOW、MEDIUM、HIGH、CRITICAL|
|allow_current_service_completion|允许完成当前服务|运行态字段|当前服务是否允许继续完成|
|diagnosis_result|诊断结果|运行态字段|故障诊断结果|
|disposition_result|处置结果|运行态字段|故障处置结果|
|maintenance_task_id|维修任务编号|运行态字段|故障处理转维修后的关联任务|
|retirement_task_id|退役任务编号|运行态字段|故障处理转退役后的关联任务|
|retirement_reason|退役原因|持久化字段|退役任务原因|
|approval_status|审批状态|运行态字段|退役确认或审批状态|
|asset_exit_result|资产退出结果|运行态字段|退役资产处理结果|

### 11.2 FleetOperationPolicy：运维策略配置

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|fleet_operation_policy_id|运维策略编号|持久化字段|运维策略唯一编号|
|policy_name|策略名称|持久化字段|用户可识别的策略名称|
|policy_type|策略类型|持久化字段|策略所属类型，通常与目标任务类型一致|
|target_task_type|目标任务类型|持久化字段|策略触发生成的任务类型|
|policy_status|策略状态|运行态字段|DRAFT、ACTIVE、DISABLED、ARCHIVED|
|policy_version|配置版本|持久化字段|策略配置版本号|
|policy_parameters|策略参数|持久化字段|策略结构化参数集合|
|execution_scope|执行范围|持久化字段|策略扫描对象范围，第一阶段为 ALL_ROBOTAXI|
|low_peak_start_time|低峰开始时间|持久化字段|低峰清洁等策略的开始时间|
|low_peak_end_time|低峰结束时间|持久化字段|低峰清洁等策略的结束时间|
|service_order_count_threshold|服务单数阈值|持久化字段|达到该服务单数量后可进入策略候选|
|service_duration_minutes_threshold|服务时长阈值（分钟）|持久化字段|达到该累计服务时长后可进入策略候选|
|battery_percent_threshold|电量阈值（%）|持久化字段|低于该电量后可进入充电候选|
|maintenance_due_days_threshold|临近维修天数阈值|持久化字段|临近定期维修的天数阈值|
|failure_severity_threshold|故障严重度阈值|持久化字段|故障策略关注的最低严重度|
|retirement_score_threshold|退役评分阈值|持久化字段|退役评估策略阈值|
|created_at|创建时间|持久化字段|真实审计创建时间|
|updated_at|更新时间|持久化字段|真实审计更新时间|

### 11.3 FleetOperationPolicyRun：运维策略执行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|fleet_operation_policy_run_id|运维策略执行编号|持久化字段|策略执行记录唯一编号|
|fleet_operation_policy_id|运维策略编号|持久化字段|来源运维策略配置|
|policy_version|配置版本|持久化字段|执行时使用的策略版本|
|policy_type|策略类型|持久化字段|执行策略类型|
|target_task_type|目标任务类型|持久化字段|本次执行要生成的任务类型|
|run_status|执行状态|运行态字段|SUCCEEDED、PARTIALLY_SUCCEEDED、NO_ACTION、FAILED|
|trigger_type|触发方式|运行态字段|MANUAL、AUTO 等|
|execution_scope|执行范围|持久化字段|本次策略扫描范围|
|policy_snapshot|策略配置快照|持久化字段|本次执行使用的不可变策略配置快照|
|candidate_robotaxi_ids|候选 Robotaxi 列表|运行态字段|本次策略筛出的候选车辆编号|
|generated_task_ids|生成任务列表|运行态字段|本次策略成功生成的任务编号|
|no_action_reason|无动作原因|运行态字段|无候选或无需创建任务的原因|
|result_summary|结果摘要|运行态字段|面向用户的策略执行结果说明|
|started_at|开始时间|持久化字段|真实审计开始时间|
|completed_at|完成时间|持久化字段|真实审计完成时间|

### 11.4 FleetOperationPolicyResult：运维策略结果

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|fleet_operation_policy_result_id|运维策略结果编号|持久化字段|策略单车结果唯一编号|
|fleet_operation_policy_run_id|运维策略执行编号|持久化字段|来源策略执行|
|fleet_operation_policy_id|运维策略编号|持久化字段|来源策略配置|
|policy_type|策略类型|持久化字段|策略类型|
|target_task_type|目标任务类型|持久化字段|目标生成任务类型|
|robotaxi_id|Robotaxi 编号|持久化字段|本条结果对应的车辆|
|task_id|任务编号|运行态字段|本条结果生成的任务，可为空|
|task_type|任务类型|运行态字段|生成任务类型，可为空|
|result_status|结果状态|运行态字段|TASK_CREATED、SKIPPED、FAILED|
|result_reason|结果原因|运行态字段|任务生成、跳过或失败原因|
|robotaxi_snapshot|Robotaxi 快照|持久化字段|策略执行时该车辆的关键状态快照|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 11.5 FleetOperationDispatchStrategy：运维调度策略

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|fleet_operation_dispatch_strategy_id|运维调度策略编号|持久化字段|运维调度策略唯一编号|
|strategy_name|策略名称|持久化字段|用户可识别的调度策略名称|
|dispatch_algorithm|调度算法|持久化字段|NEAREST_AVAILABLE 等调度算法|
|strategy_status|策略状态|运行态字段|ACTIVE、DRAFT、ARCHIVED|
|created_at|创建时间|持久化字段|真实审计创建时间|
|updated_at|更新时间|持久化字段|真实审计更新时间|

### 11.6 FleetOperationDispatchRun：运维调度执行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|fleet_operation_dispatch_run_id|运维调度执行编号|持久化字段|运维调度执行记录唯一编号|
|fleet_operation_dispatch_strategy_id|运维调度策略编号|持久化字段|来源运维调度策略|
|task_id|任务编号|持久化字段|本次调度对应的运维任务|
|task_type|任务类型|持久化字段|本次调度对应的任务类型|
|robotaxi_id|Robotaxi 编号|持久化字段|本次调度对应的车辆|
|origin_cell_id|起点网格|持久化字段|调度时 Robotaxi 所在 Cell|
|run_status|执行状态|运行态字段|SUCCEEDED、NO_ELIGIBLE_CENTER、FAILED|
|decision_count|调度决策数|运行态字段|本次生成的调度结果数量|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 11.7 FleetOperationDispatchDecision：运维调度结果

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|fleet_operation_dispatch_decision_id|运维调度结果编号|持久化字段|运维调度结果唯一编号|
|fleet_operation_dispatch_run_id|运维调度执行编号|持久化字段|来源运维调度执行|
|fleet_operation_dispatch_strategy_id|运维调度策略编号|持久化字段|来源运维调度策略|
|task_id|任务编号|持久化字段|本次调度对应的运维任务|
|task_type|任务类型|持久化字段|本次调度对应的任务类型|
|robotaxi_id|Robotaxi 编号|持久化字段|本次调度对应的车辆|
|selected_ops_center_id|选中运营中心|运行态字段|调度选中的目标运营中心，可为空|
|target_cell_id|目的地位置|运行态字段|调度选中的目的地 Cell，可为空|
|decision_result|决策结果|运行态字段|DISPATCHED、NO_CAPACITY、NO_MATCHING_CAPABILITY|
|distance_m|距离（米）|运行态字段|Robotaxi 当前位置到目标运营中心 Cell 的估算距离|
|total_distance_km|总距离（公里）|运行态字段|调度距离的公里展示|
|reason|原因|运行态字段|调度成功或失败原因|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 11.8 TaskDispatchStrategy：任务调度策略

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|task_dispatch_strategy_id|任务调度策略编号|持久化字段|任务调度策略唯一编号|
|strategy_name|策略名称|持久化字段|用户可识别的调度策略名称|
|dispatch_algorithm|调度算法|持久化字段|RELEASED_ROBOTAXI_PRIORITY 等调度算法|
|strategy_status|策略状态|运行态字段|ACTIVE、DRAFT、ARCHIVED|
|fleet_operation_priority|运维任务优先级|持久化字段|排队运维任务在释放后调度中的基础优先级|
|service_order_priority|服务订单优先级|持久化字段|服务订单候选在释放后调度中的基础优先级|
|deployment_task_priority|投放任务优先级|持久化字段|运营投放任务候选在释放后调度中的基础优先级|
|priority_rank|优先级排序|持久化字段|各任务类型优先级数值映射，替代独立任务优先级配置页|
|interrupt_policy|中断策略|持久化字段|哪些任务类型可打断当前低优先级占用|
|allow_queuing|允许排队|持久化字段|Robotaxi 被订单或更高优先级任务占用时，是否允许任务进入排队|
|max_queue_size|最大排队数量|持久化字段|单个 Robotaxi 最大排队任务数|
|invocation_rules|调用规则|持久化字段|DIRECT_ROBOTAXI_OPERATION、FLEET_OPERATION_POLICY、ROBOTAXI_RELEASED 等调用场景下的策略行为|
|created_at|创建时间|持久化字段|真实审计创建时间|
|updated_at|更新时间|持久化字段|真实审计更新时间|

### 11.9 TaskDispatchRun：任务调度执行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|task_dispatch_run_id|任务调度执行编号|持久化字段|任务调度执行记录唯一编号|
|task_dispatch_strategy_id|任务调度策略编号|持久化字段|来源任务调度策略|
|strategy_name|策略名称|运行态字段|执行时的策略名称|
|robotaxi_id|Robotaxi 编号|持久化字段|本次调度对应的释放车辆|
|trigger_object_type|触发对象类型|运行态字段|触发本次调度的对象类型|
|trigger_object_id|触发对象编号|运行态字段|触发本次调度的对象编号|
|run_status|执行状态|运行态字段|SUCCEEDED、NO_ACTION、FAILED|
|candidate_count|候选数量|运行态字段|本次参与调度的候选对象数量|
|selected_candidate_type|选中候选类型|运行态字段|FLEET_OPERATION_TASK、SERVICE_ORDER、DEPLOYMENT_TASK|
|selected_object_id|选中对象编号|运行态字段|被策略选中的候选对象编号|
|no_action_reason|无动作原因|运行态字段|未产生选择时的原因|
|strategy_snapshot|策略快照|持久化字段|执行时使用的策略参数快照|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 11.10 TaskDispatchResult：任务调度结果

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|task_dispatch_result_id|任务调度结果编号|持久化字段|任务调度结果唯一编号|
|task_dispatch_run_id|任务调度执行编号|持久化字段|来源任务调度执行|
|task_dispatch_strategy_id|任务调度策略编号|持久化字段|来源任务调度策略|
|robotaxi_id|Robotaxi 编号|持久化字段|本条结果对应的车辆|
|candidate_type|候选类型|运行态字段|FLEET_OPERATION_TASK、SERVICE_ORDER、DEPLOYMENT_TASK|
|candidate_object_id|候选对象编号|运行态字段|候选业务对象编号|
|candidate_status|候选状态|运行态字段|候选对象当时状态|
|candidate_priority|候选优先级|运行态字段|策略计算后的候选优先级|
|decision_result|决策结果|运行态字段|SELECTED、SKIPPED、NO_CANDIDATE|
|decision_reason|决策说明|运行态字段|选择、跳过或无候选原因|
|created_at|创建时间|持久化字段|真实审计创建时间|

### 11.11 Fleet Operations 策略枚举中文

|英文值|中文名|用途|
|---|---|---|
|ALL_ROBOTAXI|全部 Robotaxi|执行范围|
|FLEET_OPERATION_POLICY|运维策略触发|触发来源|
|DIRECT_ROBOTAXI_OPERATION|Robotaxi 直接触发|触发来源|
|ROBOTAXI_RELEASED|Robotaxi 释放后触发|触发来源|
|APPLY_PRIORITY_AND_QUEUE|应用优先级并允许排队|任务调度策略调用规则|
|SELECT_NEXT_CANDIDATE|选择下一候选任务|任务调度策略调用规则|
|FLEET_OPERATION_POLICY_UPDATED|运维策略配置已更新|任务事件类型|
|NEAREST_AVAILABLE|最近可用运维中心|调度算法|
|RELEASED_ROBOTAXI_PRIORITY|释放后优先级调度|任务调度算法|
|FLEET_OPERATION_TASK|运维任务|任务调度候选类型|
|SERVICE_ORDER|服务订单|任务调度候选类型|
|DEPLOYMENT_TASK|运营投放任务|任务调度候选类型|
|SELECTED|已选中|任务调度结果|
|NO_CANDIDATE|无候选对象|任务调度结果|
|DISPATCHED|已调度|调度结果|
|NO_CAPACITY|无可用容量|调度结果|
|NO_MATCHING_CAPABILITY|无匹配能力|调度结果|
|NO_ELIGIBLE_CENTER|无可用运维中心|调度执行状态|
|INVALID_DISPATCH_INPUT|调度输入无效|调度失败原因|
|UNKNOWN_TASK_TYPE_FOR_DISPATCH|未知运维任务类型|调度失败原因|
|NO_ACTION|未发现符合车辆|策略执行结果|
|INVALID_FLEET_OPERATION_POLICY|运维策略无效|无动作或失败原因|
|ROBOTAXI_ALREADY_HAS_OPEN_FLEET_OPERATION_TASK|Robotaxi 已有未完成运维任务|任务创建跳过原因|
|ROBOTAXI_ALREADY_RETIRED|Robotaxi 已退役|任务创建拒绝原因|
|QUEUE_FULL|任务队列已满|任务创建拒绝原因|
|WAIT_CURRENT_SERVICE_COMPLETION|等待当前服务完成|任务排队原因|
|WAIT_CURRENT_TASK_COMPLETION|等待当前任务完成|任务排队原因|
|FLEET_OPERATION_TASK_QUEUED|运维任务已排队|任务创建结果|
|TASK_CREATED|任务已生成|策略结果状态|

### 11.9 Fleet Operations 任务触发来源字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|trigger_source|触发来源|运行态字段|策略触发、Robotaxi 直接触发或其他来源|
|trigger_object_type|触发对象类型|持久化字段|触发当前任务的对象类型|
|trigger_object_id|触发对象编号|持久化字段|触发当前任务的对象编号|

---

## 12. Worker：运营中心作业人员

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|worker_id|作业人员编号|持久化字段|Worker 唯一编号|
|assigned_worker_id|已分配作业人员|运行态字段|任务当前已分配的 Worker，可为空；历史兼容字段，新逻辑优先使用 worker_id|
|ops_center_id|运营中心编号|持久化字段|所属 OpsCenter|
|worker_name|作业人员名称|持久化字段|Worker 名称|
|worker_role|作业角色|持久化字段|运营中心内部作业角色|
|worker_status|作业人员状态|运行态字段|当前是否可被分配任务|
|time_per_robotaxi|单车处理时间|持久化字段|处理一台 Robotaxi 所需时间单位|
|max_robotaxi_per_day|单日最大处理量|持久化字段|每天最多处理 Robotaxi 数量|
|current_task_id|当前任务|运行态字段|当前执行任务，可为空|
|current_task_type|当前任务类型|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_task_status|当前任务状态|聚合展示字段|由 current_task_id 关联 Task 推导|

### 12.1 SupplyManagement：供应管理

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|forecast_id|预测编号|持久化字段|长期需求预测唯一编号|
|forecast_name|预测名称|持久化字段|长期需求预测名称|
|forecast_status|预测状态|持久化字段|预测是否可用|
|forecast_period|预测周期|配置字段|预测覆盖周期|
|confidence_level|置信水平|计算字段|预测置信水平|
|supply_plan_id|供给计划编号|持久化字段|供给计划单唯一编号|
|plan_name|计划名称|持久化字段|供给计划名称|
|plan_status|计划状态|持久化字段|计划状态|
|target_zone_id|目标区域|持久化字段|计划覆盖的目标区域|
|planned_robotaxi_count|计划 Robotaxi 数|配置字段|计划形成的 Robotaxi 数量|
|planned_start_date|计划开始日期|配置字段|计划开始日期|
|planned_end_date|计划结束日期|配置字段|计划结束日期|
|supply_order_id|供给单编号|持久化字段|供给单唯一编号|
|supply_source_type|供给来源类型|持久化字段|车商供给、自有生产或车主供给|
|supplier_id|供应方编号|持久化字段|供应方对象编号|
|ordered_robotaxi_count|订购 Robotaxi 数|持久化字段|供给单订购车辆数|
|delivered_robotaxi_count|已交付 Robotaxi 数|运行态字段|供给单已交付车辆数|
|order_status|订单状态|运行态字段|供给单状态|
|dealer_supply_id|车商供给编号|持久化字段|车商供给对象编号|
|dealer_name|车商名称|持久化字段|合作车商或车厂名称|
|dealer_status|车商状态|持久化字段|车商供给状态|
|supported_model_names|支持车型|配置字段|车商可供应车型|
|monthly_supply_capacity|月供给能力|配置字段|车商月度供给能力|
|quality_rating|质量评级|配置字段|供应质量评级|
|owner_supply_id|车主供给编号|持久化字段|车主供给对象编号|
|owner_name|车主名称|持久化字段|自动驾驶私家车车主名称|
|owner_status|车主状态|持久化字段|车主供给状态|
|vehicle_count|车辆数|运行态字段|车主名下车辆数|
|qualified_vehicle_count|合格车辆数|运行态字段|满足 Robotaxi 接入条件的车辆数|

---

## 13. Task / Route / 执行记录展示字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|route_id|路径编号|持久化字段|Route 唯一编号|
|route_version|路径版本|持久化字段|Route 版本|
|route_status|路径状态|运行态字段|Route 当前状态|
|route_summary|路径摘要|聚合展示字段|Route 的简要展示信息|
|route_detail|路径详情|聚合展示字段|Route 的结构化详情|
|route_strategy_id|路径规划策略编号|持久化字段|路径规划策略对象 ID，用于 Route、任务单、行驶记录和策略事件引用|
|strategy_name|策略名称|持久化字段|策略中文名称，适用于路径规划、需求模拟、定价、匹配等策略对象|
|strategy_type|策略类型|持久化字段|策略类型，适用于路径规划、需求模拟、定价、匹配等策略对象|
|planning_algorithm|路径规划算法|持久化字段|路径规划策略当前使用的算法，例如 BFS_CELL_GRAPH，后续可扩展为 Dijkstra、A* 或真实地图 Routing Engine|
|trigger_task_status|触发任务状态|持久化字段|策略触发时的 Task 状态|
|trigger_order_status|触发订单状态|持久化字段|策略触发时的 ServiceOrder 状态，可为空|
|trigger_trip_status|触发行程状态|持久化字段|策略触发时的 Trip 状态，可为空|
|origin_rule|起点选择规则|持久化字段|策略如何确定 Route 起点|
|target_rule|终点选择规则|持久化字段|策略如何确定 Route 终点|
|service_area_scope_rule|服务区范围规则|持久化字段|策略是否限制在指定 ServiceArea 内选择目标|
|route_generation_rule|路径生成规则|持久化字段|策略如何基于 RoadSegment / RoadNode 生成 Route|
|route_update_rule|路径更新规则|持久化字段|策略如何创建或更新 Route|
|strategy_status|策略状态|运行态字段|路径规划策略状态|
|route_planning_run_id|路径规划执行记录编号|持久化字段|每次路径规划策略执行的唯一编号|
|result_route_id|生成路径编号|持久化字段|本次路径规划成功生成的 Route 编号|
|planning_result|规划结果|运行态字段|本次路径规划成功或失败|
|route_planning_run_count|路径规划执行次数|聚合展示字段|策略被执行的次数|
|task_id|任务编号|持久化字段|关联 Task，可为空|
|route_execution_id|行驶记录编号|持久化字段|关联 RouteExecution，可为空|
|service_order_id|服务订单编号|持久化字段|关联 ServiceOrder，可为空|
|trip_id|履约行驶记录编号|持久化字段|关联 Trip，可为空|
|robotaxi_id|Robotaxi 编号|持久化字段|执行 Robotaxi|
|origin_cell_id|起点位置|持久化字段|本次 Route 起点 Cell|
|route_usage_type|路径用途类型|持久化字段|区分价格预估路径、运营行驶路径、服务接驾路径、服务送达路径、服务重规划路径等 Route 用途|
|road_segment_sequence|道路片段序列|持久化字段|Route 经过的 RoadSegment 顺序|
|total_distance_km|路径总距离（公里）|持久化字段|Route 总距离，供价格和运营分析使用；在 Trip / RouteExecution 上表示关联所有路径后的行驶总距离|
|estimated_duration_min|预估时长（分钟）|持久化字段|Route 预估耗时，供价格和运营分析使用|
|route_steps|路径步骤|持久化字段|Route 中可执行的 Cell Step 序列|
|route_step_count|移动步数|聚合展示字段|Route 中实际移动步数，等于 route_steps.length - 1，起点 Step 不计为移动|
|route_segments|路径分段|持久化字段|用于价格预估等复合路径，表达客户位置到上车位置、上车位置到下车位置等分段|
|movement_step_index|移动步序|聚合展示字段|前端展示移动步骤时使用的序号，隐藏 route_steps[0] 起点行|
|route_cell_ids|行驶路径格子序列|运行态字段|运营行驶记录执行 Route 时按顺序经过的 Cell 编号列表|
|planned_target_zone_id|计划目标运营区域|持久化字段|运营投放任务创建时的原始计划 Zone，可为空，异常重规划不得覆盖|
|planned_target_service_area_id|计划目标服务区|持久化字段|运营投放任务创建时的原始计划 ServiceArea，异常重规划不得覆盖|
|planned_target_cell_id|计划目标位置|持久化字段|运营投放任务创建时的原始计划 Cell，异常重规划不得覆盖|
|target_service_area_id|当前目标服务区|运行态字段|任务或行驶记录当前 Route 指向的目标 ServiceArea，会随异常重规划更新|
|target_cell_id|目的地位置|运行态字段|任务或行驶记录当前 Route 指向的目的地 Cell，会随异常重规划更新|
|current_target_cell_id|当前目的地位置|聚合展示字段|行驶记录当前 Route 指向的目的地 Cell|
|actual_target_service_area_id|实际停靠服务区|运行态字段|Robotaxi 实际完成停靠的 ServiceArea，可为空|
|actual_target_cell_id|实际到达位置|运行态字段|Robotaxi 实际完成停靠的 Cell，可为空|
|arrival_behavior|到达驻留要求|持久化字段|Robotaxi 到达后应临停、停车或待命的要求|
|blocked_handling_policy|遇阻处理策略|持久化字段|计划目标不可用时的处理策略|
|arrival_execution_result|到达执行结果|运行态字段|Robotaxi 到达目标区域后的反馈结果|
|deployment_target_model|投放目标模型|运行态字段|运营投放任务选择目标点位时使用的临时或正式模型|
|rebalance_reason|再平衡原因|运行态字段|投放目标被选中的业务原因|
|service_area_vehicle_count|服务区可用车辆数|运行态字段|目标服务区当前可用车辆数量快照|
|estimated_distance_steps|预计移动步数|运行态字段|从当前 Cell 到投放目标 Cell 的预计移动步数|
|same_service_area_retry_allowed|允许同服务区重试|持久化字段|异常到达时是否允许在同 ServiceArea 内选择替代点位|
|current_target_service_area_id|当前目标服务区|运行态字段|行驶记录当前 Route 指向的目标 ServiceArea|
|route_history|路径历史|运行态字段|同一行驶记录中 Route 变化历史|
|route_change_reason|路径变化原因|运行态字段|Route 被创建或替换的原因|
|arrival_result|到达结果|运行态字段|记录正常到达或异常到达等执行反馈|
|exception_type|异常类型|运行态字段|发生异常时的具体原因，可为空|
|origin_location_summary|起点位置摘要|聚合展示字段|由起点 CellContext 推导|
|target_location_summary|目的地位置|聚合展示字段|由目的地 CellContext 推导|
|current_location_summary|当前位置摘要|聚合展示字段|由当前 CellContext 推导|
|robotaxi_current_cell_id|Robotaxi 当前位置|聚合展示字段|运维任务展示时由 Robotaxi 当前 Cell 推导，不在任务单中冗余存储|
|robotaxi_current_location_summary|Robotaxi 当前位置|聚合展示字段|运维任务展示时由 Robotaxi 当前 CellContext 推导|
|robotaxi_current_location_detail|Robotaxi 位置详情|聚合展示字段|运维任务展示时由 Robotaxi 当前结构化位置上下文推导|
|origin_location_detail|起点位置详情|聚合展示字段|起点结构化位置上下文|
|target_location_detail|终点位置详情|聚合展示字段|终点结构化位置上下文|
|current_location_detail|当前位置详情|聚合展示字段|当前位置结构化位置上下文|
|failure_reason|失败原因|运行态字段|失败时的原因说明|
|description|说明|持久化字段|对象、策略或记录的说明文本|

说明：

- 位置类展示字段均由 CellContext 推导，不作为业务对象冗余存储字段；
- Route 是路径规划策略执行后的路径结果，主定义见 `doc/05-fleet-asset-management/03-route.md`；
- Route 不再作为空间模型中的静态对象维护。

---

## 14. Customer：客户

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|customer_id|客户编号|持久化字段|Customer 唯一编号|
|customer_name|客户名称|持久化字段|模拟客户名称|
|customer_type|客户类型|持久化字段|客户业务类型|
|default_order_channel|默认下单渠道|持久化字段|客户默认使用的订单渠道|
|customer_status|客户状态|运行态字段|客户是否可用于模拟订单|
|customer_origin_location_type|客户需求位置类型|运行态字段|本次订单创建时客户发起需求的位置类型|
|customer_origin_place_id|客户需求地点|运行态字段|本次订单客户位置关联 Place，可为空|
|customer_origin_road_segment_id|客户需求道路片段|运行态字段|本次订单客户位置关联 RoadSegment，可为空|
|customer_origin_cell_id|客户需求位置|运行态字段|本次订单客户位置 Cell|

说明：

- Customer 是需求主体，不保存实时位置；
- `customer_origin_*` 字段属于订单创建上下文，不应作为 Customer 的长期当前位置字段。

---

## 15. ServiceOrder：服务订单

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|service_order_id|服务订单编号|持久化字段|ServiceOrder 唯一编号|
|order_channel|订单来源|持久化字段|服务订单来源渠道|
|customer_id|客户编号|持久化字段|关联 Customer|
|demand_simulation_run_id|需求模拟执行记录编号|运行态字段|创建该 ServiceOrder 时使用的 DemandSimulationRun|
|demand_simulation_result_id|需求模拟结果编号|运行态字段|创建该 ServiceOrder 时使用的 DemandSimulationResult|
|customer_origin_location_type|客户需求位置类型|运行态字段|本次订单创建时客户发起需求的位置类型|
|customer_origin_place_id|客户需求地点|运行态字段|本次订单客户位置关联 Place，可为空|
|customer_origin_road_segment_id|客户需求道路片段|运行态字段|本次订单客户位置关联 RoadSegment，可为空|
|customer_origin_cell_id|客户需求位置|运行态字段|本次订单客户位置 Cell|
|pickup_service_area_id|上车服务区|持久化字段|订单上车 ServiceArea|
|pickup_cell_id|上车位置|持久化字段|订单上车 Cell|
|dropoff_service_area_id|下车服务区|持久化字段|订单下车 ServiceArea|
|dropoff_cell_id|下车位置|持久化字段|订单下车 Cell|
|estimated_pricing_decision_id|预估价格决策编号|持久化字段|预估价格对应 PricingDecision|
|final_pricing_decision_id|最终价格决策编号|运行态字段|最终结算对应 PricingDecision，可为空|
|quote_base_fare|报价起步价|运行态字段|客户看到报价时使用的起步价快照|
|quote_distance_unit_price|报价距离单价|运行态字段|客户看到报价时使用的距离单价快照|
|quote_time_unit_price|报价时间单价|运行态字段|客户看到报价时使用的时间单价快照|
|estimated_distance_km|预估距离（公里）|运行态字段|订单预估服务距离|
|estimated_duration_min|预估时长（分钟）|运行态字段|订单预估服务时长|
|estimated_price|预估价格|运行态字段|系统预估价格，服务订单与预估定价阶段的主展示字段|
|quoted_price|预估价格（兼容）|兼容字段|历史客户报价字段，新增展示与计算不得优先依赖|
|actual_distance_km|实际总距离（兼容）|兼容字段|历史实际距离字段，新增结算逻辑不得优先依赖|
|actual_duration_min|实际总时长（兼容）|兼容字段|历史实际时长字段，新增结算逻辑不得优先依赖|
|final_price|最终价格|运行态字段|最终结算价格|
|trip_total_distance_km|履约总距离（公里）|聚合展示字段|关联履约行驶记录的总距离|
|trip_total_duration_min|履约总时长（分钟）|聚合展示字段|关联履约行驶记录的累计已耗时|
|trip_distance_traveled_km|履约已行驶距离（公里）|聚合展示字段|关联履约行驶记录的已行驶距离|
|trip_distance_remaining_km|履约剩余距离（公里）|聚合展示字段|关联履约行驶记录的剩余距离|
|payment_status|支付状态|运行态字段|订单支付状态|
|paid_amount|已支付金额|运行态字段|客户已支付金额|
|payment_completed_at|支付完成时间|运行态字段|支付完成时间，可为空|
|pricing_explanation|价格说明|运行态字段|面向客户展示的价格说明|
|pricing_breakdown_snapshot|定价明细快照|运行态字段|保存价格构成快照|
|order_status|订单状态|运行态字段|客户服务订单当前状态|
|matched_robotaxi_id|匹配 Robotaxi|运行态字段|已匹配车辆，可为空|
|matched_robotaxi_location_summary|匹配 Robotaxi 位置摘要|聚合展示字段|已匹配 Robotaxi 当前结构化位置摘要|
|matched_robotaxi_location_detail|匹配 Robotaxi 位置详情|聚合展示字段|已匹配 Robotaxi 当前结构化位置详情|
|order_matching_decision_id|订单匹配结果编号|运行态字段|关联 OrderMatchingDecision，可为空|
|matching_attempt_count|匹配尝试次数|运行态字段|服务订单已经执行的 Robotaxi 匹配尝试次数|
|matching_retry_pending|等待匹配重试|运行态字段|当前订单是否已有等待中的匹配重试时间作业|
|next_matching_retry_seconds|下次匹配重试秒数|运行态字段|下一次匹配重试在统一模拟时间中的目标秒数|
|last_matching_failure_reason|最近匹配失败原因|运行态字段|最近一次订单匹配尝试失败原因|
|assignment_mode|分配模式|运行态字段|服务订单 Robotaxi 分配入口：MANUAL / AUTO_TIMED|
|assignment_status|自动分配状态|运行态字段|自动限时分配状态：ASSIGNING / ASSIGNED / TIMEOUT_CANCELLED / FAILED|
|assignment_started_at|分配开始时间|运行态字段|真实时间模式下自动分配开始时间|
|assignment_started_simulation_at|分配开始时间（模拟）|模拟时间字段|统一世界时间下自动分配开始时间|
|assignment_deadline_seconds|分配截止秒|运行态字段|统一世界时间下自动分配最大等待截止秒|
|assignment_deadline_simulation_at|分配截止时间（模拟）|模拟时间字段|统一 Day N HH:MM:SS 格式的自动分配截止时间|
|assignment_max_wait_seconds|最大分配等待（秒）|配置/运行态字段|客户确认叫车后允许自动分配 Robotaxi 的最大等待秒数|
|assignment_retry_interval_seconds|分配重试间隔（秒）|配置/运行态字段|自动分配会话中连续尝试匹配 Robotaxi 的推进间隔|
|assignment_attempt_count|自动分配尝试次数|运行态字段|自动限时分配会话已经尝试匹配 Robotaxi 的次数|
|assignment_elapsed_seconds|自动分配已耗时（秒）|运行态字段|自动分配会话已消耗的统一世界秒数|
|assignment_remaining_seconds|自动分配剩余时间（秒）|运行态字段|自动分配会话距离最大等待截止剩余秒数|
|assignment_last_attempt_simulation_at|最近分配尝试时间（模拟）|模拟时间字段|最近一次自动分配尝试发生的统一世界时间|
|assignment_last_failure_reason|最近分配失败原因|运行态字段|最近一次自动分配失败原因|
|assignment_completed_at|分配完成时间|运行态字段|真实时间模式下自动分配完成时间|
|assignment_completed_simulation_at|分配完成时间（模拟）|模拟时间字段|统一世界时间下自动分配完成时间|
|assignment_wait_timeout_seconds|分配等待超时（秒）|运行态字段|服务订单等待 Robotaxi 分配的最长模拟秒数|
|cancellation_reason|取消原因|运行态字段|订单取消原因|
|trip_id|履约行驶记录编号|运行态字段|关联 Trip，可为空|
|confirmed_at|客户确认时间|运行态字段|客户确认叫车时间|
|matched_at|匹配时间|运行态字段|车辆匹配成功时间|
|cancelled_at|取消时间|运行态字段|订单取消时间，可为空|
|simulation_cancelled_at|取消时间（模拟）|模拟时间字段|订单按模拟世界时间取消的时间|

说明：

- ServiceOrder 表达客户服务承诺，不负责价格算法、车辆匹配算法、路径规划算法或实际行驶过程；
- 订单来源 `order_channel` 与 Customer 的 `default_order_channel` 不是同一字段，前者是本次订单来源，后者是客户默认偏好。
- `SETTLING / 结算中` 仅属于 `order_status`，表示服务订单等待执行结算；不得写入 Trip。

---

## 16. Trip：履约行驶记录

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|trip_id|履约行驶记录编号|运行态字段|Trip 唯一编号|
|service_order_id|服务订单编号|运行态字段|Trip 关联的 ServiceOrder|
|robotaxi_id|Robotaxi 编号|运行态字段|执行履约行驶的 Robotaxi|
|pickup_service_area_id|上车服务区|运行态字段|履约行驶上车 ServiceArea|
|pickup_cell_id|上车位置|运行态字段|履约行驶上车 Cell|
|dropoff_service_area_id|下车服务区|运行态字段|履约行驶下车 ServiceArea|
|dropoff_cell_id|下车位置|运行态字段|履约行驶下车 Cell|
|current_cell_id|当前所在网格|运行态字段|Robotaxi 当前履约位置 Cell|
|pickup_location_summary|上车位置摘要|聚合展示字段|上车位置的结构化摘要|
|dropoff_location_summary|下车位置摘要|聚合展示字段|下车位置的结构化摘要|
|current_location_summary|当前位置摘要|聚合展示字段|当前位置的结构化摘要|
|pickup_location_detail|上车位置详情|聚合展示字段|上车位置的结构化上下文|
|dropoff_location_detail|下车位置详情|聚合展示字段|下车位置的结构化上下文|
|current_location_detail|当前位置详情|聚合展示字段|当前位置的结构化上下文|
|current_step_index|当前步序号|运行态字段|当前执行到 Route 的 Step 下标|
|total_step_count|总移动步数|运行态字段|当前 Route 实际移动步数，等于 route_steps.length - 1|
|total_distance_km|总距离（公里）|运行态字段|履约行驶记录关联所有 Route 的总距离|
|distance_traveled_km|已行驶距离（公里）|运行态字段|历史已完成 Route 距离 + 当前 Route 已行驶距离|
|distance_remaining_km|剩余距离（公里）|运行态字段|当前 Route 剩余距离|
|battery_consumed_kwh|已耗电（千瓦时）|运行态字段|行驶记录累计已耗电量，按千瓦时表达|
|battery_consumed_percent|已消耗电量（%）|兼容字段|旧版行驶消耗百分比，主展示和成本计算使用 kWh|
|time_elapsed|已耗时（分钟）|运行态字段|履约行驶累计已耗时，按分钟表达|
|trip_status|履约行驶状态|运行态字段|Trip 当前状态|
|trip_phase|履约行驶阶段|运行态字段|路径规划或异常处理时使用的 Trip 阶段表达|
|arrival_execution_result|到达执行结果|运行态字段|目的地到达后的执行结果，可为空|
|exception_type|异常类型|运行态字段|履约行驶异常或重规划触发原因，可为空|
|route_id|路径编号|运行态字段|Trip 当前引用 Route，可为空|
|route_planning_run_id|路径规划执行记录编号|运行态字段|Trip 当前引用路径规划执行记录，可为空|
|route_history|路径历史|运行态字段|Trip 履约过程中的路径历史，可为空数组|
|route_history_detail|路径历史详情（兼容）|聚合展示字段|Trip 当前路径与历史路径的结构化展示，前端主展示应优先使用 route_links_detail|
|route_links_detail|关联路径信息|聚合展示字段|面向用户展示的关联 Route 摘要列表，适用于 Trip 与 RouteExecution 详情|
|started_at|开始时间|运行态字段|履约行驶开始时间|
|completed_at|完成时间|运行态字段|履约行驶完成时间|
|event_log|事件记录|运行态字段|履约行驶事件数组|

说明：

- Trip 的完成状态固定为 `trip_status = COMPLETED / 已完成`；
- 历史数据中的 `trip_status = SETTLING` 为错误兼容值，加载时必须迁移为 `COMPLETED`，不得继续生成；
- `trip_status` 与 `order_status` 必须按各自字段上下文翻译，不得因英文值相同或流程关联而互相借用状态含义。

### 16.1 订单与履约状态边界

|状态字段|状态值|中文名|所有权|
|---|---|---|---|
|order_status|SETTLING|结算中|仅 ServiceOrder 使用|
|order_status|COMPLETED|已完成|ServiceOrder 支付完成|
|trip_status|COMPLETED|已完成|Trip 客户下车后完成|
|trip_status|SETTLING|已完成|仅兼容历史错误值，加载时迁移为 COMPLETED，禁止新写入|

说明：

- Trip 是服务订单的履约行驶记录；
- Trip 与 RouteExecution 都可以引用 Route，但二者执行记录独立。

---

## 17. DemandSimulationStrategy：需求模拟策略

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|demand_simulation_strategy_id|需求模拟策略编号|持久化字段|DemandSimulationStrategy 唯一编号|
|simulation_algorithm|需求模拟算法|持久化字段|需求模拟策略使用的算法|
|demand_simulation_run_id|需求模拟执行记录编号|运行态字段|一次需求模拟策略执行记录|
|simulation_result|模拟结果|运行态字段|需求模拟执行成功或失败|
|location_type_weights|位置类型权重|持久化字段|需求位置类型随机选择权重|
|demand_simulation_run_count|需求模拟执行次数|聚合展示字段|策略被执行的次数|
|demand_simulation_success_count|需求模拟成功次数|聚合展示字段|策略执行成功次数|
|location_type|位置类型|运行态字段|需求模拟选择的位置类型|
|weight|权重|持久化字段|随机选择权重|
|random_seed|随机种子|运行态字段|本次需求模拟使用的随机种子|

说明：

- 不再使用泛化的 `strategy_id` 表达需求模拟策略；
- DemandSimulationStrategy 只返回模拟订单上下文，不直接创建 ServiceOrder。

### 17.1 DemandSimulationResult：需求模拟结果

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|demand_simulation_result_id|需求模拟结果编号|运行态字段|DemandSimulationResult 唯一编号|
|demand_simulation_run_id|需求模拟执行记录编号|运行态字段|关联 DemandSimulationRun|
|demand_simulation_strategy_id|需求模拟策略编号|持久化字段|本次结果使用的需求模拟策略|
|customer_id|客户编号|持久化字段|本次模拟选择的客户|
|customer_origin_location_type|客户需求位置类型|运行态字段|本次模拟的客户需求位置类型|
|customer_origin_cell_id|客户需求位置|运行态字段|本次模拟的客户需求位置 Cell|
|pickup_service_area_id|上车服务区|运行态字段|映射得到的上车 ServiceArea|
|pickup_cell_id|上车位置|运行态字段|映射得到的上车 Cell|
|dropoff_service_area_id|下车服务区|运行态字段|模拟得到的下车 ServiceArea|
|dropoff_cell_id|下车位置|运行态字段|模拟得到的下车 Cell|
|simulation_result|模拟结果|运行态字段|SUCCESS 或 FAILED|
|failure_reason|失败原因|运行态字段|失败时记录原因，可为空|

说明：

- DemandSimulationResult 是需求模拟策略执行后的业务结果；
- ServiceOrder 创建流程根据 DemandSimulationResult 创建订单；
- DemandSimulationStrategy 和 DemandSimulationRun 不直接创建 ServiceOrder。

---

## 18. PricingStrategy / PricingDecision：定价策略与定价决策

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|pricing_strategy_id|定价策略编号|持久化字段|PricingStrategy 唯一编号|
|pricing_strategy_run_id|定价策略执行记录编号|运行态字段|一次定价策略执行记录|
|pricing_decision_id|定价决策编号|运行态字段|PricingDecision 唯一编号|
|price_estimation_route_id|价格预估路径编号|运行态字段|价格预估阶段调用路径规划策略生成的 Route 编号|
|pricing_algorithm|定价算法|持久化字段|定价策略使用的算法|
|strategy_type|策略类型|持久化字段|定价策略类型|
|base_fare|起步价|持久化字段|基础起步价|
|distance_unit_price|距离单价|持久化字段|每公里价格|
|time_unit_price|时间单价|持久化字段|每分钟价格|
|supply_demand_multiplier|供需调节系数|运行态字段|供需变化带来的价格系数|
|time_period_multiplier|时段系数|运行态字段|不同时段价格系数|
|service_area_multiplier|区域系数|运行态字段|不同服务区价格系数|
|channel_multiplier|渠道系数|运行态字段|不同订单渠道价格系数|
|pricing_stage|定价阶段|运行态字段|预估或最终结算|
|estimated_distance_km|预估距离（公里）|运行态字段|预估定价阶段使用的路径总距离|
|estimated_duration_min|预估时长（分钟）|运行态字段|预估定价阶段使用的路径移动步数换算时长|
|estimated_price|预估价格|运行态字段|预估定价结果|
|quoted_price|预估价格（兼容）|兼容字段|历史客户报价字段，新增展示与计算不得优先依赖|
|fulfillment_distance_km|履约距离（公里）|运行态字段|最终结算阶段使用的履约行驶总距离|
|fulfillment_duration_min|履约时长（分钟）|运行态字段|最终结算阶段使用的履约行驶累计耗时|
|final_price|最终价格|运行态字段|最终结算价格|
|input_snapshot|输入快照|运行态字段|本次定价策略执行输入|
|output_snapshot|输出快照|运行态字段|本次定价策略执行输出|
|run_result|执行结果|运行态字段|PricingStrategyRun 执行结果|
|pricing_result|定价结果|运行态字段|PricingDecision 定价结果|
|base_price|基础价格|运行态字段|起步价、距离费和时间费合计|
|distance_fee|距离费用|运行态字段|根据距离计算的费用|
|time_fee|时间费用|运行态字段|根据时间计算的费用|
|dynamic_multiplier|综合动态系数|运行态字段|综合后的动态价格系数|

说明：

- 定价可以调用路径规划策略生成价格预估 Route，并使用该 Route 的距离和时长作为输入；
- 价格预估 Route 需要进入路径规划结果，并通过 `route_usage_type = PRICE_ESTIMATION` 与执行类路径区分；
- 定价策略只返回定价执行和定价结果，不主动改变 ServiceOrder、Trip 或 Robotaxi 状态。

---

## 19. OrderMatchingStrategy / OrderMatchingDecision：订单匹配策略与订单匹配结果

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|order_matching_strategy_id|订单匹配策略编号|持久化字段|OrderMatchingStrategy 唯一编号|
|order_matching_run_id|订单匹配执行编号|运行态字段|一次订单匹配策略执行记录|
|order_matching_decision_id|订单匹配结果编号|运行态字段|OrderMatchingDecision 唯一编号|
|matching_algorithm|匹配算法|持久化字段|订单匹配策略使用的算法|
|candidate_filter_rule|候选筛选规则|持久化字段|候选 Robotaxi 筛选规则|
|distance_rule|距离计算规则|持久化字段|接驾距离计算规则|
|battery_rule|电量校验规则|持久化字段|候选车辆最低电量要求|
|scoring_rule|评分规则|持久化字段|候选车辆排序和评分规则|
|min_battery_threshold|最低电量阈值|持久化字段|可参与匹配的最低电量百分比|
|candidate_robotaxi_count|候选车辆数量|运行态字段|进入匹配策略的候选车辆数量|
|eligible_robotaxi_count|可匹配车辆数量|运行态字段|通过筛选的车辆数量|
|selected_robotaxi_id|选中 Robotaxi|运行态字段|订单匹配结果选中的 Robotaxi，可为空|
|selected_robotaxi_location_summary|选中 Robotaxi 位置摘要|聚合展示字段|订单匹配结果中选中 Robotaxi 的当前位置摘要|
|selected_robotaxi_location_detail|选中 Robotaxi 位置详情|聚合展示字段|订单匹配结果中选中 Robotaxi 的当前位置详情|
|candidate_snapshot|候选车辆快照|运行态字段|本次匹配候选车辆及评分快照|
|estimated_pickup_distance_km|预估接驾距离（公里）|运行态字段|选中 Robotaxi 到上车点的预估距离|
|estimated_pickup_duration_min|预估接驾时长（分钟）|运行态字段|选中 Robotaxi 到上车点的预估时间|
|matching_score|匹配评分|运行态字段|本次订单匹配结果评分|
|decision_result|决策结果|运行态字段|OrderMatchingDecision 决策结果|
|decision_reason|决策说明|运行态字段|本次匹配成功或失败说明|

说明：

- OrderMatchingStrategy 只负责返回匹配结果；
- 调用方根据 OrderMatchingDecision 形成的订单匹配结果更新 ServiceOrder 和 Robotaxi；
- 匹配成功后由履约行驶流程创建 Trip，并由 Trip 后续反馈 ServiceOrder 与 Robotaxi 状态。

---

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|order_matching_strategy_id|订单匹配策略编号|持久化字段|OrderMatchingStrategy 唯一编号|
|order_matching_run_id|订单匹配执行编号|运行态字段|一次订单匹配策略执行记录|
|order_matching_decision_id|订单匹配结果编号|运行态字段|OrderMatchingDecision 唯一编号|
|matching_algorithm|匹配算法|持久化字段|订单匹配策略使用的算法|
|candidate_filter_rule|候选车辆筛选规则|持久化字段|如何筛选候选 Robotaxi|
|distance_rule|距离计算规则|持久化字段|候选车辆距离计算方式|
|battery_rule|电量校验规则|持久化字段|候选车辆电量要求|
|scoring_rule|评分规则|持久化字段|候选车辆评分规则|
|candidate_robotaxi_count|候选车辆数量|运行态字段|初始候选车辆数量|
|eligible_robotaxi_count|可用车辆数量|运行态字段|通过筛选的车辆数量|
|selected_robotaxi_id|选中 Robotaxi|运行态字段|匹配成功选中的 Robotaxi|
|matching_score|匹配评分|运行态字段|最终匹配评分|
|decision_result|决策结果|运行态字段|订单匹配结果成功或失败|
|decision_reason|决策说明|运行态字段|匹配结果说明|

说明：

- 订单匹配策略只返回匹配结果；
- 是否更新 ServiceOrder、Robotaxi 或创建 Trip，由调用方业务流程决定。

---

## 20. 通用快照与时间字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|input_snapshot|输入快照|运行态字段|策略执行输入数据快照|
|output_snapshot|输出快照|运行态字段|策略执行输出数据快照|
|strategy_snapshot|策略快照|运行态字段|策略执行时使用的策略定义快照|
|trigger_object_type|触发对象类型|持久化字段|路径规划策略适用的触发业务对象|
|candidate_snapshot|候选对象快照|运行态字段|匹配策略候选集合快照|
|run_result|执行结果|运行态字段|策略执行成功或失败|
|created_at|创建时间|运行态字段|记录创建时间|

---

## 21. ValidationResult：初始化校验结果

ValidationResult 不是空间业务对象，仅用于展示初始化校验结果。

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|rule_id|规则编号|校验结果字段|校验规则唯一编号|
|rule_name|规则名称|校验结果字段|校验规则中文名称|
|result|结果|校验结果字段|PASS 或 FAIL|
|detail|说明|校验结果字段|补充说明|

---

## 22. 枚举值字典

前端应将代码内部稳定使用的英文枚举值转换为中文，不直接向运营人员暴露代码值。

|英文字段值|中文显示值|
|---|---|
|SIMULATION_GRID|模拟网格坐标|
|EMPTY|空白区域|
|ROAD|道路区域|
|PLACE|地点区域|
|BLOCKED|不可通行区域|
|MAIN_ROAD|主干路|
|SECONDARY_ROAD|次干路|
|INTERNAL_ROAD|内部道路|
|ACCESS_ROAD|接入道路|
|INTERSECTION|道路交叉口|
|ROAD_ENDPOINT|道路端点|
|ENTRANCE_EXIT|出入口|
|RAMP_NODE|匝道节点|
|TURNING_POINT|转向节点|
|TWO_WAY|双向通行|
|ONE_WAY|单向通行|
|RESIDENTIAL|住宅区|
|OFFICE|办公区|
|COMMERCIAL|商业区|
|SCHOOL|学校|
|HOSPITAL|医院|
|METRO_STATION|地铁站|
|HOTEL|酒店|
|TRANSPORT_HUB|交通枢纽|
|OPS_CENTER|运营中心|
|MORNING_OUTBOUND|早高峰流出|
|EVENING_INBOUND|晚高峰流入|
|EVENING_OUTBOUND|晚高峰流出|
|ALL_DAY_STABLE|全天稳定|
|WEEKEND_PEAK|周末高峰|
|EVENT_DRIVEN|事件驱动|
|LOW_DEMAND|低需求|
|CITY|城市|
|OPERATING_REGION|运营大区|
|ZONE|运营区域|
|SUB_ZONE|子区域|
|MICRO_ZONE|微区域|
|RESIDENTIAL_ZONE|住宅区域|
|OFFICE_ZONE|办公区域|
|COMMERCIAL_ZONE|商业区域|
|TRANSPORT_ZONE|交通区域|
|MIXED_ZONE|混合区域|
|SUPPORT_ZONE|保障区域|
|PLACE_DEMAND|地点需求画像|
|SERVICE_AREA_DEMAND|服务区需求画像|
|ZONE_DEMAND|区域需求画像|
|place|地点|
|serviceArea|服务区|
|zone|区域|
|Planned|规划中|
|Testing|测试中|
|Active|可使用|
|Restricted|受限使用|
|Suspended|暂停使用|
|Closed|已关闭|
|Blocked|已阻断|
|Deprecated|已废弃|
|PASS|通过|
|FAIL|未通过|
|L4|L4（限定区域内无人驾驶）|
|L5|L5（完全自动驾驶）|
|PASSENGER_RIDE|载客出行服务|
|PENDING_ADMISSION|待准入|
|IN_FLEET_OPERATION|运维中|
|PENDING_INSPECTION|待准入|
|IN_INSPECTION|准入检查中|
|AVAILABLE|可运营|
|UNAVAILABLE|运维中|
|RETIRED|已退役|
|PARKED|停车中|
|STOPPED|临停中|
|MOVING|行驶中|
|CLEAN|清洁正常|
|NEEDS_CLEANING|需要清洁|
|IN_CLEANING|清洁中|
|ENOUGH|电量充足|
|LOW|低|
|CRITICAL|严重|
|NORMAL|普通|
|DUE_SOON|即将维修|
|DUE|需要维修|
|IN_MAINTENANCE|维修中|
|NONE|无|
|ALERTED|已报警|
|REMOTE_HANDLING|远程处理中|
|BROKEN|故障不可运营|
|ACTIVE|有效|
|RETIREMENT_CANDIDATE|待退役评估|
|NEED_CLEANING|需要清洁|
|NEED_CHARGING|需要充电|
|NEED_MAINTENANCE|需要维修|
|WAITING_SERVICE_COMPLETION|等待当前服务完成|
|MOVING_TO_OPS_CENTER|前往目的地|
|IN_CHARGING|充电中|
|READY_FOR_INSPECTION|待准入复核|
|INSPECTION_OPERATOR|检查人员|
|CLEANING_OPERATOR|清洁人员|
|CHARGING_OPERATOR|充电协助人员|
|MAINTENANCE_OPERATOR|维修人员|
|IDLE|空闲|
|BUSY|忙碌|
|OFF_DUTY|非工作中|
|READINESS_CHECK|运营准入检查|
|DEPLOYMENT|运营投放|
|CLEANING|清洁|
|CHARGING|充电|
|MAINTENANCE|维修|
|FAILURE_HANDLING|故障处理|
|RETIREMENT|退役|
|CREATED|已创建|
|WAITING_ASSIGNMENT|待分配|
|WAITING_CHECK|待检查|
|CHECKING|检查中|
|WAITING_ROBOTAXI_AVAILABLE|任务排队中|
|WAITING_DESTINATION_ASSIGNMENT|待分配目的站点|
|WAITING_CHARGING_DESTINATION_ASSIGNMENT|待分配充电站|
|WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT|待分配维修站|
|WAITING_ROUTE|待行驶|
|WAITING_START|待行驶|
|ARRIVED_OPS_CENTER|已到达目的地|
|WAITING_RESOURCE_ASSIGNMENT|待分配 Worker|
|WAITING_WORKER_ASSIGNMENT|待分配 Worker|
|READY_TO_CLEAN|待清洁|
|READY_TO_START|待作业（兼容）|
|CLEANING|清洁中|
|CLEANING_IN_PROGRESS|清洁中（兼容）|
|IN_PROGRESS|兼容作业中|
|MOVING_TO_CHARGER|前往目的地|
|ARRIVED_CHARGER|已到达目的地|
|WAITING_CHARGER_ASSIGNMENT|待分配 Worker|
|CONNECTING_CHARGER|接入充电中（兼容）|
|READY_TO_CHARGE|待充电|
|READY_TO_DISCONNECT|待拔充电头|
|DISCONNECTING_CHARGER|断开充电中（兼容）|
|MOVING_TO_MAINTENANCE_CENTER|前往目的地|
|ARRIVED_MAINTENANCE_CENTER|已到达目的地|
|READY_TO_REPAIR|待维修|
|REPAIRING|维修中|
|MAINTENANCE_IN_PROGRESS|维修中（兼容）|
|WAITING_DIAGNOSIS_ASSIGNMENT|待分配 Worker|
|DIAGNOSING|诊断中|
|WAITING_DISPOSITION|待处置决策|
|TRANSFERRED_TO_MAINTENANCE|已转维修|
|TRANSFERRED_TO_RETIREMENT|已转退役|
|RESOLVED_NO_ACTION|无需处理|
|WAITING_RETIREMENT_APPROVAL|待退役确认|
|MOVING_TO_RETIREMENT_CENTER|前往目的地|
|ARRIVED_RETIREMENT_CENTER|已到达目的地|
|PROCESSING_RETIREMENT|退役处理中|
|ARRIVED|已到达|
|ARRIVAL_ABNORMAL|异常到达|
|COMPLETED|已完成|
|CANCELLED|已取消|
|FAILED|失败|
|SUPPLY_ASSIGNMENT_DECISION|供给分配决策|
|TASK_RESULT|任务结果触发|
|MEDIUM|中|
|HIGH|高|
|FALSE_ALARM|误报|
|CONTINUE_OPERATION|可继续运营|
|NEEDS_MAINTENANCE|需要维修|
|NEEDS_RETIREMENT|需要退役|
|WAIT_MANUAL_DECISION|等待人工决策|
|REPAIRED|已修复|
|NOT_REPAIRABLE|不可修复|
|PARTIALLY_REPAIRED|部分修复|
|PENDING|待确认|
|APPROVED|已确认|
|REJECTED|已驳回|
|IN_RETIREMENT|退役处理中|
|SENSOR|传感器|
|HARDWARE|硬件|
|SOFTWARE|软件|
|BATTERY|电池|
|TIRE|轮胎|
|BODY|车身|
|SCHEDULED_SERVICE|周期保养|
|AUTO_BY_SERVICE_AREA|按服务区能力自动处理|
|TEMP_STOP_AND_STANDBY|临停待命|
|PARK_AND_STANDBY|停车待命|
|STOP_ONLY|仅临时停靠|
|PARK_ONLY|仅停车|
|RETURN_TO_OPS_CENTER|返回运营中心|
|SAME_SERVICE_AREA_RETRY|同服务区替代点重试|
|FAIL_FAST|快速失败|
|WAIT_DECISION|等待运营决策|
|NORMAL_ARRIVAL|正常到达|
|ARRIVED_WITH_TARGET_OCCUPIED|目标点位被占用|
|ARRIVED_WITH_TARGET_BLOCKED|目标点位被阻塞|
|ARRIVED_WITH_NO_AVAILABLE_STOPPING_CELL|无可临停点位|
|ARRIVED_WITH_NO_AVAILABLE_PARKING_CELL|无可停车点位|
|TARGET_SERVICE_AREA_UNAVAILABLE|目标服务区不可用|
|ROUTE_FAILED|路径执行失败|
|ROUTE_PLANNING_FAILED|路径规划执行失败|
|INITIAL_PLANNING|初始路径规划|
|ABNORMAL_ARRIVAL_REPLAN|异常到达后重新规划|
|SERVICE_ORDER_PICKUP_PLANNING|服务订单接驾路径规划|
|SERVICE_ORDER_DESTINATION_PLANNING|服务订单载客路径规划|
|DESTINATION_CHANGE_REPLAN|目的地变更重规划|
|SERVICE_ROUTE_EXCEPTION_REPLAN|服务路径异常重规划|
|ROUTE_BLOCKED_REPLAN|路径阻塞后重新规划|
|INITIAL_DEPLOYMENT_ROUTE|初始运营投放路径|
|ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN|异常到达同服务区替代路径|
|SERVICE_ORDER_PICKUP_ROUTE|服务订单接驾路径|
|SERVICE_ORDER_DESTINATION_ROUTE|服务订单载客路径|
|WAITING_OPERATION_DECISION|等待运营决策|
|BFS_CELL_GRAPH|BFS 网格图搜索|
|INDIVIDUAL|普通个人客户|
|BUSINESS|商务客户|
|VISITOR|临时访客|
|TEST_CUSTOMER|测试客户|
|OWN_APP|自有 App|
|PARTNER_APP|外部合作平台|
|MANUAL_TEST|后台模拟测试|
|OWN_APP_SIMULATED_ORDER|模拟自有 App 服务订单|
|PARTNER_APP_SIMULATED_ORDER|模拟外部平台服务订单|
|ACTIVE|可使用|
|INACTIVE|不可使用|
|ARCHIVED|已归档|
|CREATED|已创建|
|WAITING_PRICE_ESTIMATE|待估价|
|WAITING_ROBOTAXI_CALL|待呼叫 Robotaxi|
|WAITING_ROBOTAXI_ASSIGNMENT|待分配|
|ROBOTAXI_ASSIGNMENT_FAILED|分配 Robotaxi 失败|
|CALCULATING_PRICE|正在计算价格|
|WAITING_CUSTOMER_CONFIRM|等待客户确认|
|CUSTOMER_CANCELLED_BEFORE_CONFIRM|客户确认前取消|
|WAITING_FOR_VEHICLE|等待匹配车辆|
|VEHICLE_ASSIGNED|车辆已分配|
|VEHICLE_ON_THE_WAY_TO_PICKUP|车辆前往上车点|
|VEHICLE_ARRIVED_PICKUP|车辆已到达上车点|
|WAITING_PASSENGER_BOARDING|等待乘客上车|
|WAITING_CUSTOMER_BOARDING|待客户上车|
|CUSTOMER_ONBOARD|客户已上车|
|ON_THE_WAY_PICKUP|前往上车点|
|ON_THE_WAY_TO_DESTINATION|正在前往目的地|
|ON_THE_WAY_DESTINATION|前往目的地|
|ARRIVED_DESTINATION|已到达目的地|
|SETTLING|结算中|
|WAITING_PAYMENT|待支付|
|PAYMENT_PROCESSING|支付处理中|
|MATCH_FAILED|匹配失败|
|TRIP_FAILED|行程执行失败|
|PENDING|等待处理|
|ASSIGNED|已分配|
|ARRIVED_PICKUP|已到达上车点|
|PASSENGER_ONBOARD|乘客已上车|
|PAID|已支付|
|UNPAID|未支付|
|ESTIMATE|预估|
|FINAL|最终结算|
|SUCCESS|成功|
|BASIC_RANDOM_DEMAND_SIMULATION|基础随机需求模拟|
|BASIC_WEIGHTED_RANDOM_SAMPLING|基础加权随机采样|
|NO_ACTIVE_CUSTOMER|没有可用客户|
|NO_AVAILABLE_PLACE|没有可用地点|
|NO_AVAILABLE_ROAD_SEGMENT|没有可用道路片段|
|CUSTOMER_LOCATION_INVALID|客户需求位置无效|
|NO_AVAILABLE_PICKUP_CELL|没有可用上车点|
|NO_AVAILABLE_DROPOFF_CELL|没有可用下车点|
|BASIC_RULE_BASED_DYNAMIC_PRICING|基础规则动态定价|
|BASIC_NEAREST_AVAILABLE_ROBOTAXI|最近可用 Robotaxi 匹配|
|READY|就绪|
|RUNNING|运行中|
|PAUSED|已暂停|
|STOPPED|已停止|
|DRAFT|草稿|
|DISABLED|停用|
|SLOW|慢速|
|NORMAL|标准|
|FAST|快速|
|ULTRA_FAST|超高速|
|NIGHT|夜间|
|MORNING|上午|
|NOON|中午|
|AFTERNOON|下午|
|EVENING|晚上|
|PEAK|高峰期|
|LOW|低需求期|
|TICK_ORDER_COUNT_DISTRIBUTION|Tick 级订单数量分布|
|FIXED_ORDER_COUNT|固定订单数量|
|POISSON|泊松分布|
|UNIFORM|均匀分布|
|SIMULATION_SYSTEM|模拟系统|
|SUPPLY_TRIGGER|供给侧触发器|
|DEMAND_TRIGGER|需求侧触发器|
|EXECUTION_ENGINE|执行引擎|
|BUSINESS_SERVICE|业务服务|
|SKIPPED|已跳过|
|NO_ACTION|无动作|
|SIMULATION_RUN_STARTED|模拟运行已启动|
|SIMULATION_RUN_PAUSED|模拟运行已暂停|
|SIMULATION_RUN_RESUMED|模拟运行已恢复|
|SIMULATION_RUN_COMPLETED|模拟运行已完成|
|SIMULATION_RUN_STOPPED|模拟运行已停止|
|SIMULATION_RUN_FAILED|模拟运行失败|
|SIMULATION_DRAIN_STARTED|工作流排空开始|
|SIMULATION_DRAIN_COMPLETED|工作流排空完成|
|SIMULATION_DRAIN_FAILED|工作流排空失败|
|SIMULATION_TICK_STARTED|模拟 Tick 开始|
|SIMULATION_TICK_COMPLETED|模拟 Tick 完成|
|SIMULATION_SCENE_UPDATED|模拟场景已更新|
|SUPPLY_TRIGGER_STARTED|供给侧触发开始|
|SUPPLY_TRIGGER_COMPLETED|供给侧触发完成|
|READINESS_CHECK_TRIGGERED|准入检查已触发|
|READINESS_CHECK_CREATED|准入任务已创建|
|READINESS_CHECK_NO_ACTION|准入检查无动作|
|READINESS_CHECK_FAILED|准入检查失败|
|DEPLOYMENT_TRIGGERED|投放已触发|
|DEPLOYMENT_TASK_CREATED|投放任务已创建|
|DEPLOYMENT_NO_ACTION|投放无动作|
|DEPLOYMENT_TRIGGER_FAILED|投放触发失败|
|ROUTE_EXECUTION_TRIGGERED|行驶执行已触发|
|ROUTE_EXECUTION_UPDATED|行驶执行已更新|
|ROUTE_EXECUTION_COMPLETED|行驶执行已完成|
|ROUTE_EXECUTION_NO_ACTION|行驶执行无动作|
|DEMAND_TRIGGER_STARTED|需求触发开始|
|ORDER_COUNT_GENERATED|订单数量已生成|
|DEMAND_NO_ORDER_GENERATED|需求未生成订单|
|ACTION_RECEIVED|动作已接收|
|ACTION_EXECUTED|动作已执行|
|ACTION_FAILED|动作失败|
|DOMAIN_STATE_CHANGED|领域状态已变更|

---

## 22.1 模拟业务审计公共字段

由 SimulationLoop、WorkflowEngine 和 ExecutionEngine 创建或推进的业务对象统一使用以下字段，并与真实审计时间分开保存：

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|record_source|记录来源|持久化字段|记录由 SIMULATION 模拟生成或 MANUAL 人工操作|
|simulation_run_id|模拟运行编号|持久化字段|创建或推进该对象的 SimulationRun|
|simulation_created_at|模拟创建时间|持久化字段|对象在连续模拟时间轴中的创建时间，格式 Day N HH:MM:SS|
|simulation_updated_at|模拟更新时间|运行态字段|对象最近一次被模拟工作流更新的时间|
|simulation_completed_at|模拟完成时间|运行态字段|对象在模拟工作流中进入终态的时间|
|simulation_matched_at|模拟匹配时间|运行态字段|服务订单在模拟中完成车辆匹配的时间|
|simulation_payment_completed_at|模拟支付完成时间|运行态字段|服务订单在模拟中完成支付的时间|
|simulation_global_tick|模拟全局 Tick|运行态字段|字段变化发生时的连续时间轴 Tick|

真实 `created_at`、`updated_at`、`completed_at`、`matched_at` 和 `payment_completed_at` 继续表示真实审计时间。人工操作对象的模拟字段为空，不得用真实时间伪造模拟时间。

枚举中文：

|枚举值|中文名|
|---|---|
|SIMULATION|模拟生成|
|MANUAL|人工操作|

---

## 23. SimulationPolicy：模拟策略

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|simulation_policy_id|模拟策略编号|持久化字段|SimulationPolicy 唯一编号|
|policy_name|策略名称|持久化字段|模拟策略名称|
|policy_status|策略状态|运行态字段|策略当前状态：DRAFT / ACTIVE / DISABLED / ARCHIVED|
|tick_minutes|Tick 时长（分钟，兼容）|持久化字段|兼容展示字段；统一时间推进以 tick_seconds 为准|
|tick_seconds|Tick 时长（秒）|持久化字段|每次 Tick 推进的统一模拟秒数，是模拟世界时间主配置|
|simulation_speed_config|模拟推进速度配置|持久化字段|控制真实执行周期和每周期批量推进的 Tick 数，不改变模拟世界 Tick 秒数|
|simulation_performance_config|模拟性能配置|持久化字段|控制事件记录、检查点、界面快照、持久化防抖和调试日志上限|
|event_recording_mode|事件记录模式|持久化字段|BUSINESS_AND_CHECKPOINT / VERBOSE_TICK|
|checkpoint_interval_seconds|检查点周期（秒）|持久化字段|空 Tick 聚合检查点事件的模拟秒周期|
|ui_snapshot_interval_seconds|界面快照周期（秒）|持久化字段|行驶进度等高频展示快照的最小更新周期|
|max_events_in_memory|内存事件上限|持久化字段|前端内存中保留的模拟事件上限|
|persistence_debounce_ms|持久化防抖（毫秒）|持久化字段|运行态快照写入 IndexedDB 的防抖时间|
|debug_log_enabled|调试日志开关|持久化字段|是否写入 window.__simDebug 调试日志|
|debug_log_limit|调试日志上限|持久化字段|调试日志最多保留条数|
|real_cycle_interval_ms|真实执行周期（毫秒）|持久化字段|前端执行一次模拟推进批次的真实时间间隔|
|ticks_per_real_cycle|每周期推进 Tick 数|持久化字段|每个真实执行周期批量推进的模拟 Tick 数|
|simulation_days|模拟天数|持久化字段|一次模拟运行的总天数|
|run_speed_level|运行速度等级|持久化字段|模拟运行速度：SLOW / NORMAL / FAST / ULTRA_FAST|
|random_seed|随机种子|持久化字段|随机数种子|
|worker_work_start_time|作业人员工作开始时间|持久化字段|运营中心作业人员的上班时间|
|worker_work_end_time|作业人员工作结束时间|持久化字段|运营中心作业人员的下班时间|
|robotaxi_operating_start_time|Robotaxi 运营开始时间|持久化字段|Robotaxi 开始运营的时间|
|robotaxi_operating_end_time|Robotaxi 运营结束时间|持久化字段|Robotaxi 结束运营的时间|
|time_period_configs|时间段配置|持久化字段|一天内各时间段的配置列表|
|time_window_configs|时间窗口配置|持久化字段|各时间窗口的需求配置列表|
|demand_generation_config|需求生成配置|持久化字段|需求生成的全局配置|
|demand_generation_enabled|需求生成开关|持久化字段|是否启用需求自动生成|
|demand_generation_mode|需求生成模式|持久化字段|需求订单生成模式|
|demand_generation_interval_seconds|需求生成周期（秒）|持久化字段|需求模型按统一模拟秒每隔多少秒触发一次，默认 600 秒|
|max_orders_per_tick_global|每 Tick 最大订单数|兼容字段|旧版每 Tick 最大生成订单数；新逻辑优先使用每次生成最大订单数|
|max_orders_per_generation_global|每次生成最大订单数|持久化字段|需求模型每次触发时最多生成的订单数|
|demand_profiles|需求分布配置|持久化字段|各时段需求分布配置列表|
|supply_trigger_config|供给侧触发配置|持久化字段|供给侧自动触发开关配置|
|supply_trigger_enabled|供给侧触发开关|持久化字段|是否启用供给侧自动触发|
|readiness_trigger_enabled|准入检查触发开关|持久化字段|是否启用准入检查自动触发|
|deployment_trigger_enabled|投放触发开关|持久化字段|是否启用投放自动触发|
|route_execution_trigger_enabled|行驶执行触发开关|持久化字段|是否启用行驶执行自动触发|
|readiness_trigger_interval_seconds|准入触发周期（秒）|持久化字段|准入任务创建触发周期，仍必须满足作业人员工作时间|
|deployment_trigger_interval_seconds|投放触发周期（秒）|持久化字段|投放任务创建触发周期，仍必须满足作业人员工作时间和 Robotaxi 运营时间|
|service_order_auto_config|服务订单自动化配置|持久化字段|服务订单各环节自动化开关|
|auto_pricing_enabled|自动定价开关|持久化字段|是否自动执行定价|
|auto_customer_confirm_enabled|自动客户确认开关|持久化字段|是否自动确认客户订单|
|auto_order_matching_enabled|自动订单匹配开关|持久化字段|是否自动执行订单匹配|
|auto_trip_creation_enabled|自动履约创建开关|持久化字段|是否自动创建履约行驶记录|
|auto_trip_progress_enabled|自动履约推进开关|持久化字段|是否自动推进履约行驶|
|auto_payment_enabled|自动支付开关|持久化字段|是否自动完成支付|
|execution_time_config|执行耗时配置|持久化字段|模拟运行时自动化动作的耗时配置，不等同于模拟结束后的工作流时效计算配置|
|readiness_check_seconds|准入检查耗时（秒）|配置字段|Worker 执行准入检查的模拟耗时|
|cell_travel_seconds|单 Cell 行驶耗时（秒）|配置字段|Robotaxi 沿 Route 移动一个 Cell 的模拟耗时|
|arrival_detection_seconds|到达识别耗时（秒）|配置字段|Robotaxi 到达后识别正常或异常到达的模拟耗时|
|assignment_retry_interval_seconds|分配重试间隔（秒）|配置字段|自动限时分配 Robotaxi 会话的连续重试推进间隔|
|assignment_max_wait_seconds|最大分配等待（秒）|配置字段|客户确认叫车后自动分配 Robotaxi 的最大等待时长|
|order_matching_retry_seconds|订单匹配重试等待（秒）|兼容配置字段|旧版订单一次匹配无车后等待下一次匹配的模拟耗时；新增逻辑优先使用 assignment_retry_interval_seconds|
|order_matching_max_retry_count|订单匹配最大重试次数|配置字段|订单超过该次数后才进入终态分配失败|
|passenger_boarding_seconds|乘客上车耗时（秒）|配置字段|乘客上车动作模拟耗时|
|passenger_dropoff_seconds|乘客下车耗时（秒）|配置字段|乘客下车动作模拟耗时|
|settlement_seconds|结算耗时（秒）|配置字段|服务订单结算动作模拟耗时|
|payment_seconds|支付耗时（秒）|配置字段|服务订单支付动作模拟耗时|
|worker_readiness_check_ticks|准入检查耗时（Tick）|持久化字段|准入检查需要多少个 Tick 完成|
|passenger_boarding_ticks|乘客上车耗时（Tick）|持久化字段|乘客上车需要多少个 Tick|
|dropoff_and_payment_ticks|下车与支付耗时（Tick）|持久化字段|下车和支付需要多少个 Tick|
|robotaxi_speed_kmh|Robotaxi 行驶速度（km/h）|持久化字段|Robotaxi 行驶速度|
|default_completion_config|默认完成配置|持久化字段|各环节默认成功完成的配置|
|default_readiness_passed|准入检查默认通过|持久化字段|准入检查是否默认通过|
|default_deployment_arrival_normal|投放到达默认正常|持久化字段|投放到达是否默认正常|
|default_pickup_arrival_normal|接驾到达默认正常|持久化字段|接驾到达是否默认正常|
|default_passenger_boarded|乘客默认已上车|持久化字段|乘客是否默认成功上车|
|default_service_arrival_normal|送达到达默认正常|持久化字段|送达目的地是否默认正常|
|default_payment_success|支付默认成功|持久化字段|支付是否默认成功|
|enable_exception_probability|异常概率开关|持久化字段|是否启用异常概率模拟|

---

## 24. SimulationRun：模拟运行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|simulation_run_id|模拟运行编号|持久化字段|SimulationRun 唯一编号|
|simulation_name|模拟运行名称|持久化字段|模拟运行名称|
|simulation_status|模拟运行状态|运行态字段|当前模拟状态：READY / RUNNING / PAUSED / DRAINING / COMPLETED / STOPPED / FAILED；DRAINING 表示计划 Tick 已结束但已触发自动化动作仍在收尾执行；FAILED 表示运行对象自身异常结束，不等同于普通业务单据失败|
|simulation_policy_id|模拟策略编号|持久化字段|关联的 SimulationPolicy 编号|
|simulation_policy_snapshot|模拟策略快照|运行态字段|运行创建时的策略快照|
|simulation_timeline_id|模拟时间轴编号|持久化字段|串联多次连续 SimulationRun 的时间轴编号|
|previous_simulation_run_id|上一模拟运行编号|持久化字段|同一时间轴内上一运行编号|
|total_days|模拟总天数|持久化字段|模拟总天数|
|tick_minutes|Tick 时长（分钟，兼容）|持久化字段|兼容展示字段；运行推进以 tick_seconds 为准|
|tick_seconds|Tick 时长（秒）|持久化字段|每次 Tick 的统一模拟秒数，是时间推进计算值|
|total_ticks|总 Tick 数|持久化字段|模拟运行总 Tick 数|
|simulation_start_seconds|模拟开始绝对秒|持久化字段|本次运行在统一世界时间上的触发窗口起点|
|planned_simulation_end_seconds|计划结束绝对秒|持久化字段|本次运行停止新增需求和供给触发的计划窗口终点；连续创建下一次运行时优先继承该值|
|simulation_end_seconds|实际结束绝对秒|运行态字段|包含排空阶段的实际完成绝对秒，只记录收尾完成事实，不作为下一运行触发窗口起点|
|simulation_start_at|模拟开始时间|持久化字段|统一 Day N HH:MM:SS 格式的开始时间|
|planned_simulation_end_at|计划模拟结束时间|持久化字段|统一 Day N HH:MM:SS 格式的计划结束时间|
|simulation_time_world_summary|统一模拟时间说明|聚合展示字段|前端解释统一模拟秒、当前显示时间、Tick 秒数和计划时间范围|
|simulation_end_at|实际模拟结束时间|运行态字段|统一 Day N HH:MM:SS 格式的实际结束时间|
|current_simulation_seconds|当前模拟绝对秒|运行态字段|当前时间轴绝对模拟秒，是运行时钟唯一计算源|
|current_day|当前模拟天数|运行态字段|当前模拟进行到第几天|
|current_time|当前模拟时间|运行态字段|当前模拟时间（Day N HH:MM:SS）|
|current_clock_time|当前日内时间|运行态字段|供时间窗口计算使用的 HH:MM:SS|
|current_day_tick|当天 Tick 序号|运行态字段|当天的 Tick 序号|
|current_run_tick|当前运行 Tick 序号|运行态字段|本次运行实际 Tick，包含排空 Tick|
|current_global_tick|全局 Tick 序号|运行态字段|由统一世界秒和 tick_seconds 推导的连续 Tick 序号，不作为独立事实时间来源|
|trigger_ticks_completed|已完成触发 Tick 数|运行态字段|已执行供给和需求触发的计划 Tick 数|
|drain_ticks|排空 Tick 数|运行态字段|计划周期结束后用于完成既有工作流的 Tick 数|
|max_drain_ticks|最大排空 Tick 数|持久化字段|排空未收敛前允许执行的最大 Tick 数|
|current_time_period|当前时间段|运行态字段|当前所处时间段|
|current_period_type|当前时段类型|运行态字段|当前时段类型：PEAK / NORMAL / LOW|
|current_supply_scene|当前供给侧场景|运行态字段|当前供给侧 Tick 场景快照|
|current_demand_scene|当前需求侧场景|运行态字段|当前需求侧 Tick 场景快照|
|current_scene_summary|当前场景摘要|运行态字段|当前场景的文本摘要|
|current_tick_event_summary|当前 Tick 事件摘要|运行态字段|当前 Tick 的事件摘要|
|started_at|开始时间|运行态字段|模拟运行开始时间|
|paused_at|暂停时间|运行态字段|最近一次暂停时间|
|resumed_at|恢复时间|运行态字段|最近一次恢复时间|
|completed_at|完成时间|运行态字段|模拟完成时间|
|stopped_at|停止时间|运行态字段|模拟停止时间|
|failure_reason|失败原因|运行态字段|模拟运行对象自身异常结束的原因|
|failure_summary|失败定位摘要|运行态字段|模拟运行异常结束时记录失败来源、动作、对象和当前 Tick|
|failure_source|失败来源|运行态字段|失败定位摘要中的来源分类|
|failure_action|失败动作|运行态字段|失败定位摘要中的动作或事件类型|
|failure_object_type|失败对象类型|运行态字段|失败定位摘要中的对象类型|
|failure_object_id|失败对象编号|运行态字段|失败定位摘要中的对象编号|
|result_summary|结果摘要|运行态字段|模拟完成后的结果摘要|
|created_at|创建时间|运行态字段|记录创建时间|

---

## 24.1 TimeContext：统一时间上下文

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|time_mode|时间模式|运行态字段|REAL_MANUAL / REAL_AUTOMATION / SIMULATION|
|trigger_source|触发来源|运行态字段|MANUAL / REAL_AUTOMATION / SIMULATION_AUTOMATION|
|now|当前真实时间|运行态字段|本次业务动作使用的真实时间|
|simulation_run_id|模拟运行编号|运行态字段|模拟时间模式下的来源运行对象|
|simulation_timeline_id|模拟时间轴编号|运行态字段|模拟时间模式下的连续时间轴|
|simulation_seconds|模拟秒|运行态字段|模拟时间轴上的当前绝对秒|
|simulation_timestamp|模拟时间|运行态字段|统一 Day N HH:MM:SS 展示时间|
|global_tick|全局 Tick|运行态字段|模拟时间模式下的全局 Tick|

---

## 24.2 TimedOperation：时间作业

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|timed_operation_id|时间作业编号|运行态字段|TimedOperation 唯一编号|
|time_mode|时间模式|运行态字段|REAL_MANUAL / REAL_AUTOMATION / SIMULATION|
|operation_type|作业类型|运行态字段|TRAVEL / ARRIVAL_DETECTION / WORKER_CHECK / ORDER_AUTO_ASSIGNMENT / ORDER_MATCH_RETRY / ORDER_ASSIGNMENT_TIMEOUT / GENERIC_ACTION|
|operation_status|作业状态|运行态字段|PENDING / RUNNING / COMPLETED / FAILED / CANCELLED；TimedOperation 中 CANCELLED 面向用户显示为“已撤销”，不等同于服务订单已取消|
|object_type|业务单类型|运行态字段|时间作业关联的业务单或业务对象类型|
|object_id|业务单编号|运行态字段|时间作业关联的业务单或业务对象编号|
|action_type|触发动作|运行态字段|作业到期后应调用的业务动作，可为空|
|started_at|开始时间|运行态字段|真实时间模式下作业开始时间|
|planned_completed_at|计划完成时间|运行态字段|真实时间模式下计划完成时间|
|completed_at|完成时间|运行态字段|真实完成时间|
|simulation_started_at|模拟开始时间|运行态字段|模拟时间模式下作业开始时间|
|simulation_planned_completed_at|模拟计划完成时间|运行态字段|模拟时间模式下计划完成时间|
|simulation_completed_at|模拟完成时间|运行态字段|模拟完成时间|
|start_seconds|开始秒|运行态字段|作业在统一时间轴上的开始秒|
|planned_completed_seconds|计划完成秒|运行态字段|作业在统一时间轴上的计划完成秒|
|duration_seconds|计划耗时（秒）|运行态字段|作业计划持续时间|
|elapsed_seconds|已耗时（秒）|运行态字段|随统一时间推进计算的已耗时|
|remaining_seconds|剩余耗时（秒）|运行态字段|随统一时间推进计算的剩余耗时|
|progress_percent|进度（%）|运行态字段|随统一时间推进计算的完成进度|
|failure_reason|失败原因|运行态字段|作业失败原因|
|operation_payload|作业负载|运行态字段|作业执行所需的结构化上下文|
|timed_operation_summary|时间作业摘要|运行态字段|当前 Tick 的时间作业推进摘要|
|total_timed_operations|时间作业总数|运行态字段|当前时间作业总数|
|due_timed_operations|到期作业数|运行态字段|本次时间推进到期的作业数量|
|pending_timed_operations|等待作业数|运行态字段|仍在等待开始的作业数量|
|running_timed_operations|执行中作业数|运行态字段|正在随时间执行的作业数量|
|completed_timed_operations|已完成作业数|运行态字段|已完成的作业数量|
|failed_timed_operations|失败作业数|运行态字段|失败的作业数量|
|cancelled_timed_operations|已撤销作业数|运行态字段|已撤销的作业数量|
|created_at|创建时间|运行态字段|记录创建时间|

---

## 25. SimulationEvent：模拟事件记录

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|simulation_event_id|模拟事件编号|运行态字段|SimulationEvent 唯一编号|
|simulation_run_id|模拟运行编号|运行态字段|所属 SimulationRun|
|simulation_day|模拟天数|运行态字段|事件发生在模拟第几天|
|simulation_time|模拟时间|运行态字段|事件发生的模拟时间|
|day_tick|当天 Tick|运行态字段|事件发生的当天 Tick 序号|
|global_tick|全局 Tick|运行态字段|事件发生的全局 Tick 序号|
|event_type|事件类型|运行态字段|事件类型枚举值|
|event_source|事件来源|运行态字段|事件来源：SIMULATION_SYSTEM / SUPPLY_TRIGGER / DEMAND_TRIGGER / EXECUTION_ENGINE / BUSINESS_SERVICE|
|related_object_type|关联对象类型|运行态字段|关联的业务对象类型|
|related_object_id|关联对象编号|运行态字段|关联的业务对象编号|
|event_result|事件结果|运行态字段|SUCCESS / FAILED / SKIPPED / NO_ACTION|
|failure_reason|失败原因|运行态字段|事件失败时的原因说明|
|skip_reason|跳过原因|运行态字段|事件跳过时的原因说明|
|message|事件描述|运行态字段|事件人类可读描述|
|event_payload|事件负载|运行态字段|事件附加数据对象|
|action_type|动作类型|运行态字段|执行引擎动作类型，如 SERVICE_ORDER_CREATE / PRICING_EXECUTE|
|action_label|动作名称|运行态字段|动作的中文业务名称|
|result_type|执行结果类型|运行态字段|执行动作返回的结果类型，如 ORDER_CREATED / MATCHING_FAILED|
|success|是否成功|运行态字段|动作是否执行成功|
|from_state|来源状态|运行态字段|工作流动作触发前的业务对象状态|
|triggered_by|触发来源|运行态字段|动作由需求、供给或业务工作流触发|
|triggered_event_count|触发事件数|运行态字段|当前 Tick 内触发的事件数量|
|no_action_count|无动作事件数|运行态字段|当前 Tick 内未产生动作的事件数量|
|readiness_triggered|是否触发准入|运行态字段|供给侧是否触发运营准入|
|deployment_triggered|是否触发投放|运行态字段|供给侧是否触发运营投放|
|order_count|订单请求数|运行态字段|需求侧当前 Tick 生成的订单请求数|
|actions|动作列表|运行态字段|当前 Tick 产生的动作列表|
|worker_working|作业人员是否工作中|运行态字段|当前模拟时间作业人员是否在工作窗口内|
|robotaxi_operating|Robotaxi 是否运营中|运行态字段|当前模拟时间 Robotaxi 是否在运营窗口内|
|supply_triggered|供给侧是否触发|运行态字段|当前 Tick 是否触发供给侧逻辑|
|demand_triggered|需求侧是否触发|运行态字段|当前 Tick 是否触发需求侧逻辑|
|workflow_actions|工作流动作数|运行态字段|当前 Tick 从工作流得到的动作数|
|succeeded_actions|成功动作数|运行态字段|当前 Tick 执行成功的动作数|
|failed_actions|失败动作数|运行态字段|当前 Tick 执行失败的动作数|
|created_service_orders|已创建服务订单数|运行态字段|当前运行累计创建的服务订单数|
|completed_service_orders|已完成服务订单数|运行态字段|当前运行累计完成的服务订单数|
|completed_trips|已完成履约数|运行态字段|当前运行累计完成的履约行驶数|
|completed_route_executions|已完成行驶记录数|运行态字段|当前运行累计完成的行驶记录数|
|no_action_events|无动作事件数|运行态字段|当前运行累计无动作事件数|
|created_at|创建时间|运行态字段|事件记录创建时间|

### 25.1 SimulationEvent 枚举中文显示

|枚举值|中文名|适用字段|
|---|---|---|
|SIMULATION_SYSTEM|模拟系统|event_source|
|SUPPLY_TRIGGER|供给侧触发器|event_source|
|DEMAND_TRIGGER|需求侧触发器|event_source|
|EXECUTION_ENGINE|执行引擎|event_source|
|BUSINESS_SERVICE|业务服务|event_source|
|SERVICE_ORDER_CREATE|创建服务订单|event_type / action_type|
|PRICING_EXECUTE|执行定价|event_type / action_type|
|ROBOTAXI_CALL|客户确认叫车|event_type / action_type|
|ORDER_MATCHING_EXECUTE|执行订单匹配|event_type / action_type|
|ORDER_AUTO_ASSIGNMENT_TICK|推进自动分配|event_type / action_type|
|SERVICE_ORDER_CANCEL|取消服务订单|event_type / action_type|
|TRIP_STEP_EXECUTE|推进履约行驶|event_type / action_type|
|SETTLEMENT_EXECUTE|执行结算|event_type / action_type|
|PAYMENT_EXECUTE|执行支付|event_type / action_type|
|READINESS_TASK_CREATE|创建运营准入任务|event_type / action_type|
|DEPLOYMENT_TASK_CREATE|创建运营投放任务|event_type / action_type|
|ROUTE_EXECUTION_CREATE|创建运营行驶记录|action_type|
|TRIP_CREATE|创建履约行驶记录|action_type|
|READINESSTASK_CREATE|创建运营准入任务|action_type（兼容旧值）|
|DEPLOYMENTTASK_CREATE|创建运营投放任务|action_type（兼容旧值）|
|ROUTEEXECUTION_CREATE|创建运营行驶记录|action_type（兼容旧值）|
|SERVICEORDER_CREATE|创建服务订单|action_type（兼容旧值）|
|READINESS_TASK_ASSIGN|分配准入任务|event_type / action_type|
|READINESS_TASK_START|开始准入检查|event_type / action_type|
|READINESS_TASK_PASS|准入检查通过|event_type / action_type|
|READINESS_TASK_FAIL|准入检查不通过|event_type / action_type|
|ROUTE_PLAN|规划行驶路径|event_type / action_type|
|ROUTE_EXECUTION_STEP|推进行驶记录|event_type / action_type|
|ROUTE_EXECUTION_TRAVEL_COMPLETE|运营行驶时间到达|event_type / action_type|
|ARRIVAL_CONFIRM|确认到达|event_type / action_type|
|FLEET_OPERATION_ROUTE_PLAN|运维任务路径规划|action_type|
|FLEET_OPERATION_ROUTE_PROGRESS|运维任务行驶进展|action_type|
|FLEET_OPERATION_ROUTE_ARRIVAL_RESULT|运维任务到达结果|action_type|
|FLEET_OPERATION_TASK_CREATE|创建运维任务|action_type|
|FLEET_OPERATION_TASK_ACTIVATE|激活排队运维任务|action_type|
|FLEET_OPERATION_DESTINATION_ASSIGN|分配运维目的站点|action_type|
|FLEET_OPERATION_WORKER_ASSIGN|分配 Worker|action_type|
|FLEET_OPERATION_WORK_START|开始运维作业|action_type|
|FLEET_OPERATION_WORK_COMPLETE|完成运维作业|action_type|
|FLEET_OPERATION_RETIREMENT_APPROVE|确认退役|action_type|
|FLEET_OPERATION_RETIREMENT_REJECT|驳回退役|action_type|
|FLEET_OPERATION_CHARGING_COMPLETE|充电完成|action_type|
|TRIP_TRAVEL_COMPLETE|履约行驶时间到达|event_type / action_type|
|ORDER_AUTO_ASSIGNMENT|订单自动分配|operation_type|
|ORDER_ASSIGNMENT_TIMEOUT|订单分配等待超时|operation_type（兼容旧值）|
|ROBOTAXI_ASSIGNMENT_TIMEOUT|Robotaxi 分配等待超时|reason_type|
|BUSINESS_AND_CHECKPOINT|业务事件与检查点|event_recording_mode|
|VERBOSE_TICK|详细 Tick 事件|event_recording_mode|
|ORDER_CREATED|服务订单已创建|result_type|
|SERVICE_ORDER_CREATE_FAILED|服务订单创建失败|result_type|
|PRICING_COMPLETED|定价完成|result_type|
|PRICING_FAILED|定价失败|result_type|
|CUSTOMER_CONFIRMED|客户已确认|result_type|
|MATCHING_COMPLETED|匹配完成|result_type|
|MATCHING_FAILED|匹配失败|result_type|
|MATCHING_RETRY_SCHEDULED|匹配重试已安排|result_type|
|AUTO_ASSIGNMENT_CONTINUES|自动分配继续|result_type|
|AUTO_ASSIGNMENT_COMPLETED|自动分配完成|result_type|
|AUTO_ASSIGNMENT_TIMEOUT_CANCELLED|自动分配超时取消|result_type|
|AUTO_ASSIGNMENT_REVOKED|自动分配已撤销|result_type|
|AUTO_ASSIGNMENT_FAILED|自动分配失败|result_type|
|READINESS_SKIPPED_OUT_OF_WORK_TIME|非工作时间跳过准入|result_type|
|DEPLOYMENT_SKIPPED_OUT_OF_WORK_TIME|非工作时间跳过投放|result_type|
|SERVICE_ORDER_CANCELLED|服务订单已取消|result_type|
|SERVICE_ORDER_CANCEL_SKIPPED|服务订单取消已跳过|result_type|
|SERVICE_ORDER_CANCEL_FAILED|服务订单取消失败|result_type|
|TRIP_CREATED|履约已创建|result_type|
|TRIP_STEPPED|履约已步进|result_type|
|TRIP_NO_ACTION|履约无需动作|result_type|
|TRIP_ADVANCED|履约已推进|result_type|
|SETTLEMENT_COMPLETED|结算完成|result_type|
|PAYMENT_COMPLETED|支付完成|result_type|
|READINESS_CREATED|准入任务已创建|result_type|
|DEPLOYMENT_CREATED|投放任务已创建|result_type|
|READINESS_ASSIGNED|准入任务已分配|result_type|
|READINESS_ASSIGN_FAILED|准入任务分配失败|result_type|
|READINESS_STARTED|准入检查已开始|result_type|
|READINESS_START_FAILED|准入检查开始失败|result_type|
|READINESS_PASSED|准入检查已通过|result_type|
|READINESS_PASS_FAILED|准入检查通过失败|result_type|
|READINESS_FAILED|准入检查不通过|result_type|
|READINESS_FAIL_FAILED|准入检查不通过提交失败|result_type|
|ROUTE_EXECUTION_CREATED|运营行驶记录已创建|event_type / result_type|
|ROUTE_PLANNED|路径生成成功|result_type|
|ROUTE_PLAN_FAILED|路径规划失败|result_type|
|FLEET_OPERATION_TASK_CREATED|运维任务已创建|result_type|
|FLEET_OPERATION_ALREADY_AT_CAPABLE_CENTER|已在具备职能的运营中心|result_type|
|FLEET_OPERATION_WAITING_DESTINATION|等待分配运维目的站点|result_type|
|FLEET_OPERATION_DESTINATION_ASSIGNED|运维目的站点已分配|result_type|
|FLEET_OPERATION_WORKER_ASSIGNED|Worker 已分配|result_type|
|FLEET_OPERATION_WORK_STARTED|运维作业已开始|result_type|
|FLEET_OPERATION_WORK_COMPLETED|运维作业已完成|result_type|
|FLEET_OPERATION_RETIREMENT_APPROVED|退役已确认|result_type|
|FLEET_OPERATION_RETIREMENT_REJECTED|退役已驳回|result_type|
|FLEET_OPERATION_CHARGING_COMPLETED|充电已完成|result_type|
|ROUTE_STEPPED|行驶记录已步进|result_type|
|ROUTE_STEP_FAILED|行驶记录步进失败|result_type|
|ROUTE_TRAVEL_COMPLETED|运营行驶已按时间到达|result_type|
|ROUTE_TRAVEL_COMPLETE_FAILED|运营行驶时间到达失败|result_type|
|TRIP_TRAVEL_COMPLETED|履约行驶已按时间到达|result_type|
|TRIP_TRAVEL_COMPLETE_FAILED|履约行驶时间到达失败|result_type|
|ARRIVAL_CONFIRMED|到达已确认|result_type|
|ARRIVAL_CONFIRM_FAILED|到达确认失败|result_type|
|FLEET_OPERATION_ROUTE_STARTED|运维行驶已开始|result_type|
|FLEET_OPERATION_ROUTE_NORMAL_ARRIVAL|运维正常到达|result_type|
|FLEET_OPERATION_ROUTE_ABNORMAL_ARRIVAL|运维异常到达|result_type|
|ARRIVAL_ABNORMAL_CONFIRMED|异常到达已确认|result_type|
|ARRIVAL_ABNORMAL_CONFIRM_FAILED|异常到达确认失败|result_type|
|TEMPORARY_SUPPLY_REBALANCE|临时供给再平衡|enum_value|
|LOW_DENSITY_NEARBY_SERVICE_AREA|低密度邻近服务区|enum_value|
|TEMPORARY_RANDOM_SERVICE_AREA|临时随机服务区投放|enum_value|
|RANDOM_SERVICE_AREA_DISPATCH|随机服务区投放|enum_value|
|serviceOrder|服务订单|object_type / source_object_type / related_object_type|
|trip|履约行驶记录|object_type / source_object_type / related_object_type|
|readinessTask|运营准入任务|object_type / source_object_type / related_object_type|
|deploymentTask|运营投放任务|object_type / source_object_type / related_object_type|
|routeExecution|运营行驶记录|object_type / source_object_type / related_object_type|
|demandSimulationRun|需求模拟执行|related_object_type|

---

## 26. 前端显示规则

1. 代码、初始化数据和对象引用继续使用英文字段名；
2. 前端表格列名、详情栏字段名、筛选项名称优先显示中文名；
3. 前端应依据统一字段字典和枚举值字典显示中文业务含义，不应直接暴露英文代码值；
4. Cell 详情中的聚合展示字段应与持久化字段明确区分；
5. `OPS_CENTER` 类型 Place 在地图中使用独立颜色展示，与其他 Place 类型区分；
6. 点击 OpsCenter、Robotaxi、Worker、Task、Route 或 RouteExecution 记录时，右侧详情栏显示对应中文字段名；
7. 点击 OpsCenter 覆盖 Cell 时，Cell 聚合详情应展示关联运营中心和当前停放 Robotaxi；
8. 新增业务对象、单据或字段时，必须先更新本统一字段字典；
9. 原业务目录下不再维护独立字段字典，只保留迁移说明或引用入口。

---

## 27. SimulationWorkflowTimingProfile：模拟工作流时效配置

时效配置是业务单据生命周期自动化推进的运行时耗时合同。人工创建后自动推进、模拟运行自动推进和后续历史校验都应复用同一套配置；模拟运行不得在结束后用独立补算逻辑覆盖业务动作已经沉淀的状态时间线。

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|workflow_timing_profile_id|工作流时效配置编号|持久化字段|配置唯一编号|
|profile_name|配置名称|持久化字段|配置中文名称|
|profile_version|配置版本|运行态字段|每次修改规则后递增的版本|
|profile_status|配置状态|运行态字段|ACTIVE / DISABLED / ARCHIVED|
|timing_rules|工作流时效规则|持久化字段|配置包含的 WorkflowTimingRule 列表|
|description|说明|持久化字段|配置用途说明|
|created_at|创建时间|运行态字段|真实审计创建时间|
|updated_at|更新时间|运行态字段|真实审计更新时间|

### 27.1 WorkflowTimingRule：工作流时效规则

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|workflow_timing_rule_id|工作流时效规则编号|持久化字段|规则唯一编号|
|workflow_transition_definition_id|工作流状态边编号|持久化字段|与统一工作流注册表中的状态边一一对应|
|business_object_type|业务对象类型|持久化字段|readinessTask、deploymentTask、routeExecution、serviceOrder 或 trip|
|from_status|变更前状态|持久化字段|动作执行前状态|
|action_type|动作类型|持久化字段|与工作流功能操作一致的动作|
|to_status|变更后状态|持久化字段|动作完成后进入的状态|
|result_type|执行结果类型|持久化字段|当前规则适用的结果分支|
|duration_mode|耗时模式|持久化字段|FIXED_DURATION 或 PER_CELL_DURATION|
|transition_mode|状态边模式|持久化字段|DIRECT 为直接执行，PROJECTED 为关联对象投影|
|timing_rule_group_id|时效规则组编号|持久化字段|同一来源状态变更及其投影共用的配置组|
|duration_source_type|时长来源类型|持久化字段|CONFIGURED 为独立配置，INHERITED 为继承来源配置|
|source_business_object_type|来源业务对象类型|持久化字段|投影状态边依赖的源业务对象类型|
|source_from_status|来源变更前状态|持久化字段|投影状态边依赖的源状态|
|source_transition_definition_id|来源工作流状态边编号|持久化字段|投影状态边依赖的源状态边编号|
|configured_duration_seconds|配置操作时长（秒）|持久化字段|固定操作耗时|
|seconds_per_cell|单 Cell 行驶时长（秒）|持久化字段|行驶动作的单位 Cell 耗时|
|rule_status|规则状态|运行态字段|ACTIVE / DISABLED|

## 28. BusinessTimingCalculationRun：业务时效计算运行

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|business_timing_calculation_run_id|业务时效计算运行编号|持久化字段|计算运行唯一编号|
|simulation_run_id|模拟运行编号|持久化字段|来源 SimulationRun|
|simulation_timeline_id|模拟时间轴编号|持久化字段|来源连续模拟时间轴|
|workflow_timing_profile_id|工作流时效配置编号|持久化字段|本次使用的配置|
|workflow_timing_profile_version|工作流时效配置版本|持久化字段|本次使用的配置版本|
|timing_profile_snapshot|工作流时效配置快照|持久化字段|计算时冻结的不可变配置|
|calculation_status|计算状态|运行态字段|QUEUED / CALCULATING / SUCCEEDED / PARTIALLY_SUCCEEDED / FAILED|
|calculation_progress_percent|计算进度（%）|运行态字段|0 到 100|
|calculation_duration_ms|计算耗时（毫秒）|运行态字段|一次运营模拟时间计算的真实耗时|
|total_object_count|业务对象总数|运行态字段|本次纳入计算的对象数|
|processed_object_count|已处理业务对象数|运行态字段|已经完成处理的对象数|
|total_transition_count|状态变更总数|运行态字段|生成的状态变更记录总数|
|success_object_count|成功对象数|运行态字段|完整计算成功的对象数|
|failed_object_count|失败对象数|运行态字段|计算失败的对象数|
|calculation_errors|计算错误列表|运行态字段|结构化错误列表|
|algorithm_version|计算算法版本|持久化字段|用于保证结果可复现|
|started_at|开始时间|运行态字段|真实审计开始时间|
|completed_at|完成时间|运行态字段|真实审计完成时间|

### 28.1 业务单据计算字段

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|business_timing_calculation_status|业务时效计算状态|运行态字段|当前有效计算结果状态|
|active_business_timing_calculation_run_id|当前业务时效计算运行编号|运行态字段|关联最新有效计算运行|
|calculated_simulation_created_at|计算模拟创建时间|运行态字段|根据因果链计算的业务创建时间|
|calculated_simulation_updated_at|计算模拟更新时间|运行态字段|最后状态进入时间|
|calculated_simulation_completed_at|计算模拟完成时间|运行态字段|终态进入时间|
|calculated_simulation_matched_at|计算模拟匹配时间|运行态字段|服务订单进入车辆已分配状态的时间|
|calculated_simulation_payment_completed_at|计算模拟支付完成时间|运行态字段|服务订单进入已完成状态的时间|
|simulation_status_transition_history|模拟状态变更记录|运行态字段|按顺序保存完整业务状态时间线|
|business_timing_validation_result|业务时效校验结果|运行态字段|PASS / FAIL|
|business_timing_failure_reason|业务时效失败原因|运行态字段|未完整计算时的原因|

### 28.2 模拟状态变更记录

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|status_transition_id|状态变更编号|运行态字段|状态变更唯一编号|
|transition_sequence|状态变更顺序|运行态字段|对象内从 1 开始的顺序|
|business_object_id|业务对象编号|运行态字段|发生状态变更的业务对象主键|
|from_status|变更前状态|运行态字段|初始记录为空|
|action_type|动作类型|运行态字段|产生状态变化的功能操作|
|result_type|执行结果类型|运行态字段|动作结果分支|
|to_status|变更后状态|运行态字段|本次进入状态|
|occurred_at|真实发生时间|运行态字段|状态变更事实写入时的真实系统时间|
|simulation_occurred_at|模拟发生时间|运行态字段|状态变更对应的模拟世界时间，可为空|
|time_mode|时间模式|运行态字段|REAL_TIME 或 SIMULATION 等时间来源模式|
|trigger_source|触发来源|运行态字段|人工、服务或模拟时间作业等触发来源|
|simulation_action_started_at|模拟动作开始时间|运行态字段|业务动作实际开始的模拟时间|
|simulation_status_changed_at|模拟状态变更时间|运行态字段|业务动作实际进入下一状态的模拟时间|
|calculated_simulation_action_started_at|计算模拟动作开始时间|运行态字段|动作开始的模拟时间|
|configured_duration_seconds|配置操作时长（秒）|运行态字段|本次计算使用的总耗时|
|movement_step_count|移动步数|运行态字段|行驶动作实际使用的 Cell 移动步数|
|seconds_per_cell|单 Cell 行驶时长（秒）|运行态字段|行驶动作单位耗时|
|calculated_simulation_status_changed_at|计算模拟状态变更时间|运行态字段|下一状态进入时间|
|workflow_timing_rule_id|工作流时效规则编号|运行态字段|来源规则|
|source_transition_id|来源状态变更编号|运行态字段|直接因果来源|
|business_timing_calculation_run_id|业务时效计算运行编号|运行态字段|来源计算运行|

### 28.3 新增枚举中文

|枚举值|中文名|
|---|---|
|NOT_CALCULATED|未计算|
|QUEUED|等待计算|
|CALCULATING|计算中|
|SUCCEEDED|计算成功|
|PARTIALLY_SUCCEEDED|部分成功|
|FIXED_DURATION|固定操作时长|
|PER_CELL_DURATION|按 Cell 行驶时长|
|DIRECT|直接执行|
|PROJECTED|关联投影|
|COMPATIBILITY|兼容路径|
|EXCEPTION|异常路径|
|CONFIGURED|独立配置|
|INHERITED|继承来源配置|
|PASSENGER_BOARD|确认客户上车|
|PASSENGER_DROPOFF|确认客户下车|
|OPERATING_SIMULATION_TIME_CALCULATION_STARTED|运营模拟时间计算开始|
|OPERATING_SIMULATION_TIME_CALCULATION_COMPLETED|运营模拟时间计算完成|
|OPERATING_SIMULATION_TIME_CALCULATION_FAILED|运营模拟时间计算失败|
|TIMING_RULE_MISSING|缺少时效规则|
|ROUTE_DATA_MISSING|缺少路径数据|
|DEPENDENCY_MISSING|缺少时间依赖|
|CALCULATION_FAILED|计算失败|
