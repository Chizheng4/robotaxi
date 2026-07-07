# 02-opscenter-update-v005：OpsCenter 定义更新说明

## 1. 目的

v005 调整 OpsCenter 与 Place 的关系。

要求：

- 保留现有 OpsCenter 设计；

- 不重写 `02-opscenter.md`；

- 仅进行最小增量修改。


---

## 2. 核心调整

原定义：

```text
OpsCenter 不同于 Place，不直接产生出行需求。
```

更新为：

```text
OpsCenter 是一种特殊 Place，同时也是供给侧运营设施。
```

即：

```text
Place 属性：地图地点
Ops 属性：运营设施
```

---

## 3. 更新定义

原定义：

```text
OpsCenter 是 Robotaxi 进入运营闭环的供给设施。
```

更新为：

```text
OpsCenter 是一种特殊 Place，也是 Robotaxi 运营闭环中的供给侧设施。
```

核心原则：

```text
OpsCenter = Place + Ops Facility
```

---

## 4. 数据模型调整

新增字段：

|属性|说明|
|---|---|
|place_id|关联 Place|
|place_type|由关联 Place 保存，固定为 OPS_CENTER|

要求：

```text
每个 OpsCenter 必须关联一个 Place。
Place.place_type = OPS_CENTER。
```

---

## 5. 规则调整

删除：

```text
OpsCenter 不得与 Place 重叠。
```

替换为：

```text
OpsCenter 必须关联一个 OPS_CENTER 类型的 Place。
```

更新：

```text
OpsCenter 的 Cell 应与关联 Place 保持一致。
```

---

## 6. 对象关系

|对象|关系|
|---|---|
|Place|OpsCenter 是特殊 Place|
|Cell|来自关联 Place|
|ServiceArea|关联附近道路上的车辆出入和待命服务区|
|Robotaxi|从 OpsCenter 投放|
|Worker|属于 OpsCenter|
|Task|由 OpsCenter 承接|

---

## 7. Codex 实现要求

1. 保留现有 OpsCenter 结构；

2. 增加 `place_id`；

3. 增加 Place 类型 `OPS_CENTER`；

4. OpsCenter 必须关联一个 Place；

5. Cell 与关联 Place 保持一致；

6. 删除“不允许与 Place 重叠”规则；

7. `place_type` 由关联 Place 统一维护，OpsCenter 不重复保存；

8. `OPS_CENTER` 类型 Place 可以产生员工通勤、访客等人员出行需求；

9. 保留现有运营能力字段；

10. 不修改 Robotaxi、Worker、Task 设计。


---

## 8. 核心原则

```text
OpsCenter = 特殊 Place + 供给侧运营设施
```
