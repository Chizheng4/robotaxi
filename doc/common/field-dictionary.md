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
|can_inspect_robotaxi|允许运维检查|持久化字段|是否可以检查车辆|
|can_clean_robotaxi|允许清洁|持久化字段|是否可以清洁车辆|
|can_charge_robotaxi|允许充电|持久化字段|是否可以为车辆充电|
|can_repair_robotaxi|允许维修|持久化字段|是否可以维修车辆|
|can_release_robotaxi|允许投放 Robotaxi|持久化字段|是否可以通过运营投放任务将车辆投放进入运营|

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
|battery_percent|当前电量（%）|运行态字段|当前剩余电量百分比|
|estimated_range_km|预计续航（公里）|运行态字段|根据当前电量计算的预计续航|
|availability_status|运营可用状态|运行态字段|车辆是否具备运营资格|
|motion_status|物理运动状态|运行态字段|车辆当前物理运动形态|
|current_cell_id|当前所在网格|运行态字段|车辆当前位置|
|current_route_id|当前路径|运行态字段|当前执行 Route，可为空|
|current_task_id|当前任务|运行态字段|当前关联 Task，可为空|
|current_order_id|当前服务订单|运行态字段|当前关联 ServiceOrder，可为空|
|current_task_type|当前任务类型|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_task_status|当前任务状态|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_route_execution_id|当前行驶记录|聚合展示字段|当前关联 RouteExecution，可为空，展示推导字段|
|location_summary|位置摘要|聚合展示字段|由 current_cell_id 通过 CellContext 推导|

---

## 12. Worker：运营中心作业人员

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|worker_id|作业人员编号|持久化字段|Worker 唯一编号|
|ops_center_id|运营中心编号|持久化字段|所属 OpsCenter|
|worker_name|作业人员名称|持久化字段|Worker 名称|
|worker_role|作业角色|持久化字段|运营中心内部作业角色|
|worker_status|作业人员状态|运行态字段|当前是否可被分配任务|
|time_per_robotaxi|单车处理时间|持久化字段|处理一台 Robotaxi 所需时间单位|
|max_robotaxi_per_day|单日最大处理量|持久化字段|每天最多处理 Robotaxi 数量|
|current_task_id|当前任务|运行态字段|当前执行任务，可为空|
|current_task_type|当前任务类型|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_task_status|当前任务状态|聚合展示字段|由 current_task_id 关联 Task 推导|

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
|trip_id|服务履约记录编号|持久化字段|关联 Trip，可为空|
|robotaxi_id|Robotaxi 编号|持久化字段|执行 Robotaxi|
|origin_cell_id|起点位置|持久化字段|本次 Route 起点 Cell|
|road_segment_sequence|道路片段序列|持久化字段|Route 经过的 RoadSegment 顺序|
|total_distance_km|路径总距离（公里）|持久化字段|Route 总距离，供价格和运营分析使用|
|estimated_duration_min|预估时长（分钟）|持久化字段|Route 预估耗时，供价格和运营分析使用|
|route_steps|路径步骤|持久化字段|Route 中可执行的 Cell Step 序列|
|route_step_count|路径步骤数|聚合展示字段|Route 中步骤数量|
|planned_target_zone_id|计划目标运营区域|持久化字段|运营投放任务创建时的原始计划 Zone，可为空，异常重规划不得覆盖|
|planned_target_service_area_id|计划目标服务区|持久化字段|运营投放任务创建时的原始计划 ServiceArea，异常重规划不得覆盖|
|planned_target_cell_id|计划目标位置|持久化字段|运营投放任务创建时的原始计划 Cell，异常重规划不得覆盖|
|target_service_area_id|当前目标服务区|运行态字段|任务或行驶记录当前 Route 指向的目标 ServiceArea，会随异常重规划更新|
|target_cell_id|当前目标位置|运行态字段|任务或行驶记录当前 Route 指向的目标 Cell，会随异常重规划更新|
|current_target_cell_id|当前目标位置|聚合展示字段|行驶记录当前 Route 指向的目标 Cell|
|actual_target_service_area_id|实际停靠服务区|运行态字段|Robotaxi 实际完成停靠的 ServiceArea，可为空|
|actual_target_cell_id|实际到达位置|运行态字段|Robotaxi 实际完成停靠的 Cell，可为空|
|arrival_behavior|到达驻留要求|持久化字段|Robotaxi 到达后应临停、停车或待命的要求|
|blocked_handling_policy|遇阻处理策略|持久化字段|计划目标不可用时的处理策略|
|arrival_execution_result|到达执行结果|运行态字段|Robotaxi 到达目标区域后的反馈结果|
|same_service_area_retry_allowed|允许同服务区重试|持久化字段|异常到达时是否允许在同 ServiceArea 内选择替代点位|
|current_target_service_area_id|当前目标服务区|运行态字段|行驶记录当前 Route 指向的目标 ServiceArea|
|route_history|路径历史|运行态字段|同一行驶记录中 Route 变化历史|
|route_change_reason|路径变化原因|运行态字段|Route 被创建或替换的原因|
|arrival_result|到达结果|运行态字段|记录正常到达或异常到达等执行反馈|
|exception_type|异常类型|运行态字段|发生异常时的具体原因，可为空|
|origin_location_summary|起点位置摘要|聚合展示字段|由起点 CellContext 推导|
|target_location_summary|终点位置摘要|聚合展示字段|由终点 CellContext 推导|
|current_location_summary|当前位置摘要|聚合展示字段|由当前 CellContext 推导|
|origin_location_detail|起点位置详情|聚合展示字段|起点结构化位置上下文|
|target_location_detail|终点位置详情|聚合展示字段|终点结构化位置上下文|
|current_location_detail|当前位置详情|聚合展示字段|当前位置结构化位置上下文|
|failure_reason|失败原因|运行态字段|失败时的原因说明|
|description|说明|持久化字段|对象、策略或记录的说明文本|

