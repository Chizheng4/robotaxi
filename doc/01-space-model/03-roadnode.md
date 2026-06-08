# RoadNode：道路节点

## 1. 定义

RoadNode 是道路网络中的连接节点。

```text
RoadNode = RoadSegment 的起点或终点，用于连接多个道路片段形成可计算的道路网络
```

RoadNode 不表示道路本身，也不表示服务能力、需求来源或运营区域，仅表达道路连接关系。

---

## 2. 核心作用

- 连接多个 RoadSegment，形成连续可行的道路网络；

- 用于 RoutePlanning 计算路径；

- 支持 RouteExecution 按顺序推进。


---

## 3. 核心关系

```text
1 个 RoadSegment 连接 2 个 RoadNode（start_node / end_node）
1 个 RoadNode 可被多个 RoadSegment 共享
Route 使用 RoadNode 连接多个 RoadSegment
```

说明：

```text
RoadNode 仅用于表示道路拓扑关系，不包含路段长度、通行能力或车辆服务能力
```

---

## 4. 核心属性

|属性|含义|
|---|---|
|road_node_id|道路节点唯一编号|
|map_id|所属 Map|
|cell_id|所在 Cell|
|row|Cell 行号|
|col|Cell 列号|
|x|模拟坐标 X|
|y|模拟坐标 Y|
|node_type|节点类型（INTERSECTION / ENDPOINT / ENTRANCE_EXIT / RAMP / TURNING_POINT）|
|node_status|节点状态（Planned / Active / Restricted / Closed）|

---

## 5. node_type

|node_type|含义|
|---|---|
|INTERSECTION|路口节点|
|ROAD_ENDPOINT|道路端点|
|ENTRANCE_EXIT|出入口节点|
|RAMP_NODE|匝道连接点|
|TURNING_POINT|转折节点|

---

## 6. node_status

|node_status|含义|
|---|---|
|Planned|规划中|
|Active|可使用|
|Restricted|受限|
|Closed|关闭|

---

## 7. 示例数据

```json
{
  "road_node_id": "RN-001",
  "map_id": "M-001",
  "cell_id": "C-05-20",
  "row": 5,
  "col": 20,
  "x": 1000,
  "y": 250,
  "node_type": "INTERSECTION",
  "node_status": "Active"
}
```

---

## 8. 规则

1. RoadNode 必须属于一个 Map；

2. RoadNode 必须定位到一个 Cell；

3. RoadNode 仅用于表达道路连接关系；

4. 不表达道路长度、方向或通行能力；

5. 不表达服务能力、需求来源或运营区域；

6. 道路属性和通行能力由 RoadSegment 表达。

7. RoadNode 所在 Cell 不得被 ServiceArea 覆盖；

8. 当 RoadNode 同时连接两个及以上 RoadSegment 时，应视为路口或道路连接点，该 Cell 只能表达道路拓扑连接，不得用于上车、下车、临停、停车或待命；

9. 前端展示 RoadNode 所在 Cell 时，应明确提示该 Cell 是道路节点 / 路口，不可作为服务区域。


---

## 9. 与其他对象关系

|对象|关系|
|---|---|
|Map|RoadNode 属于 Map|
|Cell|RoadNode 位于 Cell|
|RoadSegment|RoadSegment 通过 start_node_id / end_node_id 连接 RoadNode|
|Route|Route 基于 RoadSegment 计算，依赖 RoadNode 连接顺序|

---

## 10. 核心原则

```text
RoadNode = 仅表示道路连接关系
```

- RoadNode 是道路网络拓扑基础

- 不包含车辆通行能力或服务功能

- 支持 RoutePlanning 与 RouteExecution
