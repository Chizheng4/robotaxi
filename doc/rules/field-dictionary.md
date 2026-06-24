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
|current_order_status|当前服务订单状态|聚合展示字段|由 current_order_id 关联 ServiceOrder 推导|
|current_task_type|当前任务类型|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_task_status|当前任务状态|聚合展示字段|由 current_task_id 关联 Task 推导|
|current_route_execution_id|当前行驶记录|聚合展示字段|当前关联 RouteExecution，可为空，展示推导字段|
|location_summary|位置摘要|聚合展示字段|由 current_cell_id 通过 CellContext 推导|

说明：

- `current_order_id` 表达服务订单占用，优先级高于运营任务；
- `current_task_id` 表达运营供给侧任务占用；
- Robotaxi 不能同时存在 `current_order_id` 和 `current_task_id`；
- 前端当前任务展示应优先展示服务订单，其次展示运营任务。

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
|trip_id|履约行驶记录编号|持久化字段|关联 Trip，可为空|
|robotaxi_id|Robotaxi 编号|持久化字段|执行 Robotaxi|
|origin_cell_id|起点位置|持久化字段|本次 Route 起点 Cell|
|route_usage_type|路径用途类型|持久化字段|区分价格预估路径、运营行驶路径、服务接驾路径、服务送达路径、服务重规划路径等 Route 用途|
|road_segment_sequence|道路片段序列|持久化字段|Route 经过的 RoadSegment 顺序|
|total_distance_km|路径总距离（公里）|持久化字段|Route 总距离，供价格和运营分析使用|
|estimated_duration_min|预估时长（分钟）|持久化字段|Route 预估耗时，供价格和运营分析使用|
|route_steps|路径步骤|持久化字段|Route 中可执行的 Cell Step 序列|
|route_step_count|移动步数|聚合展示字段|Route 中实际移动步数，等于 route_steps.length - 1，起点 Step 不计为移动|
|route_segments|路径分段|持久化字段|用于价格预估等复合路径，表达客户位置到上车位置、上车位置到下车位置等分段|
|movement_step_index|移动步序|聚合展示字段|前端展示移动步骤时使用的序号，隐藏 route_steps[0] 起点行|
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
|estimated_price|预估价格|运行态字段|系统预估价格|
|quoted_price|客户报价|运行态字段|客户确认前展示报价|
|actual_distance_km|实际距离（公里）|运行态字段|服务完成后的实际距离|
|actual_duration_min|实际时长（分钟）|运行态字段|服务完成后的实际时长|
|final_price|最终价格|运行态字段|最终结算价格|
|trip_total_distance_km|履约总距离（公里）|聚合展示字段|关联履约行驶记录的总距离|
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
|trip_id|履约行驶记录编号|运行态字段|关联 Trip，可为空|
|confirmed_at|客户确认时间|运行态字段|客户确认叫车时间|
|matched_at|匹配时间|运行态字段|车辆匹配成功时间|
|cancelled_at|取消时间|运行态字段|订单取消时间，可为空|

说明：

