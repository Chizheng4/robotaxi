# ReadinessTask Workflow：运营准入闭环

## 1. 定位

ReadinessTask（运营准入任务）是供应管理中用于 Robotaxi 上线运营前的**安全检查单据**。

每个初始进入企业运营体系的 Robotaxi 在上线运营前必须通过运营准入检查。本文档定义准入任务的完整生命周期，以及 SimulationLoop 应如何自动驱动供给侧准入流程。

维修、故障处理完成后当前默认不自动进入运营准入；如未来配置重大维修后复核，应由对应业务服务显式创建准入复核任务。

---

## 2. 闭环全景

```
供给侧触发（SupplyTrigger）
    ↓ 筛选待准入 Robotaxi
生成准入任务 → WAITING_ASSIGNMENT
    ↓ 模拟系统自动分配 Worker
分配 Worker → WAITING_CHECK
    ↓ 模拟系统自动开始检查
开始检查 → CHECKING
    ↓ 模拟系统自动提交结果
检查通过 → COMPLETED

异常路径：
  检查异常 → WAITING_OPERATION_DECISION → （人工处理）
  无空闲 Worker → 等待下一 Tick 重试
```

---

## 3. 状态定义

以现有代码 `src/domain/taskTypes.js` 的 `ReadinessTaskStatus` 为准：

```text
WAITING_ASSIGNMENT
WAITING_CHECK
CHECKING
COMPLETED
CANCELLED
FAILED
```

---

## 4. 自动化流转规则表

| 当前状态 | 触发动作 | 目标状态 | 条件 | 说明 |
|---|---|---|---|---|
| WAITING_ASSIGNMENT | 分配 Worker | WAITING_CHECK | is_worker_working_time / readiness_trigger_enabled | 查找 IDLE Worker 并分配 |
| WAITING_CHECK | 开始检查 | CHECKING | — | 调用 startCheck |
| CHECKING | 提交通过 | COMPLETED | default_readiness_passed = true | 调用 submitCheckResult(PASSED) |

### 4.1 触发条件

准入任务只在以下条件同时满足时触发：

```text
supply_trigger_enabled = true
AND readiness_trigger_enabled = true
AND is_worker_working_time = true
```

Worker 工作时间为 `08:00 - 20:00`（由 SimulationPolicy 配置）。

---

## 5. 需要调用的已有业务能力

| 动作 | 对应现有函数 | 位置 |
|---|---|---|
| 生成准入任务 | `createManualTask()` | `src/main.jsx:972` |
| 分配 Worker | `assignWorker(taskId)` | `src/main.jsx:1062` |
| 开始检查 | `startCheck(taskId)` | `src/main.jsx:1108` |
| 提交检查结果 | `submitCheckResult(taskId, PASSED)` | `src/main.jsx:1126` |

---

## 6. 自动化开关

由 `SimulationPolicy.supply_trigger_config` 控制：

```json
{
  "supply_trigger_enabled": true,
  "readiness_trigger_enabled": true
}
```

---

## 7. 与 SimulationLoop 的交互

SimulationLoop 每 Tick 执行：

1. 检查是否存在 `WAITING_ASSIGNMENT` 的准入任务
2. 如有 → 调用 `assignWorker(taskId)`
3. 检查是否存在 `WAITING_CHECK` 的准入任务
4. 如有 → 调用 `startCheck(taskId)`
5. 检查是否存在 `CHECKING` 的准入任务
6. 如有 → 等待 `worker_readiness_check_ticks`（默认 2 Tick）后调用 `submitCheckResult(taskId, PASSED)`

> 注：检查耗时由 SimulationPolicy 的 `worker_readiness_check_ticks` 配置。SimulationLoop 需记录每个 CHECKING 任务已等待的 Tick 数。

---

## 8. 不做什么

```text
不重写准入判断逻辑（isCandidateRobotaxi 不变）
不重写 Worker 分配逻辑（assignWorker 不变）
不重写检查逻辑（startCheck / submitCheckResult 不变）
```
