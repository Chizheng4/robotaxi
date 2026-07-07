
> 历史版本说明：本文档属于第一版 `Zone / OperatingLocation / Route` 原型文档，仅用于历史对比和回退参考。新版空间 Map 模型已经将 OperatingLocation 拆分为 `Place`（地点 / 需求来源）和 `ServiceArea`（服务区域），请以 `05-place.md`、`06-servicearea.md` 和 `initialization-map.md` 为准。


## 1. 业务含义

OperatingLocation是运营位置点 是 Robotaxi 最小运营闭环中，被运营系统识别和使用的现实空间位置。
它代表 Zone 内一个具体的可运营地点，例如住宅区门口、办公区入口、地铁站出口、商场入口、停车场、充电站等。
一个 OperatingLocation 可以同时具备多种运营能力，例如产生需求、上车、下车、等待、临停、停车、充电和作为调度目标。
OperatingLocation = 现实地点 + 该地点具备的运营能力集合
OperatingLocation 是连接真实空间和运营动作的基础节点。  
它支撑后续对象：  
- Demand：需求从哪里产生；  
- Order：用户在哪里上车、下车；  
- Vehicle：车辆在哪里等待、停放、充电；  
- DispatchTask：系统可以把车调度到哪里；  
- Trip：一次服务从哪里开始、到哪里结束。
## 2. 与旧 Point 定义的区别  
  
旧定义中，Point 容易被理解为单一业务动作点：  
  
- PICKUP_POINT：上车点；  
- DROPOFF_POINT：下车点；  
- WAITING_POINT：等待点；  
- PARKING_POINT：停车点；  
- CHARGING_POINT：充电点。  
  
这种定义不够接近真实世界。  
真实世界中，一个位置通常可以支持多种行为。  
例如一个办公区入口可以上车、下车、产生需求和临时停车；一个充电站也可能支持充电、等待、停车、上下车。  
  
因此，本项目将 Point 升级为 OperatingLocation。  
  
| 旧定义                       | 新定义                                  |
| ------------------------- | ------------------------------------ |
| Point 表示某一种业务动作点          | OperatingLocation 表示真实空间位置           |
| point_type 表示上车点、下车点、等待点等 | location_type 表示住宅区、办公区、地铁站、停车场等地点类型 |
| 一个 Point 通常只有一个用途         | 一个 OperatingLocation 可以有多个运营能力       |
| 地点类型和业务动作混在一起             | 地点类型与运营能力分开建模                        |

## 3. 关键属性
| 属性               | 含义           |
| ---------------- | ------------ |
| location_id      | 位置唯一编号       |
| zone_id          | 所属运营区域       |
| location_name    | 位置名称         |
| location_type    | 现实地点类型       |
| longitude        | 经度           |
| latitude         | 纬度           |
| operating_status | 运营状态         |
| capabilities     | 该位置具备的运营能力集合 |
| capacity         | 可容纳车辆数量      |
| demand_weight    | 需求产生权重       |
| service_priority | 服务优先级        |
| created_at       | 创建时间         |
| updated_at       | 更新时间         |

## 4. location_type地点类型
location_type 表示这个位置在真实世界中是什么地方。    
它回答：  
> 这个位置是什么类型的地点？  

| location_type | 中文含义 |  
|---|---|  
| RESIDENTIAL_AREA | 住宅区 |  
| OFFICE_AREA | 办公区 |  
| METRO_STATION | 地铁站 |  
| SHOPPING_MALL | 商场 |  
| SCHOOL | 学校 |  
| HOSPITAL | 医院 |  
| PARKING_LOT | 停车场 |  
| CHARGING_STATION | 充电站 |  
| TRANSPORT_HUB | 交通枢纽 |  
| HOTEL | 酒店 |  
  
location_type 主要用于理解地点的现实场景，并为初始化默认运营能力提供依据。


