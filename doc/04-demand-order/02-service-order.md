# Service-order：服务订单

## 1. 定义

ServiceOrder 是客户发起的一次 Robotaxi 出行服务订单。

```text
ServiceOrder = 客户出行需求与平台服务承诺的订单单据
```

ServiceOrder 用于记录客户从上车点到下车点的服务请求，并管理订单从创建、价格确认、车辆匹配、接驾、载客、支付结算到完成的生命周期。

当前阶段不设计 ServiceTask。

---

## 2. 核心定位

```text
Customer = 订单发起主体
ServiceOrder = 客户服务订单
PricingDecision = 动态定价决策
OrderMatchingDecision = 订单匹配决策
Robotaxi = 服务执行资源
Trip = 服务履约记录
```

ServiceOrder 负责：

```text
订单来源
客户信息
订单位置
价格结果展示
价格决策记录关联
预估价格记录
实际价格记录
客户确认
订单匹配状态
接驾状态
载客状态
支付状态
订单完成 / 取消 / 失败
```

ServiceOrder 不负责：

```text
价格计算
动态定价算法
车辆匹配算法
路径规划算法
行驶过程记录
服务履约细节
支付渠道实现
```

---

## 3. 核心属性

|字段|含义|
|---|---|
|service_order_id|服务订单唯一编号|
|order_channel|订单来源|
|customer_id|客户编号|
|customer_origin_location_type|客户发起需求的位置类型|
|customer_origin_place_id|客户发起需求的 Place，可为空|
|customer_origin_road_segment_id|客户发起需求的 RoadSegment，可为空|
|customer_origin_cell_id|客户发起需求的 Cell|
|pickup_service_area_id|上车 ServiceArea|
|pickup_cell_id|上车 Cell|
|dropoff_service_area_id|下车 ServiceArea|
|dropoff_cell_id|下车 Cell|
|estimated_pricing_decision_id|预估价格决策记录|
|final_pricing_decision_id|最终价格决策记录，可为空|
|estimated_distance_km|预估距离|
|estimated_duration_min|预估时长|
|estimated_price|预估价格|
|quoted_price|客户确认前展示报价|
|actual_distance_km|实际距离，可为空|
|actual_duration_min|实际时长，可为空|
|final_price|最终结算价格|
|payment_status|支付状态|
|paid_amount|已支付金额|
|payment_completed_at|支付完成时间，可为空|
|pricing_explanation|面向客户展示的价格说明|
|pricing_breakdown_snapshot|定价明细快照|
|order_status|订单状态|
|matched_robotaxi_id|匹配 Robotaxi，可为空|
|order_matching_decision_id|订单匹配决策记录，可为空|
|trip_id|服务履约记录，可为空|
|created_at|创建时间|
|confirmed_at|客户确认时间|
|matched_at|匹配时间|
|completed_at|完成时间|
|cancelled_at|取消时间|
|failure_reason|失败原因，可为空|

说明：

```text
订单需要同时保存：

预估数据：
- estimated_distance_km
- estimated_duration_min
- estimated_price
- estimated_pricing_decision_id

实际数据：
- actual_distance_km
- actual_duration_min
- final_price
- final_pricing_decision_id

支付数据：
- payment_status
- paid_amount
- payment_completed_at

用于比较预估值与实际值之间的差异，
并支持客户查看价格形成过程。
```

---

## 4. order_channel

|order_channel|含义|
|---|---|
|OWN_APP_SIMULATED_ORDER|模拟自有平台服务订单|
|PARTNER_APP_SIMULATED_ORDER|模拟外部平台服务订单|

说明：

```text
当前阶段与运营准入、运营投放保持一致。

订单创建完全采用后台人工触发方式。

系统提供两个独立按钮：

1. 创建自有平台服务订单
2. 创建外部平台服务订单

字段口径：

```text
Customer.default_order_channel 表达客户默认渠道偏好。
ServiceOrder.order_channel 表达本次订单来源。
创建订单时可以由 default_order_channel 映射得到 order_channel，也可以由后台模拟入口明确指定。
```

二者不是同一个字段，不能使用同一组枚举值。

点击按钮后立即触发订单创建流程。

虽然由后台人工点击创建，
但业务语义仍然表示：

客户通过对应渠道发起了一笔服务订单。

未来整体运营体系构建完成后，
再增加自动订单生成能力。

届时系统可根据运营规则、
客户行为模型和市场需求模型，

自动生成服务订单，
用于模拟真实运营环境下的订单流入。
```

---

## 5. order_status

### 5.1 设计原则

订单状态不仅表示系统当前结果，还必须表达：

```text
当前发生了什么
客户下一步应该做什么
平台下一步正在做什么
订单接下来会进入什么阶段
```

