# iteration-rules：迭代规则

## 1. 目的

定义 Robotaxi 最小闭环经营体系项目的统一迭代规则。

目标：

- 方案有版本

- 执行有规则

- 当前迭代可控

- 历史记录可追溯

- 修改过程可闭环


---

## 2. 目录结构

|路径|说明|
|---|---|
|common/current-iteration/major|当前大版本迭代|
|common/current-iteration/minor|当前小版本迭代|
|common/iteration-history/major|大版本历史归档|
|common/iteration-history/minor|小版本历史归档|
|iteration-rules|迭代规则唯一入口|

---

## 3. 核心原则

### 3.1 规则来源

- iteration-rules 是唯一规则源。

- Codex 必须先读取规则再执行。


### 3.2 迭代管理

- current-iteration 仅保存进行中的迭代。

- iteration-history 仅保存已完成迭代。

- major 与 minor 必须独立管理。


### 3.3 变更范围

- major 处理整体方案变更。

- minor 处理局部方案修改。

- Codex 不得擅自扩大修改范围。


### 3.4 闭环要求

每次迭代必须完成：

1. 执行

2. 记录

3. 归档

4. 清理


---

## 4. 大版本（Major）

### 4.1 定义

用于整体方案变更。

适用场景：

- 文件结构调整

- 文件命名调整

- 多文档重构

- 核心对象变更

- 核心链路变更

- 系统边界变更

- 主体方案重构

- 需要差异分析与执行计划的变更


### 4.2 执行流程

1. 项目进行较大范围方案设计调整，并更新多个方案设计文件。

2. Codex 分析差异、冲突、疑问及相关建议。

3. Codex 根据与用户确认后的最终方案生成执行计划文件，例如：`v019-auto-execution-plan`，并放置于 `common/current-iteration/major`。

4. Codex 与用户确认执行计划后，按照计划完成全部迭代执行及相关版本提交。

5. 全部执行完成后，Codex 将计划文件归档至 `common/iteration-history/major`，并清空 `common/current-iteration/major`。


### 4.3 文件位置

当前迭代：

`common/current-iteration/major`

历史归档：

`common/iteration-history/major`

### 4.4 命名规则

格式：

`v<主版本号>-auto-execution-plan`

示例：

- v019-auto-execution-plan


说明：

- 计划中的子任务版本可采用 `v019.x` 形式递增。

- 主版本号必须递增。

- 不允许覆盖历史版本。


---

## 5. 小版本（Minor）

### 5.1 定义

用于局部方案修改。

当前迭代内容统一维护在：

`common/current-iteration/minor/minor-current-iteration`

### 5.2 执行流程

当前迭代文件：

`common/current-iteration/minor/minor-current-iteration`

执行步骤：

1. Codex 读取当前迭代内容。

2. 执行对应修改。

3. 完成后生成历史记录文件。

4. 将历史记录归档至 `common/iteration-history/minor`。

5. 清空 `common/current-iteration/minor/minor-current-iteration`。


### 5.3 文件位置

当前迭代：

`common/current-iteration/minor/minor-current-iteration`

历史归档：

`common/iteration-history/minor`

### 5.4 命名规则

格式：

`v<主版本号>.<次版本号>.<修订号>-<描述>`

规则：

- 在当前版本号基础上，对第三位版本号递增。

- 例如当前版本为 `v019.1.x`，则在 `x` 上递增。


示例：

- v019.1.1-fix-status-rule


要求：

- 编号递增。

- 不覆盖历史版本。


---

## 6. Codex 执行规则

### 6.1 必读文件

所有迭代必须读取：

- iteration-rules


Major 迭代额外读取：

- common/current-iteration/major


Minor 迭代额外读取：

- common/current-iteration/minor/minor-current-iteration


### 6.2 执行前检查

必须确认：

- 迭代类型

- 修改范围

- 是否需要修改文件

- 是否需要生成历史记录

- 是否需要清理当前迭代

- 是否存在范围扩张风险


---

## 7. Codex 禁止行为

禁止：

- 未读取 iteration-rules 即执行

- 混用 major 与 minor

- 将 minor 扩展为 major

- 修改历史归档

- 删除历史记录

- 覆盖历史版本

- 未归档即结束

- 未清理即结束

- 未经要求重构项目

- 在其他文件复制规则

- 脱离用户设计自行扩展


---

## 8. 历史归档规则

### 8.1 归档位置

Major：

`common/iteration-history/major`

Minor：

`common/iteration-history/minor`

### 8.2 Major

1. 整体变更

2. 差异分析

3. 生成执行计划

4. 执行修改

5. 历史归档

6. 清空 major


### 8.3 Minor

1. 局部修改

2. 读取当前迭代

3. 直接执行

4. 生成历史记录

5. 历史归档

6. 清空 minor


### 8.4 iteration-rules

- 唯一规则源

- 执行前必读

- 所有迭代必须闭环完成