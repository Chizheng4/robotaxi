# v031 业务动作同源执行与运营数据可信闭环迭代方案

状态：已完成。

版本定位：大版本迭代。

核心目标：把人工点击和自动模拟都收敛到同一个业务动作入口，避免模拟 handler 重新实现业务闭环。只有底层业务动作真实一致，服务订单、履约、投放、路径、成本、收入和后续指标才有经营模拟价值。

---

## 1. 根因确认

### 1.1 归档规则问题

`v030` 已归档到历史大版本目录，但计划文件仍留在 `doc/common/current-iteration/major/`。

根因：

1. 规则要求“移入历史目录”，但提交前检查没有自动验证；
2. 上次执行用复制替代移动，人工遗漏未被机器拦截；
3. current 目录缺少“只能保留入口和待执行方案”的轻量合同。

修复原则：

1. 已完成大版本计划不得留在 current 目录；
2. 提交前检查必须自动识别 current 目录遗留的已完成计划；
3. 规则只补一条轻量合同，不扩展复杂流程。

### 1.2 模拟执行根本问题

当前架构存在三套逻辑：

1. 人工页面函数：大量业务闭环仍在 `src/main.jsx` 中直接操作 React state；
2. 模拟 handler：`src/services/simulationHandlers.js` 重新写了一套创建、状态推进、路径规划和写入逻辑；
3. 部分 service：`serviceOrderService`、`tripService`、`routePlanningService` 只覆盖部分底层能力。

这导致模拟不是“自动点击/执行人工功能”，而是在模拟中另写业务逻辑。

根因：

1. 缺少业务动作唯一入口；
2. handler 拥有业务规则和状态写入权；
3. 验证只验证最终结果，不验证执行路径；
4. 路径规划策略有注册表和运行记录，但没有强制通过同一策略执行动作入口。

修复原则：

1. 人工与模拟必须共享业务动作服务；
2. 模拟 handler 只能做动作适配和模拟审计注入；
3. 业务状态变更必须来自同一个 action service；
4. 路径规划先作为样板完成严格闭环，再把所有业务单据动作纳入同源服务。

---

## 2. v031 架构合同

### 2.1 新增业务动作服务

新增：

`src/services/businessActionService.js`

职责：

1. 提供所有最小运营闭环业务动作；
2. 接收业务数据快照、目标对象和编号生成器；
3. 返回结构化结果；
4. 不依赖 React；
5. 不写 SimulationEvent；
6. 不知道自己来自人工还是模拟。

首批动作：

|动作|业务对象|目标|
|---|---|---|
|`createReadinessTask`|运营准入任务|创建准入任务并更新 Robotaxi 当前任务|
|`assignReadinessTask`|运营准入任务|分配 Worker|
|`startReadinessTask`|运营准入任务|开始检查|
|`passReadinessTask`|运营准入任务|检查通过并释放 Robotaxi|
|`createDeploymentTask`|运营投放任务 / 运营行驶记录|创建投放任务和行驶记录|
|`executeRoutePlanning`|运营行驶 / 履约 / 估价|统一触发路径规划策略并返回 RoutePlanningRun / Route|
|`advanceRouteExecution`|运营行驶记录|按 Route 推进一步|
|`confirmRouteExecutionArrival`|运营行驶记录|确认正常到达|
|`createServiceOrder`|服务订单|通过需求模拟创建订单|
|`executePricing`|服务订单|估价路径 + 定价策略执行|
|`callRobotaxi`|服务订单|进入待分配|
|`executeOrderMatching`|服务订单 / 履约|匹配 Robotaxi 并创建 Trip|
|`advanceTrip`|履约行驶记录|规划路径、行驶、上车、下车|
|`settleServiceOrder`|服务订单|结算|
|`payServiceOrder`|服务订单|支付完成|

### 2.2 模拟 handler 降级为适配层

`src/services/simulationHandlers.js` 调整为：

1. 调用 `businessActionService`；
2. 把返回结果写入对应 state；
3. 注入模拟审计字段；
4. 返回执行结果。

禁止：

1. handler 直接生成 RoutePlanningRun；
2. handler 直接生成 Route；
3. handler 直接决定复杂状态推进；
4. handler 直接写历史兼容状态。

### 2.3 路径规划标准闭环

新增统一动作：

`executeRoutePlanning`

执行顺序：

1. 读取路径规划策略；
2. 构造输入快照；
3. 执行路径规划；
4. 生成 `RoutePlanningRun`；
5. 成功时生成 Route；
6. 失败时只返回失败，不推进移动状态；
7. 返回需要更新的业务对象。

路径规划动作覆盖：

1. 服务订单价格预估；
2. 运营投放路径；
3. 履约接驾路径；
4. 履约送达路径。

### 2.4 验证从“结果验证”升级为“执行路径验证”

新增验证：

`scripts/verify-business-action-source-contract.mjs`

检查：

1. `simulationHandlers.js` 必须导入并调用 `businessActionService`；
2. `simulationHandlers.js` 不得直接调用 `routePlanningService.createRoutePlanningRun`；
3. `simulationHandlers.js` 不得直接调用 `routePlanningService.createPriceEstimationRoute`；
4. `simulationHandlers.js` 不得直接调用 `routePlanningService.planDeploymentRoute`；
5. 路径规划动作必须由 `businessActionService.executeRoutePlanning` 产生 RoutePlanningRun；
6. 提交前检查必须包含当前迭代归档合同。

### 2.5 成本详情体验优化

当前成本详情在右侧窄栏里使用表格，阅读体验差。

调整为：

1. 摘要先行：总成本、距离、能源、人力、折旧；
2. 成本类型分组：每个成本类型一个轻量明细条；
3. 每条明细展示金额、数量、单位成本、来源和公式摘要；
4. 不使用详情栏表格；
5. 复用现有设计令牌，不做卡片套卡片，不加厚重视觉。

---

## 3. 执行计划

### v031.1 归档合同修复

1. 删除 current 目录中已完成的 `v030` 计划文件；
2. 更新迭代规则，明确 current 目录只允许入口、待执行方案和当前进行中方案；
3. 新增 current 归档检查脚本；
4. 纳入提交前检查。

### v031.2 业务动作服务

1. 新增 `businessActionService.js`；
2. 先将模拟所需动作完整纳入该服务；
3. 保持函数纯逻辑，不绑定 React state。

### v031.3 模拟 handler 同源化

1. `simulationHandlers.js` 改为调用 action service；
2. handler 只负责写入返回结果和模拟审计；
3. 路径规划、定价、匹配、履约、投放都通过 action service。

### v031.4 成本详情体验优化

1. 替换成本详情表格；
2. 新增窄栏友好成本分组样式；
3. 保持中文字段和值展示。

### v031.5 验证、版本记录、归档、提交

1. 重新生成 bundle；
2. 运行提交前检查；
3. 做页面加载验证；
4. 更新 `VERSION.md`；
5. 归档本方案；
6. 提交并打 tag。

---

## 4. 不纳入本版本

1. 完整异常自动模拟；
2. 新经营指标体系；
3. 外部真实支付或真实地图；
4. 复杂策略优选算法。

本版本只修复最小运营闭环的数据可信根基。
