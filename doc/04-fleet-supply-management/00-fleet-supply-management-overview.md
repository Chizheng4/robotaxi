# Supply System：供给系统总览

## 1. 系统定位

Supply System 负责 Robotaxi 供给能力的形成、进入、分布和短期调整。

```text
Supply System = 让可运营 Robotaxi 以正确规模和正确空间分布进入服务网络
```

它不负责车辆健康恢复。车辆清洁、充电、维修、故障、退役属于 Fleet Operations。

## 2. 当前阶段边界

当前已经存在并正在迁移到 Supply System 的核心对象：

|对象|说明|
|---|---|
|DeploymentTask|短期供需平衡下的运营投放任务|
|RouteExecution|记录投放任务下 Robotaxi 的行驶过程|

DeploymentTask 的本质：

```text
把已经可运营的 Robotaxi 投放到更合适的服务区域、临停点或待命点
```

## 3. 未来完整闭环

未来 Supply System 会覆盖更完整的供给来源：

```text
长期需求预测
  ↓
供给缺口判断
  ↓
供给计划
  ↓
Robotaxi 来源选择：
  - 自我生产
  - 供应商合作生产
  - 第三方车辆 / 类 Tesla Network 接入
  ↓
Robotaxi 供给单
  ↓
供给履约
  ↓
Robotaxi 进入 Fleet Operations 准入
  ↓
形成可运营车辆
```

## 4. 与 Fleet Operations 的关系

|系统|职责|
|---|---|
|Fleet Operations|保证 Robotaxi 处于可运营健康状态|
|Supply System|决定可运营 Robotaxi 如何形成供给、如何进入服务网络、如何再平衡|

Fleet Operations 输出：

```text
AVAILABLE Robotaxi 集合
```

Supply System 消费：

```text
AVAILABLE Robotaxi 集合 + 需求预测 / 供给计划 / 区域缺口
```

## 5. 与 Strategy System 的关系

Strategy System 决定长期方向，Supply System 执行供给策略。

```text
Strategy System：判断需要多少供给、哪里需要供给、用什么来源补充供给
Supply System：生成供给计划、供给单、投放任务和履约过程
```

## 6. 未来对象留底

|对象|说明|阶段|
|---|---|---|
|SupplyForecast|供给预测|未来|
|SupplyPlan|供给计划|未来|
|SupplyOrder|Robotaxi 供给单|未来|
|SupplyFulfillment|供给履约记录|未来|
|SupplyAdjustmentPlan|短期供需调整计划|未来|
|DeploymentTask|投放 / 再平衡任务|当前已有|
|SupplyAssignmentDecision|供给车辆分配决策|未来|

## 7. 当前原则

1. DeploymentTask 不属于 Fleet Operations。
2. DeploymentTask 只处理可运营车辆的空间位置调整。
3. 不健康、低电、待维修、待清洁的 Robotaxi 不应进入 Supply System 投放。
4. 供给系统未来可以影响经营指标中的服务覆盖、供给缺口、车辆利用率和区域供需平衡。
