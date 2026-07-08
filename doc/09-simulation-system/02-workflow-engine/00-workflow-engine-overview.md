# Workflow Engine：工作流引擎总览

## 1. 定位

Workflow Engine 是自动运营模拟系统的**流程规则层**。

它不执行业务逻辑，只定义两件事：

```text
1. 每个业务单据的完整闭环流转是什么（从创建到结束的全部状态路径）
2. SimulationLoop 在每个 Tick 应该为该单据触发什么动作
```

核心原则：

```text
Workflow Engine = 流程规则定义
Simulation System = 按规则自动驱动已有业务能力
业务能力 = 不变（定价、匹配、路径规划、结算等逻辑不变）
```

---

## 2. 与 Simulation System 的关系

```text
SimulationLoop（Tick 主循环）
    ↓ 每 Tick 查询
Workflow Engine（流程规则）
    ↓ 返回：对象X在状态A → 应触发动作Y
SimulationLoop 调用
    ↓
ExecutionEngine（动作分发器）
    ↓ 调用已有函数
业务能力（runPricingEstimate / advanceTrip / …）
    ↓ 修改状态
业务对象（ServiceOrder / Trip / Task / RouteExecution）
```

---

## 3. 五个业务单据闭环

| 编号 | 单据 | 说明 | 文档 |
|---|---|---|---|
| 01 | ServiceOrder | 服务订单：需求→定价→呼叫→匹配→履约→结算→支付 | `01-service-order-workflow.md` |
| 02 | Trip | 履约行驶：接驾→上车→载客→到达 | `02-trip-workflow.md` |
| 03 | ReadinessTask | 供给侧运营准入：生成→分配→检查→通过 | `03-readiness-task-workflow.md` |
| 04 | DeploymentTask | 运营投放：生成→路径规划→行驶→到达 | `04-deployment-task-workflow.md` |
| 05 | RouteExecution | 行驶记录：路径规划→行驶推进→到达 | `05-route-execution-workflow.md` |

---

## 4. 规则表格式约定

每个单据闭环文档包含一张**流转规则表**，格式如下：

| 当前状态 | 触发动作 | 目标状态 | 条件 |
|---|---|---|---|
| WAITING_PRICE_ESTIMATE | 价格预估 | WAITING_ROBOTAXI_CALL | auto_pricing_enabled |

SimulationLoop 每 Tick 遍历该表，匹配条件后调用对应动作。

---

## 5. 不做什么

```text
不实现业务逻辑（业务逻辑在现有引擎和 main.jsx 中）
不修改业务对象字段定义（字段定义在 field-dictionary.md）
不替代 ExecutionEngine（ExecutionEngine 负责分发调用，WorkflowEngine 负责规则判断）
```
