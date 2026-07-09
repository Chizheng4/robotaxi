# Business Target（经营目标）设计

---

# 1. 对象定义

## 对象名称

Business Target

中文：

经营目标

---

## 1.1 对象定位

Business Target 用于定义企业在未来规划周期内希望达到的经营状态。

它是 Business Planning（经营规划管理）的起点，为：

- 长期需求预测；
- 供应生产规划；
- 车队规模规划；

提供目标约束。

---

## 1.2 核心职责

Business Target 负责定义：

- 未来规划周期；
- 目标运营区域；
- 目标服务能力；
- 目标车队规模。

Business Target 不负责：

- 需求预测计算；
- Robotaxi数量计算；
- 生产计划生成。

---

# 2. 所属模块

```
00-business-planning

    01-business-target

    02-demand-profile

    03-supply-production-profile

    04-long-term-demand-forecast
```

---

# 3. 业务关系

整体关系：

```
Business Target

↓

Long-term Demand Forecast

↓

Fleet Production Plan

↓

Robotaxi Formation

↓

Operational Fleet
```

---

# 4. 创建目的

Business Target 用于回答：

## 企业未来想达到什么状态？

例如：

```
2028年

广州运营区域

达到：

1000台Robotaxi运营规模

每日服务50000订单

服务覆盖率90%
```

---

# 5. 核心字段设计

---

# 5.1 基础信息字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|target_id|目标编号|系统字段|唯一编号|
|target_name|目标名称|配置字段|经营目标名称|
|target_type|目标类型|配置字段|目标分类|
|status|状态|系统字段|目标生命周期状态|
|created_at|创建时间|系统字段|创建时间|
|updated_at|更新时间|系统字段|更新时间|

---

## 初始化示例

```
{
  "target_id": "BT-001",
  "target_name": "2028广州Robotaxi运营目标",
  "target_type": "FLEET_SCALE_TARGET",
  "status": "ACTIVE"
}
```

---

# 5.2 规划周期字段

## forecast_horizon_years

中文：

预测规划周期

类型：

配置字段

说明：

企业未来规划时间长度。

单位：

Year

---

示例：

```
{
  "forecast_horizon_years": 3
}
```

含义：

未来3年经营规划。

---

## forecast_start_date

中文：

规划开始时间

类型：

配置字段

---

## forecast_end_date

中文：

规划结束时间

类型：

计算字段

计算：

```
forecast_end_date

=

forecast_start_date

+

forecast_horizon_years
```

---

# 5.3 目标区域字段

## target_zone_ids

中文：

目标运营区域

类型：

配置字段

说明：

未来经营目标覆盖的Zone。

---

示例：

```
{
  "target_zone_ids":[
    "Z-001"
  ]
}
```

---

# 5.4 车队规模目标字段

## target_fleet_quantity

中文：

目标运营车队规模

类型：

配置字段

说明：

规划周期结束时，希望达到的Robotaxi运营数量。

---

示例：

```
{
  "target_fleet_quantity":1000
}
```

---

# 5.5 服务能力目标字段

## target_daily_orders

中文：

目标日订单量

类型：

配置字段

说明：

未来目标周期希望达到的每日服务订单能力。

---

示例：

```
{
  "target_daily_orders":50000
}
```

---

## target_service_level

中文：

目标服务水平

类型：

配置字段

取值：

```
LOW

MEDIUM

HIGH
```

---

说明：

用于约束：

- 响应时间；
- 服务覆盖；
- 运力冗余。

---

# 5.6 经营约束字段

## target_utilization_rate

中文：

目标车辆利用率

类型：

配置字段

范围：

0-1

示例：

```
{
"target_utilization_rate":0.7
}
```

---

## target_coverage_rate

中文：

目标服务覆盖率

类型：

配置字段

范围：

0-1

示例：

```
{
"target_coverage_rate":0.9
}
```

---

# 6. Business Target 状态机

生命周期：

```
Draft

↓

Active

↓

Completed

↓

Archived
```

---

## 状态说明

|状态|说明|
|---|---|
|Draft|目标创建阶段|
|Active|当前生效目标|
|Completed|目标周期结束|
|Archived|历史目标|

---

# 7. 生命周期

```
经营规划启动

↓

创建Business Target

↓

配置目标周期

↓

配置目标区域

↓

配置运营规模

↓

启用目标

↓

驱动需求预测

↓

周期结束

↓

归档
```

---

# 8. 输入与输出关系

---

## 输入

Business Target 不依赖预测结果。

输入：

- 企业战略要求；
- 城市运营规划；
- 管理层目标。

---

## 输出

输出给：

## Long-term Demand Forecast Strategy

提供：

```
forecast_horizon

target_zone

target_service_level

target_fleet_quantity
```

---

关系：

```
Business Target

1:N

Long-term Demand Forecast Run
```

---

# 9. 与其他对象关系

## Business Target → Demand Profile

关系：

无直接计算关系。

说明：

Demand Profile 描述市场基础。

Business Target 描述企业目标。

---

## Business Target → Long-term Demand Forecast Strategy

关系：

```
Business Target

↓

Forecast Strategy
```

---

## Business Target → Fleet Production Plan

关系：

间接。

流程：

```
Business Target

↓

Demand Forecast Result

↓

Fleet Production Plan
```

---

# 10. 软件对象模型

```
{
  "target_id": "BT-001",

  "target_name": "2028广州Robotaxi运营目标",

  "forecast_horizon_years": 3,

  "target_zone_ids": [
    "Z-001"
  ],

  "target_fleet_quantity": 1000,

  "target_daily_orders": 50000,

  "target_service_level": "HIGH",

  "target_utilization_rate": 0.7,

  "target_coverage_rate": 0.9,

  "status": "ACTIVE"
}
```

---

# 11. Codex 实现约束

1. Business Target 属于：

```
00-business-planning
```

不属于：

```
fleet-supply-management
```

---

2. Business Target 不计算需求。

---

3. Business Target 不直接创建Robotaxi。

---

4. Business Target 只提供经营目标约束。

---

5. Forecast Strategy 必须引用 Business Target 的规划周期。

---

6. Fleet Production Plan 必须基于 Forecast Result，而不是直接读取 Business Target。

---

# 12. 核心原则

```
Business Target

定义企业未来想达到什么状态。

Demand Forecast

计算未来市场需要什么。

Fleet Production Plan

决定企业如何形成供给能力。
```

---
