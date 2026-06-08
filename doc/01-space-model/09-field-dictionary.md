# 空间模型字段字典

## 1. 目的

本文档集中维护 Robotaxi 最小运营空间模型的字段英文名、中文名和字段性质。

用途：

1. 代码使用稳定的英文字段名；
2. 前端表格、详情栏和筛选项优先显示中文名；
3. 文档、初始化数据和代码使用同一套字段定义；
4. 区分底层持久化字段和前端动态聚合展示字段；
5. 字段新增、删除或改名时，应先更新本文档和对应对象文档，再修改代码。

字段性质：

|字段性质|含义|
|---|---|
|持久化字段|属于对象自身，应写入初始化数据或后续存储|
|聚合展示字段|根据对象关系动态计算，用于前端解释空间上下文，不写入底层对象|
|校验结果字段|由初始化校验过程生成，不属于业务空间对象|

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

### 8.2 vehicle_capabilities：车辆侧停靠能力

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

## 10. Route：迁移说明

Route 不再作为空间模型中的静态对象维护。

Route 是路径规划策略执行后的路径结果，主定义迁移至：

`doc/05-dispatch-trip/02-route.md`

---

## 11. ValidationResult：初始化校验结果

ValidationResult 不是空间业务对象，仅用于展示初始化校验结果。

|属性英文名|中文名|字段性质|含义|
|---|---|---|---|
|rule_id|规则编号|校验结果字段|校验规则唯一编号|
|rule_name|规则名称|校验结果字段|校验规则中文名称|
|result|结果|校验结果字段|PASS 或 FAIL|
|detail|说明|校验结果字段|补充说明|

---

## 12. 前端枚举值字典

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

---

## 13. 前端显示规则

1. 代码、初始化数据和对象引用继续使用英文字段名；
2. 前端表格列名、详情栏字段名、筛选项名称优先显示中文名；
3. 前端应依据枚举值字典显示中文业务含义，不应直接暴露英文代码值；
4. Cell 详情中的聚合展示字段应与持久化字段明确区分；
5. 新增或修改字段时，应同步更新：
   - 对应对象文档；
   - 本字段字典；
   - 初始化数据；
   - 校验规则；
   - 前端字段映射。