- ServiceOrder 表达客户服务承诺，不负责价格算法、车辆匹配算法、路径规划算法或实际行驶过程；
- 订单来源 `order_channel` 与 Customer 的 `default_order_channel` 不是同一字段，前者是本次订单来源，后者是客户默认偏好。

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
|distance_traveled_km|已行驶距离（公里）|运行态字段|履约行驶已行驶距离|
|distance_remaining_km|剩余距离（公里）|运行态字段|当前 Route 剩余距离|
|time_elapsed|已耗时|运行态字段|履约行驶已耗时|
|trip_status|履约行驶状态|运行态字段|Trip 当前状态|
|trip_phase|履约行驶阶段|运行态字段|路径规划或异常处理时使用的 Trip 阶段表达|
|arrival_execution_result|到达执行结果|运行态字段|目的地到达后的执行结果，可为空|
|exception_type|异常类型|运行态字段|履约行驶异常或重规划触发原因，可为空|
|route_id|路径编号|运行态字段|Trip 当前引用 Route，可为空|
|route_planning_run_id|路径规划执行记录编号|运行态字段|Trip 当前引用路径规划执行记录，可为空|
|route_history|路径历史|运行态字段|Trip 履约过程中的路径历史，可为空数组|
|route_history_detail|路径历史详情|聚合展示字段|Trip 当前路径与历史路径的结构化展示|
|started_at|开始时间|运行态字段|履约行驶开始时间|
|completed_at|完成时间|运行态字段|履约行驶完成时间|
|event_log|事件记录|运行态字段|履约行驶事件数组|

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
|WAITING_ROUTE|待路径规划|
|WAITING_START|待行驶|
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
|tick_minutes|Tick 时长（分钟）|持久化字段|每次 Tick 模拟的分钟数|
|tick_seconds|Tick 时长（秒）|持久化字段|统一时间计算使用的 Tick 秒数，兼容 tick_minutes 换算|
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
|max_orders_per_tick_global|每 Tick 最大订单数|持久化字段|全局每 Tick 最大生成订单数|
|demand_profiles|需求分布配置|持久化字段|各时段需求分布配置列表|
|supply_trigger_config|供给侧触发配置|持久化字段|供给侧自动触发开关配置|
|supply_trigger_enabled|供给侧触发开关|持久化字段|是否启用供给侧自动触发|
|readiness_trigger_enabled|准入检查触发开关|持久化字段|是否启用准入检查自动触发|
|deployment_trigger_enabled|投放触发开关|持久化字段|是否启用投放自动触发|
|route_execution_trigger_enabled|行驶执行触发开关|持久化字段|是否启用行驶执行自动触发|
|service_order_auto_config|服务订单自动化配置|持久化字段|服务订单各环节自动化开关|
|auto_pricing_enabled|自动定价开关|持久化字段|是否自动执行定价|
|auto_customer_confirm_enabled|自动客户确认开关|持久化字段|是否自动确认客户订单|
|auto_order_matching_enabled|自动订单匹配开关|持久化字段|是否自动执行订单匹配|
|auto_trip_creation_enabled|自动履约创建开关|持久化字段|是否自动创建履约行驶记录|
|auto_trip_progress_enabled|自动履约推进开关|持久化字段|是否自动推进履约行驶|
|auto_payment_enabled|自动支付开关|持久化字段|是否自动完成支付|
|execution_time_config|执行耗时配置|持久化字段|各环节的执行耗时配置|
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
|simulation_status|模拟运行状态|运行态字段|当前模拟状态：READY / RUNNING / PAUSED / DRAINING / COMPLETED / STOPPED / FAILED|
|simulation_policy_id|模拟策略编号|持久化字段|关联的 SimulationPolicy 编号|
|simulation_policy_snapshot|模拟策略快照|运行态字段|运行创建时的策略快照|
|simulation_timeline_id|模拟时间轴编号|持久化字段|串联多次连续 SimulationRun 的时间轴编号|
|previous_simulation_run_id|上一模拟运行编号|持久化字段|同一时间轴内上一运行编号|
|total_days|模拟总天数|持久化字段|模拟总天数|
|tick_minutes|Tick 时长（分钟）|持久化字段|每次 Tick 的模拟分钟数|
|tick_seconds|Tick 时长（秒）|持久化字段|每次 Tick 的统一模拟秒数，是时间推进计算值|
|total_ticks|总 Tick 数|持久化字段|模拟运行总 Tick 数|
|simulation_start_seconds|模拟开始绝对秒|持久化字段|运行在时间轴上的开始绝对秒|
|planned_simulation_end_seconds|计划结束绝对秒|持久化字段|计划触发周期的结束绝对秒|
|simulation_end_seconds|实际结束绝对秒|运行态字段|包含排空阶段的实际结束绝对秒|
|simulation_start_at|模拟开始时间|持久化字段|统一 Day N HH:MM:SS 格式的开始时间|
|planned_simulation_end_at|计划模拟结束时间|持久化字段|统一 Day N HH:MM:SS 格式的计划结束时间|
|simulation_end_at|实际模拟结束时间|运行态字段|统一 Day N HH:MM:SS 格式的实际结束时间|
|current_simulation_seconds|当前模拟绝对秒|运行态字段|当前时间轴绝对模拟秒，是运行时钟唯一计算源|
|current_day|当前模拟天数|运行态字段|当前模拟进行到第几天|
|current_time|当前模拟时间|运行态字段|当前模拟时间（Day N HH:MM:SS）|
|current_clock_time|当前日内时间|运行态字段|供时间窗口计算使用的 HH:MM:SS|
|current_day_tick|当天 Tick 序号|运行态字段|当天的 Tick 序号|
|current_run_tick|当前运行 Tick 序号|运行态字段|本次运行实际 Tick，包含排空 Tick|
|current_global_tick|全局 Tick 序号|运行态字段|同一时间轴连续累计的 Tick 序号|
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
|failure_reason|失败原因|运行态字段|模拟失败原因|
|result_summary|结果摘要|运行态字段|模拟完成后的结果摘要|
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
|TRIP_STEP_EXECUTE|推进履约行驶|event_type / action_type|
|SETTLEMENT_EXECUTE|执行结算|event_type / action_type|
|PAYMENT_EXECUTE|执行支付|event_type / action_type|
|READINESS_TASK_CREATE|创建准入任务|event_type / action_type|
|DEPLOYMENT_TASK_CREATE|创建投放任务|event_type / action_type|
|READINESS_TASK_ASSIGN|分配准入任务|event_type / action_type|
|READINESS_TASK_START|开始准入检查|event_type / action_type|
|READINESS_TASK_PASS|准入检查通过|event_type / action_type|
|ROUTE_PLAN|规划行驶路径|event_type / action_type|
|ROUTE_EXECUTION_STEP|推进行驶记录|event_type / action_type|
|ARRIVAL_CONFIRM|确认到达|event_type / action_type|
|ORDER_CREATED|服务订单已创建|result_type|
|SERVICE_ORDER_CREATE_FAILED|服务订单创建失败|result_type|
|PRICING_COMPLETED|定价完成|result_type|
|PRICING_FAILED|定价失败|result_type|
|CUSTOMER_CONFIRMED|客户已确认|result_type|
|MATCHING_COMPLETED|匹配完成|result_type|
|MATCHING_FAILED|匹配失败|result_type|
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
|ROUTE_PLANNED|路径生成成功|result_type|
|ROUTE_PLAN_FAILED|路径规划失败|result_type|
|ROUTE_STEPPED|行驶记录已步进|result_type|
|ROUTE_STEP_FAILED|行驶记录步进失败|result_type|
|ARRIVAL_CONFIRMED|到达已确认|result_type|
|ARRIVAL_CONFIRM_FAILED|到达确认失败|result_type|
|serviceOrder|服务订单|related_object_type|
|trip|履约行驶记录|related_object_type|
|readinessTask|运营准入任务|related_object_type|
|deploymentTask|运营投放任务|related_object_type|
|routeExecution|行驶记录|related_object_type|
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

时效配置只用于 SimulationRun 完成后的业务时间线计算，不控制 Tick、WorkflowEngine 或 ExecutionEngine 的真实执行等待。

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
|business_object_type|业务对象类型|持久化字段|readinessTask、routeExecution、serviceOrder 或 trip|
|from_status|变更前状态|持久化字段|动作执行前状态|
|action_type|动作类型|持久化字段|与工作流功能操作一致的动作|
|to_status|变更后状态|持久化字段|动作完成后进入的状态|
|result_type|执行结果类型|持久化字段|当前规则适用的结果分支|
|duration_mode|耗时模式|持久化字段|FIXED_DURATION 或 PER_CELL_DURATION|
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
|from_status|变更前状态|运行态字段|初始记录为空|
|action_type|动作类型|运行态字段|产生状态变化的功能操作|
|result_type|执行结果类型|运行态字段|动作结果分支|
|to_status|变更后状态|运行态字段|本次进入状态|
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
|TIMING_RULE_MISSING|缺少时效规则|
|ROUTE_DATA_MISSING|缺少路径数据|
|DEPENDENCY_MISSING|缺少时间依赖|
|CALCULATION_FAILED|计算失败|
