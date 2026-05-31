# ServiceArea：服务区域

## 1. 定义

ServiceArea（服务区域）是 RoadSegment 上的人车服务接口空间。
它表示车辆可以停靠并完成用户服务动作的区域，同时满足客户侧需求：

- 上车（Pickup）

- 下车（Dropoff）

- 等候（Waiting）


ServiceArea 不是 Cell 类型，也不表示 Place 或充电设施。

ServiceArea 只能覆盖适合车辆安全停靠和服务动作的 ROAD Cell。RoadNode 所在 Cell，特别是连接多个 RoadSegment 的路口或道路连接点，不得作为 ServiceArea。

---

## 2. 结构

```text
RoadSegment
└── ServiceArea
```

- 每个 ServiceArea 依附于一个或多个 RoadSegment。

- ServiceArea 定义车辆可执行服务的位置。

- 一个 RoadSegment 可以包含多个 ServiceArea。


---

## 3. 核心属性

|属性英文名|中文名|含义|
|---|---|---|
|service_area_id|服务区域编号|服务区域唯一编号|
|map_id|地图编号|所属 Map|
|name|服务区域名称|服务区域名称|
|segment_ids|关联道路片段列表|关联 RoadSegment 列表|
|covered_cell_ids|覆盖道路网格|覆盖的 ROAD Cell 列表|
|customer_capabilities|客户侧服务能力|客户可执行操作（上车、下车、等候）|
|vehicle_capabilities|车辆侧停靠能力|车辆可执行操作（服务停靠、短等待、待命、长期停放）|
|max_vehicle_capacity|最大车辆容量|最大可停车辆数|
|status|服务区域状态|状态|

---

## 4. customer_capabilities

|属性英文名|中文名|含义|
|---|---|---|
|can_pickup|允许上车|是否允许用户上车|
|can_dropoff|允许下车|是否允许用户下车|
|can_wait|允许用户等待|是否允许用户在此等待服务|

> 上车/下车能力必须以 `vehicle_capabilities.can_stop_for_service` 为前提。

---

## 5. vehicle_capabilities

|属性英文名|中文名|含义|
|---|---|---|
|can_stop_for_service|允许服务停靠|是否允许车辆为上车/下车进行停靠|
|can_short_wait|允许短时等待|是否允许车辆短时间停靠等待|
|can_stage|允许待命排队|是否允许车辆调度驻留/排队|
|can_long_park|允许长时间停放|是否允许车辆长时间停放|

---

## 6. status

|status|中文名|含义|
|---|---|---|
|Planned|规划中|尚未投入使用|
|Active|可使用|可参与服务动作|
|Restricted|受限|服务能力受限|
|Closed|关闭|不可使用|

---

## 7. 示例数据

```json
{
  "service_area_id": "SA-001",
  "map_id": "M-001",
  "name": "商场北门接驾区",
  "segment_ids": ["RS-001"],
  "covered_cell_ids": ["C-12-11","C-12-12"],
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
  "max_vehicle_capacity": 5,
  "status": "Active"
}
```

---

## 8. 关联关系

|对象|关系|
|---|---|
|Map|ServiceArea 属于 Map|
|RoadSegment|ServiceArea 依附于 RoadSegment|
|Cell|ServiceArea 覆盖 ROAD Cell|
|Zone|Zone 可以包含 ServiceArea|
|Route|Route 可以经过 ServiceArea 进行调度与路径规划|

---

## 9. 规则

1. ServiceArea 必须依附于一个或多个 RoadSegment；

2. ServiceArea 不属于 Cell 基础类型；

3. ServiceArea 表达的是“可服务能力覆盖”，不是普通道路通行能力；

4. 上车/下车必须以 `vehicle_capabilities.can_stop_for_service` 为前提；

5. 短时停靠、待命、长期停放能力分层表达；

6. ServiceArea 不表达充电或其他设施功能；

7. Route 的起终点是 ROAD Cell；当路径用于服务动作时，相关起终点 Cell 应被 ServiceArea 覆盖；

8. 客户行为和车辆停靠能力必须同时满足，才算可执行服务区域。

9. ServiceArea 不得覆盖 RoadNode 所在 Cell；

10. 当某个 RoadNode 同时连接两个及以上 RoadSegment 时，该 RoadNode 所在 Cell 应视为路口或道路连接点，不得用于上车、下车、等待、短停或待命；

11. ServiceArea 应覆盖 RoadSegment 上非 RoadNode 的 ROAD Cell，以表达“可通行道路上的可服务位置”。


---

## 10. 核心原则

```text
ServiceArea = 人车交互服务接口空间
RoadSegment = 可通行道路基础
Cell(ROAD) = 道路空间底座
```

ServiceArea 同时约束需求侧用户操作和供给侧 Robotaxi 停靠能力，是最小服务执行单元。
