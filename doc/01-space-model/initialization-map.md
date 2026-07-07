# initialization-map：第一版模拟地图初始化

## 1. 目的

本文档定义第一版 Robotaxi 最小运营空间的初始化要求。

Codex 应基于以下文档理解对象定义：

```text
00-space-model-overview.md
01-map.md
02-road.md
03-roadnode.md
04-roadsegment.md
05-place.md
06-servicearea.md
07-zone.md
09-field-dictionary.md
```

本文档只描述初始化目标、空间布局、对象数量、生成规则和校验规则。

字段英文名、中文名和前端显示规则统一以 `09-field-dictionary.md` 为准。初始化数据使用英文字段名，前端展示优先使用对应中文名。

---

## 2. 初始化目标

第一版初始化一个面向 20 台 Robotaxi 的最小运营模拟空间。

| 项目      | 设定              |
| ------- | --------------- |
| Map 尺寸  | 2000m × 2000m   |
| Cell 尺寸 | 50m × 50m       |
| Grid 规模 | 40 × 40         |
| Cell 总数 | 1600            |
| 目标车辆规模  | 20 台            |
| 坐标类型    | SIMULATION_GRID |

---

## 2.1 初始化对象中文显示名

后续前端展示应以中文为主，初始化数据中的对象英文名与中文显示名对应如下：

|对象英文名|中文显示名|初始化职责|
|---|---|---|
|Map|地图|空间容器|
|Cell|网格单元|最小空间单元|
|Road|道路|完整道路语义|
|RoadNode|道路节点|道路网络连接节点|
|RoadSegment|道路片段|可计算、可通行道路片段|
|Place|地点 / 需求来源|产生出行需求的地点或区域|
|ServiceArea|服务区域|可上车、下车、等待、停靠的人车服务接口空间|
|Zone|运营区域|运营管理和统计区域|
|ValidationResult|初始化校验结果|展示初始化校验规则和检查结果|

---

## 3. 对象生成顺序

Codex 应按以下顺序生成数据：

```text
Map
↓
Cell
↓
Road
↓
RoadNode
↓
RoadSegment
↓
Place
↓
ServiceArea
↓
Zone
```

原因：

- Cell 是所有空间对象的底层承载；

- RoadNode 和 RoadSegment 依赖 Cell；

- Place 依赖 PLACE Cell；

- ServiceArea 依赖 ROAD Cell / RoadSegment；

- Zone 聚合 Cell、RoadSegment、Place、ServiceArea。


---

## 4. Map 初始化

```json
{
  "map_id": "M-001",
  "map_name": "20台Robotaxi最小运营模拟地图",
  "map_width_m": 2000,
  "map_height_m": 2000,
  "cell_size_m": 50,
  "grid_cols": 40,
  "grid_rows": 40,
  "total_cells": 1600,
  "coordinate_type": "SIMULATION_GRID"
}
```

---

## 5. Cell 初始化规则

生成 40 × 40 共 1600 个 Cell。

```text
cell_id = C-row-col
row = 0 ~ 39
col = 0 ~ 39
```

初始全部 Cell 设为：

```json
{
  "base_cell_type": "EMPTY",
  "traversable": false
}
```

后续由 Road、Place 等对象覆盖更新 Cell 类型。

基础类型规则：

|类型|规则|
|---|---|
|ROAD|被 RoadSegment 覆盖|
|PLACE|被 Place 覆盖|
|BLOCKED|不可通行区域|
|EMPTY|未被对象覆盖|

同一个 Cell 只能有一个 `base_cell_type`。

前端展示要求：

- 点击任意 Cell 时，右侧详情栏必须展示 Cell 自身信息；

- 同时聚合展示该 Cell 关联的 Map、Zone、Road、RoadSegment、RoadNode、ServiceArea、Place，以及后续接入的 OpsCenter、Robotaxi 等必要上下文；

- 如果某类对象无关联，应明确显示无关联；

- 该设计用于让用户通过一个 Cell 理解完整空间关系，避免空间语义模糊。

