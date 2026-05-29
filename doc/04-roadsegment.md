# RoadSegment：道路片段

## 1. 定义

RoadSegment（道路片段）是道路网络的最小计算单元。

- 连接两个 RoadNode；
    
- 覆盖一组 ROAD Cell；
    
- 表达道路通行属性；
    
- 是路径计算和车辆移动的基础。
    

---

## 2. 结构

```text
RoadSegment
├── start_node_id (RoadNode)
└── end_node_id (RoadNode)
```

一条 Road 可以由多个 RoadSegment 组成。  
多个 RoadSegment 可以共享同一个 RoadNode。

---

## 3. 核心属性

|属性英文名|中文名|含义|
|---|---|---|
|road_segment_id|道路片段编号|道路片段唯一编号|
|road_id|道路编号|所属 Road|
|map_id|地图编号|所属 Map|
|start_node_id|起点道路节点|起点 RoadNode|
|end_node_id|终点道路节点|终点 RoadNode|
|cell_ids|覆盖道路网格|覆盖的 ROAD Cell 列表|
|distance_m|道路片段长度（米）|道路片段长度|
|direction|通行方向|道路方向（双向/单向）|
|speed_limit_kmh|限速（公里/小时）|道路限速|
|traversable|是否可通行|车辆是否可通行|
|segment_status|道路片段状态|道路片段状态|
|service_area_ids|服务区域列表|关联的 ServiceArea 列表|

---

## 4. direction

|direction|中文名|含义|
|---|---|---|
|TWO_WAY|双向通行|车辆可双向通行|
|ONE_WAY|单向通行|车辆只能按 start_node_id 到 end_node_id 方向通行|

---

## 5. segment_status

|segment_status|中文名|含义|
|---|---|---|
|Planned|规划中|尚未投入使用|
|Active|可使用|可参与通行和路径计算|
|Restricted|限制使用|部分场景或时段受限|
|Closed|关闭|不可通行|

---

## 6. 示例数据

```json
{
  "road_segment_id": "RS-001",
  "road_id": "RD-001",
  "map_id": "M-001",
  "start_node_id": "RN-001",
  "end_node_id": "RN-002",
  "cell_ids": ["C-12-10","C-12-11","C-12-12"],
  "distance_m": 150,
  "direction": "TWO_WAY",
  "speed_limit_kmh": 50,
  "traversable": true,
  "segment_status": "Active",
  "service_area_ids": ["SA-001"]
}
```

---

## 7. 关联关系

|对象|关系|
|---|---|
|Road|RoadSegment 属于某条 Road|
|RoadNode|RoadSegment 由 start_node_id 和 end_node_id 连接|
|Cell|RoadSegment 覆盖 ROAD Cell|
|ServiceArea|ServiceArea 可覆盖部分 RoadSegment Cell|
|Route|Route 基于 RoadSegment 序列生成路径|

---

## 8. 第一阶段规则

1. RoadSegment 是道路计算和通行的最小单元；
    
2. 必须包含至少一个 ROAD Cell；
    
3. start_node_id 和 end_node_id 必须是有效 RoadNode；
    
4. 道路属性由 RoadSegment 记录；
    
5. ServiceArea 可以覆盖 RoadSegment 的部分或全部 Cell；
    
6. Route 通过 RoadSegment 序列形成路径。
    

---

## 9. 核心原则

```text
RoadSegment = 可行驶道路片段
Cell (ROAD) = 道路空间底座
ServiceArea = 服务覆盖层
```

RoadSegment 是道路通行和路径计算的核心对象，连接 RoadNode，承载 Cell 并可被 ServiceArea 覆盖。
