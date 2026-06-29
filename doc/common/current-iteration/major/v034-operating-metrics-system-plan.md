# v034 经营指标系统大版本计划

## 状态

方案设计阶段，暂不自动进入编码。

## 目标

基于现有模拟业务闭环、成本事实和收入事实，建立经营指标系统，使平台能够从模拟运行结果中生成可解释、可下钻、可复盘的经营指标。

## 方案来源

- `doc/06-metrics-system/00-operating-metrics-system.md`
- `doc/06-metrics-system/01-state-Metrics.md`
- `doc/06-metrics-system/02-process-Metrics.md`
- `doc/06-metrics-system/03-outcome-metrics.md`
- `doc/06-metrics-system/04-cost-model.md`
- `doc/06-metrics-system/05-v034-operating-metrics-implementation-plan.md`

## 版本拆分

1. `v034.0`：指标系统方案与字段合同。
2. `v034.1`：指标定义与计算引擎。
3. `v034.2`：经营指标总览页面。
4. `v034.3`：财务与服务指标页面。
5. `v034.4`：过程诊断与质量护栏。
6. `v034.5`：自动计算与验证闭环。

## 执行原则

1. 先确认方案，再编码。
2. 每个子版本独立提交和打标签。
3. 任何新增指标对象、字段、枚举必须同步字段字典文档和前端字段字典。
4. 前端必须复用经营分析管理的统一工作台骨架。
5. 指标计算只消费事实，不修改业务单据生命周期。
6. 不进入预测模型、潜在需求、车辆状态历史快照等 P1/P2 能力，除非用户明确确认。