说明：

- 位置类展示字段均由 CellContext 推导，不作为业务对象冗余存储字段；
- Route 是路径规划策略执行后的路径结果，主定义见 `doc/05-dispatch-trip/02-route.md`；
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
|estimated_distance_km|预估距离（公里）|运行态字段|订单预估服务距离|
|estimated_duration_min|预估时长（分钟）|运行态字段|订单预估服务时长|
|estimated_price|预估价格|运行态字段|系统预估价格|
|quoted_price|客户报价|运行态字段|客户确认前展示报价|
|actual_distance_km|实际距离（公里）|运行态字段|服务完成后的实际距离|
|actual_duration_min|实际时长（分钟）|运行态字段|服务完成后的实际时长|
|final_price|最终价格|运行态字段|最终结算价格|
|payment_status|支付状态|运行态字段|订单支付状态|
|paid_amount|已支付金额|运行态字段|客户已支付金额|
|payment_completed_at|支付完成时间|运行态字段|支付完成时间，可为空|
|pricing_explanation|价格说明|运行态字段|面向客户展示的价格说明|
|pricing_breakdown_snapshot|定价明细快照|运行态字段|保存价格构成快照|
|order_status|订单状态|运行态字段|客户服务订单当前状态|
|matched_robotaxi_id|匹配 Robotaxi|运行态字段|已匹配车辆，可为空|
|order_matching_decision_id|订单匹配决策编号|运行态字段|关联 OrderMatchingDecision，可为空|
|trip_id|服务履约记录编号|运行态字段|关联 Trip，可为空|
|confirmed_at|客户确认时间|运行态字段|客户确认叫车时间|
|matched_at|匹配时间|运行态字段|车辆匹配成功时间|
|cancelled_at|取消时间|运行态字段|订单取消时间，可为空|

说明：

- ServiceOrder 表达客户服务承诺，不负责价格算法、车辆匹配算法、路径规划算法或实际行驶过程；
- 订单来源 `order_channel` 与 Customer 的 `default_order_channel` 不是同一字段，前者是本次订单来源，后者是客户默认偏好。

---

