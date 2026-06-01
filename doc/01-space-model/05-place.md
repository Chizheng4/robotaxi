# Place：地点 / 需求来源

## 1. 定义

Place（地点 / 需求来源）表示 Map 中会产生出行需求的地点、建筑或土地使用区域。

例如：

```text
住宅区
办公区
商场
医院
学校
地铁站
酒店
交通枢纽
```

Place 用于表达需求来源，不直接承担接驾、上下车或车辆等待功能。

---

## 2. 结构

```text
Place
└── PLACE Cell
```

一个 Place 可以覆盖多个 PLACE Cell。

Place 产生需求，实际服务通常发生在附近的 ServiceArea。

---

## 3. 核心属性

|属性英文名|中文名|含义|
|---|---|---|
|place_id|地点编号|地点唯一编号|
|map_id|地图编号|所属 Map|
|place_name|地点名称|地点名称|
|place_type|地点类型|现实场景或土地使用类型|
|place_status|地点状态|地点状态|
|cell_ids|覆盖地点网格|覆盖的 PLACE Cell 列表|
|demand_weight|需求权重|相对需求强度|
|peak_pattern|需求高峰模式|需求时间分布模式|
|nearby_service_area_ids|附近服务区域列表|附近可服务区域列表|

---

## 4. place_type

|place_type|中文名|含义|
|---|---|---|
|RESIDENTIAL|住宅区|居民出行需求来源|
|OFFICE|办公区|通勤、商务出行需求来源|
|COMMERCIAL|商业区 / 商场|购物、休闲出行需求来源|
|SCHOOL|学校|校园相关出行需求来源|
|HOSPITAL|医院|就医、探访出行需求来源|
|METRO_STATION|地铁站|公共交通接驳需求来源|
|HOTEL|酒店|住客、商务出行需求来源|
|TRANSPORT_HUB|交通枢纽|综合交通换乘需求来源|

---

## 5. peak_pattern

|peak_pattern|中文名|含义|
|---|---|---|
|MORNING_OUTBOUND|早高峰流出|早晨从该地点出发需求较强|
|EVENING_INBOUND|晚高峰流入|傍晚到达该地点需求较强|
|EVENING_OUTBOUND|晚高峰流出|傍晚从该地点出发需求较强|
|ALL_DAY_STABLE|全天稳定|全天需求相对稳定|
|WEEKEND_PEAK|周末高峰|周末需求更强|
|EVENT_DRIVEN|事件驱动|受活动或事件影响|
|LOW_DEMAND|低需求|需求强度较低|

---

## 6. place_status

|place_status|中文名|含义|
|---|---|---|
|Planned|规划中|尚未投入模拟|
|Active|可使用|可作为需求来源|
|Restricted|限制使用|需求生成或关联服务受限|
|Closed|关闭|不参与模拟|

---

## 7. 示例数据

```json
{
  "place_id": "P-001",
  "map_id": "M-001",
  "place_name": "住宅生活区",
  "place_type": "RESIDENTIAL",
  "place_status": "Active",
  "cell_ids": ["C-05-05", "C-05-06", "C-06-05", "C-06-06"],
  "demand_weight": 0.9,
  "peak_pattern": "MORNING_OUTBOUND",
  "nearby_service_area_ids": ["SA-001", "SA-002"]
}
```

---

## 8. 关联关系

|对象|关系|
|---|---|
|Map|Place 属于某个 Map|
|Cell|Place 覆盖一组 PLACE Cell|
|ServiceArea|Place 附近可以关联一个或多个 ServiceArea|
|Zone|Zone 可以包含 Place|
|Demand|Demand 可以基于 Place 生成|

---

## 9. 规则

1. Place 必须属于一个 Map；
    
2. Place 必须覆盖一个或多个 PLACE Cell；
    
3. Place 用于表达需求来源；
    
4. Place 不直接表示上车点、下车点或接驾区；
    
5. 用户需求可以从 Place 产生；
    
6. 实际接驾、上车、下车应发生在 ServiceArea；
    
7. Place 可以关联附近的 ServiceArea；
    
8. demand_weight 用于表达该 Place 的相对需求强度；
    
9. peak_pattern 用于表达需求的时间分布特征。
    

---

## 10. 核心原则

```text
Place = 需求来源
ServiceArea = 服务发生范围
```

Place 解释需求为什么产生，ServiceArea 决定服务在哪里发生。
