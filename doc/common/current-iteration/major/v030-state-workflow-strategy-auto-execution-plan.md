# v030 状态治理、工作流同源与策略执行闭环自动迭代方案

状态：方案已建立，等待按本文档分版本编码执行。

版本定位：大版本迭代。

核心目标：把业务对象状态、页面筛选、工作流、人工操作、自动模拟和策略执行收敛到同一套简单、清晰、可验证的工程合同。模拟运行必须触发原本人工操作使用的业务能力，不能为模拟单独创造平行逻辑。

---

## 1. 本次必须修复的内容

### 1.1 状态体系不一致

当前问题：

1. 服务订单、履约行驶记录、运营投放任务、运营行驶记录等对象的状态枚举、页面状态筛选、字段字典和工作流状态边分别维护，容易出现同一对象多套状态。
2. 服务订单中保留了部分历史状态，如 `CREATED`、`WAITING_FOR_VEHICLE`、`VEHICLE_ASSIGNED`、`MATCH_FAILED`、`MATCHING_FAILED` 等，但部分已经不参与当前业务功能闭环，容易被误认为当前状态。
3. 履约行驶记录中保留了 `PENDING`、`ASSIGNED`、`ARRIVED_PICKUP`、`PASSENGER_ONBOARD` 等兼容旧状态；当前正常闭环应使用 `WAITING_ROUTE`、`ON_THE_WAY_PICKUP`、`WAITING_CUSTOMER_BOARDING`、`CUSTOMER_ONBOARD`、`ON_THE_WAY_DESTINATION`、`ARRIVED_DESTINATION`、`COMPLETED`。
4. 运营投放任务与运营行驶记录存在 `WAITING_START` 和 `WAITING_ROUTE` 的对象职责混淆：投放任务创建后是“待行驶”，运营行驶记录创建后是“待路径规划”。
5. 页面表单状态分类存在手写数组，不能保证调用对象自身同一来源。

治理原则：

1. 每个对象只有一套底层状态模型。
2. 底层状态模型分为：
   - 当前状态：正常状态；
   - 当前状态：异常状态；
   - 历史状态：兼容旧数据。
3. 最新版本的页面筛选、模拟工作流和新增业务数据只关注当前状态。
4. 历史兼容状态只用于展示旧数据、迁移旧数据或兼容旧入口，不进入新的正常自动化主链。
5. 异常状态不能被误删；当前版本只是暂不自动模拟异常流程，未来会扩展。

### 1.2 工作流与状态源不同步

当前问题：

1. `workflowTransitionRegistry` 独立声明状态边，没有自动校验这些状态是否属于对象当前状态。
2. 工作流时效配置来源于工作流状态边，但如果对象状态发生变更，缺少低成本提醒机制。
3. 模拟系统当前只模拟正常状态，但部分历史或异常状态仍可能被误接入。

治理原则：

1. 工作流状态边必须基于统一状态注册表校验。
2. 当前自动模拟只允许使用当前正常状态。
3. 兼容状态边必须明确标记为历史兼容，不进入时效配置、不进入新模拟正常主链。
4. 异常状态边未来单独扩展，不与当前正常主链混在一起。

### 1.3 人工操作与自动模拟没有完全同源

当前问题：

1. 早期自动模拟存在直接改状态或直接生成结果的情况，容易绕开人工点击本身的业务闭环。
2. 服务订单支付已经在 `v029.4` 开始收敛为共享服务，但价格预估、订单匹配、履约路径规划、运营投放路径规划、行驶推进仍需要继续治理。

治理原则：

1. 人工点击是底层真实业务能力的第一入口。
2. 自动模拟只能调用同一业务服务能力。
3. 服务能力返回结构化结果，由调用方负责更新页面状态池和事件，不允许模拟自己发明业务状态。
4. 新增自动验证必须覆盖人工入口和模拟入口都调用同一服务能力。

### 1.4 路径规划策略没有真实对象化

当前问题：

1. 路径规划策略当前主要由前端行生成，缺少稳定数据池。
2. `RoutePlanningRun` 虽然能生成，但策略、输入快照、输出快照、失败原因和生成 Route 之间的合同还不够硬。
3. 如果路径规划没有成功生成 Route，运营行驶记录或履约行驶记录不应继续进入“行驶中”，Robotaxi 也不应推进位置或计算距离。

治理原则：

1. 路径规划策略必须成为稳定的业务对象或稳定注册表。
2. 每次路径规划必须生成 `RoutePlanningRun`，并明确：
   - 使用的策略；
   - 输入对象；
   - 起点和终点；
   - 规划结果；
   - 失败原因；
   - 生成的 Route。
3. 无成功 Route 不允许进入移动状态。
4. Robotaxi 行驶、距离、耗时和成本必须基于 Route steps，不基于临时猜测。

