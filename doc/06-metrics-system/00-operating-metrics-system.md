# Robotaxi 经营指标系统总纲

## 1. 文档定位

- 模块：经营指标系统（Operating Metrics System）
- 阶段：大版本方案设计
- 目标版本：`v034`
- 当前状态：方案设计完成后等待用户确认，不自动进入编码
- 时间口径：默认使用模拟时间，不使用真实审计时间衡量经营表现

经营指标系统是 Robotaxi 自动化运营模拟平台的经营表达层。它不直接创造业务事实，而是消费业务单据生命周期、模拟时间、成本事实和收入事实，并按经营统计周期聚合多个模拟运行产生的业务事实，形成可解释、可下钻、可复盘的经营指标。

## 2. 目标

本系统需要回答三个经营问题：

1. **现在发生了什么**：供给、需求、空间和财务状态是否健康。
2. **为什么会这样**：匹配、路径、履约、成本和收入链路中哪里驱动了结果。
3. **最终创造了什么价值**：是否满足需求、产生收入、控制成本并形成贡献利润。

指标不是“能算什么就展示什么”，而是围绕经营决策构建最小但完整的指标闭环。

## 3. 当前已具备的数据基础

|事实类型|当前对象|状态|说明|
|---|---|---|---|
|业务生命周期事实|ServiceOrder、Trip、RouteExecution、ReadinessTask、DeploymentTask|已具备|状态、模拟创建时间、模拟完成时间、状态时间线已沉淀|
|模拟时间事实|SimulationRun、TimedOperation、simulation_* 字段|已具备|支持连续多天、秒级世界时间和时间作业推进|
|路径与距离事实|Route、Trip、RouteExecution|已具备|移动步数、路径距离、行驶距离已成为成本和效率基础|
|收入事实|RevenueRecord、RevenueCalculationRun|已具备|应收、实收、未收收入已可按模拟运行生成|
|成本事实|CostRecord、CostCalculationRun、CostModelProfile|已具备|距离、能源、人力、折旧成本已可归因到业务对象|
|空间维度|Cell、ServiceArea、Zone、Map|已具备|可支持区域、服务区、地图维度聚合|
|数据质量事实|calculation_status、error_count、calculation_errors|部分具备|成本和收入已有质量信息，指标计算需要独立质量结果|

## 4. 指标系统分层

```text
业务事实层 Fact Layer
  → 业务单据、状态时间线、成本记录、收入记录、路径、空间、模拟运行

指标定义层 Metric Definition Layer
  → 指标编号、公式、字段来源、窗口、维度、口径、质量规则

指标计算层 Metric Calculation Layer
  → 按模拟运行、模拟日、小时、服务区、车辆、渠道等窗口生成指标观测

指标展示层 Metric Experience Layer
  → 经营总览、财务结果、服务质量、效率诊断、过程下钻、数据质量
```

## 5. 第一版指标建设原则

1. 只实现当前业务事实能够支撑的指标。
2. 所有指标必须可追溯到来源对象和来源字段。
3. 比率指标分母为 0 时返回空值和原因，不伪装为 0。
4. 指标计算只消费事实，不修改业务单据生命周期。
5. 指标计算不隶属于单个模拟运行对象，应由经营分析管理按可选择统计周期触发；模拟运行、成本记录和收入记录只是指标计算消费的事实来源。
6. 指标前端必须保持 B 端经营工作台风格：清晰、轻盈、层次分明、可下钻，不做营销式大屏。
7. 指标异常必须能下钻到来源订单、行驶记录、成本记录、收入记录或计算错误。

## 6. 指标对象模型提案

### 6.1 MetricDefinition：指标定义

|字段|中文名|说明|
|---|---|---|
|metric_definition_id|指标定义编号|稳定唯一编号，如 `OUTCOME-FIN-001`|
|metric_name_cn|指标中文名|前端展示名称|
|metric_name_en|指标英文名|英文业务名称|
|metric_layer|指标层级|STATE、PROCESS、OUTCOME、QUALITY|
|metric_domain|指标领域|FINANCE、SERVICE、EFFICIENCY、MATCHING、ROUTING、SUPPLY、DEMAND|
|business_definition|业务定义|指标回答的经营问题|
|calculation_formula|计算公式|使用正式字段描述|
|source_objects|来源对象|ServiceOrder、Trip、CostRecord 等|
|source_fields|来源字段|字段字典中的正式字段|
|time_basis|时间口径|默认 SIMULATION_TIME|
|default_time_window|默认时间窗|SIMULATION_RUN、DAY、HOUR、10_MINUTE|
|supported_dimensions|支持维度|simulation_run_id、service_area_id、robotaxi_id 等|
|zero_denominator_rule|零分母规则|NULL_WITH_REASON|
|data_readiness|数据就绪度|READY、DERIVABLE、MISSING_DATA|
|display_unit|展示单位|currency、percent、count、second、km|
|higher_is_better|越高越好|用于状态颜色和排序|
|metric_status|指标状态|ACTIVE、RESERVED、DISABLED|
|definition_version|定义版本|口径变更时递增|

### 6.2 MetricCalculationRun：指标计算运行