因此订单状态应尽量采用客户可理解的业务语义，而不是纯技术状态。

例如：

```text
WAITING_FOR_VEHICLE
表示平台正在找车

WAITING_PASSENGER_BOARDING
表示车辆已到达，等待乘客上车

ON_THE_WAY_TO_DESTINATION
表示正在前往目的地
```

客户看到状态后，应能够立即理解：

```text
现在发生了什么
是否需要自己操作
是否需要等待系统处理
```

---

### 5.2 状态定义

|order_status|客户视角含义|下一步|
|---|---|---|
|CREATED|订单已创建|系统开始计算价格|
|CALCULATING_PRICE|正在计算价格|等待报价生成|
|WAITING_CUSTOMER_CONFIRM|请确认是否叫车|客户确认或取消|
|CUSTOMER_CANCELLED_BEFORE_CONFIRM|客户已取消订单|流程结束|
|WAITING_FOR_VEHICLE|正在为您寻找车辆|等待匹配结果|
|VEHICLE_ASSIGNED|已为您分配车辆|车辆开始接驾|
|VEHICLE_ON_THE_WAY_TO_PICKUP|车辆正在前往上车点|等待车辆到达|
|VEHICLE_ARRIVED_PICKUP|车辆已到达上车点|等待乘客上车|
|WAITING_PASSENGER_BOARDING|请上车|等待乘客确认上车|
|ON_THE_WAY_TO_DESTINATION|正在前往目的地|等待到达|
|ARRIVED_DESTINATION|已到达目的地|等待下车与结算|
|PAYMENT_PROCESSING|正在完成支付|等待支付结果|
|COMPLETED|行程已完成|流程结束|
|CANCELLED|订单已取消|流程结束|
|MATCH_FAILED|暂时无法为您分配车辆|流程结束|
|TRIP_FAILED|行程执行失败|流程结束|

---

### 5.3 支付状态

|payment_status|含义|
|---|---|
|NOT_REQUIRED|无需支付|
|WAITING_PAYMENT|等待支付|
|PAYMENT_PROCESSING|支付处理中|
|PAID|已支付|
|PAYMENT_FAILED|支付失败|

---

### 5.4 状态分类

#### 等待客户操作

```text
WAITING_CUSTOMER_CONFIRM
WAITING_PASSENGER_BOARDING
ARRIVED_DESTINATION
```

#### 平台处理中

```text
CALCULATING_PRICE
WAITING_FOR_VEHICLE
VEHICLE_ON_THE_WAY_TO_PICKUP
ON_THE_WAY_TO_DESTINATION
PAYMENT_PROCESSING
```

#### 状态通知

```text
VEHICLE_ASSIGNED
VEHICLE_ARRIVED_PICKUP
```

#### 终态

```text
CUSTOMER_CANCELLED_BEFORE_CONFIRM
CANCELLED
MATCH_FAILED
TRIP_FAILED
COMPLETED
```

---

## 6. 创建流程

当前阶段采用后台人工创建模式。

系统提供两个按钮：

```text
创建自有平台服务订单
创建外部平台服务订单
```

创建流程：

### 自有平台服务订单

```text
点击【创建自有平台服务订单】
↓
order_channel = OWN_APP_SIMULATED_ORDER
↓
随机选择 Customer
↓
生成 customer_origin_* 位置上下文
↓
映射 pickup_service_area_id / pickup_cell_id
↓
随机选择 dropoff_service_area_id / dropoff_cell_id
↓
创建 ServiceOrder
↓
order_status = CREATED
```

### 外部平台服务订单

```text
点击【创建外部平台服务订单】
↓
order_channel = PARTNER_APP_SIMULATED_ORDER
↓
随机选择 Customer
↓
生成 customer_origin_* 位置上下文
↓
映射 pickup_service_area_id / pickup_cell_id
↓
随机选择 dropoff_service_area_id / dropoff_cell_id
↓
创建 ServiceOrder
↓
order_status = CREATED
```

创建后立即进入：

```text
CREATED
↓
CALCULATING_PRICE
```

说明：

```text
当前阶段所有订单均由人工点击触发。

这样便于运营人员控制系统节奏，
与运营准入、运营投放保持一致。

未来整体运营体系成熟后，
再增加自动订单生成机制。

届时系统可自动模拟真实客户需求，
自动驱动订单创建流程。
```

创建失败场景：

|failure_reason|含义|
|---|---|
|NO_ACTIVE_CUSTOMER|无可用客户|
|CUSTOMER_LOCATION_INVALID|客户位置无效|
|NO_AVAILABLE_PICKUP_CELL|无可用上车点|
|NO_AVAILABLE_DROPOFF_CELL|无可用下车点|

---

