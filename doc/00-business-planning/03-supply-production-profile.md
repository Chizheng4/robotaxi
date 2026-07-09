# Supply Production Profile（供应生产画像）设计

---

# 1. 对象定义

## 对象名称

Supply Production Profile

中文：

供应生产画像

---

## 1.1 对象定位

Supply Production Profile 用于描述企业通过自有生产形成 Robotaxi 供给能力时的生产约束、生产能力和生产节奏。

它不是生产计划，也不是生产执行过程。

它描述：

> 企业未来能够以什么速度、什么规模、什么周期形成 Robotaxi 供给能力。

---

## 1.2 核心职责

Supply Production Profile 负责定义：

- Robotaxi生产提前期；
- Robotaxi生产能力；
- Robotaxi产能分配比例；
- 生产爬坡能力；
- 车辆交付能力。

---

不负责：

- 具体生产任务；
- 生产过程执行；
- 工厂MES管理；
- 零部件采购。
- 车商供应；
- 私家车车主网络供给。

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

# 3. 业务定位

Supply Production Profile 解决：

> 当长期需求预测发现未来需要更多Robotaxi时，企业是否能够按时间形成对应供给能力。

---

业务关系：

```
Business Target

↓

Long-term Demand Forecast

↓

Supply Production Profile

↓

Fleet Production Plan

↓

Robotaxi Asset Formation
```

---

# 4. 画像对象关系

Supply Production Profile 是独立对象。

一个企业可以有多个生产画像。

例如：

```
SPP-001

Robotaxi自产工厂A


SPP-002

Robotaxi扩产阶段工厂A


SPP-003

未来新工厂B
```

---

关系：

```
Business Planning

        |

        ↓

Supply Production Profile

        |

        ↓

Fleet Production Plan
```

---

# 5. 核心字段设计

---

# 5.1 基础信息字段

|字段英文|中文|类型|说明|
|---|---|---|---|
|profile_id|画像编号|系统字段|唯一编号|
|profile_name|画像名称|配置字段|画像名称|
|profile_type|画像类型|配置字段|生产能力类型|
|status|状态|系统字段|当前状态|
|effective_from|生效时间|配置字段|开始生效时间|
|effective_to|失效时间|配置字段|结束时间|

---

初始化：

```
{
"profile_id":"SPP-001",
"profile_name":"Robotaxi自生产能力画像",
"profile_type":"ROBOTAXI_MANUFACTURING",
"status":"ACTIVE",
"effective_from":"2026-01-01"
}
```

---

# 6. 生产提前期字段

## production_lead_time_days

中文：

生产提前期

类型：

配置字段

定义：

从生产需求确认到Robotaxi完成交付的时间。

单位：

Day

示例：

```
{
"production_lead_time_days":180
}
```

---

影响：

决定：

```
什么时候开始生产
```

---

# 7. 生产能力字段

## annual_production_capacity

中文：

年度生产能力

类型：

配置字段

定义：

一年最大Robotaxi生产数量。

单位：

vehicle/year

示例：

```
{
"annual_production_capacity":10000
}
```

---

## monthly_production_capacity

中文：

月生产能力

类型：

计算字段

公式：

```
Monthly Production Capacity

=

Annual Production Capacity

÷

12
```

---

示例：

```
10000 ÷ 12

=

833台/月
```

---

# 8. Robotaxi产能分配字段

因为工厂不会全部生产Robotaxi。

---

## total_factory_capacity

中文：

工厂总产能

类型：

配置字段

示例：

```
50000 vehicles/year
```

---

## robotaxi_allocation_rate

中文：

Robotaxi产能分配比例

类型：

配置字段

范围：

0-1

示例：

```
0.2
```

表示：

20%产能用于Robotaxi。

---

## robotaxi_production_capacity

中文：

Robotaxi生产能力

类型：

计算字段

公式：

```
Robotaxi Production Capacity

=

Total Factory Capacity

×

Robotaxi Allocation Rate
```

---

示例：

```
50000

×

20%

=

10000
```

---

# 9. 产能爬坡字段

## production_ramp_factor

中文：

产能爬坡系数

类型：

配置字段

定义：

新生产能力达到稳定产能的比例。

范围：

0-1

示例：

```
Year 1:

0.5


Year 2:

0.8


Year 3:

1.0
```

---

## effective_production_capacity

中文：

有效生产能力

类型：

计算字段

公式：

```
Effective Production Capacity

=

Robotaxi Production Capacity

×

Production Ramp Factor
```

---

# 10. 交付能力字段

生产完成不等于运营可用。

增加：

## delivery_capacity

中文：

交付能力

类型：

配置字段

定义：

单位周期能够完成交付运营中心的数量。

单位：

vehicle/month

示例：

```
800/month
```

---

# 11. 质量验证字段

车辆进入运营前需要验证。

---

## inspection_lead_time_days

中文：

验证周期

类型：

配置字段

定义：

生产完成到验证完成时间。

示例：

```
15 days
```

---

# 12. 计算字段总结

## monthly_production_capacity

计算：

```
annual_production_capacity / 12
```

---

## robotaxi_production_capacity

计算：

```
total_factory_capacity

×

robotaxi_allocation_rate
```

---

## effective_production_capacity

计算：

```
robotaxi_production_capacity

×

production_ramp_factor
```

---

# 13. Supply Production Profile 输入输出

## 输入

来自：

企业生产能力配置。

包括：

- 工厂能力；
- 产能比例；
- 生产周期；
- 爬坡计划。

---

## 输出

提供给：

Fleet Production Plan。

输出：

```
可生产数量

+

生产周期

+

最早交付时间
```

---

# 14. 与 Long-term Demand Forecast 关系

关系：

不是直接计算需求。

而是：

```
Long-term Demand Forecast Result

        +

Supply Production Profile

        ↓

Fleet Production Plan
```

---

例如：

预测：

2028需要新增：

6000台Robotaxi。

生产画像：

有效产能：

1000台/月。

生成：

```
Month 1:
1000

Month 2:
1000

Month 3:
1000

...
```

---

# 15. 生命周期

```
Draft

↓

Active

↓

Updated

↓

Expired

↓

Archived
```

---

# 16. 软件对象模型

```
{
"profile_id":"SPP-001",

"profile_name":"Robotaxi自产生产能力画像",

"production_lead_time_days":180,

"total_factory_capacity":50000,

"robotaxi_allocation_rate":0.2,

"robotaxi_production_capacity":10000,

"production_ramp_factor":1.0,

"effective_production_capacity":10000,

"delivery_capacity":800,

"inspection_lead_time_days":15,

"status":"ACTIVE"
}
```

---

# 17. Codex 实现约束

1. Supply Production Profile 属于：

```
00-business-planning
```

不属于：

```
fleet-supply-management
```

---

2. Supply Production Profile 不生成Robotaxi。

---

3. Supply Production Profile 不生成生产任务。

---

4. Supply Production Profile 只描述生产能力约束。

---

5. Fleet Production Plan 必须读取：

```
Long-term Demand Forecast Result

+

Supply Production Profile
```

---

6. 生产能力字段与预测结果字段必须分离。

---

# 18. 核心原则

```
Demand Profile

描述市场需要什么


Supply Production Profile

描述企业能够形成什么


Forecast Strategy

计算未来需要什么


Fleet Production Plan

决定如何形成供给
```