---

## 6. Road 初始化

第一版生成 5 条 Road。

|road_id|road_name|road_type|
|---|---|---|
|RD-001|西侧纵向主路|MAIN_ROAD|
|RD-002|东侧纵向主路|MAIN_ROAD|
|RD-003|北侧横向主路|MAIN_ROAD|
|RD-004|南侧横向主路|SECONDARY_ROAD|
|RD-005|运营中心接入道路|ACCESS_ROAD|

---

## 7. RoadNode 初始化

第一版生成 14 个 RoadNode。

|road_node_id|row|col|node_type|
|---|---|---|---|
|RN-001|0|10|ROAD_ENDPOINT|
|RN-002|12|10|INTERSECTION|
|RN-003|28|10|INTERSECTION|
|RN-004|39|10|ROAD_ENDPOINT|
|RN-005|0|25|ROAD_ENDPOINT|
|RN-006|12|25|INTERSECTION|
|RN-007|28|25|INTERSECTION|
|RN-008|39|25|ROAD_ENDPOINT|
|RN-009|12|0|ROAD_ENDPOINT|
|RN-010|12|39|ROAD_ENDPOINT|
|RN-011|28|0|ROAD_ENDPOINT|
|RN-012|28|39|ROAD_ENDPOINT|
|RN-013|35|25|INTERSECTION|
|RN-014|35|31|ENTRANCE_EXIT|

所有 RoadNode 均属于：

```text
map_id = M-001
node_status = Active
```

RoadNode 所在 Cell 规则：

- RoadNode 所在 Cell 是道路拓扑连接点；

- RoadNode 所在 Cell 不得被 ServiceArea 覆盖；

- 当 RoadNode 连接两个及以上 RoadSegment 时，应视为 T 型路口、十字路口或道路连接点；

- 路口 Cell 只表达道路网络连接关系，不表达服务能力。

---

## 8. RoadSegment 初始化

第一版生成 14 条 RoadSegment。

|road_segment_id|road_id|start_node_id|end_node_id|覆盖 Cell 规则|
|---|---|---|---|---|
|RS-001|RD-001|RN-001|RN-002|col=10, row=0~12|
|RS-002|RD-001|RN-002|RN-003|col=10, row=12~28|
|RS-003|RD-001|RN-003|RN-004|col=10, row=28~39|
|RS-004|RD-002|RN-005|RN-006|col=25, row=0~12|
|RS-005|RD-002|RN-006|RN-007|col=25, row=12~28|
|RS-006|RD-002|RN-007|RN-013|col=25, row=28~35|
|RS-007|RD-003|RN-009|RN-002|row=12, col=0~10|
|RS-008|RD-003|RN-002|RN-006|row=12, col=10~25|
|RS-009|RD-003|RN-006|RN-010|row=12, col=25~39|
|RS-010|RD-004|RN-011|RN-003|row=28, col=0~10|
|RS-011|RD-004|RN-003|RN-007|row=28, col=10~25|
|RS-012|RD-004|RN-007|RN-012|row=28, col=25~39|
|RS-013|RD-002|RN-013|RN-008|col=25, row=35~39|
|RS-014|RD-005|RN-013|RN-014|row=35, col=25~31|

所有 RoadSegment 默认：

```json
{
  "direction": "TWO_WAY",
  "speed_limit_kmh": 40,
  "traversable": true,
  "segment_status": "Active"
}
```

RoadSegment 覆盖的 Cell 应更新为：

```json
{
  "base_cell_type": "ROAD",
  "traversable": true
}
```

---

## 9. Place 初始化

第一版生成 6 个 Place。

