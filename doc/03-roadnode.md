# RoadNode：道路节点

## 1. 定义

RoadNode（道路节点）是道路网络中的连接节点。

它用于连接 RoadSegment，使多个道路片段形成可计算的道路网络。

RoadNode 不表示道路本身，也不表示服务能力、需求来源或运营区域。

---

## 2. 结构

```text
RoadSegment
├── start_node_id
└── end_node_id
```

一个 RoadSegment 由两个 RoadNode 定义起点和终点。

多个 RoadSegment 可以共享同一个 RoadNode，从而形成道路连接关系。

示例：

```text
RN-001 ── RS-001 ── RN-002
```

---

## 3. 核心属性

|属性英文名|中文名|含义|
|---|---|---|
|road_node_id|道路节点编号|道路节点唯一编号|
|map_id|地图编号|所属 Map|
|cell_id|所在网格编号|所在 Cell|
|row|行号|所在 Cell 行号|
|col|列号|所在 Cell 列号|
|x|模拟坐标 X|模拟坐标 x|
|y|模拟坐标 Y|模拟坐标 y|
|node_type|节点类型|道路节点类型|
|node_status|节点状态|道路节点状态|

---

## 4. node_type

|node_type|中文名|含义|
|---|---|---|
|INTERSECTION|路口节点|多条 RoadSegment 的连接点|
|ROAD_ENDPOINT|道路端点|道路网络端点|
|ENTRANCE_EXIT|出入口节点|地点或区域出入口连接点|
|RAMP_NODE|匝道连接点|匝道或特殊连接点|
|TURNING_POINT|转折节点|道路形态转折点|

---

## 5. node_status

|node_status|中文名|含义|
|---|---|---|
|Planned|规划中|尚未投入使用|
|Active|可使用|可用于道路拓扑连接|
|Restricted|受限|连接能力受限|
|Closed|关闭|不可使用|

---

## 6. 示例数据

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

## 7. 关联关系

|对象|关系|
|---|---|
|Map|RoadNode 属于某个 Map|
|Cell|RoadNode 位于某个 Cell|
|RoadSegment|RoadSegment 通过 start_node_id 和 end_node_id 连接 RoadNode|
|Route|Route 基于 RoadSegment 序列生成，依赖 RoadNode 的连接关系|

---

## 8. 规则

1. RoadNode 必须属于一个 Map；
    
2. RoadNode 必须定位到一个 Cell；
    
3. RoadNode 仅表达道路连接关系；
    
4. RoadNode 不表达道路长度、通行时间、方向或通行能力；
    
5. RoadNode 不表达服务能力、需求来源或运营区域；
    
6. 道路属性和通行能力由 RoadSegment 表达。
