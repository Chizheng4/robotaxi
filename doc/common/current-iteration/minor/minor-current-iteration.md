# 当前小迭代工作台

## 状态

执行中：v040.30 业务单据全量闭环一致性修复。

## 使用规则

1. 用户在本文件中记录或更新当前小迭代需求。
2. Codex 基于本文件和 `git diff` 识别差异、冲突、疑问和迭代计划。
3. 如果本轮需要自动执行计划，可以在确认后新增对应的小迭代计划文档。
4. 小迭代完成后，必须把本轮计划、执行内容和验证结果归档到：

   `doc/common/iteration-history/minor/`

5. 归档完成后，必须清空本文件的具体迭代内容，仅保留当前工作台模板。

## 当前输入

### v040.35 经营分析需求趋势与资产利用率增强（已完成）

1. **需求趋势**
   - 服务分析页消费统一经营指标数据池，展示每小时订单量和高峰 / 平峰 / 低峰时段订单量。
   - 每小时趋势支持选择模拟日，展示当日 24 小时订单走势。
   - 趋势粒度支持切换为按天，展示统计周期内每日订单走势。

2. **资产利用率**
   - 新增 Robotaxi 资产利用率：有过已完成服务订单的 Robotaxi 数 / Robotaxi 总数。
   - 指标用于回答资产是否被真实履约服务使用，不以是否可运营或是否被投放替代。

3. **服务效率口径修正**
   - 平均履约耗时按已完成服务订单的履约耗时分钟求和 / 完成订单数。
   - 平均履约距离按已完成服务订单的履约距离求和 / 完成订单数。
   - 不再直接以 Trip 记录作为平均履约距离和耗时的主口径。

4. **刷新边界**
   - 人工业务操作后仍由用户点击“更新经营数据”刷新经营分析。
   - 模拟运行完成后沿用现有自动触发经营数据更新逻辑。
   - 前端趋势图只消费统一指标数据池，不绕过指标计算服务。

### v040.34 供应管理、运营菜单与空间画像升级任务清单（执行中）

1. **供应管理菜单与未来对象接入**
   - 一级菜单新增“供应管理”。
   - 二级/叶子页面包含需求画像、需求预测、供应计划、供给单、运营准入、车商供应、车主供应。
   - 需求画像作为供应管理入口，统一展示地点、服务区和区域画像记录；底层画像数据继续独立存储。
   - 当前仅运营准入具备完整业务闭环；其他对象作为未来服务化对象先接入独立数据集合和字段字典，不进入模拟运行主路径。

2. **运营管理菜单重组**
   - 一级菜单新增“运营管理”。
   - 二级菜单包括“供需投放”“出行服务”“运维支持”。
   - 投放任务移入供需投放。
   - 服务订单、虚拟需求策略、动态定价策略、订单匹配策略移入出行服务，并按策略配置 / 策略执行 / 策略结果分组。
   - 清洁、充电、维修、故障处理、退役、运维策略、运维调度策略、任务规划策略移入运维支持，并按策略配置 / 策略执行 / 策略结果分组。

3. **运营组织与路径规划归属调整**
   - 一级菜单新增“运营组织”，包含运营中心列表和作业人员列表。
   - 路径规划移入 Robotaxi。
   - 运营行驶、履约行驶作为 Robotaxi 下二级菜单。
   - 客户管理独立为一级菜单。
   - 移除旧菜单入口：运营中心管理、任务单管理、运营决策中心、需求订单管理。

4. **空间画像对象升级**
   - 地点、服务区和区域画像不再作为地图空间菜单散列入口，统一通过供应管理下“需求画像”查看。
   - 地点和服务区画像为配置型记录；区域需求画像为关联计算记录。
   - 当前实现必须兼容现有 Map / Cell / Road / Route 逻辑，不破坏 `cell_size_m`、`current_cell_id`、路径规划、行驶记录和业务单据调用。

5. **字段字典与中文展示**
   - 新增供应管理对象、空间画像对象和相关字段必须同步 `doc/rules/field-dictionary.md` 与 `src/domain/fieldDictionary.js`。
   - 修正 `can_inspect_robotaxi` 为“允许准入检查”，`IN_INSPECTION` 为“准入检查中”。

