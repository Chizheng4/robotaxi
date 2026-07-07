# 模拟业务数据时间与来源审计

## 1. 目标

模拟生成的需求、供给和后续工作流对象必须能够回答：由哪次模拟产生、在什么模拟时间发生、发生在连续时间轴的哪个 Tick，同时保留真实系统写入时间。

## 2. 双时间体系

```text
真实审计时间：created_at / updated_at / completed_at
模拟业务时间：simulation_created_at / simulation_updated_at / simulation_completed_at
```

两套时间不得互相覆盖。真实时间用于系统审计和运行性能分析；模拟时间用于运营时段、跨日趋势、经营指标和预测训练。

## 3. 公共溯源字段

模拟创建或推进的对象统一记录：

- `record_source = SIMULATION`；
- `simulation_run_id`；
- `simulation_created_at`，仅创建时写入；
- `simulation_updated_at`，每次模拟状态变化时写入；
- `simulation_completed_at`，进入业务终态时写入；
- `simulation_global_tick`。

订单匹配和支付等关键经营节点可增加对应的 `simulation_matched_at`、`simulation_payment_completed_at`。人工操作不得填充这些字段。

## 4. 覆盖对象

- DemandSimulationRun；
- ServiceOrder；
- PricingStrategyRun 与 PricingDecision；
- OrderMatchingRun 与 OrderMatchingDecision；
- Trip；
- ReadinessCheckTask；
- DeploymentTask；
- RouteExecution；
- 被模拟工作流改变状态的 Robotaxi。

## 5. 分析用途

经营分析按模拟时间聚合，真实时间只作为审计维度。推荐的事实维度为：模拟时间轴、运行编号、模拟日、小时、全局 Tick、对象类型、状态变化和业务结果。
