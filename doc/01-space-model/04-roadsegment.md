# RoadSegment：道路片段

## 1. 定义

RoadSegment 是 Road 下的一段连续道路片段。

```text
RoadSegment = 连续、有序、有方向、可通行的道路片段
```

它用于把 Map 中离散的 Road Cell 组织成可被路径规划使用的道路结构。

---

## 2. 核心定位

```text
Cell = 最小空间单元
Road = 道路对象
RoadSegment = 有序道路片段
RoadNode = 道路连接点
Route = 基于 RoadSegment 生成的路径方案
RouteExecution = Robotaxi 按 Route 实际行驶记录
```

RoadSegment 的核心价值是：

```text
让一组 Road Cell 具备方向、顺序和连续通行关系
```

---

## 3. 核心关系

```text
1 条 Road 可以包含多个 RoadSegment
1 个 RoadSegment 属于 1 条 Road
1 个 RoadSegment 由多个连续 Cell 组成
1 个 RoadSegment 连接 2 个 RoadNode
Route 可以引用多个 RoadSegment
```

RoadSegment 是 Route 生成 route_steps 的底层来源之一。

---

## 4. 核心属性

|属性|含义|
|---|---|
|road_segment_id|道路片段唯一编号|
|road_id|所属 Road|
|map_id|所属 Map|
|start_node_id|起点 RoadNode|
|end_node_id|终点 RoadNode|
|cell_sequence|按通行顺序排列的 Cell 列表|
|direction|cell_sequence 的默认方向|
|allowed_direction|允许通行方向|
|segment_status|道路片段状态|
|total_distance_km|道路片段长度|
|service_area_ids|关联 ServiceArea，可为空|

---

## 5. cell_sequence

cell_sequence 是 RoadSegment 的核心字段。

```text
cell_sequence = RoadSegment 内按通行顺序排列的 Cell 列表
```

示例：

```json
{
  "road_segment_id": "RS-008",
  "cell_sequence": [
    "C-35-33",
    "C-35-32",
    "C-35-31",
    "C-35-30",
    "C-35-29",
    "C-35-28"
  ]
}
```

规则：

1. cell_sequence 必须有顺序；

2. cell_sequence 中相邻 Cell 必须在 Map 上连续；

3. cell_sequence 中的 Cell 必须是可通行 Road Cell；

4. RoutePlanning 生成 Route 时，应基于 cell_sequence 生成 route_steps；

5. RouteExecution 不得直接使用无序 Road Cell 行驶。


---

## 6. direction

direction 表示 cell_sequence 的默认方向。

|direction|含义|
|---|---|
|NORTH|向北|
|SOUTH|向南|
|EAST|向东|
|WEST|向西|
|MIXED|多方向组合|
|UNKNOWN|未定义|

说明：

```text
direction 用于表达 RoadSegment 中 Cell 的排列方向，
不是完整交通规则。
```

---

## 7. allowed_direction

allowed_direction 表示该 RoadSegment 允许 Robotaxi 如何通行。

|allowed_direction|含义|
|---|---|
|FORWARD|只能按 cell_sequence 正向通行|
|BACKWARD|只能按 cell_sequence 反向通行|
|BIDIRECTIONAL|可双向通行|
|CLOSED|不可通行|

示例：

```text
cell_sequence = C-35-33 → C-35-32 → C-35-31
allowed_direction = FORWARD
```

表示 Robotaxi 只能按以上顺序通行。

---

## 8. segment_status

|segment_status|含义|
|---|---|
|ACTIVE|可通行|
|RESTRICTED|受限通行|
|BLOCKED|阻塞|
|CLOSED|关闭|
|PLANNED|规划中|

说明：

```text
RoutePlanning 只能优先使用 ACTIVE 的 RoadSegment。
BLOCKED / CLOSED 不应生成可执行 Route。
```

---

## 9. 与 RoadNode 的关系

