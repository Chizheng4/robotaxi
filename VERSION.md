# Robotaxi 版本记录

本文档用于记录每个版本的核心变化，便于后续对比、回退和继续迭代。

## v024 计划

核心：启动 v024 大版本，打通 Simulation 自动运营全链路。

- 当前 Tick 可推进时间但不产生业务数据（ExecutionEngine 15 个 handler 为 null，WorkflowEngine 未接入）。
- 拆分为 4 个子版本：注册 handler → 需求订单链路 → 匹配履约支付链路 → 供给侧 + 端到端验证。
- 新建 `simulationHandlers.js` 提取纯数据处理函数，供 ExecutionEngine 注册。

## v023.10

核心：Simulation 前端中文显示全覆盖，补齐嵌套对象字段字典。

- `fieldDictionary.js` 补齐 simulation 全部字段标签（`fieldDictionary`）和枚举值（`valueDictionary`），含 38 个子对象字段。
- `simulationEngine.js` 事件消息英译中。
- `main.jsx` 补全 `isStatusField` 列表，simulation 状态值正确走中文映射。
- 规则明确：两个字典文件必须同步更新，嵌套子对象字段不可遗漏。

## v023.9

核心：修复 Simulation 前端白屏、补齐 UX 布局、补全字段字典、重构规则体系。

- 修复白屏问题：
  - `tripService.js`：`import { tripTypes }` 改为 `import * as tripTypes`，修复动态 import 失败。
  - `main.jsx`：补全 bootstrap 中 simulation 模块的解构变量（缺 5 个变量导致 ReferenceError）。
  - `main.jsx`：删除孤立的 `}, [simActions]);` 残留代码。
- 补齐 Simulation 页面 UX 布局：
  - 模拟运行管理：新增「创建模拟运行」全局操作按钮。
  - 模拟运行管理：新增行操作列（启动/暂停/继续/停止）。
  - 三个 simulation 页面：新增状态筛选栏。
  - 详情面板：collections 映射补充 simulation 类型，新增 Tab 化详情（策略 6 tab / 运行 5 tab / 事件 2 tab）。
  - `hasEventPanel`：simulation 页面加入底部事件日志区。
- 补全字段字典：
  - 新增 SimulationPolicy（30+ 字段）、SimulationRun（20+ 字段）、SimulationEvent（16 字段）三个对象章节。
  - 新增 60+ 个 simulation 枚举值中文映射（SimulationStatus、PolicyStatus、RunSpeedLevel、EventType 等）。
- 重构规则体系（模型通用、平台无关）：
  - `AGENTS.md` 重写为唯一权威入口：强制规则 + 完成自检清单，不提任何具体工具名。
  - `doc/iteration-rules.md` 简化，引用 AGENTS.md。
  - `doc/rules/00-rule-index.md` 去掉任务分类，所有编码任务统一必读列表。
  - `doc/rules/01-iteration-workflow.md` 第 5 步改为强制字段字典检查，新增第 11 步完成自检清单。
  - `doc/rules/03-field-dictionary-rules.md` 新增每轮编码结束强制检查。
  - `doc/rules/04-frontend-ux-rules.md` 新增适用范围声明：所有编码任务必须遵守。
  - `doc/rules/05-codex-execution-rules.md` 补充禁止跳过强制文件和自检清单。
  - 删除冗余文件 `PROJECT_ITERATION_RULES.md`。
- 工程优化：
  - `start-robotaxi.command`：每次启动自动编译 bundle + 注入动态版本号 + 自定义 Python 服务器发送 no-cache 响应头。

## v023.8

核心：前端 Simulation 页面可交互使用。

- 新增 `src/services/simulationActions.js`：SimulationRun 控制 Hook（创建/启动/暂停/停止 + Tick 循环）。
- `main.jsx` 集成：
  - 导入 simulationLoop、simulationActions 模块。
  - 新增 simulationPolicies/simulationRuns/simulationEvents 的 tableConfig、rowsByPage、pageObjectType。
  - 新增「自动运营模拟」菜单（模拟规则配置、模拟运行管理、模拟事件记录）。
  - 重置运行时同步清除模拟状态。
  - SimulationRun 启动后自动以 500ms 间隔推进 Tick，产生 SimulationEvent。
- 前端可完整操作：
  - 页面加载后自动初始化默认 SimulationPolicy。
  - 模拟运行管理页面可创建 SimulationRun、启动/暂停/停止、查看实时 Tick 进度和事件。

## v023.7

核心：v023 大版本归档收口。

- 将 `v023-auto-execution-plan.md` 从当前大版本目录归档到历史大版本目录。
- 将当前大版本入口恢复为暂无进行中的大版本计划。
- 保留 v023.1 至 v023.6 的代码、文档和版本记录，便于后续对比和回退。
- 完成自动运营模拟系统核心框架的版本收口。

## v023.6

核心：前端 Monitor 页面基础集成。

- 在 `main.jsx` 中导入 simulationTypes、simulationInitialization、simulationEngine 模块。
- 新增 React state：simulationPolicies、simulationRuns、simulationEvents。
- 新增菜单项「自动运营模拟」：模拟规则配置、模拟运行管理、模拟事件记录。
- Simulation 模块已完全可被前端调用，后续可在此基础上构建完整 Monitor UI。

## v023.5

核心：WorkflowEngine 规则引擎 + ExecutionEngine 动作分发器。

- 新增 `src/data/simulationWorkflowEngine.js`：业务单据流转规则表（ServiceOrder/Trip/ReadinessTask/RouteExecution），queryWorkflowRules / queryAllWorkflowRules 查询接口。
- 新增 `src/data/simulationExecutionEngine.js`：动作分发器，15 个动作类型→业务函数映射表，registerActionHandler / executeAction / executeActions 接口。P0 函数待运行时注入，P1-P3 占位待后续子版本补齐。

