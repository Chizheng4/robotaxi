# Route：路径方案

## 1. 定义

Route 是 Robotaxi 从起点 Cell 到目标 Cell 的一次路径规划结果。

```text
Route = 基于 RoadSegment 和 RoadNode 生成的可执行路径方案
```

Route 不表示真实行驶过程。
真实行驶过程由 RouteExecution 记录。

---

## 2. 核心定位

```text
RoadSegment = 有序道路片段
RoadNode = 道路连接点
Route = 路径规划结果
RouteExecution = Robotaxi 实际行驶记录
```

Route 的核心价值是：

```text
把道路网络中的可通行结构，转化为 Robotaxi 可按顺序执行的 route_steps
```

---

## 3. 核心关系

```text
1 个 Route 对应 1 次路径规划结果
1 个 Route 有 1 个起点 Cell
1 个 Route 有 1 个目标 Cell
1 个 Route 由多个有序 route_steps 组成
1 个 Route 可以被 1 个 RouteExecution 当前执行
```

说明：

```text
Route 可以被重新规划。
重新规划会生成新的 Route。
RouteExecution 通过 route_id 和 route_history 记录当前路径与历史路径版本。
```

---

## 4. 核心属性

|属性|含义|
|---|---|
|route_id|路径唯一编号|
|route_version|路径版本号|
|task_id|关联 Task|
|route_execution_id|关联 RouteExecution|
|route_planning_run_id|关联路径规划执行记录|
|robotaxi_id|执行 Robotaxi|
|route_strategy_id|生成该 Route 的路径规划策略|
|origin_cell_id|起点 Cell|
|target_cell_id|目标 Cell|
|route_status|路径状态|
|road_segment_sequence|路径经过的 RoadSegment 顺序|
|route_steps|可执行 Cell Step 序列|
|total_step_count|总移动步数，等于 route_steps.length - 1|
|route_usage_type|路径用途类型，用于区分价格预估路径、运营行驶路径、服务接驾路径、服务送达路径等|
|route_segments|路径分段，价格预估等复合路径可记录分段信息|
|total_distance_km|总距离|
|created_at|创建时间|
|failure_reason|失败原因，可为空|

---

## 5. route_steps

route_steps 是 Route 的核心字段。

```text
route_steps = Robotaxi 可按顺序执行的路径 Step 列表
```

每个 Step 至少包含：

|属性|含义|
|---|---|
|step_index|Step 顺序|
|cell_id|当前 Step 对应 Cell|
|road_segment_id|所属 RoadSegment|
|road_node_id|经过 RoadNode 时可记录|
|direction|当前 Step 行驶方向|
|distance_km|当前 Step 距离|
|is_origin_step|是否起点 Step|
|is_target_step|是否目标 Step|

示例：

```json
[
  {
    "step_index": 0,
    "cell_id": "C-35-33",
    "road_segment_id": "RS-008",
    "direction": "NORTH",
    "distance_km": 0,
    "is_origin_step": true,
    "is_target_step": false
  },
  {
    "step_index": 1,
    "cell_id": "C-35-32",
    "road_segment_id": "RS-008",
    "direction": "NORTH",
    "distance_km": 0.05,
    "is_origin_step": false,
    "is_target_step": false
  }
]
```

---

## 6. route_steps 生成规则

Route 的 route_steps 必须基于 RoadSegment.cell_sequence 生成。

```text
RoadSegment.cell_sequence
↓
RoutePlanning
↓
Route.route_steps
↓
RouteExecution
```

规则：

1. route_steps 必须有顺序；

2. route_steps[0].cell_id 必须等于 origin_cell_id；

3. route_steps 最后一个 cell_id 必须等于 target_cell_id；

4. route_steps[0] 是起点，不代表一次移动，移动步数应为 route_steps.length - 1；

5. 相邻 Step 的 Cell 必须在 Map 上连续；

6. 相邻 Step 应属于同一 RoadSegment，或通过 RoadNode 合法连接；

7. route_steps 不得由无序 Road Cell 直接拼接；

8. RouteExecution / Trip 只能按 route_steps 顺序推进，第一次继续行驶应进入 route_steps[1]。


---

## 7. road_segment_sequence

road_segment_sequence 表示 Route 经过的 RoadSegment 顺序。

```text
road_segment_sequence = Route 使用的 RoadSegment 有序列表
```

示例：

```json
["RS-008", "RS-011", "RS-014"]
```

规则：

1. road_segment_sequence 必须有顺序；

2. 相邻 RoadSegment 必须通过 RoadNode 连接；

3. 每个 RoadSegment 必须处于可通行状态；

4. Route.route_steps 应从 road_segment_sequence 对应的 cell_sequence 中生成；

5. 如果 RoadSegment 不连续，则 Route 无效。


---

## 8. route_status

|route_status|含义|
|---|---|
|PLANNED|已规划，未执行|
|ACTIVE|正在被 RouteExecution 执行|
|COMPLETED|已执行完成|
|CANCELLED|已取消|
|INVALID|路径无效|
|FAILED|路径规划失败|

---

