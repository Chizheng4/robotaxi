# Map：模拟地图

## 1. 定义

Map（地图）是 Robotaxi 运营模拟中的空间容器。

Map 由 Cell（网格单元）组成，Cell 是 Map 的最小空间单元。

第一阶段采用规则网格地图：

```text
地图尺寸：2000m × 2000m
Cell尺寸：50m × 50m
网格规模：40 × 40
Cell总数：1600
```

---

## 2. Map 属性

|属性英文名|中文名|含义|
|---|---|---|
|map_id|地图编号|地图唯一编号|
|map_name|地图名称|地图名称|
|map_width_m|地图宽度（米）|地图宽度|
|map_height_m|地图高度（米）|地图高度|
|cell_size_m|网格边长（米）|Cell 边长|
|grid_cols|网格列数|地图横向 Cell 数量|
|grid_rows|网格行数|地图纵向 Cell 数量|
|total_cells|网格总数|Cell 总数|
|coordinate_type|坐标类型|模拟地图使用的坐标体系|

示例：

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

## 3. Cell

Cell（网格单元）是 Map 的最小空间单元。

采用行列坐标定位：

```text
cell_id = C-row-col
row = 0 ~ 39
col = 0 ~ 39
```

示例：

```text
C-00-00
C-10-15
C-39-39
```

### Cell 基础类型

Cell 用于表达底层空间事实。

|base_cell_type|中文名|含义|
|---|---|---|
|EMPTY|空白区域|未被道路、地点或阻断区域覆盖的空间|
|ROAD|道路区域|被 RoadSegment 覆盖的可通行道路空间|
|PLACE|地点区域|地点、建筑、需求来源区域|
|BLOCKED|不可通行区域|不可通行区域|

一个 Cell 只能拥有一个基础类型。

---

## 4. Cell 属性

|属性英文名|中文名|含义|
|---|---|---|
|cell_id|网格编号|Cell 唯一编号|
|map_id|地图编号|所属 Map|
|row|行号|所在网格行号|
|col|列号|所在网格列号|
|base_cell_type|基础空间类型|Cell 的互斥基础类型|
|traversable|是否可通行|车辆是否可以通行|

说明：

当前阶段仅定义 Cell 自身属性。

Road、Place、Zone、ServiceArea 等业务对象将在各自文档中定义，并在对应文档中说明其与 Cell 的关系。

---

## 5. Cell 上下文详情展示

在前端地图中，Cell 是用户理解整个模拟空间的最小入口。用户点击任意 Cell 时，右侧详情栏不应只展示 Cell 自身属性，还应展示该 Cell 在空间网络中的关联上下文，避免用户需要在多个管理页面之间反复查找。

Cell 详情至少应包含：

| 上下文类别          | 中文显示      | 说明                                         |
| -------------- | --------- | ------------------------------------------ |
| Cell 自身信息      | 网格自身信息    | cell_id、row、col、base_cell_type、traversable |
| Map 关联         | 所属地图      | 该 Cell 所属 Map                              |
| Zone 关联        | 所属运营区域    | 覆盖该 Cell 的 Zone / SubZone                  |
| RoadSegment 关联 | 所属道路片段    | 当 Cell 为 ROAD 时，展示覆盖该 Cell 的 RoadSegment   |
| Road 关联        | 所属道路      | 通过 RoadSegment 反查 Road                     |
| RoadNode 关联    | 道路节点      | 如果该 Cell 存在 RoadNode，展示 RoadNode 及其连接关系    |
| ServiceArea 关联 | 服务区域      | 如果该 Cell 被 ServiceArea 覆盖，展示服务能力           |
| Place 关联       | 地点 / 需求来源 | 如果该 Cell 为 PLACE，展示对应 Place                |
| OpsCenter 关联   | 关联运营中心    | 如果该 Cell 被 OpsCenter 覆盖，展示供给侧运营设施          |
| Robotaxi 关联    | 停放 Robotaxi | 如果车辆当前位于该 Cell，展示车辆列表                     |

### Cell 聚合展示字段

以下字段用于前端 Cell 详情聚合视图。它们由 Cell 与其他空间对象的关联关系动态计算，不属于 Cell 的底层持久化字段。

|属性英文名|中文名|含义|
|---|---|---|
|related_map|所属地图|该 Cell 所属 Map|
|related_zones|所属运营区域|覆盖该 Cell 的 Zone / SubZone 列表|
|related_roads|所属道路|通过 RoadSegment 反查得到的 Road 列表|
|related_road_segments|所属道路片段|覆盖该 Cell 的 RoadSegment 列表|
|related_road_nodes|道路节点|位于该 Cell 的 RoadNode 列表|
|related_service_areas|服务区域|覆盖该 Cell 的 ServiceArea 列表|
|related_places|地点 / 需求来源|覆盖该 Cell 的 Place 列表|
|related_ops_centers|关联运营中心|覆盖该 Cell 的 OpsCenter 列表|
|related_robotaxis|停放 Robotaxi|当前位于该 Cell 的 Robotaxi 列表|
|operational_space_coverage|运营空间覆盖|说明该 Cell 是否被运营中心等运营设施覆盖|
|service_eligibility|服务能力判断|说明该 Cell 是否可作为服务区域，以及原因|

展示原则：

1. Cell 详情是空间上下文聚合视图，不只是 Cell 原始字段视图。
2. ROAD Cell 应能说明“可通行但是否可服务”。
3. PLACE Cell 应能说明“需求来源在哪里，以及附近服务区域是什么”。
4. RoadNode 所在 Cell 应明确说明其道路拓扑意义，例如道路端点、T 型路口或十字路口。
5. 如果 Cell 不属于某类对象，应明确显示为空或无关联，避免语义模糊。
6. Cell 的 `base_cell_type` 继续表达底层空间事实，但前端必须显示对应中文值。
7. 当 Cell 属于 `OPS_CENTER` 类型 Place 时，基础空间类型应为 `PLACE`，前端应同时显示“地点区域”和“运营中心”覆盖语义，避免运营人员误认为该 Cell 只是普通地点。

---

## 6. 第一阶段规则

1. Map 由 Cell 组成。
    
2. Cell 是最小空间单元。
    
3. 每个 Cell 只能有一个基础类型。
    
4. Cell 用于表达底层空间事实。
    
5. Cell 不直接承担运营、服务或管理语义。
    
6. 道路、地点、服务区域、运营区域等业务对象将在后续文档中定义。
    
7. 后续业务对象可以引用或聚合多个 Cell 来表达更高层级的空间概念。
    

---

## 7. 核心原则

Map 文档只定义空间容器及其最小组成单元。

```text
Map
└── Cell
```

Cell 只负责表达基础空间事实：

```text
EMPTY
ROAD
PLACE
BLOCKED
```

关于 Road、Place、ServiceArea、Zone、Route 等业务对象的定义，以及它们与 Cell 的关系，应在对应业务对象文档中进行说明，以保持文档结构清晰和阅读顺序一致。
