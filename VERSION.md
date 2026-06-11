# Robotaxi 版本记录

本文档用于记录每个版本的核心变化，便于后续对比、回退和继续迭代。

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
