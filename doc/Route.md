## 1. 业务含义
Route是运营路径，是 Robotaxi 最小运营闭环中，连接两个 OperatingLocation 的可行驶路径。  
它表示车辆可以从一个运营位置移动到另一个运营位置，并记录这段移动所需的距离、预计时间、道路类型和可通行状态。  
Route 本身不是接驾路线、载客路线、再平衡路线或充电路线。  
这些是后续业务任务对 Route 的使用方式。    
核心定义：  
  
> Route = 两个 OperatingLocation 之间的可行驶连接 

OperatingLocation 定义真实世界中的可运营位置。  
Route 定义这些位置之间是否可达，以及移动成本是多少。  
它支撑后续对象：  
- Vehicle：车辆沿 Route 移动；  
- DispatchTask：车辆根据任务从一个位置移动到另一个位置；  
- Order：订单需要从上车位置到下车位置；  
- Trip：载客行程会使用某条或多条 Route；  
- RebalanceTask：车辆再平衡会使用 Route；  
- ChargingTask：车辆前往充电站会使用 Route。

## 2. 与旧 Route 定义的区别
  
旧定义容易把 Route 理解成某一种业务用途：  
  
- PICKUP_ROUTE：接驾路线；  
- TRIP_ROUTE：载客路线；  
- REBALANCE_ROUTE：再平衡路线；  
- CHARGING_ROUTE：充电路线；  
- PARKING_ROUTE：停车路线。  
  
这种定义不够准确。  
真实运营中，同一条道路连接可以被不同任务复用。  
例如，办公区到商场之间的一条 Route，既可以用于：  
- 接驾；  
- 载客；  
- 空车调度；  
- 去停车；  
- 去充电。   
因此，本项目将 Route 定义为基础空间连接。  
具体业务用途由后续 DispatchTask、Trip、ChargingTask、RebalanceTask 等对象决定。 

| 旧定义                     | 新定义                  |     |
| ----------------------- | -------------------- | --- |
| Route 表示某种业务路线          | Route 表示两个位置之间的可行驶连接 |     |
| route_type 表示接驾、载客、再平衡等 | road_type 表示道路类型     |     |
| 同一路径可能被重复定义为不同业务路线      | 同一 Route 可被多个业务任务复用  |     |
| 业务用途写在 Route 里          | 业务用途写在任务对象里          |     |

## 3. 关键属性
  
| 属性                 | 含义                   | 第一阶段 |
| ------------------ | -------------------- | ---- |
| route_id           | 路径唯一编号               | 必须   |
| zone_id            | 所属运营区域               | 必须   |
| start_location_id  | 起点 OperatingLocation | 必须   |
| end_location_id    | 终点 OperatingLocation | 必须   |
| distance           | 路径距离                 | 必须   |
| estimated_duration | 预计行驶时间               | 必须   |
| road_type          | 道路类型                 | 必须   |
| route_status       | 路径状态                 | 必须   |
| is_bidirectional   | 是否双向可通行              | 建议   |
| created_at         | 创建时间                 | 可选   |
| updated_at         | 更新时间                 | 可选   |
## 4. road_type：道路类型  
  
road_type 表示这条 Route 在空间道路网络中的道路类型。  
  
它回答：  
  
> 这是一条什么类型的道路连接？  
  
第一阶段建议支持：  
  
| road_type | 中文含义 | 说明 |  
|---|---|---|  
| MAIN_ROAD | 主干路 | 区域内主要通行道路 |  
| SECONDARY_ROAD | 次干路 | 连接主要位置的次级道路 |  
| INTERNAL_ROAD | 内部道路 | 园区、小区、商场、停车场内部道路 |  
| PARKING_ACCESS | 停车场接入路 | 通往停车场的道路 |  
| CHARGING_ACCESS | 充电站接入路 | 通往充电站的道路 |  
  
road_type 只描述道路属性，不描述业务用途。

## 5. route_status：路径状态  
  
route_status 表示当前路径是否可以被系统使用。  
  
| 状态 | 含义 |  
|---|---|  
| Planned | 规划中，尚未投入使用 |  
| Active | 可通行，可以参与运营 |  
| Restricted | 限制通行，只允许部分场景或部分时段使用 |  
| Closed | 关闭，不允许通行 |  
  
第一阶段可以只实现状态字段，不必展开复杂限行规则。
## 6. Route 与业务任务的关系  
  
Route 不直接表达业务任务。   
同一条 Route 可以在不同业务对象中被复用。  
例如：  
  
| 业务对象          | 使用方式                     |     |
| ------------- | ------------------------ | --- |
| DispatchTask  | 车辆从当前位置前往目标位置            |     |
| Trip          | 车辆载客从上车位置前往下车位置          |     |
| RebalanceTask | 空车从低需求位置移动到高需求位置         |     |
| ChargingTask  | 车辆前往具备 can_charge 的位置    |     |
| ParkingTask   | 车辆前往具备 can_long_park 的位置 |     |

示例：  
  
```text  
Route: L-001 → L-002  
  
在 DispatchTask 中：  
表示车辆从等待位置前往上车位置。  
  
在 Trip 中：  
表示乘客从上车位置前往下车位置。  
  
在 RebalanceTask 中：  
表示空车从一个区域节点移动到另一个区域节点。
```
因此：

> Route 是空间连接；任务决定用途。

## 7. 生命周期状态

| 状态         | 含义   |
| ---------- | ---- |
| Planned    | 规划中  |
| Active     | 可使用  |
| Restricted | 限制使用 |
| Disabled   | 停用   |