## 5. capabilities：运营能力
capabilities 表示某个具体位置最终允许发生哪些运营行为。  
  
它回答：  
  
> 这个位置可以做什么？  
  
第一阶段建议支持：  
  
| 能力字段                | 含义         |
| ------------------- | ---------- |
| can_generate_demand | 是否可以产生用户需求 |
| can_pickup          | 是否允许上车     |
| can_dropoff         | 是否允许下车     |
| can_wait            | 是否允许车辆等待   |
| can_temp_park       | 是否允许临时停车   |
| can_long_park       | 是否允许长时间停车  |
| can_charge          | 是否支持充电     |
| can_dispatch_to     | 是否允许作为调度目标 |
示例：  
  
```json  
{  
"can_generate_demand": true,  
"can_pickup": true,  
"can_dropoff": true,  
"can_wait": false,  
"can_temp_park": true,  
"can_long_park": false,  
"can_charge": false,  
"can_dispatch_to": true  
}
```

## 6. location_type 与 capabilities 的关系

location_type 和 capabilities 有关联，但不是一一绑定关系。
location_type 表示地点类型，用于提供默认判断依据。
capabilities 表示具体位置的最终运营能力，系统做业务判断时必须以 capabilities 为准。
例如，同样是 OFFICE_AREA：

| 位置       | location_type | capabilities 差异 |
| -------- | ------------- | --------------- |
| 办公区主入口   | OFFICE_AREA   | 可上下车、可临停、不可等待   |
| 办公区地下停车场 | OFFICE_AREA   | 可上下车、可等待、可停车    |
| 办公区内部道路  | OFFICE_AREA   | 可能只允许下车，不允许临停   |

因此：

> location_type 用于理解和初始化；capabilities 用于真实业务判断。

## 7. 默认能力矩阵

以下矩阵表示不同地点类型的默认运营能力倾向。  
该矩阵只用于初始化和参考，具体位置可以根据真实情况覆盖调整。

| location_type    | can_generate_demand | can_pickup | can_dropoff | can_wait | can_temp_park | can_long_park | can_charge | can_dispatch_to |
| ---------------- | ------------------- | ---------- | ----------- | -------- | ------------- | ------------- | ---------- | --------------- |
| RESIDENTIAL_AREA | true                | true       | true        | true     | true          | false         | false      | true            |
| OFFICE_AREA      | true                | true       | true        | false    | true          | false         | false      | true            |
| METRO_STATION    | true                | true       | true        | false    | true          | false         | false      | true            |
| SHOPPING_MALL    | true                | true       | true        | true     | true          | false         | false      | true            |
| SCHOOL           | true                | true       | true        | false    | true          | false         | false      | true            |
| HOSPITAL         | true                | true       | true        | false    | true          | false         | false      | true            |
| PARKING_LOT      | false               | true       | true        | true     | true          | true          | false      | true            |
| CHARGING_STATION | false               | true       | true        | true     | true          | true          | true       | true            |
| TRANSPORT_HUB    | true                | true       | true        | true     | true          | false         | false      | true            |
| HOTEL            | true                | true       | true        | true     | true          | false         | false      | true            |

## 8. 能力覆盖规则

系统判断一个位置是否可用于某个业务动作时，应遵守以下规则：

1. 创建 OperatingLocation 时，可以根据 location_type 初始化默认 capabilities；
2. 运营人员可以根据真实道路、场地、安全和管理规则修改 capabilities；
3. 系统执行派单、调度、停车、充电、上下客判断时，只读取最终 capabilities；
4. 不允许仅根据 location_type 直接判断业务动作；
5. 如果 capabilities 缺失，该位置应视为配置不完整，不应参与运营。
## 6. 生命周期状态
|状态|含义|
|---|---|
|Planned|规划中，尚未投入运营|
|Active|可使用，允许参与运营|
|Restricted|限制使用，只允许部分能力或部分时段使用|
|Disabled|停用，不允许参与运营|