## 9. Route 与 RoutePlanning 的关系

RoutePlanning 负责生成 Route。

RoutePlanning 输入：

```text
Robotaxi 当前 Cell
目标 Cell
可通行 RoadSegment
RoadNode 连接关系
路径规划策略 route_strategy_id
```

RoutePlanning 输出：

```text
Route
```

Route 必须记录：

```text
route_strategy_id
road_segment_sequence
route_steps
```

说明：

```text
Route 是路径规划策略的输出结果。
Route 本身不负责选择策略。
```

---

## 10. Route 与 RouteExecution 的关系

RouteExecution 执行 Route。

```text
Route.route_steps
↓
RouteExecution.current_step_index
↓
Robotaxi.current_cell_id
```

规则：

1. RouteExecution 不得脱离 Route.route_steps 行驶；

2. RouteExecution 不得直接使用 RoadSegment.cell_sequence 行驶；

3. 如果 Route 失效，应由 RoutePlanning 生成新 Route；

4. 新 Route 进入 RouteExecution.route_history；

5. Route 重规划不创建新的 RouteExecution。


---

## 11. Route 与 Task 的关系

Task 定义业务目标。
Route 只定义到达该目标的计划路径。

```text
Task = 为什么要去
Route = 怎么去
RouteExecution = 实际怎么走
```

例如 DeploymentTask：

```text
DeploymentTask 计划投放到 SA-006 的某个目标 Cell
↓
RoutePlanning 生成 Route
↓
RouteExecution 按 Route 行驶
```

Route 不判断：

```text
投放是否完成
目标点是否可停车
目标点是否可临停
是否进入待命
```

这些由 Task 根据到达结果判断。

---

## 12. 路径重规划

路径重规划会生成新的 Route。

典型场景：

```text
道路阻塞
RoadSegment 不可用
目标 Cell 变化
同 ServiceArea 内替换目标点
运营决策重新分配
```

重规划规则：

1. 原 Route 不被直接修改；

2. 新 Route 使用新的 route_id 或 route_version；

3. 新 Route 必须重新生成 route_steps；

4. RouteExecution.route_id 更新为新 Route；

5. RouteExecution.route_history 追加新 Route；

6. 同一个 Task 下的重规划不创建新的 RouteExecution。


---

## 13. Route 失败条件

以下情况 Route 不应生成或应标记失败：

|failure_reason|含义|
|---|---|
|ORIGIN_CELL_INVALID|起点 Cell 无效|
|TARGET_CELL_INVALID|目标 Cell 无效|
|NO_CONNECTED_ROAD_SEGMENT|无连续 RoadSegment|
|ROAD_SEGMENT_BLOCKED|道路片段阻塞|
|ROADNODE_CONNECTION_INVALID|RoadNode 连接无效|
|ROUTE_STEPS_EMPTY|route_steps 为空|
|UNKNOWN|未知原因|

---

## 14. 示例数据

```json
{
  "route_id": "RT-001",
  "route_version": 1,
  "task_id": "DT-001",
  "route_execution_id": "RE-001",
  "route_planning_run_id": "RPR-001",
  "robotaxi_id": "RTX-001",
  "route_strategy_id": "RPS-001",
  "origin_cell_id": "C-35-33",
  "target_cell_id": "C-35-28",
  "route_status": "PLANNED",
  "road_segment_sequence": ["RS-008"],
  "route_steps": [
    {
      "step_index": 0,
      "cell_id": "C-35-33",
      "road_segment_id": "RS-008",
      "direction": "NORTH",
      "distance_km": 0,
      "is_origin_step": true,
      "is_target_step": false
    },
    {
      "step_index": 1,
      "cell_id": "C-35-32",
      "road_segment_id": "RS-008",
      "direction": "NORTH",
      "distance_km": 0.05,
      "is_origin_step": false,
      "is_target_step": false
    }
  ],
  "total_step_count": 2,
  "total_distance_km": 0.05,
  "created_at": "2026-01-01T09:00:00",
  "failure_reason": null
}
```

---

## 15. 核心规则

1. Route 是路径规划结果；

2. Route 不是道路事实；

3. Route 不是行驶记录；

4. Route 必须有 origin_cell_id；

5. Route 必须有 target_cell_id；

6. Route 必须有有序 route_steps；

7. route_steps 必须来源于 RoadSegment.cell_sequence；

8. 相邻 route_steps 必须连续；

9. Route 可以跨多个 RoadSegment；

10. 跨 RoadSegment 时必须通过 RoadNode 合法连接；

11. RouteExecution 只能按 Route.route_steps 执行；

12. Route 重规划生成新 Route；

13. Route 重规划不创建新的 RouteExecution；

14. Route 必须记录 route_strategy_id；

15. Route 是 route_history 的权威记录来源。


---

## 16. 核心原则

```text
Route = 基于道路网络生成的可执行路径方案
```

```text
RoadSegment 提供有序道路 Cell；
RoadNode 提供道路连接关系；
RoutePlanning 生成 Route；
RouteExecution 按 Route 实际行驶。
```

```text
没有 route_steps，就没有可执行 Route。
```
