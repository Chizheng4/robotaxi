# Robotaxi 最小运营闭环：空间模型总纲

## 1. 文档目的

本文档定义 Robotaxi 最小运营闭环的空间模型。

上一版 Demo 仅包含：

```text
Zone
OperatingLocation
Route
```

该结构适合原型验证，但不足以支撑完整运营场景。

新的空间模型升级为：

```text
Map
├── Cell
├── Road
├── RoadNode
├── RoadSegment
├── Place
├── ServiceArea
└── Zone
```

目标是在不依赖真实地图的前提下，构建一个可支撑 Robotaxi 运营模拟的空间基础模型。

字段英文名、中文名和前端显示规则统一维护在：

```text
09-field-dictionary.md
```

对应对象文档负责定义业务含义，字段字典负责集中维护字段中英文映射。代码使用英文字段名，前端优先显示中文名。

---

## 2. 核心原则

Robotaxi 运营发生在空间中，因此空间模型需要表达：

- 地图空间；
    
- 道路网络；
    
- 需求来源；
    
- 服务发生位置；
    
- 运营管理区域；
    
- 路径规划可依赖的底层空间与道路网络。
    

核心职责如下：

|对象英文名|对象中文名|职责|
|---|---|---|
|Map|地图|空间容器|
|Cell|网格单元|最小空间单元|
|Road / RoadNode / RoadSegment|道路 / 道路节点 / 道路片段|道路网络|
|Place|地点 / 需求来源|需求来源|
|ServiceArea|服务区域|服务发生范围|
|Zone|运营区域|运营管理区域|

---

## 3. 空间模型结构

```text
Map
├── Cell
├── Road
│   └── RoadSegment
│       └── RoadNode
├── Place
├── ServiceArea
└── Zone
```

对象之间的关系：

```text
Map
└── Cell

Road
└── RoadSegment
    └── ROAD Cell

Place
└── PLACE Cell

RoadSegment
├── ROAD Cell
└── ServiceArea

Zone
├── Cell
├── RoadSegment
├── Place
└── ServiceArea

Route
└── RoadSegment Sequence
```

---

## 4. 核心对象定义

### 4.1 Map

Map（地图）是整个空间模型的容器。

包含：

- Cell
    
- Road
    
- RoadNode
    
- RoadSegment
    
- Place
    
- ServiceArea
    
- Zone
    
- Route
    

第一阶段采用模拟地图，不接入真实地图服务。

---

### 4.2 Cell

Cell（网格单元）是 Map 的最小空间单元。

建议采用规则网格：

```text
2km × 2km
40 × 40 Grid
50m × 50m / Cell
```

基础类型采用互斥设计：

|base_cell_type|含义|
|---|---|
|EMPTY|空白区域|
|ROAD|道路区域|
|PLACE|地点区域|
|BLOCKED|不可通行区域|

同一个 Cell 只能属于一种基础类型。

重要原则：

```text
Cell 表达基础空间事实
ServiceArea 和 Zone 不属于 Cell 类型
```

---

### 4.3 Road

Road（道路）表示完整道路。

例如：

```text
中山大道
天河路
机场高速
```

Road 提供道路语义，不作为路径计算单元。

---

### 4.4 RoadNode

RoadNode（道路节点）表示道路连接节点。

例如：

- 路口
    
- 出入口
    
- 匝道连接点
    
- 道路端点
    

用于构建道路网络拓扑。

---

### 4.5 RoadSegment

RoadSegment（道路片段）是两个 RoadNode 之间的可行驶道路片段。

```text
Road
└── RoadSegment
    └── ROAD Cell
```

RoadSegment 是：

- 路径计算单元；
    
- 车辆移动单元；
    
- 调度分析单元。
    

注意：

```text
RoadSegment 可通行
不代表可提供服务
```

---

### 4.6 Place

Place（地点 / 需求来源）表示需求来源。

例如：

- 住宅区
    
- 办公区
    
- 商场
    
- 医院
    
- 学校
    
- 地铁站
    

```text
PLACE Cell
└── Place
```

Place 用于产生需求，不直接承担接驾或上下车功能。

---

### 4.7 ServiceArea

ServiceArea（服务区域）表示服务发生范围。

例如：

- 接驾区
    
- 上下客区
    
- 临停区
    
- 等待区
    
- 停车区
    

核心原则：

```text
ServiceArea ≠ Cell 类型

ServiceArea 是覆盖在
ROAD Cell / RoadSegment 之上的服务能力层
```

关系如下：

```text
RoadSegment
└── ServiceArea
```

因此：

- RoadSegment 表示可行驶；
    
- ServiceArea 表示可服务；
    
- 并非所有 RoadSegment 都有 ServiceArea。
    

---

### 4.8 Zone

Zone（运营区域）表示运营管理区域。

用于：

- 车辆投放；
    
- 需求统计；
    
- 服务分析；
    
- 经营管理。
    

Zone 可以覆盖：

```text
Zone
├── Cell
├── RoadSegment
├── Place
├── ServiceArea
└── SubZone
```

核心原则：

```text
Zone 是运营管理对象
不是地图基础事实
```

---

### 4.9 Route 迁移说明

Route 不再作为空间模型中的静态对象维护。

Route 是路径规划策略执行后的路径结果，由 RoutePlanningStrategy / RoutePlanningRun 生成，并由 RouteExecution 引用和执行。

Route 主定义见：

```text
doc/05-fleet-asset-management/03-route.md
```

---

## 5. 旧模型与新模型

旧模型：

```text
Zone
OperatingLocation
Route
```

新模型：

```text
Map
├── Cell
├── Road
├── RoadNode
├── RoadSegment
├── Place
├── ServiceArea
└── Zone
```

对应关系：

|旧对象|新对象|
|---|---|
|Zone|Zone|
|OperatingLocation|ServiceArea|
|Route|已迁移为路径规划结果，见 doc/05-fleet-asset-management/03-route.md|

新增对象：

```text
Map
Cell
Road
RoadNode
RoadSegment
Place
```

---

## 6. 第一阶段范围

本阶段仅构建空间模型。

不包含：

- 真实地图接入；
    
- 导航系统；
    
- 调度系统；
    
- 订单系统；
    
- 经营指标系统。
    

重点完成：

1. Map
    
2. Cell
    
3. Road Network
    
4. Place
    
5. ServiceArea
    
6. Zone
    
7. Route
    

建议最小数据规模：

```text
1 Map
1600 Cells

2~4 Roads
4~8 RoadNodes
6~12 RoadSegments

3~6 Places
4~8 ServiceAreas

1 Zone
若干 Routes
```

---

## 7. 后续扩展

空间模型完成后，引入运营对象：

```text
Vehicle
Demand
Order
DispatchTask
Trip
Metric
```

形成完整闭环：

```text
Map / Cell / RoadSegment / Place / ServiceArea / Zone
↓
Vehicle
↓
Demand
↓
Order
↓
DispatchTask
↓
Route
↓
Trip
↓
Metric
```

---

## 8. 核心结论

```text
Map 是空间容器
Cell 是最小空间单元

Road / RoadNode / RoadSegment 构成道路网络

Place 表达需求来源

ServiceArea 表达服务能力覆盖

Zone 表达运营管理覆盖

Route 表达路径计算结果
```

最重要的建模原则：

```text
Cell = 基础空间事实

ServiceArea = 服务能力层

Zone = 运营管理层

Route = 路径结果层
```

该模型以最小复杂度构建一个可运营的 Robotaxi 模拟空间，为后续需求、车辆、调度和履约系统提供统一空间基础。
