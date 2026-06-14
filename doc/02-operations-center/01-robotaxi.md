# Robotaxi：自动驾驶服务车辆

## 1. 定义

Robotaxi 是具备 L4 / L5 自动驾驶能力的 AI 汽车资产。

在运营系统中，Robotaxi 是供给侧车辆资源。
它只有在满足运营条件时，才形成可被调度的出行服务产能。

Robotaxi 不等同于传统人工驾驶车辆。

---

## 2. 建模结构

```text
Robotaxi
├── 车辆本体
├── 车辆能力
├── 能源信息
├── 运营可用状态
├── 物理运动状态
├── 当前空间位置
└── 当前任务引用
```

Robotaxi 只表达车辆自身属性和当前状态。
车辆正在执行什么业务动作，由后续 Task 对象表达。

---

## 3. 车辆本体属性

|属性|含义|
|---|---|
|robotaxi_id|Robotaxi 唯一编号|
|fleet_id|所属车队编号|
|model_name|车型名称|
|automation_level|自动驾驶等级|

### automation_level

|值|含义|
|---|---|
|L4|限定区域内可无人驾驶|
|L5|完全自动驾驶|

第一阶段默认：

```text
automation_level = L4
```

---

## 4. 车辆能力属性

车辆能力表示 Robotaxi 相对稳定的服务能力。

|属性|含义|
|---|---|
|seat_capacity|可载客座位数|
|battery_capacity_kwh|电池容量|
|max_range_km|满电最大续航|
|service_type|支持的服务类型|

### service_type

|值|含义|
|---|---|
|PASSENGER_RIDE|载客出行服务|

第一阶段只支持：

```text
service_type = PASSENGER_RIDE
```

---

## 5. 能源信息

能源信息用于判断 Robotaxi 是否具备执行 Route 的能力。

|属性|含义|
|---|---|
|battery_percent|当前电量百分比|
|estimated_range_km|当前预计可行驶里程|

规则：

1. `battery_percent` 表示电池剩余比例；

2. `estimated_range_km` 表示当前可用于调度判断的预计续航；

3. 后续任务分配时，应判断 `estimated_range_km` 是否覆盖任务所需里程。


---

## 6. 运营可用状态

运营可用状态表示 Robotaxi 是否具备参与运营闭环的资格。

|availability_status|含义|
|---|---|
|PENDING_INSPECTION|待运维检查|
|IN_INSPECTION|运维检查中|
|AVAILABLE|可参与运营|
|UNAVAILABLE|不可参与运营|

说明：

- `availability_status` 只表达车辆是否具备运营资格；

- 它不表达车辆正在执行什么任务；

- 任务执行过程由后续 Task 对象表达。


---

## 7. 物理运动状态

物理运动状态表示 Robotaxi 当前的物理运动形态。

|motion_status|含义|
|---|---|
|PARKED|停车中|
|STOPPED|临停中|
|MOVING|行驶中|

说明：

- `motion_status` 只表达车辆物理形态；

- 它不表达车辆是否在接驾、载客、运维或调度；

- 业务动作由当前任务表达。


---

## 8. 当前空间位置

|属性|含义|
|---|---|
|current_cell_id|当前所在 Cell|
|current_route_id|当前执行 Route，可为空|

说明：

- Robotaxi 的当前位置以 `current_cell_id` 为准；

- 所属 Map 可通过 Cell 关联获得，不在 Robotaxi 中重复存储；

- `current_route_id` 仅在 Robotaxi 执行移动时存在。

### 8.1 结构化位置表达

Robotaxi 的运营位置展示统一使用空间模型中的 CellContext 推导，不在 Robotaxi 对象中重复存储道路、地点或服务区字段。

```text
Robotaxi.current_cell_id
→ CellContext
→ Map / Zone / Road / RoadSegment / RoadNode / ServiceArea / Place / OpsCenter
```

前端展示 Robotaxi 位置时，应基于 `current_cell_id` 推导：

|展示项|来源|
|---|---|
|当前位置网格|current_cell_id|
|所在地点|CellContext.related_places|
|所在服务区|CellContext.related_service_areas|
|所在道路片段|CellContext.related_road_segments|
|所在道路|CellContext.related_roads|
|所在运营中心|CellContext.related_ops_centers|
|所在 Zone|CellContext.related_zones|

说明：

- Robotaxi 原则上位于某个 Place、ServiceArea、RoadSegment / Road，或正在执行某条 Route；

- 位置归属由空间对象关系推导，不新增 `current_place_id`、`current_service_area_id`、`current_road_segment_id` 等冗余字段；

- 后续 Vehicle、Task、Trip 等对象只要引用 Cell，也应复用同一套 CellContext 位置解释能力。


