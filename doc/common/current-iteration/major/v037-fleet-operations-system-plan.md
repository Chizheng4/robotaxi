# v037 Fleet Operations 车队运维闭环系统自动执行计划

## 1. 版本目标

v037 聚焦 Fleet Operations 车队运维闭环系统。

目标是在不破坏现有 Robotaxi、服务订单、投放、行驶、成本、收入和指标闭环的前提下，建立 Robotaxi 运维健康模型与清洁、充电、维修、故障处理、退役等任务单的服务化基础。

核心原则：

1. 先保证基础业务对象和任务单生命周期正确，再考虑上层自动化接入。
2. Robotaxi 健康事实属于 Robotaxi 本体，统一由 RobotaxiService 判断。
3. 各任务单服务只负责自身生命周期，不替代 RobotaxiService 做全局状态判断。
4. 等待中的运维任务不占用 Robotaxi.current_task_id，正式执行后才占用。
5. 字段、状态、枚举进入实现阶段必须同步字段字典、前端中文和验证脚本。
6. 不轻易改动已经稳定的服务订单、投放、行驶、财务和指标闭环。

## 2. 当前差异与处理

|差异|处理|
|---|---|
|`doc/03-task-system/01-readiness-check-task.md` 迁移|归入 Fleet Operations 03 运营准入任务|
|`doc/03-task-system/02-deployment-task.md` 迁移|归入 Supply System 01 投放任务|
|根目录 `design-qa.md` 游离|归档为 `doc/common/iteration-history/major/v026-design-qa.md`|
|新增 `doc/09-fleet-operations-system/`|作为车队运维闭环方案目录|
|新增 `doc/10-supply-system/`|作为未来供给系统方案目录|
|新增 `doc/11-strategy-system/`|作为未来战略系统方案目录|

## 3. 子版本计划

### v037.0：Fleet Operations 方案设计基线

状态：已完成。

范围：

- 建立 Fleet Operations 总览、Robotaxi 运维状态模型、Robotaxi 运营健康模型；
- 完成运营准入、清洁、充电、维修、故障处理、退役任务单方案；
- 完成统一 Fleet Operations 工作流方案；
- 明确 `FleetOperationRequirement` 第一阶段不新增；
- 明确 RobotaxiService 是可运营判断和任务触发统一入口；
- 归档 v026 设计 QA 文件。

验证：

- 文件结构检查；
- 旧编号引用检查；
- Fleet Operations 文档中不再以模拟运行为主叙事。

### v037.1：字段字典与基础类型接入

状态：已完成。

范围：

- 新增 Fleet Operations 相关对象字典：
  - CleaningTask；
  - ChargingTask；
  - MaintenanceTask；
  - FailureHandlingTask；
  - RetirementTask。
- 新增 Robotaxi 运营健康字段和枚举；
- 新增任务状态、触发来源、结果枚举中文；
- 同步 `doc/rules/field-dictionary.md` 和 `src/domain/fieldDictionary.js`；
- 更新 `src/domain/taskTypes.js` 或新增必要的领域类型文件；
- 增加字段展示合同验证覆盖。

完成记录：

- 已扩展任务类型、Robotaxi 运维健康状态、五类 Fleet Operations 任务状态和状态注册；
- 已同步 `doc/rules/field-dictionary.md` 和 `src/domain/fieldDictionary.js`；
- 已让字段展示合同覆盖 Robotaxi 健康字段和五类运维任务样本；
- 已通过 `node scripts/verify-field-display-contract.mjs`。

暂停条件：

- 发现现有 Robotaxi 状态枚举与新健康模型存在不可兼容冲突。

### v037.2：RobotaxiService 与运维任务基础服务

状态：已完成。

范围：

- 新增或扩展 RobotaxiService：
  - `canAcceptServiceOrder`；
  - `canAcceptDeploymentTask`；
  - `needsCleaning`；
  - `needsCharging`；
  - `needsMaintenance`；
  - `hasActiveFailure`；
  - `shouldRetire`；
  - `createFleetOperationTaskIfNeeded`。
- 新增 Fleet Operation 任务创建与防重复服务；
- 支持等待中任务不占用 `current_task_id`；
- 支持任务完成后统一回写 Robotaxi 可运营状态；
- 保持现有服务订单、投放和行驶闭环不被重写。

完成记录：

- 新增 `src/services/robotaxiService.js`，提供 Robotaxi 可运营判断、运维健康判断、任务触发选择和状态回写函数；
- 新增 `src/services/fleetOperationTaskService.js`，提供清洁、充电、维修、故障处理和退役任务创建、防重复和等待不占用规则；
- 准入任务不被新服务接管，继续保留现有准入任务服务边界；
- 新增 `scripts/verify-v037-2-fleet-operation-services.mjs`，验证可接单判断、等待任务不占用、即时任务占用、防重复和恢复可运营；
- 已通过 v037.2 服务合同验证和字段展示合同验证。

暂停条件：

- 发现当前代码缺少稳定 Robotaxi 写入入口，导致需要重构大范围状态管理。

### v037.3：前端菜单、列表和详情接入

状态：待执行。

范围：

- 在合适菜单中接入车队运维闭环页面；
- 新增或复用标准列表页展示清洁、充电、维修、故障处理、退役任务；
- 详情页使用统一字段字典和中文展示；
- 复杂详情遵循“摘要先行、结构化键值、按需展开”；
- 不新增独立复杂视觉体系。

暂停条件：

- 页面信息架构需要用户重新确认一级菜单归属。

### v037.4：验证、版本记录和归档收口

状态：待执行。

范围：

- 新增 Fleet Operations 合同验证脚本；
- 运行字段展示合同验证；
- 修改 `src/main.jsx` 时重新编译 bundle、语法检查并验证页面加载；
- 更新 `VERSION.md`；
- 完成提交和 tag；
- 大版本全部完成后归档本计划。

## 4. 自动执行原则

用户已要求自动执行本计划。

执行中只有出现以下情况才暂停：

1. 需要大范围重构现有稳定功能；
2. 业务状态或字段命名存在多种合理选择且影响长期结构；
3. 验证发现核心页面不可用且修复范围超出本计划；
4. 需要新增非当前计划中的大型对象或系统。

## 5. 当前执行结论

当前应先提交 `v037.0` 方案设计基线，再继续执行 `v037.1` 至 `v037.4`。