## 7. 价格预估流程

订单创建后触发 PricingDecision。

```text
ServiceOrder.CREATED
↓
ServiceOrder.CALCULATING_PRICE
↓
PricingDecision（动态定价）
↓
计算预估距离
计算预估时长
计算预估价格
生成价格说明
生成价格明细
记录计算过程
↓
保存 PricingDecision
↓
写入 ServiceOrder
estimated_pricing_decision_id
estimated_distance_km
estimated_duration_min
estimated_price
quoted_price
pricing_explanation
pricing_breakdown_snapshot
↓
ServiceOrder.WAITING_CUSTOMER_CONFIRM
```

说明：

```text
价格预估属于运营决策中心。

ServiceOrder 不负责价格计算，
只负责保存 PricingDecision 的结果与解释信息。
```

---

## 8. 客户确认与取消

客户看到报价后，可以确认叫车或取消。

客户确认：

```text
WAITING_CUSTOMER_CONFIRM
↓
WAITING_FOR_VEHICLE
```

客户取消：

```text
WAITING_CUSTOMER_CONFIRM
↓
CUSTOMER_CANCELLED_BEFORE_CONFIRM
```

允许取消的状态：

```text
WAITING_CUSTOMER_CONFIRM
WAITING_FOR_VEHICLE
VEHICLE_ASSIGNED
VEHICLE_ON_THE_WAY_TO_PICKUP
VEHICLE_ARRIVED_PICKUP
WAITING_PASSENGER_BOARDING
```

---

## 9. 订单匹配流程

客户确认后进入找车阶段。

```text
WAITING_FOR_VEHICLE
↓
OrderMatchingDecision
↓
匹配 Robotaxi
```

匹配成功：

```text
matched_robotaxi_id = selected_robotaxi_id
order_matching_decision_id = decision_id

order_status = VEHICLE_ASSIGNED
```

随后：

```text
VEHICLE_ASSIGNED
↓
VEHICLE_ON_THE_WAY_TO_PICKUP
```

匹配失败：

```text
order_status = MATCH_FAILED
failure_reason = NO_AVAILABLE_ROBOTAXI
```

---

## 10. 与 Robotaxi 的关系

匹配成功后：

```text
Robotaxi.current_order_id = service_order_id
ServiceOrder.matched_robotaxi_id = robotaxi_id
```

规则：

1. 1 个 ServiceOrder 同一时刻只能匹配 1 台 Robotaxi；
    
2. 1 台 Robotaxi 同一时刻只能执行 1 个 ServiceOrder；
    
3. ServiceOrder 完成、取消或失败后，应释放 Robotaxi 的订单绑定；
    
4. Robotaxi 完成订单后进入可运营供给池。
    

---

## 11. 与 Trip 的关系

订单匹配成功后创建 Trip。

```text
ServiceOrder.VEHICLE_ASSIGNED
↓
创建 Trip
↓
trip_id 写回 ServiceOrder
```

Trip 负责记录：

```text
接驾段
等待乘客
乘客上车
载客段
到达目的地
乘客下车
服务完成
实际距离
实际时长
```

ServiceOrder 记录客户可见状态。

Trip 记录履约过程细节。

---

## 12. 接驾阶段

接驾阶段目标：

```text
Robotaxi 当前 Cell → pickup_cell_id
```

状态流转：

```text
VEHICLE_ASSIGNED
↓
VEHICLE_ON_THE_WAY_TO_PICKUP
↓
VEHICLE_ARRIVED_PICKUP
↓
WAITING_PASSENGER_BOARDING
```

---

## 13. 上车确认

Robotaxi 到达 pickup_cell_id 后等待乘客上车。

```text
WAITING_PASSENGER_BOARDING
↓
ON_THE_WAY_TO_DESTINATION
```

---

## 14. 载客阶段

载客阶段目标：

```text
pickup_cell_id → dropoff_cell_id
```

状态流转：

```text
ON_THE_WAY_DESTINATION
↓
ARRIVED_DESTINATION
```

触发关系：

```text
Trip.ON_THE_WAY_DESTINATION
↓
RoutePlanningRun
↓
Route
↓
Robotaxi 前往 dropoff_cell_id
```

---

## 15. 目的地变更

当前阶段预留目的地变更，不做复杂实现。

基本规则：

1. 不创建新 ServiceOrder；
    
2. 不创建新 Trip；
    
3. 更新 dropoff_service_area_id / dropoff_cell_id；
    
4. 触发新的 RoutePlanningRun；
    
5. Trip 记录目的地变更事件；
    
6. 如影响价格，需要重新触发 PricingDecision；
    
7. 保留原价格决策记录与新价格决策记录。
    

---

## 16. 支付与完成规则

