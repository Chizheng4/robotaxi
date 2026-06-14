# AGENTS.md - AI Agent 行为控制规则（双语稳定版）

---

## 1. 核心原则 Core Principle

中文：
本项目结构复杂，必须优先使用 Semble 进行语义搜索，禁止全量扫描代码库。

English:
This project is complex. Always prioritize Semble for semantic search. Full repository scanning is strictly forbidden.

---

## 2. 搜索策略 Search Strategy（强制 Mandatory）

中文：
在读取任何文件之前，必须先使用 Semble 搜索定位相关代码。

English:
Before reading any file, ALWAYS use Semble to locate relevant code.

---

## 3. 文件访问规则 File Access Rule

中文：
只允许访问 Semble 返回的文件结果，不允许主动遍历目录。

English:
Only open files returned by Semble. Directory traversal is not allowed.

---

## 4. Token优化目标 Token Efficiency Goal

中文：
最大化减少 token 使用，优先返回最小相关代码片段。

English:
Minimize token usage by retrieving only minimal relevant code snippets.

---

## 5. 标准执行流程 Standard Execution Flow

中文：
所有任务必须遵循以下流程：

1. 使用 Semble 搜索
2. 定位最小文件集合
3. 只读取必要代码片段
4. 再进行分析/修改

English:
All tasks must follow:

1. Use Semble search first
2. Identify minimal relevant files
3. Read only required snippets
4. Then analyze or modify

---

## 6. 架构理解约束 Architecture Awareness Constraint

中文：
不得基于猜测理解系统结构，必须通过 Semble 查询真实代码关系。

English:
Do not infer architecture. Always use Semble to retrieve actual code relationships.

---

## 7. 核心模块提示 Core Domain Modules

系统可能包含以下核心模块：

- OrderMatchingDecision（订单匹配逻辑）
- ServiceOrder（订单入口）
- Trip（执行生命周期）
- Route（路径规划）
- Robotaxi（执行单元）

必须通过 Semble 定位这些模块关系。

---

## 8. 禁止行为 Forbidden Behavior

- 禁止全仓库扫描
- 禁止一次性读取多个文件
- 禁止不通过 Semble 构建结构理解

---

## 9. 目标 Goal

中文：
在保证正确性的前提下最大化降低 token 消耗。

English:
Maximize token efficiency while maintaining correctness.