6. **验证边界**
   - 修改 `src/main.jsx` 后必须重建 `src/main.bundle.js`。
   - 提交前检查必须通过。
   - 新增未来对象不接入模拟运行主路径，避免影响现有模拟效率和业务闭环。

### v040.33 文档方案结构治理任务清单（执行约束）

本轮目标是把 `doc` 下方案设计文档调整为更专业、战略经营结构化的目录体系，同时保留历史方案可追溯性，避免旧文档误导当前工程实现。执行必须按以下任务点推进，不得遗漏：

1. 旧设计留存
   - 建立统一留存目录 `doc/_archive/legacy-design/`。
   - 将已被新结构替代、仅用于历史对比或旧版本留存的文档移入留存目录。
   - `doc/common/iteration-history/` 是版本迭代历史，不混入旧方案留存。
   - 留存动作不得删除历史内容，不得覆盖用户新建的当前方案目录。

2. 当前方案目录纳入
   - 保留并纳入当前新结构：空间模型、运营区域、客户管理、供应管理、车队资产、车队运营、组织、战略经营指标、模拟系统、任务系统。
   - 对 Git 视角中的旧删除、新增目录进行整理，尽量保持历史可追溯。

3. 当前文档引用修复
   - 修复当前方案文档、规则文档和代码注释中仍指向旧目录的引用。
   - 历史归档文档中的旧路径可以保留，除非影响当前规则或验证。

4. 核心业务冲突修复
   - Route / RouteExecution 文档必须表达现行服务化边界：RouteExecution 是独立行驶记录服务，不属于某个任务私有。
   - DeploymentTask 与 RouteExecution 不得再写成父子状态投影关系，应表达为独立单据通过动作结果关联。
   - CleaningTask / ChargingTask / MaintenanceTask / FailureHandlingTask / RetirementTask 文档必须对齐当前状态机和 Robotaxi 任务规划逻辑。
   - Robotaxi 状态文档必须收敛旧 `fleet_operation_status` / `needs_*` 主导的描述，改为运营状态、当前任务、待执行队列和任务规划策略共同表达。

5. 字段字典与迁移说明
   - 保留统一字段字典作为唯一字段来源。
   - `field-dictionary-old.md` 等旧字段字典只能作为留存或迁移说明，不得作为当前字段来源。

6. 验证
   - 执行当前文档引用扫描，确认当前方案文档不再指向不存在的旧路径。
   - 若仅修改文档，不重建 bundle；如触及代码注释，只做相关语法 / 提交前必要检查。
   - 完成后提交，提交信息必须说明文档结构治理和当前方案冲突修复。

本轮目标不是单点修退役或故障任务，而是把已确认的业务单据底层闭环问题统一收口。

### v040.32 本轮任务清单（执行约束）

本轮先把单据和对象设计的架构原则固化，再按任务清单迭代。实现顺序可以按工程依赖调整，但以下任务点不得遗漏：

1. 架构原则固化
   - 所有具备闭环操作和状态生命周期的单据 / 对象，必须先作为独立业务服务闭环。
   - 单据自身拥有自己的状态机、状态时间线、成本 / 收入事实和可执行动作。
   - 单据与单据之间只能通过服务动作、事件结果和关联字段相互驱动，禁止把一个单据的状态、时间线或财务事实混入另一个单据。
   - 状态枚举必须表达单据自身含义，不得依赖 `任务类型 + 通用状态` 组合后才得到真实业务状态。

2. 已有 Robotaxi 列表体验修复保留
   - 保留当前已验证的 Robotaxi 表格自适应列宽、顶部摘要、待执行队列展示、队列序号和悬浮完整信息修复。
   - 后续改动不得回退这些前端一致性修复。

3. 运维任务与运营行驶记录服务边界修复
   - 运维任务需要行驶时，只能触发运营行驶记录服务创建行驶记录。
   - 运营行驶记录创建首态必须是行驶记录自己的 `WAITING_ROUTE`，后续路径规划、行驶推进、正常 / 异常到达必须由行驶记录自身服务推进。
   - 运维任务只能接收行驶记录返回的业务结果，并用运维任务自己的动作和状态更新，不能记录行驶记录状态作为任务状态时间线。
   - 当前 `planFleetOperationRoute` 创建即进入行驶中的耦合逻辑必须拆分为“创建行驶记录”和“路径规划”两个独立动作。