ServiceOrder 完成前必须完成最终结算与支付。

到达目的地后：

```text
ON_THE_WAY_TO_DESTINATION
↓
ARRIVED_DESTINATION
```

随后执行：

```text
乘客下车确认
↓
最终价格核算
↓
生成 final_price
↓
payment_status = WAITING_PAYMENT
↓
PAYMENT_PROCESSING
↓
完成扣款
↓
payment_status = PAID
↓
COMPLETED
```

说明：

```text
车辆到达目的地并不代表订单完成。

订单完成前必须完成：

1. 乘客下车确认
2. 最终价格核算
3. 客户支付扣款成功

只有支付成功后，
ServiceOrder 才能进入 COMPLETED。
```

完成后：

```text
completed_at = 当前时间
paid_amount = final_price
payment_completed_at = 当前时间
Robotaxi.current_order_id = null
```

---

## 17. 失败与取消

|failure_reason|含义|
|---|---|
|CUSTOMER_CANCELLED|客户取消|
|NO_AVAILABLE_ROBOTAXI|无可用 Robotaxi|
|PICKUP_FAILED|接驾失败|
|PASSENGER_NO_SHOW|乘客未上车|
|TRIP_ROUTE_FAILED|载客路径失败|
|PAYMENT_FAILED|支付失败|
|ROBOTAXI_FAULT|Robotaxi 故障|
|UNKNOWN|未知原因|

---

## 18. TaskEventLog

典型事件：

|event_type|含义|
|---|---|
|SERVICE_ORDER_CREATED|服务订单创建|
|PRICE_ESTIMATED|价格预估完成|
|PRICING_DECISION_RECORDED|定价决策记录完成|
|CUSTOMER_CONFIRMED_ORDER|客户确认叫车|
|CUSTOMER_CANCELLED_ORDER|客户取消订单|
|ORDER_MATCHING_STARTED|开始订单匹配|
|ORDER_MATCHED|订单匹配成功|
|ORDER_MATCH_FAILED|订单匹配失败|
|PICKUP_STARTED|开始接驾|
|ROBOTAXI_ARRIVED_PICKUP|Robotaxi 到达上车点|
|PASSENGER_ONBOARD_CONFIRMED|乘客上车确认|
|TRIP_STARTED|载客开始|
|ARRIVED_DESTINATION|到达目的地|
|FINAL_PRICE_CALCULATED|最终价格核算完成|
|PAYMENT_STARTED|开始支付|
|PAYMENT_SUCCEEDED|支付成功|
|PAYMENT_FAILED|支付失败|
|PASSENGER_DROPPED_OFF|乘客下车|
|SERVICE_ORDER_COMPLETED|服务订单完成|
|SERVICE_ORDER_FAILED|服务订单失败|

---

## 19. 当前不做内容

本阶段不做：

```text
复杂退款
优惠券
投诉售后
客户信用
真实外部平台规则
```

当前只做：

```text
订单创建
动态价格预估
价格说明展示
客户确认 / 取消
订单匹配
接驾
上车确认
载客
最终价格核算
支付扣款
预估值与实际值记录
价格明细展示
下车确认
订单完成
```

---

## 20. 核心规则

1. ServiceOrder 状态必须体现客户下一步动作或平台当前动作；
    
2. 不使用纯技术结果状态作为主要客户状态；
    
3. 客户看到状态后应知道下一步做什么；
    
4. ServiceOrder 是需求侧主单据；
    
5. 当前阶段不设计 ServiceTask；
    
6. 当前阶段订单创建采用后台人工按钮触发；
    
7. 系统提供自有平台订单和外部平台订单两个创建按钮；
    
8. ServiceOrder 创建后必须先进行动态价格预估；
    
9. 客户确认的是动态定价生成的报价；
    
10. 必须保存预估距离、预估时长和预估价格；
    
11. 客户确认后才进入订单匹配；
    
12. 订单匹配由 OrderMatchingDecision 负责；
    
13. 匹配成功后绑定 Robotaxi；
    
14. 匹配成功后创建 Trip；
    
15. Trip 记录服务履约过程；
    
16. 到达目的地后必须进行最终价格核算；
    
17. 必须保存实际距离、实际时长和最终价格；
    
18. 最终价格由 PricingDecision 决策生成；
    
19. 必须保存价格计算过程与定价明细；
    
20. 客户可以查看预估值与实际值的差异；
    
21. 上车确认前客户可以取消订单；
    
22. 到达目的地后必须完成支付扣款；
    
23. 支付成功后订单才能进入 COMPLETED；
    
24. 订单完成后 Robotaxi 释放为可运营供给；
    
25. 未来整体运营体系完成后，可增加自动订单生成能力；
    
26. 自动订单
