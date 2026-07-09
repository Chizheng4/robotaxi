# Zone：运营区域

## 1. 定义

Zone（运营区域）是运营管理区域。

它不是地图基础事实，而是运营者基于 Map 中的空间对象划分出来的经营单元。

Zone 用于车辆投放、需求统计、服务分析、调度管理和经营评估。

---

## 2. 结构

```text
Zone
├── Cell
├── RoadSegment
├── Place
├── ServiceArea
└── SubZone
```

当前业务设计只保留两层 Zone：

- 一级 Zone：面向经营管理、长期需求预测、供应计划和运营投放；
- 二级 SubZone：由 Place 与其周边 ServiceArea 组成，只用于空间经营组织关系。

SubZone 不再继续拆分，也不单独生成需求画像。

---

## 3. 核心属性

|属性英文名|中文名|含义|
|---|---|---|
|zone_id|运营区域编号|运营区域唯一编号|
|map_id|地图编号|所属 Map|
|parent_zone_id|父级区域编号|父级 Zone，可为空|
|zone_name|区域名称|运营区域名称|
|zone_level|区域层级|运营区域层级|
|zone_type|区域类型|运营区域业务类型|
|zone_status|区域状态|运营区域状态|
|cell_ids|覆盖网格列表|覆盖的 Cell 列表|
|road_segment_ids|道路片段列表|包含的 RoadSegment 列表|
|place_ids|地点列表|包含的 Place 列表|
|service_area_ids|服务区域列表|包含的 ServiceArea 列表|
|sub_zone_ids|子区域列表|子 Zone 列表|

---

## 4. zone_level

|zone_level|中文名|含义|
|---|---|---|
|ZONE|标准运营区域|标准运营管理单元|
|SUB_ZONE|子运营区域|标准区域下的子区域|

历史设计中的 `CITY`、`OPERATING_REGION`、`MICRO_ZONE` 暂不进入当前实现，避免多层结构影响画像汇总和长期需求预测。

---

## 5. zone_type

|zone_type|中文名|含义|
|---|---|---|
|RESIDENTIAL_ZONE|住宅区域|以居住需求为主的运营区域|
|OFFICE_ZONE|办公区域|以通勤和办公需求为主的运营区域|
|COMMERCIAL_ZONE|商业区域|以商业、消费、休闲需求为主的运营区域|
|TRANSPORT_ZONE|交通枢纽区域|以接驳和换乘需求为主的运营区域|
|MIXED_ZONE|混合功能区域|多种需求混合的运营区域|
|SUPPORT_ZONE|运营支持区域|停车、补能、运维等支持区域|

---

## 6. zone_status

|zone_status|中文名|含义|
|---|---|---|
|Planned|规划中|尚未投入运营|
|Testing|测试运营|处于测试运营阶段|
|Active|正式运营|正式运营中|
|Restricted|限制运营|部分能力或时段受限|
|Suspended|暂停运营|临时暂停运营|
|Closed|关闭|不再运营|

---

## 7. 示例数据

```json
{
  "zone_id": "Z-001",
  "map_id": "M-001",
  "parent_zone_id": null,
  "zone_name": "最小运营测试区",
  "zone_level": "ZONE",
  "zone_type": "MIXED_ZONE",
  "zone_status": "Testing",
  "cell_ids": ["C-00-00", "C-00-01", "C-01-00", "C-01-01"],
  "road_segment_ids": ["RS-001", "RS-002", "RS-003"],
  "place_ids": ["P-001", "P-002"],
  "service_area_ids": ["SA-001", "SA-002"],
  "sub_zone_ids": ["Z-001-A", "Z-001-B"]
}
```

---

## 8. 关联关系

|对象|关系|
|---|---|
|Map|Zone 属于某个 Map|
|Cell|Zone 可以覆盖一组 Cell|
|RoadSegment|Zone 可以包含一组 RoadSegment|
|Place|Zone 可以包含一组 Place|
|ServiceArea|Zone 可以包含一组 ServiceArea|
|Zone|Zone 可以拥有父 Zone 和子 Zone|

---

## 9. 规则

1. Zone 必须属于一个 Map；
    
2. Zone 是运营管理对象，不是 Cell 基础类型；
    
3. Zone 可以覆盖 Cell，也可以引用 RoadSegment、Place 和 ServiceArea；
    
4. Zone 当前只支持一级 Zone 和二级 SubZone 两层结构；
    
5. 子 Zone 应属于同一个 Map；
    
6. 子 Zone 的空间范围应被父 Zone 覆盖；
    
7. Zone 不直接表达道路通行能力；
    
8. Zone 不直接表达服务能力；
    
9. 道路通行能力由 RoadSegment 表达；
    
10. 服务能力由 ServiceArea 表达；
11. DemandProfile 只对一级 Zone、Place 和 ServiceArea 生成，SubZone 只提供汇总关系。
    

---

## 10. 核心原则

```text
Zone = 空间经营单元
```

Zone 的核心价值不是表达地图事实，而是把一组空间对象组织成可管理、可统计、可优化的运营区域。