### 1.5 字段字典与前端展示合同仍需加强

当前问题：

1. 新增字段、状态、枚举后，如果页面局部手写中文或英文兜底，就会再次出现前端显示英文内部值。
2. 状态分类、详情状态时间线和复杂详情必须继续统一通过字段展示服务和字段字典。

治理原则：

1. 新增或调整状态、字段、枚举时，文档字段字典和代码字段字典必须同步。
2. 前端表格、筛选、详情、状态时间线必须走统一字段展示服务。
3. 字段展示合同检查必须覆盖本次新增状态注册表、状态分类和策略执行记录。

---

## 2. 顶层架构方案

### 2.1 新增统一状态注册表

新增 `src/domain/statusRegistry.js`，作为状态事实的集中来源。

建议结构：

```js
export const statusRegistry = {
  serviceOrder: {
    statusField: "order_status",
    current: {
      normal: ["WAITING_PRICE_ESTIMATE", "...", "COMPLETED"],
      exception: ["ROBOTAXI_ASSIGNMENT_FAILED", "WAITING_OPERATION_DECISION", "CANCELLED", "FAILED"],
    },
    legacy: {
      compat: ["CREATED", "WAITING_FOR_VEHICLE", "..."],
    },
  },
};
```

必须提供的查询函数：

|函数|用途|
|---|---|
|`getStatusOptions(objectType, options)`|前端状态分类统一来源|
|`getCurrentStatusValues(objectType)`|当前状态，包含正常和异常|
|`getCurrentNormalStatusValues(objectType)`|当前正常状态，用于自动模拟正常主链|
|`getCurrentExceptionStatusValues(objectType)`|当前异常状态，用于人工异常和未来异常模拟|
|`getLegacyCompatStatusValues(objectType)`|历史兼容状态|
|`isCurrentStatus(objectType, status)`|判断是否当前状态|
|`isCurrentNormalStatus(objectType, status)`|判断是否当前正常状态|
|`isLegacyCompatStatus(objectType, status)`|判断是否历史兼容状态|
|`getStatusField(objectType)`|获取对象状态字段|

首批治理对象：

1. `readinessTask`
2. `deploymentTask`
3. `routeExecution`
4. `serviceOrder`
5. `trip`
6. `simulationRun`
7. `workflowTimingRule`
8. `costCalculationRun`
9. `revenueCalculationRun`

### 2.2 状态分层定义

#### 服务订单 ServiceOrder

当前正常状态：

`WAITING_PRICE_ESTIMATE` → `WAITING_ROBOTAXI_CALL` → `WAITING_ROBOTAXI_ASSIGNMENT` → `ON_THE_WAY_PICKUP` → `WAITING_CUSTOMER_BOARDING` → `CUSTOMER_ONBOARD` → `ON_THE_WAY_DESTINATION` → `ARRIVED_DESTINATION` → `SETTLING` → `WAITING_PAYMENT` → `COMPLETED`

当前异常状态：

`ROBOTAXI_ASSIGNMENT_FAILED`、`WAITING_OPERATION_DECISION`、`CANCELLED`、`FAILED`

历史兼容状态：

`CREATED`、`CALCULATING_PRICE`、`WAITING_CUSTOMER_CONFIRM`、`WAITING_FOR_VEHICLE`、`VEHICLE_ASSIGNED`、`VEHICLE_ON_THE_WAY_TO_PICKUP`、`WAITING_PASSENGER_BOARDING`、`PASSENGER_ONBOARD`、`ON_THE_WAY_TO_DESTINATION`、`MATCH_FAILED`、`MATCHING_FAILED`

特别约束：服务订单主状态没有“已支付”；`PAID / 已支付` 只属于 `payment_status`。

#### 履约行驶记录 Trip

当前正常状态：

`WAITING_ROUTE` → `ON_THE_WAY_PICKUP` → `WAITING_CUSTOMER_BOARDING` → `CUSTOMER_ONBOARD` → `ON_THE_WAY_DESTINATION` → `ARRIVED_DESTINATION` → `COMPLETED`

当前异常状态：

`WAITING_OPERATION_DECISION`、`FAILED`、`CANCELLED`

历史兼容状态：

`PENDING`、`ASSIGNED`、`ARRIVED_PICKUP`、`PASSENGER_ONBOARD`

特别约束：履约行驶记录没有 `SETTLING`；`SETTLING / 结算中` 只属于服务订单。

#### 运营投放任务 DeploymentTask

当前正常状态：

`WAITING_START` → `MOVING` → `ARRIVED` → `COMPLETED`

当前异常状态：

`ARRIVAL_ABNORMAL`、`CANCELLED`、`FAILED`

历史兼容状态：

`WAITING_ROUTE`

特别约束：投放任务创建后是“待行驶”；路径规划状态属于运营行驶记录，不属于投放任务当前主链。