4. 运维任务状态独立化
   - 清洁任务不得继续使用通用 `READY_TO_START` 表示“待清洁”，应使用清洁任务自身状态。
   - 维修任务不得继续使用通用 `READY_TO_START` 表示“待维修”，应使用维修任务自身状态。
   - 状态时间线必须显示单据自身状态，不得靠页面上下文二次组合展示。
   - 字段字典文档和前端代码字典必须同步新增或调整状态值。

5. 状态时间线污染修复
   - 排队任务被 Robotaxi 接管时，只能由目标任务自己的接管动作写入目标任务时间线。
   - 清洁、充电、维修、故障、退役任务的时间线只能包含本单据自身 object type / id / 状态。
   - 重点补充“清洁立即执行 + 充电排队 / 维修排队”的污染验证，防止前序任务状态进入后续排队任务。

6. 成本 / 收入事实边界
   - 单据成本 / 收入事实只能属于产生它的单据或其明确关联的服务对象。
   - 投放任务、运维任务、运营行驶记录、履约行驶记录、服务订单、运营准入任务需要继续按统一结构展示成本明细。
   - 本轮若触及行驶记录服务，不得破坏既有投放任务和模拟运行的行驶成本闭环。

7. 字段字典与中文展示
   - 本轮新增 / 调整的状态、动作、结果必须同步 `doc/rules/field-dictionary.md` 和 `src/domain/fieldDictionary.js`。
   - Robotaxi、任务规划、经营分析、单据详情和状态时间线不得暴露英文枚举或内部字段名。

8. 验证与模拟边界
   - 新增或扩展验证脚本，覆盖行驶记录创建首态、路径规划动作、任务时间线隔离、清洁 / 充电 / 维修状态独立、Robotaxi 队列序号、中文展示。
   - 修改 `src/main.jsx` 后必须重建 bundle，并运行提交前检查和必要的浏览器加载 / 前端布局验证。
   - 模拟运行仍是上层时间调度，不能新增第二套业务闭环；本轮修复不得导致模拟运行主路径失败。

### 已确认问题全集

1. 单据底层闭环边界
   - 业务单据生命周期是底层事实，页面只能触发服务，不能在 `src/main.jsx` 拼业务对象、状态流转、运营行驶记录、履约行驶记录、定价或匹配结果。
   - 模拟运行是上层统一时间和调度，不应单独实现业务闭环；本轮修复必须避免影响模拟运行主路径。

2. 状态时间线
   - 所有业务单据创建成功后的首要状态必须写入状态时间线。
   - 所有状态变化都必须由业务服务写入状态时间线，不论来源是页面按钮、关联单据、真实时间自动化还是模拟时间自动化。
   - 已发现页面人工入口仍绕过服务层，导致运营准入、运营投放、运营行驶记录、服务订单等首态或部分状态没有时间线。

3. 成本 / 收入事实
   - 单据正常完成时应由业务服务沉淀成本或收入事实，并回填来源对象的财务摘要。
   - 不能只依赖模拟运行结束后的统一计算补偿。
   - 已确认运维任务、行驶记录、服务订单等已有部分服务化能力，但运营准入、投放、服务订单人工创建/定价/呼叫等入口仍存在页面层分叉。

4. 运营准入任务
   - 页面 `创建准入任务` / `自动准入检查` 仍使用页面层 `createTask` 批量拼任务，缺少首态时间线和统一服务事实。
   - 分配 Worker、开始检查、检查通过仍有页面层状态更新路径，需要收敛到 `businessActionService`。
   - 准入任务也有 Worker 作业，应具备状态时间线和成本闭环。

5. 运营投放任务与运营行驶记录
   - 页面投放任务生成仍在 `src/main.jsx` 里拼 `deploymentTask` 和 `routeExecution`。
   - 运营行驶记录是通用行驶服务，不得因投放/运维来源不同产生对象结构或财务事实差异。
   - 投放任务和运营行驶记录创建首态必须同时有状态时间线。

6. 服务订单与履约行驶记录
   - 页面服务订单创建、定价、呼叫仍存在页面层拼对象或状态更新。
   - 服务订单创建首态、定价后状态、呼叫后状态必须统一由 `businessActionService` 写入时间线。
   - 匹配、履约行驶、结算、支付已部分接入服务层，但仍需验证成本 / 收入和状态投影一致。

