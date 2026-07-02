# 当前大版本：v040 — Robotaxi 运维状态治理与任务优先级调度

## 状态

进行中。v040.0 已完成。

## 方案文档

`doc/v040-robotaxi-operation-state-governance-plan.md`

## 子版本计划

### v040.0：状态治理基础 — Robotaxi 标记字段与 fleet_operation_status 收敛 ✅
- operation_tags 标记字段取代 fleet_operation_status 作为运维标记
- Robotaxi 初始化新增 needs_cleaning、needs_charging 等字段
- 字段字典同步

### v040.1：任务优先级调度服务 ⬜
- 新建统一 Robotaxi 任务优先级调度服务
- 场景化决策逻辑
- 运营中心菜单下新增配置页面

### v040.2：任务创建互斥与退役确认 ⬜
- 按钮互斥：一个 Robotaxi 一次只执行一个运维任务
- 退役弹窗确认 + 取消其他任务
- 排队队列前端展示

### v040.3：运维策略修复 ⬜
- 策略执行逻辑修复
- 标记 → 任务生成两段式流程

### v040.4：Robotaxi 管理前端优化 ⬜
- 状态分类 / 标记徽标 / 操作按钮分离
- 详情增加任务排队 tab

### v040.5：验证和收口 ⬜
- 提交前检查
- 真实浏览器加载验证
- 归档
