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

## 5. 第一阶段规则

1. Map 由 Cell 组成。
    
2. Cell 是最小空间单元。
    
3. 每个 Cell 只能有一个基础类型。
    
4. Cell 用于表达底层空间事实。
    
5. Cell 不直接承担运营、服务或管理语义。
    
6. 道路、地点、服务区域、运营区域等业务对象将在后续文档中定义。
    
7. 后续业务对象可以引用或聚合多个 Cell 来表达更高层级的空间概念。
    

---

## 6. 核心原则

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