## v023.4

核心：SimulationLoop + SupplyTrigger + DemandTrigger。

- 新增 `src/data/simulationSupplyTrigger.js`：供给侧触发判断（准入/投放/RouteExecution），按时间窗口和配置开关决定是否触发。
- 新增 `src/data/simulationDemandTrigger.js`：需求侧触发判断，Poisson/Fixed/Uniform 分布生成 Tick 订单数量。
- 新增 `src/data/simulationLoop.js`：Tick 主循环编排（executeTick），14 步执行顺序，汇总 Tick 摘要。

## v023.3

核心：SimulationRun 生命周期管理 + SimulationClock 时间上下文 + SimulationEvent 记录。

- 扩展 `simulationTypes.js`：新增 `createSimulationRun`、`createSimulationEvent` 工厂函数。
- 新增 `src/data/simulationClock.js`：computeTimeContext（时间段/窗口/高峰识别）、advanceTick（时间推进）、updateSimulationRunScene（场景更新）。
- 新增 `src/data/simulationEngine.js`：SimulationRun 生命周期管理（init/start/pause/resume/stop/completeTick）、SimulationEvent 记录、Tick 完成判断。

## v023.2

核心：SimulationPolicy 类型定义、默认初始化与校验。

- 新增 `src/domain/simulationTypes.js`：定义 SimulationStatus、PolicyStatus、TimePeriod、PeriodType、DistributionType 等枚举及中文标签，含 createDefaultSimulationPolicy 等工厂函数。
- 新增 `src/data/simulationInitialization.js`：生成默认 SimulationPolicy（1天、10分钟Tick、9个 DemandProfile、完整时间窗口覆盖）。
- 新增 `src/data/simulationValidation.js`：实现 20 条配置完整性校验规则。
- 更新字段字典：新增 simulationPolicy / simulationRun / simulationEvent 对象及 70+ 个字段中文映射。

## v023.1

核心：提取 P0 业务函数为独立服务模块，供 UI 和 Simulation System 两条路径复用。

- 新增 `src/services/serviceOrderService.js`：提取 `executePricing`（价格预估）和 `executeOrderMatching`（订单匹配）。
- 新增 `src/services/tripService.js`：提取 `getNextTripMovementState`（Trip 行驶步数推进）和 `getNextTripState`（Trip 状态跳转）。
- 修改 `main.jsx` 中 `estimateServiceOrderPrice`、`matchServiceOrder`、`advanceTrip` 改为调用服务函数。
- 删除 `main.jsx` 中已迁移的本地函数定义，保留通用辅助函数。

## v023 计划

核心：启动 v023 大版本自动执行计划，构建自动运营模拟系统。

- 完成 Simulation System 方案设计文档（`doc/08-simulation-system/`），含 18 份设计文件。
- 三大模块：01-simulation-runtime（时间与事件）、02-workflow-engine（业务单据闭环流转规则）、03-execution-engine（动作分发器）。
- 确立核心原则：模拟系统只驱动、不重写业务；数据沙箱隔离；Monitor 页面只启停控制不操作业务对象。
- 制定 v023.1-v023.7 七个子版本自动执行计划，首个子版本为业务函数提取。

## v022.6.1

核心：修复服务订单结算闭环断点。

- 新增服务订单结算纯逻辑模块，统一生成结算输入、最终费用计算和订单写回结果。
- 服务订单结算严格使用履约行驶记录沉淀的实际距离和实际时长，不再用报价金额兜底。
- 服务订单管理补充履约记录、实际距离、实际时长、最终价格和最终定价结果等结算字段。
- 服务订单创建、价格预估、呼叫、履约、结算和支付操作写入最近事件记录。
- 增加服务订单结算闭环代码级验证，并纳入提交前检查。

## v022.6

核心：记录服务订单结算闭环断点，并固化下一步修复计划。

- 增加启动清理运行态缓存机制，降低浏览器残留数据对测试的影响。
- 为服务订单结算入口增加断点日志，定位按钮、状态、定价和写回链路。
- 将服务订单结算闭环修复要求写入当前小版本迭代文件。
- 下一步将严格按履约行驶记录的实际距离、最终费用策略输入和服务订单事件记录修复闭环。

## v022.5

核心：归档 v022 大版本自动执行计划，完成本轮体验优化收口。

- 执行最终提交前检查，确认当前项目通过校验。
- 将 `v022-auto-execution-plan.md` 从当前大版本目录归档到历史大版本目录。
- 将当前大版本入口恢复为暂无进行中的大版本计划。
- 保留 v022.1 至 v022.4 的计划、代码、字段字典和版本记录，便于后续对比和回退。

## v022.4

核心：优化履约行驶记录的距离、路径和事件展示。

- 履约行驶记录距离展示改为汇总当前路径和历史路径信息。
- 服务订单同步使用同一套履约距离口径。
- 履约行驶记录详情增加路径历史详情，便于同时查看当前路径和历史路径。
- 履约行驶事件补充事件消息字段，并将事件消息放在事件结果之后。
- 运营任务事件字段顺序同步调整为事件类型、事件结果、事件消息、关联对象。
- 同步更新统一字段字典和前端 bundle。

## v022.3

核心：修复服务订单结算与支付闭环。