|字段|中文名|说明|
|---|---|---|
|metric_calculation_run_id|指标计算运行编号|本次指标计算批次|
|metric_scope_type|指标统计范围|SIMULATION_RUN、OPERATING_PERIOD|
|metric_period_type|指标统计周期|SIMULATION_RUN、ALL、LATEST_DAY、LATEST_7_DAYS|
|metric_period_label|指标统计周期显示|前端展示的统计周期范围|
|simulation_run_id|模拟运行编号|单次模拟运行兼容来源，经营周期计算为空|
|simulation_run_ids|来源模拟运行编号列表|经营周期纳入统计的模拟运行集合|
|simulation_timeline_id|模拟时间轴编号|跨运行连续统计时使用|
|calculation_status|计算状态|QUEUED、CALCULATING、SUCCEEDED、PARTIALLY_SUCCEEDED、FAILED|
|calculation_progress_percent|计算进度（%）|前端反馈|
|metric_definition_count|指标定义数|本次纳入计算的定义数量|
|generated_metric_observation_count|生成指标观测数|结果数量|
|error_count|错误数量|质量问题数量|
|calculation_errors|计算错误|结构化错误|
|algorithm_version|算法版本|保证结果可复现|
|started_at|开始时间|真实审计时间|
|completed_at|完成时间|真实审计时间|

### 6.3 MetricObservation：指标观测

|字段|中文名|说明|
|---|---|---|
|metric_observation_id|指标观测编号|唯一编号|
|metric_calculation_run_id|指标计算运行编号|来源计算批次|
|metric_definition_id|指标定义编号|来源指标定义|
|metric_scope_type|指标统计范围|SIMULATION_RUN、OPERATING_PERIOD|
|metric_period_type|指标统计周期|SIMULATION_RUN、ALL、LATEST_DAY、LATEST_7_DAYS|
|metric_period_label|指标统计周期显示|前端展示的统计周期范围|
|simulation_run_id|模拟运行编号|单次模拟运行兼容来源，经营周期计算为空|
|simulation_run_ids|来源模拟运行编号列表|经营周期纳入统计的模拟运行集合|
|simulation_timeline_id|模拟时间轴编号|来源时间轴|
|window_type|时间窗类型|SIMULATION_RUN、DAY、HOUR、10_MINUTE|
|window_start_seconds|窗口开始秒|绝对模拟秒|
|window_end_seconds|窗口结束秒|绝对模拟秒|
|window_label|窗口显示名|如 Day 1 08:00:00 - 09:00:00|
|dimension_type|维度类型|GLOBAL、SERVICE_AREA、ROBOTAXI、ORDER_CHANNEL|
|dimension_id|维度编号|具体维度值|
|metric_value|指标值|数值结果|
|metric_unit|指标单位|currency、percent、count 等|
|numerator_value|分子值|如适用|
|denominator_value|分母值|如适用|
|quality_status|质量状态|PASS、WARN、FAIL|
|quality_reason|质量说明|空分母、缺字段、未计算等|
|source_record_count|来源记录数|用于可信度判断|
|source_object_refs|来源对象引用|可下钻对象列表|
|created_at|创建时间|真实审计时间|

## 7. 前端体验总方案

经营指标前端不做复杂大屏，采用统一工作台结构。

菜单建议：

```text
经营分析管理
├── 经营指标总览
├── 财务表现分析
├── 服务经营分析
├── 运营过程诊断
└── 数据计算管理
    ├── 指标定义
    ├── 指标观测
    └── 指标计算记录

财务经营管理
├── 收入记录
├── 成本记录
├── 成本配置
├── 收入生成记录
└── 成本计算记录
```

### 7.1 经营指标总览

首屏不堆表格，采用“摘要 + 分组指标 + 趋势 + 下钻”的结构：

1. 顶部经营摘要：实收收入、总成本、贡献利润、订单履约率、单均成本。
2. 中部指标分组：财务、服务、效率、过程、质量。
3. 趋势区域：按模拟日或小时展示核心指标趋势。
4. 异常列表：质量失败、成本未计算、收入未生成、分母为空等。
5. 右侧详情：选中指标后展示定义、公式、来源字段、质量说明和来源对象。
6. 指标明细表：默认收起，仅用于核对计算结果和来源记录；主阅读空间优先展示经营结果、链路解释和数据可信度。
7. 分析页不显示状态分类、关键词查询和状态筛选；这些控件只用于业务对象、单据和记录管理。

### 7.2 视觉原则

1. 指标数字要清晰但不粗大，保持轻盈精细。
2. 指标卡片只用于单个指标，不做卡片套卡片。
3. 趋势图和表格遵循统一色彩令牌，不引入大面积渐变或装饰。
4. 所有指标名称、状态、单位必须中文显示。
5. 指标解释采用折叠式详情，不在主表面堆长文本。
6. 计算记录、指标观测和成本/收入明细属于追溯和职能管理内容，不与经营决策总览平铺在同一层级。
7. 页面顶部已有模块标题和说明时，指标内容区不重复展示同样说明，避免干扰经营判断。

## 8. 第一版指标优先级

第一版只实现 READY 指标，DERIVABLE 指标在计算服务具备窗口与维度能力后实现，MISSING_DATA 指标保留在文档中。

|优先级|范围|目标|
|---|---|---|
|P0|财务闭环|收入、成本、贡献利润、单均成本|
|P0|服务结果|订单数、完成订单数、履约率、取消率|
|P0|质量护栏|成本计算状态、收入生成状态、关键模拟时间完整率|
|P1|过程诊断|匹配成功率、匹配失败率、路径规划成功率、履约完成率|
|P1|效率下钻|单车收入、平均履约距离、平均履约时长|
|P2|高级状态|车辆利用率、供需压力、需求波动、空间热力|

## 9. 后续能力缺口

|能力|原因|优先级|
|---|---|---|
|车辆状态历史快照|计算车辆历史利用率和供给状态趋势|P1|
|潜在需求事实|计算真实需求满足率和市场覆盖|P1|
|指标计算结果持久化|支持历史对比和策略复盘|P0|
|指标质量结果|避免错误指标误导经营判断|P0|
|指标下钻引用|支持从指标定位到业务单据和成本/收入记录|P0|
