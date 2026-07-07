# Simulation-system-overview 总概


## 1. 目的

本文档是 Simulation System 的**总概**，用于说明整体模块结构及各子模块的设计范围。

> 文档定位说明：
>
> - 本文 `00-simulation-system-overview.md` 是**整个 Simulation System 的总概**，说明三大模块结构、模块关系和总体原则；
> - `01-simulation-runtime/00-simulation-overview.md` 只是 **01-simulation-runtime 子模块内部的总概**，用于介绍运行时子模块自身的设计内容，不覆盖整体结构。

Simulation System 由三个核心模块组成，与实际目录命名一致：

```text
01-simulation-runtime
02-workflow-engine
03-execution-engine
```

这些模块并非业务系统本身，而是用于构建模拟系统运行框架的基础模块。

整体设计目标包括：

- 建立统一的模拟时间推进机制
    
- 建立统一的业务状态流转机制
    
- 建立统一的动作执行机制
    
- 支撑 Robotaxi 业务场景的自动化模拟运行
    
- 支撑后续策略、调度、定价等算法的实验与评估
    
- 为模拟结果分析提供标准化运行基础
    

---

## 2. 模块结构说明

### 2.1 01-simulation-runtime（模拟运行时模块）

该模块用于设计“模拟时间推进与模拟运行基础能力相关对象”。

其核心目标是：

- 建立统一的模拟时间体系
    
- 驱动整个模拟系统持续运行
    
- 为业务对象提供统一事件触发机制
    
- 保证所有模拟行为在同一时间轴上执行
    

内部将包含以下设计内容：

#### （1）SimulationRun

- 一次完整模拟运行实例
    
- 记录模拟周期、运行状态
    
- 作为全局模拟容器
    

设计目的：

- 管理一次完整模拟实验
    
- 统一管理模拟生命周期
    
- 支撑模拟结果统计与分析
    

#### （2）SimulationClock

- 模拟时间系统
    
- Tick推进机制
    
- 时间段识别（高峰/平峰）
    

设计目的：

- 提供统一时间基准
    
- 驱动系统按时间推进
    
- 支撑时间相关业务逻辑
    

#### （3）SimulationTick

- 最小时间单位
    
- 推动系统逐步执行
    
- 触发事件扫描
    

设计目的：

- 控制模拟执行粒度
    
- 保证系统运行顺序一致
    
- 支撑离散事件模拟机制
    

#### （4）SimulationEvent

- 模拟过程中产生的事件记录
    
- 包括需求事件、供给事件、系统事件
    

设计目的：

- 统一描述系统变化
    
- 支撑事件驱动执行模式
    
- 提供模拟过程追踪能力
    

---

### 2.2 02-workflow-engine（工作流引擎模块）

该模块用于设计“业务单据的完整闭环流转规则”。

其核心目标是：

- 按业务单据（ServiceOrder / Trip / ReadinessTask / DeploymentTask / RouteExecution）独立定义闭环
    
- 每个单据定义从创建到完成的全部状态路径与触发条件
    
- 为 SimulationLoop 提供“对象X在状态A → 应触发动作Y”的规则表
    
- 业务逻辑不变，只定义触发规则
    

内部包含以下设计内容：

#### （1）ServiceOrder Workflow

- 服务订单闭环：需求生成→定价→呼叫→匹配→Trip履约→结算→支付

#### （2）Trip Workflow

- 履约行驶闭环：接驾行驶→上车→载客行驶→到达

#### （3）ReadinessTask Workflow

- 运营准入闭环：任务生成→分配Worker→开始检查→检查通过

#### （4）DeploymentTask Workflow

- 运营投放闭环：任务生成→路径规划→行驶推进→到达

#### （5）RouteExecution Workflow

- 行驶记录闭环：路径规划→逐Tick推进→到达
    

---

### 2.3 03-execution-engine（动作分发模块）

该模块用于设计“动作分发与调用机制”。

其核心目标是：

- 将 SimulationLoop 的触发请求路由到对应业务函数
    
- 维护动作→业务函数的映射表
    
- 调用已有业务引擎（不变），记录 SimulationEvent
    
- 不实现业务逻辑、不直接修改业务对象状态
    

内部包含以下设计内容：

#### （1）Action Definition

- 15 个标准化动作类型（PRICING_EXECUTE / TRIP_STEP_EXECUTE / ...）
    
- 每个动作对应一个已有业务函数

#### （2）Dispatcher

- 动作→函数映射表
    
- 接收请求→查表→调用→记录结果

#### （3）Execution Result

- 标准化返回结构
    
- 记录调用成功/失败/NO_ACTION
    

---

## 3. 模块关系与运行流程

三个模块之间的关系为：

