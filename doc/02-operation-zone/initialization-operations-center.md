# initialization-operations-center：运营中心初始化

## 1. 目的

本文档定义第一版运营中心初始化要求。

Codex 应基于以下文档理解对象定义：

```text
05-fleet-asset-management/01-robotaxi.md
02-operation-zone/01-operation-center.md
02-operation-zone/01-operation-center-update-v005.md
07-operation-organization/01-worker-update-v005.md
doc/rules/field-dictionary.md
01-space-model/initialization-map.md
```

本文档只描述 OpsCenter、Robotaxi 与 Worker 的初始化数据、生成规则和校验规则。

---

## 2. 初始化目标

第一版初始化一个统一运营中心，并生成 20 台 Robotaxi 和 10 个 Worker。

|项目|设定|
|---|---|
|OpsCenter 数量|1 个|
|Robotaxi 数量|20 台|
|Worker 数量|10 个|
|初始位置|OpsCenter 覆盖 Cell 内|
|初始运营可用状态|PENDING_INSPECTION|
|初始运动状态|PARKED|
|初始任务|无|
|初始路径|无|

---

## 3. OpsCenter 初始化

```json
{
  "ops_center_id": "OC-001",
  "ops_center_name": "最小运营测试中心",
  "place_id": "P-006",
  "map_id": "M-001",
  "cell_ids": ["C-34-32", "C-34-33", "C-35-32", "C-35-33"],
  "service_area_ids": ["SA-006"],
  "capacity": 20,
  "ops_center_status": "Active",
  "can_receive_robotaxi": true,
  "can_park_robotaxi": true,
  "can_inspect_robotaxi": true,
  "can_clean_robotaxi": true,
  "can_charge_robotaxi": true,
  "can_repair_robotaxi": true,
  "can_release_robotaxi": true
}
```

空间位置说明：

- `OC-001` 位于 Map 右下角，与 `P-006` 运营中心地点使用相同 Cell；

- `P-006.place_type = OPS_CENTER`；

- `P-006` 可以产生员工通勤、访客等人员出行需求；

- `SA-006` 位于运营中心附近的接入道路 `RD-005 / RS-014` 上；

- `SA-006` 是车辆出入和待命接口，不承担 20 台 Robotaxi 的全部停放容量；

- 20 台 Robotaxi 的初始停放容量由 `OC-001.capacity` 表达。

---

## 4. Robotaxi 初始化规则

生成 20 台 Robotaxi。

编号规则：

```text
RTX-001 ~ RTX-020
```

初始状态：

| 字段                   | 初始值                  |
| -------------------- | -------------------- |
| fleet_id             | FLEET-001            |
| model_name           | L4 Robotaxi Standard |
| automation_level     | L4                   |
| seat_capacity        | 4                    |
| battery_capacity_kwh | 75                   |
| max_range_km         | 400                  |
| service_type         | PASSENGER_RIDE       |
| availability_status  | PENDING_INSPECTION   |
| motion_status        | PARKED               |
| current_route_id     | null                 |
| current_task_id      | null                 |

初始位置规则：

- Robotaxi 必须位于 OpsCenter 覆盖的 Cell 内；

- 可平均分布在 `OC-001.cell_ids` 中；

- 不需要绑定 Route；

- 不需要绑定 Task。


能源初始化规则：

|字段|规则|
|---|---|
|battery_percent|80 ~ 100 之间|
|estimated_range_km|根据 battery_percent 和 max_range_km 计算|

计算方式：

```text
estimated_range_km = max_range_km × battery_percent / 100
```

---

