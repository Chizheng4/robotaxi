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
|COMPLETED|已完成|
|CANCELLED|已取消|
|FAILED|异常失败|

---

## 7. 前端显示规则

1. `OPS_CENTER` 类型 Place 在地图中使用浅紫色展示，与其他 Place 类型区分；
2. 点击 OpsCenter、Robotaxi 或 Worker 记录时，右侧详情栏显示对应中文字段名；
3. 点击 OpsCenter 覆盖 Cell 时，Cell 聚合详情应展示关联运营中心和当前停放 Robotaxi；
4. 不在本字段字典中增加 Task、Demand、Order、Dispatch、Trip、Metric 字段。
5. 前端应显示中文业务含义，不直接向运营人员暴露英文状态代码。