- 服务订单表格和详情改为展示履约总距离、履约已行驶距离、履约剩余距离。
- 服务订单和订单匹配结果补充 Robotaxi 当前位置摘要与详情。
- 结算操作合并关联履约行驶记录的距离和耗时，再调用最终费用计算策略。
- 最终费用计算优先使用价格预估阶段的报价快照，避免后续策略参数变化影响结算。
- 客户下车后履约行驶记录进入已完成，服务订单进入结算中。
- 待支付操作按钮改为 `立即支付`。

## v022.2

核心：统一订单匹配、履约行驶和路径规划结果的前端命名。

- `Route 管理` 改为 `路径规划结果`，并移动到 `运营决策中心 / 路径规划管理` 下。
- `匹配执行管理` 改为 `订单匹配执行`，`匹配决策管理` 改为 `订单匹配结果`。
- `服务履约记录` 面向前端统一改为 `履约行驶记录`。
- 运营准入状态显示改为 `待分配`、`待检查`，支付状态显示改为 `待支付`。
- 履约行驶记录状态筛选隐藏历史无效状态，保留底层兼容枚举。
- 同步更新统一字段字典和前端 bundle。

## v022.1

核心：启动 v022 大版本自动执行计划。

- 新增 `v022-auto-execution-plan.md`，整理订单匹配、服务订单、履约行驶记录和路径规划结果的连续迭代计划。
- 明确本轮以节省 Codex 使用量为执行原则：少重复分析、少无关扫描、按子版本连续推进。
- 将 `major-current-iteration.md` 改为指向 v022 自动执行计划。
- 明确命名口径：订单匹配结果、履约行驶记录、履约行驶事件、路径规划结果。
- 明确业务假设：客户下车后履约行驶记录完成，结算中和待支付属于服务订单状态。

## v021.6

核心：归档 v021 大版本自动执行计划，完成本轮闭环收口。

- 将 `v021-auto-execution-plan.md` 从当前大版本迭代目录归档到历史大版本目录。
- 将当前大版本入口恢复为暂无进行中的大版本计划。
- 保留 v021.1 至 v021.5 的代码、文档和校验记录，便于后续对比和回退。
- 完成路径步骤、价格预估与最终费用闭环优化阶段的版本收口。

## v021.5

核心：补齐服务订单价格预估与最终计费的校验闭环。

- 定价校验区分预估定价和最终计费，不再把最终计费误判为预估报价。
- 预估定价校验会检查服务订单预估决策引用和价格预估 Route 引用。
- 最终计费校验会检查服务订单最终计费决策引用和最终金额有效性。
- 服务订单校验新增价格预估 Route、预估价格决策和最终价格决策的引用检查。
- 上车位置校验支持客户需求位置已在服务区内时直接作为上车点。

## v021.4

核心：补齐服务履约记录的执行事件辅助区。

- 服务履约记录页面加入底部“履约执行事件”表格，用于展示 Trip 内部 `event_log`。
- 将 Trip 事件转换为统一表格记录，包含事件时间、事件类型、履约记录、服务订单、Robotaxi、Route、Cell 和状态变化。
- 补齐履约事件字段和值的中文展示，避免事件表出现英文字段名。
- 保持运营行驶记录按任务事件展示，服务履约记录按自身执行事件展示。

## v021.3

核心：收口 Route 指标边界，避免 Route 直接承担行驶时间表达。

- Route 详情中的路径指标不再展示预计时间，只保留距离和关联服务区等路径事实。
- 新生成的运营行驶 Route、服务履约 Route 和价格预估 Route 不再写入 `estimated_time_s`。
- 初始化 Route 的 `estimated_time_s` 写入逻辑移除，保持 Route 只负责路径和距离。
- 保持 Pricing 仍可基于 Route 距离自行估算价格预估时长。

## v021.2

核心：收紧前端状态筛选和移动步数语义，补齐需求模拟上车点规则。

- 状态筛选改为按页面白名单展示，避免当前数据中的旧状态重新出现在筛选栏。
- 将运营行驶和运营投放中的 `WAITING_START` 中文展示统一为“待行驶”。
- 服务履约到达目的地或进入结算时，即写入服务订单实际距离和实际耗时，供最终费用计算使用。
- 需求模拟中客户需求位置已属于可用 ServiceArea 时，上车位置直接等于客户需求位置。
- 初始化 Route 的 `total_step_count` 改为移动步数，即 `route_steps.length - 1`。
- 同步更新 RouteExecution 和 Trip 文档中的 step 语义说明。

## v021.1

核心：启动 v021 大版本并落地 Route、价格预估与最终费用的第一轮闭环。

- 新增 `v021-auto-execution-plan.md`，明确路径步骤、价格预估和最终费用闭环的连续迭代计划。
- 更新迭代规则，明确大版本需求可来自方案文档或 `major-current-iteration.md`，并必须整理为独立自动执行计划文件。
- Route 增加路径用途类型，支持区分价格预估路径、运营行驶路径、服务接驾路径和服务送达路径。
- 服务订单价格预估先生成一条价格预估 Route，再用该 Route 的距离生成定价结果。
- 新增基础最终费用计算策略，服务订单结算不再直接复用客户报价。
- 修正 Route step 口径：起点保留在 `route_steps[0]`，前端展示移动步数为 `route_steps.length - 1`。
- 清理前端菜单和状态筛选，服务订单管理前置于客户管理，路径规划执行命名更贴近真实运营。
- 同步更新统一字段字典、Route 文档、Pricing 文档和项目代理规则文件。

## v020.6.2

核心：强化 Major / Minor 完成后的强制归档规则。

- 明确大版本和小版本完成并形成稳定版本时，归档是完成条件，不是可选整理动作。
- 明确自动执行计划最后一个子版本必须包含对应归档收口。
- 更新提交前检查规则，要求 current 目录不能遗留已完成计划。

