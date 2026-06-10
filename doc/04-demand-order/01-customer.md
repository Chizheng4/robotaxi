# Customer：客户

## 1. 定义

Customer 是 Robotaxi 服务订单中的需求发起主体。

```text
Customer = 发起出行需求的客户对象
```

Customer 用于模拟城市中的出行需求，并作为 ServiceOrder 的创建主体。

---

## 2. 核心定位

```text
Customer = 需求发起主体
ServiceOrder = 客户出行订单
PricingDecision = 价格预估决策
OrderMatchingDecision = 订单匹配决策
Trip = 服务履约记录
Robotaxi = 服务执行资源
```

Customer 负责：

```text
客户身份
客户来源
客户当前位置
订单发起
```

Customer 不负责：

```text
价格计算
车辆匹配
路径规划
服务履约
订单完成
```

---

## 3. 核心属性

|字段|含义|
|---|---|
|customer_id|客户唯一编号|
|customer_name|客户名称|
|customer_type|客户类型|
|default_order_channel|默认订单来源|
|customer_status|客户状态|
|created_at|创建时间|

说明：

```text
Customer 是需求主体，不承担实时位置管理职责。
客户位置属于订单创建时的上下文信息。
```

---

## 4. customer_type

|customer_type|含义|
|---|---|
|INDIVIDUAL|普通个人客户|
|BUSINESS|商务客户|
|VISITOR|临时访客|
|TEST_CUSTOMER|测试客户|

当前阶段主要使用：

```text
INDIVIDUAL
TEST_CUSTOMER
```

---

## 5. default_order_channel

|default_order_channel|含义|
|---|---|
|OWN_APP|自有 App|
|PARTNER_APP|外部合作平台|
|MANUAL_TEST|后台模拟测试|

订单创建时可以使用默认渠道，也可以由模拟入口指定渠道。

说明：

```text
default_order_channel 是客户默认渠道偏好。
ServiceOrder.order_channel 是本次订单来源。
二者需要通过创建订单流程映射，不能直接混用字段值。
```

---

## 6. customer_status

|customer_status|含义|
|---|---|
|ACTIVE|可参与订单模拟|
|INACTIVE|不参与订单模拟|
|BLOCKED|被限制下单|
|TEST_ONLY|仅测试使用|

当前阶段主要使用：

```text
ACTIVE
TEST_ONLY
```

---

## 7. Customer 与位置

Customer 本身不维护固定位置。

原因：

```text
客户是需求主体
位置是订单发生时的上下文
```

同一个 Customer：

```text
上午可能在商场
下午可能在办公楼
晚上可能在住宅区
```

因此当前位置不应作为 Customer 的长期属性保存。

订单创建时动态生成：

```text
customer_origin_location_type
customer_origin_place_id
customer_origin_road_segment_id
customer_origin_cell_id
```

并记录到 ServiceOrder。

---

## 8. Customer 与 Place

客户可以在 Place 附近发起需求。

例如：

```text
商场
医院
学校
办公园区
住宅区
交通枢纽
```

Place 表示需求来源位置。

```text
Place ≠ 实际上车点
```

实际上车点仍需映射到可服务的 ServiceArea。

---

## 9. Customer 与 RoadSegment

客户也可以在道路附近发起需求。

例如：

```text
道路边
路口附近
停车区域附近
```

RoadSegment 表示需求发生位置。

```text
RoadSegment ≠ 实际上车点
```

实际上车点仍需映射到 ServiceArea。

---

## 10. Customer 与 ServiceArea

Customer 不属于 ServiceArea。

```text
Customer = 需求主体
ServiceArea = 服务发生区域
```

规则：

1. 客户可以位于任意合理位置；
    
2. 上车点必须属于支持 pickup 的 ServiceArea；
    
3. 下车点必须属于支持 dropoff 的 ServiceArea；
    
4. 无法找到可用 ServiceArea 时订单创建失败。
    

---

## 11. 客户随机选择规则

模拟创建 ServiceOrder 时：

```text
获取 ACTIVE Customer
↓
随机选择 1 个 Customer
↓
生成订单上下文位置
↓
创建 ServiceOrder
```

说明：

```text
需求侧订单应体现随机性。
```

不允许：

```text
固定顺序轮询客户
一次性为所有客户创建订单
```

---

## 12. 订单位置生成规则

创建订单时随机生成需求位置。

支持：

|类型|说明|
|---|---|
|PLACE|来源于某个 Place|
|ROAD_SEGMENT|来源于某个 RoadSegment|
|CELL|来源于普通 Cell|

建议权重：

|类型|权重|
|---|---|
|PLACE|60%|
|ROAD_SEGMENT|30%|
|CELL|10%|

说明：

```text
仅用于模拟需求随机性。
不代表真实需求预测模型。
```

---

## 13. pickup 映射规则

订单创建时：

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
寻找最近可服务 ServiceArea
↓
选择可用 pickup_cell
```

可用条件：

```text
ServiceArea.status = ACTIVE
AND
Cell 属于 pickup_cell_ids
AND
Cell 可用
```

如果不存在：

```text
订单创建失败
NO_AVAILABLE_PICKUP_CELL
```

---

## 14. 示例数据

```json
{
  "customer_id": "CU-001",
  "customer_name": "模拟客户001",
  "customer_type": "INDIVIDUAL",
  "default_order_channel": "OWN_APP",
  "customer_status": "ACTIVE",
  "created_at": "2026-01-01T09:00:00"
}
```

---

## 15. 与 ServiceOrder 的关系

Customer 是 ServiceOrder 的发起主体。

ServiceOrder 记录订单发生时的位置上下文：

```text
customer_id
order_channel

customer_origin_location_type
customer_origin_place_id
customer_origin_road_segment_id
customer_origin_cell_id

pickup_service_area_id
pickup_cell_id

dropoff_service_area_id
dropoff_cell_id
```

说明：

```text
Customer 保存客户信息
ServiceOrder 保存订单发生时的位置信息
```

---

## 16. 当前不做内容

本阶段不做：

```text
客户画像
会员等级
信用评分
历史偏好
优惠券
投诉记录
支付账户
实名认证
隐私管理
```

当前只做：

```text
客户主体
客户随机选择
订单发起
订单位置生成
支撑 ServiceOrder 创建
```

---

## 17. 核心规则

1. Customer 是需求侧主体；
    
2. Customer 是 ServiceOrder 发起者；
    
3. 每次模拟订单随机选择一个 Customer；
    
4. Customer 不维护固定实时位置；
    
5. 订单位置记录在 ServiceOrder；
    
6. pickup 必须来自 ServiceArea；
    
7. dropoff 必须来自 ServiceArea；
    
8. Customer 不负责价格、匹配和履约。
