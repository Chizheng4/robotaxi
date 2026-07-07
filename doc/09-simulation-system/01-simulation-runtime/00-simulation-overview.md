# Simulation-overview：01-simulation-runtime 子模块总览

> 文档定位说明：
>
> - 本文 `00-simulation-overview.md` 只是 **01-simulation-runtime 子模块的总览**，介绍运行时子模块自身（SimulationRun / Clock / Tick / Event / Policy / Trigger / Loop）的设计内容；
> - 整个 Simulation System 的**总概**见上层 `00-simulation-system-overview.md`；
> - `02-workflow-engine` 与 `03-execution-engine` 的内容不在本文范围。

## 1. 目的

本文档定义 01-simulation-runtime 子模块的总纲，说明自动运营模拟运行时如何基于模拟时间、事件和策略自动推进供给侧、需求侧和服务履约闭环。

目标是构建一个统一的自动化运行时框架，使系统能够基于模拟时间、事件和策略自动推进供给侧、需求侧和服务履约闭环。

核心目标：

```text
从手动按钮驱动闭环
升级为
时间驱动 + 事件驱动 + 资源约束驱动 + 策略触发的自动运营模拟系统
```

本阶段不重新定义业务对象，仅调度已有业务能力：

```text
Robotaxi
Worker
ReadinessCheckTask
DeploymentTask
RouteExecution
Customer
DemandSimulationStrategy
DemandSimulationRun
ServiceOrder
PricingStrategy
PricingStrategyRun
PricingDecision
OrderMatchingStrategy
OrderMatchingRun
OrderMatchingDecision
Trip
RoutePlanningStrategy
RoutePlanningRun
Route
```

---

## 2. 核心概念

### 2.1 SimulationRun

表示一次完整模拟执行。

负责：

```text
模拟周期天数
当前 Tick
当前模拟时间
记录全局模拟状态
```

### 2.2 SimulationClock

表示当前模拟时间。

负责：

```text
维护当前 Tick
识别当前 time_period
识别当前 period_type（PEAK / NORMAL）
判断是否处于 Worker 工作时间
判断是否处于 Robotaxi 运营时间
```

### 2.3 SimulationTick

最小时间推进单位。

```text
1 Tick = 10 分钟
```

每个 Tick 系统执行：

```text
推进模拟时间
触发事件扫描
调用供给侧 Trigger
调用需求侧 Trigger
推进正在执行的任务与 Trip
记录 SimulationEvent
```

### 2.4 SimulationPolicy

系统配置集合。

用于：

```text
设置 Tick 长度
设置 Worker 工作时间
设置 Robotaxi 运营时间
设置 PEAK / NORMAL 时间窗口
配置每 Tick 需求数量分布
配置 Robotaxi 行驶速度
配置任务耗时
是否启用默认正常完成
```

---

## 3. 自动化触发原则

Simulation System 是上层调度层，只触发已定义的业务能力。

```text
SimulationClock 提供时间上下文
↓
SimulationTick 触发事件
↓
Trigger 判断是否调用业务对象
↓
业务对象执行自身逻辑
↓
SimulationEvent 记录执行结果
```

边界：

```text
Simulation System 不创建业务对象
Simulation System 不实现业务内部功能
Simulation System 不直接修改业务状态
```

说明：

- 供给侧事件触发由 DeploymentTask / ReadinessCheckTask / Robotaxi 自身逻辑处理；
    
- 需求侧事件触发由 SimulationPolicy 和 DemandTrigger 决定订单生成规模；
    
- Trip 和 RouteExecution 的推进由各自业务对象执行。
    

---

## 4. Tick 时间机制

- 1 Tick = 10 分钟
    
- 一天 144 Tick
    
- 每天分为四个主要 time_period：
    
    - MORNING: 06:00 - 12:00
        
    - NOON: 12:00 - 14:00
        
    - AFTERNOON: 14:00 - 18:00
        
    - EVENING: 18:00 - 24:00
        
- 夜间 NIGHT: 00:00 - 06:00
    
- 每个 time_period 内可细分 PEAK / NORMAL，用于控制需求规模：
    
    - 示例：
        
        - MORNING PEAK: 08:00 - 10:00
            
        - MORNING NORMAL: 06:00 - 08:00、10:00 - 12:00
            
        - NOON PEAK: 12:00 - 13:00
            
        - NOON NORMAL: 13:00 - 14:00
            
        - AFTERNOON PEAK: 17:00 - 18:00
            
        - AFTERNOON NORMAL: 14:00 - 17:00
            
        - EVENING PEAK: 18:00 - 20:00
            
        - EVENING NORMAL: 20:00 - 24:00
            

说明：

- SimulationClock 仅提供时间上下文；
    
- Tick 推进用于触发事件和推进任务执行；
    
- 需求侧订单数量和供给侧任务触发由 Trigger 决定。
    

---

## 5. 自动化执行流程（概览）

```text
SimulationRun 创建
↓
SimulationClock 初始化当前时间
↓
SimulationTick 开始循环
   ↓
   事件扫描
   ↓
   触发 SupplyTrigger（调用供给侧业务逻辑）
   ↓
   触发 DemandTrigger（生成多个 ServiceOrder 上下文）
   ↓
   调用 DemandSimulationStrategy 生成订单上下文
   ↓
   ServiceOrder 创建
   ↓
   PricingDecision 执行
   ↓
   客户确认（可自动或按策略）
   ↓
   OrderMatchingDecision 执行
   ↓
   Trip 创建及推进
   ↓
   RoutePlanningRun 触发（接驾/载客路径）
   ↓
   Robotaxi 状态更新
   ↓
   记录 SimulationEvent
↓
SimulationTick 推进下一 Tick
↓
SimulationRun 结束
```

说明：

- SimulationTick 负责批量触发需求；
    
- 供给侧事件的执行由业务对象自身逻辑控制；
    
- 需求侧事件的规模随机，触发次数由 SimulationPolicy 配置；
    
- 每个 Tick 可触发多个订单。
    

---

## 6. 文件结构（01-simulation-runtime 子模块）

```text
doc/09-simulation-system/01-simulation-runtime/
├── 00-simulation-overview.md      # 运行时子模块总览（本文）
├── 01-simulation-time.md          # 模拟时间机制
├── 02-simulation-run.md           # 模拟执行对象
├── 03-simulation-event.md         # 模拟事件记录
├── 04-simulation-policy.md        # 模拟规则配置
├── 05-supply-trigger.md           # 供给侧事件触发
├── 06-demand-trigger.md           # 需求侧订单触发
├── 07-simulation-loop.md          # Tick 主循环
└── initialization-simulation.md   # 初始化模拟配置
```

---

## 7. 核心规则

1. Simulation System 是上层调度层，仅触发已有业务能力；
    
2. Simulation System 不直接实现业务对象内部功能；
    
3. SimulationClock 只提供时间上下文；
    
4. SimulationTick 是最小时间推进单位；
    
5. 每个 Tick 执行事件扫描和触发操作；
    
6. 需求侧订单数量随机，批量触发；
    
7. 供给侧任务触发由业务对象自身逻辑判断；
    
8. Trip 由 ServiceOrder 驱动，RouteExecution 由 DeploymentTask 驱动；
    
9. SimulationEvent 记录每次事件和状态快照；
    
10. SimulationPolicy 提供触发参数和时间段配置。