# 00-system-overview.md：系统概览

## 1. 目的

本文档概述 Robotaxi 最小运营闭环系统的核心模块、模块关系与任务流方向，为后续业务对象、任务系统和闭环模拟提供整体导航。

---

## 2. 系统模块

```text
1. 模拟空间管理
    - Map / Cell
    - Road / RoadSegment / RoadNode
    - Place / ServiceArea
    - Zone
    - Route

2. 运营中心管理
    - OpsCenter
    - Robotaxi
    - Worker

3. 任务管理
    - 运营准入任务
    - 投放 / 再平衡 / 停车待命任务
    - 服务执行任务
    - 充电 / 清洁 / 维修任务

4. 需求与订单
    - 客户服务订单：真实即时需求
    - 需求预测：未来区域需求概率
    - 运力调整计划：基于预测形成的供给调整方案

5. 调度系统
    - 订单匹配
    - 运力调整分配
    - 车辆任务分配
    - 任务中止与切换

6. 履约与指标
    - Trip 执行记录
    - Metric / KPI 统计
```

---

## 3. 系统闭环概览

```text
供给进入闭环：
    Robotaxi 到达 OpsCenter
    → 运营准入任务
    → 可运营车辆
    → 投放任务
    → Zone / ServiceArea

客户订单闭环：
    客户查询目的地
    → 预估价格
    → 客户确认叫车
    → ServiceOrder
    → Dispatch
    → Service Task
    → Robotaxi 执行 Route
    → Trip
    → Order 完成
    → Metric 更新

预测供给闭环：
    DemandForecast
    → 供需缺口判断
    → SupplyAdjustmentPlan
    → Dispatch
    → Deployment / Rebalance / Parking Task
    → Robotaxi 执行 Route
    → 区域供给分布更新

车辆运营触发闭环：
    Robotaxi 电量不足 / 脏污 / 故障
    → 系统生成充电 / 清洁 / 维修任务
    → Dispatch / OpsCenter 分配资源
    → Task 执行
    → Robotaxi 状态更新
```

---

## 4. 任务来源

Task 的来源分为三类：

|来源|对象|触发任务|
|---|---|---|
|客户真实需求|ServiceOrder|服务执行任务|
|预测运营需求|SupplyAdjustmentPlan|投放 / 再平衡 / 停车待命任务|
|车辆运营状态触发|Robotaxi / System Rule → OpsRequirement|充电 / 清洁 / 维修任务|

说明：

```text
预测的是需求；
计划的是供给；
调度决定分配；
任务负责执行。
```

补充说明：

```text
Robotaxi 运营状态是运维需求的触发条件；
OpsRequirement 是充电、清洁、维修 Task 的直接来源。
```

---

## 5. 核心对象边界

|对象|本质|
|---|---|
|Robotaxi|自动驾驶服务产能资源|
|Worker|OpsCenter 内部作业资源|
|ServiceOrder|客户真实服务交易|
|SupplyAdjustmentPlan|基于预测的运力供给调整方案|
|Dispatch|匹配与分配决策|
|Task|下发给 Robotaxi / Worker 的执行单|
|Route|路径结果|
|Trip|实际履约记录|
|Metric|经营反馈结果|

---

## 6. 核心原则

1. **Robotaxi 不主动行动**

    Robotaxi 是执行资源，车辆行为由 Task 驱动。

2. **Order 和 Task 分离**

    ServiceOrder 管客户交易闭环。
    Task 管车辆或人员执行闭环。

3. **Dispatch 和 Task 分离**

    Dispatch 是分配决策。
    Task 是执行指令。

4. **预测需求和真实订单分离**

    DemandForecast 不等于 ServiceOrder。
    预测需求用于生成 SupplyAdjustmentPlan，真实订单用于触发服务履约。

5. **任务来源必须清晰**

    Task 可以来自 ServiceOrder、SupplyAdjustmentPlan 和 OpsRequirement。
    Robotaxi 运营状态只负责触发 OpsRequirement，不直接作为运维 Task 来源。

6. **字段与状态延后到对象文档**

    本文档只定义系统关系和闭环方向。
    具体字段、状态机、初始化规则在对应模块文档中定义。
