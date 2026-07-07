# ServiceArea：服务区域

## 1. 定义

ServiceArea 是道路网络中允许 Robotaxi 提供服务、临停、停车或待命的空间区域。

```text
ServiceArea = Robotaxi 可服务、可停靠、可待命的道路服务区域
```

ServiceArea 不等于 Place。
ServiceArea 不等于 RoadSegment。
ServiceArea 不负责路径规划和道路通行顺序。

---

## 2. 核心定位

```text
Place = 需求来源或空间设施
RoadSegment = 可通行道路片段
ServiceArea = 可执行服务和停靠行为的道路服务区域
Route = 到达 ServiceArea 中某个目标 Cell 的路径方案
RouteExecution = Robotaxi 实际行驶记录
```

ServiceArea 的核心价值是：

```text
为 Robotaxi 提供可上车、可下车、可临停、可停车、可待命的目标候选 Cell
```

---

## 3. 核心关系

```text
1 个 ServiceArea 属于 1 个 Map
1 个 ServiceArea 可关联 1 个或多个 RoadSegment
1 个 ServiceArea 覆盖多个 Cell
1 个 Place 可关联 1 个或多个 ServiceArea
1 个 Zone 可包含多个 ServiceArea
Route 的 target_cell_id 可以来自 ServiceArea 的候选 Cell
```

说明：

```text
ServiceArea 提供目标候选点；
RoadSegment 提供通行结构；
RoutePlanning 负责生成到目标点的 Route。
```

---

## 4. 核心属性

|属性|含义|
|---|---|
|service_area_id|服务区域唯一编号|
|map_id|所属 Map|
|service_area_name|服务区域名称|
|service_area_type|服务区域类型|
|service_area_status|当前状态|
|cell_ids|覆盖的 Cell 列表|
|road_segment_ids|关联 RoadSegment 列表|
|place_ids|关联 Place 列表，可为空|
|zone_id|所属 Zone，可为空|
|pickup_cell_ids|可上车 Cell 列表|
|dropoff_cell_ids|可下车 Cell 列表|
|temp_stop_cell_ids|可临停 Cell 列表|
|parking_cell_ids|可停车 Cell 列表|
|standby_cell_ids|可待命 Cell 列表|
|occupied_cell_ids|当前已占用 Cell 列表|
|unavailable_cell_ids|当前不可用 Cell 列表|
|capacity|可容纳 Robotaxi 数量|
|current_robotaxi_count|当前 Robotaxi 数量|

---

## 5. service_area_type

|service_area_type|含义|
|---|---|
|PICKUP_DROPOFF|上下车服务区|
|TEMP_STOP|临停服务区|
|PARKING|停车服务区|
|STANDBY|待命服务区|
|MIXED|混合服务区|
|OPS_CENTER_AREA|运营中心关联服务区|

说明：

```text
同一个 ServiceArea 可以支持多种服务能力。
service_area_type 用于表达主要用途。
具体能力以 Cell 能力列表为准。
```

---

## 6. service_area_status

|service_area_status|含义|
|---|---|
|ACTIVE|可使用|
|RESTRICTED|受限使用|
|FULL|已满|
|BLOCKED|阻塞|
|CLOSED|关闭|
|PLANNED|规划中|

规则：

```text
只有 ACTIVE / RESTRICTED 的 ServiceArea 可以作为 RoutePlanning 目标候选。
FULL / BLOCKED / CLOSED 不应作为新的投放目标。
```

---

## 7. Cell 能力分类

ServiceArea 内的 Cell 应按能力分类。

```text
pickup_cell_ids = 可上车点
dropoff_cell_ids = 可下车点
temp_stop_cell_ids = 可临停点
parking_cell_ids = 可停车点
standby_cell_ids = 可待命点
```

说明：

```text
一个 Cell 可以具备多种能力。
例如：某 Cell 可临停，也可待命。
```

---

## 8. 可用目标 Cell 判断

RoutePlanning 或 Task 到达处理时，需要判断 ServiceArea 内是否存在可用目标 Cell。

可用目标 Cell 必须满足：

```text
Cell 属于当前 ServiceArea
AND
Cell 不在 occupied_cell_ids
AND
Cell 不在 unavailable_cell_ids
AND
Cell 满足任务要求的 arrival_behavior
AND
Cell 所在 RoadSegment 可通行
```

不同 arrival_behavior 对应候选范围：

|arrival_behavior|候选 Cell|
|---|---|
|TEMP_STOP_AND_STANDBY|temp_stop_cell_ids / standby_cell_ids|
|PARK_AND_STANDBY|parking_cell_ids / standby_cell_ids|
|STOP_ONLY|temp_stop_cell_ids|
|PARK_ONLY|parking_cell_ids|
|AUTO_BY_SERVICE_AREA|根据 ServiceArea 能力自动选择|

---

## 9. 同 ServiceArea 替代点规则

当 Robotaxi 到达计划目标 Cell 后，发现目标不可用时，应优先在同一 ServiceArea 内寻找替代点。

触发场景：

```text
planned_target_cell_id 被占用
planned_target_cell_id 被阻塞
planned_target_cell_id 不满足临停要求
planned_target_cell_id 不满足停车要求
```

处理流程：

