# 空间模型升级方案

> 本文保留模拟物理空间的稀疏 Cell 升级方向。真实经纬度、GeoJSON、矢量地图、空间编辑和真实道路路由的后续升级，统一以 `12-real-geospatial-operating-map-design.md` 为准；两者通过双空间模式共存，不互相替代。

## 1. 目的

本文档定义 Robotaxi 物理空间模型的升级方向。

本方案只处理基础物理空间事实，包括：

- Map；
- Cell；
- Road；
- RoadNode；
- RoadSegment；
- Place；
- Route 所需的空间基础。

人口、需求率、服务容量、增长率、出行产生率等经营画像信息不写入本物理空间模型，统一放入 `doc/00-business-planning/02-demand-profile-design.md` 的需求画像设计。

## 2. 核心原则

### 2.1 物理空间与经营画像分离

物理空间对象只描述可定位、可通行、可聚合的空间事实。

```text
Map
  ↓
Cell
  ↓
Road / RoadNode / RoadSegment
  ↓
Place
  ↓
Route
```

禁止在物理空间对象中直接增加：

- 人口；
- 需求率；
- 出行产生率；
- 服务容量；
- 增长因子；
- 经营预测模型字段。

### 2.2 Cell 是最小逻辑空间单元

Cell 是 Robotaxi 模拟世界中的最小空间离散单元，用于：

- Robotaxi 当前定位；
- Route Step 定位；
- 上车位置定位；
- 下车位置定位；
- 道路、地点和服务区域覆盖关系。

### 2.3 地图范围与 Cell 分辨率分离

地图扩大不应依赖放大 Cell 尺寸。

```text
地图物理范围 = Cell 分辨率 × 逻辑 Cell 数量
```

例如：

```text
Map：10000m × 10000m
Cell：2m × 2m
逻辑 Cell：5000 × 5000
```

### 2.4 Cell 不全部实体化

系统不初始化所有逻辑 Cell，只保存 Active Cell。

Active Cell 包括：

- 道路 Cell；
- 地点 Cell；
- 服务区域 Cell；
- Robotaxi 当前 Cell；
- Route 执行 Cell；
- 其他业务确实引用的 Cell。

## 3. Map 升级

Map 是模拟空间容器，负责定义空间范围、Cell 分辨率和模拟尺度。

建议新增或统一字段：

|字段|类型|说明|
|---|---|---|
|simulation_scale|string|模拟空间规模|
|cell_resolution_m|number|Cell 空间分辨率，建议与现有 `cell_size_m` 收敛|
|time_resolution|string|模拟时间粒度|

示例：

```json
{
  "map_id": "M-001",
  "map_name": "Robotaxi 经营模拟地图",
  "map_width_m": 10000,
  "map_height_m": 10000,
  "cell_resolution_m": 2,
  "simulation_scale": "CITY_AREA",
  "time_resolution": "MINUTE"
}
```

## 4. Cell 升级

Cell 是 Map 的最小空间单元。

基础类型：

|类型|说明|
|---|---|
|EMPTY|空白空间|
|ROAD|道路空间|
|PLACE|地点空间|
|BLOCKED|不可通行空间|

建议新增或统一字段：

|字段|类型|说明|
|---|---|---|
|center_x|number|中心 X 坐标|
|center_y|number|中心 Y 坐标|
|area_m2|number|Cell 面积|
|average_speed_kmh|number|平均移动速度|
|travel_cost|number|移动成本|

关联字段：

|字段|说明|
|---|---|
|road_segment_ids|关联道路片段|
|place_ids|关联地点|
|service_area_ids|关联服务区域|
|zone_ids|关联运营区域|

存储规则：

1. 不初始化全部逻辑 Cell；
2. 按业务需要动态生成；
3. Active Cell 才进入系统存储；
4. Route Step 可以引用动态 Cell；
5. Robotaxi 使用 `current_cell_id` 表达当前位置。

## 5. RoadSegment 升级

RoadSegment 是连续、有序、有方向的道路 Cell 集合，用于路径规划、车辆移动和行驶成本计算。

建议新增或统一字段：

|字段|说明|
|---|---|
|lane_count|车道数量|
|speed_limit_kmh|限速|
|average_speed_kmh|平均速度|
|traffic_level|交通状态|
|travel_time_estimate|预计通行时间|

结构关系：

```text
Road
  ↓
RoadSegment
  ↓
Road Cell Sequence
  ↓
Route Step
```

## 6. Place 升级

Place 表示空间中的地点事实，例如住宅、办公、商业、医院、学校、交通枢纽。

Place 只维护空间事实：

|字段|说明|
|---|---|
|place_id|地点编号|
|place_type|地点类型|
|cell_ids|覆盖 Cell|
|place_status|地点状态|

Place 不保存需求画像字段。Place 的需求产生能力由经营规划层需求画像文档中的 `DemandProfile` 表达，其中 `target_object_type = PLACE`。

## 7. 升级后结构