## 16. Trip：服务履约记录

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|trip_id|服务履约记录编号|运行态字段|Trip 唯一编号|
|service_order_id|服务订单编号|运行态字段|Trip 关联的 ServiceOrder|
|robotaxi_id|Robotaxi 编号|运行态字段|执行服务履约的 Robotaxi|
|pickup_service_area_id|上车服务区|运行态字段|服务履约上车 ServiceArea|
|pickup_cell_id|上车位置|运行态字段|服务履约上车 Cell|
|dropoff_service_area_id|下车服务区|运行态字段|服务履约下车 ServiceArea|
|dropoff_cell_id|下车位置|运行态字段|服务履约下车 Cell|
|current_cell_id|当前所在网格|运行态字段|Robotaxi 当前履约位置 Cell|
|pickup_location_summary|上车位置摘要|聚合展示字段|上车位置的结构化摘要|
|dropoff_location_summary|下车位置摘要|聚合展示字段|下车位置的结构化摘要|
|current_location_summary|当前位置摘要|聚合展示字段|当前位置的结构化摘要|
|pickup_location_detail|上车位置详情|聚合展示字段|上车位置的结构化上下文|
|dropoff_location_detail|下车位置详情|聚合展示字段|下车位置的结构化上下文|
|current_location_detail|当前位置详情|聚合展示字段|当前位置的结构化上下文|
|current_step_index|当前步序号|运行态字段|当前执行到 Route 的 Step 下标|
|total_step_count|总步数|运行态字段|当前 Route 总 Step 数|
|distance_traveled_km|已行驶距离（公里）|运行态字段|服务履约已行驶距离|
|distance_remaining_km|剩余距离（公里）|运行态字段|当前 Route 剩余距离|
|time_elapsed|已耗时|运行态字段|服务履约已耗时|
|trip_status|服务履约状态|运行态字段|Trip 当前状态|
|trip_phase|服务履约阶段|运行态字段|路径规划或异常处理时使用的 Trip 阶段表达|
|arrival_execution_result|到达执行结果|运行态字段|目的地到达后的执行结果，可为空|
|exception_type|异常类型|运行态字段|服务履约异常或重规划触发原因，可为空|
|route_id|路径编号|运行态字段|Trip 当前引用 Route，可为空|
|route_planning_run_id|路径规划执行记录编号|运行态字段|Trip 当前引用路径规划执行记录，可为空|
|route_history|路径历史|运行态字段|Trip 履约过程中的路径历史，可为空数组|
|started_at|开始时间|运行态字段|服务履约开始时间|
|completed_at|完成时间|运行态字段|服务履约完成时间|
|event_log|事件记录|运行态字段|服务履约事件数组|

说明：

- Trip 是服务订单履约记录；
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

---

## 18. PricingStrategy / PricingDecision：定价策略与定价决策

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|pricing_strategy_id|定价策略编号|持久化字段|PricingStrategy 唯一编号|
|pricing_strategy_run_id|定价策略执行记录编号|运行态字段|一次定价策略执行记录|
|pricing_decision_id|定价决策编号|运行态字段|PricingDecision 唯一编号|
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
|input_snapshot|输入快照|运行态字段|本次定价策略执行输入|
|output_snapshot|输出快照|运行态字段|本次定价策略执行输出|
|run_result|执行结果|运行态字段|PricingStrategyRun 执行结果|
|pricing_result|定价结果|运行态字段|PricingDecision 定价结果|
|base_price|基础价格|运行态字段|起步价、距离费和时间费合计|
|distance_fee|距离费用|运行态字段|根据距离计算的费用|
|time_fee|时间费用|运行态字段|根据时间计算的费用|
|dynamic_multiplier|综合动态系数|运行态字段|综合后的动态价格系数|

说明：

- 定价可以调用路径估算能力获取距离和时长；
- 价格预估阶段不默认生成可执行 Route，也不改变 ServiceOrder、Trip 或 Robotaxi 状态。

---

## 19. OrderMatchingStrategy / OrderMatchingDecision：订单匹配策略与订单匹配决策

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|order_matching_strategy_id|订单匹配策略编号|持久化字段|OrderMatchingStrategy 唯一编号|
|order_matching_run_id|匹配执行记录编号|运行态字段|一次订单匹配策略执行记录|
|order_matching_decision_id|匹配决策编号|运行态字段|OrderMatchingDecision 唯一编号|
|matching_algorithm|匹配算法|持久化字段|订单匹配策略使用的算法|
|candidate_filter_rule|候选筛选规则|持久化字段|候选 Robotaxi 筛选规则|
|distance_rule|距离计算规则|持久化字段|接驾距离计算规则|
|battery_rule|电量校验规则|持久化字段|候选车辆最低电量要求|
|scoring_rule|评分规则|持久化字段|候选车辆排序和评分规则|
|min_battery_threshold|最低电量阈值|持久化字段|可参与匹配的最低电量百分比|
|candidate_robotaxi_count|候选车辆数量|运行态字段|进入匹配策略的候选车辆数量|
|eligible_robotaxi_count|可匹配车辆数量|运行态字段|通过筛选的车辆数量|
|selected_robotaxi_id|选中 Robotaxi|运行态字段|匹配决策选中的 Robotaxi，可为空|
|candidate_snapshot|候选车辆快照|运行态字段|本次匹配候选车辆及评分快照|
|estimated_pickup_distance_km|预估接驾距离（公里）|运行态字段|选中 Robotaxi 到上车点的预估距离|
|estimated_pickup_duration_min|预估接驾时长（分钟）|运行态字段|选中 Robotaxi 到上车点的预估时间|
|matching_score|匹配评分|运行态字段|本次匹配决策评分|
|decision_result|决策结果|运行态字段|OrderMatchingDecision 决策结果|
|decision_reason|决策说明|运行态字段|本次匹配成功或失败说明|