---

## 9. 当前任务引用

|属性|含义|
|---|---|
|current_task_id|当前任务 ID，可为空|

说明：

- Robotaxi 当前正在做什么，由 `current_task_id` 指向的 Task 表达；

- Robotaxi 不直接表达“接驾中、载客中、去运营区、运维中”等业务动作；

- 没有任务时，`current_task_id = null`。

### 9.1 当前任务展示

Robotaxi 前端可以展示当前任务类型和当前任务状态，但这些字段应由 `current_task_id` 关联的 Task 推导，不作为 Robotaxi 本体冗余字段存储。

```text
Robotaxi.current_task_id
→ Task
→ task_type / task_status
```

说明：

- `current_task_type`、`current_task_status` 是展示推导字段；

- Robotaxi 本体只保留当前任务引用；

- 当 Task 状态变化时，Robotaxi 视图应同步展示最新任务状态。


---

## 10. 可调度判断

Robotaxi 是否可被调度，不使用单独字段表示，由状态组合推导。

基础可调度条件：

```text
availability_status = AVAILABLE
AND current_cell_id 存在
AND estimated_range_km >= 任务所需里程
```

任务层还需要进一步判断：

```text
current_task_id 是否为空
或
当前任务是否允许被更高优先级任务中止
```

说明：

- Robotaxi 本体只提供可调度基础条件；

- 任务抢占、任务取消、任务切换由后续 Task / DispatchCenter 定义。


---

## 11. 示例数据

```json
{
  "robotaxi_id": "RTX-001",
  "fleet_id": "FLEET-001",
  "model_name": "L4 Robotaxi Standard",
  "automation_level": "L4",
  "seat_capacity": 4,
  "battery_capacity_kwh": 75,
  "max_range_km": 400,
  "service_type": "PASSENGER_RIDE",
  "battery_percent": 82,
  "estimated_range_km": 320,
  "availability_status": "AVAILABLE",
  "motion_status": "PARKED",
  "current_cell_id": "C-34-32",
  "current_route_id": null,
  "current_task_id": null
}
```

---

## 12. 关联关系

|对象|关系|
|---|---|
|Cell|Robotaxi 当前位于某个 Cell|
|Route|Robotaxi 移动时执行某条 Route|
|Task|Robotaxi 当前可关联一个任务|

说明：

Robotaxi 不直接关联 Map、Place、Road、RoadSegment、ServiceArea 或 Zone。
这些关系通过 Cell、Route 和 Task 间接获得。

---

## 13. 规则

1. Robotaxi 必须有 `current_cell_id`；

2. 所属 Map 通过 Cell 关联获得；

3. `availability_status` 只表达车辆运营资格；

4. `motion_status` 只表达车辆物理运动形态；

5. `current_task_id` 表达车辆当前业务动作来源；

6. `current_route_id` 仅表达当前移动路径；

7. Robotaxi 不直接生成需求、订单或调度任务；

8. Robotaxi 不直接表达接驾、载客、运维、部署等任务阶段；

9. 任务状态和任务优先级由后续 Task 对象定义；

10. 可调度能力由车辆状态、位置、续航和任务规则共同判断。


---

## 14. 核心原则

```text
Robotaxi = 自动驾驶 AI 汽车资产

车辆能力 = 它理论上能做什么

运营可用状态 = 它是否具备进入运营闭环的资格

物理运动状态 = 它当前是停着还是动着

当前任务 = 它现在正在做什么业务动作
```

Robotaxi 本体不承载完整业务流程。
业务动作、任务阶段、任务切换和任务优先级由后续 Task 体系表达。

---

## 15. v020 修订：服务订单与运营任务互斥

Robotaxi 不能同时执行服务订单和运营相关任务单。

服务订单是最高优先级占用。当 Robotaxi 已绑定 ServiceOrder 时：

```text
current_order_id != null
```

则不允许再分配运营投放、准入、运维等供给侧任务：

```text
current_task_id 必须为空
```

Robotaxi 可保留两组运行态字段，便于后续扩展：

|字段|中文名|说明|
|---|---|---|
|current_order_id|当前服务订单|表达客户服务订单占用|
|current_order_status|当前服务订单状态|由 ServiceOrder 推导展示|
|current_task_id|当前运营任务|表达运营供给侧任务占用|
|current_task_type|当前运营任务类型|由 Task 推导展示|
|current_task_status|当前运营任务状态|由 Task 推导展示|

前端展示时，如果存在 `current_order_id`，应优先展示服务订单占用；只有没有服务订单时，才展示运营任务占用。

校验规则必须检查：

```text
NOT (current_order_id != null AND current_task_id != null)
```