7. 运维任务：清洁 / 充电 / 维修 / 故障 / 退役
   - 清洁、充电、维修需要继续保持已建立的任务规划、位置判断、行驶记录、Worker、成本事实闭环。
   - 故障任务主路径应为 `待分配 Worker -> 诊断中 -> 已完成`，完成后 Robotaxi 直接可运营。
   - 退役任务应支持 `待退役确认 -> 确认退役 / 驳回退役`；确认后根据当前位置决定直接退役处理或分配退役站点，完成后 Robotaxi 才进入已退役。
   - 旧的无动作故障状态只能兼容解释，不能作为当前正常状态暴露。

8. 字段字典与中文展示
   - 新增或变更状态、动作、结果和字段必须同步 `src/domain/fieldDictionary.js` 与 `doc/rules/field-dictionary.md`。
   - 前端不得暴露英文枚举和内部字段名。

9. 验证合同
   - 必须新增或扩展验证脚本，按单据断言：创建首态时间线、服务层入口、完成财务事实、模拟运行边界。
   - 修改 `src/main.jsx` 后必须重建 `src/main.bundle.js` 并运行 `bash scripts/check-before-commit.sh`。

### 本轮执行计划

1. 文档固化已确认问题全集。
2. 审计页面人工入口与业务服务差异。
3. 将准入、投放、服务订单创建/定价/呼叫等页面层分叉收敛到业务服务。
4. 保留并验证故障 / 退役任务修复。
5. 补字段字典、状态注册表和工作流状态边。
6. 新增全量单据闭环验证并接入提交前检查。
7. 重建 bundle，运行提交前检查和页面加载资源验证。

## 最近完成

- `v040.31`：排队任务单据隔离、状态时间线上下文、成本明细和模拟准入回归修复正在执行。本轮确认问题：
  1. 排队任务最近事件按页面兜底混入同页其他任务事件，违背单据自身闭环。
  2. 运维任务触发字段缺少白名单保护，存在外部触发字段覆盖新单据状态、时间线、成本摘要的风险。
  3. 排队任务激活后必须由目标任务自己的接管功能写入状态时间线，不能继承前序任务状态。
  4. 状态时间线没有传入当前任务上下文，导致 `READY_TO_START` 显示为全局“待作业”，而不是“待清洁 / 待维修”。
  5. Robotaxi `fleet_operation_status` 没有纳入统一状态字段识别，存在运维中状态显示英文的风险。
  6. 投放任务成本明细必须能消费自身和关联运营行驶记录的成本记录。
  7. 模拟运行准入链路必须验证创建、分配、开始、时间作业和通过，不允许出现全失败且检查未覆盖。
  本轮计划：服务层触发字段白名单、任务事件严格按 task_id 过滤、状态时间线上下文展示、Robotaxi 运维状态中文展示、专项验证覆盖排队隔离 / 成本 / 模拟准入，并重建 bundle 运行提交前检查。
