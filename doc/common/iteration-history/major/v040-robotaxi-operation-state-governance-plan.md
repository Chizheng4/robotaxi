# v040 方案设计：Robotaxi 运维状态治理与任务优先级调度

## 1. 背景

当前 Robotaxi 运维功能存在以下问题：

1. **按钮不互斥**：清洁、充电、维修、故障、退役可以同时触发多个运维任务，不符合真实场景。
2. **标记与任务不分层**：Robotaxi 的运维"容器"标记（需要清洁、需要充电等）和任务单是两个不同的概念，当前混在一起。
3. **缺少统一的优先级调度**：运维任务之间、运维与投放/服务之间没有明确的优先级判断逻辑。
4. **退役缺少确认流程**：退役是终态操作，没有弹窗确认和取消其他任务。
5. **运维策略执行不生效**：配置后执行没有匹配到符合条件的 Robotaxi。
6. **fleet_operation_status 字段冗余**：current_task_id/current_task_type 已能表达正在执行的任务，fleet_operation_status 应该聚焦于"标记/容器"语义。

## 2. 核心变更

### 2.1 Robotaxi 运营状态治理

将 Robotaxi 的状态体系重构为两层：

**第一层：运营可用状态（availability_status）**

| 状态 | 含义 |
|------|------|
| PENDING_INSPECTION | 待准入（新车或维修后） |
| AVAILABLE | 可运营 |
| UNAVAILABLE | 不可运营（运维中、故障中） |
| RETIRED | 已退役 |

**第二层：运维标记（operation_tags）**

用 Robotaxi 上的多个字段表达当前运维标记，代替单一的 fleet_operation_status：

| 字段 | 含义 | 取值 |
|------|------|------|
| needs_cleaning | 需要清洁标记 | true / false |
| needs_charging | 需要充电标记 | true / false |
| needs_maintenance | 需要维修标记 | true / false |
| failure_status | 故障状态 | NONE / ALERTED / BROKEN |
| retirement_flag | 退役标记 | true / false |
| pending_task_queue | 机器人待执行任务排队列表 | 有序任务队列 |

标记是 Robotaxi 的状态事实，由以下三种来源设置：
- Robotaxi 自身检测（如电量低、行驶里程触发保养条件）
- 运维策略执行（扫描并标记符合条件的 Robotaxi）
- 人工操作（运维人员直接标记）

**第一版简化**：先消除 fleet_operation_status 的冗余。operation_tags 作为 Robotaxi 的普通字段存在，pending_task_queue 作为排队队列。

### 2.2 两段式流程：标记 → 任务生成

标记和任务生成严格分离：

**第一段：标记 Robotaxi**
- Robotaxi 自行检测 → 写入对应标记字段
- 运维策略执行 → 扫描所有可运营 Robotaxi → 按条件写标记
- 人工标记 → 直接写标记

**第二段：生成任务单**
- 当某台 Robotaxi 有运维标记时，自动或手动触发生成对应任务单
- 任务单创建前通过任务优先级调度判断：能否立即执行？是否需要等待？
- 任务单创建成功后，Robotaxi 标记和任务单关联

### 2.3 任务优先级调度

新建统一的 Robotaxi 任务优先级调度服务。

**配置位置**：运营中心管理菜单下，命名为"任务优先级调度配置"。

**职责**：根据 Robotaxi 当前状态（是否在服务中、是否被其他任务占用、运维标记情况），对新的任务申请返回调度决策。

**决策结果**：
- 立即执行（高优先级中断低优先级）
- 等待当前任务完成（加入排队队列）
- 当前不可行（返回原因）

**场景化优先级规则**：

| 场景 | 新任务 | 当前状态 | 决策 |
|------|--------|----------|------|
| 服务中 | 故障处理 | 服务中 | 中断服务，立即执行故障处理 |
| 服务中 | 清洁/充电/维修 | 服务中 | 标记 Robotaxi，等待服务完成后入任务队列 |
| 可运营且空闲 | 清洁/充电/维修 | 无任务 | 立即执行 |
| 可运营且空闲 | 投放/服务匹配 | 无任务 | 如果存在运维标记，运维优先 |
| 不可运营中 | 另一运维任务 | 已有任务 | 入排队队列，等当前完成后再执行 |
| 任何状态 | 退役 | 任何 | 弹窗确认 → 取消所有非服务中任务 → 立即执行退役 |

### 2.4 退役终态处理

退役操作必须弹窗二次确认。确认后：
1. 检查 Robotaxi 是否在服务订单中 → 如果在，标记为"服务完成后退役"
2. 取消该 Robotaxi 上所有其他运维任务单（清洁/充电/维修/故障）
3. 创建退役任务单
4. Robotaxi availability_status 设为 RETIRED
5. Robotaxi 不再参与任何投放和服务匹配

### 2.5 运维策略修复

清洁策略执行的问题原因：策略执行时筛选 Robotaxi 的逻辑不完整。

修复要点：
1. 策略执行先扫描所有 availability_status 为 AVAILABLE 的 Robotaxi
2. 检查策略条件（低峰时间、服务单数、服务时长）
3. 符合条件的 Robotaxi 设置 needs_cleaning = true
4. 执行结果记录：标记了哪些、跳过了哪些、跳过原因
5. 对已标记的 Robotaxi，生成清洁任务单并通过优先级调度判断是否可立即执行

### 2.6 前端 Robotaxi 管理优化

基于当前视觉规范，Robotaxi 管理页面优化要点：

1. **状态分类**：可运营 / 不可运营（运维中）/ 退役
2. **表格优化**：每行显示 Robotaxi 编号 + 当前位置 + 运营可用状态 + 运维标记徽标（清洁、充电、维修、故障）
3. **操作按钮分离**：
   - 状态分类和操作根据 Robotaxi 当前状态动态显示
   - 不可运营的 Robotaxi 不显示投放/服务操作
   - 可运营的 Robotaxi 显示清洁/充电/维修/故障触发
   - 退役按钮始终显示但需要弹窗确认
4. **任务排队展示**：Robotaxi 详情中增加"任务排队"tab，展示待执行运维任务队列
5. **运维标记展示**：Robotaxi 详情中展示当前运维标记状态及其来源

## 3. 第一版变更范围

本次 v040 方案聚焦 Fleet Operations 基础治理，不接入模拟运行，不改字段字典核心结构。

### 3.1 必须修改

| 模块 | 变更 |
|------|------|
| 状态注册表 | fleet_operation_status 收敛为 operation_tags |
| Robotaxi 初始化 | 新增 needs_cleaning、needs_charging 等标记字段 |
| 任务创建服务 | 创建任务前调用优先级调度服务 |
| 机器人任务优先级服务 | 新建统一调度服务 |
| 前端 Robotaxi 管理 | 按钮互斥、退役弹窗、标记展示 |
| 前端任务优先级配置 | 运营中心菜单下新增页面 |
| 运维策略执行 | 修复策略执行逻辑 |
| 字段字典 | 同步新字段和状态 |

### 3.2 不修改

- 模拟运行核心循环
- 业务动作服务（businessActionService）
- 成本/收入/指标计算
- 投放/服务/履约闭环

## 4. 相关文档更新

- `doc/09-fleet-operations-system/01-robotaxi-fleet-state-model.md`：更新状态模型
- `doc/09-fleet-operations-system/10-fleet-operation-policy-management.md`：更新策略执行流程
- `doc/rules/field-dictionary.md`：同步新字段
- `src/domain/fieldDictionary.js`：同步新字段
- `src/domain/statusRegistry.js`：更新状态分类
- `src/domain/taskTypes.js`：新增标记相关枚举
