# 运营中心字段字典迁移说明

运营中心字段字典已合并到统一字段字典：

```text
doc/common/field-dictionary.md
```

后续不再在运营中心目录下维护独立字段字典。

OpsCenter、Robotaxi、Worker、Task、Route、RouteExecution、RoutePlanningStrategy、RoutePlanningRun 等对象或展示字段的英文名、中文名、字段性质和前端显示规则，应以统一字段字典为准。

新增或修改运营中心、车辆、作业人员、任务单、路径规划、行驶记录等相关字段时，应同步更新：

1. 对应业务对象文档；
2. `doc/common/field-dictionary.md`；
3. 初始化数据；
4. 校验规则；
5. 前端字段映射。
