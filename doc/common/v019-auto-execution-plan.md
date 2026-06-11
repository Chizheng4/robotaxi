# v019.x 自动执行控制计划

## 1. 目的

本文档用于固化 `v019` 阶段之后的连续自动迭代计划。

目标是让 Codex 在用户确认进入自动执行后，按照本文档逐步完成需求订单与服务履约方案的整体交付，而不是每个小版本都等待用户重新说明范围。

本文档不是业务对象定义文档，而是工程执行控制文档。

业务对象定义以对应业务文档为准：

```text
doc/04-demand-order/
doc/05-dispatch-trip/
doc/07-operations-decision/
doc/common/field-dictionary.md
```

---

## 2. 当前阶段

```text
阶段基线版本：v019
阶段名称：需求订单与服务履约方案设计
当前执行模式：待用户确认后自动连续执行
当前计划起点：v019.1
当前计划终点：v019.8
```

---

## 3. 总体交付目标

围绕 `v019` 已提交的需求订单与服务履约方案，完成一个可在前端体验和测试的最小服务闭环：

```text
Customer
↓
需求模拟
↓
ServiceOrder
↓
定价
↓
订单匹配
↓
Trip
↓
路径规划
↓
接驾
↓
载客
↓
到达完成
```

总体要求：

1. 不破坏已有运营中心、Robotaxi、运营投放、Route、运营行驶记录闭环；
2. 不接入真实地图、真实支付、真实外部平台或真实自动驾驶系统；
3. 不实现 DemandForecast、Metric、复杂经营优化等后续对象；
4. 新增字段必须进入 `doc/common/field-dictionary.md`；
5. 前端表格、详情、筛选、状态、按钮和事件显示必须中文优先；
6. 业务对象和单据页面默认使用统一 B 端对象列表布局；
7. 每个小版本完成后更新 `VERSION.md`，提交并打对应 tag。

---

## 4. 自动迭代版本计划

### v019.1 Customer 基础

目标：建立客户池。

交付：

1. 初始化 54 个 Customer；
2. 新增客户管理页面；
3. 支持列表、状态分类、详情；
4. 字段和状态中文展示；
5. 校验 Customer 初始化数量、编号、状态、默认渠道。

不做：

1. 不创建订单；
2. 不实现需求预测。

验收：

1. 前端可以查看 Customer 列表；
2. Customer 字段显示中文；
3. 点击 Customer 可查看详情；
4. 初始化校验通过。

---

### v019.2 需求模拟策略

目标：实现需求模拟策略和执行记录。

交付：

1. 初始化 `DSS-001`；
2. 新增需求模拟策略页面；
3. 新增 DemandSimulationRun 执行记录；
4. 支持生成客户、需求位置、上车点、下车点上下文；
5. 校验上车点、下车点必须落在可服务 ServiceArea。

不做：

1. 不直接进入价格、匹配、Trip；
2. 不实现 DemandForecast。

验收：

1. 可以查看需求模拟策略；
2. 可以触发一次需求模拟；
3. 能看到 DemandSimulationRun；
4. 模拟结果包含客户、上车位置、下车位置。

---

### v019.3 ServiceOrder 创建闭环

目标：生成服务订单。

交付：

1. 新增 ServiceOrder 数据结构和页面；
2. 支持创建自有平台服务订单；
3. 支持创建外部平台服务订单；
4. 调用需求模拟策略生成订单上下文；
5. ServiceOrder 创建后进入 `CREATED`，计价中和等待客户确认留给 v019.4 定价阶段触发；
6. 订单详情展示客户、上车位置、下车位置、来源渠道。

不做：

1. 不做真实支付；
2. 不接入真实外部平台；
3. 不创建 Trip。

验收：

1. 前端可以创建 ServiceOrder；
2. ServiceOrder 引用 Customer 和模拟位置；
3. ServiceOrder 状态流转清楚；
4. 订单字段和状态显示中文。

---

### v019.4 定价决策

目标：服务订单生成报价。

交付：

1. 新增 PricingStrategy；
2. 新增 PricingStrategyRun；
3. 新增 PricingDecision；
4. 初始化基础定价策略；
5. 订单可触发价格预估；
6. 写入预估价格、报价、价格说明和定价决策编号；
7. 价格预估只使用路径估算，不默认生成正式可执行 Route。

不做：

1. 不做复杂经营优化；
2. 不做真实支付结算；
3. 不改变 Robotaxi 或 Trip 状态。

验收：

1. ServiceOrder 可以得到报价；
2. PricingDecision 可以查看；
3. PricingStrategyRun 可追踪；
4. 定价过程不生成正式可执行 Route。

---

### v019.5 订单匹配

目标：把服务订单匹配给 Robotaxi。

交付：

1. 新增 OrderMatchingStrategy；
2. 新增 OrderMatchingRun；
3. 新增 OrderMatchingDecision；
4. 初始化最近可用 Robotaxi 匹配策略；
5. 订单确认后进入找车；
6. 匹配成功写入匹配 Robotaxi；
7. Robotaxi 写入当前服务订单；
8. 匹配失败进入匹配失败状态。

重点校验：

1. Robotaxi 不得同时有活跃当前任务和当前服务订单；
2. 不得匹配不可运营车辆；
3. 匹配策略只返回结果，业务状态由调用方更新。

验收：

1. ServiceOrder 可触发匹配；
2. 成功时订单和 Robotaxi 关联一致；
3. 失败时状态和失败原因清楚；
4. 匹配记录可查看。

