# RouteExecution：行驶记录

## 1. 定义

行驶记录（RouteExecution）是 Robotaxi 对某条 Route 的实际执行记录。

```text
RouteExecution = Robotaxi 对 Route 的实际执行过程记录
```

用于记录 Robotaxi 在任务执行过程中如何沿 Route 移动，以及移动过程中产生的位置、里程、电量和执行状态变化。

行驶记录不是：

```text
Task
Route
Trip
```

---

## 2. 核心定位

```text
Task = 为什么移动
Route = 计划怎么移动
RouteExecution = 实际如何执行 Route
```

职责边界：

|对象|职责|
|---|---|
|Task|表达业务目标|
|Route|表达计划路径|
|行驶记录（RouteExecution）|表达路径执行过程|
|Robotaxi|执行移动|
|Trip|客户服务履约过程|

说明：

```text
行驶记录只记录移动执行过程。
业务目标和业务结果由对应 Task 判断。
```

---

## 3. 核心关系

```text
1 个行驶记录对应 1 台 Robotaxi
1 个行驶记录对应 1 个 Task
1 个行驶记录当前执行 1 条 Route
```

同时允许：

```text
Task 可以更换 Route
行驶记录可以引用新的 Route
但同一时刻只能执行 1 条 Route
```

---

## 4. 适用范围

只要 Robotaxi 需要从一个 Cell 移动到另一个 Cell，就应创建行驶记录。

|Task 类型|是否使用行驶记录|
|---|---|
|DeploymentTask|是|
|ServiceTask|是|
|ChargingTask 回场|是|
|MaintenanceTask 回场|是|
|RebalanceTask|是|
|ReadinessCheckTask|否|

---

## 5. 核心属性

|属性|含义|
|---|---|
|route_execution_id|行驶记录编号|
|task_id|关联任务|
|task_type|关联任务类型|
|robotaxi_id|执行 Robotaxi|
|route_id|当前执行 Route|
|execution_status|行驶状态|
|origin_cell_id|起点 Cell|
|target_cell_id|当前 Route 目标 Cell|
|current_cell_id|当前 Cell|
|current_step_index|当前执行到 Route 的第几个 Step|
|total_step_count|Route 总 Step 数|
|distance_traveled_km|已行驶距离|
|distance_remaining_km|剩余距离|
|battery_consumed_percent|已消耗电量|
|started_at|开始时间|
|completed_at|完成时间|
|failure_reason|失败原因，可为空|

---

## 6. execution_status

行驶记录状态只表达路径执行状态。

|execution_status|含义|下一步动作|
|---|---|---|
|WAITING_START|等待开始执行|开始执行|
|MOVING|正在执行 Route|推进 Step / 暂停 / 重规划|
|PAUSED|暂停执行|继续执行|
|COMPLETED|已完成 Route|反馈 Task|
|FAILED|执行失败|等待处理|
|CANCELLED|执行取消|无|

---

## 7. 生命周期

```text
Task 需要移动
↓
RoutePlanning 生成 Route
↓
创建行驶记录
↓
execution_status = WAITING_START
↓
Robotaxi 开始执行 Route
↓
execution_status = MOVING
↓
按 Route.route_steps 推进
↓
到达 Route 终点或异常处理
↓
execution_status = COMPLETED
↓
反馈 Task
```

---

## 8. Route Step 执行规则

行驶记录必须严格按照 Route.route_steps 顺序执行。

推进逻辑：

```text
current_step_index + 1
↓
读取下一 Route Step
↓
更新 RouteExecution.current_cell_id
↓
同步 Robotaxi.current_cell_id
```

禁止：

```text
跳过 Step
逆序执行
随机移动
脱离 Route 移动
使用无序 Road Cell 推进行驶
```

---

## 9. Route 步骤与备用目标处理

当 Robotaxi 到达 Route 中目标 Cell，若目标不可用：

1. 标记 `arrival_result = TARGET_UNAVAILABLE`，记录异常原因。
    
2. 检查 Route 目标所属 ServiceArea 内其他可用 Cell。
    
3. 根据 Task 指定策略选择下一个 Cell，生成新的 RouteStep。
    
4. RouteExecution 更新 `current_route_id`、`target_cell_id`，继续执行。
    
5. 如果整个 ServiceArea 都不可用，反馈异常给 Task，并通知运营决策系统重新分配或生成新 DeploymentTask。
    

说明：

```text
RouteExecution 持续引用同一 Task
Route 可以被重规划
Robotaxi 可以在同一 ServiceArea 内选择备用目标
任务完成前 Task 可能多次调整 Route
```

---

## 10. Robotaxi 位置更新

Robotaxi 的实时位置由行驶记录推进结果更新。

每推进一步：

```text
RouteExecution.current_cell_id
↓
同步
↓
Robotaxi.current_cell_id
```

到达 Route 终点后：

```text
Robotaxi.current_cell_id = target_cell_id
Robotaxi.current_route_id = null
```

---

## 11. 里程与电量更新

每完成一个 Step：

```text
distance_traveled_km += step.distance_km
distance_remaining_km = Route.total_distance_km - distance_traveled_km
battery_consumed_percent =
distance_traveled_km / Robotaxi.max_range_km × 100
```

同步更新 Robotaxi：

```text
Robotaxi.battery_percent
Robotaxi.estimated_range_km
Robotaxi.total_mileage_km
```

---

## 12. 当前阶段不模拟内容

```text
真实 GPS
真实自动驾驶控制
红绿灯
交通拥堵
车道级轨迹
车辆动力学
```

当前阶段只模拟：

```text
Cell 级移动
Step 推进
里程变化
电量变化
执行状态变化
```

---

## 13. Route 重规划

执行过程中允许更换 Route。