```text
Map
  ↓
Cell
  ↓
Road Network
    ├─ Road
    ├─ RoadNode
    └─ RoadSegment
  ↓
Place
  ↓
Route
```

## 8. 对代码升级的影响

本文档目前是方案设计，不直接表示已经实现。

后续如进入代码升级，需要重点确认：

- `cell_size_m` 与 `cell_resolution_m` 是否合并；
- 是否需要动态 Active Cell 存储机制；
- Route Step 是否统一引用 Cell；
- Robotaxi 当前位置是否统一为 `current_cell_id`；
- RoadSegment 是否承担行驶速度、耗时和成本基础计算。

## 9. 初始化设计

### 9.1 初始化原则

空间初始化只负责物理空间事实，不承载需求预测、人口、增长、服务容量等经营画像字段。

初始化数据需要同时满足：

1. 支撑当前单 Zone 最小运营闭环；
2. 支撑未来多 Zone 扩展；
3. 支撑长期需求预测和短期需求预测读取空间关联对象；
4. 保持物理空间对象与 DemandProfile 对象分离；
5. 不影响当前项目已经复用的地图、路径规划、Robotaxi 定位和任务调度逻辑。

### 9.2 Map 初始化

第一阶段初始化 1 个 Map。

```json
{
  "map_id": "M-001",
  "map_name": "Robotaxi 经营模拟地图",
  "map_width_m": 10000,
  "map_height_m": 10000,
  "cell_resolution_m": 2,
  "grid_cols": 5000,
  "grid_rows": 5000,
  "simulation_scale": "CITY_AREA",
  "time_resolution": "MINUTE"
}
```

规则：

- Map 定义逻辑空间范围；
- `cell_resolution_m` 是目标字段，现有实现如仍使用 `cell_size_m`，后续代码升级时需要兼容迁移；
- 不生成全部 Cell；
- 只根据业务对象和路径执行动态生成 Active Cell。

### 9.3 Cell 初始化

不初始化 25,000,000 个全量 Cell，只初始化或动态生成 Active Cell。

Active Cell 来源：

|来源|生成 Cell|
|---|---|
|RoadSegment|Road Cell|
|RoadNode|Node Cell|
|Place|Place Cell|
|ServiceArea|Service Cell|
|Robotaxi|Current Cell|
|RouteExecution / Trip|Route Step Cell|

Cell 示例：

```json
{
  "cell_id": "C-1000-2000",
  "map_id": "M-001",
  "row": 1000,
  "col": 2000,
  "base_cell_type": "ROAD",
  "traversable": true,
  "center_x": 2000,
  "center_y": 4000,
  "area_m2": 4
}
```

### 9.4 Road 初始化

第一阶段初始化 10-20 条道路。

|类型|建议数量|
|---|---:|
|MAIN_ROAD|3|
|SECONDARY_ROAD|5|
|ACCESS_ROAD|5|
|INTERNAL_ROAD|5|

Road 示例：

```json
{
  "road_id": "RD-001",
  "road_name": "中央主干路",
  "road_type": "MAIN_ROAD",
  "road_status": "ACTIVE"
}
```

### 9.5 RoadNode 初始化

RoadNode 表示道路网络中的连接点和路径规划节点。若当前实现仍直接使用 Cell 或 RoadSegment 表达节点关系，后续升级应保持兼容，不得破坏已有路径规划调用。

RoadNode 示例：

```json
{
  "road_node_id": "RN-001",
  "map_id": "M-001",
  "cell_id": "C-1000-2000",
  "node_type": "INTERSECTION",
  "connected_road_segment_ids": ["RS-001", "RS-002"],
  "road_node_status": "ACTIVE"
}
```

### 9.6 RoadSegment 初始化

第一阶段初始化 50-100 个 RoadSegment。

```json
{
  "road_segment_id": "RS-001",
  "road_id": "RD-001",
  "start_road_node_id": "RN-001",
  "end_road_node_id": "RN-002",
  "cell_sequence": ["C-1000-2000", "C-1001-2000", "C-1002-2000"],
  "lane_count": 2,
  "speed_limit_kmh": 40,
  "average_speed_kmh": 30,
  "traffic_level": "NORMAL",
  "segment_status": "ACTIVE"
}
```

### 9.7 Place 初始化

第一阶段初始化 20 个左右 Place。

|类型|建议数量|
|---|---:|
|RESIDENTIAL|6|
|OFFICE|4|
|COMMERCIAL|3|
|HOSPITAL|2|
|SCHOOL|2|
|METRO_STATION|2|
|TRANSPORT_HUB|1|
|OPS_CENTER|1|

Place 示例：

```json
{
  "place_id": "P-001",
  "place_name": "住宅生活区 A",
  "place_type": "RESIDENTIAL",
  "place_status": "ACTIVE",
  "cell_ids": ["C-500-500", "C-500-501"]
}
```

Place 只保存空间事实。常住人口、工作人口、访客量、出行产生率、Robotaxi 采用率等字段必须进入 DemandProfile。
