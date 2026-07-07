# 00-task-system-overview.md：任务系统总览（清理版）

## 1. 目的

概述 Task 系统在 Robotaxi 最小运营闭环中的角色、任务来源与闭环流程，为业务对象和任务执行提供系统导航。
仅描述任务体系结构和闭环逻辑，不展开具体任务单设计。

---

## 2. Task 系统模块

```text
1. Task 来源
    - 客户服务订单 ServiceOrder
    - 预测供给计划 SupplyAdjustmentPlan
    - 运维需求 OpsRequirement（车辆清洁、充电、维修触发）
2. Task 分配与匹配
    - Dispatch 系统决策
    - 区域 / ServiceArea / Route 匹配
    - 运维资源 Worker 匹配
3. Task 执行
    - Robotaxi 行驶 / 投放 / 再平衡
    - Worker 执行运维任务
4. Task 状态管理
    - 生成 → 分配 → 执行 → 完成 / 异常
5. Task 结果反馈
    - 更新 Robotaxi 状态
    - 更新 ServiceOrder / SupplyAdjustmentPlan / OpsRequirement
    - 更新 Metrics / KPI
```

---

## 3. Task 来源与触发逻辑

|来源|描述|执行对象|
|---|---|---|
|ServiceOrder|客户实时服务请求|Robotaxi / Route|
|SupplyAdjustmentPlan|预测需求生成投放 / 再平衡 / 停车任务|Robotaxi|
|OpsRequirement|车辆运营状态触发的运维任务|Worker / Robotaxi|

说明：

- Robotaxi 状态变化仅作为运维任务触发条件

- 运维任务由系统规则或运营决策生成 Task

- 每个 Task 有明确来源与责任对象

- Dispatch 系统负责分配，Task 系统负责执行


---

## 4. 核心原则

1. **任务闭环**

    - 所有 Task 必须从生成 → 分配 → 执行 → 状态更新 → 完成

2. **职责分离**

    - Dispatch 系统负责匹配决策

    - Task 系统负责执行

3. **资源驱动**

    - Robotaxi 和 Worker 是执行资源

    - Task 驱动车辆与员工行为

4. **来源明确**

    - 客户订单 → 服务任务

    - 预测计划 → 投放 / 再平衡 / 待命

    - 运维需求 → 清洁 / 充电 / 维修

5. **触发与任务分离**

    - Robotaxi 状态事件仅触发运维需求

    - 任务生成由系统决策形成

    - 不直接将车辆状态事件定义为 Task 来源

6. **字段与状态延后**

    - 具体字段、状态机、操作步骤在对应 Task 文件中定义

    - 本文档只描述体系结构和闭环关系


---

## 5. Task 类型概览

|task_type|说明|来源|
|---|---|---|
|READINESS_CHECK|运营准入检查|OPS_CENTER|
|DEPLOYMENT|投放 / 再平衡 / 停车待命|SUPPLY_ADJUSTMENT_PLAN|
|SERVICE|服务执行任务|SERVICE_ORDER|
|CHARGING|车辆充电|OPS_REQUIREMENT|
|CLEANING|车辆清洁|OPS_REQUIREMENT|
|MAINTENANCE|维修任务|OPS_REQUIREMENT|

---

## 6. 任务与资源关系

- Robotaxi 当前行为由 `current_task_id` 对应 Task 表达

- Worker 当前行为由 `current_task_id` 对应 Task 表达

- Route 为移动 Task 提供路径

- Task 可以关联单个 Robotaxi 或 Worker 执行


---

## 7. Task 生命周期示例

本文档中的生命周期只表达 Task 系统的通用抽象。

具体 Task 可以根据业务动作定义自己的专属状态机。

例如：

```text
ReadinessCheckTask 使用 WAITING_ASSIGNMENT / WAITING_CHECK / CHECKING 等状态，
以 01-readiness-check-task.md 的具体定义为准。
```

|状态|含义|
|---|---|
|CREATED|已创建|
|ASSIGNED|已分配执行资源|
|IN_PROGRESS|执行中|
|COMPLETED|已完成|
|CANCELLED|已取消|
|FAILED|执行失败|

---

## 8. 优先级与中止规则

- task_priority：LOW / NORMAL / HIGH / URGENT

- 高优先级任务可中止低优先级且可中止的任务

- 中止任务进入 CANCELLED，并记录原因


---

## 9. 系统闭环示例

```text
客户订单闭环：
    ServiceOrder
    → Dispatch
    → 分配 Robotaxi
    → 生成 Service Task
    → Robotaxi 执行 Route
    → Trip 完成
    → Order / Metric 更新

预测供给闭环：
    DemandForecast
    → SupplyAdjustmentPlan
    → Dispatch
    → Robotaxi 投放 / 再平衡 / 停车任务
    → Task 执行
    → 区域供给分布更新

车辆运维闭环：
    Robotaxi 状态变化（低电量 / 故障 / 脏污）
    → OpsRequirement 生成
    → Dispatch / OpsCenter
    → Worker 执行充电 / 清洁 / 维修任务
    → Robotaxi 状态更新
```

---

## 10. 核心结论

```text
Task System = 将需求、预测计划、运维需求转化为可执行运营单据
```

- 明确任务来源与资源

- 支撑 Robotaxi / Worker 闭环执行

- 保持调度与执行分离

- 为后续具体 Task 文件提供框架和导航
