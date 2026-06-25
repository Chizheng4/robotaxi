import * as taskTypes from "./taskTypes.js";

export const routePlanningStrategies = [
  {
    route_strategy_id: taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
    strategy_name: "初始运营投放路径规划策略",
    strategy_type: "INITIAL_DEPLOYMENT_ROUTE",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_object_type: "routeExecution",
    trigger_task_status: "WAITING_ROUTE",
    origin_rule: "使用运营行驶记录当前所在位置",
    target_rule: "使用投放任务当前计划目标位置",
    service_area_scope_rule: "不改变任务目标服务区",
    route_generation_rule: "基于道路片段有序网格、道路节点连接和 BFS 网格图搜索生成可执行路径步骤",
    route_update_rule: "创建初始路径，并绑定运营行驶记录",
    strategy_status: "Active",
  },
  {
    route_strategy_id: taskTypes.RoutePlanningStrategy.ABNORMAL_SAME_SERVICE_AREA,
    strategy_name: "异常到达同服务区替代路径规划策略",
    strategy_type: "ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_object_type: "routeExecution",
    trigger_task_status: "ARRIVAL_ABNORMAL",
    origin_rule: "使用 Robotaxi 当前异常到达位置",
    target_rule: "选择同服务区内其他目标位置，并排除当前异常点和当前目标点",
    service_area_scope_rule: "限制在当前任务目标服务区内",
    route_generation_rule: "基于当前异常位置、同服务区替代目标和 BFS 网格图搜索重新生成可执行路径步骤",
    route_update_rule: "更新同一个行驶记录的当前路径，不创建新行驶记录",
    strategy_status: "Active",
  },
  {
    route_strategy_id: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_PICKUP,
    strategy_name: "服务订单接驾路径规划策略",
    strategy_type: "SERVICE_ORDER_PICKUP_ROUTE",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_object_type: "trip",
    trigger_task_status: "WAITING_ROUTE",
    origin_rule: "使用 Robotaxi 当前所在位置",
    target_rule: "使用服务订单上车位置",
    service_area_scope_rule: "目标限制为订单上车服务区",
    route_generation_rule: "基于 Robotaxi 当前位置、上车位置和 BFS 网格图搜索生成接驾路径步骤",
    route_update_rule: "创建服务接驾路径，并写入 Trip 当前 Route 与 route_history",
    strategy_status: "Active",
  },
  {
    route_strategy_id: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION,
    strategy_name: "服务订单送达路径规划策略",
    strategy_type: "SERVICE_ORDER_DESTINATION_ROUTE",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_object_type: "trip",
    trigger_task_status: "CUSTOMER_ONBOARD",
    origin_rule: "使用 Robotaxi 当前上车位置",
    target_rule: "使用服务订单下车位置",
    service_area_scope_rule: "目标限制为订单下车服务区",
    route_generation_rule: "基于上车位置、下车位置和 BFS 网格图搜索生成载客路径步骤",
    route_update_rule: "创建服务送达路径，并写入 Trip 当前 Route 与 route_history",
    strategy_status: "Active",
  },
  {
    route_strategy_id: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION_CHANGE,
    strategy_name: "服务订单目的地变更重规划策略",
    strategy_type: "DESTINATION_CHANGE_REPLAN",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_object_type: "trip",
    trigger_task_status: "ON_THE_WAY_DESTINATION",
    origin_rule: "使用 Robotaxi 当前所在位置",
    target_rule: "选择新的下车位置，优先同服务区可下车点",
    service_area_scope_rule: "优先订单当前下车服务区，必要时扩展到其他服务区",
    route_generation_rule: "基于当前位置、新目的地和 BFS 网格图搜索生成新的送达路径步骤",
    route_update_rule: "创建新服务路径，更新 Trip 当前目标位置与 route_history",
    strategy_status: "Active",
  },
  {
    route_strategy_id: taskTypes.RoutePlanningStrategy.SERVICE_ROUTE_EXCEPTION_REPLAN,
    strategy_name: "服务路径异常重规划策略",
    strategy_type: "SERVICE_ROUTE_EXCEPTION_REPLAN",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_object_type: "trip",
    trigger_task_status: "ON_THE_WAY_DESTINATION",
    origin_rule: "使用 Robotaxi 当前异常位置",
    target_rule: "继续使用 Trip 当前下车位置",
    service_area_scope_rule: "不改变订单当前下车服务区",
    route_generation_rule: "基于异常位置、当前目的地和 BFS 网格图搜索重新生成服务路径步骤",
    route_update_rule: "创建新服务路径并追加 Trip route_history",
    strategy_status: "Active",
  },
  {
    route_strategy_id: taskTypes.RoutePlanningStrategy.SERVICE_PRICE_ESTIMATION,
    strategy_name: "服务订单价格预估路径规划策略",
    strategy_type: "SERVICE_PRICE_ESTIMATION_ROUTE",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_object_type: "serviceOrder",
    trigger_task_status: "WAITING_PRICE_ESTIMATE",
    origin_rule: "使用客户需求位置作为价格预估路径起点",
    target_rule: "使用服务订单下车位置作为价格预估路径终点",
    service_area_scope_rule: "覆盖上车服务区和下车服务区",
    route_generation_rule: "生成一条包含客户位置到上车位置、上车位置到下车位置的价格预估路径",
    route_update_rule: "只返回价格预估 Route，由服务订单和定价策略使用，不主动改变订单状态",
    strategy_status: "Active",
  },
];

export function getRoutePlanningStrategies() {
  return routePlanningStrategies.map((strategy) => ({ ...strategy }));
}

export function getRoutePlanningStrategy(routeStrategyId) {
  return getRoutePlanningStrategies().find((strategy) => strategy.route_strategy_id === routeStrategyId) || null;
}

export function createRoutePlanningStrategySnapshot(routeStrategyId) {
  const strategy = getRoutePlanningStrategy(routeStrategyId);
  return strategy ? { ...strategy } : null;
}
