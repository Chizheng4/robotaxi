# DemandSimulationStrategy：需求模拟策略

## 1. 定义

DemandSimulationStrategy 是服务订单创建时的客户需求随机生成策略对象。

```text
DemandSimulationStrategy = 模拟客户出行需求位置和上下车点的策略
```

用于在后台模拟服务订单创建时生成订单上下文，包括客户、客户当前位置、上车点、下车点。

DemandSimulationRun 记录一次策略执行的结果。

---

## 2. 核心定位

```text
Customer = 订单发起主体
DemandSimulationStrategy = 需求模拟策略对象
DemandSimulationRun = 策略执行记录
ServiceOrder = 服务订单
PricingDecision = 动态定价
OrderMatchingDecision = 订单匹配
Robotaxi = 服务执行资源
Trip = 服务履约记录
```

---

## 3. 核心对象

|对象|职责|
|---|---|
|Customer|客户，需求发起主体|
|DemandSimulationStrategy|需求模拟策略|
|DemandSimulationRun|一次需求模拟策略执行记录|
|ServiceOrder|服务订单，客户出行需求与平台服务承诺|
|PricingDecision|价格预估 / 报价决策|
|OrderMatchingDecision|订单匹配 Robotaxi 的决策|
|Robotaxi|服务执行资源|
|Trip|服务履约记录|
|RoutePlanningRun|路径规划执行记录|
|Route|路径规划结果|

---

## 4. 当前策略对象

当前阶段先定义一个基础策略：

|demand_simulation_strategy_id|strategy_name|strategy_type|simulation_algorithm|
|---|---|---|---|
|DSS-001|基础随机需求模拟策略|BASIC_RANDOM_DEMAND_SIMULATION|BASIC_WEIGHTED_RANDOM_SAMPLING|

作用：

```text
随机选择 Customer
随机生成客户需求位置
映射 pickup_service_area_id / pickup_cell_id
随机生成 dropoff_service_area_id / dropoff_cell_id
输出订单创建上下文
```

说明：

```text
DemandSimulationStrategy 不等于 DemandForecast。
当前阶段是可控随机需求模拟，不是需求预测。
DemandSimulationStrategy 只返回需求模拟结果，不直接创建 ServiceOrder。
ServiceOrder 由调用方根据需求模拟结果创建。
```

---

## 5. 算法模型

DSS-001 使用基础随机采样模型。

```text
simulation_algorithm = BASIC_WEIGHTED_RANDOM_SAMPLING
```

由三部分组成：

1. 均匀随机采样
    
2. 加权随机采样
    
3. 最近可服务点映射
    

---

### 5.1 均匀随机采样

用于从候选集合中随机选择对象。

适用场景：

```text
从 ACTIVE Customer 中选择 1 个 Customer
从候选 Place 中选择 1 个 Place
从候选 RoadSegment 中选择 1 个 RoadSegment
从候选 Cell 中选择 1 个 Cell
```

规则：

```text
每个候选对象被选中的概率相同
P(item) = 1 / candidate_count
```

---

### 5.2 加权随机采样

用于选择客户需求位置类型。

当前权重：

|location_type|weight|
|---|--:|
|PLACE|0.6|
|ROAD_SEGMENT|0.3|
|CELL|0.1|

规则：

```text
P(location_type) = weight / total_weight
```

---

### 5.3 最近可服务点映射

用于将客户需求位置映射为实际上车点。

输入：

```text
customer_origin_cell_id
```

输出：

```text
pickup_service_area_id
pickup_cell_id
```

规则：

```text
从支持 pickup 的 ServiceArea 中
寻找距离 customer_origin_cell_id 最近的可用 pickup_cell
```

可用条件：

```text
ServiceArea.status = ACTIVE
AND
Cell 属于 pickup_cell_ids
AND
Cell 不在 occupied_cell_ids
AND
Cell 不在 unavailable_cell_ids
```

如果存在多个距离相同的 pickup_cell：

```text
随机选择 1 个
```

---

### 5.4 dropoff 选择算法

下车点采用可用 ServiceArea 随机选择。

规则：

```text
筛选支持 dropoff 的 ServiceArea
↓
随机选择 1 个 dropoff_service_area
↓
从 dropoff_cell_ids 中随机选择 1 个可用 dropoff_cell
```

可用条件：

