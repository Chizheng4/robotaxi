# v032 统一时间世界与时间驱动执行引擎自动化执行计划

状态：执行中，已完成至 `v032.4`，当前指针为 `v032.5`。

版本定位：大版本连续迭代。

设计文档：`doc/common/current-iteration/major/v032-unified-time-world-design.md`

执行目标：用最小但完整的工程步骤，把系统从点击式自动模拟升级为统一时间驱动模拟。每个子版本必须可验证、可提交、可回滚；不得提前进入经营指标体系。

---

## 1. 总体执行原则

1. 每个子版本先读本计划和对应范围，再读取必要规则与相关代码。
2. 每个子版本只解决一个层级问题，避免跨层混改。
3. 业务动作服务仍是唯一业务闭环入口；调度器只负责到期触发，不直接手写业务复杂状态。
4. `src/main.jsx` 修改后必须重新生成 `src/main.bundle.js`。
5. 涉及字段、状态、枚举时，必须同步：
   - `doc/rules/field-dictionary.md`
   - `src/domain/fieldDictionary.js`
6. 每个子版本必须运行提交前检查，核心路径需要浏览器或 HTTP 页面加载验证。
7. 本计划执行中不触碰 `doc/06-metrics-system/`，除非用户后续明确把指标体系纳入新版本。

---

## 2. 子版本拆分

### v032.1 时间基础层与模拟运行创建修复

目标：建立统一时间上下文，修复不能创建多个模拟运行对象的问题，并为运行失败定位准备字段。

范围：

1. 新增或整理 `TimeContext` 能力；
2. 统一业务动作服务中的时间获取入口；
3. 保留真实人工点击逻辑，但让人工动作也能接收 `REAL_MANUAL` 时间上下文；
4. 修复模拟运行创建限制：
   - 允许创建多个 `READY`；
   - 禁止同时启动多个 `RUNNING / DRAINING`；
   - `PAUSED` 不阻止创建，但启动时必须检查 active run；
   - 新运行时间基于已有运行最大时间连续；
5. 明确 `SimulationRun.FAILED` 语义；
6. 增加失败定位字段或失败摘要结构的基础定义；
7. 同步字段字典。

计划读取：

1. `src/services/simulationActions.js`
2. `src/data/simulationEngine.js`
3. `src/data/simulationClock.js`
4. `src/domain/simulationTypes.js`
5. `src/domain/fieldDictionary.js`
6. `doc/rules/field-dictionary.md`

验收：

1. 可以连续创建多个 `READY` 模拟运行对象；
2. 不能同时启动多个 active run；
3. 新运行模拟时间连续；
4. `FAILED` 前端含义不再只是模糊“失败”；
5. 提交前检查通过。

---

### v032.2 TimedOperation 时间作业层

目标：建立统一时间作业模型和调度器，但先不大规模改业务流程。

范围：

1. 新增 `TimedOperation` 类型或领域模块；
2. 新增时间作业调度器；
3. 支持作业创建、进度计算、到期识别、完成回调；
4. 建立作业状态：
   - `PENDING`
   - `RUNNING`
   - `COMPLETED`
   - `FAILED`
   - `CANCELLED`
5. 模拟 tick 接入调度器，但初期只做基础作业推进验证；
6. 前端增加时间作业基础查看能力，或在相关对象详情中展示关联作业摘要；
7. 同步字段字典和字段展示合同。

计划读取：

1. `src/data/simulationLoop.js`
2. `src/data/simulationEngine.js`
3. `src/services/businessActionService.js`
4. `src/services/simulationHandlers.js`
5. `src/domain/fieldDictionary.js`
6. `src/main.jsx`

验收：

1. 时间作业可以创建、推进、完成；
2. 作业进度由时间差计算；
3. 调度器不直接写复杂业务状态；
4. 模拟 tick 可以处理到期作业；
5. 字段展示合同通过。

---

### v032.3 行驶时间驱动与路径详情体验

状态：已完成，版本提交 `v032.3`。

目标：把运营行驶记录和履约行驶记录从点击步进主路径改为时间驱动主路径，并修复路径信息详情体验。

范围：

1. 路径规划成功后创建 `TRAVEL` 时间作业；
2. 根据 Route 移动步数、Cell 时长和时间差计算行驶进度；
3. 自动更新：
   - 当前 Cell；
   - 当前 step；
   - 总距离；
   - 已行驶距离；
   - 剩余距离；
   - 已耗时；
4. 到达预计时间后创建 `ARRIVAL_DETECTION` 时间作业；
5. 第一阶段默认正常到达，保留异常结果入口；
6. “继续行驶”按钮降级为人工调试 / 手动处理入口，不再作为模拟主路径；
7. 运营行驶记录和履约行驶记录详情的“路径信息”改为友好路径摘要；
8. 不再默认暴露 `route_history` 原始结构；
9. 同步字段字典。

计划读取：

1. `src/services/routePlanningService.js`
2. `src/services/tripService.js`
3. `src/services/businessActionService.js`
4. `src/services/simulationHandlers.js`
5. `src/main.jsx`
6. `src/domain/taskTypes.js`
7. `src/domain/tripTypes.js`

验收：