## v020.6.1

核心：归档已完成的 v020 大版本自动执行计划。

- 将 `v020-auto-execution-plan.md` 从当前大版本迭代目录移动到历史大版本归档目录。
- 新增当前大版本迭代占位文件，明确当前暂无进行中的大版本计划。
- 更新迭代规则入口，使当前大版本文件路径明确，避免已完成计划被误读为当前计划。

## v020.6

核心：调整运营投放任务与运营行驶记录的职责边界。

- 运营投放任务生成后进入“等待行驶”，并同步创建一条“待路径规划”的运营行驶记录。
- 运营投放任务不再直接提供“路径规划”，只提供“查看行驶记录”。
- 运营行驶记录负责执行路径规划，规划成功后直接进入“行驶中”，不再需要“开始行驶”。
- 行驶记录在状态变化后自动切换到对应状态分类，避免操作成功后列表为空。
- 校验规则同步调整：等待行驶任务必须有关联行驶记录，行驶中及后续状态才要求已有 Route。
- 增加 Robotaxi 服务订单与运营任务互斥校验。

## v020.5

核心：补齐服务订单结算与支付的最小闭环。

- 服务订单支持“结算中”状态下执行“结算”操作。
- 结算后进入“待支付”，并写入最终价格。
- 待支付状态支持“支付”操作。
- 支付后服务订单进入“已完成”，支付状态进入“已支付”。
- 支付完成后同步完成服务履约记录，并释放 Robotaxi 的服务订单占用。

## v020.4

核心：统一服务履约记录的路径规划与行驶语义。

- 服务履约记录创建后进入“待路径规划”，不再直接显示“开始接驾”。
- 将服务履约操作调整为“路径规划 / 继续行驶 / 确认上车 / 客户下车”。
- 前往上车点和前往目的地统一使用“继续行驶”推进。
- 到达上车点后进入“待客户上车”，确认后进入“客户已上车”。
- 客户已上车后再次通过“路径规划”生成前往目的地的路径。
- 到达目的地后“客户下车”，服务订单和履约记录进入“结算中”。

## v020.3

核心：升级服务订单状态机与报价快照。

- 新建服务订单进入“待估价”，价格预估后进入“待呼叫 Robotaxi”。
- 将服务订单操作统一为“价格预估 → 立即呼叫 Robotaxi → 分配 Robotaxi → 查看履约记录”。
- 价格预估后写入报价快照字段：报价起步价、报价距离单价、报价时间单价、预估距离、预估时长和客户报价。
- 分配失败进入“分配 Robotaxi 失败”，并保留“分配 Robotaxi”操作用于重复尝试。
- 加入旧本地运行态订单状态迁移，避免旧缓存订单显示为空状态。
- 更新服务订单校验，支持需求模拟结果引用和新订单状态。

## v020.2

核心：实现需求模拟与动态定价的运营决策中心结构调整。

- 将需求模拟从需求订单管理迁移到运营决策中心，形成“需求模拟策略 / 需求模拟执行 / 需求模拟结果”三级菜单。
- 新增需求模拟结果页面，服务订单创建后可查看对应 `DemandSimulationResult` 记录。
- 服务订单创建流程写入 `demand_simulation_result_id`，让订单能反查本次需求模拟结果。
- 移除前端独立“生成模拟需求”按钮，需求模拟只由服务订单创建流程调用。
- 将定价菜单和对象命名统一为“动态定价管理 / 定价执行 / 定价结果”。

## v020.1

核心：统一 v020 服务闭环文档口径和字段字典。

- 补充 `DemandSimulationResult`，明确需求模拟采用 Strategy → Run → Result 结构。
- 明确服务订单报价快照字段，客户已看到的报价不受后续策略或结果变化影响。
- 明确 Robotaxi 服务订单与运营任务互斥，服务订单占用优先级最高。
- 更新 ServiceOrder、Trip、DeploymentTask 和 RouteExecution 的职责边界与状态语义。
- 更新统一字段字典，加入需求模拟结果、报价快照、服务订单状态、服务履约状态和中文显示口径。

## v020

核心：建立 v020 大版本自动执行计划和文档差异驱动迭代规则。

- 新增 `doc/common/current-iteration/major/v020-auto-execution-plan.md`，明确服务订单与 Robotaxi 行驶闭环结构升级计划。
- 将 v020 拆分为 `v020.1` 至 `v020.6`，覆盖文档字典、需求模拟、动态定价、服务订单、服务履约、结算支付、运营投放和运营行驶职责调整。
- 新增 `doc/rules/06-document-driven-iteration-rules.md`，固化“用户更新文档 → Git diff 分析 → 用户确认 → 自动执行”的低成本迭代协议。
- 更新规则入口和规则索引，使后续 Codex 默认按文档差异确定阅读范围，减少重复扫描和重复分析。

## v019.8.2

核心：整理迭代规则并优化前端工作台体验。

- 将项目迭代规则整理为 `doc/iteration-rules.md` 入口和 `doc/rules/` 分模块规则文件。
- 将根目录 `PROJECT_ITERATION_RULES.md` 改为迁移说明，避免规则源分散。
- 新增紧凑型工作台页签，支持多个业务页面快速切换。
- 页面状态按菜单页独立保留，包括筛选条件、分页、选中记录和详情展开状态。
- 优化页签视觉、间距、单行约束和选中态，使其更符合当前运营后台风格。
- 去除中间业务区和右侧详情区多余内边距，使两侧顶部、底部对齐并节省业务空间。
- 将本轮小版本迭代内容归档至 `doc/common/iteration-history/minor/`。

