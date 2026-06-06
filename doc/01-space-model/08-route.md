# Route：路径方案

## 1. 定义

Route（路径方案）是车辆在道路网络中从一个 ROAD Cell 到另一个 ROAD Cell 的移动路径结果。

- 描述车辆移动序列和调度可达性
    
- 不表示道路本体或运营区域
    
- 起点和终点 Cell 可以用于执行上车、下车或等候，但必须被 ServiceArea 覆盖
    

---

## 2. 结构

```text
Route
├── start_cell_id
├── end_cell_id
├── route_strategy_id
├── road_segment_sequence
└── related_service_area_ids
```

- `start_cell_id`：起点 Cell
    
- `end_cell_id`：终点 Cell

- `route_strategy_id`：生成该 Route 使用的路径规划策略
    
- `road_segment_sequence`：经过的 RoadSegment 有序列表
    
- `related_service_area_ids`：服务此路径的 ServiceArea 列表（可选）
    

---

## 3. 核心属性

|属性英文名|中文名|含义|
|---|---|---|
|route_id|路径编号|路径唯一编号|
|route_name|路径说明|便于用户理解路径用途的中文说明，不改变 Route 的空间路径结果属性|
|map_id|地图编号|所属 Map|
|start_cell_id|起点网格|路径起点 Cell|
|end_cell_id|终点网格|路径终点 Cell|
|route_strategy_id|路径规划策略编号|生成该 Route 使用的 RoutePlanningStrategy|
|road_segment_sequence|道路片段序列|路径经过的 RoadSegment 有序列表|
|related_service_area_ids|相关服务区域列表|路径相关 ServiceArea|
|total_distance_m|总距离（米）|路径总距离|
|estimated_time_s|预计时间（秒）|路径预计行驶时间|
|route_status|路径状态|路径状态|

---

## 4. route_status

|route_status|中文名|含义|
|---|---|---|
|Planned|规划中|尚未投入使用|
|Active|可使用|可参与路径展示和后续调度|
|Blocked|阻断|路径包含受限或封闭路段|
|Deprecated|已废弃|不再作为有效路径方案|

---

## 5. 示例数据

```json
{
  "route_id": "R-001",
  "route_name": "住宅区接驾区到办公区接驾区",
  "map_id": "M-001",
  "start_cell_id": "C-12-12",
  "end_cell_id": "C-20-08",
  "route_strategy_id": "RPS-001",
  "road_segment_sequence": ["RS-001", "RS-002", "RS-003"],
  "related_service_area_ids": ["SA-001","SA-002"],
  "total_distance_m": 450,
  "estimated_time_s": 60,
  "route_status": "Active"
}
```

---

## 6. 关联关系

|对象|关系|
|---|---|
|Map|Route 属于 Map|
|RoadSegment|Route 基于有序 RoadSegment 生成|
|Cell|Route 起点/终点为 ROAD Cell|
|ServiceArea|Route 起终点 Cell 必须被某个 ServiceArea 覆盖|
|Zone|Route 可经过 Zone 进行运营统计|
|RoutePlanningStrategy|Route 必须记录生成它使用的路径规划策略|

---

## 7. 规则

1. Route 起点和终点必须是 ROAD Cell；
    
2. 起终点 Cell 如果用于服务动作，必须被 ServiceArea 覆盖；
    
3. Route 基于 RoadSegment 序列生成；
    
4. Route 不改变道路属性或通行能力；
    
5. 总距离和预计时间由 RoadSegment 属性累加计算；
    
6. Route 可用于调度、路径优化和运营分析；
    
7. Route 不直接表示需求或订单，只表示车辆移动结果；

8. 由路径规划生成的 Route 必须记录 `route_strategy_id`。
    

---

## 8. 核心原则

```text
Route = ROAD Cell 到 ROAD Cell 的路径结果
RoadSegment = 可通行道路片段
Cell(ROAD) = 道路空间底座
```

Route 是车辆移动路径的最小输出单元，为调度和运营分析提供直接数据。