## 5. Robotaxi 示例数据

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
  "battery_percent": 90,
  "estimated_range_km": 360,
  "availability_status": "PENDING_INSPECTION",
  "motion_status": "PARKED",
  "current_cell_id": "C-34-32",
  "current_route_id": null,
  "current_task_id": null
}
```

---

## 6. 初始化后状态含义

初始化完成后，Robotaxi 只是车辆资产，不直接等于可运营服务产能。

当前状态表示：

```text
Robotaxi 已到达 OpsCenter
↓
等待运维检查
↓
尚未进入可运营状态
```

Robotaxi 需要通过后续 Task 完成检查后，才可从：

```text
availability_status = PENDING_INSPECTION
```

转为：

```text
availability_status = AVAILABLE
```

---

## 7. 校验规则

### 7.1 OpsCenter 校验

1. OpsCenter 必须属于有效 Map；

2. OpsCenter 覆盖 Cell 必须存在；

3. OpsCenter 必须关联一个有效 Place；

4. OpsCenter 关联 Place 的 `place_type` 必须为 `OPS_CENTER`；

5. OpsCenter 的 Cell 必须与关联 Place 的 Cell 保持一致；

6. OpsCenter 容量必须大于等于初始化 Robotaxi 数量；

7. OpsCenter 至少具备接收、停放、检查、投放能力；

8. OpsCenter 关联的 ServiceArea 必须存在；

9. OpsCenter 关联的 ServiceArea 必须位于运营中心附近的接入道路。


### 7.2 Robotaxi 校验

1. Robotaxi 数量必须为 20；

2. 每台 Robotaxi 必须有唯一 robotaxi_id；

3. 每台 Robotaxi 必须位于 OpsCenter 覆盖 Cell 内；

4. 每台 Robotaxi 初始 availability_status 必须为 PENDING_INSPECTION；

5. 每台 Robotaxi 初始 motion_status 必须为 PARKED；

6. 每台 Robotaxi 初始 current_task_id 必须为空；

7. 每台 Robotaxi 初始 current_route_id 必须为空；

8. estimated_range_km 必须由 battery_percent 和 max_range_km 计算得到。


---

## 8. Codex 实现要求

Codex 基于本文档初始化运营中心数据时，应完成：

1. 生成 1 个 OpsCenter；

2. 生成 20 台 Robotaxi；

3. 将 Robotaxi 分布到 OpsCenter 覆盖 Cell；

4. 输出 OpsCenter 初始化数据；

5. 输出 Robotaxi 初始化数据；

6. 生成 10 个 Worker；
    
7. 输出 Worker 初始化数据；
    
8. 输出初始化校验结果；
    
9. 不生成 Task、Demand、Order、Dispatch、Trip、Metric。


---

## 9. Worker 初始化

第一阶段初始化 10 个 Worker，均属于 `OC-001`。

|项目|设定|
|---|---|
|Worker 数量|10 个|
|所属 OpsCenter|OC-001|
|默认角色|INSPECTION_OPERATOR|
|初始状态|IDLE|
|单车处理时间|2 个时间单位|
|单日最大处理量|5 台 Robotaxi / Worker|

编号规则：

```text
WK-001 ~ WK-010
```

示例数据：

```json
{
  "worker_id": "WK-001",
  "ops_center_id": "OC-001",
  "worker_name": "Worker-01",
  "worker_role": "INSPECTION_OPERATOR",
  "worker_status": "IDLE",
  "time_per_robotaxi": 2,
  "max_robotaxi_per_day": 5,
  "current_task_id": null
}
```

初始化校验规则：

1. Worker 数量必须为 10；

2. 每个 Worker 必须属于 `OC-001`；

3. 每个 Worker 初始 `worker_status = IDLE`；

4. 每个 Worker 初始 `current_task_id = null`；

5. `time_per_robotaxi = 2`；

6. `max_robotaxi_per_day = 5`；

7. Worker 不直接绑定 Robotaxi，后续由 Task 分配。

---

## 10. 核心原则

```text
initialization-operations-center.md 只定义运营中心、Robotaxi 与 Worker 的初始数据
不定义具体任务过程
```

OpsCenter 定义车辆进入运营闭环的供给入口。
Robotaxi 初始化后处于待检查状态，后续由 Task 推动车辆进入可运营状态。
Worker 初始化后处于空闲状态，后续由 Task 分配具体作业。
