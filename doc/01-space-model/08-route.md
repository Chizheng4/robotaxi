# Route 迁移说明

Route 不再作为地图空间中的静态对象维护。

当前系统中，Route 表示路径规划策略执行后生成的路径结果，是 RoutePlanningStrategy / RoutePlanningRun 的输出，并由 RouteExecution 引用和执行。

Route 的主定义已迁移至：

`doc/05-dispatch-trip/02-route.md`

空间模型只保留 Map、Cell、Road、RoadNode、RoadSegment、Place、ServiceArea、Zone 等底层空间与道路网络对象。