```text
01-simulation-runtime → 提供时间与事件
02-workflow-engine    → 定义流转规则表
03-execution-engine   → 动作分发与调用
```

整体运行逻辑如下：

```text
SimulationLoop 推进 Tick
        ↓
查询 WorkflowEngine 规则表
        ↓
返回：对象X在状态A → 应触发动作Y
        ↓
ExecutionEngine 分发调用
        ↓
已有业务引擎函数执行（不变）
        ↓
业务对象状态变更
        ↓
记录 SimulationEvent
        ↓
进入下一 Tick
```

设计该结构的目的在于：

- 模拟系统只驱动业务，不重写业务
    
- 时间、规则、分发三个维度解耦
    
- 提高系统可扩展性与可解释性
    

---

## 4. 数据沙箱架构（核心设计原则）

### 4.1 原则

模拟系统与前端 UI 共享读取策略/地图数据，但业务单据**写入隔离**：

```text
┌─ 前端 UI 层（live 数据）──────────┐
│  React state                       │
│  serviceOrders[], trips[], ...     │
│  ↑ 用户手动操作                     │
│  ↑ simulation_run_id = null        │
└───────────────────────────────────┘

┌─ Simulation System（沙箱数据）─────┐
│  SimulationRun 独立数据上下文       │
│  simulatedOrders[], ...            │
│  ↑ Tick 自动驱动                    │
│  ↑ simulation_run_id = "xxx"       │
│  ↑ 共享读取：策略/配置/地图（只读）  │
└───────────────────────────────────┘
```

### 4.2 关键规则

| 规则 | 说明 |
|---|---|
| 共享读取 | 策略配置（PricingStrategy / OrderMatchingStrategy）、地图数据（cells / roadSegments）作为只读参考 |
| 写入隔离 | 业务单据（ServiceOrder / Trip / Task / RouteExecution）在沙箱内独立创建，不与 live 数据混合 |
| 同时运行 | 模拟运行期间，前端 UI 仍可正常使用，用户操作不影响模拟数据 |
| 数据溯源 | 每个模拟对象带 `simulation_run_id`，可追溯到具体哪次模拟运行 |
| 结果纯净 | `result_summary` 只统计该 `simulation_run_id` 下的数据，用户手动创建的对象不计入 |

### 4.3 SimulationEvent 归属

```text
simulation_run_id = null    → 用户手动操作事件，不计入任何模拟结果
simulation_run_id = "xxx"   → 模拟自动触发事件，计入对应 SimulationRun
```

### 4.4 Monitor 页面行为

Monitor 页面用于实时查看模拟进度，其操作权限如下：

| 操作 | Monitor 页面 | 说明 |
|---|---|---|
| 启动 / 暂停 / 继续 / 停止 SimulationRun | ✅ 有 | 用户控制模拟节奏 |
| 查看模拟进度（当前Tick / 时间 / 场景） | ✅ 有 | 实时展示 |
| 查看 SimulationEvent 事件流 | ✅ 有 | 可观测 |
| 手动操作业务对象（定价/匹配/行驶等） | ❌ 无 | 模拟系统自动驱动 |

---

## 5. 总体设计原则

### （1）模块职责隔离

```text
runtime = 时间与事件
workflow = 状态与规则
execution = 动作与状态更新
```

设计目的：

- 降低模块耦合
    
- 提高可维护性
    
- 支撑独立演进与扩展
    

---

### （2）模块不包含业务系统本身

所有业务对象（ServiceOrder / Trip / Robotaxi）属于业务层，不在本模块定义。

设计目的：

- 保持基础框架通用性
    
- 避免业务逻辑侵入基础模块
    
- 提高框架复用能力
    

---

### （3）模块内部允许继续扩展对象

每个模块内部后续可持续增加：

- 新对象
    
- 新规则
    
- 新执行逻辑
    

设计目的：

- 支撑未来业务增长
    
- 支撑更多模拟场景
    
- 保持架构长期可扩展
    

---

## 6. 总结

Simulation System 模块划分如下（与实际目录命名一致）：

```text
01-simulation-runtime → 模拟时间与事件体系
02-workflow-engine    → 按业务单据的闭环流转规则
03-execution-engine   → 动作分发器（路由→调用→记录）
```

核心设计原则：

- **驱动而非重写**：模拟系统调用已有业务函数，不重新实现业务逻辑
- **数据沙箱隔离**：模拟数据与前端 live 数据物理隔离，可同时运行互不影响
- **可复现**：SimulationRun 保存 policy_snapshot，同一配置下结果可复现
- **可观测**：每步操作记录 SimulationEvent，全程可回溯

整体设计目标是构建一个统一、可扩展、可重复运行的自动化运营模拟框架，用于驱动 Robotaxi 业务系统自动运转并产生海量运营数据。