|place_id|place_name|place_type|覆盖 Cell 范围|demand_weight|peak_pattern|
|---|---|---|---|---|---|
|P-001|住宅生活区|RESIDENTIAL|row=2~10, col=2~8|0.9|MORNING_OUTBOUND|
|P-002|办公区|OFFICE|row=2~10, col=28~37|0.85|EVENING_OUTBOUND|
|P-003|商业中心|COMMERCIAL|row=15~23, col=15~23|0.75|ALL_DAY_STABLE|
|P-004|医院学校片区|HOSPITAL|row=30~37, col=2~9|0.55|ALL_DAY_STABLE|
|P-005|地铁接驳点|METRO_STATION|row=24~27, col=27~31|0.8|ALL_DAY_STABLE|
|P-006|最小运营测试中心|OPS_CENTER|C-34-32、C-34-33、C-35-32、C-35-33|0.2|MORNING_OUTBOUND|

Place 覆盖的 Cell 应更新为：

```json
{
  "base_cell_type": "PLACE",
  "traversable": false
}
```

Place 不应覆盖 ROAD Cell。

`P-006` 是特殊 Place：

- 与 `OC-001` 使用相同 Cell；

- 表达运营中心的地图地点语义；

- 可以产生员工通勤、访客等人员出行需求；

- 关联附近服务区 `SA-006`；

- 地图中应使用浅紫色展示，与其他 Place 类型区分。

不同 `place_type` 应使用不同颜色展示，便于运营人员快速识别住宅、办公、商业、医院、地铁站和运营中心等空间用途。颜色以简洁、柔和、易区分为原则。

---

## 10. ServiceArea 初始化

第一版生成 6 个 ServiceArea。

|service_area_id|name|关联 RoadSegment|覆盖 ROAD Cell|主要用途|
|---|---|---|---|---|
|SA-001|住宅区东侧接驾区|RS-001|col=10, row=5~7|住宅区上下车|
|SA-002|办公区西侧接驾区|RS-004|col=25, row=5~7|办公区上下车|
|SA-003|商业中心北侧上下客区|RS-008|row=12, col=17~20|商业中心上下车|
|SA-004|医院学校东侧上下客区|RS-010|row=28, col=5~8|医院学校上下车|
|SA-005|地铁站南侧接驳区|RS-012|row=28, col=26~27|地铁接驳|
|SA-006|运营中心接入道路待命区|RS-014|row=35, col=28~30|运营中心车辆出入与待命|

ServiceArea 只能覆盖 ROAD Cell。

ServiceArea 覆盖限制：

- ServiceArea 不得覆盖 RoadNode 所在 Cell；

- ServiceArea 不得覆盖连接两个及以上 RoadSegment 的路口 Cell；

- ServiceArea 应选择 RoadSegment 上非 RoadNode 的 ROAD Cell；

- 即使某个 Cell 是 ROAD，只要它同时是 RoadNode 所在 Cell，也不能作为 ServiceArea。

默认能力如下：

### SA-001 ~ SA-005

```json
{
  "customer_capabilities": {
    "can_pickup": true,
    "can_dropoff": true,
    "can_wait": true
  },
  "vehicle_capabilities": {
    "can_stop_for_service": true,
    "can_short_wait": true,
    "can_stage": false,
    "can_long_park": false
  },
  "max_vehicle_capacity": 3,
  "status": "Active"
}
```

### SA-006

```json
{
  "customer_capabilities": {
    "can_pickup": false,
    "can_dropoff": false,
    "can_wait": false
  },
  "vehicle_capabilities": {
    "can_stop_for_service": false,
    "can_short_wait": true,
    "can_stage": true,
    "can_long_park": false
  },
  "max_vehicle_capacity": 6,
  "status": "Active"
}
```

说明：

- ServiceArea 不表达充电能力；

- 充电设施不在第一版初始化范围内；

- ServiceArea 是 RoadSegment 上的服务能力覆盖层。

- `SA-006` 位于 Map 右下角运营中心附近的接入道路，不承担运营中心内全部车辆的停放容量。


---

## 11. Zone 初始化

第一版生成 1 个主 Zone 和 4 个子 Zone。