## v019.8.1

核心：调整迭代管理文档结构。

- 新增 `doc/iteration-rules.md`，作为迭代规则唯一入口。
- 将已完成的 `v019-auto-execution-plan.md` 从旧位置迁移并归档至 `doc/common/iteration-history/major/`。
- 新增 `doc/common/current-iteration/minor/minor-current-iteration.md` 作为当前小版本迭代占位文件。
- 统一 `current-iteration` 命名，修正原 `current-teration` 拼写。
- 本版本只调整迭代管理文档，不修改业务代码或前端功能。

## v019.8

核心：实现服务履约异常与重规划最小闭环。

- 新增 `RPS-005` 服务订单目的地变更重规划策略和 `RPS-006` 服务路径异常重规划策略。
- 服务履约记录在 `载客中` 状态支持 `变更目的地` 和 `路径异常` 操作。
- 重规划成功后生成新的 Route 与 RoutePlanningRun，并追加 Trip 的 `route_history`。
- 目的地变更成功后更新 Trip 当前下车位置和当前路径，不改变订单历史创建信息。
- 重规划失败时 Trip 与 ServiceOrder 进入 `等待运营决策`，Robotaxi 停止且保持订单占用，不强行闭环。
- 补齐异常类型、等待运营决策、RPS-005 / RPS-006 的中文字段和值展示。

## v019.7

核心：让 Trip 服务履约接入路径规划。

- 新增 `RPS-003` 服务订单接驾路径规划策略和 `RPS-004` 服务订单载客路径规划策略。
- Trip 执行 `开始接驾` 时生成接驾 Route 与 RoutePlanningRun，并写入 Trip 当前路径和路径历史。
- Trip 执行 `开始载客` 时生成载客 Route 与 RoutePlanningRun，并写入 Trip 当前路径和路径历史。
- Route、RoutePlanningRun 支持反查 ServiceOrder 与 Trip，Route 管理页可查看服务履约相关路径。
- Trip 校验增加 Route、RoutePlanningRun、route_history 策略一致性和路径起终点校验。
- Route 详情和 Trip 详情补充服务订单、Trip、路径摘要和路径详情展示。

## v019.6

核心：实现 Trip 服务履约最小闭环。

- 新增 Trip 类型和服务履约校验规则，明确 Trip 独立于运营行驶记录 RouteExecution。
- 订单匹配成功后自动创建服务履约记录，并绑定 ServiceOrder 与 Robotaxi。
- 在 `Robotaxi 管理 / 行驶记录管理` 下启用 `服务履约记录` 页面，支持状态筛选、表格操作和右侧详情。
- 服务履约记录支持 `开始接驾`、`到达上车点`、`乘客上车`、`开始载客`、`到达目的地`、`完成服务` 的最小人工推进。
- Trip 推进会同步更新 Robotaxi 的当前位置、运动状态、订单占用状态和可派状态。
- Trip 推进会同步反馈 ServiceOrder 的服务阶段状态，完成后写入实际距离、实际时长和完成时间。
- 补齐 Trip、ServiceOrder 履约阶段字段和值的中文展示，并更新统一字段字典。

## v019.5

核心：实现服务订单到 Robotaxi 的订单匹配闭环。

- 新增 OrderMatchingStrategy、OrderMatchingRun、OrderMatchingDecision 类型、初始化策略、匹配引擎和校验规则。
- 在 `运营决策中心` 下新增 `订单匹配管理`，包含订单匹配策略、匹配执行管理、匹配决策管理。
- 初始化 `OMS-001` 最近可用车辆匹配策略，使用 `BASIC_NEAREST_AVAILABLE_ROBOTAXI`。
- 服务订单支持从 `等待客户确认` 执行 `客户确认`，进入 `等待车辆匹配`。
- 服务订单支持 `订单匹配`，成功后写入匹配 Robotaxi 和匹配决策编号，订单进入 `车辆已分配`。
- Robotaxi 匹配成功后写入 `current_order_id`，避免重复参与其他服务订单匹配。
- 匹配失败时生成失败的执行记录和决策记录，订单进入 `匹配失败`。
- 补齐订单匹配字段、状态和值的中文展示，并更新统一字段字典。
- 当前版本不创建 Trip，Trip 服务履约留到 v019.6。

## v019.4

核心：实现基础定价决策闭环。

- 新增 PricingStrategy、PricingStrategyRun、PricingDecision 类型、初始化策略、定价引擎和校验规则。
- 在 `运营决策中心` 下新增 `定价管理`，包含定价策略、定价执行管理、定价决策管理。
- 初始化 `DPS-001` 基础动态定价策略，使用 `BASIC_RULE_BASED_DYNAMIC_PRICING`。
- 服务订单在 `订单已创建` 状态下支持 `价格预估` 操作。
- 价格预估生成 PricingStrategyRun 与 PricingDecision，并把报价、预估距离、预估时长、价格说明和定价决策编号写回 ServiceOrder。
- 定价成功后 ServiceOrder 进入 `等待客户确认`，不生成正式可执行 Route，不改变 Robotaxi 或 Trip。
- 补齐定价相关字段和值的中文展示，并更新统一字段字典。

## v019.3

核心：实现 ServiceOrder 创建闭环。

- 新增 ServiceOrder 类型定义、运行态数据、校验规则和 `需求订单管理 / 服务订单管理` 页面。
- 服务订单页面支持 `创建自有平台服务订单` 与 `创建外部平台服务订单`。
- 创建订单时调用 `DSS-001` 需求模拟策略，先生成 DemandSimulationRun，再由订单模块使用成功结果创建 ServiceOrder。
- ServiceOrder 创建后保持 `订单已创建` 状态，不提前进入定价、匹配或 Trip 阶段。
- 服务订单详情按订单信息、需求位置、定价信息、匹配履约、状态时间分组展示。
- 补齐 ServiceOrder 字段、状态和支付状态的中文字典与校验规则。

