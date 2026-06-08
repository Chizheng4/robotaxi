# 运营中心字段字典

## 1. 目的

本文档集中维护 OpsCenter、Robotaxi 与 Worker 的字段英文名和中文显示名。代码与初始化数据使用英文字段名，前端表格和详情栏优先显示中文名。

---

## 2. OpsCenter：运营中心

|属性英文名|中文名|含义|
|---|---|---|
|ops_center_id|运营中心编号|运营中心唯一编号|
|ops_center_name|运营中心名称|运营中心名称|
|place_id|地点编号|关联的 OPS_CENTER 类型 Place|
|map_id|地图编号|所属 Map|
|cell_ids|覆盖网格列表|运营中心覆盖 Cell|
|service_area_ids|服务区域列表|附近车辆出入和待命 ServiceArea|
|capacity|车辆容量|运营中心内部最大车辆容量|
|ops_center_status|运营中心状态|当前设施状态|
|can_receive_robotaxi|允许接收 Robotaxi|是否可以接收车辆|
|can_park_robotaxi|允许停放 Robotaxi|是否可以内部停放车辆|
|can_inspect_robotaxi|允许运维检查|是否可以检查车辆|
|can_clean_robotaxi|允许清洁|是否可以清洁车辆|
|can_charge_robotaxi|允许充电|是否可以为车辆充电|
|can_repair_robotaxi|允许维修|是否可以维修车辆|
|can_release_robotaxi|允许投放 Robotaxi|是否可以通过运营投放任务将车辆投放进入运营|

---

## 3. Robotaxi：自动驾驶服务车辆

|属性英文名|中文名|含义|
|---|---|---|
|robotaxi_id|Robotaxi 编号|车辆唯一编号|
|fleet_id|车队编号|所属车队|
|model_name|车型名称|车型名称|
|automation_level|自动驾驶等级|L4 或 L5|
|seat_capacity|座位数|可载客座位数|
|battery_capacity_kwh|电池容量（千瓦时）|电池容量|
|max_range_km|满电续航（公里）|满电最大续航|
|service_type|服务类型|支持的服务类型|
|battery_percent|当前电量（%）|当前剩余电量百分比|
|estimated_range_km|预计续航（公里）|根据当前电量计算的预计续航|
|availability_status|运营可用状态|车辆是否具备运营资格|
|motion_status|物理运动状态|车辆当前物理运动形态|
|current_cell_id|当前所在网格|车辆当前位置|
|current_route_id|当前路径|当前执行 Route，可为空|
|current_task_id|当前任务|当前关联 Task，可为空|
|current_task_type|当前任务类型|由 current_task_id 关联 Task 推导的展示字段|
|current_task_status|当前任务状态|由 current_task_id 关联 Task 推导的展示字段|
|current_route_execution_id|当前行驶记录|当前关联 RouteExecution，可为空，展示推导字段|
|location_summary|位置摘要|由 current_cell_id 通过 CellContext 推导的展示字段|

---

## 4. Worker：运营中心作业人员

|属性英文名|中文名|含义|
|---|---|---|
|worker_id|作业人员编号|Worker 唯一编号|
|ops_center_id|运营中心编号|所属 OpsCenter|
|worker_name|作业人员名称|Worker 名称|
|worker_role|作业角色|运营中心内部作业角色|
|worker_status|作业人员状态|当前是否可被分配任务|
|time_per_robotaxi|单车处理时间|处理一台 Robotaxi 所需时间单位|
|max_robotaxi_per_day|单日最大处理量|每天最多处理 Robotaxi 数量|
|current_task_id|当前任务|当前执行任务，可为空|
|current_task_type|当前任务类型|由 current_task_id 关联 Task 推导的展示字段|
|current_task_status|当前任务状态|由 current_task_id 关联 Task 推导的展示字段|

---

## 5. Task / 执行记录展示字段

