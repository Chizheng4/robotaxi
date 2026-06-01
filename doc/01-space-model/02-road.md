# Road：道路

## 1. 定义

Road（道路）表示 Map 中的一条完整道路，用于表达道路名称和道路语义。

```text
中山大道
天河路
机场高速
大学城外环路
```

Road 由多个 RoadSegment 组成，不作为路径计算和调度的基础单元。

---

## 2. 结构

```text
Road
└── RoadSegment
```

一个 Road 可以包含多个 RoadSegment。

---

## 3. 核心属性

|属性英文名|中文名|含义|
|---|---|---|
|road_id|道路编号|道路唯一编号|
|map_id|地图编号|所属 Map|
|road_name|道路名称|道路名称|
|road_type|道路类型|道路等级或道路场景类型|
|road_status|道路状态|道路整体状态|
|road_segment_ids|道路片段列表|包含的 RoadSegment 列表|

---

## 4. road_type

|road_type|中文名|含义|
|---|---|---|
|MAIN_ROAD|主干路|区域内主要通行道路|
|SECONDARY_ROAD|次干路|连接主干路和局部空间的次级道路|
|INTERNAL_ROAD|内部道路|园区、小区、商场等内部道路|
|ACCESS_ROAD|接入道路|连接地点、服务区或支路的接入道路|

---

## 5. road_status

|road_status|中文名|含义|
|---|---|---|
|Planned|规划中|尚未投入使用|
|Active|可使用|可参与运营模拟|
|Restricted|限制使用|部分场景或时段受限|
|Closed|关闭|不可使用|

---

## 6. 示例数据

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

## 7. 关联关系

|对象|关系|
|---|---|
|Map|Road 属于 Map|
|RoadSegment|Road 由多个 RoadSegment 组成|
|RoadNode|RoadSegment 通过 RoadNode 连接|

---

## 8. 核心原则

```text
Road = 完整道路
RoadSegment = 可计算道路片段
```

Road 负责道路语义组织，RoadSegment 负责实际通行与计算。