#### 运营行驶记录 RouteExecution

当前正常状态：

`WAITING_ROUTE` → `MOVING` → `ARRIVED` → `COMPLETED`

当前异常状态：

`ARRIVAL_ABNORMAL`、`PAUSED`、`CANCELLED`、`FAILED`

历史兼容状态：

`WAITING_START`

特别约束：运营行驶记录创建后是“待路径规划”；无成功 Route 不得进入 `MOVING`。

#### 运营准入任务 ReadinessTask

当前正常状态：

`WAITING_ASSIGNMENT` → `WAITING_CHECK` → `CHECKING` → `COMPLETED`

当前异常状态：

`CANCELLED`、`FAILED`

历史兼容状态：暂无。

### 2.3 工作流注册表治理

保持 `workflowTransitionRegistry` 作为工作流状态边注册表，但新增校验：

1. `normalWorkflowTransitions` 中所有 `from_status` 和 `to_status` 必须属于对应对象当前正常状态。
2. `projection` 的来源对象和目标对象都必须通过同样校验。
3. `preservedWorkflowTransitions` 只能引用历史兼容状态或异常状态，并且必须 `timing_enabled = false`，默认不进入正常模拟主链。
4. 工作流时效配置只从 `getTimingTransitions()` 获取当前正常状态边。

新增验证脚本：

`scripts/verify-status-workflow-contract.mjs`

检查项：

1. 页面状态分类来源于状态注册表；
2. 工作流正常状态边不引用历史兼容状态；
3. 兼容状态边不进入时效配置；
4. 服务订单没有 `PAID` 主状态；
5. Trip 没有 `SETTLING`；
6. 投放任务不把 `WAITING_ROUTE` 当作当前正常初始状态；
7. 运营行驶记录不把 `WAITING_START` 当作当前正常初始状态。

### 2.4 前端状态分类服务化

前端页面不得继续维护手写状态数组。

必须改为：

1. 状态分类从 `statusRegistry` 获取；
2. 状态中文从字段展示服务获取；
3. 历史状态只在旧数据存在时可被展示为兼容分类，不作为默认筛选主项；
4. 页面表单、状态时间线、筛选项和详情状态字段全部使用同一值字典。

### 2.5 路径规划策略对象化

新增稳定路径规划策略来源：

建议文件：

1. `src/domain/routePlanningStrategies.js`
2. 或 `src/data/routePlanningStrategyInitialization.js`

策略必须覆盖：

|策略编号|策略名称|用途|
|---|---|---|
|`RPS-001`|初始投放路径规划|运营投放任务生成运营行驶路径|
|`RPS-002`|异常同服务区重试路径规划|未来异常到达重试|
|`RPS-003`|服务订单接驾路径规划|履约接驾|
|`RPS-004`|服务订单送达路径规划|履约送达|
|`RPS-005`|服务目的地变更重规划|未来目的地变更|
|`RPS-006`|服务行驶异常重规划|未来服务异常重规划|
|`RPS-007`|服务价格预估路径规划|估价距离与时长|

`routePlanningService` 必须：

1. 根据策略编号读取策略定义；
2. 写入 `strategy_snapshot`；
3. 写入 `input_snapshot`；
4. 写入 `output_snapshot`；
5. 生成 `RoutePlanningRun`；
6. 成功时生成 Route；
7. 失败时写明失败原因，且不推进业务对象到移动状态。

### 2.6 人工与模拟共享业务服务

继续从 `main.jsx` 抽离可复用业务能力，形成服务层。

优先治理服务：

|服务|目标|
|---|---|
|`routePlanningService`|价格预估、投放路径、履约接驾、履约送达统一路径规划|
|`serviceOrderService`|服务订单支付、订单主状态和支付状态分离|
|`tripService`|履约移动、客户上车、客户下车、状态同步|
|`deploymentService`|运营投放路径、行驶、到达确认|
|`simulationHandlers`|只调用共享服务，不直接创造业务逻辑|

服务边界：

1. 服务可以生成业务结果；
2. 服务不得绕过状态注册表写非法状态；
3. 服务不得在路径失败时继续返回成功移动状态；
4. 调用方负责把返回对象合并进运行态数据池；
5. 自动模拟与人工点击的结果结构必须可对比。

---

## 3. 拆分版本计划

### v030.1 状态注册表与状态分类同源

目标：

建立统一状态注册表，让页面状态分类、对象状态字段、字段字典和工作流校验拥有同一入口。

计划修改：

1. 新增 `src/domain/statusRegistry.js`。
2. 前端状态分类从 `statusRegistry` 读取。
3. 补齐字段字典中当前状态、历史兼容状态的中文解释。
4. 新增 `scripts/verify-status-workflow-contract.mjs`。
5. 更新提交前检查脚本。

验收：