典型场景：

```text
路径阻塞
道路不可用
目标变化
运营决策调整
```

流程：

```text
RouteExecution = MOVING
↓
请求 RoutePlanning
↓
生成新 Route
↓
更新 route_id
↓
更新 target_cell_id
↓
current_step_index 重置或按新 Route 规则设置
↓
继续执行
```

---

## 14. 对 Robotaxi 的影响

持续更新 Robotaxi：

|Robotaxi 字段|更新方式|
|---|---|
|current_cell_id|随 Step 更新|
|current_route_id|当前 Route|
|current_task_id|当前 Task|
|battery_percent|持续减少|
|estimated_range_km|持续减少|
|total_mileage_km|持续增加|
|motion_status|MOVING|

执行完成后：

```text
Robotaxi.current_route_id = null
```

后续 Robotaxi.motion_status 由 Task 决定。

---

## 15. 对 Task 的影响

行驶记录不决定业务结果，只反馈移动结果。

|行驶记录结果|Task 处理|
|---|---|
|COMPLETED|Task 进入下一阶段|
|FAILED|Task 进入失败处理或等待决策系统处理|
|CANCELLED|Task 进入取消处理|

---

## 16. 异常反馈

行驶记录可能产生路径执行异常。

典型异常：

|异常|含义|
|---|---|
|ROUTE_BLOCKED|路径阻塞|
|ROAD_SEGMENT_UNAVAILABLE|道路不可用|
|ROBOTAXI_FAULT|Robotaxi 行驶中故障|
|LOW_BATTERY_DURING_EXECUTION|行驶中电量不足|
|ROUTE_STEP_INVALID|Route Step 不合法|
|UNKNOWN|未知异常|

异常处理原则：

```text
路径执行异常先记录事件
再反馈给 Task 或运营决策系统
由上层决定重规划、取消任务、重新分配或生成新任务
```

---

## 17. TaskEventLog

行驶记录全流程需要记录事件。

典型事件：

|event_type|含义|
|---|---|
|ROUTE_EXECUTION_CREATED|创建行驶记录|
|ROUTE_EXECUTION_STARTED|开始执行|
|ROUTE_STEP_COMPLETED|完成 Step|
|ROUTE_EXECUTION_PAUSED|暂停执行|
|ROUTE_EXECUTION_RESUMED|恢复执行|
|ROUTE_REPLAN_REQUESTED|请求重规划|
|ROUTE_REPLANNED|Route 重规划完成|
|ROUTE_EXECUTION_COMPLETED|执行完成|
|ROUTE_EXECUTION_FAILED|执行失败|
|ROUTE_EXECUTION_CANCELLED|执行取消|
|BATTERY_UPDATED|电量更新|
|MILEAGE_UPDATED|里程更新|

---

## 18. 功能操作

前端可根据 execution_status 展示操作。

|execution_status|可用功能|操作结果|
|---|---|---|
|WAITING_START|开始执行|进入 MOVING|
|MOVING|继续行驶|推进一个 Route Step|
|MOVING|暂停|进入 PAUSED|
|MOVING|重新规划 Route|请求 RoutePlanning|
|PAUSED|继续执行|回到 MOVING|
|COMPLETED|查看详情|无状态变化|
|FAILED|查看异常|无状态变化|
|CANCELLED|查看详情|无状态变化|

说明：

```text
当前阶段“继续行驶”用于离散模拟 Robotaxi 行驶。
每次点击只推进一个 Route Step。
```

---

## 19. 核心规则

1. 行驶记录只负责记录 Route 的执行过程；
    
2. 行驶记录不表达业务目标；
    
3. 行驶记录不负责路径规划；
    
4. 行驶记录必须绑定 1 台 Robotaxi；
    
5. 行驶记录必须绑定 1 个 Task；
    
6. 行驶记录当前只能执行 1 条 Route；
    
7. 行驶记录必须按 Route.route_steps 顺序执行；
    
8. Robotaxi 位置必须随行驶记录更新；
    
9. Robotaxi 电量与里程必须随行驶记录更新；
    
10. 行驶记录完成后必须反馈 Task；
    
11. 行驶记录完成不等于 Task 完成；
    
12. 行驶记录可以在执行过程中更换 Route；
    
13. 行驶记录异常不直接创建新 Task；
    
14. Trip 仅用于客户服务履约。
    

---

## 20. 核心原则

```text
RouteExecution = Robotaxi 对 Route 的实际执行记录
```

```text
Task 决定为什么移动；
Route 决定计划怎么移动；
RouteExecution 记录实际如何执行 Route。
```

行驶记录的核心价值是让 Robotaxi 的移动过程可观察、可操作、可计算，并为后续调度、计划、任务和经营指标提供基础数据。

---

## 21. Route 步骤与备用目标处理

在 Robotaxi 到达 Route 中目标 Cell 后：

1. 若目标 Cell 可用，则直接完成到达；
    
2. 若目标 Cell 不可用：
    
    - 标记 `arrival_result = TARGET_UNAVAILABLE`，记录异常原因；
        
    - 检查目标 Cell 所属 ServiceArea 内其他可用 Cell；
        
    - 根据 Task 指定策略选择下一个 Cell，生成新的 RouteStep；
        
    - 更新 RouteExecution.current_route_id 和 target_cell_id，继续执行；
        
    - 如果整个 ServiceArea 都不可用，反馈异常给 Task，并通知运营决策系统重新分配或生成新的 DeploymentTask；
        
3. RouteExecution 始终绑定当前 Task；
    
4. Route 可以被重规划，Robotaxi 可以在同 ServiceArea 内选择备用目标；
    
5. 在任务完成前，Task 可能多次调整 Route，以保证 Robotaxi 能完成投放或服务执行。