|属性英文名|中文名|含义|
|---|---|---|
|route_summary|路径摘要|Route 的简要展示信息|
|route_detail|路径详情|Route 的结构化详情|
|route_strategy_id|路径规划策略编号|路径规划策略对象 ID，用于 Route、任务单、行驶记录和策略事件引用|
|strategy_name|路径规划策略名称|路径规划策略中文名称|
|strategy_type|路径规划策略类型|路径规划策略类型|
|trigger_task_status|触发任务状态|策略触发时的 Task 状态|
|origin_rule|起点选择规则|策略如何确定 Route 起点|
|target_rule|终点选择规则|策略如何确定 Route 终点|
|service_area_scope_rule|服务区范围规则|策略是否限制在指定 ServiceArea 内选择目标|
|route_generation_rule|路径生成规则|策略如何基于 RoadSegment / RoadNode 生成 Route|
|route_update_rule|路径更新规则|策略如何创建或更新 Route|
|strategy_status|策略状态|路径规划策略状态|
|route_planning_run_id|路径规划执行记录编号|每次路径规划策略执行的唯一编号|
|result_route_id|生成路径编号|本次路径规划成功生成的 Route 编号|
|planning_result|规划结果|本次路径规划成功或失败|
|route_planning_run_count|路径规划执行次数|策略被执行的次数|
|route_steps|路径步骤|Route 中可执行的 Cell Step 序列|
|route_step_count|路径步骤数|Route 中步骤数量|
|planned_target_zone_id|计划目标运营区域|运营投放任务计划投放 Zone，可为空|
|planned_target_service_area_id|计划目标服务区|运营投放任务计划投放 ServiceArea|
|planned_target_cell_id|计划目标位置|运营投放任务当前计划目标 Cell|
|current_target_cell_id|当前目标位置|行驶记录当前 Route 指向的目标 Cell，展示字段|
|actual_target_service_area_id|实际停靠服务区|Robotaxi 实际完成停靠的 ServiceArea，可为空|
|actual_target_cell_id|实际到达位置|Robotaxi 实际完成停靠的 Cell，可为空|
|arrival_behavior|到达驻留要求|Robotaxi 到达后应临停、停车或待命的要求|
|blocked_handling_policy|遇阻处理策略|计划目标不可用时的处理策略|
|arrival_execution_result|到达执行结果|Robotaxi 到达目标区域后的反馈结果|
|same_service_area_retry_allowed|允许同服务区重试|异常到达时是否允许在同 ServiceArea 内选择替代点位|
|current_target_service_area_id|当前目标服务区|行驶记录当前 Route 指向的目标 ServiceArea|
|route_history|路径历史|同一行驶记录中 Route 变化历史|
|route_change_reason|路径变化原因|Route 被创建或替换的原因|
|origin_location_summary|起点位置摘要|由起点 CellContext 推导|
|target_location_summary|终点位置摘要|由终点 CellContext 推导|
|current_location_summary|当前位置摘要|由当前 CellContext 推导|
|origin_location_detail|起点位置详情|起点结构化位置上下文|
|target_location_detail|终点位置详情|终点结构化位置上下文|
|current_location_detail|当前位置详情|当前位置结构化位置上下文|

说明：

- 以上字段主要用于前端展示；
- 位置类字段均由 CellContext 推导，不作为业务对象冗余存储字段。

---

## 6. 前端枚举值字典

|英文字段值|中文显示值|
|---|---|
|Planned|规划中|
|Active|可使用|
|Restricted|受限使用|
|Closed|已关闭|
|L4|L4（限定区域内无人驾驶）|
|L5|L5（完全自动驾驶）|
|PASSENGER_RIDE|载客出行服务|
|PENDING_INSPECTION|待运维检查|
|IN_INSPECTION|运维检查中|
|AVAILABLE|可参与运营|
|UNAVAILABLE|不可参与运营|
|PARKED|停车中|
|STOPPED|临停中|
|MOVING|行驶中|
|INSPECTION_OPERATOR|检查人员|
|CLEANING_OPERATOR|清洁人员|
|CHARGING_OPERATOR|充电协助人员|
|MAINTENANCE_OPERATOR|维修人员|
|IDLE|空闲|
|BUSY|忙碌|
|OFF_DUTY|非工作中|
|DEPLOYMENT|运营投放|
|WAITING_ROUTE|等待路径|
|WAITING_START|等待行驶|运营投放和路径执行场景统一显示为等待行驶|
|ARRIVED|已到达|行驶记录已到达当前 Route 目标点，等待到达结果处理|
|ARRIVAL_ABNORMAL|异常到达|运营投放任务异常到达，等待同服务区替代路径规划|
|COMPLETED|已完成|
|CANCELLED|已取消|
|FAILED|异常失败|
|SUPPLY_ASSIGNMENT_DECISION|供给分配决策|
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
|INITIAL_PLANNING|初始路径规划|
|ABNORMAL_ARRIVAL_REPLAN|异常到达后重新规划|
|ROUTE_BLOCKED_REPLAN|路径阻塞后重新规划|
|INITIAL_DEPLOYMENT_ROUTE|初始运营投放路径|
|ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN|异常到达同服务区替代路径|

---

## 7. 前端显示规则

1. `OPS_CENTER` 类型 Place 在地图中使用浅紫色展示，与其他 Place 类型区分；
2. 点击 OpsCenter、Robotaxi 或 Worker 记录时，右侧详情栏显示对应中文字段名；
3. 点击 OpsCenter 覆盖 Cell 时，Cell 聚合详情应展示关联运营中心和当前停放 Robotaxi；
4. 不在本字段字典中增加 Task、Demand、Order、Dispatch、Trip、Metric 字段。
5. 前端应显示中文业务含义，不直接向运营人员暴露英文状态代码。