---

### v019.6 Trip 服务履约

目标：创建服务履约记录。

交付：

1. 匹配成功后创建 Trip；
2. 新增服务履约记录页面；
3. Trip 独立于 RouteExecution；
4. 支持接驾中、到达上车点、乘客上车、载客中、到达目的地、完成；
5. Robotaxi 位置和状态随 Trip 推进更新。

不做：

1. 不复用运营行驶记录 RouteExecution；
2. 不实现真实支付；
3. 不实现服务投诉、退款或复杂异常工单。

验收：

1. 匹配成功后可查看 Trip；
2. Trip 状态可推进；
3. Robotaxi 当前服务订单和位置变化一致；
4. Trip 和 RouteExecution 记录边界清楚。

---

### v019.7 服务订单路径规划接入

目标：让 Trip 使用 RoutePlanning。

交付：

1. 接入 RPS-003 接驾路径；
2. 接入 RPS-004 载客路径；
3. 生成 Route；
4. 生成 RoutePlanningRun；
5. Trip 记录当前 Route 和 route_history；
6. Route 管理可查看服务订单相关 Route。

重点校验：

1. Route.route_strategy_id、RoutePlanningRun.route_strategy_id、Trip.route_history.route_strategy_id 必须一致；
2. route_steps 起点必须等于 origin_cell_id；
3. route_steps 终点必须等于 target_cell_id；
4. 相邻 route_steps 必须连续。

验收：

1. Trip 接驾和载客都使用 Route；
2. RoutePlanningRun 可追踪；
3. Route 可以反查 ServiceOrder、Trip 和 Robotaxi；
4. 路径步骤可查看并可校验。

---

### v019.8 异常与重规划闭环

目标：服务履约异常可继续模拟。

交付：

1. 支持目的地变更 RPS-005；
2. 支持服务路径异常重规划 RPS-006；
3. Trip 记录异常类型和 route_history；
4. 重规划成功后继续执行；
5. 重规划失败时停在等待运营决策状态，不强行闭环。

不做：

1. 不实现复杂运营工单；
2. 不做真实自动驾驶决策系统；
3. 不做 DemandForecast 或 Metric。

验收：

1. Trip 可以异常重规划；
2. 重规划成功后继续行驶；
3. 重规划失败时状态和原因清楚；
4. ServiceOrder、Trip、Robotaxi、Route、RoutePlanningRun 状态一致。

---

## 5. 自动执行规则

用户确认进入自动执行后，Codex 默认按以下规则推进：

1. 每个小版本开始前读取相关业务文档和 `doc/common/field-dictionary.md`；
2. 如果发现字段缺失，先补字段字典；
3. 如果发现轻微文档不一致，先修正文档；
4. 如果发现对象职责边界不清，优先按已有 v019 文档原则处理；
5. 编码实现只覆盖当前小版本目标；
6. 编码后必须做前端模拟验证；
7. 验证后更新 `VERSION.md`；
8. 提交并打 tag，例如 `v019.1`、`v019.2`；
9. 小版本完成后自动进入下一小版本；
10. 直到完成 `v019.8` 或触发暂停条件。

---

## 6. 暂停询问规则

Codex 仅在以下情况暂停并询问用户：

1. 文档之间出现根本冲突，无法合理判断；
2. 需要删除或大幅重写已有架构；
3. 需要实现用户此前明确禁止的对象；
4. 需要执行破坏性 Git 操作；
5. 会明显破坏已有运营投放闭环；
6. 本地环境无法启动或验证，且无法通过合理方式自行恢复。

以下情况不需要暂停：

1. 补齐字段字典；
2. 修正中文字段显示；
3. 修正状态中文显示；
4. 补充轻量校验；
5. 按现有 B 端对象列表布局新增页面；
6. 增加必要的前端模拟测试。

---

## 7. 版本记录规则

每个小版本完成后必须：

1. 更新 `VERSION.md`；
2. 使用对应版本号提交；
3. 创建对应 tag；
4. 保持工作区干净；
5. 在最终回复中说明提交号、tag 和验证结果。

版本号格式：

```text
v019.1
v019.2
v019.3
v019.4
v019.5
v019.6
v019.7
v019.8
```

如果某个小版本中发现必须先修补前序问题，可以使用补丁版本：

```text
v019.x.1
v019.x.2
```

补丁版本必须说明修补原因。

---

## 8. 当前执行指针

```text
current_iteration = v019.4
current_goal = 定价决策
current_status = v019.3_completed_waiting_auto_continue
```

`v019.1 Customer 基础`、`v019.2 需求模拟策略` 和 `v019.3 ServiceOrder 创建闭环` 已完成，下一步自动执行从 `v019.4 定价决策` 开始。

---

## 9. 最终交付标准

`v019.8` 完成后，前端应支持最小服务履约闭环体验：

```text
查看客户
↓
模拟需求
↓
创建服务订单
↓
生成报价
↓
确认订单
↓
匹配 Robotaxi
↓
创建 Trip
↓
规划接驾路径
↓
Robotaxi 接驾
↓
乘客上车
↓
规划载客路径
↓
Robotaxi 载客
↓
到达目的地
↓
订单完成
```

同时保留并验证：

1. 运营中心功能可用；
2. Robotaxi 管理可用；
3. 运营投放任务可用；
4. Route 管理可用；
5. 运营行驶记录可用；
6. 新增服务履约记录不混淆运营行驶记录。