说明：

- OrderMatchingStrategy 只负责返回匹配结果；
- 调用方根据 OrderMatchingDecision 更新 ServiceOrder 和 Robotaxi；
- 匹配成功后由服务履约流程创建 Trip，并由 Trip 后续反馈 ServiceOrder 与 Robotaxi 状态。

---

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|order_matching_strategy_id|订单匹配策略编号|持久化字段|OrderMatchingStrategy 唯一编号|
|order_matching_run_id|订单匹配执行记录编号|运行态字段|一次订单匹配策略执行记录|
|order_matching_decision_id|订单匹配决策编号|运行态字段|OrderMatchingDecision 唯一编号|
|matching_algorithm|匹配算法|持久化字段|订单匹配策略使用的算法|
|candidate_filter_rule|候选车辆筛选规则|持久化字段|如何筛选候选 Robotaxi|
|distance_rule|距离计算规则|持久化字段|候选车辆距离计算方式|
|battery_rule|电量校验规则|持久化字段|候选车辆电量要求|
|scoring_rule|评分规则|持久化字段|候选车辆评分规则|
|candidate_robotaxi_count|候选车辆数量|运行态字段|初始候选车辆数量|
|eligible_robotaxi_count|可用车辆数量|运行态字段|通过筛选的车辆数量|
|selected_robotaxi_id|选中 Robotaxi|运行态字段|匹配成功选中的 Robotaxi|
|matching_score|匹配评分|运行态字段|最终匹配评分|
|decision_result|决策结果|运行态字段|匹配决策成功或失败|
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
|WAITING_START|等待行驶|
|ARRIVED|已到达|
|ARRIVAL_ABNORMAL|异常到达|
|COMPLETED|已完成|
|CANCELLED|已取消|
|FAILED|失败|
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
|CALCULATING_PRICE|正在计算价格|
|WAITING_CUSTOMER_CONFIRM|等待客户确认|
|CUSTOMER_CANCELLED_BEFORE_CONFIRM|客户确认前取消|
|WAITING_FOR_VEHICLE|等待匹配车辆|
|VEHICLE_ASSIGNED|车辆已分配|
|VEHICLE_ON_THE_WAY_TO_PICKUP|车辆前往上车点|
|VEHICLE_ARRIVED_PICKUP|车辆已到达上车点|
|WAITING_PASSENGER_BOARDING|等待乘客上车|
|ON_THE_WAY_TO_DESTINATION|正在前往目的地|
|PAYMENT_PROCESSING|支付处理中|
|MATCH_FAILED|匹配失败|
|TRIP_FAILED|行程执行失败|
|PENDING|等待处理|
|ASSIGNED|已分配|
|ON_THE_WAY_PICKUP|接驾中|
|ARRIVED_PICKUP|已到达上车点|
|PASSENGER_ONBOARD|乘客已上车|
|ON_THE_WAY_DESTINATION|载客行驶中|
|ARRIVED_DESTINATION|已到达目的地|
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

---

## 23. 前端显示规则

1. 代码、初始化数据和对象引用继续使用英文字段名；
2. 前端表格列名、详情栏字段名、筛选项名称优先显示中文名；
3. 前端应依据统一字段字典和枚举值字典显示中文业务含义，不应直接暴露英文代码值；
4. Cell 详情中的聚合展示字段应与持久化字段明确区分；
5. `OPS_CENTER` 类型 Place 在地图中使用独立颜色展示，与其他 Place 类型区分；
6. 点击 OpsCenter、Robotaxi、Worker、Task、Route 或 RouteExecution 记录时，右侧详情栏显示对应中文字段名；
7. 点击 OpsCenter 覆盖 Cell 时，Cell 聚合详情应展示关联运营中心和当前停放 Robotaxi；
8. 新增业务对象、单据或字段时，必须先更新本统一字段字典；
9. 原业务目录下不再维护独立字段字典，只保留迁移说明或引用入口。