## v019.2

核心：实现需求模拟策略与需求模拟执行记录。

- 新增 DemandSimulationStrategy、DemandSimulationRun 类型定义、初始化策略、执行算法和校验规则。
- 初始化 `DSS-001` 基础随机需求模拟策略，使用 `BASIC_WEIGHTED_RANDOM_SAMPLING`。
- 在 `需求订单管理` 下新增 `需求模拟策略` 页面，支持查看策略对象。
- 新增 `生成模拟需求` 操作，随机选择 ACTIVE Customer，生成客户需求位置、上车点和下车点上下文。
- 需求模拟执行记录在页面下方展示，包含客户、订单来源、需求位置、上车服务区、上车位置、下车服务区和下车位置。
- 需求模拟不创建 ServiceOrder，只输出订单创建上下文。
- 补齐需求模拟相关字段和枚举的中文显示，避免策略类型、算法和执行记录字段直接显示英文。
- 前端验证通过：可生成 DSR 执行记录，执行结果成功，引用客户和服务区有效。

## v019.1

核心：实现 Customer 初始化与客户管理页面。

- 新增 Customer 类型定义、初始化数据和校验规则，按文档生成 54 个模拟客户。
- 新增 `需求订单管理 / 客户管理` 菜单与客户列表页面。
- 客户列表支持状态分类、关键词查询、表格展示、右侧详情和底部记录说明。
- 客户字段和状态接入前端字段字典，展示为中文运营语义。
- 初始化校验新增 Customer 数量、编号、状态、默认渠道和无实时位置字段检查。
- 前端验证通过：客户管理页显示 54 条记录，ACTIVE 50 条，TEST_ONLY 4 条，点击客户可查看中文详情。

## v019.0

核心：固化 v019.x 自动执行控制计划。

- 新增 `doc/common/v019-auto-execution-plan.md`，记录 v019.1 至 v019.8 的连续自动迭代计划。
- 明确 v019 阶段总体交付目标：Customer、需求模拟、ServiceOrder、定价、订单匹配、Trip、路径规划和服务履约完成闭环。
- 为每个小版本定义目标、交付范围、不做内容和验收标准。
- 明确自动执行规则、暂停询问规则、版本记录规则和最终交付标准。
- 当前执行指针设置为 `v019.1 Customer 基础`，用于后续进入代码迭代。

## v019

核心：新增需求订单与服务履约方案设计，并集中统一字段字典和策略职责边界。

- 新增 `04-demand-order` 文档目录，定义 Customer、ServiceOrder 与客户初始化方案。
- 新增 Trip 服务履约记录文档，明确 Trip 是服务订单履约执行记录，不复用运营任务 RouteExecution。
- 新增 DemandSimulationStrategy、PricingDecision、OrderMatchingDecision 方案设计，为后续需求模拟、定价、匹配和服务订单闭环预留结构。
- 扩展 RoutePlanningStrategy，支持运营任务与服务订单两类路径规划场景，并新增 RPS-003 至 RPS-006 服务订单相关策略设计。
- 明确 RoutePlanningStrategy 只是可调用路径规划能力，不直接改变 Task、ServiceOrder、Trip、RouteExecution 或 Robotaxi 状态。
- 明确 RoutePlanningRun 由路径规划服务层记录，调用方负责创建 / 更新 Route 与业务对象状态。
- 扩展统一字段字典，补齐 Customer、ServiceOrder、Trip、需求模拟、定价、订单匹配、订单状态和服务履约状态等字段与中文显示。
- 统一 Customer.default_order_channel 与 ServiceOrder.order_channel 的字段边界，避免客户渠道偏好和本次订单来源混用。
- 明确价格预估可以调用路径估算能力，但不默认生成可执行 Route，也不改变订单、履约或车辆状态。

## v018

核心：统一字段字典，升级路径规划为 BFS 网格图搜索，并修正投放任务目标语义。

- 新增 `doc/common/field-dictionary.md` 作为全系统统一字段字典，原空间模型和运营中心字段字典改为迁移说明。
- RoutePlanningStrategy 明确为可被调用的路径规划服务，只接收输入并返回规划结果，不直接改变 Task、RouteExecution 或 Robotaxi 状态。
- 路径规划策略和策略执行记录新增 `planning_algorithm`，当前统一为 `BFS_CELL_GRAPH`。
- 运营投放 Route 生成由简单道路片段拼接升级为基于 RoadSegment 有序 Cell、通行方向和道路状态的 BFS Cell Graph。
- 异常到达重规划支持在同一 DeploymentTask / RouteExecution 内多次循环，直到正常到达或同服务区无可用替代目标。
- 当同 ServiceArea 内没有可用替代目标时，RoutePlanningRun 记录失败，DeploymentTask 暂停在 `ARRIVAL_ABNORMAL` 等待后续运营决策闭环。
- 修正 `planned_target_*` 语义：计划目标保持任务创建时的原始目标，异常重规划只更新 `target_*` 当前目标和实际到达字段。
- 策略执行管理页面按统一对象列表布局补齐状态分类和底部统计，支持按规划结果查看成功 / 失败记录。
- 更新 DeploymentTask、RouteExecution、RoutePlanningStrategy 文档，补齐计划目标、当前目标、实际目标和异常重规划失败边界。

## v017

核心：完善路径规划输出、Route 管理和行驶记录管理结构。

