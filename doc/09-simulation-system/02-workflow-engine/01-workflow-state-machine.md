# Workflow State Machine：统一状态机抽象模型

## 1. 定位

本文档定义 Robotaxi 自动运营模拟系统中的**统一状态机抽象模型**。

它是所有业务单据状态机设计的通用理论基础。各业务单据的具体状态定义、流转规则、触发条件请参见各自的 Workflow 文档。

---

## 2. 统一模型结构

所有业务对象统一采用以下结构：

```text
Object（业务对象）
  ↓
State（当前状态）
  ↓
Event（触发事件）
  ↓
Transition Rule（流转规则）
  ↓
Next State（目标状态）
```

---

## 3. 核心设计原则

```text
1. Trigger 只负责触发，不负责流转
2. 状态流转必须可回放
3. 所有状态变更必须记录 SimulationEvent
```

> 说明：业务对象的状态变更由各自业务服务和现有交互流程管理。Simulation System 通过调用已有业务能力间接驱动状态变化，不强制成为唯一状态变更入口。

---

## 4. 各业务单据状态机

具体状态定义与流转规则请参见各业务单据的 Workflow 文档：

| 单据 | 文档 |
|---|---|
| ServiceOrder | `01-service-order-workflow.md` |
| Trip | `02-trip-workflow.md` |
| ReadinessTask | `03-readiness-task-workflow.md` |
| DeploymentTask | `04-deployment-task-workflow.md` |
| RouteExecution | `05-route-execution-workflow.md` |

---

## 5. 与 Simulation System 的关系

```text
WorkflowEngine（定义流转规则）
    ↓ 规则查询
SimulationLoop（每 Tick 遍历规则表）
    ↓ 匹配条件
ExecutionEngine（动作分发器）
    ↓ 调用已有业务函数
业务能力（不变）
    ↓ 修改状态
业务对象（状态更新）
```