```text
ServiceArea.status = ACTIVE
AND
Cell 属于 dropoff_cell_ids
AND
Cell 不在 unavailable_cell_ids
```

优先避免：

```text
dropoff_service_area_id = pickup_service_area_id
```

如果没有其他可用 dropoff_service_area，可以允许同 ServiceArea 短途订单。

---

### 5.5 随机种子

DemandSimulationRun 可以记录 random_seed。

|字段|含义|
|---|---|
|random_seed|本次随机模拟使用的随机种子，可为空|

用途：

```text
支持复现某次需求模拟结果
支持调试
支持测试
```

如果未指定 random_seed：

```text
系统自动生成随机种子
```

---

### 5.6 算法执行顺序

```text
输入 order_channel
↓
筛选 ACTIVE Customer
↓
均匀随机选择 1 个 Customer
↓
加权随机选择 customer_origin_location_type
↓
根据 location_type 生成 customer_origin_cell_id
↓
使用最近可服务点映射生成 pickup_service_area_id / pickup_cell_id
↓
随机选择 dropoff_service_area_id / dropoff_cell_id
↓
生成 DemandSimulationRun
↓
输出订单创建上下文
```

---

### 5.7 算法失败条件

|failure_reason|触发条件|
|---|---|
|NO_ACTIVE_CUSTOMER|没有 ACTIVE Customer|
|NO_AVAILABLE_PLACE|location_type = PLACE 但无可用 Place|
|NO_AVAILABLE_ROAD_SEGMENT|location_type = ROAD_SEGMENT 但无可用 RoadSegment|
|CUSTOMER_LOCATION_INVALID|无法生成有效 customer_origin_cell_id|
|NO_AVAILABLE_PICKUP_CELL|无法映射可用上车点|
|NO_AVAILABLE_DROPOFF_CELL|无法生成可用下车点|

失败时：

```text
simulation_result = FAILED
不创建 ServiceOrder
```

---

## 6. v020 修订：需求模拟结果对象

为保持策略对象结构统一，需求模拟链路采用以下三层结构：

```text
DemandSimulationStrategy
↓
DemandSimulationRun
↓
DemandSimulationResult
```

|对象|中文名|职责|
|---|---|---|
|DemandSimulationStrategy|需求模拟策略|定义需求模拟算法和规则|
|DemandSimulationRun|需求模拟执行记录|记录一次策略调用、输入快照、输出快照和执行结果|
|DemandSimulationResult|需求模拟结果|保存本次模拟得到的客户、需求位置、上车点和下车点|

DemandSimulationResult 是策略执行后的业务结果对象，类似：

```text
RoutePlanningStrategy → RoutePlanningRun → Route
PricingStrategy → PricingStrategyRun → PricingDecision
OrderMatchingStrategy → OrderMatchingRun → OrderMatchingDecision
```

### 6.1 DemandSimulationResult 核心字段

|字段|中文名|说明|
|---|---|---|
|demand_simulation_result_id|需求模拟结果编号|本次需求模拟结果唯一编号|
|demand_simulation_run_id|需求模拟执行记录编号|关联 DemandSimulationRun|
|demand_simulation_strategy_id|需求模拟策略编号|本次执行使用的策略|
|customer_id|客户编号|本次模拟选择的客户|
|customer_origin_location_type|客户需求位置类型|客户发起需求的位置类型|
|customer_origin_cell_id|客户需求位置|客户发起需求所在 Cell|
|pickup_service_area_id|上车服务区|映射得到的上车 ServiceArea|
|pickup_cell_id|上车位置|映射得到的上车 Cell|
|dropoff_service_area_id|下车服务区|模拟得到的下车 ServiceArea|
|dropoff_cell_id|下车位置|模拟得到的下车 Cell|
|simulation_result|模拟结果|SUCCESS / FAILED|
|failure_reason|失败原因|失败时记录原因|

### 6.2 调用原则

需求模拟策略是服务订单创建流程调用的策略服务。

当前阶段不提供独立的“生成真实需求”功能按钮。前端可以展示需求模拟策略、执行记录和结果，但真实业务单据仍由 ServiceOrder 创建流程根据 DemandSimulationResult 创建。

策略本身只接收输入并返回结果，不主动创建 ServiceOrder，也不改变 ServiceOrder、Robotaxi、Trip 或其他调用方状态。
