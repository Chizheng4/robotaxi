# OpsCenter：运营中心（供给侧设施）

## 1. 定义

OpsCenter 是 Robotaxi 进入运营闭环的供给设施。它负责接收、停放、运维检查、清洁、充电、维修和投放车辆，使 Robotaxi 从资产状态转化为可运营服务产能。

> OpsCenter 不同于 Place，不直接产生出行需求，也不是普通区域，它是供给侧设施对象。

---

## 2. 核心作用

```text
Robotaxi 到达 OpsCenter
↓
车辆停放
↓
运维检查 / 清洁 / 充电 / 维修
↓
形成可运营车辆
↓
投放到 Zone / ServiceArea
```

OpsCenter 解决的问题：

> Robotaxi 从哪里进入运营闭环？

---

## 3. 核心属性

|属性|含义|
|---|---|
|ops_center_id|运营中心唯一编号|
|ops_center_name|运营中心名称|
|map_id|所属 Map|
|cell_ids|覆盖的 Cell 列表|
|service_area_ids|关联的 ServiceArea 列表|
|capacity|可容纳 Robotaxi 数量|
|ops_center_status|当前状态|

---

## 4. ops_center_status

|状态|含义|
|---|---|
|Planned|规划中|
|Active|可使用|
|Restricted|受限使用|
|Closed|关闭|

---

## 5. 支持能力

OpsCenter 定义设施能力：

|能力|含义|
|---|---|
|can_receive_robotaxi|可接收 Robotaxi|
|can_park_robotaxi|可停放 Robotaxi|
|can_inspect_robotaxi|可执行运维检查|
|can_clean_robotaxi|可执行清洁任务|
|can_charge_robotaxi|可充电|
|can_repair_robotaxi|可维修|
|can_release_robotaxi|可投放车辆进入运营|

> 具体操作任务由 Task 对象承接。

---

## 6. 示例数据

```json
{
  "ops_center_id": "OC-001",
  "ops_center_name": "最小运营测试中心",
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

---

## 7. 关联关系

|对象|关系|
|---|---|
|Map|OpsCenter 属于某个 Map|
|Cell|OpsCenter 覆盖一组 Cell|
|ServiceArea|OpsCenter 可关联车辆出入和待命 ServiceArea|
|Robotaxi|Robotaxi 可从 OpsCenter 进入运营闭环|
|Task|OpsCenter 可触发或承接车辆检查、清洁、充电、维修、投放任务|

---

## 8. 规则

1. OpsCenter 必须属于一个 Map；
    
2. OpsCenter 必须覆盖一个或多个 Cell；
    
3. OpsCenter 可关联一个或多个 ServiceArea；
    
4. OpsCenter 覆盖的 Cell 不得与 Place 覆盖的 Cell 重叠；
    
5. OpsCenter 关联的 ServiceArea 应位于运营中心附近道路，用于车辆出入和待命；
    
6. Robotaxi 初始进入运营系统时，应先位于 OpsCenter；
    
7. Robotaxi 经过运维检查 / 清洁 / 充电 / 维修后，才能进入可运营状态；
    
8. OpsCenter 不直接产生用户出行需求；
    
9. OpsCenter 不直接代表运营区域；
    
10. 车辆投放到 Zone / ServiceArea 应由后续 Task 执行。
    

---

## 9. 核心原则

```text
OpsCenter = Robotaxi 供给侧运营设施
```

OpsCenter 的核心价值是把 Robotaxi 车辆资产转化为可进入运营系统的服务产能，并定义设施能力，具体操作由 Task 承接。