- `v040.29`：业务单据成本 / 收入事实回填与运维工作流时效状态边小迭代，已归档到 `doc/common/iteration-history/minor/v040.29-financial-fact-closure.md`。
- `v040.28`：业务单据底层闭环、运维作业时效和行驶自动到达体验小迭代，已归档到 `doc/common/iteration-history/minor/v040.28-business-document-closure.md`。
- `v040.27`：Robotaxi 页签、运维当前任务展示与任务规划输入源边界小迭代，已归档到 `doc/common/iteration-history/minor/v040.27-robotaxi-planning-display-source.md`。
- `v040.26`：行驶耗电与充电资产台账闭环小迭代，已归档到 `doc/common/iteration-history/minor/v040.26-travel-charging-ledger.md`。
- `v040.25`：能量事实与当前任务展示闭环小迭代，已归档到 `doc/common/iteration-history/minor/v040.25-energy-and-current-task.md`。
- `v040.24`：Robotaxi 运营状态与资产事实闭环小迭代，已归档到 `doc/common/iteration-history/minor/v040.24-robotaxi-state-asset-facts.md`。
- `v040.23`：运维任务位置兜底、状态时间线与成本事实闭环小迭代，已归档到 `doc/common/iteration-history/minor/v040.23-fleet-operation-location-timeline-cost.md`。
- `v040.22`：业务事实、运维区域与模拟运行边界小迭代，已归档到 `doc/common/iteration-history/minor/v040.22-business-facts-and-simulation-boundary.md`。
- `v040.21`：排队任务接管与经营指标展示闭环小迭代，已归档到 `doc/common/iteration-history/minor/v040.21-task-takeover-and-metric-display.md`。
- `v040.19`：经营分析展示模型、任务规划队列顺序和运维任务到达闭环小迭代，已归档到 `doc/common/iteration-history/minor/v040.19-metric-queue-arrival-closure.md`。
- `v040.18`：运维任务行驶 / 作业人员闭环与 Robotaxi 摘要体验修复小迭代，已归档到 `doc/common/iteration-history/minor/v040.18-fleet-operation-worker-summary.md`。
- `v040.17`：Robotaxi 管理顶部体验一致化与任务规划排队序号小迭代，已归档到 `doc/common/iteration-history/minor/v040.17-robotaxi-planning-queue-ux.md`。
- `v040.16`：Robotaxi 管理层级、任务规划中文展示和运维行驶记录闭环小迭代，已归档到 `doc/common/iteration-history/minor/v040.16-fleet-route-display-closure.md`。
- `v040.15`：经营分析指标池、Robotaxi 管理体验和运维状态展示修复小迭代，已归档到 `doc/common/iteration-history/minor/v040.15-metric-robotaxi-fleet-ui.md`。
- `v040.14`：任务规划执行结果与策略页展示规范小迭代，已归档到 `doc/common/iteration-history/minor/v040.14-task-planning-run-result.md`。
- `v040.13`：任务规划策略边界收敛与经营数据自动刷新小迭代，已归档到 `doc/common/iteration-history/minor/v040.13-planning-boundary-and-metric-refresh.md`。
- `v040.12`：Robotaxi 任务规划策略小迭代，已归档到 `doc/common/iteration-history/minor/v040.12-robotaxi-task-planning-strategy.md`。
- `v040.11`：运维任务事件反馈与调度 UI 边界小迭代，已归档到 `doc/common/iteration-history/minor/v040.11-fleet-operation-event-and-dispatch-ui.md`。
- `v040.8`：Fleet Operations 生命周期闭环修复小迭代，已归档到 `doc/common/iteration-history/minor/v040.8-fleet-operation-lifecycle-contract.md`。
- `v040.7`：Fleet Operations 架构合同止血修复小迭代，已归档到 `doc/common/iteration-history/minor/v040.7-fleet-operation-contract-remediation.md`。
- `v039.7`：运营行驶记录服务化边界与模拟隔离小迭代，已归档到 `doc/common/iteration-history/minor/v039.7-serviceized-route-execution-boundary.md`。
- `v038.1`：Fleet Operations 触发链路与策略结果小迭代，已归档到 `doc/common/iteration-history/minor/v038.1-fleet-operation-trigger-and-result-plan.md`。
- `v036.4`：经营指标统一刷新体验小迭代，已归档到 `doc/common/iteration-history/minor/v036.4-metric-unified-refresh-plan.md`。
- `v033.3`：工作流时效与业务生命周期时间线小迭代，已归档到 `doc/common/iteration-history/minor/v033.3-workflow-timing-lifecycle-contract.md`。
- `v033.2`：业务生命周期时间线与自动财务计算小迭代，已归档到 `doc/common/iteration-history/minor/v033.2-business-lifecycle-timeline-and-auto-finance.md`。
- `v033.1`：时间作业诊断与清理小迭代，已归档到 `doc/common/iteration-history/minor/v033.1-timed-operation-diagnostics.md`。
- `v032.9`：供给触发周期对齐运营配置时间小迭代，已归档到 `doc/common/iteration-history/minor/v032.9-supply-trigger-window-cadence.md`。
- `v032.8`：业务触发周期与工作时间约束修复小迭代，已归档到 `doc/common/iteration-history/minor/v032.8-trigger-cadence-and-work-hours.md`。
- `v032.7`：统一工作流时效运行时与高速模拟推进小迭代，已归档到 `doc/common/iteration-history/minor/v032.7-runtime-workflow-speed.md`。
- `v032.6`：时间世界解释性与未完成版本补完小迭代，已归档到 `doc/common/iteration-history/minor/v032.6-time-world-explainability.md`。
- `v031.2`：定价履约口径与投放目标模型小迭代，已归档到 `doc/common/iteration-history/minor/v031.2-pricing-fulfillment-deployment-plan.md`。
