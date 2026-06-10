# initialization-customer：客户初始化方案

## 1. 目的

本文档定义 Robotaxi 最小运营闭环中 Customer 的初始化要求。

Customer 初始化的目标是生成一组可参与需求模拟的客户对象，为后续 DemandSimulationStrategy 创建服务订单上下文提供客户池。

```text
Customer 初始化
↓
形成 Customer Pool
↓
DemandSimulationStrategy 从 Customer Pool 中随机选择 Customer
↓
DemandSimulationRun 生成订单创建上下文
↓
ServiceOrder 创建
```

---

## 2. 核心边界

Customer 初始化只负责生成客户主体。

Customer 初始化不负责：

```text
生成客户实时位置
生成订单上下文
选择 Place / RoadSegment / Cell
映射 pickup_service_area_id / pickup_cell_id
选择 dropoff_service_area_id / dropoff_cell_id
创建 ServiceOrder
```

这些职责属于：

```text
DemandSimulationStrategy
DemandSimulationRun
```

---

## 3. 初始化对象

当前阶段初始化 Customer。

Customer 属性如下：

|字段|含义|
|---|---|
|customer_id|客户唯一编号|
|customer_name|客户名称|
|customer_type|客户类型|
|default_order_channel|默认订单来源|
|customer_status|客户状态|
|created_at|创建时间|

---

## 4. 初始化规模

第一阶段初始化 54 个 Customer。

```text
Customer 总数 = 54
```

原因：

```text
当前运营规模为 20 台 Robotaxi。
54 个 Customer 可以提供更丰富的需求模拟样本。
能够支撑持续订单生成、策略测试和运营验证。
```

后续可根据订单模拟强度扩展客户数量。

---

## 5. customer_id 规则

```text
customer_id = CU-001 ~ CU-054
```

示例：

```text
CU-001
CU-002
CU-003
...
CU-054
```

---

## 6. customer_name 规则

当前阶段使用模拟客户名称。

```text
模拟客户001
模拟客户002
模拟客户003
...
模拟客户054
```

示例：

```json
{
  "customer_id": "CU-001",
  "customer_name": "模拟客户001"
}
```

---

## 7. customer_type 初始化规则

当前阶段主要使用：

```text
INDIVIDUAL
TEST_CUSTOMER
```

建议初始化比例：

|customer_type|数量|说明|
|---|---|---|
|INDIVIDUAL|48|普通模拟客户|
|TEST_CUSTOMER|6|测试客户|

说明：

```text
BUSINESS 和 VISITOR 当前阶段暂不初始化。
后续可用于商务客户、临时访客等扩展场景。
```

---

## 8. default_order_channel 初始化规则

当前支持：

```text
OWN_APP
PARTNER_APP
MANUAL_TEST
```

建议初始化比例：

|default_order_channel|数量|说明|
|---|---|---|
|OWN_APP|36|模拟自有平台客户|
|PARTNER_APP|14|模拟外部平台客户|
|MANUAL_TEST|4|后台测试客户|

说明：

```text
default_order_channel 是客户默认订单来源。
实际创建订单时，也可以由后台按钮传入 order_channel 覆盖。
```

---

## 9. customer_status 初始化规则

当前阶段主要使用：

```text
ACTIVE
TEST_ONLY
```

建议初始化：

|customer_status|数量|说明|
|---|---|---|
|ACTIVE|50|可参与需求模拟|
|TEST_ONLY|4|仅测试使用|

不建议当前初始化：

```text
INACTIVE
BLOCKED
```

说明：

```text
DemandSimulationStrategy 只从 ACTIVE Customer 中随机选择客户。
TEST_ONLY 客户默认不参与普通订单模拟，除非测试入口指定使用。
```

---

## 10. 初始化示例数据

```json
[
  {
    "customer_id": "CU-001",
    "customer_name": "模拟客户001",
    "customer_type": "INDIVIDUAL",
    "default_order_channel": "OWN_APP",
    "customer_status": "ACTIVE",
    "created_at": "2026-01-01T09:00:00"
  },
  {
    "customer_id": "CU-054",
    "customer_name": "模拟客户054",
    "customer_type": "TEST_CUSTOMER",
    "default_order_channel": "MANUAL_TEST",
    "customer_status": "TEST_ONLY",
    "created_at": "2026-01-01T09:00:00"
  }
]
```

---

## 11. 与 DemandSimulationStrategy 的关系

Customer 初始化完成后形成 Customer Pool。

DemandSimulationStrategy 调用时：

```text
读取 Customer Pool
↓
筛选 customer_status = ACTIVE
↓
均匀随机选择 1 个 Customer
↓
继续生成订单上下文
```

Customer 初始化不决定：

```text
客户这次在哪里下单
客户上车点在哪里
客户目的地在哪里
```

这些由 DSS-001 完成：

```text
DSS-001：基础随机需求模拟策略
simulation_algorithm = BASIC_WEIGHTED_RANDOM_SAMPLING
```

---

## 12. 与 DemandSimulationRun 的关系

DemandSimulationRun 记录某次需求模拟策略执行结果。

其中 customer_id 来自初始化后的 Customer Pool。

```text
Customer
↓
DemandSimulationStrategy
↓
DemandSimulationRun.customer_id
↓
ServiceOrder.customer_id
```

说明：

```text
Customer 是静态客户主体。
DemandSimulationRun 记录一次动态需求发生。
ServiceOrder 记录一次服务订单。
```

---

## 13. 与 ServiceOrder 的关系

ServiceOrder 创建时引用 Customer。

```text
ServiceOrder.customer_id = Customer.customer_id
```

ServiceOrder 中的订单位置字段不来自 Customer 初始化，而来自 DemandSimulationRun：

```text
customer_origin_location_type
customer_origin_place_id
customer_origin_road_segment_id
customer_origin_cell_id
pickup_service_area_id
pickup_cell_id
dropoff_service_area_id
dropoff_cell_id
```

---

## 14. 初始化校验规则

Customer 初始化后应检查：

1. customer_id 不重复；
    
2. customer_name 不为空；
    
3. customer_type 必须在枚举范围内；
    
4. default_order_channel 必须在枚举范围内；
    
5. customer_status 必须在枚举范围内；
    
6. 至少存在 1 个 ACTIVE Customer；
    
7. TEST_ONLY 客户不参与普通 DemandSimulationStrategy 随机选择。
    

---

## 15. Codex 实现要求

Codex 初始化 Customer 时，应完成：

1. 生成 54 个 Customer；
    
2. 按规则生成 customer_id；
    
3. 按规则生成 customer_name；
    
4. 设置 customer_type；
    
5. 设置 default_order_channel；
    
6. 设置 customer_status；
    
7. 输出 Customer 初始化数据；
    
8. 输出初始化校验结果；
    
9. 不生成客户实时位置；
    
10. 不生成 ServiceOrder；
    
11. 不调用 DemandSimulationStrategy。
    

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
客户实时位置
客户历史订单
```

当前只做：

```text
客户主体初始化
Customer Pool 生成
支撑 DemandSimulationStrategy 随机选择客户
```

---

## 17. 规则

1. Customer 是需求侧主体；
    
2. Customer 初始化只生成客户主体；
    
3. Customer 不维护固定实时位置；
    
4. Customer 不生成订单位置；
    
5. Customer 不映射 pickup；
    
6. Customer 不选择 dropoff；
    
7. Customer 不创建 ServiceOrder；
    
8. DemandSimulationStrategy 负责订单上下文生成；
    
9. DemandSimulationRun 记录一次需求模拟执行；
    
10. ServiceOrder 引用 Customer 和 DemandSimulationRun 的结果。