1. 页面不再维护业务对象状态分类手写数组；
2. 服务订单、Trip、投放任务、运营行驶记录状态分类与注册表一致；
3. 状态分类展示中文；
4. 工作流正常状态边只使用当前正常状态。

### v030.2 当前状态与历史兼容状态收敛

目标：

清理“当前状态”和“历史兼容状态”的混用，不删除正常异常能力，不破坏旧数据展示。

计划修改：

1. 新增状态规范化函数，旧状态仅按兼容方式展示或迁移到当前状态。
2. 服务订单匹配失败统一使用 `ROBOTAXI_ASSIGNMENT_FAILED`，不再生成 `MATCH_FAILED` 或 `MATCHING_FAILED`。
3. 投放任务新生成状态使用 `WAITING_START`，运营行驶记录新生成状态使用 `WAITING_ROUTE`。
4. Trip 新生成状态只使用当前状态链。
5. 更新校验脚本，禁止新增数据落到历史兼容状态。

验收：

1. 旧数据仍能中文展示；
2. 新模拟和人工操作不再生成历史兼容状态；
3. 异常状态仍保留；
4. 服务订单主状态与支付状态不混用；
5. Trip 不出现服务订单的结算状态。

### v030.3 路径规划策略对象化与执行记录闭环

目标：

让路径规划策略、路径规划执行记录和 Route 形成真实闭环。

计划修改：

1. 新增稳定路径规划策略数据源。
2. 路径规划策略页面读取真实策略数据，不再仅由前端临时拼行。
3. `routePlanningService` 所有路径规划函数写入策略快照、输入快照、输出快照。
4. 路径规划失败时，业务对象不得进入移动状态。
5. 增加路线生成和失败闭环验证。

验收：

1. 人工价格预估、人工投放路径、人工履约路径规划都生成 `RoutePlanningRun`；
2. 自动模拟同样生成 `RoutePlanningRun`；
3. 每条移动中的 Trip 或 RouteExecution 必须有成功 Route；
4. 无 Route 时 Robotaxi 不移动、不计算距离。

### v030.4 人工操作与自动模拟服务同源

目标：

把核心业务操作继续从页面事件中收敛到服务层，让模拟执行引擎只调用同源能力。

计划修改：

1. 价格预估、订单匹配、履约路径规划、履约移动、投放路径规划、投放移动、支付继续服务化。
2. 人工入口和模拟 handler 共用同一服务。
3. 自动模拟执行结果写入统一事件和业务对象池。
4. 修复因自动模拟绕过策略导致的路径、位置、距离、成本输入缺失。

验收：

1. 关键人工操作和模拟操作共享服务引用；
2. 自动模拟能产出路径、定价、匹配、履约、投放、支付的事实数据；
3. 排空阶段仍执行已触发工作流直到完成；
4. 成本和收入计算不会因缺路径、缺距离、缺订单关系漏算。

### v030.5 前端展示、验证与归档

目标：

完成前端中文展示、字段字典、复杂详情、页面加载和版本归档。

计划修改：

1. 更新 `VERSION.md`。
2. 更新当前大版本入口。
3. 编译 `src/main.bundle.js`。
4. 执行语法、字段展示、状态工作流、策略执行、核心模拟、页面加载验证。
5. 提交并打标签。

验收：

1. 页面无白屏；
2. 关键页面状态筛选中文；
3. 控制台无新增错误；
4. `1280 x 720` 与 `1440 x 900` 视觉和交互检查通过；
5. Git 提交和 tag 完成。

---

## 4. 自动化执行顺序

1. 写入本方案文档。
2. 执行 `v030.1`：状态注册表、页面状态分类、状态工作流合同验证。
3. 执行 `v030.2`：当前状态与历史兼容状态收敛。
4. 执行 `v030.3`：路径规划策略对象化和执行记录闭环。
5. 执行 `v030.4`：人工操作与自动模拟服务同源。
6. 执行 `v030.5`：前端验证、版本文档、提交、tag 和归档。

---

## 5. 暂停条件

自动执行过程中如果出现以下情况，必须暂停并说明：

1. 发现某个历史兼容状态仍被当前人工功能真实使用，且无法安全归类；
2. 路径规划策略对象化需要改变现有初始化数据结构并影响大范围页面；
3. 人工操作闭环本身不完整，模拟无法通过调用共享服务完成；
4. 页面验证出现白屏、核心路径不可用或无法自动修复；
5. 需要修改历史归档文件；
6. 需要纳入当前未跟踪的指标目录或其他用户未提交内容。

---

## 6. 不纳入本大版本的内容

1. 完整经营指标体系建模；
2. 异常自动模拟全流程；
3. 多策略优选算法；
4. 财务利润、ROI 和预测模型；
5. 真实地图导航算法。

这些内容只作为后续版本前置能力，不在 `v030` 中提前编码。