- RoadSegment 增加 `cell_sequence`、`allowed_direction`、`total_distance_km`，明确道路片段是有序、连续、有方向的可通行结构。
- ServiceArea 升级为能力 Cell 模型，支持上车、下车、临停、停车、待命、占用和不可用点位表达。
- Route 保持 `start_cell_id / end_cell_id / road_segment_sequence`，新增 `route_steps`，作为 RouteExecution 推进的可执行路径步骤。
- 新增 RoutePlanningRun 路径规划执行记录对象，用于记录每次路径规划策略执行过程。
- 路径规划管理页面下方记录由 TaskEventLog 派生改为展示 RoutePlanningRun。
- Route 从地图空间静态对象迁移为路径规划输出结果，初始化阶段不再生成静态 Route。
- Route 管理迁入 Robotaxi 管理，与行驶记录管理同级；Route 记录可反查任务、Robotaxi、行驶记录和路径规划执行记录。
- 行驶记录菜单升级为行驶记录管理，当前实现运营行驶记录，并预留服务履约记录占位。
- 保留并强化 RoadNode / 路口 Cell 不得被 ServiceArea 覆盖的规则。
- 更新字段字典、初始化校验和前端展示字段，保持中文运营体验一致。
- 新增本地检查与版本发布脚本，固化提交前检查和版本标签流程。

## v016

核心：实现运营投放到达判断、异常到达重规划和路径规划策略记录。

- 合并 v015 update 文档到正式 DeploymentTask 与 RouteExecution 文档，删除临时 update 文档。
- 新增 RoutePlanningStrategy 文档，定义初始运营投放路径规划策略和异常到达同服务区替代路径规划策略。
- Route、行驶记录和 route_history 增加 `route_strategy_id`，用于追踪路径生成逻辑。
- 运营投放任务新增 ARRIVED / ARRIVAL_ABNORMAL 状态设计，并在前端实现正常到达、异常到达和异常后路径规划闭环。
- 行驶记录到达目标后不再直接完成投放任务，而是进入到达结果处理。
- 任务单和行驶记录统一展示计划目标、当前目标和实际目标；异常到达后行驶记录进入异常到达状态，重规划时同步更新当前目标。
- 新增运营决策中心与路径规划管理页面，展示路径规划策略对象和策略执行记录。
- 统一路径规划策略编号为 `RPS-001 / RPS-002`，任务单、行驶记录、路径历史和路径规划执行记录均以 Route 记录为权威来源。
- 增加路径规划策略一致性校验，避免路径规划执行记录与生成的 Route 策略编号不一致。
- 修复表单状态分类与跳转筛选联动问题；点击状态分类会清空临时筛选并重新计算列表。
- 优化右侧详情中的位置上下文展示，默认展示摘要，完整关联信息折叠查看。
- 更新前端缓存参数和运行态存储 key，避免旧浏览器缓存与旧运行态数据影响新状态机。
- 新增本地启动脚本，便于通过双击方式启动前端服务并打开页面。

## v015

核心：记录运营投放、Route 与行驶记录的新一轮方案设计更新。

- 新增 Route v015 设计，强调 Route 必须由有序 `route_steps` 组成，不能再用无序道路网格集合替代路径方案。
- 新增 DeploymentTask v015 设计，区分计划目标与实际停靠点，并提出到达后备用目标、驻留行为和阻塞处理策略。
- 新增 RouteExecution v015 设计，明确行驶记录可在同一任务下更换 Route，并负责持续反馈 Robotaxi 位置、里程、电量和任务执行状态。
- 新增 `07-operations-decision` 目录及运营决策相关文档占位，为后续 DemandForecast、SupplyAdjustmentPlan、SupplyAssignmentDecision、RoutePlanning 等对象设计预留结构。

## v014

核心：实现运营投放任务与 Robotaxi 行驶记录的最小前端闭环。

- 将 `DeploymentTask` 文档文件名修正为标准 `.md` 后缀。
- 新增运营投放任务和行驶记录的任务类型、状态、字段字典和校验规则。
- 在任务单管理中新增 `运营投放` 页面，在 Robotaxi 管理中新增 `行驶记录` 页面。
- 支持为可运营 Robotaxi 批量生成运营投放任务、生成模拟 Route，并通过行驶记录推进 Robotaxi 行驶。
- 将 `行驶记录` 从任务单管理中移出，归入 `Robotaxi 管理`，避免把行驶记录误认为任务单。
- 路径规划成功后立即生成 `RouteExecution = WAITING_START`，开始投放时再进入 `MOVING`。
- Robotaxi 和 Worker 列表 / 详情显示当前任务类型、任务状态；Robotaxi 详情使用 Tab 分类展示任务、位置和行驶记录。
- 运营投放任务和行驶记录详情展示 Route 信息，起点、终点、当前位置通过统一 CellContext 展示结构化位置上下文。
- 统一任务单单行操作按钮；运营投放任务可通过 `查看行驶记录` 跳转、筛选并选中对应行驶记录。
- 路径推进时同步更新 Robotaxi 位置、当前任务、当前路径、运动状态、电量和续航。
- 更新前端脚本版本参数，降低浏览器缓存导致页面未更新的风险。

## v013

核心：新增投放任务与行驶记录的方案文档。

- 新增 `DeploymentTask` 运营投放任务单定义，明确其服务于运营供给布局，不直接服务客户订单。
- 新增 `RouteExecution` 行驶记录定义，用于表达 Robotaxi 执行任务时的离散化移动过程。
- 文档开始区分 `Task = 为什么移动`、`Route = 计划怎么走`、`RouteExecution = 实际怎么走`。
- 为后续投放、路径执行、Robotaxi 位置和电量变化模拟提供设计依据。