1. RouteExecution 不靠点击步进也能随模拟时间行驶并到达；
2. Trip 不靠点击步进也能随模拟时间接驾、送达；
3. 多 Route 总距离、已行驶距离、剩余距离正确；
4. 到达识别作业完成后调用底层业务闭环函数；
5. 路径信息详情展示为用户友好的关联路径摘要；
6. 自动模拟业务策略执行验证更新并通过。

---

### v032.4 供给侧时间作业与投放再平衡

状态：已完成，版本提交 `v032.4`。

目标：让运营准入和运营投放真正基于时间作业推进，并把投放目标从随机点升级为临时供给再平衡模型。

范围：

1. Worker 准入检查改为时间作业：
   - 分配 Worker；
   - 创建检查作业；
   - 到期后自动检查通过；
   - 第一阶段默认正常；
2. 投放任务目标选择改为临时供给再平衡模型：
   - 不投放到当前位置；
   - 优先车辆密度低服务区；
   - 考虑距离成本；
   - 考虑等待订单所在服务区；
   - 分散车辆，不集中到单点；
3. 投放路径规划后复用 v032.3 行驶时间作业；
4. 保持正式需求预测和供给计划不纳入本轮；
5. 同步字段字典和验证脚本。

计划读取：

1. `src/data/simulationSupplyTrigger.js`
2. `src/services/businessActionService.js`
3. `src/services/routePlanningService.js`
4. `src/domain/workflowTransitionRegistry.js`
5. `src/domain/taskTypes.js`
6. `src/main.jsx`

验收：

1. 准入任务自动检查耗时可配置或可默认；
2. Worker 在检查作业执行中不可重复占用；
3. 投放目标具备供给再平衡含义；
4. 投放不再出现当前位置到当前位置；
5. 投放后车辆释放、可用状态和位置正确。

---

### v032.5 需求侧等待、匹配重试与订单完成闭环

目标：把一次匹配失败从终态失败改为可解释的等待与重试过程，稳定服务订单在统一时间世界中的生命周期。

范围：

1. 服务订单匹配失败语义调整：
   - 一次无车是匹配尝试失败；
   - 订单继续等待；
   - 到重试时间后再次匹配；
   - 超过 SLA 或最大重试次数才终态失败；
2. 新增或调整匹配重试时间作业；
3. 乘客上车、下车、结算、支付逐步接入时间作业；
4. 第一阶段默认正常完成；
5. 确保 Robotaxi 占用、释放与订单匹配严格遵守统一时间；
6. 同步状态、字段字典和工作流合同。

计划读取：

1. `src/services/serviceOrderService.js`
2. `src/data/orderMatchingEngine.js`
3. `src/services/businessActionService.js`
4. `src/domain/serviceOrderTypes.js`
5. `src/domain/workflowTransitionRegistry.js`
6. `src/domain/statusRegistry.js`
7. `src/main.jsx`

验收：

1. 没有可用 Robotaxi 时订单不立即终态失败；
2. 匹配尝试失败有事件记录；
3. 后续 tick / 时间作业可自动重试；
4. 超时失败可定位原因；
5. 服务订单最终完成率在合理供给下可收敛。

---

### v032.6 运行失败定位、验证合同、归档提交

目标：补齐运行失败定位体验和自动验证合同，完成大版本归档。

范围：

1. 模拟运行详情展示失败摘要；
2. 模拟事件中可定位失败动作、对象和原因；
3. 增加自动验证：
   - TimeContext 合同；
   - TimedOperation 调度合同；
   - 行驶时间驱动合同；
   - 匹配重试合同；
   - 多模拟运行创建合同；
   - current 归档合同继续保留；
4. 更新 `VERSION.md`；
5. 归档 v032 方案和执行计划；
6. 提交并打 tag。

计划读取：

1. `scripts/check-before-commit.sh`
2. 现有 `scripts/verify-*.mjs`
3. `src/main.jsx`
4. `VERSION.md`
5. `doc/common/current-iteration/major/`

验收：

1. 提交前检查通过；
2. 页面加载验证通过；
3. 关键模拟闭环验证通过；
4. 大版本计划从 current 归档到 history；
5. Git commit 和 tag 完成。

---

## 3. 暂停条件

执行过程中出现以下情况必须暂停并和用户确认：

1. 需要新增超出计划的大型业务对象；
2. 状态机无法在当前版本保持兼容；
3. 订单等待 / 重试需要新增用户未确认的终态；
4. 时间作业调度器需要重写业务动作服务；
5. 页面验证出现白屏且修复会扩大范围；
6. 指标体系被代码依赖牵引进入本版本；
7. 用户在 current 大版本文档中追加新目标。

---

## 4. 当前执行指针

当前指针：`v032.3 行驶时间驱动与路径详情体验`。

已完成：`v032.1 时间基础层与模拟运行创建修复`。

已完成：`v032.2 TimedOperation 时间作业层`。

下一步：从 `v032.3 行驶时间驱动与路径详情体验` 开始，按子版本连续推进、验证、提交。

---

## 5. 不纳入本执行计划

1. 经营指标体系；
2. 完整需求预测；
3. 正式供给计划；
4. 复杂异常概率模型；
5. 外部真实系统接入；
6. 大规模 UI 视觉重设计。

本计划只建立统一时间世界、时间作业调度、行驶时间驱动、供需自动化闭环和运行失败可定位能力。