RoadSegment 通过 start_node_id 和 end_node_id 与 RoadNode 连接。

```text
RoadSegment A
↓
RoadNode
↓
RoadSegment B
```

RoadNode 用于表达道路片段之间是否可连接、是否可转向。

RoadSegment 只表达自身内部 Cell 的有序通行结构。

---

## 10. 与 Route 的关系

Route 是路径规划结果，RoadSegment 是道路事实。

```text
RoadSegment.cell_sequence
↓
RoutePlanning
↓
Route.route_steps
```

Route 生成时，应从 RoadSegment.cell_sequence 中提取有序 Cell，形成 route_steps。

如果 Route 跨多个 RoadSegment，应按照 RoadNode 连接关系拼接多个 RoadSegment 的 cell_sequence。

---

## 11. 与 RouteExecution 的关系

RouteExecution 不直接执行 RoadSegment。

RouteExecution 执行的是 Route.route_steps。

但 Route.route_steps 的顺序必须来源于 RoadSegment.cell_sequence。

```text
RoadSegment.cell_sequence
↓
Route.route_steps
↓
RouteExecution.current_step_index
↓
Robotaxi.current_cell_id
```

---

## 12. 与 ServiceArea 的关系

ServiceArea 可以覆盖或关联 RoadSegment 中的部分 Cell。

ServiceArea 负责表达：

```text
哪些 Cell 可上车
哪些 Cell 可下车
哪些 Cell 可临停
哪些 Cell 可停车
哪些 Cell 可待命
```

RoadSegment 负责表达：

```text
这些 Cell 如何被 Robotaxi 有序通行
```

ServiceArea 不替代 RoadSegment。

---

## 13. 初始化规则

初始化 RoadSegment 时必须保证：

1. 每个 RoadSegment 属于一个 Road；

2. 每个 RoadSegment 至少包含 2 个 Cell；

3. cell_sequence 必须连续；

4. cell_sequence 中所有 Cell 必须可通行；

5. start_node_id 应对应 cell_sequence 的起点区域；

6. end_node_id 应对应 cell_sequence 的终点区域；

7. allowed_direction 必须明确；

8. segment_status 默认为 ACTIVE；

9. total_distance_km 可按 Cell 数量和 Cell 尺寸估算。


---

## 14. 示例数据

```json
{
  "road_segment_id": "RS-008",
  "road_id": "RD-003",
  "map_id": "M-001",
  "start_node_id": "RN-004",
  "end_node_id": "RN-005",
  "cell_sequence": [
    "C-35-33",
    "C-35-32",
    "C-35-31",
    "C-35-30",
    "C-35-29",
    "C-35-28"
  ],
  "direction": "NORTH",
  "allowed_direction": "BIDIRECTIONAL",
  "segment_status": "ACTIVE",
  "total_distance_km": 0.25,
  "service_area_ids": ["SA-006"]
}
```

---

## 15. 核心规则

1. RoadSegment 必须由连续 Road Cell 组成；

2. RoadSegment 必须有 cell_sequence；

3. cell_sequence 必须有顺序；

4. RoadSegment 必须有 start_node_id 和 end_node_id；

5. RoadSegment 必须明确 allowed_direction；

6. RoutePlanning 必须基于 RoadSegment.cell_sequence 生成 Route；

7. RouteExecution 不得直接执行无序 Road Cell；

8. ServiceArea 提供停靠能力，RoadSegment 提供通行结构；

9. BLOCKED / CLOSED 的 RoadSegment 不应生成可执行 Route；

10. RoadSegment 是 Route 可执行化的底层基础。


---

## 16. 核心原则

```text
RoadSegment = 有序、连续、有方向的道路片段
```

```text
Cell 提供空间单元；
RoadSegment 组织 Cell 的通行顺序；
Route 基于 RoadSegment 生成可执行路径；
RouteExecution 按 Route 实际行驶。
```