# Road：道路

## 1. 定义

Road 表示 Map 中的一条完整道路，用于表达道路名称和道路语义。

```text
Road = 由若干 RoadSegment 构成的完整道路
```

Road 主要用于组织道路语义，不作为路径计算或调度的最小单元。

---

## 2. 核心作用

- 聚合多个 RoadSegment，形成完整道路；

- 提供道路名称、类型和状态信息；

- 支持 RoutePlanning 与 RouteExecution 进行路径计算。


---

## 3. 结构

```text
Road
└── RoadSegment
```

- 一个 Road 可以包含多个 RoadSegment；

- RoadSegment 是实际的可通行片段。


---

## 4. 核心属性

|属性|含义|
|---|---|
|road_id|道路唯一编号|
|map_id|所属 Map|
|road_name|道路名称|
|road_type|道路类型（MAIN / SECONDARY / INTERNAL / ACCESS）|
|road_status|道路状态（Planned / Active / Restricted / Closed）|
|road_segment_ids|包含的 RoadSegment 列表|

---

## 5. road_type

|road_type|含义|
|---|---|
|MAIN_ROAD|主干路|
|SECONDARY_ROAD|次干路|
|INTERNAL_ROAD|内部道路|
|ACCESS_ROAD|接入道路|

---

## 6. road_status

| road_status | 含义   |
| ----------- | ---- |
| Planned     | 规划中  |
| Active      | 可使用  |
| Restricted  | 限制使用 |
| Closed      | 关闭   |

---

## 7. 示例数据

```json
{
  "road_id": "RD-001",
  "map_id": "M-001",
  "road_name": "中央主干路",
  "road_type": "MAIN_ROAD",
  "road_status": "Active",
  "road_segment_ids": ["RS-001", "RS-002", "RS-003"]
}
```

---

## 8. 与其他对象关系

|对象|关系|
|---|---|
|Map|Road 属于 Map|
|RoadSegment|Road 由多个 RoadSegment 组成|
|RoadNode|RoadSegment 通过 RoadNode 连接|

---

## 9. 核心原则

```text
Road = 完整道路
RoadSegment = 可通行片段
```

- Road 用于道路语义组织；

- RoadSegment 用于实际路径计算与调度。