|zone_id|zone_name|zone_level|zone_type|覆盖范围|
|---|---|---|---|---|
|Z-001|最小运营测试区|ZONE|MIXED_ZONE|全 Map|
|Z-001-A|住宅生活子区|SUB_ZONE|RESIDENTIAL_ZONE|row=0~14, col=0~14|
|Z-001-B|办公通勤子区|SUB_ZONE|OFFICE_ZONE|row=0~14, col=25~39|
|Z-001-C|商业交通子区|SUB_ZONE|COMMERCIAL_ZONE|row=12~30, col=12~30|
|Z-001-D|医院学校子区|SUB_ZONE|MIXED_ZONE|row=28~39, col=0~14|

Zone 通过 Cell 范围生成：

```text
cell_ids
road_segment_ids
place_ids
service_area_ids
```

子 Zone 的 parent_zone_id 均为：

```text
Z-001
```

---

## 12. Route 初始化

当前版本不在地图初始化阶段生成静态 Route。

Route 是路径规划策略执行后的输出结果，应在运营投放、异常到达重规划等业务流程触发路径规划时生成。

Route 主定义见：

```text
doc/05-fleet-asset-management/03-route.md
```


---

## 13. 初始化校验规则

Codex 生成数据后必须检查以下规则：

### 13.1 Cell 校验

1. Cell 总数必须为 1600；

2. 每个 Cell 只能有一个 base_cell_type；

3. ROAD Cell 不得同时是 PLACE Cell；

4. PLACE Cell 不得同时是 ROAD Cell。

5. 点击 Cell 的详情数据应能聚合 Map、Zone、Road、RoadSegment、RoadNode、ServiceArea、Place 等关联上下文。


### 13.2 RoadSegment 校验

1. 每个 RoadSegment 必须属于 Road；

2. 每个 RoadSegment 必须有 start_node_id 和 end_node_id；

3. RoadSegment 覆盖的 Cell 必须是 ROAD；

4. RoadSegment 覆盖 Cell 应连续。


### 13.3 Place 校验

1. Place 覆盖 Cell 必须是 PLACE；

2. Place 不得覆盖 ROAD Cell；

3. Place 必须至少关联一个附近 ServiceArea。


### 13.4 ServiceArea 校验

1. ServiceArea 覆盖 Cell 必须是 ROAD；

2. ServiceArea 必须关联 RoadSegment；

3. can_pickup 或 can_dropoff 为 true 时，can_stop_for_service 必须为 true；

4. ServiceArea 不得定义 can_charge。

5. ServiceArea 不得覆盖 RoadNode 所在 Cell。

6. ServiceArea 不得覆盖连接两个及以上 RoadSegment 的路口 Cell。


### 13.5 Zone 校验

1. 子 Zone 必须属于父 Zone；

2. 子 Zone 覆盖范围不得超出父 Zone；

3. Zone 不作为 Cell 基础类型；

4. Zone 应能统计包含的 Cell、Place、RoadSegment 和 ServiceArea。


### 13.6 Route 校验

地图初始化阶段不校验静态 Route。

Route 校验应在路径规划生成 Route 后执行，重点校验 route_steps 首尾、连续性、road_segment_sequence 连续性，以及 RoutePlanningRun / RouteExecution 的关联一致性。


---

## 14. Codex 实现要求

Codex 基于本文档初始化空间数据时，应完成：

1. 生成 Map；

2. 生成 1600 个 Cell；

3. 根据 RoadSegment 设置 ROAD Cell；

4. 根据 Place 设置 PLACE Cell；

5. 根据 ServiceArea 设置服务能力覆盖；

6. 根据 Zone 生成运营区域覆盖；

7. 输出初始化后的空间对象数据；

8. 输出校验结果；

10. 不生成 Vehicle、Demand、Order、DispatchTask、Trip、Metric。

11. 前端表格、详情栏和筛选项应依据 `09-field-dictionary.md` 显示中文字段名。


---

## 15. 核心原则

```text
initialization-map.md 只定义第一版空间数据如何生成
不重新定义业务对象本身
```

业务对象定义以各自 md 文件为准。
本文档只负责提供第一版可运行模拟地图的初始化方案。
