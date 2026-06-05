# Route：路径方案

## 1. 定义

Route 是 Robotaxi 从起点 Cell 到目标 Cell 的有序路径方案。

```text
Route = 有方向、有顺序、可被 RouteExecution 执行的路径方案
```

Route 不等于 Road。  
Route 不等于 RoadSegment。  
Route 不记录实际行驶过程。

---

## 2. 核心定位

```text
Road / RoadSegment = 道路事实
Route = 路径方案
RouteExecution = 路径执行记录
```

Route 的核心价值是为 Robotaxi 移动提供有序的执行 step。

---

## 3. 核心关系

```text
1 个 Route 由多个有序 route_steps 组成
1 个 route_step 对应 1 个 Cell 或 RoadSegment 片段
RouteExecution 按 route_steps 顺序执行
```

---

## 4. 核心属性

|属性|含义|
|---|---|
|route_id|路径唯一编号|
|origin_cell_id|起点 Cell|
|target_cell_id|目标 Cell|
|route_status|路径状态|
|route_steps|有序路径步骤|
|total_step_count|总 step 数|
|total_distance_km|总距离|
|estimated_time|预计时间|
|created_by|创建来源|
|created_at|创建时间|

---

## 5. route_steps

route_steps 是 Route 的核心结构。

每个 step 至少包含：

|属性|含义|
|---|---|
|step_index|step 顺序|
|cell_id|当前 step 对应 Cell|
|roadsegment_id|所属 RoadSegment，可为空|
|distance_km|当前 step 距离|
|direction|当前 step 行驶方向|
|is_service_area_cell|是否属于 ServiceArea|
|is_target_step|是否目标 step|

示例：

```json
[
  {
    "step_index": 0,
    "cell_id": "C-35-33",
    "roadsegment_id": "RS-010",
    "distance_km": 0,
    "direction": "NORTH",
    "is_target_step": false
  },
  {
    "step_index": 1,
    "cell_id": "C-35-32",
    "roadsegment_id": "RS-010",
    "distance_km": 0.05,
    "direction": "NORTH",
    "is_target_step": false
  }
]
```

---

## 6. 方向与顺序规则

Route 必须满足：

```text
route_steps 按 step_index 从小到大排列
route_steps[0].cell_id = origin_cell_id
route_steps[last].cell_id = target_cell_id
相邻 step 的 Cell 必须在 Map 上连续
相邻 step 应属于同一 RoadSegment 或可通过 RoadNode 连接
RouteExecution 只能按 step_index 顺序推进
```

不得使用无序 Cell 集合作为 Route。

---

## 7. route_status

|route_status|含义|
|---|---|
|PLANNED|已规划|
|ACTIVE|正在被执行|
|COMPLETED|已执行完成|
|CANCELLED|已取消|
|INVALID|路径不可用|

---

## 8. 与 RoadSegment 的关系

RoadSegment 是道路片段事实，Route 是路径方案。

RoadSegment 应提供：

```text
roadsegment_id
cell_sequence
direction
start_node_id
end_node_id
```

Route 可以引用多个 RoadSegment，并从中提取有序 Cell。

如果 RoadSegment 没有 cell_sequence，则 Route 不能可靠生成有序路径。

---

## 9. 与 RouteExecution 的关系

RouteExecution 必须基于 Route.route_steps 执行。

```text
Route.route_steps
↓
RouteExecution.current_step_index
↓
Robotaxi.current_cell_id
```

如果 Route 没有 route_steps，RouteExecution 不得开始。

---

## 10. 路径重规划

当执行中出现路径异常时，路径规划系统可以生成新 Route。

重规划后：

```text
旧 Route 可标记为 CANCELLED 或 INVALID
新 Route 绑定到当前 Task / RouteExecution
RouteExecution 继续按新 route_steps 执行
```

---

## 11. 当前阶段实现规则

当前阶段可以使用简化路径规划，但必须保证：

```text
Route 有 route_steps
route_steps 有顺序
Robotaxi 按 step 顺序移动
不能反向或跳跃移动
```

暂不要求：

```text
真实导航算法
最短路径最优
交通状态
红绿灯
车道级路径
```

---

## 12. 核心规则

1. Route 是路径方案，不是执行记录；
    
2. Route 必须有 origin_cell_id 和 target_cell_id；
    
3. Route 必须有有序 route_steps；
    
4. route_steps 必须从起点连续到终点；
    
5. RouteExecution 必须按 route_steps 顺序推进；
    
6. RoadSegment 应支持 cell_sequence；
    
7. Route 可跨多个 RoadSegment；
    
8. 路径异常时可重新规划新 Route。
    

---

## 13. 核心原则

```text
Route = 有序、连续、可执行的路径方案
```

```text
没有 route_steps，就不能可靠执行 RouteExecution。
```