## v012

核心：补齐页面状态持久化与准入任务对象联动闭环。

- 将 `生成准入任务` 调整为批量生成候选 Robotaxi 的准入任务，避免只生成单条任务。
- 分配 Worker 后同步 Robotaxi 进入 `运维检查中`，并增加校验规则保证任务状态与对象状态一致。
- Robotaxi 管理列表展示不可运营原因，便于查看异常确认后的具体问题类型。
- 为业务列表页增加通用状态分类区、关键词查询、状态筛选和页面级筛选状态记忆。
- 增加本地运行态持久化，刷新页面后保留 Robotaxi、Worker、准入任务和事件日志状态。
- 将平台名称改为可点击入口，点击回到运营中控台，并增加 `重置模拟数据` 操作。

## v011

核心：实现运营准入任务前端闭环，并统一 B 端页面布局规范。

- 新增 ReadinessCheckTask 与 TaskEventLog 前端数据结构、字段字典和校验规则。
- 在运营中心管理下新增 `任务单管理 / 运营准入` 页面，支持手动生成准入任务和自动准入检查。
- 实现任务分配 Worker、开始检查、检查通过、检查不通过及事件记录的最小闭环。
- 优化菜单展开、顶部上下文条、右侧详情、字体层级和紧凑型业务列表页布局。
- 增加通用底部信息区、运营中控台图例、运营准入查询 / 重置筛选闭环。
- 补充项目迭代规则，明确前端模拟测试、字体层级、业务列表页布局和底部信息区规范。

## v010

核心：修正 Task 总览与 Worker 状态文档冲突。

- 明确 Task 总览中的生命周期只是通用抽象，具体任务可以有专属状态机。
- 明确 ReadinessCheckTask 以自身文档中的 `WAITING_ASSIGNMENT / WAITING_CHECK / CHECKING` 等状态为准。
- 统一 Worker 状态枚举，当前阶段只使用 `IDLE`、`BUSY`、`OFF_DUTY`。
- 删除 Worker 文档中的 `UNAVAILABLE`，避免与代码和准入任务规则冲突。

## v009

核心：细化 ReadinessCheckTask 方案设计。

- 明确 ReadinessCheckTask 是单台 Robotaxi 的运营准入任务单。
- 调整任务状态为等待下一步动作的表达方式。
- 增加自动触发和手动触发两种任务创建方式。
- 增加防重复任务规则、前端按钮状态规则和 Worker 分配规则。
- 新增 TaskEventLog 事件记录设计，为后续任务系统编码提供依据。

## v008

核心：升级前端为紧凑型 B 端运营平台，并增强地图交互。

- 使用 React + Ant Design 重构前端展示层，形成更接近运营系统的软件界面。
- 新增本地 `vendor` 前端依赖，避免页面依赖外部 CDN 或本机 npm 环境。
- 优化布局密度，让中控台、表格、地图和详情面板获得更多有效空间。
- 增加地图滚轮缩放、拖拽平移、放大、缩小和复位能力。
- 补充前端体验迭代规则，明确 B 端运营系统以有效业务空间为核心。

## v007

核心：建立项目迭代规则和中文版本记录机制。

- 新增项目迭代规则文档，明确分析、确认、编码、校验、提交的闭环流程。
- 明确字段字典默认维护规则，避免同一含义出现多个字段定义。
- 明确每次版本提交后必须更新中文版本记录。
- 补充 `v001` 至 `v006` 的中文核心说明，便于后续对比和回退。

## v006

核心：实现运营中心作为特殊 Place，并加入 Worker 初始化。

- 将运营中心定义为 `OPS_CENTER` 类型 Place，与地图空间绑定。
- 新增 10 个运营中心作业人员 Worker 初始化数据。
- 增加 Worker 菜单、列表、详情展示与初始化校验。
- 优化运营中心 Cell 详情，避免显示为误导性的空白区域。
- 地图中按 Place 类型使用不同颜色展示。

## v005

核心：更新文档模型，明确 OpsCenter、Place、Worker 与任务系统关系。

- 明确 OpsCenter 是 `OPS_CENTER` 类型 Place + 供给侧运营设施。
- 增加 Worker 作为运营中心内部作业资源。
- 补充 Worker 初始化与 ReadinessCheckTask 文档设计。
- 统一运营中心可产生人员出行需求的业务表达。

## v004

核心：实现运营中心和 20 台 Robotaxi 初始化。

- 新增 OpsCenter 业务对象与初始化数据。
- 生成 20 台 Robotaxi，并停放在运营中心内。
- 增加运营中心、Robotaxi 菜单和记录展示。
- 完成运营中心附近服务区与接入道路关系。
- 优化前端菜单为可展开/收缩结构。

## v003

核心：实现新版地图空间模型与中文字段字典。

- 基于文档生成 Map、Cell、Road、RoadNode、RoadSegment、Place、ServiceArea、Zone、Route 初始化数据。
- 实现空间模型校验规则。
- 前端展示地图网格、道路、服务区、地点、路径与对象详情。
- 增加字段中文名和枚举值中文显示。

## v002

核心：沉淀地图空间模型文档。

- 建立空间模型文档结构。
- 明确 Map、Road、RoadNode、RoadSegment、Place、ServiceArea、Zone、Route 的定义。
- 补充初始化地图设计方案。

## v001

核心：完成最小空间可视化原型。

- 创建最小 Zone、Point、Route 可视化 demo。
- 实现左侧对象列表、中间画布、右侧详情面板。
- 支持点击 Point / Route 查看对象详情。
