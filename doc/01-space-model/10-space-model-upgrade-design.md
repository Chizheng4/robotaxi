# 空间模型升级方案

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

人口、需求率、服务容量、增长率、出行产生率等经营画像信息不写入本物理空间模型，统一放入运营区域的空间经营画像方案。

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

Place 不保存需求画像字段。Place 的需求产生能力由运营区域画像文档中的 `PlaceDemandProfile` 表达。

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
