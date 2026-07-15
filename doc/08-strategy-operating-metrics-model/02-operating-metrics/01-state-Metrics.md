# 经营状态指标设计

状态指标描述统计截止点上的资产、供给和业务存量，不与期间发生量混用。

## 第一阶段目录

|唯一含义|计算口径|主要来源|主要维度|
|---|---|---|---|
|当前有效 Robotaxi|截止点运营状态为可运营或运维中且归属统计 Zone 的车辆数|Robotaxi|Zone|
|当前可运营 Robotaxi|截止点可参与订单与投放匹配的车辆数|Robotaxi|Zone、运营中心|
|当前运维 Robotaxi|截止点处于运维中的车辆数|Robotaxi|Zone、任务类型|
|预测所需 Robotaxi|同期有效预测结果中的所需数量|需求预测结果|Zone|
|Robotaxi 供给缺口|预测所需 Robotaxi - 当前有效 Robotaxi，最小为 0|预测结果、Robotaxi|Zone|
|计划生产 Robotaxi|已确认生产计划的计划数量|生产计划|Zone|
|实际生产 Robotaxi|已完成生产批次产生的 Robotaxi 数量|生产批次、Robotaxi|Zone|
|计划交付 Robotaxi|有效交付单的车辆数量|交付单|Zone、运营中心|
|实际交付 Robotaxi|已交付车辆数量|交付单、Robotaxi|Zone、运营中心|

状态指标必须保存统计截止时间和时间口径。历史状态趋势只有在存在对应快照时才能计算，不得用当前状态回填历史。