```text
Robotaxi 到达计划目标 Cell
↓
反馈异常到达结果
↓
Task 读取 blocked_handling_policy
↓
若允许 SAME_SERVICE_AREA_RETRY
↓
在当前 ServiceArea 内查找可用目标 Cell
↓
RoutePlanning 生成到替代 Cell 的新 Route
↓
RouteExecution 继续执行
```

如果同一 ServiceArea 内没有可用 Cell：

```text
arrival_execution_result = TARGET_SERVICE_AREA_UNAVAILABLE
Task.task_status = FAILED
反馈运营决策系统
```

---

## 10. 与 RoadSegment 的关系

ServiceArea 可关联一个或多个 RoadSegment。

```text
RoadSegment 提供通行顺序
ServiceArea 提供停靠能力
```

规则：

1. ServiceArea 覆盖的 Cell 应属于可通行 RoadSegment 或与可通行 RoadSegment 相邻；

2. ServiceArea 不负责定义 Cell 通行顺序；

3. RoutePlanning 到达 ServiceArea 时，应基于 RoadSegment.cell_sequence 生成 Route；

4. ServiceArea 的候选 Cell 必须能被 RoutePlanning 到达。


---

## 11. 与 Place 的关系

Place 是需求来源或空间设施。
ServiceArea 是 Robotaxi 可执行服务的位置区域。

```text
Place 产生需求
ServiceArea 承接上下车、临停、停车、待命
```

示例：

```text
商场 Place
↓
关联附近 ServiceArea
↓
Robotaxi 在 ServiceArea 上车 / 下车 / 待命
```

说明：

```text
Place 本身不一定允许 Robotaxi 停靠。
Robotaxi 实际服务动作发生在 ServiceArea。
```

---

## 12. 与 Zone 的关系

Zone 是运营管理区域。
ServiceArea 是 Zone 内可服务和可停靠的空间单元。

```text
Zone = 运营管理视角
ServiceArea = 车辆实际服务和驻留视角
```

Zone 可用于需求预测、供给计划和经营指标统计。
ServiceArea 用于具体投放目标、上下车点和待命点。

---

## 13. 与 RoutePlanning 的关系

RoutePlanning 可以从 ServiceArea 中选择目标 Cell。

输入：

```text
目标 ServiceArea
arrival_behavior
当前 occupied_cell_ids
当前 unavailable_cell_ids
RoadSegment 可通行状态
路径规划策略 route_strategy_id
```

输出：

```text
target_cell_id
Route
```

说明：

```text
ServiceArea 提供候选目标；
RoutePlanning 选择目标并生成 Route；
RouteExecution 按 Route 执行。
```

---

## 14. 与 DeploymentTask 的关系

DeploymentTask 的 planned_target_service_area_id 指向目标 ServiceArea。

DeploymentTask 创建时：

```text
确定计划目标 ServiceArea
确定计划目标 Cell
确定 arrival_behavior
确定 blocked_handling_policy
```

DeploymentTask 到达后：

```text
Robotaxi 判断 planned_target_cell_id 是否可用
若不可用，在同 ServiceArea 内查找替代点
若仍不可用，DeploymentTask FAILED
```

---

## 15. 示例数据

```json
{
  "service_area_id": "SA-006",
  "map_id": "M-001",
  "service_area_name": "运营中心北侧服务区",
  "service_area_type": "MIXED",
  "service_area_status": "ACTIVE",
  "cell_ids": ["C-35-28", "C-35-29", "C-35-30"],
  "road_segment_ids": ["RS-008"],
  "place_ids": ["P-001"],
  "zone_id": "Z-001",
  "pickup_cell_ids": ["C-35-28"],
  "dropoff_cell_ids": ["C-35-28"],
  "temp_stop_cell_ids": ["C-35-29"],
  "parking_cell_ids": ["C-35-30"],
  "standby_cell_ids": ["C-35-29", "C-35-30"],
  "occupied_cell_ids": [],
  "unavailable_cell_ids": [],
  "capacity": 2,
  "current_robotaxi_count": 0
}
```

---

## 16. 核心规则

1. ServiceArea 是 Robotaxi 实际服务和驻留区域；

2. ServiceArea 不负责道路通行顺序；

3. ServiceArea 不负责路径规划；

4. ServiceArea 必须覆盖一个或多个 Cell；

5. ServiceArea 应关联可通行 RoadSegment；

6. ServiceArea 应明确可上车、下车、临停、停车、待命的 Cell；

7. ServiceArea 不得覆盖 RoadNode 所在 Cell；

8. ServiceArea 不得覆盖连接两个及以上 RoadSegment 的路口 Cell；

9. 即使某个 Cell 是 ROAD，只要它同时是 RoadNode 所在 Cell，也不能作为上车、下车、临停、停车或待命点；

10. 目标 Cell 被占用时，可在同 ServiceArea 内寻找替代点；

11. 同 ServiceArea 无可用点位时，应反馈 Task 和运营决策系统；

12. RoutePlanning 负责从 ServiceArea 候选点中选择目标并生成 Route；

13. RouteExecution 负责按 Route 实际行驶。


---

## 17. 核心原则

```text
ServiceArea = Robotaxi 可服务、可停靠、可待命的道路服务区域
```

```text
Place 表达需求来源；
ServiceArea 表达服务承接位置；
RoadSegment 表达通行结构；
Route 表达到达路径；
RouteExecution 表达实际行驶。
```

```text
ServiceArea 提供目标候选点，不提供道路行驶顺序。
```
