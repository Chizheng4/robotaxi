# Process Metrics：过程指标层

## 1. 定义

过程指标描述订单、车辆、路径和履约在业务生命周期中的推进效率，回答“为什么结果会这样”。

过程指标必须依赖业务动作服务沉淀的生命周期事实，不允许从模拟运行中重新伪造状态。

## 2. 当前数据基础

当前系统已经具备：

- 服务订单状态和模拟时间；
- 订单匹配执行与匹配结果；
- 路径规划执行与路径结果；
- 履约行驶记录与运营行驶记录；
- 状态时间线 `simulation_status_transition_history`；
- 时间作业 `TimedOperation`。

## 3. 过程指标目录

|指标编号|中文名|英文名|计算口径|来源字段|就绪度|
|---|---|---|---|---|---|
|PROCESS-MATCH-001|匹配成功率|Match Success Rate|成功匹配决策数 / 匹配执行数|decision_result|READY|
|PROCESS-MATCH-002|匹配失败率|Match Failure Rate|失败匹配决策数 / 匹配执行数|decision_result、failure_reason|READY|
|PROCESS-MATCH-003|平均匹配等待时长|Average Matching Wait Time|avg(simulation_matched_at - simulation_created_at)|ServiceOrder 模拟时间|DERIVABLE|
|PROCESS-MATCH-004|匹配候选充足率|Matching Candidate Sufficiency Rate|eligible_robotaxi_count > 0 的匹配执行数 / 匹配执行数|eligible_robotaxi_count|READY|
|PROCESS-ROUTE-001|路径规划成功率|Route Planning Success Rate|成功路径规划数 / 路径规划执行数|planning_result|READY|
|PROCESS-ROUTE-002|平均路径步数|Average Route Step Count|avg(route_step_count)|Route.route_step_count|READY|
|PROCESS-ROUTE-003|平均路径距离|Average Route Distance|avg(total_distance_km)|Route.total_distance_km|READY|
|PROCESS-TRIP-001|履约创建率|Trip Creation Rate|创建 Trip 的订单数 / 已匹配订单数|trip_id、matched_robotaxi_id|DERIVABLE|
|PROCESS-TRIP-002|履约完成率|Trip Completion Rate|完成 Trip 数 / 创建 Trip 数|trip_status|READY|
|PROCESS-TRIP-003|平均履约时长|Average Trip Duration|完成 Trip avg(time_elapsed 或 trip_total_duration_min)|time_elapsed、trip_total_duration_min|READY|
|PROCESS-TRIP-004|平均履约距离|Average Trip Distance|完成 Trip avg(total_distance_km)|total_distance_km|READY|
|PROCESS-TASK-001|准入任务完成率|Readiness Completion Rate|完成准入任务数 / 创建准入任务数|task_status|READY|
|PROCESS-TASK-002|投放任务完成率|Deployment Completion Rate|完成投放任务数 / 创建投放任务数|task_status|READY|

## 4. 计算原则

1. 过程时长优先使用状态时间线中对应动作的 `simulation_action_started_at` 和 `simulation_status_changed_at`。
2. 如状态时间线缺失，指标质量标记为 `WARN` 或 `FAIL`，不得静默使用真实审计时间。
3. 路径指标必须区分运营行驶记录和履约行驶记录。
4. 失败率类指标必须保留失败原因维度，便于定位资源不足、路径失败或状态未闭环。

## 5. 第一版前端体验

过程诊断页面建议采用：

1. 顶部流程漏斗：订单创建 → 定价 → 呼叫车辆 → 匹配 → 履约 → 支付完成。
2. 中部过程指标表：成功率、失败率、平均耗时、样本量。
3. 右侧详情：选中指标后显示来源对象、状态集合、失败原因分布。
4. 底部异常下钻：列出失败订单、失败匹配、失败路径规划和未完成履约。

