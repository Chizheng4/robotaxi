const {
  useEffect,
  useMemo,
  useRef,
  useState
} = React;
const {
  Button,
  Descriptions,
  Empty,
  Input,
  Layout,
  Menu,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography
} = antd;
const {
  Sider,
  Content
} = Layout;
const {
  Text
} = Typography;
let initializeMapSpace;
let validateMapSpace;
let initializeOperationsCenter;
let initializeCustomers;
let initializeDemandSimulation;
let initializePricing;
let initializeOrderMatching;
let validateOperationsCenter;
let validateCustomers;
let validateDemandSimulation;
let validateServiceOrders;
let validatePricing;
let validateOrderMatching;
let validateTrips;
let runDemandSimulation;
let runPricingEstimate;
let runOrderMatching;
let serviceOrderTypes;
let pricingTypes;
let orderMatchingTypes;
let tripTypes;
let createCellContext;
let getDetailTitle;
let getDisplayValue;
let getFieldLabel;
let validateReadinessCheckTasks;
let validateDeploymentTasks;
let taskTypes;
let serviceOrderSettlement;
let routePlanningService;
let businessTimingCalculator;
let costModelCalculator;
let revenueCalculator;
let simulationRunBusinessScope;
let statusRegistry;
let routePlanningStrategies;
let taskSequence = 0;
let deploymentTaskSequence = 0;
let routeExecutionSequence = 0;
let deploymentRouteSequence = 0;
let serviceRouteSequence = 0;
let routePlanningRunSequence = 0;
let demandSimulationRunSequence = 0;
let serviceOrderSequence = 0;
let pricingStrategyRunSequence = 0;
let pricingDecisionSequence = 0;
let orderMatchingRunSequence = 0;
let orderMatchingDecisionSequence = 0;
let tripSequence = 0;
let eventSequence = 0;
const unfinishedTaskStatuses = new Set(["WAITING_ASSIGNMENT", "WAITING_CHECK", "CHECKING"]);
const unfinishedDeploymentStatuses = new Set(["WAITING_ROUTE", "WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL"]);
const pageGroups = [{
  key: "console",
  label: "运营中控台",
  children: [{
    key: "console",
    label: "运营中控台"
  }]
}, {
  key: "decision",
  label: "运营决策中心",
  children: [{
    key: "routePlanningManagement",
    label: "路径规划管理",
    children: [{
      key: "routePlanningStrategies",
      label: "路径规划策略"
    }, {
      key: "routePlanningRuns",
      label: "路径规划执行"
    }, {
      key: "routes",
      label: "路径规划结果"
    }]
  }, {
    key: "demandSimulationManagement",
    label: "需求模拟管理",
    children: [{
      key: "demandSimulationStrategies",
      label: "需求模拟策略"
    }, {
      key: "demandSimulationRuns",
      label: "需求模拟执行"
    }, {
      key: "demandSimulationResults",
      label: "需求模拟结果"
    }]
  }, {
    key: "pricingManagement",
    label: "动态定价管理",
    children: [{
      key: "pricingStrategies",
      label: "定价策略"
    }, {
      key: "pricingStrategyRuns",
      label: "定价执行"
    }, {
      key: "pricingDecisions",
      label: "定价结果"
    }]
  }, {
    key: "orderMatchingManagement",
    label: "订单匹配管理",
    children: [{
      key: "orderMatchingStrategies",
      label: "订单匹配策略"
    }, {
      key: "orderMatchingRuns",
      label: "订单匹配执行"
    }, {
      key: "orderMatchingDecisions",
      label: "订单匹配结果"
    }]
  }]
}, {
  key: "demandOrder",
  label: "需求订单管理",
  children: [{
    key: "serviceOrders",
    label: "服务订单管理"
  }, {
    key: "customers",
    label: "客户管理"
  }]
}, {
  key: "opsCenter",
  label: "运营中心管理",
  children: [{
    key: "taskManagement",
    label: "任务单管理",
    children: [{
      key: "readinessTasks",
      label: "运营准入"
    }, {
      key: "deploymentTasks",
      label: "运营投放"
    }]
  }, {
    key: "opsCenters",
    label: "运营中心列表"
  }, {
    key: "workers",
    label: "作业人员列表"
  }]
}, {
  key: "robotaxi",
  label: "Robotaxi 管理",
  children: [{
    key: "robotaxis",
    label: "Robotaxi 列表"
  }, {
    key: "routeExecutionManagement",
    label: "行驶记录管理",
    children: [{
      key: "routeExecutions",
      label: "运营行驶记录"
    }, {
      key: "serviceFulfillmentRecords",
      label: "履约行驶记录"
    }]
  }]
}, {
  key: "space",
  label: "地图空间管理",
  children: [{
    key: "maps",
    label: "地图管理"
  }, {
    key: "cells",
    label: "网格单元管理"
  }, {
    key: "roads",
    label: "道路管理"
  }, {
    key: "roadNodes",
    label: "道路节点管理"
  }, {
    key: "roadSegments",
    label: "道路片段管理"
  }, {
    key: "places",
    label: "地点管理"
  }, {
    key: "serviceAreas",
    label: "服务区管理"
  }, {
    key: "zones",
    label: "Zone 管理"
  }]
}, {
  key: "businessAnalysis",
  label: "经营分析管理",
  children: [{
    key: "revenueRecords",
    label: "收入记录"
  }, {
    key: "costRecords",
    label: "成本记录"
  }, {
    key: "costParameterRules",
    label: "成本配置"
  }, {
    key: "revenueCalculationRuns",
    label: "收入生成记录"
  }, {
    key: "costCalculationRuns",
    label: "成本计算记录"
  }, {
    key: "costModelProfiles",
    label: "成本模型配置"
  }]
}, {
  key: "simulation",
  label: "自动运营模拟",
  children: [{
    key: "simulationPolicies",
    label: "模拟规则配置"
  }, {
    key: "workflowTimingRules",
    label: "工作流时效配置"
  }, {
    key: "simulationRuns",
    label: "模拟运行管理"
  }, {
    key: "timedOperations",
    label: "时间作业"
  }]
}];
const hiddenWorkspacePages = new Set(["simulationEvents", "costCalculationRuns", "revenueCalculationRuns", "costModelProfiles"]);
const tableConfig = {
  maps: {
    title: "地图管理",
    description: "地图是 Robotaxi 运营模拟中的空间容器。",
    columns: ["map_id", "map_name", "map_width_m", "map_height_m", "cell_size_m", "grid_cols", "grid_rows", "total_cells", "coordinate_type"]
  },
  cells: {
    title: "网格单元管理",
    description: "网格单元是地图的最小空间单元，用于表达基础空间事实。",
    columns: ["cell_id", "row", "col", "base_cell_type", "traversable"]
  },
  roads: {
    title: "道路管理",
    description: "道路用于表达完整道路语义，由多个道路片段组成。",
    columns: ["road_id", "road_name", "road_type", "road_status", "road_segment_ids"]
  },
  roadNodes: {
    title: "道路节点管理",
    description: "道路节点是道路网络中的连接点。",
    columns: ["road_node_id", "cell_id", "row", "col", "node_type", "node_status"]
  },
  roadSegments: {
    title: "道路片段管理",
    description: "道路片段是道路网络的最小计算和通行单元。",
    columns: ["road_segment_id", "road_id", "start_node_id", "end_node_id", "cell_sequence", "direction", "allowed_direction", "segment_status", "distance_m", "total_distance_km", "service_area_ids"]
  },
  places: {
    title: "地点管理",
    description: "地点表示会产生出行需求的建筑或土地使用区域。",
    columns: ["place_id", "place_name", "place_type", "demand_weight", "peak_pattern", "nearby_service_area_ids", "cell_count"]
  },
  serviceAreas: {
    title: "服务区管理",
    description: "服务区是 Robotaxi 可服务、可停靠、可待命的道路服务区域。",
    columns: ["service_area_id", "service_area_name", "service_area_type", "service_area_status", "road_segment_ids", "pickup_cell_ids", "dropoff_cell_ids", "temp_stop_cell_ids", "parking_cell_ids", "standby_cell_ids", "capacity", "current_robotaxi_count"]
  },
  zones: {
    title: "运营区域管理",
    description: "运营区域用于经营统计和管理。",
    columns: ["zone_id", "parent_zone_id", "zone_name", "zone_level", "zone_type", "zone_status", "cell_count", "place_ids", "service_area_ids"]
  },
  routes: {
    title: "路径规划结果",
    description: "路径规划结果是路径规划策略执行后生成的 Route，可供运营行驶记录或履约行驶记录引用。",
    columns: ["route_id", "route_version", "route_usage_type", "route_strategy_id", "route_planning_run_id", "task_id", "service_order_id", "trip_id", "route_execution_id", "robotaxi_id", "origin_cell_id", "target_cell_id", "road_segment_sequence", "route_step_count", "total_distance_km", "total_distance_m", "route_status", "failure_reason"]
  },
  customers: {
    title: "客户管理",
    description: "客户是服务订单的需求发起主体，当前位置由订单创建时动态生成。",
    columns: ["customer_id", "customer_name", "customer_type", "default_order_channel", "customer_status", "created_at"]
  },
  demandSimulationStrategies: {
    title: "需求模拟策略",
    description: "需求模拟策略用于生成客户、需求位置、上车点和下车点上下文。",
    columns: ["demand_simulation_strategy_id", "strategy_name", "strategy_type", "simulation_algorithm", "location_type_weights", "strategy_status", "demand_simulation_run_count"]
  },
  demandSimulationRuns: {
    title: "需求模拟执行",
    description: "记录每次需求模拟策略执行过程。",
    columns: ["demand_simulation_run_id", "simulation_result", "demand_simulation_strategy_id", "order_channel", "customer_id", "customer_origin_location_type", "customer_origin_cell_id", "pickup_service_area_id", "pickup_cell_id", "dropoff_service_area_id", "dropoff_cell_id", "failure_reason", "created_at"]
  },
  demandSimulationResults: {
    title: "需求模拟结果",
    description: "需求模拟结果是策略执行后返回给服务订单创建流程的订单上下文。",
    columns: ["demand_simulation_result_id", "simulation_result", "demand_simulation_run_id", "demand_simulation_strategy_id", "order_channel", "customer_id", "customer_origin_location_type", "customer_origin_cell_id", "pickup_service_area_id", "pickup_cell_id", "dropoff_service_area_id", "dropoff_cell_id", "failure_reason", "created_at"]
  },
  serviceOrders: {
    title: "服务订单管理",
    description: "服务订单记录客户发起的出行服务需求，当前支持创建、定价和车辆匹配。",
    columns: ["service_order_id", "order_status", "order_channel", "customer_id", "demand_simulation_result_id", "customer_origin_cell_id", "pickup_cell_id", "dropoff_cell_id", "price_estimation_route_id", "estimated_pricing_decision_id", "final_pricing_decision_id", "estimated_distance_km", "estimated_duration_min", "estimated_price", "final_price", "trip_id", "trip_total_distance_km", "trip_total_duration_min", "trip_distance_traveled_km", "trip_distance_remaining_km", "matched_robotaxi_id", "matched_robotaxi_location_summary", "order_matching_decision_id", "payment_status", "created_at", "simulation_created_at"]
  },
  opsCenters: {
    title: "运营中心管理",
    description: "运营中心是 Robotaxi 进入运营闭环的供给侧设施。",
    columns: ["ops_center_id", "ops_center_name", "place_id", "map_id", "cell_ids", "service_area_ids", "capacity", "ops_center_status"]
  },
  workers: {
    title: "作业人员管理",
    description: "作业人员是运营中心内部的人工运维资源，当前仅初始化检查作业能力。",
    columns: ["worker_id", "ops_center_id", "worker_name", "worker_role", "worker_status", "current_task_id", "current_task_type", "current_task_status", "time_per_robotaxi", "max_robotaxi_per_day"]
  },
  readinessTasks: {
    title: "运营准入任务",
    description: "用于将待检查 Robotaxi 转化为可运营车辆的准入任务单。",
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "worker_id", "check_result", "issue_type", "created_at", "simulation_created_at"]
  },
  deploymentTasks: {
    title: "运营投放任务",
    description: "用于将可运营 Robotaxi 投放到指定服务区或待命位置。",
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "origin_cell_id", "planned_target_cell_id", "target_cell_id", "actual_target_cell_id", "arrival_behavior", "blocked_handling_policy", "arrival_execution_result", "planned_target_service_area_id", "target_service_area_id", "actual_target_service_area_id", "route_id", "route_strategy_id", "route_summary", "created_at", "simulation_created_at"]
  },
  routeExecutions: {
    title: "运营行驶记录",
    description: "记录 Robotaxi 执行任务时的模拟行驶过程。",
    columns: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id", "route_id", "route_strategy_id", "planned_target_cell_id", "target_cell_id", "actual_target_cell_id", "planned_target_service_area_id", "current_target_service_area_id", "actual_target_service_area_id", "arrival_execution_result", "route_summary", "current_cell_id", "current_location_summary", "current_step_index", "total_step_count", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "created_at", "simulation_created_at"]
  },
  taskEventLogs: {
    title: "任务事件日志",
    description: "记录运营准入任务的创建、分配、检查和状态反馈事件。",
    columns: ["event_id", "event_type", "event_result", "message", "service_order_id", "trip_id", "pricing_decision_id", "pricing_strategy_run_id", "task_id", "robotaxi_id", "worker_id", "route_execution_id", "created_at"]
  },
  routePlanningStrategies: {
    title: "路径规划策略",
    description: "用于管理路径规划策略对象，定义不同场景下如何生成路径。",
    columns: ["route_strategy_id", "strategy_name", "strategy_type", "planning_algorithm", "trigger_task_status", "origin_rule", "target_rule", "service_area_scope_rule", "route_generation_rule", "route_update_rule", "strategy_status", "strategy_usage_count", "route_planning_run_count"]
  },
  routePlanningRuns: {
    title: "路径规划执行",
    description: "记录每次路径规划策略执行过程。",
    columns: ["route_planning_run_id", "planning_result", "route_strategy_id", "planning_algorithm", "task_id", "service_order_id", "trip_id", "route_execution_id", "robotaxi_id", "origin_cell_id", "target_cell_id", "result_route_id", "failure_reason", "created_at"]
  },
  pricingStrategies: {
    title: "定价策略",
    description: "定价策略定义价格公式、基础价格参数和动态系数。",
    columns: ["pricing_strategy_id", "strategy_name", "strategy_type", "pricing_algorithm", "base_fare", "distance_unit_price", "time_unit_price", "dynamic_multiplier", "strategy_status", "pricing_strategy_run_count"]
  },
  pricingStrategyRuns: {
    title: "定价执行",
    description: "记录每次定价策略执行过程。",
    columns: ["pricing_strategy_run_id", "run_result", "pricing_strategy_id", "pricing_algorithm", "service_order_id", "pricing_stage", "failure_reason", "created_at"]
  },
  pricingDecisions: {
    title: "定价结果",
    description: "记录服务订单使用的价格结果。",
    columns: ["pricing_decision_id", "pricing_result", "pricing_strategy_run_id", "pricing_strategy_id", "service_order_id", "estimated_distance_km", "estimated_duration_min", "estimated_price", "fulfillment_distance_km", "fulfillment_duration_min", "base_price", "dynamic_multiplier", "final_price", "pricing_stage", "created_at"]
  },
  orderMatchingStrategies: {
    title: "订单匹配策略",
    description: "订单匹配策略定义服务订单如何选择可用 Robotaxi。",
    columns: ["order_matching_strategy_id", "strategy_name", "strategy_type", "matching_algorithm", "candidate_filter_rule", "distance_rule", "battery_rule", "scoring_rule", "min_battery_threshold", "strategy_status", "order_matching_run_count"]
  },
  orderMatchingRuns: {
    title: "订单匹配执行",
    description: "记录每次订单匹配策略执行过程。",
    columns: ["order_matching_run_id", "run_result", "order_matching_strategy_id", "matching_algorithm", "service_order_id", "pickup_cell_id", "candidate_robotaxi_count", "eligible_robotaxi_count", "selected_robotaxi_id", "failure_reason", "created_at"]
  },
  orderMatchingDecisions: {
    title: "订单匹配结果",
    description: "记录服务订单匹配 Robotaxi 的决策结果。",
    columns: ["order_matching_decision_id", "decision_result", "order_matching_run_id", "order_matching_strategy_id", "service_order_id", "selected_robotaxi_id", "selected_robotaxi_location_summary", "estimated_pickup_distance_km", "estimated_pickup_duration_min", "matching_score", "failure_reason", "created_at"]
  },
  serviceFulfillmentRecords: {
    title: "履约行驶记录",
    description: "履约行驶记录用于模拟 Robotaxi 执行客户服务订单的接驾、载客和完成过程。",
    columns: ["trip_id", "trip_status", "service_order_id", "robotaxi_id", "pickup_cell_id", "dropoff_cell_id", "current_cell_id", "trip_phase", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "time_elapsed", "route_id", "created_at", "simulation_created_at"]
  },
  robotaxis: {
    title: "Robotaxi 管理",
    description: "Robotaxi 是等待运维检查后进入运营闭环的自动驾驶车辆资产。",
    columns: ["robotaxi_id", "fleet_id", "battery_percent", "estimated_range_km", "availability_status", "motion_status", "current_cell_id", "location_summary", "current_task_id", "current_task_type", "current_task_status", "current_order_id", "available_for_dispatch", "current_route_id", "current_route_execution_id", "unavailable_reason"]
  },
  validations: {
    title: "初始化校验",
    description: "根据初始化规则检查生成后的运营空间数据。",
    columns: ["rule_id", "rule_name", "result", "detail"]
  },
  simulationPolicies: {
    title: "模拟规则配置",
    description: "配置模拟运行的规则参数，包括 Tick 粒度、时间段、需求分布和自动化开关。",
    columns: ["simulation_policy_id", "policy_name", "policy_status", "tick_minutes", "simulation_days", "run_speed_level", "random_seed"]
  },
  workflowTimingRules: {
    title: "工作流时效配置",
    description: "配置业务状态边的操作时长，用于模拟完成后的状态时间线计算。",
    columns: ["workflow_timing_rule_id", "business_object_type", "from_status", "action_type", "to_status", "transition_mode", "duration_source_type", "duration_mode", "configured_duration_seconds", "seconds_per_cell", "rule_status", "profile_version"]
  },
  costParameterRules: {
    title: "成本配置",
    description: "逐项配置距离、能源、人力、资产折旧和固定运营成本参数。",
    columns: ["cost_parameter_rule_id", "cost_parameter_name", "cost_parameter_group", "configured_value", "parameter_unit", "cost_parameter_status", "participates_in_calculation", "profile_version"]
  },
  costModelProfiles: {
    title: "成本模型配置",
    description: "成本模型配置的版本化汇总，当前隐藏在菜单中。",
    columns: ["cost_model_profile_id", "profile_name", "profile_version", "profile_status", "currency_code"]
  },
  costCalculationRuns: {
    title: "成本计算记录",
    description: "记录每次运营成本计算使用的配置快照、计算状态、生成记录数和总成本。",
    columns: ["cost_calculation_run_id", "simulation_run_id", "calculation_status", "calculation_progress_percent", "processed_object_count", "generated_cost_record_count", "total_cost_amount", "error_count", "started_at", "completed_at"]
  },
  costRecords: {
    title: "成本记录",
    description: "统一记录业务对象产生的距离、能源、人力和资产折旧成本明细。",
    columns: ["cost_record_id", "simulation_run_id", "source_object_type", "source_object_id", "cost_type", "quantity", "quantity_unit", "unit_cost", "cost_amount", "currency_code", "robotaxi_id", "worker_id", "simulation_cost_occurred_at"]
  },
  revenueRecords: {
    title: "收入记录",
    description: "从服务订单生成应收、实收和未收收入事实。",
    columns: ["revenue_record_id", "simulation_run_id", "service_order_id", "revenue_type", "revenue_amount", "currency_code", "revenue_basis_field", "simulation_revenue_occurred_at", "created_at"]
  },
  revenueCalculationRuns: {
    title: "收入生成记录",
    description: "记录每次收入记录生成的范围、状态、金额和错误。",
    columns: ["revenue_calculation_run_id", "simulation_run_id", "calculation_status", "calculation_progress_percent", "processed_object_count", "generated_revenue_record_count", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_unreceived_revenue_amount", "error_count", "started_at", "completed_at"]
  },
  simulationRuns: {
    title: "模拟运行管理",
    description: "创建和管理自动运营模拟运行，查看实时进度和结果。",
    columns: ["simulation_run_id", "simulation_name", "simulation_status", "business_timing_calculation_status", "cost_calculation_status", "revenue_calculation_status", "calculation_progress_percent", "total_cost_amount", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_days", "current_day", "current_time", "current_global_tick", "started_at", "completed_at"]
  },
  simulationEvents: {
    title: "模拟事件记录",
    description: "查看所有模拟运行产生的事件记录，包括触发、执行和结果。",
    columns: ["simulation_event_id", "simulation_run_id", "event_type", "event_source", "event_result", "message", "simulation_time", "global_tick"]
  },
  timedOperations: {
    title: "时间作业",
    description: "统一展示随时间推进的自动化作业，供真实自动化和模拟自动化复用。",
    columns: ["timed_operation_id", "operation_status", "operation_type", "time_mode", "object_type", "object_id", "action_type", "duration_seconds", "elapsed_seconds", "remaining_seconds", "progress_percent", "simulation_started_at", "simulation_planned_completed_at", "simulation_completed_at", "created_at"]
  }
};
const pageObjectType = {
  maps: "map",
  cells: "cell",
  roads: "road",
  roadNodes: "roadNode",
  roadSegments: "roadSegment",
  places: "place",
  serviceAreas: "serviceArea",
  zones: "zone",
  routes: "route",
  customers: "customer",
  demandSimulationStrategies: "demandSimulationStrategy",
  demandSimulationRuns: "demandSimulationRun",
  demandSimulationResults: "demandSimulationResult",
  serviceOrders: "serviceOrder",
  opsCenters: "opsCenter",
  workers: "worker",
  readinessTasks: "readinessTask",
  deploymentTasks: "deploymentTask",
  routeExecutions: "routeExecution",
  taskEventLogs: "taskEventLog",
  routePlanningStrategies: "routePlanningStrategy",
  routePlanningRuns: "routePlanningRun",
  pricingStrategies: "pricingStrategy",
  pricingStrategyRuns: "pricingStrategyRun",
  pricingDecisions: "pricingDecision",
  orderMatchingStrategies: "orderMatchingStrategy",
  orderMatchingRuns: "orderMatchingRun",
  orderMatchingDecisions: "orderMatchingDecision",
  serviceFulfillmentRecords: "trip",
  robotaxis: "robotaxi",
  validations: "validation",
  simulationPolicies: "simulationPolicy",
  workflowTimingRules: "workflowTimingRule",
  costModelProfiles: "costModelProfile",
  costParameterRules: "costParameterRule",
  costCalculationRuns: "costCalculationRun",
  costRecords: "costRecord",
  revenueRecords: "revenueRecord",
  revenueCalculationRuns: "revenueCalculationRun",
  simulationRuns: "simulationRun",
  simulationEvents: "simulationEvent",
  timedOperations: "timedOperation"
};
const idFieldByType = {
  map: "map_id",
  cell: "cell_id",
  road: "road_id",
  roadNode: "road_node_id",
  roadSegment: "road_segment_id",
  place: "place_id",
  serviceArea: "service_area_id",
  zone: "zone_id",
  route: "route_id",
  customer: "customer_id",
  demandSimulationStrategy: "demand_simulation_strategy_id",
  demandSimulationRun: "demand_simulation_run_id",
  demandSimulationResult: "demand_simulation_result_id",
  serviceOrder: "service_order_id",
  opsCenter: "ops_center_id",
  worker: "worker_id",
  readinessTask: "task_id",
  deploymentTask: "task_id",
  routeExecution: "route_execution_id",
  taskEventLog: "event_id",
  routePlanningStrategy: "route_strategy_id",
  routePlanningRun: "route_planning_run_id",
  pricingStrategy: "pricing_strategy_id",
  pricingStrategyRun: "pricing_strategy_run_id",
  simulationPolicy: "simulation_policy_id",
  workflowTimingRule: "workflow_timing_rule_id",
  costModelProfile: "cost_model_profile_id",
  costParameterRule: "cost_parameter_rule_id",
  costCalculationRun: "cost_calculation_run_id",
  costRecord: "cost_record_id",
  revenueRecord: "revenue_record_id",
  revenueCalculationRun: "revenue_calculation_run_id",
  simulationRun: "simulation_run_id",
  simulationEvent: "simulation_event_id",
  timedOperation: "timed_operation_id",
  pricingDecision: "pricing_decision_id",
  orderMatchingStrategy: "order_matching_strategy_id",
  orderMatchingRun: "order_matching_run_id",
  orderMatchingDecision: "order_matching_decision_id",
  trip: "trip_id",
  robotaxi: "robotaxi_id",
  validation: "rule_id"
};
const statusFieldByPage = {
  roads: "road_status",
  roadNodes: "node_status",
  roadSegments: "segment_status",
  places: "place_status",
  serviceAreas: "service_area_status",
  zones: "zone_status",
  routes: "route_status",
  opsCenters: "ops_center_status",
  workers: "worker_status",
  readinessTasks: "task_status",
  deploymentTasks: "task_status",
  routeExecutions: "execution_status",
  routePlanningStrategies: "strategy_status",
  routePlanningRuns: "planning_result",
  pricingStrategies: "strategy_status",
  pricingStrategyRuns: "run_result",
  pricingDecisions: "pricing_result",
  orderMatchingStrategies: "strategy_status",
  orderMatchingRuns: "run_result",
  orderMatchingDecisions: "decision_result",
  serviceFulfillmentRecords: "trip_status",
  customers: "customer_status",
  demandSimulationStrategies: "strategy_status",
  demandSimulationRuns: "simulation_result",
  demandSimulationResults: "simulation_result",
  serviceOrders: "order_status",
  robotaxis: "availability_status",
  validations: "result",
  simulationPolicies: "policy_status",
  workflowTimingRules: "rule_status",
  costModelProfiles: "profile_status",
  costParameterRules: "cost_parameter_status",
  costCalculationRuns: "calculation_status",
  costRecords: "cost_type",
  revenueRecords: "revenue_type",
  revenueCalculationRuns: "calculation_status",
  simulationRuns: "simulation_status",
  simulationEvents: "event_result",
  timedOperations: "operation_status"
};
const cellClass = {
  EMPTY: "cell-empty",
  ROAD: "cell-road",
  PLACE: "cell-place",
  BLOCKED: "cell-blocked"
};
const legendItems = [["cell-empty", "空白网格"], ["cell-road", "道路网格"], ["place-residential-swatch", "住宅地点"], ["place-office-swatch", "办公地点"], ["place-commercial-swatch", "商业地点"], ["place-hospital-swatch", "医院学校"], ["place-metro-station-swatch", "地铁接驳"], ["place-ops-center-swatch", "运营中心地点"], ["service-area-swatch", "服务区域"], ["ops-center-swatch", "运营中心覆盖"], ["route-swatch", "选中路径"], ["road-node-swatch", "道路节点"]];
const routePlanningResultOptions = ["SUCCESS", "FAILED"];
const pricingResultOptions = ["SUCCESS", "FAILED"];
const orderMatchingResultOptions = ["SUCCESS", "FAILED"];
const customerStatusOptions = ["ACTIVE", "TEST_ONLY", "INACTIVE", "BLOCKED"];
const triggerTypeOptions = ["AUTO", "MANUAL"];
const runtimeStorageKey = "robotaxi.runtime.v019-7-service-route";
const runtimeStorageKeyPrefix = "robotaxi.runtime.";
const simulationEventDbName = "robotaxi.simulation.events.v027";
const simulationEventStoreName = "simulationEvents";
const runtimeSnapshotDbName = "robotaxi.runtime.snapshot.v027";
const runtimeSnapshotStoreName = "runtimeSnapshots";
const persistedSimulationEventIds = new Set();
const defaultPageFilters = {
  keyword: "",
  statusValue: null,
  triggerType: null
};
const legacyRouteStrategyIdMap = {
  "RPS-INITIAL-DEPLOYMENT": "RPS-001",
  "RPS-ABNORMAL-SAME-SA": "RPS-002"
};
function App() {
  const initialData = useMemo(() => ({
    ...initializeMapSpace(),
    ...initializeOperationsCenter(),
    ...initializeCustomers(),
    ...initializeDemandSimulation(),
    ...initializePricing(),
    ...initializeOrderMatching()
  }), []);
  const initialRuntime = useMemo(() => loadRuntimeSnapshot(initialData), [initialData]);
  const [operationalData, setOperationalData] = useState(initialRuntime.operationalData);
  const [readinessTasks, setReadinessTasks] = useState(initialRuntime.readinessTasks);
  const [deploymentTasks, setDeploymentTasks] = useState(initialRuntime.deploymentTasks);
  const [routeExecutions, setRouteExecutions] = useState(initialRuntime.routeExecutions);
  const [routePlanningRuns, setRoutePlanningRuns] = useState(initialRuntime.routePlanningRuns);
  const [demandSimulationRuns, setDemandSimulationRuns] = useState(initialRuntime.demandSimulationRuns);
  const [serviceOrders, setServiceOrders] = useState(initialRuntime.serviceOrders);
  const [pricingStrategyRuns, setPricingStrategyRuns] = useState(initialRuntime.pricingStrategyRuns);
  const [pricingDecisions, setPricingDecisions] = useState(initialRuntime.pricingDecisions);
  const [orderMatchingRuns, setOrderMatchingRuns] = useState(initialRuntime.orderMatchingRuns);
  const [orderMatchingDecisions, setOrderMatchingDecisions] = useState(initialRuntime.orderMatchingDecisions);
  const [trips, setTrips] = useState(initialRuntime.trips);
  const [taskEventLogs, setTaskEventLogs] = useState(initialRuntime.taskEventLogs);
  const [simulationPolicies, setSimulationPolicies] = useState(initialRuntime.simulationPolicies);
  const [workflowTimingProfiles, setWorkflowTimingProfiles] = useState(initialRuntime.workflowTimingProfiles);
  const [businessTimingCalculationRuns, setBusinessTimingCalculationRuns] = useState(initialRuntime.businessTimingCalculationRuns);
  const [costModelProfiles, setCostModelProfiles] = useState(initialRuntime.costModelProfiles);
  const [costCalculationRuns, setCostCalculationRuns] = useState(initialRuntime.costCalculationRuns);
  const [costRecords, setCostRecords] = useState(initialRuntime.costRecords);
  const [revenueCalculationRuns, setRevenueCalculationRuns] = useState(initialRuntime.revenueCalculationRuns);
  const [revenueRecords, setRevenueRecords] = useState(initialRuntime.revenueRecords);
  const [simulationRuns, setSimulationRuns] = useState(initialRuntime.simulationRuns);
  const [simulationEvents, setSimulationEvents] = useState(initialRuntime.simulationEvents);
  const [timedOperations, setTimedOperations] = useState(initialRuntime.timedOperations);
  useEffect(() => {
    let cancelled = false;
    loadPersistedSimulationEvents().then(events => {
      if (cancelled || !events.length) return;
      setSimulationEvents(current => mergeSimulationEvents(current, events));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const initialValidations = useMemo(() => [...validateMapSpace(initialData), ...validateOperationsCenter(initialData), ...validateCustomers(initialData)], [initialData]);
  const data = useMemo(() => ({
    ...operationalData,
    readinessCheckTasks: readinessTasks,
    deploymentTasks,
    routeExecutions,
    routePlanningRuns,
    demandSimulationRuns,
    serviceOrders,
    pricingStrategyRuns,
    pricingDecisions,
    orderMatchingRuns,
    orderMatchingDecisions,
    trips,
    taskEventLogs
  }), [demandSimulationRuns, deploymentTasks, operationalData, orderMatchingDecisions, orderMatchingRuns, pricingDecisions, pricingStrategyRuns, readinessTasks, routeExecutions, routePlanningRuns, serviceOrders, taskEventLogs, trips]);
  const validations = useMemo(() => [...initialValidations, ...validateDemandSimulation(data), ...validateServiceOrders(data), ...validatePricing(data), ...validateOrderMatching(data), ...validateTrips(data), ...validateReadinessCheckTasks(data), ...validateDeploymentTasks(data)], [data, initialValidations]);
  const [activePage, setActivePage] = useState(initialRuntime.activePage);
  const [selected, setSelected] = useState(initialRuntime.pageSelections[initialRuntime.activePage] || getDefaultSelection(initialRuntime.activePage, data));
  const [collapsed, setCollapsed] = useState(false);
  const [openMenuKeys, setOpenMenuKeys] = useState(getOpenKeysForPage(initialRuntime.activePage));
  const [workspacePages, setWorkspacePages] = useState(initialRuntime.workspacePages);
  const [detailCollapsedByPage, setDetailCollapsedByPage] = useState(initialRuntime.detailCollapsedByPage);
  const [pageSelections, setPageSelections] = useState(initialRuntime.pageSelections);
  const [pageUiState, setPageUiState] = useState(initialRuntime.pageUiState);
  const [runtimeHydrated, setRuntimeHydrated] = useState(false);
  const [pendingTimingRule, setPendingTimingRule] = useState(null);
  const [timingRuleModalOpen, setTimingRuleModalOpen] = useState(false);
  const [timingRuleValue, setTimingRuleValue] = useState(0);
  const [pendingCalculationRunId, setPendingCalculationRunId] = useState(null);
  const [pendingCostCalculationRunId, setPendingCostCalculationRunId] = useState(null);
  const [pendingRevenueCalculationRunId, setPendingRevenueCalculationRunId] = useState(null);
  const [pendingCostParameterRule, setPendingCostParameterRule] = useState(null);
  const [costParameterModalOpen, setCostParameterModalOpen] = useState(false);
  const [costParameterValue, setCostParameterValue] = useState("");
  useEffect(() => {
    let cancelled = false;
    loadPersistedRuntimeSnapshot().then(snapshot => {
      if (cancelled || !snapshot) return;
      setOperationalData(normalizeOperationalRouteStrategies(snapshot.operationalData || initialData));
      setReadinessTasks(Array.isArray(snapshot.readinessTasks) ? snapshot.readinessTasks : []);
      setDeploymentTasks(normalizeRouteStrategyReferences(snapshot.deploymentTasks || []));
      setRouteExecutions(normalizeRouteStrategyReferences(snapshot.routeExecutions || []));
      setRoutePlanningRuns(normalizeRouteStrategyReferences(snapshot.routePlanningRuns || []));
      setDemandSimulationRuns(Array.isArray(snapshot.demandSimulationRuns) ? snapshot.demandSimulationRuns : []);
      setServiceOrders(normalizeServiceOrders(snapshot.serviceOrders || []));
      setPricingStrategyRuns(snapshot.pricingStrategyRuns || []);
      setPricingDecisions(snapshot.pricingDecisions || []);
      setOrderMatchingRuns(snapshot.orderMatchingRuns || []);
      setOrderMatchingDecisions(snapshot.orderMatchingDecisions || []);
      setTrips(Array.isArray(snapshot.trips) ? snapshot.trips.map(trip => tripTypes.normalizeTripRecord(trip)) : []);
      setTaskEventLogs(normalizeRouteStrategyReferences(snapshot.taskEventLogs || []));
      setSimulationPolicies(snapshot.simulationPolicies || []);
      setWorkflowTimingProfiles(snapshot.workflowTimingProfiles?.length ? snapshot.workflowTimingProfiles.map(profile => businessTimingCalculator.normalizeWorkflowTimingProfile(profile)) : [businessTimingCalculator.initializeDefaultWorkflowTimingProfile()]);
      setBusinessTimingCalculationRuns(snapshot.businessTimingCalculationRuns || []);
      setCostModelProfiles(snapshot.costModelProfiles?.length ? snapshot.costModelProfiles.map(profile => costModelCalculator.normalizeCostModelProfile(profile)) : [costModelCalculator.initializeDefaultCostModelProfile()]);
      setCostCalculationRuns(snapshot.costCalculationRuns || []);
      setCostRecords(snapshot.costRecords || []);
      setRevenueCalculationRuns(snapshot.revenueCalculationRuns || []);
      setRevenueRecords(snapshot.revenueRecords || []);
      setSimulationRuns(snapshot.simulationRuns || []);
      setTimedOperations(snapshot.timedOperations || []);
      const restoredPage = isLeafPage(snapshot.activePage) ? snapshot.activePage : "console";
      const restoredSelections = snapshot.pageSelections || {};
      setActivePage(restoredPage);
      setWorkspacePages(normalizeWorkspacePages(snapshot.workspacePages, restoredPage));
      setDetailCollapsedByPage(snapshot.detailCollapsedByPage || {});
      setPageSelections(restoredSelections);
      setSelected(restoredSelections[restoredPage] || {
        type: "map",
        id: initialData.maps[0].map_id
      });
      setOpenMenuKeys(getOpenKeysForPage(restoredPage));
      setPageUiState(normalizePageUiStateMap(snapshot.pageUiState));
      restoreRuntimeSequences(snapshot);
    }).finally(() => {
      if (!cancelled) setRuntimeHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initialData]);
  const rowsByPage = useMemo(() => ({
    maps: data.maps,
    cells: data.cells,
    roads: data.roads,
    roadNodes: data.roadNodes,
    roadSegments: data.roadSegments,
    places: data.places,
    serviceAreas: data.serviceAreas,
    zones: data.zones,
    routes: data.routes.map(route => enrichRouteForDisplay(route, data, deploymentTasks, routeExecutions, routePlanningRuns)),
    customers: data.customers || [],
    demandSimulationStrategies: createDemandSimulationStrategyRows(data, demandSimulationRuns),
    demandSimulationRuns,
    demandSimulationResults: createDemandSimulationResultRows(demandSimulationRuns),
    serviceOrders: serviceOrders.map(order => attachCostRecords(enrichServiceOrderForDisplay(order, data, trips), "serviceOrder", costRecords)),
    opsCenters: data.opsCenters,
    workers: data.workers.map(worker => enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks)),
    readinessTasks: readinessTasks.map(task => attachCostRecords(task, "readinessTask", costRecords)),
    deploymentTasks: deploymentTasks.map(task => attachCostRecords(enrichDeploymentTaskForDisplay(task, data), "deploymentTask", costRecords, routeExecutions)),
    routeExecutions: routeExecutions.map(execution => attachCostRecords(enrichRouteExecutionForDisplay(execution, data), "routeExecution", costRecords)),
    taskEventLogs,
    routePlanningStrategies: createRoutePlanningStrategyRows(data, routePlanningRuns),
    routePlanningRuns,
    pricingStrategies: createPricingStrategyRows(data, pricingStrategyRuns),
    pricingStrategyRuns,
    pricingDecisions,
    orderMatchingStrategies: createOrderMatchingStrategyRows(data, orderMatchingRuns),
    orderMatchingRuns,
    orderMatchingDecisions: orderMatchingDecisions.map(decision => enrichOrderMatchingDecisionForDisplay(decision, data)),
    serviceFulfillmentRecords: trips.map(trip => attachCostRecords(enrichTripForDisplay(trip, data), "trip", costRecords)),
    robotaxis: data.robotaxis.map(robotaxi => enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions)),
    simulationPolicies,
    workflowTimingRules: (workflowTimingProfiles[0]?.timing_rules || []).map(rule => ({
      ...rule,
      workflow_timing_profile_id: workflowTimingProfiles[0]?.workflow_timing_profile_id,
      profile_name: workflowTimingProfiles[0]?.profile_name,
      profile_version: workflowTimingProfiles[0]?.profile_version
    })),
    costModelProfiles,
    costParameterRules: (costModelProfiles[0]?.cost_parameter_rules || []).map(rule => ({
      ...rule,
      cost_model_profile_id: costModelProfiles[0]?.cost_model_profile_id,
      profile_name: costModelProfiles[0]?.profile_name,
      profile_version: costModelProfiles[0]?.profile_version,
      currency_code: costModelProfiles[0]?.currency_code
    })),
    costCalculationRuns,
    costRecords,
    revenueCalculationRuns,
    revenueRecords,
    simulationRuns,
    simulationEvents,
    timedOperations,
    validations
  }), [data, demandSimulationRuns, deploymentTasks, orderMatchingDecisions, orderMatchingRuns, pricingDecisions, pricingStrategyRuns, readinessTasks, routeExecutions, routePlanningRuns, serviceOrders, taskEventLogs, trips, simulationPolicies, workflowTimingProfiles, costModelProfiles, costCalculationRuns, costRecords, revenueCalculationRuns, revenueRecords, simulationRuns, simulationEvents, timedOperations, validations]);
  const selectedObject = useMemo(() => {
    if (selected.type === "cell") {
      const cell = data.cells.find(item => item.cell_id === selected.id);
      return cell ? createCellContext(cell, data) : null;
    }
    if (selected.type === "robotaxi") {
      const robotaxi = data.robotaxis.find(item => item.robotaxi_id === selected.id);
      return robotaxi ? enrichRobotaxiForDetail(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions) : null;
    }
    if (selected.type === "worker") {
      const worker = data.workers.find(item => item.worker_id === selected.id);
      return worker ? enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks) : null;
    }
    if (selected.type === "deploymentTask") {
      const task = deploymentTasks.find(item => item.task_id === selected.id);
      return task ? attachCostRecords(enrichDeploymentTaskForDisplay(task, data), "deploymentTask", costRecords, routeExecutions) : null;
    }
    if (selected.type === "routeExecution") {
      const execution = routeExecutions.find(item => item.route_execution_id === selected.id);
      return execution ? attachCostRecords(enrichRouteExecutionForDisplay(execution, data), "routeExecution", costRecords) : null;
    }
    const collections = {
      map: data.maps,
      road: data.roads,
      roadNode: data.roadNodes,
      roadSegment: data.roadSegments,
      place: data.places,
      serviceArea: data.serviceAreas,
      zone: data.zones,
      route: rowsByPage.routes,
      customer: data.customers || [],
      demandSimulationStrategy: rowsByPage.demandSimulationStrategies,
      demandSimulationRun: rowsByPage.demandSimulationRuns,
      demandSimulationResult: rowsByPage.demandSimulationResults,
      serviceOrder: rowsByPage.serviceOrders,
      routePlanningStrategy: rowsByPage.routePlanningStrategies,
      routePlanningRun: rowsByPage.routePlanningRuns,
      pricingStrategy: rowsByPage.pricingStrategies,
      pricingStrategyRun: rowsByPage.pricingStrategyRuns,
      pricingDecision: rowsByPage.pricingDecisions,
      orderMatchingStrategy: rowsByPage.orderMatchingStrategies,
      orderMatchingRun: rowsByPage.orderMatchingRuns,
      orderMatchingDecision: rowsByPage.orderMatchingDecisions,
      trip: rowsByPage.serviceFulfillmentRecords,
      simulationPolicy: simulationPolicies,
      workflowTimingRule: rowsByPage.workflowTimingRules,
      costModelProfile: rowsByPage.costModelProfiles,
      costParameterRule: rowsByPage.costParameterRules,
      costCalculationRun: rowsByPage.costCalculationRuns,
      costRecord: rowsByPage.costRecords,
      revenueRecord: rowsByPage.revenueRecords,
      revenueCalculationRun: rowsByPage.revenueCalculationRuns,
      simulationRun: simulationRuns,
      simulationEvent: simulationEvents,
      timedOperation: timedOperations,
      opsCenter: data.opsCenters,
      worker: data.workers,
      readinessTask: readinessTasks,
      taskEventLog: taskEventLogs,
      validation: validations
    };
    return collections[selected.type]?.find(item => item[idFieldByType[selected.type]] === selected.id) || null;
  }, [costRecords, data, rowsByPage, selected, simulationPolicies, simulationRuns, simulationEvents, timedOperations, validations]);
  const menuItems = pageGroups.map(group => {
    if (group.key === "console") return {
      key: "console",
      label: "运营中控台"
    };
    return {
      key: group.key,
      label: group.label,
      children: group.children.map(item => ({
        key: item.key,
        label: item.label,
        children: item.children?.map(child => ({
          key: child.key,
          label: child.label
        }))
      })).filter(item => !hiddenWorkspacePages.has(item.key))
    };
  });
  const failedCount = validations.filter(item => item.result !== "PASS").length;
  const activeConfig = tableConfig[activePage];
  const activeObjectType = pageObjectType[activePage];
  const detailSelectedObject = activePage === "console" ? selectedObject : selected.type === activeObjectType ? selectedObject : null;
  const detailSelectedType = activePage === "console" ? selected.type : activeObjectType;
  const showConsoleSummary = activePage === "console";
  const topTitle = showConsoleSummary ? data.maps[0].map_name : activeConfig?.title || "业务记录";
  const topDescription = showConsoleSummary ? "模拟网格空间 / 道路 / 地点 / 服务区 / 运营中心" : activeConfig?.description;
  const activeRows = rowsByPage[activePage] || [];
  const detailCollapsed = Boolean(detailCollapsedByPage[activePage]);
  useEffect(() => {
    if (!runtimeHydrated) return;
    saveRuntimeSnapshot({
      operationalData,
      readinessTasks,
      deploymentTasks,
      routeExecutions,
      routePlanningRuns,
      demandSimulationRuns,
      serviceOrders,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      trips,
      taskEventLogs,
      simulationPolicies,
      workflowTimingProfiles,
      businessTimingCalculationRuns,
      costModelProfiles,
      costCalculationRuns,
      costRecords,
      revenueCalculationRuns,
      revenueRecords,
      simulationRuns,
      simulationEvents,
      timedOperations,
      activePage,
      workspacePages,
      detailCollapsedByPage,
      pageSelections,
      pageUiState
    });
    persistSimulationEvents(simulationEvents);
  }, [activePage, businessTimingCalculationRuns, costCalculationRuns, costModelProfiles, costRecords, demandSimulationRuns, deploymentTasks, detailCollapsedByPage, operationalData, orderMatchingDecisions, orderMatchingRuns, pageSelections, pageUiState, pricingDecisions, pricingStrategyRuns, readinessTasks, revenueCalculationRuns, revenueRecords, routeExecutions, routePlanningRuns, runtimeHydrated, serviceOrders, simulationEvents, simulationPolicies, simulationRuns, taskEventLogs, timedOperations, trips, workflowTimingProfiles, workspacePages]);

  // ===== Simulation 控制 =====
  const getBusinessData = () => {
    const businessData = {
      serviceOrders,
      trips,
      readinessTasks,
      deploymentTasks,
      routeExecutions,
      routes: data.routes,
      routePlanningRuns,
      robotaxis: data.robotaxis,
      data,
      serviceOrderService,
      tripService,
      demandSimulationEngine: {
        runDemandSimulation
      },
      demandSimulationRuns,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      taskEventLogs,
      timedOperations
    };
    const refreshContextData = () => {
      businessData.data = {
        ...businessData.data,
        robotaxis: businessData.robotaxis,
        serviceOrders: businessData.serviceOrders,
        trips: businessData.trips,
        readinessCheckTasks: businessData.readinessTasks,
        deploymentTasks: businessData.deploymentTasks,
        routeExecutions: businessData.routeExecutions,
        routes: businessData.routes,
        routePlanningRuns: businessData.routePlanningRuns,
        demandSimulationRuns: businessData.demandSimulationRuns,
        pricingStrategyRuns: businessData.pricingStrategyRuns,
        pricingDecisions: businessData.pricingDecisions,
        orderMatchingRuns: businessData.orderMatchingRuns,
        orderMatchingDecisions: businessData.orderMatchingDecisions,
        taskEventLogs: businessData.taskEventLogs,
        timedOperations: businessData.timedOperations
      };
    };
    const bindSetter = (key, setter) => updater => {
      const nextValue = typeof updater === "function" ? updater(businessData[key]) : updater;
      businessData[key] = nextValue;
      refreshContextData();
      setter(nextValue);
    };
    businessData.setServiceOrders = bindSetter("serviceOrders", setServiceOrders);
    businessData.setTrips = bindSetter("trips", setTrips);
    businessData.setReadinessTasks = bindSetter("readinessTasks", setReadinessTasks);
    businessData.setDeploymentTasks = bindSetter("deploymentTasks", setDeploymentTasks);
    businessData.setRouteExecutions = bindSetter("routeExecutions", setRouteExecutions);
    businessData.setRoutePlanningRuns = bindSetter("routePlanningRuns", setRoutePlanningRuns);
    businessData.setDemandSimulationRuns = bindSetter("demandSimulationRuns", setDemandSimulationRuns);
    businessData.setPricingStrategyRuns = bindSetter("pricingStrategyRuns", setPricingStrategyRuns);
    businessData.setPricingDecisions = bindSetter("pricingDecisions", setPricingDecisions);
    businessData.setOrderMatchingRuns = bindSetter("orderMatchingRuns", setOrderMatchingRuns);
    businessData.setOrderMatchingDecisions = bindSetter("orderMatchingDecisions", setOrderMatchingDecisions);
    businessData.setTaskEventLogs = bindSetter("taskEventLogs", setTaskEventLogs);
    businessData.setTimedOperations = bindSetter("timedOperations", setTimedOperations);
    businessData.setRobotaxis = updater => {
      const nextRobotaxis = typeof updater === "function" ? updater(businessData.robotaxis) : updater;
      businessData.robotaxis = nextRobotaxis;
      refreshContextData();
      setOperationalData(prev => ({
        ...prev,
        robotaxis: nextRobotaxis
      }));
    };
    businessData.setRoutes = updater => {
      const nextRoutes = typeof updater === "function" ? updater(businessData.routes) : updater;
      businessData.routes = nextRoutes;
      refreshContextData();
      setOperationalData(prev => ({
        ...prev,
        routes: nextRoutes
      }));
    };
    refreshContextData();
    return businessData;
  };
  const simActions = simulationActions ? simulationActions.useSimulationActions({
    simulationEngine,
    simulationLoop,
    simulationTypes,
    simulationInitialization,
    simulationPolicies,
    simulationRuns,
    simulationEvents,
    setSimulationPolicies,
    setSimulationRuns,
    setSimulationEvents,
    getBusinessData
  }) : null;
  const simActionsRef = useRef(null);
  useEffect(() => {
    if (simActions) simActions.initDefaultPolicy();
    if (simActions && runtimeHydrated) simActions.restoreActiveSimulationRun();
  }, [runtimeHydrated, simulationPolicies.length, simActions]);
  useEffect(() => {
    simActionsRef.current = simActions;
  }, [simActions]);
  useEffect(() => {
    return () => {
      if (simActionsRef.current) simActionsRef.current.cleanup();
    };
  }, []);
  useEffect(() => {
    if (!runtimeHydrated || !businessTimingCalculator || workflowTimingProfiles.length === 0) return;
    const completedRun = simulationRuns.find(run => run.simulation_status === "COMPLETED" && !run.business_timing_calculation_status);
    if (completedRun) runBusinessTimingCalculation(completedRun.simulation_run_id, {
      automatic: true
    });
  }, [runtimeHydrated, simulationRuns, workflowTimingProfiles]);
  function requestBusinessTimingCalculation(runId) {
    const run = simulationRuns.find(item => item.simulation_run_id === runId);
    if (!run) return;
    setPendingCalculationRunId(runId);
  }
  function runBusinessTimingCalculation(runId, {
    automatic = false
  } = {}) {
    const run = simulationRuns.find(item => item.simulation_run_id === runId);
    const profile = workflowTimingProfiles.find(item => item.profile_status === "ACTIVE");
    if (!run || !profile || !["COMPLETED", "STOPPED", "FAILED"].includes(run.simulation_status)) return;
    const calculationRunId = `BTCR-${String(businessTimingCalculationRuns.length + 1).padStart(4, "0")}`;
    const calculationStartedAt = Date.now();
    const scope = createCurrentBusinessScope(run);
    setSimulationEvents(current => [simulationEngine.createOperatingSimulationTimeCalculationEvent({
      simulationRun: run,
      eventType: "OPERATING_SIMULATION_TIME_CALCULATION_STARTED",
      message: `开始计算 ${run.simulation_run_id} 的运营模拟时间`,
      calculationRunId,
      profile
    }), ...current]);
    setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
      ...item,
      business_timing_calculation_status: "CALCULATING",
      calculation_progress_percent: 12,
      active_business_timing_calculation_run_id: calculationRunId
    } : item));
    setTimeout(() => {
      try {
        const result = businessTimingCalculator.createBusinessTimingCalculation({
          simulationRun: run,
          profile,
          calculationRunId,
          scope,
          businessData: {
            ...data,
            readinessTasks,
            deploymentTasks,
            routeExecutions,
            serviceOrders,
            trips,
            pricingStrategyRuns,
            pricingDecisions,
            orderMatchingRuns,
            orderMatchingDecisions,
            routePlanningRuns,
            demandSimulationRuns
          }
        });
        const calculated = result.businessData;
        setReadinessTasks(current => mergeCalculatedObjects(current, calculated.readinessTasks, "task_id"));
        setDeploymentTasks(current => mergeCalculatedObjects(current, calculated.deploymentTasks, "task_id"));
        setRouteExecutions(current => mergeCalculatedObjects(current, calculated.routeExecutions, "route_execution_id"));
        setServiceOrders(current => mergeCalculatedObjects(current, calculated.serviceOrders, "service_order_id"));
        setTrips(current => mergeCalculatedObjects(current, calculated.trips, "trip_id"));
        setPricingStrategyRuns(current => mergeCalculatedObjects(current, calculated.pricingStrategyRuns, "pricing_strategy_run_id"));
        setPricingDecisions(current => mergeCalculatedObjects(current, calculated.pricingDecisions, "pricing_decision_id"));
        setOrderMatchingRuns(current => mergeCalculatedObjects(current, calculated.orderMatchingRuns, "order_matching_run_id"));
        setOrderMatchingDecisions(current => mergeCalculatedObjects(current, calculated.orderMatchingDecisions, "order_matching_decision_id"));
        setRoutePlanningRuns(current => mergeCalculatedObjects(current, calculated.routePlanningRuns, "route_planning_run_id"));
        setDemandSimulationRuns(current => mergeCalculatedObjects(current, calculated.demandSimulationRuns, "demand_simulation_run_id"));
        setBusinessTimingCalculationRuns(current => [result.calculationRun, ...current]);
        setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
          ...item,
          business_timing_calculation_status: result.calculationRun.calculation_status,
          calculation_progress_percent: 100,
          active_business_timing_calculation_run_id: calculationRunId,
          workflow_timing_profile_id: profile.workflow_timing_profile_id,
          workflow_timing_profile_version: profile.profile_version,
          business_timing_result_summary: {
            total_object_count: result.calculationRun.total_object_count,
            success_object_count: result.calculationRun.success_object_count,
            failed_object_count: result.calculationRun.failed_object_count,
            total_transition_count: result.calculationRun.total_transition_count
          },
          business_timing_calculation_errors: result.calculationRun.calculation_errors
        } : item));
        const resultSummary = {
          calculation_status: result.calculationRun.calculation_status,
          total_object_count: result.calculationRun.total_object_count,
          success_object_count: result.calculationRun.success_object_count,
          failed_object_count: result.calculationRun.failed_object_count,
          total_transition_count: result.calculationRun.total_transition_count,
          calculation_duration_ms: Date.now() - calculationStartedAt,
          calculation_errors: result.calculationRun.calculation_errors
        };
        setSimulationEvents(current => [simulationEngine.createOperatingSimulationTimeCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_SIMULATION_TIME_CALCULATION_COMPLETED",
          message: result.calculationRun.calculation_status === "SUCCEEDED" ? `运营模拟时间计算完成：${result.calculationRun.total_object_count} 个对象、${result.calculationRun.total_transition_count} 次状态变更` : `运营模拟时间计算完成，${result.calculationRun.failed_object_count} 个对象需要检查`,
          calculationRunId,
          profile,
          resultSummary
        }), ...current]);
        if (!automatic) antd.message.success(result.calculationRun.calculation_status === "SUCCEEDED" ? "运营模拟时间计算完成" : "运营模拟时间计算完成，存在待检查项");
      } catch (error) {
        setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
          ...item,
          business_timing_calculation_status: "FAILED",
          calculation_progress_percent: 100,
          business_timing_calculation_errors: [{
            error_type: "CALCULATION_FAILED",
            error_message: error.message
          }]
        } : item));
        setSimulationEvents(current => [simulationEngine.createOperatingSimulationTimeCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_SIMULATION_TIME_CALCULATION_FAILED",
          eventResult: "FAILED",
          message: `运营模拟时间计算失败：${error.message}`,
          calculationRunId,
          profile,
          failureReason: error.message,
          resultSummary: {
            calculation_duration_ms: Date.now() - calculationStartedAt
          }
        }), ...current]);
        if (!automatic) antd.message.error(`运营模拟时间计算失败：${error.message}`);
      }
    }, 80);
  }
  function editWorkflowTimingRule(rule) {
    if (rule.duration_source_type === "INHERITED") return;
    setPendingTimingRule(rule);
    setTimingRuleValue(rule.duration_mode === "PER_CELL_DURATION" ? rule.seconds_per_cell : rule.configured_duration_seconds);
    setTimingRuleModalOpen(true);
  }
  function saveWorkflowTimingRule() {
    if (!pendingTimingRule) return;
    setWorkflowTimingProfiles(profiles => profiles.map(profile => profile.profile_status === "ACTIVE" ? businessTimingCalculator.updateWorkflowTimingRule(profile, pendingTimingRule.workflow_timing_rule_id, timingRuleValue) : profile));
    setTimingRuleModalOpen(false);
  }
  function confirmBusinessTimingCalculation() {
    if (!pendingCalculationRunId) return;
    const runId = pendingCalculationRunId;
    setPendingCalculationRunId(null);
    runBusinessTimingCalculation(runId, {
      automatic: false
    });
  }
  function requestCostCalculation(runId) {
    const run = simulationRuns.find(item => item.simulation_run_id === runId);
    if (!run) return;
    setPendingCostCalculationRunId(runId);
  }
  function confirmCostCalculation() {
    if (!pendingCostCalculationRunId) return;
    const runId = pendingCostCalculationRunId;
    setPendingCostCalculationRunId(null);
    runCostCalculation(runId);
  }
  function runCostCalculation(runId) {
    const run = simulationRuns.find(item => item.simulation_run_id === runId);
    const profile = costModelProfiles.find(item => item.profile_status === "ACTIVE");
    if (!run || !profile || !["COMPLETED", "STOPPED", "FAILED"].includes(run.simulation_status)) return;
    const calculationRunId = `CCR-${String(costCalculationRuns.length + 1).padStart(4, "0")}`;
    const scope = createCurrentBusinessScope(run);
    setSimulationEvents(current => [simulationEngine.createOperatingCostCalculationEvent({
      simulationRun: run,
      eventType: "OPERATING_COST_CALCULATION_STARTED",
      message: `开始计算 ${run.simulation_run_id} 的运营成本`,
      calculationRunId,
      profile
    }), ...current]);
    setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
      ...item,
      cost_calculation_status: "CALCULATING",
      cost_calculation_progress_percent: 15,
      active_cost_calculation_run_id: calculationRunId
    } : item));
    setTimeout(() => {
      try {
        const result = costModelCalculator.createCostCalculation({
          simulationRun: run,
          profile,
          calculationRunId,
          scope,
          businessData: {
            ...data,
            readinessTasks,
            deploymentTasks,
            routeExecutions,
            serviceOrders,
            trips
          }
        });
        const calculated = result.businessData;
        setReadinessTasks(current => mergeCalculatedObjects(current, calculated.readinessTasks, "task_id"));
        setDeploymentTasks(current => mergeCalculatedObjects(current, calculated.deploymentTasks, "task_id"));
        setRouteExecutions(current => mergeCalculatedObjects(current, calculated.routeExecutions, "route_execution_id"));
        setServiceOrders(current => mergeCalculatedObjects(current, calculated.serviceOrders, "service_order_id"));
        setTrips(current => mergeCalculatedObjects(current, calculated.trips, "trip_id"));
        setCostRecords(current => [...result.costRecords, ...current.filter(record => record.simulation_run_id !== runId)]);
        setCostCalculationRuns(current => [result.calculationRun, ...current]);
        setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
          ...item,
          cost_calculation_status: result.calculationRun.calculation_status,
          cost_calculation_progress_percent: 100,
          active_cost_calculation_run_id: calculationRunId,
          cost_model_profile_id: profile.cost_model_profile_id,
          cost_model_profile_version: profile.profile_version,
          total_cost_amount: result.calculationRun.total_cost_amount,
          cost_result_summary: {
            processed_object_count: result.calculationRun.processed_object_count,
            generated_cost_record_count: result.calculationRun.generated_cost_record_count,
            total_cost_amount: result.calculationRun.total_cost_amount,
            error_count: result.calculationRun.error_count
          },
          cost_calculation_errors: result.calculationRun.calculation_errors
        } : item));
        setSimulationEvents(current => [simulationEngine.createOperatingCostCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_COST_CALCULATION_COMPLETED",
          message: result.calculationRun.calculation_status === "SUCCEEDED" ? `运营成本计算完成：生成 ${result.calculationRun.generated_cost_record_count} 条成本记录，总成本 ${result.calculationRun.total_cost_amount} ${profile.currency_code}` : `运营成本计算完成，${result.calculationRun.error_count} 项需要检查`,
          calculationRunId,
          profile,
          resultSummary: {
            calculation_status: result.calculationRun.calculation_status,
            generated_cost_record_count: result.calculationRun.generated_cost_record_count,
            total_cost_amount: result.calculationRun.total_cost_amount,
            error_count: result.calculationRun.error_count,
            calculation_errors: result.calculationRun.calculation_errors
          }
        }), ...current]);
        antd.message.success(result.calculationRun.calculation_status === "SUCCEEDED" ? "运营成本计算完成" : "运营成本计算完成，存在待检查项");
      } catch (error) {
        setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
          ...item,
          cost_calculation_status: "FAILED",
          cost_calculation_progress_percent: 100,
          cost_calculation_errors: [{
            error_type: "COST_CALCULATION_FAILED",
            error_message: error.message
          }]
        } : item));
        setSimulationEvents(current => [simulationEngine.createOperatingCostCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_COST_CALCULATION_FAILED",
          eventResult: "FAILED",
          message: `运营成本计算失败：${error.message}`,
          calculationRunId,
          profile,
          failureReason: error.message
        }), ...current]);
        antd.message.error(`运营成本计算失败：${error.message}`);
      }
    }, 80);
  }
  function createCurrentBusinessScope(run) {
    return simulationRunBusinessScope.createSimulationRunBusinessScope(run, {
      ...data,
      readinessTasks,
      deploymentTasks,
      routeExecutions,
      serviceOrders,
      trips,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      routePlanningRuns,
      demandSimulationRuns
    });
  }
  function requestRevenueCalculation(runId) {
    const run = simulationRuns.find(item => item.simulation_run_id === runId);
    if (!run) return;
    setPendingRevenueCalculationRunId(runId);
  }
  function confirmRevenueCalculation() {
    if (!pendingRevenueCalculationRunId) return;
    const runId = pendingRevenueCalculationRunId;
    setPendingRevenueCalculationRunId(null);
    runRevenueCalculation(runId);
  }
  function runRevenueCalculation(runId) {
    const run = simulationRuns.find(item => item.simulation_run_id === runId);
    if (!run || !["COMPLETED", "STOPPED", "FAILED"].includes(run.simulation_status)) return;
    const calculationRunId = `RCR-${String(revenueCalculationRuns.length + 1).padStart(4, "0")}`;
    const scope = createCurrentBusinessScope(run);
    setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
      ...item,
      revenue_calculation_status: "CALCULATING",
      revenue_calculation_progress_percent: 15,
      active_revenue_calculation_run_id: calculationRunId
    } : item));
    setTimeout(() => {
      try {
        const result = revenueCalculator.createRevenueCalculation({
          simulationRun: run,
          scope,
          calculationRunId
        });
        setRevenueRecords(current => [...result.revenueRecords, ...current.filter(record => record.simulation_run_id !== runId)]);
        setRevenueCalculationRuns(current => [result.calculationRun, ...current]);
        setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
          ...item,
          revenue_calculation_status: result.calculationRun.calculation_status,
          revenue_calculation_progress_percent: 100,
          active_revenue_calculation_run_id: calculationRunId,
          total_receivable_revenue_amount: result.calculationRun.total_receivable_revenue_amount,
          total_collected_revenue_amount: result.calculationRun.total_collected_revenue_amount,
          total_unreceived_revenue_amount: result.calculationRun.total_unreceived_revenue_amount,
          revenue_result_summary: {
            processed_object_count: result.calculationRun.processed_object_count,
            generated_revenue_record_count: result.calculationRun.generated_revenue_record_count,
            total_receivable_revenue_amount: result.calculationRun.total_receivable_revenue_amount,
            total_collected_revenue_amount: result.calculationRun.total_collected_revenue_amount,
            total_unreceived_revenue_amount: result.calculationRun.total_unreceived_revenue_amount,
            error_count: result.calculationRun.error_count
          },
          revenue_calculation_errors: result.calculationRun.calculation_errors
        } : item));
        antd.message.success(result.calculationRun.calculation_status === "SUCCEEDED" ? "收入记录生成完成" : "收入记录生成完成，存在待检查项");
      } catch (error) {
        setSimulationRuns(current => current.map(item => item.simulation_run_id === runId ? {
          ...item,
          revenue_calculation_status: "FAILED",
          revenue_calculation_progress_percent: 100,
          revenue_calculation_errors: [{
            error_type: "REVENUE_CALCULATION_FAILED",
            error_message: error.message
          }]
        } : item));
        antd.message.error(`收入记录生成失败：${error.message}`);
      }
    }, 80);
  }
  function editCostParameterRule(rule) {
    setPendingCostParameterRule(rule);
    setCostParameterValue(rule.configured_value);
    setCostParameterModalOpen(true);
  }
  function saveCostParameterRule() {
    if (!pendingCostParameterRule) return;
    setCostModelProfiles(profiles => profiles.map(profile => profile.profile_status === "ACTIVE" ? costModelCalculator.updateCostParameterRule(profile, pendingCostParameterRule.cost_parameter_key, costParameterValue) : profile));
    setCostParameterModalOpen(false);
  }
  return /*#__PURE__*/React.createElement(Layout, {
    className: "ops-shell"
  }, /*#__PURE__*/React.createElement(Sider, {
    className: "ops-sider",
    width: 232,
    collapsedWidth: 60,
    collapsed: collapsed,
    trigger: null
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-bar"
  }, /*#__PURE__*/React.createElement(Button, {
    className: "brand-title-button",
    type: "text",
    onClick: goToConsole
  }, collapsed ? "RT" : "Robotaxi 运营平台"), /*#__PURE__*/React.createElement(Button, {
    type: "text",
    size: "small",
    "aria-label": collapsed ? "展开菜单" : "收起菜单",
    onClick: () => setCollapsed(value => !value)
  }, collapsed ? "≡" : "‹")), /*#__PURE__*/React.createElement(Menu, {
    mode: "inline",
    className: "ops-menu",
    selectedKeys: [activePage],
    openKeys: openMenuKeys,
    items: menuItems,
    onOpenChange: handleMenuOpenChange,
    onClick: ({
      key
    }) => handleMenuClick(key)
  })), /*#__PURE__*/React.createElement(Layout, {
    className: "ops-main-layout"
  }, /*#__PURE__*/React.createElement("div", {
    className: "top-strip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "top-strip-title"
  }, /*#__PURE__*/React.createElement(Text, {
    strong: true
  }, topTitle), topDescription && /*#__PURE__*/React.createElement(Text, {
    type: "secondary"
  }, topDescription)), /*#__PURE__*/React.createElement("div", {
    className: "top-strip-metrics"
  }, showConsoleSummary ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Tag, {
    bordered: false
  }, data.maps[0].grid_cols, " x ", data.maps[0].grid_rows, " / ", data.maps[0].cell_size_m, "m"), /*#__PURE__*/React.createElement(Tag, {
    bordered: false
  }, "\u5730\u56FE ", data.maps.length), /*#__PURE__*/React.createElement(Tag, {
    bordered: false
  }, "\u7F51\u683C ", data.cells.length), /*#__PURE__*/React.createElement(Tag, {
    bordered: false
  }, "Robotaxi ", data.robotaxis.length), /*#__PURE__*/React.createElement(Tag, {
    bordered: false
  }, "\u4F5C\u4E1A\u4EBA\u5458 ", data.workers.length), /*#__PURE__*/React.createElement(Tag, {
    bordered: false,
    color: failedCount === 0 ? "success" : "error"
  }, "\u6821\u9A8C ", failedCount === 0 ? "全部通过" : `${failedCount} 项异常`)) : /*#__PURE__*/React.createElement(Tag, {
    bordered: false
  }, "\u8BB0\u5F55 ", activeRows.length), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    onClick: resetRuntime
  }, "\u91CD\u7F6E\u6A21\u62DF\u6570\u636E"))), /*#__PURE__*/React.createElement(WorkspaceBar, {
    pages: workspacePages,
    activePage: activePage,
    onActivate: activateWorkspacePage,
    onClose: closeWorkspacePage
  }), /*#__PURE__*/React.createElement(Layout, {
    className: detailCollapsed ? "workbench detail-collapsed" : "workbench"
  }, /*#__PURE__*/React.createElement(Content, {
    className: "work-content"
  }, activePage === "console" ? /*#__PURE__*/React.createElement(MapCanvas, {
    data: data,
    selected: selected,
    onSelect: (type, id) => selectForPage("console", type, id)
  }) : /*#__PURE__*/React.createElement(RecordTable, {
    key: activePage,
    page: activePage,
    rows: rowsByPage[activePage] || [],
    selected: selected,
    uiState: pageUiState[activePage] || createDefaultPageUiState(),
    onUiStateChange: nextState => updatePageUiState(activePage, nextState),
    onSelect: (type, id) => selectForPage(activePage, type, id),
    actions: {
      createManualTask,
      runAutoReadinessCheck,
      assignWorker,
      startCheck,
      submitCheckResult,
      createDeploymentTasks,
      createServiceOrderFromDemand,
      estimateServiceOrderPrice,
      callRobotaxiForServiceOrder,
      matchServiceOrder,
      settleServiceOrder,
      payServiceOrder,
      createTripForOrder,
      viewTripForServiceOrder,
      advanceTrip,
      replanTripDestination,
      replanTripRouteException,
      planRouteExecutionRoute,
      viewRecordDetail,
      viewGeneratedRoute,
      viewRouteExecutionForDeployment,
      startRouteExecution,
      advanceRouteExecution,
      submitNormalArrival,
      submitAbnormalArrival,
      data,
      taskEventLogs,
      routePlanningRuns: rowsByPage.routePlanningRuns,
      demandSimulationRuns: rowsByPage.demandSimulationRuns,
      pricingStrategyRuns: rowsByPage.pricingStrategyRuns,
      orderMatchingRuns: rowsByPage.orderMatchingRuns,
      simActions,
      clearSimulationEvents,
      simulationPolicies,
      workflowTimingProfiles,
      editWorkflowTimingRule,
      requestBusinessTimingCalculation,
      requestCostCalculation,
      requestRevenueCalculation,
      editCostParameterRule,
      businessTimingCalculationRuns,
      costCalculationRuns,
      costRecords,
      revenueCalculationRuns,
      revenueRecords,
      simulationRuns,
      simulationEvents,
      timedOperations
    }
  })), /*#__PURE__*/React.createElement("aside", {
    className: "detail-rail"
  }, detailCollapsed ? /*#__PURE__*/React.createElement(Button, {
    className: "detail-toggle-button",
    size: "small",
    "aria-label": "\u5C55\u5F00\u8BE6\u60C5",
    onClick: () => setDetailCollapsedForPage(activePage, false)
  }, "\u2039") : /*#__PURE__*/React.createElement(DetailPanel, {
    selectedObject: detailSelectedObject,
    selectedType: detailSelectedType,
    onCollapse: () => setDetailCollapsedForPage(activePage, true)
  })))), /*#__PURE__*/React.createElement(Modal, {
    title: "\u8C03\u6574\u5DE5\u4F5C\u6D41\u65F6\u6548",
    open: timingRuleModalOpen,
    okText: "\u4FDD\u5B58\u914D\u7F6E",
    cancelText: "\u53D6\u6D88",
    width: 520,
    onCancel: () => setTimingRuleModalOpen(false),
    footer: [/*#__PURE__*/React.createElement(Button, {
      key: "cancel",
      onClick: () => setTimingRuleModalOpen(false)
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
      key: "save",
      type: "primary",
      onClick: saveWorkflowTimingRule
    }, "\u4FDD\u5B58\u914D\u7F6E")]
  }, /*#__PURE__*/React.createElement("div", {
    className: "timing-rule-editor"
  }, /*#__PURE__*/React.createElement(Descriptions, {
    size: "small",
    column: 1,
    colon: false
  }, /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u4E1A\u52A1\u5BF9\u8C61"
  }, getDisplayValue(pendingTimingRule?.business_object_type)), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u72B6\u6001\u53D8\u5316"
  }, getDisplayValue(pendingTimingRule?.from_status), " \u2192 ", getDisplayValue(pendingTimingRule?.to_status)), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u529F\u80FD\u64CD\u4F5C"
  }, getDisplayValue(pendingTimingRule?.action_type))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, pendingTimingRule?.duration_mode === "PER_CELL_DURATION" ? "单 Cell 行驶时长（秒）" : "操作时长（秒）"), /*#__PURE__*/React.createElement(Input, {
    type: "number",
    min: 0,
    value: timingRuleValue,
    onChange: event => setTimingRuleValue(event.target.value)
  })))), /*#__PURE__*/React.createElement(Modal, {
    title: simulationRuns.find(item => item.simulation_run_id === pendingCalculationRunId)?.business_timing_calculation_status ? "重算运营模拟时间" : "计算运营模拟时间",
    open: Boolean(pendingCalculationRunId),
    okText: "\u5F00\u59CB\u8BA1\u7B97",
    cancelText: "\u53D6\u6D88",
    width: 520,
    onCancel: () => setPendingCalculationRunId(null),
    footer: [/*#__PURE__*/React.createElement(Button, {
      key: "cancel",
      onClick: () => setPendingCalculationRunId(null)
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
      key: "calculate",
      type: "primary",
      onClick: confirmBusinessTimingCalculation
    }, "\u5F00\u59CB\u8BA1\u7B97")]
  }, /*#__PURE__*/React.createElement(Text, null, "\u5C06\u4F7F\u7528\u5F53\u524D\u751F\u6548\u7684\u5DE5\u4F5C\u6D41\u65F6\u6548\u914D\u7F6E\u751F\u6210\u65B0\u7684\u72B6\u6001\u65F6\u95F4\u7EBF\u7248\u672C\u3002\u539F\u59CB\u6A21\u62DF\u65F6\u95F4\u4E0D\u4F1A\u88AB\u4FEE\u6539\u3002")), /*#__PURE__*/React.createElement(Modal, {
    title: simulationRuns.find(item => item.simulation_run_id === pendingCostCalculationRunId)?.cost_calculation_status ? "重新计算运营成本" : "计算运营成本",
    open: Boolean(pendingCostCalculationRunId),
    okText: "\u5F00\u59CB\u8BA1\u7B97",
    cancelText: "\u53D6\u6D88",
    width: 560,
    onCancel: () => setPendingCostCalculationRunId(null),
    footer: [/*#__PURE__*/React.createElement(Button, {
      key: "cancel",
      onClick: () => setPendingCostCalculationRunId(null)
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
      key: "calculate",
      type: "primary",
      onClick: confirmCostCalculation
    }, "\u5F00\u59CB\u8BA1\u7B97")]
  }, /*#__PURE__*/React.createElement(Text, null, "\u5C06\u4F7F\u7528\u5F53\u524D\u751F\u6548\u7684\u6210\u672C\u6A21\u578B\u914D\u7F6E\u751F\u6210\u6210\u672C\u8BB0\u5F55\uFF0C\u5E76\u66F4\u65B0\u76F8\u5173\u4E1A\u52A1\u5355\u636E\u7684\u6210\u672C\u6C47\u603B\u3002\u539F\u59CB\u6A21\u62DF\u4E8B\u4EF6\u3001\u4E1A\u52A1\u72B6\u6001\u548C\u771F\u5B9E\u5BA1\u8BA1\u65F6\u95F4\u4E0D\u4F1A\u88AB\u4FEE\u6539\u3002")), /*#__PURE__*/React.createElement(Modal, {
    title: simulationRuns.find(item => item.simulation_run_id === pendingRevenueCalculationRunId)?.revenue_calculation_status ? "重新生成收入记录" : "生成收入记录",
    open: Boolean(pendingRevenueCalculationRunId),
    okText: "\u5F00\u59CB\u751F\u6210",
    cancelText: "\u53D6\u6D88",
    width: 560,
    onCancel: () => setPendingRevenueCalculationRunId(null),
    footer: [/*#__PURE__*/React.createElement(Button, {
      key: "cancel",
      onClick: () => setPendingRevenueCalculationRunId(null)
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
      key: "calculate",
      type: "primary",
      onClick: confirmRevenueCalculation
    }, "\u5F00\u59CB\u751F\u6210")]
  }, /*#__PURE__*/React.createElement(Text, null, "\u5C06\u4ECE\u5F53\u524D\u6A21\u62DF\u8FD0\u884C\u7684\u670D\u52A1\u8BA2\u5355\u751F\u6210\u5E94\u6536\u3001\u5B9E\u6536\u548C\u672A\u6536\u6536\u5165\u8BB0\u5F55\u3002\u91CD\u65B0\u751F\u6210\u4F1A\u66FF\u6362\u5F53\u524D\u6709\u6548\u6536\u5165\u8BB0\u5F55\uFF0C\u4E0D\u4F1A\u91CD\u590D\u7D2F\u52A0\u3002")), /*#__PURE__*/React.createElement(Modal, {
    title: "\u8C03\u6574\u6210\u672C\u914D\u7F6E",
    open: costParameterModalOpen,
    okText: "\u4FDD\u5B58\u914D\u7F6E",
    cancelText: "\u53D6\u6D88",
    width: 520,
    onCancel: () => setCostParameterModalOpen(false),
    footer: [/*#__PURE__*/React.createElement(Button, {
      key: "cancel",
      onClick: () => setCostParameterModalOpen(false)
    }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement(Button, {
      key: "save",
      type: "primary",
      onClick: saveCostParameterRule
    }, "\u4FDD\u5B58\u914D\u7F6E")]
  }, /*#__PURE__*/React.createElement("div", {
    className: "timing-rule-editor"
  }, /*#__PURE__*/React.createElement(Descriptions, {
    size: "small",
    column: 1,
    colon: false
  }, /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u914D\u7F6E\u9879"
  }, pendingCostParameterRule?.cost_parameter_name || "无"), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u6210\u672C\u5206\u7EC4"
  }, getDisplayValue(pendingCostParameterRule?.cost_parameter_group)), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u5355\u4F4D"
  }, getDisplayValue(pendingCostParameterRule?.parameter_unit, "parameter_unit"))), /*#__PURE__*/React.createElement("label", null, /*#__PURE__*/React.createElement("span", null, "\u914D\u7F6E\u503C"), pendingCostParameterRule?.cost_parameter_key === "depreciation_method" ? /*#__PURE__*/React.createElement(Select, {
    size: "small",
    value: costParameterValue,
    onChange: setCostParameterValue,
    options: ["PER_KM", "PER_HOUR", "PER_DAY"].map(value => ({
      value,
      label: getDisplayValue(value, "depreciation_method")
    }))
  }) : /*#__PURE__*/React.createElement(Input, {
    type: "number",
    min: 0,
    value: costParameterValue,
    onChange: event => setCostParameterValue(event.target.value)
  })))));
  function handleMenuClick(key) {
    activateWorkspacePage(key);
  }
  function handleMenuOpenChange(keys) {
    const latestKey = keys.find(key => !openMenuKeys.includes(key));
    if (!latestKey) {
      setOpenMenuKeys(keys);
      return;
    }
    const rootKey = getRootMenuKey(latestKey);
    setOpenMenuKeys(keys.filter(key => getRootMenuKey(key) === rootKey));
  }
  function goToConsole() {
    setActivePageAndMenu("console");
    setWorkspacePages(current => addWorkspacePage(current, "console"));
    const consoleSelection = pageSelections.console || {
      type: "map",
      id: data.maps[0].map_id
    };
    setSelected(consoleSelection);
  }
  function resetRuntime() {
    taskSequence = 0;
    deploymentTaskSequence = 0;
    routeExecutionSequence = 0;
    deploymentRouteSequence = 0;
    serviceRouteSequence = 0;
    routePlanningRunSequence = 0;
    demandSimulationRunSequence = 0;
    serviceOrderSequence = 0;
    pricingStrategyRunSequence = 0;
    pricingDecisionSequence = 0;
    orderMatchingRunSequence = 0;
    orderMatchingDecisionSequence = 0;
    tripSequence = 0;
    eventSequence = 0;
    const nextSelection = {
      type: "map",
      id: initialData.maps[0].map_id
    };
    setOperationalData(initialData);
    setReadinessTasks([]);
    setDeploymentTasks([]);
    setRouteExecutions([]);
    setRoutePlanningRuns([]);
    setDemandSimulationRuns([]);
    setServiceOrders([]);
    setPricingStrategyRuns([]);
    setPricingDecisions([]);
    setOrderMatchingRuns([]);
    setOrderMatchingDecisions([]);
    setTrips([]);
    setTaskEventLogs([]);
    setSimulationPolicies([]);
    setWorkflowTimingProfiles([businessTimingCalculator.initializeDefaultWorkflowTimingProfile()]);
    setBusinessTimingCalculationRuns([]);
    setCostModelProfiles([costModelCalculator.initializeDefaultCostModelProfile()]);
    setCostCalculationRuns([]);
    setCostRecords([]);
    setRevenueCalculationRuns([]);
    setRevenueRecords([]);
    setSimulationRuns([]);
    setSimulationEvents([]);
    setActivePage("console");
    setOpenMenuKeys([]);
    setSelected(nextSelection);
    setWorkspacePages(["console"]);
    setDetailCollapsedByPage({});
    setPageSelections({
      console: nextSelection
    });
    setPageUiState({});
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(runtimeStorageKey);
        clearPersistedSimulationEvents();
        clearPersistedRuntimeSnapshot();
      } catch (error) {
        // Ignore storage cleanup failures; in-memory reset is already complete.
      }
    }
  }
  function clearSimulationEvents() {
    setSimulationEvents([]);
    clearPersistedSimulationEvents();
  }
  function selectForPage(page, type, id) {
    const nextSelection = {
      type,
      id
    };
    setSelected(nextSelection);
    setWorkspacePages(current => addWorkspacePage(current, page));
    setPageSelections(current => ({
      ...current,
      [page]: nextSelection
    }));
  }
  function viewRecordDetail(page, type, id) {
    selectForPage(page, type, id);
    setDetailCollapsedForPage(page, false);
  }
  function viewRouteExecutionForDeployment(task) {
    const execution = routeExecutions.find(item => item.task_id === task.task_id && item.robotaxi_id === task.robotaxi_id);
    if (!execution) {
      viewRecordDetail("deploymentTasks", "deploymentTask", task.task_id);
      return;
    }
    const nextFilters = {
      keyword: task.task_id,
      statusValue: null,
      triggerType: null
    };
    const nextSelection = {
      type: "routeExecution",
      id: execution.route_execution_id
    };
    setActivePageAndMenu("routeExecutions");
    setWorkspacePages(current => addWorkspacePage(current, "routeExecutions"));
    setSelected(nextSelection);
    setDetailCollapsedForPage("routeExecutions", false);
    setPageSelections(current => ({
      ...current,
      routeExecutions: nextSelection
    }));
    setPageUiState(current => ({
      ...current,
      routeExecutions: createNextPageUiState(current.routeExecutions, {
        filters: nextFilters,
        appliedFilters: nextFilters,
        pagination: {
          current: 1
        }
      })
    }));
  }
  function focusRouteExecutionStatus(statusValue) {
    setPageUiState(current => ({
      ...current,
      routeExecutions: createNextPageUiState(current.routeExecutions, {
        filters: {
          statusValue
        },
        appliedFilters: {
          statusValue
        },
        pagination: {
          current: 1
        }
      })
    }));
  }
  function viewGeneratedRoute(routePlanningRun) {
    if (!routePlanningRun?.result_route_id) {
      viewRecordDetail("routePlanningRuns", "routePlanningRun", routePlanningRun?.route_planning_run_id);
      return;
    }
    const nextSelection = {
      type: "route",
      id: routePlanningRun.result_route_id
    };
    setActivePageAndMenu("routes");
    setWorkspacePages(current => addWorkspacePage(current, "routes"));
    setSelected(nextSelection);
    setDetailCollapsedForPage("routes", false);
    setPageSelections(current => ({
      ...current,
      routes: nextSelection
    }));
    setPageUiState(current => ({
      ...current,
      routes: createNextPageUiState(current.routes, {
        filters: {
          keyword: routePlanningRun.result_route_id,
          statusValue: null,
          triggerType: null
        },
        appliedFilters: {
          keyword: routePlanningRun.result_route_id,
          statusValue: null,
          triggerType: null
        },
        pagination: {
          current: 1
        }
      })
    }));
  }
  function updatePageUiState(page, nextState) {
    setPageUiState(current => ({
      ...current,
      [page]: normalizePageUiState(nextState)
    }));
  }
  function activateWorkspacePage(page) {
    setActivePageAndMenu(page);
    setWorkspacePages(current => addWorkspacePage(current, page));
    setSelected(pageSelections[page] || getDefaultSelection(page, data));
  }
  function closeWorkspacePage(page) {
    if (page === "console") return;
    setWorkspacePages(current => {
      const currentPages = normalizeWorkspacePages(current, activePage);
      const closeIndex = currentPages.indexOf(page);
      const nextPages = currentPages.filter(item => item !== page);
      if (page === activePage) {
        const nextPage = nextPages[Math.max(0, closeIndex - 1)] || "console";
        setActivePageAndMenu(nextPage);
        setSelected(pageSelections[nextPage] || getDefaultSelection(nextPage, data));
      }
      return nextPages.length > 0 ? nextPages : ["console"];
    });
  }
  function setActivePageAndMenu(page) {
    setActivePage(page);
    setOpenMenuKeys(getOpenKeysForPage(page));
  }
  function setDetailCollapsedForPage(page, collapsedValue) {
    setDetailCollapsedByPage(current => ({
      ...current,
      [page]: collapsedValue
    }));
  }
  function createManualTask() {
    const candidates = data.robotaxis.filter(robotaxi => isCandidateRobotaxi(robotaxi, readinessTasks));
    const nextLogs = [createEventLog({
      event_type: taskTypes.TaskEventType.MANUAL_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: "手动触发运营准入任务生成"
    })];
    if (candidates.length === 0) {
      setTaskEventLogs(logs => [...nextLogs, ...logs]);
      addLog({
        event_type: taskTypes.TaskEventType.NO_CANDIDATE_ROBOTAXI,
        event_result: taskTypes.TaskEventResult.SKIPPED,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: "当前没有可生成准入任务的 Robotaxi"
      });
      return;
    }
    const newTasks = candidates.map(robotaxi => createTask(robotaxi, taskTypes.TriggerType.MANUAL));
    setReadinessTasks(tasks => [...newTasks, ...tasks]);
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => {
        const task = newTasks.find(item => item.robotaxi_id === robotaxi.robotaxi_id);
        return task ? {
          ...robotaxi,
          current_task_id: task.task_id
        } : robotaxi;
      })
    }));
    setTaskEventLogs(logs => [...newTasks.map(task => createEventLog({
      event_type: taskTypes.TaskEventType.TASK_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      trigger_type: task.trigger_type,
      message: `已创建 ${task.robotaxi_id} 的运营准入任务`
    })), ...nextLogs, ...logs]);
    selectForPage("readinessTasks", "readinessTask", newTasks[0].task_id);
  }
  function runAutoReadinessCheck() {
    const candidates = data.robotaxis.filter(robotaxi => isCandidateRobotaxi(robotaxi, readinessTasks));
    const triggerLog = createEventLog({
      event_type: taskTypes.TaskEventType.AUTO_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.AUTO,
      message: "启动自动准入检查"
    });
    if (candidates.length === 0) {
      setTaskEventLogs(logs => [createEventLog({
        event_type: taskTypes.TaskEventType.NO_CANDIDATE_ROBOTAXI,
        event_result: taskTypes.TaskEventResult.SKIPPED,
        trigger_type: taskTypes.TriggerType.AUTO,
        message: "自动触发未找到候选 Robotaxi"
      }), triggerLog, ...logs]);
      return;
    }
    const newTasks = candidates.map(robotaxi => createTask(robotaxi, taskTypes.TriggerType.AUTO));
    setReadinessTasks(tasks => [...newTasks, ...tasks]);
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => {
        const task = newTasks.find(item => item.robotaxi_id === robotaxi.robotaxi_id);
        return task ? {
          ...robotaxi,
          current_task_id: task.task_id
        } : robotaxi;
      })
    }));
    setTaskEventLogs(logs => [...newTasks.map(task => createEventLog({
      event_type: taskTypes.TaskEventType.TASK_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      trigger_type: task.trigger_type,
      message: `自动创建 ${task.robotaxi_id} 的运营准入任务`
    })), triggerLog, ...logs]);
  }
  function assignWorker(taskId) {
    const task = readinessTasks.find(item => item.task_id === taskId);
    if (!task || task.task_status !== taskTypes.ReadinessTaskStatus.WAITING_ASSIGNMENT) return;
    const worker = data.workers.find(item => item.ops_center_id === task.ops_center_id && item.worker_status === "IDLE" && item.current_task_id === null);
    if (!worker) {
      addLog({
        event_type: taskTypes.TaskEventType.NO_IDLE_WORKER,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        message: "没有可分配的空闲作业人员"
      });
      return;
    }
    setReadinessTasks(tasks => tasks.map(item => item.task_id === taskId ? {
      ...item,
      worker_id: worker.worker_id,
      task_status: taskTypes.ReadinessTaskStatus.WAITING_CHECK,
      assigned_at: now()
    } : item));
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        availability_status: "IN_INSPECTION",
        available_for_dispatch: false,
        current_task_id: taskId
      } : robotaxi),
      workers: current.workers.map(item => item.worker_id === worker.worker_id ? {
        ...item,
        worker_status: "BUSY",
        current_task_id: taskId
      } : item)
    }));
    addLog({
      event_type: taskTypes.TaskEventType.WORKER_ASSIGNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: worker.worker_id,
      message: `${worker.worker_id} 已分配到 ${task.task_id}`
    });
  }
  function startCheck(taskId) {
    const task = readinessTasks.find(item => item.task_id === taskId);
    if (!task || task.task_status !== taskTypes.ReadinessTaskStatus.WAITING_CHECK) return;
    setReadinessTasks(tasks => tasks.map(item => item.task_id === taskId ? {
      ...item,
      task_status: taskTypes.ReadinessTaskStatus.CHECKING,
      started_at: now()
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.CHECK_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: task.worker_id,
      message: `${task.task_id} 开始检查`
    });
  }
  function submitCheckResult(taskId, checkResult, issueType = taskTypes.IssueType.NONE) {
    const task = readinessTasks.find(item => item.task_id === taskId);
    if (!task || task.task_status !== taskTypes.ReadinessTaskStatus.CHECKING) return;
    const passed = checkResult === taskTypes.CheckResult.PASSED;
    setReadinessTasks(tasks => tasks.map(item => item.task_id === taskId ? {
      ...item,
      task_status: taskTypes.ReadinessTaskStatus.COMPLETED,
      check_result: checkResult,
      issue_type: passed ? taskTypes.IssueType.NONE : issueType,
      completed_at: now()
    } : item));
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        availability_status: passed ? "AVAILABLE" : "UNAVAILABLE",
        available_for_dispatch: passed,
        unavailable_reason: passed ? null : issueType,
        current_task_id: null
      } : robotaxi),
      workers: current.workers.map(worker => worker.worker_id === task.worker_id ? {
        ...worker,
        worker_status: "IDLE",
        current_task_id: null
      } : worker)
    }));
    addLog({
      event_type: taskTypes.TaskEventType.CHECK_SUBMITTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: task.worker_id,
      message: passed ? "检查通过" : `检查不通过：${getDisplayValue(issueType)}`
    });
    addLog({
      event_type: passed ? taskTypes.TaskEventType.ROBOTAXI_MARKED_AVAILABLE : taskTypes.TaskEventType.ROBOTAXI_MARKED_UNAVAILABLE,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: task.worker_id,
      message: passed ? `${task.robotaxi_id} 已标记为可运营` : `${task.robotaxi_id} 已标记为不可运营`
    });
  }
  function createDeploymentTasks() {
    const candidates = data.robotaxis.filter(robotaxi => isDeploymentCandidateRobotaxi(robotaxi, deploymentTasks));
    const targets = candidates.map(robotaxi => getDefaultDeploymentTarget(data, {
      originCellId: robotaxi.current_cell_id,
      seed: `${robotaxi.robotaxi_id}-${Date.now()}`
    }));
    const hasTarget = targets.some(target => target?.target_cell_id);
    const triggerLog = createEventLog({
      event_type: taskTypes.TaskEventType.DEPLOYMENT_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: "手动触发运营投放任务生成"
    });
    if (!hasTarget || candidates.length === 0) {
      setTaskEventLogs(logs => [createEventLog({
        event_type: taskTypes.TaskEventType.DEPLOYMENT_FAILED,
        event_result: taskTypes.TaskEventResult.SKIPPED,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: hasTarget ? "当前没有可运营投放的 Robotaxi" : "当前没有有效投放目标"
      }), triggerLog, ...logs]);
      return;
    }
    const newTasks = candidates.map((robotaxi, index) => targets[index]?.target_cell_id ? createDeploymentTask(robotaxi, targets[index]) : null).filter(Boolean);
    const newExecutions = newTasks.map(task => createDeploymentRouteExecution(task));
    setDeploymentTasks(tasks => [...newTasks, ...tasks]);
    setRouteExecutions(items => [...newExecutions, ...items]);
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => {
        const task = newTasks.find(item => item.robotaxi_id === robotaxi.robotaxi_id);
        return task ? {
          ...robotaxi,
          current_task_id: task.task_id,
          current_route_id: null,
          motion_status: "PARKED"
        } : robotaxi;
      })
    }));
    setTaskEventLogs(logs => [...newTasks.map(task => createEventLog({
      event_type: taskTypes.TaskEventType.TASK_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      trigger_type: task.trigger_type,
      message: `已创建 ${task.robotaxi_id} 的运营投放任务`
    })), ...newExecutions.map(execution => createEventLog({
      event_type: taskTypes.TaskEventType.TASK_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: execution.task_id,
      robotaxi_id: execution.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: `已创建 ${execution.robotaxi_id} 的运营行驶记录 ${execution.route_execution_id}`
    })), triggerLog, ...logs]);
    selectForPage("deploymentTasks", "deploymentTask", newTasks[0].task_id);
  }
  function createServiceOrderFromDemand(orderChannel) {
    const strategy = data.demandSimulationStrategies?.find(item => item.demand_simulation_strategy_id === "DSS-001");
    if (!strategy || strategy.strategy_status !== "ACTIVE") return;
    const run = runDemandSimulation({
      strategy,
      data,
      orderChannel,
      runId: nextDemandSimulationRunId(),
      randomSeed: `SO-${Date.now()}-${serviceOrders.length + 1}`,
      createdAt: now()
    });
    setDemandSimulationRuns(items => [run, ...items]);
    if (run.simulation_result !== "SUCCESS") return;
    const order = serviceOrderTypes.createServiceOrder({
      service_order_id: nextServiceOrderId(),
      order_channel: orderChannel,
      customer_id: run.customer_id,
      demand_simulation_run_id: run.demand_simulation_run_id,
      demand_simulation_result_id: getDemandSimulationResultId(run.demand_simulation_run_id),
      customer_origin_location_type: run.customer_origin_location_type,
      customer_origin_place_id: run.customer_origin_place_id,
      customer_origin_road_segment_id: run.customer_origin_road_segment_id,
      customer_origin_cell_id: run.customer_origin_cell_id,
      pickup_service_area_id: run.pickup_service_area_id,
      pickup_cell_id: run.pickup_cell_id,
      dropoff_service_area_id: run.dropoff_service_area_id,
      dropoff_cell_id: run.dropoff_cell_id,
      estimated_pricing_decision_id: null,
      final_pricing_decision_id: null,
      price_estimation_route_id: null,
      quote_base_fare: null,
      quote_distance_unit_price: null,
      quote_time_unit_price: null,
      estimated_distance_km: null,
      estimated_duration_min: null,
      estimated_price: null,
      quoted_price: null,
      final_price: null,
      trip_total_distance_km: null,
      trip_total_duration_min: null,
      payment_status: serviceOrderTypes.PaymentStatus.NOT_REQUIRED,
      paid_amount: 0,
      payment_completed_at: null,
      pricing_explanation: "等待定价决策",
      pricing_breakdown_snapshot: null,
      order_status: serviceOrderTypes.ServiceOrderStatus.WAITING_PRICE_ESTIMATE,
      matched_robotaxi_id: null,
      order_matching_decision_id: null,
      trip_id: null,
      created_at: now(),
      confirmed_at: null,
      matched_at: null,
      completed_at: null,
      cancelled_at: null,
      failure_reason: null
    });
    setServiceOrders(items => [order, ...items]);
    addServiceOrderEvent({
      service_order_id: order.service_order_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${order.service_order_id} 已创建服务订单`
    });
    selectForPage("serviceOrders", "serviceOrder", order.service_order_id);
  }
  function estimateServiceOrderPrice(serviceOrderId) {
    const serviceOrder = serviceOrders.find(item => item.service_order_id === serviceOrderId);
    if (!serviceOrder || ![serviceOrderTypes.ServiceOrderStatus.WAITING_PRICE_ESTIMATE, serviceOrderTypes.ServiceOrderStatus.CREATED].includes(serviceOrder.order_status)) return;
    const strategy = data.pricingStrategies?.find(item => item.pricing_strategy_id === "DPS-001");
    const routePlanningRunId = nextRoutePlanningRunId();
    const priceRoute = createPriceEstimationRoute(serviceOrder, data, routePlanningRunId);
    const routePlanningRun = createRoutePlanningRun({
      routePlanningRunId,
      routeStrategyId: priceRoute.route_strategy_id,
      planningAlgorithm: priceRoute.planning_algorithm,
      taskId: null,
      serviceOrderId: serviceOrder.service_order_id,
      tripId: null,
      routeExecutionId: null,
      robotaxiId: null,
      originCellId: priceRoute.origin_cell_id,
      targetCellId: priceRoute.target_cell_id,
      resultRouteId: priceRoute.route_steps.length > 0 ? priceRoute.route_id : null,
      planningResult: priceRoute.route_steps.length > 0 ? taskTypes.RoutePlanningResult.SUCCESS : taskTypes.RoutePlanningResult.FAILED,
      failureReason: priceRoute.route_steps.length > 0 ? taskTypes.RoutePlanningFailureReason.NONE : priceRoute.failure_reason,
      routeStepCount: priceRoute.route_step_count,
      totalDistanceKm: priceRoute.total_distance_km
    });
    setRoutePlanningRuns(items => [routePlanningRun, ...items]);
    if (priceRoute.route_steps.length === 0) {
      setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
        ...order,
        order_status: serviceOrderTypes.ServiceOrderStatus.FAILED,
        failure_reason: priceRoute.failure_reason
      } : order));
      addServiceOrderEvent({
        service_order_id: serviceOrderId,
        route_id: priceRoute.route_id,
        event_type: taskTypes.TaskEventType.SERVICE_ORDER_PRICE_ESTIMATED,
        event_result: taskTypes.TaskEventResult.FAILED,
        message: `${serviceOrderId} 价格预估失败：${getDisplayValue(priceRoute.failure_reason)}`
      });
      selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
      return;
    }
    setOperationalData(current => ({
      ...current,
      routes: [priceRoute, ...current.routes]
    }));
    const result = serviceOrderService.executePricing({
      strategy,
      serviceOrder,
      data,
      routeEstimate: {
        route_id: priceRoute.route_id,
        estimated_distance_km: priceRoute.total_distance_km ?? priceRoute.total_distance_m / 1000,
        estimated_duration_min: routePlanningService.calculateRouteEstimatedDurationMin(priceRoute),
        route_step_count: priceRoute.route_step_count,
        cell_travel_seconds: routePlanningService.DEFAULT_CELL_TRAVEL_SECONDS
      },
      pricingStrategyRunId: nextPricingStrategyRunId(),
      pricingDecisionId: nextPricingDecisionId(),
      createdAt: now()
    });
    setPricingStrategyRuns(items => [result.run, ...items]);
    if (!result.success) {
      setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
        ...order,
        order_status: serviceOrderTypes.ServiceOrderStatus.FAILED,
        failure_reason: result.run.failure_reason
      } : order));
      addServiceOrderEvent({
        service_order_id: serviceOrderId,
        pricing_strategy_run_id: result.run.pricing_strategy_run_id,
        event_type: taskTypes.TaskEventType.SERVICE_ORDER_PRICE_ESTIMATED,
        event_result: taskTypes.TaskEventResult.FAILED,
        message: `${serviceOrderId} 价格预估失败：${getDisplayValue(result.run.failure_reason)}`
      });
      return;
    }
    setPricingDecisions(items => [result.decision, ...items]);
    setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
      ...order,
      estimated_pricing_decision_id: result.decision.pricing_decision_id,
      price_estimation_route_id: priceRoute.route_id,
      quote_base_fare: result.decision.base_fare,
      quote_distance_unit_price: result.decision.distance_unit_price,
      quote_time_unit_price: result.decision.time_unit_price,
      estimated_distance_km: result.decision.estimated_distance_km,
      estimated_duration_min: result.decision.estimated_duration_min,
      estimated_price: result.decision.estimated_price,
      quoted_price: result.decision.quoted_price,
      pricing_explanation: result.decision.pricing_explanation,
      pricing_breakdown_snapshot: result.decision.pricing_breakdown_snapshot,
      order_status: serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_CALL,
      failure_reason: null
    } : order));
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      pricing_strategy_run_id: result.run.pricing_strategy_run_id,
      pricing_decision_id: result.decision.pricing_decision_id,
      route_id: priceRoute.route_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_PRICE_ESTIMATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 价格预估完成，预估价格 ${result.decision.estimated_price}`
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }
  function callRobotaxiForServiceOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find(item => item.service_order_id === serviceOrderId);
    if (!serviceOrder || ![serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_CALL, serviceOrderTypes.ServiceOrderStatus.WAITING_CUSTOMER_CONFIRM].includes(serviceOrder.order_status)) return;
    setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
      ...order,
      order_status: serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_ASSIGNMENT,
      confirmed_at: now(),
      failure_reason: null
    } : order));
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_ROBOTAXI_CALLED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 已呼叫 Robotaxi，等待分配`
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }
  function matchServiceOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find(item => item.service_order_id === serviceOrderId);
    const assignableStatuses = [serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_ASSIGNMENT, serviceOrderTypes.ServiceOrderStatus.ROBOTAXI_ASSIGNMENT_FAILED, serviceOrderTypes.ServiceOrderStatus.WAITING_FOR_VEHICLE, serviceOrderTypes.ServiceOrderStatus.MATCH_FAILED, serviceOrderTypes.ServiceOrderStatus.MATCHING_FAILED];
    if (!serviceOrder || !assignableStatuses.includes(serviceOrder.order_status)) return;
    const strategy = data.orderMatchingStrategies?.find(item => item.order_matching_strategy_id === "OMS-001");
    const result = serviceOrderService.executeOrderMatching({
      strategy,
      serviceOrder,
      data,
      orderMatchingRunId: nextOrderMatchingRunId(),
      orderMatchingDecisionId: nextOrderMatchingDecisionId(),
      createdAt: now()
    });
    setOrderMatchingRuns(items => [result.run, ...items]);
    setOrderMatchingDecisions(items => [result.decision, ...items]);
    if (!result.success) {
      setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
        ...order,
        order_matching_decision_id: result.decision?.order_matching_decision_id || null,
        order_status: serviceOrderTypes.ServiceOrderStatus.ROBOTAXI_ASSIGNMENT_FAILED,
        failure_reason: result.run.failure_reason
      } : order));
      addServiceOrderEvent({
        service_order_id: serviceOrderId,
        event_type: taskTypes.TaskEventType.SERVICE_ORDER_ASSIGNMENT_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        message: `${serviceOrderId} 分配 Robotaxi 失败：${getDisplayValue(result.run.failure_reason)}`
      });
      selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
      return;
    }
    const selectedRobotaxiId = result.decision.selected_robotaxi_id;
    setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
      ...order,
      matched_robotaxi_id: selectedRobotaxiId,
      order_matching_decision_id: result.decision.order_matching_decision_id,
      order_status: serviceOrderTypes.ServiceOrderStatus.ON_THE_WAY_PICKUP,
      matched_at: now(),
      failure_reason: null
    } : order));
    const trip = createTripRecord({
      serviceOrder,
      robotaxiId: selectedRobotaxiId
    });
    setTrips(items => [trip, ...items]);
    setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
      ...order,
      trip_id: trip.trip_id
    } : order));
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: trip.trip_id,
      robotaxi_id: selectedRobotaxiId,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_ROBOTAXI_ASSIGNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 已分配 ${selectedRobotaxiId}，并创建履约行驶记录 ${trip.trip_id}`
    });
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === selectedRobotaxiId ? {
        ...robotaxi,
        current_order_id: serviceOrderId,
        available_for_dispatch: false
      } : robotaxi)
    }));
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }
  function createTripForOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find(item => item.service_order_id === serviceOrderId);
    if (!serviceOrder || serviceOrder.trip_id || !serviceOrder.matched_robotaxi_id) return;
    const trip = createTripRecord({
      serviceOrder,
      robotaxiId: serviceOrder.matched_robotaxi_id
    });
    setTrips(items => [trip, ...items]);
    setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? {
      ...order,
      trip_id: trip.trip_id
    } : order));
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: trip.trip_id,
      robotaxi_id: serviceOrder.matched_robotaxi_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_TRIP_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 已创建履约行驶记录 ${trip.trip_id}`
    });
    selectForPage("serviceFulfillmentRecords", "trip", trip.trip_id);
  }
  function settleServiceOrder(serviceOrderId, visibleOrder = null) {
    const serviceOrder = serviceOrders.find(item => item.service_order_id === serviceOrderId);
    if (!serviceOrder) return;
    const trip = trips.find(item => item.trip_id === serviceOrder.trip_id || item.service_order_id === serviceOrderId);
    const sourceOrder = {
      ...serviceOrder,
      ...(visibleOrder || {}),
      ...serviceOrderSettlement.createServiceOrderActualSnapshotFromTrip(serviceOrder, trip, serviceOrderTypes, tripTypes)
    };
    const settlementInput = serviceOrderSettlement.buildServiceOrderSettlementInput({
      serviceOrder: sourceOrder,
      trip,
      serviceOrderTypes,
      tripTypes
    });
    if (!settlementInput.settlementOrder) {
      addServiceOrderEvent({
        service_order_id: serviceOrderId,
        trip_id: trip?.trip_id,
        event_type: taskTypes.TaskEventType.SERVICE_ORDER_SETTLEMENT_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        message: `${serviceOrderId} 结算失败：${getDisplayValue(settlementInput.failure_reason)}`
      });
      return;
    }
    const settlementOrder = settlementInput.settlementOrder;
    const strategy = data.pricingStrategies?.find(item => item.pricing_strategy_id === "DPS-002");
    const result = serviceOrderSettlement.runFinalFareCalculation({
      strategy,
      serviceOrder: settlementOrder,
      pricingStrategyRunId: nextPricingStrategyRunId(),
      pricingDecisionId: nextPricingDecisionId(),
      createdAt: now(),
      pricingTypes
    });
    setPricingStrategyRuns(items => [result.run, ...items]);
    if (result.decision) {
      setPricingDecisions(items => [result.decision, ...items]);
    }
    setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? serviceOrderSettlement.applyServiceOrderSettlementResult({
      order,
      settlementOrder,
      result,
      serviceOrderTypes
    }) : order));
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: trip?.trip_id,
      pricing_strategy_run_id: result.run.pricing_strategy_run_id,
      pricing_decision_id: result.decision?.pricing_decision_id || null,
      event_type: result.decision ? taskTypes.TaskEventType.SERVICE_ORDER_SETTLED : taskTypes.TaskEventType.SERVICE_ORDER_SETTLEMENT_FAILED,
      event_result: result.decision ? taskTypes.TaskEventResult.SUCCESS : taskTypes.TaskEventResult.FAILED,
      message: result.decision ? `${serviceOrderId} 结算完成，最终价格 ${result.decision.final_price}` : `${serviceOrderId} 结算失败：${getDisplayValue(result.run.failure_reason)}`
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }
  function payServiceOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find(item => item.service_order_id === serviceOrderId);
    if (!serviceOrder || serviceOrder.order_status !== serviceOrderTypes.ServiceOrderStatus.WAITING_PAYMENT) return;
    const completedAt = now();
    const result = serviceOrderService.payServiceOrder({
      serviceOrder,
      trips,
      robotaxis: data.robotaxis,
      completedAt,
      serviceOrderTypes,
      tripTypes
    });
    if (!result.success) return;
    setServiceOrders(items => items.map(order => order.service_order_id === serviceOrderId ? result.serviceOrder : order));
    setTrips(result.trips);
    setOperationalData(current => ({
      ...current,
      robotaxis: result.robotaxis
    }));
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: serviceOrder.trip_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_PAID,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 支付完成，支付金额 ${result.paidAmount}`
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }
  function viewTripForServiceOrder(serviceOrder) {
    const trip = trips.find(item => item.trip_id === serviceOrder.trip_id || item.service_order_id === serviceOrder.service_order_id);
    if (!trip) {
      viewRecordDetail("serviceOrders", "serviceOrder", serviceOrder.service_order_id);
      return;
    }
    const nextFilters = {
      keyword: trip.trip_id,
      statusValue: null,
      triggerType: null
    };
    const nextSelection = {
      type: "trip",
      id: trip.trip_id
    };
    setActivePageAndMenu("serviceFulfillmentRecords");
    setWorkspacePages(current => addWorkspacePage(current, "serviceFulfillmentRecords"));
    setSelected(nextSelection);
    setDetailCollapsedForPage("serviceFulfillmentRecords", false);
    setPageSelections(current => ({
      ...current,
      serviceFulfillmentRecords: nextSelection
    }));
    setPageUiState(current => ({
      ...current,
      serviceFulfillmentRecords: createNextPageUiState(current.serviceFulfillmentRecords, {
        filters: nextFilters,
        appliedFilters: nextFilters,
        pagination: {
          current: 1
        }
      })
    }));
  }
  function createTripRecord({
    serviceOrder,
    robotaxiId
  }) {
    return tripTypes.createTrip({
      trip_id: nextTripId(),
      service_order_id: serviceOrder.service_order_id,
      robotaxi_id: robotaxiId,
      pickup_cell_id: serviceOrder.pickup_cell_id,
      pickup_service_area_id: serviceOrder.pickup_service_area_id,
      dropoff_cell_id: serviceOrder.dropoff_cell_id,
      dropoff_service_area_id: serviceOrder.dropoff_service_area_id,
      current_cell_id: data.robotaxis.find(robotaxi => robotaxi.robotaxi_id === robotaxiId)?.current_cell_id || serviceOrder.pickup_cell_id,
      current_step_index: 0,
      total_step_count: 0,
      total_distance_km: 0,
      distance_traveled_km: 0,
      distance_remaining_km: serviceOrder.estimated_distance_km || 0,
      time_elapsed: "0",
      trip_status: tripTypes.TripStatus.WAITING_ROUTE,
      trip_phase: tripTypes.TripPhase.PICKUP,
      arrival_execution_result: null,
      exception_type: null,
      route_id: null,
      route_planning_run_id: null,
      route_history: [],
      event_log: [],
      created_at: now(),
      started_at: null,
      completed_at: null,
      failure_reason: null
    });
  }
  function advanceTrip(tripId) {
    const trip = trips.find(item => item.trip_id === tripId);
    if (!trip) return;
    if ([tripTypes.TripStatus.ON_THE_WAY_PICKUP, tripTypes.TripStatus.ON_THE_WAY_DESTINATION].includes(trip.trip_status)) {
      const movedTrip = tripService.getNextTripMovementState(trip, data);
      if (!movedTrip) return;
      setTrips(items => items.map(item => item.trip_id === tripId ? movedTrip : item));
      setOperationalData(current => ({
        ...current,
        robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === trip.robotaxi_id ? updateRobotaxiForTrip(robotaxi, movedTrip) : robotaxi)
      }));
      setServiceOrders(items => items.map(order => order.service_order_id === trip.service_order_id ? updateServiceOrderForTrip(order, movedTrip) : order));
      selectForPage("serviceFulfillmentRecords", "trip", tripId);
      return;
    }
    let nextTrip = tripService.getNextTripState(trip);
    if (!nextTrip) return;
    const routeUpdate = createTripRouteUpdate(trip, nextTrip, data);
    if (routeUpdate?.failedTrip) {
      setRoutePlanningRuns(items => [routeUpdate.routePlanningRun, ...items]);
      setTrips(items => items.map(item => item.trip_id === tripId ? routeUpdate.failedTrip : item));
      selectForPage("serviceFulfillmentRecords", "trip", tripId);
      return;
    }
    if (routeUpdate?.route) {
      nextTrip = routeUpdate.nextTrip;
      setRoutePlanningRuns(items => [routeUpdate.routePlanningRun, ...items]);
    }
    setTrips(items => items.map(item => item.trip_id === tripId ? nextTrip : item));
    setOperationalData(current => ({
      ...current,
      routes: routeUpdate?.route ? [routeUpdate.route, ...current.routes] : current.routes,
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === trip.robotaxi_id ? updateRobotaxiForTrip(robotaxi, nextTrip) : robotaxi)
    }));
    setServiceOrders(items => items.map(order => order.service_order_id === trip.service_order_id ? updateServiceOrderForTrip(order, nextTrip) : order));
    selectForPage("serviceFulfillmentRecords", "trip", tripId);
  }
  function replanTripDestination(tripId) {
    const trip = trips.find(item => item.trip_id === tripId);
    if (!trip || trip.trip_status !== tripTypes.TripStatus.ON_THE_WAY_DESTINATION) return;
    const target = getAlternativeServiceOrderDestination(data, trip);
    const result = replanTripRoute(trip, {
      targetCellId: target?.target_cell_id || null,
      targetServiceAreaId: target?.target_service_area_id || null,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION_CHANGE,
      routeChangeReason: taskTypes.RouteChangeReason.DESTINATION_CHANGE_REPLAN,
      exceptionType: "DESTINATION_CHANGE_REPLAN",
      failureReason: target ? null : taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL
    });
    applyTripReplanResult(trip, result);
  }
  function replanTripRouteException(tripId) {
    const trip = trips.find(item => item.trip_id === tripId);
    if (!trip || ![tripTypes.TripStatus.ON_THE_WAY_PICKUP, tripTypes.TripStatus.ON_THE_WAY_DESTINATION].includes(trip.trip_status)) return;
    const isPickupPhase = trip.trip_status === tripTypes.TripStatus.ON_THE_WAY_PICKUP;
    const result = replanTripRoute(trip, {
      targetCellId: isPickupPhase ? trip.pickup_cell_id : trip.dropoff_cell_id,
      targetServiceAreaId: isPickupPhase ? trip.pickup_service_area_id : trip.dropoff_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ROUTE_EXCEPTION_REPLAN,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ROUTE_EXCEPTION_REPLAN,
      exceptionType: "SERVICE_ROUTE_EXCEPTION_REPLAN",
      failureReason: null
    });
    applyTripReplanResult(trip, result);
  }
  function applyTripReplanResult(trip, result) {
    setRoutePlanningRuns(items => [result.routePlanningRun, ...items]);
    if (result.route) {
      setOperationalData(current => ({
        ...current,
        routes: [result.route, ...current.routes],
        robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === trip.robotaxi_id ? {
          ...robotaxi,
          current_route_id: result.route.route_id,
          motion_status: "MOVING",
          current_order_id: trip.service_order_id,
          available_for_dispatch: false
        } : robotaxi)
      }));
      setTrips(items => items.map(item => item.trip_id === trip.trip_id ? result.nextTrip : item));
      setServiceOrders(items => items.map(order => order.service_order_id === trip.service_order_id ? updateServiceOrderForTrip(order, result.nextTrip) : order));
    } else {
      setTrips(items => items.map(item => item.trip_id === trip.trip_id ? result.waitingTrip : item));
      setServiceOrders(items => items.map(order => order.service_order_id === trip.service_order_id ? updateServiceOrderForTrip(order, result.waitingTrip) : order));
      setOperationalData(current => ({
        ...current,
        robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === trip.robotaxi_id ? updateRobotaxiForTrip(robotaxi, result.waitingTrip) : robotaxi)
      }));
    }
    selectForPage("serviceFulfillmentRecords", "trip", trip.trip_id);
  }
  function planRouteExecutionRoute(routeExecutionId) {
    const execution = routeExecutions.find(item => item.route_execution_id === routeExecutionId);
    const task = deploymentTasks.find(item => item.task_id === execution?.task_id);
    if (!execution || !task) return;
    if (execution.execution_status === taskTypes.RouteExecutionStatus.ARRIVAL_ABNORMAL) {
      planAbnormalArrivalRoute(execution, task);
      return;
    }
    if (execution.execution_status !== taskTypes.RouteExecutionStatus.WAITING_ROUTE) return;
    const routePlanningRunId = nextRoutePlanningRunId();
    const route = createDeploymentRoute(task, data, {
      originCellId: execution.current_cell_id || task.origin_cell_id,
      targetCellId: execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id,
      targetServiceAreaId: execution.planned_target_service_area_id || task.planned_target_service_area_id || task.target_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
      routeExecutionId: execution.route_execution_id,
      routePlanningRunId
    });
    if (route.route_steps.length === 0) {
      setRoutePlanningRuns(items => [createRoutePlanningRun({
        routePlanningRunId,
        routeStrategyId: route.route_strategy_id,
        planningAlgorithm: route.planning_algorithm,
        taskId: task.task_id,
        routeExecutionId: execution.route_execution_id,
        robotaxiId: task.robotaxi_id,
        originCellId: execution.current_cell_id || task.origin_cell_id,
        targetCellId: execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id,
        resultRouteId: null,
        planningResult: taskTypes.RoutePlanningResult.FAILED,
        failureReason: route.failure_reason
      }), ...items]);
      setRouteExecutions(items => items.map(item => item.route_execution_id === execution.route_execution_id ? {
        ...item,
        execution_status: taskTypes.RouteExecutionStatus.FAILED,
        failure_reason: route.failure_reason
      } : item));
      setDeploymentTasks(tasks => tasks.map(item => item.task_id === task.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.FAILED,
        failure_reason: route.failure_reason
      } : item));
      addLog({
        event_type: taskTypes.TaskEventType.DEPLOYMENT_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        route_strategy_id: route.route_strategy_id,
        message: `${task.task_id} 路径规划失败：${getDisplayValue(route.failure_reason)}`
      });
      return;
    }
    const routeCells = getRouteExecutionCells(route, data.roadSegments, execution.current_cell_id || task.origin_cell_id, execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id);
    setOperationalData(current => ({
      ...current,
      routes: [route, ...current.routes],
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        current_task_id: task.task_id,
        current_route_id: route.route_id,
        motion_status: "MOVING"
      } : robotaxi)
    }));
    setRouteExecutions(items => items.map(item => item.route_execution_id === execution.route_execution_id ? routePlanningService.applyTravelMetrics({
      record: {
        ...item,
        route_id: route.route_id,
        route_strategy_id: route.route_strategy_id,
        execution_status: taskTypes.RouteExecutionStatus.MOVING,
        origin_cell_id: execution.current_cell_id || task.origin_cell_id,
        target_cell_id: execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id,
        target_service_area_id: execution.planned_target_service_area_id || task.planned_target_service_area_id || task.target_service_area_id,
        actual_target_service_area_id: null,
        actual_target_cell_id: null,
        current_step_index: 0,
        total_step_count: Math.max(0, routeCells.length - 1),
        route_cell_ids: routeCells,
        current_target_service_area_id: execution.planned_target_service_area_id || task.planned_target_service_area_id || task.target_service_area_id,
        route_history: [createRouteHistoryEntry(route, taskTypes.RouteChangeReason.INITIAL_PLANNING, null)],
        time_elapsed: "0",
        battery_consumed_percent: 0,
        started_at: now(),
        completed_at: null,
        failure_reason: null
      },
      routes: [route, ...data.routes],
      currentRouteId: route.route_id,
      currentStepIndex: 0
    }) : item));
    setRoutePlanningRuns(items => [createRoutePlanningRun({
      routePlanningRunId,
      routeStrategyId: route.route_strategy_id,
      planningAlgorithm: route.planning_algorithm,
      taskId: task.task_id,
      routeExecutionId: execution.route_execution_id,
      robotaxiId: task.robotaxi_id,
      originCellId: execution.current_cell_id || task.origin_cell_id,
      targetCellId: execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id,
      resultRouteId: route.route_id,
      planningResult: taskTypes.RoutePlanningResult.SUCCESS,
      failureReason: taskTypes.RoutePlanningFailureReason.NONE,
      routeStepCount: route.route_step_count,
      totalDistanceKm: route.total_distance_km
    }), ...items]);
    setDeploymentTasks(tasks => tasks.map(item => item.task_id === execution.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.MOVING,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      started_at: now()
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      message: `${task.task_id} 的行驶记录 ${execution.route_execution_id} 已生成模拟路径 ${route.route_id}，进入行驶中`
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.MOVING);
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }
  function planAbnormalArrivalRoute(execution, task) {
    if (!execution || task.blocked_handling_policy !== taskTypes.BlockedHandlingPolicy.SAME_SERVICE_AREA_RETRY) return;
    const currentCellId = execution.current_cell_id;
    const excludedCellIds = [currentCellId, task.planned_target_cell_id, task.target_cell_id, task.actual_target_cell_id, execution.actual_target_cell_id, ...(execution.route_history || []).map(history => history.target_cell_id)];
    const target = getAlternativeDeploymentTarget(data, task.planned_target_service_area_id || task.target_service_area_id, excludedCellIds);
    if (!target) {
      setDeploymentTasks(tasks => tasks.map(item => item.task_id === task.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.ARRIVAL_ABNORMAL,
        failure_reason: taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL
      } : item));
      setRoutePlanningRuns(items => [createRoutePlanningRun({
        routeStrategyId: taskTypes.RoutePlanningStrategy.ABNORMAL_SAME_SERVICE_AREA,
        planningAlgorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
        taskId: task.task_id,
        routeExecutionId: execution.route_execution_id,
        robotaxiId: task.robotaxi_id,
        originCellId: currentCellId,
        targetCellId: null,
        resultRouteId: null,
        planningResult: taskTypes.RoutePlanningResult.FAILED,
        failureReason: taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL
      }), ...items]);
      addLog({
        event_type: taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        route_execution_id: execution.route_execution_id,
        message: `${task.task_id} 未找到同服务区替代目标，路径规划执行失败`
      });
      return;
    }
    const route = createDeploymentRoute(task, data, {
      routeExecutionId: execution.route_execution_id,
      originCellId: currentCellId,
      targetCellId: target.target_cell_id,
      targetServiceAreaId: target.target_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.ABNORMAL_SAME_SERVICE_AREA,
      routePlanningRunId: nextRoutePlanningRunId()
    });
    if (route.route_steps.length === 0) {
      setDeploymentTasks(tasks => tasks.map(item => item.task_id === task.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.ARRIVAL_ABNORMAL,
        failure_reason: route.failure_reason
      } : item));
      setRoutePlanningRuns(items => [createRoutePlanningRun({
        routePlanningRunId: route.route_planning_run_id,
        routeStrategyId: route.route_strategy_id,
        planningAlgorithm: route.planning_algorithm,
        taskId: task.task_id,
        routeExecutionId: execution.route_execution_id,
        robotaxiId: task.robotaxi_id,
        originCellId: currentCellId,
        targetCellId: target.target_cell_id,
        resultRouteId: null,
        planningResult: taskTypes.RoutePlanningResult.FAILED,
        failureReason: route.failure_reason
      }), ...items]);
      addLog({
        event_type: taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        route_execution_id: execution.route_execution_id,
        route_strategy_id: route.route_strategy_id,
        message: `${task.task_id} 异常到达后路径规划失败：${getDisplayValue(route.failure_reason)}`
      });
      return;
    }
    const routeCells = getRouteExecutionCells(route, data.roadSegments, currentCellId, target.target_cell_id);
    setOperationalData(current => ({
      ...current,
      routes: [route, ...current.routes],
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        current_route_id: route.route_id,
        current_task_id: task.task_id,
        motion_status: "MOVING"
      } : robotaxi)
    }));
    setRouteExecutions(items => items.map(item => item.route_execution_id === execution.route_execution_id ? routePlanningService.applyTravelMetrics({
      record: {
        ...item,
        route_id: route.route_id,
        route_strategy_id: route.route_strategy_id,
        execution_status: taskTypes.RouteExecutionStatus.MOVING,
        origin_cell_id: currentCellId,
        target_cell_id: target.target_cell_id,
        target_service_area_id: target.target_service_area_id,
        actual_target_service_area_id: null,
        actual_target_cell_id: null,
        current_step_index: 0,
        total_step_count: Math.max(0, routeCells.length - 1),
        route_cell_ids: routeCells,
        current_target_service_area_id: target.target_service_area_id,
        route_history: [...(item.route_history || []), createRouteHistoryEntry(route, taskTypes.RouteChangeReason.ABNORMAL_ARRIVAL_REPLAN, task.arrival_execution_result)],
        time_elapsed: "0",
        completed_at: null,
        failure_reason: null
      },
      routes: [route, ...data.routes],
      currentRouteId: route.route_id,
      currentStepIndex: 0
    }) : item));
    setRoutePlanningRuns(items => [createRoutePlanningRun({
      routePlanningRunId: route.route_planning_run_id,
      routeStrategyId: route.route_strategy_id,
      planningAlgorithm: route.planning_algorithm,
      taskId: task.task_id,
      routeExecutionId: execution.route_execution_id,
      robotaxiId: task.robotaxi_id,
      originCellId: currentCellId,
      targetCellId: target.target_cell_id,
      resultRouteId: route.route_id,
      planningResult: taskTypes.RoutePlanningResult.SUCCESS,
      failureReason: taskTypes.RoutePlanningFailureReason.NONE,
      routeStepCount: route.route_step_count,
      totalDistanceKm: route.total_distance_km
    }), ...items]);
    setDeploymentTasks(tasks => tasks.map(item => item.task_id === task.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.MOVING,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      target_cell_id: target.target_cell_id,
      target_service_area_id: target.target_service_area_id,
      actual_target_service_area_id: null,
      actual_target_cell_id: null
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      message: `${task.task_id} 异常到达后已生成替代路径 ${route.route_id}`
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.MOVING);
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }
  function startRouteExecution(routeExecutionId) {
    const execution = routeExecutions.find(item => item.route_execution_id === routeExecutionId);
    const task = deploymentTasks.find(item => item.task_id === execution?.task_id);
    const route = data.routes.find(item => item.route_id === execution?.route_id);
    if (!task || !route || !execution || execution.execution_status !== taskTypes.RouteExecutionStatus.WAITING_START) return;
    setRouteExecutions(items => items.map(item => item.route_execution_id === execution.route_execution_id ? {
      ...item,
      execution_status: taskTypes.RouteExecutionStatus.MOVING,
      started_at: now()
    } : item));
    setDeploymentTasks(tasks => tasks.map(item => item.task_id === execution.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.MOVING,
      started_at: now()
    } : item));
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        motion_status: "MOVING",
        current_route_id: route.route_id,
        current_task_id: task.task_id
      } : robotaxi)
    }));
    addLog({
      event_type: taskTypes.TaskEventType.DEPLOYMENT_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: `${task.robotaxi_id} 开始自动行驶`
    });
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }
  function advanceRouteExecution(routeExecutionId) {
    const execution = routeExecutions.find(item => item.route_execution_id === routeExecutionId);
    if (!execution || execution.execution_status !== taskTypes.RouteExecutionStatus.MOVING) return;
    const task = deploymentTasks.find(item => item.task_id === execution.task_id);
    const route = data.routes.find(item => item.route_id === execution.route_id);
    if (!task || !route) return;
    const nextStepIndex = Math.min(execution.current_step_index + 1, execution.total_step_count);
    const nextCellId = execution.route_cell_ids[nextStepIndex] || execution.target_cell_id;
    const completed = nextStepIndex >= execution.total_step_count;
    const nextExecutionMetrics = routePlanningService.applyTravelMetrics({
      record: {
        ...execution,
        current_cell_id: nextCellId,
        current_step_index: nextStepIndex
      },
      routes: data.routes,
      currentRouteId: execution.route_id,
      currentStepIndex: nextStepIndex
    });
    const distanceDeltaKm = Number(Math.max(0, Number(nextExecutionMetrics.distance_traveled_km || 0) - Number(execution.distance_traveled_km || 0)).toFixed(2));
    const robotaxi = data.robotaxis.find(item => item.robotaxi_id === execution.robotaxi_id);
    const batteryDeltaPercent = robotaxi?.max_range_km ? Number((distanceDeltaKm / robotaxi.max_range_km * 100).toFixed(2)) : 0;
    const batteryConsumedPercent = Number((Number(execution.battery_consumed_percent || 0) + batteryDeltaPercent).toFixed(2));
    setRouteExecutions(items => items.map(item => item.route_execution_id === routeExecutionId ? {
      ...item,
      execution_status: completed ? taskTypes.RouteExecutionStatus.ARRIVED : taskTypes.RouteExecutionStatus.MOVING,
      current_cell_id: nextCellId,
      current_step_index: nextStepIndex,
      total_distance_km: nextExecutionMetrics.total_distance_km,
      distance_traveled_km: nextExecutionMetrics.distance_traveled_km,
      distance_remaining_km: nextExecutionMetrics.distance_remaining_km,
      time_elapsed: `${nextStepIndex}`,
      battery_consumed_percent: batteryConsumedPercent
    } : item));
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(item => item.robotaxi_id === execution.robotaxi_id ? {
        ...item,
        current_cell_id: nextCellId,
        current_route_id: execution.route_id,
        current_task_id: execution.task_id,
        motion_status: completed ? "STOPPED" : "MOVING",
        battery_percent: Number(Math.max(0, item.battery_percent - batteryDeltaPercent).toFixed(2)),
        estimated_range_km: Number(Math.max(0, item.estimated_range_km - distanceDeltaKm).toFixed(2))
      } : item)
    }));
    if (completed) {
      setDeploymentTasks(tasks => tasks.map(item => item.task_id === execution.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.ARRIVED
      } : item));
      addLog({
        event_type: taskTypes.TaskEventType.ROUTE_EXECUTION_ARRIVED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: execution.task_id,
        robotaxi_id: execution.robotaxi_id,
        route_execution_id: execution.route_execution_id,
        message: `${execution.robotaxi_id} 已到达当前路径目标，等待到达结果`
      });
      focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.ARRIVED);
      return;
    }
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_STEP_ADVANCED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: execution.task_id,
      robotaxi_id: execution.robotaxi_id,
      message: `${execution.robotaxi_id} 继续行驶至 ${nextCellId}`
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.MOVING);
  }
  function submitNormalArrival(routeExecutionId) {
    const execution = routeExecutions.find(item => item.route_execution_id === routeExecutionId);
    const task = deploymentTasks.find(item => item.task_id === execution?.task_id);
    if (!execution || !task || execution.execution_status !== taskTypes.RouteExecutionStatus.ARRIVED) return;
    setRouteExecutions(items => items.map(item => item.route_execution_id === routeExecutionId ? {
      ...item,
      execution_status: taskTypes.RouteExecutionStatus.COMPLETED,
      completed_at: now(),
      arrival_execution_result: taskTypes.ArrivalExecutionResult.NORMAL_ARRIVAL,
      actual_target_service_area_id: item.target_service_area_id || item.current_target_service_area_id,
      actual_target_cell_id: execution.current_cell_id
    } : item));
    setDeploymentTasks(tasks => tasks.map(item => item.task_id === task.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.COMPLETED,
      actual_target_service_area_id: item.target_service_area_id,
      actual_target_cell_id: execution.current_cell_id,
      arrival_execution_result: taskTypes.ArrivalExecutionResult.NORMAL_ARRIVAL,
      completed_at: now()
    } : item));
    setOperationalData(current => ({
      ...current,
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === execution.robotaxi_id ? {
        ...robotaxi,
        current_cell_id: execution.current_cell_id,
        current_route_id: null,
        current_task_id: null,
        motion_status: "PARKED"
      } : robotaxi)
    }));
    addLog({
      event_type: taskTypes.TaskEventType.ARRIVAL_NORMAL,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: execution.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: `${execution.robotaxi_id} 正常到达，运营投放完成`
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.COMPLETED);
  }
  function submitAbnormalArrival(routeExecutionId, arrivalResult) {
    const execution = routeExecutions.find(item => item.route_execution_id === routeExecutionId);
    const task = deploymentTasks.find(item => item.task_id === execution?.task_id);
    if (!execution || !task || execution.execution_status !== taskTypes.RouteExecutionStatus.ARRIVED) return;
    setRouteExecutions(items => items.map(item => item.route_execution_id === routeExecutionId ? {
      ...item,
      execution_status: taskTypes.RouteExecutionStatus.ARRIVAL_ABNORMAL,
      arrival_execution_result: arrivalResult,
      actual_target_service_area_id: item.target_service_area_id || item.current_target_service_area_id,
      actual_target_cell_id: item.current_cell_id,
      failure_reason: arrivalResult
    } : item));
    setDeploymentTasks(tasks => tasks.map(item => item.task_id === task.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.ARRIVAL_ABNORMAL,
      arrival_execution_result: arrivalResult,
      actual_target_service_area_id: item.target_service_area_id || item.planned_target_service_area_id,
      actual_target_cell_id: execution.current_cell_id,
      failure_reason: arrivalResult
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.ARRIVAL_ABNORMAL,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: execution.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: `${execution.robotaxi_id} 异常到达：${getDisplayValue(arrivalResult)}`
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.ARRIVAL_ABNORMAL);
  }
  function addLog(log) {
    setTaskEventLogs(logs => [createEventLog(log), ...logs]);
  }
  function createTask(robotaxi, triggerType) {
    const opsCenter = data.opsCenters[0];
    return taskTypes.createReadinessCheckTask({
      task_id: nextTaskId(),
      task_type: taskTypes.TaskType.READINESS_CHECK,
      task_status: taskTypes.ReadinessTaskStatus.WAITING_ASSIGNMENT,
      task_priority: taskTypes.TaskPriority.NORMAL,
      trigger_type: triggerType,
      source_type: taskTypes.TaskSourceType.OPS_CENTER,
      source_id: opsCenter.ops_center_id,
      robotaxi_id: robotaxi.robotaxi_id,
      worker_id: null,
      ops_center_id: opsCenter.ops_center_id,
      check_result: null,
      issue_type: null,
      created_at: now(),
      assigned_at: null,
      started_at: null,
      completed_at: null
    });
  }
  function createDeploymentTask(robotaxi, target) {
    return taskTypes.createDeploymentTask({
      task_id: nextDeploymentTaskId(),
      task_type: taskTypes.TaskType.DEPLOYMENT,
      task_status: taskTypes.DeploymentTaskStatus.WAITING_START,
      task_priority: taskTypes.TaskPriority.LOW,
      trigger_type: taskTypes.TriggerType.MANUAL,
      source_type: taskTypes.TaskSourceType.MANUAL_OPERATION,
      source_id: null,
      robotaxi_id: robotaxi.robotaxi_id,
      origin_cell_id: robotaxi.current_cell_id,
      planned_target_zone_id: target.target_zone_id,
      planned_target_service_area_id: target.target_service_area_id,
      planned_target_cell_id: target.target_cell_id,
      actual_target_service_area_id: null,
      actual_target_cell_id: null,
      arrival_behavior: taskTypes.ArrivalBehavior.AUTO_BY_SERVICE_AREA,
      blocked_handling_policy: taskTypes.BlockedHandlingPolicy.SAME_SERVICE_AREA_RETRY,
      arrival_execution_result: null,
      target_cell_id: target.target_cell_id,
      target_zone_id: target.target_zone_id,
      target_service_area_id: target.target_service_area_id,
      route_id: null,
      route_strategy_id: null,
      interruptible: true,
      created_at: now(),
      started_at: null,
      completed_at: null,
      failure_reason: null
    });
  }
  function createDeploymentRouteExecution(task) {
    return taskTypes.createRouteExecution({
      route_execution_id: nextRouteExecutionId(),
      task_id: task.task_id,
      task_type: task.task_type,
      robotaxi_id: task.robotaxi_id,
      route_id: null,
      route_strategy_id: null,
      execution_status: taskTypes.RouteExecutionStatus.WAITING_ROUTE,
      origin_cell_id: task.origin_cell_id,
      planned_target_zone_id: task.planned_target_zone_id || task.target_zone_id,
      planned_target_service_area_id: task.planned_target_service_area_id || task.target_service_area_id,
      planned_target_cell_id: task.planned_target_cell_id || task.target_cell_id,
      target_cell_id: task.planned_target_cell_id || task.target_cell_id,
      target_service_area_id: task.planned_target_service_area_id || task.target_service_area_id,
      actual_target_service_area_id: null,
      actual_target_cell_id: null,
      current_cell_id: task.origin_cell_id,
      current_step_index: 0,
      total_step_count: 0,
      total_distance_km: 0,
      route_cell_ids: [],
      same_service_area_retry_allowed: true,
      current_target_service_area_id: task.planned_target_service_area_id || task.target_service_area_id,
      route_history: [],
      distance_traveled_km: 0,
      distance_remaining_km: 0,
      time_elapsed: "0",
      battery_consumed_percent: 0,
      started_at: null,
      completed_at: null,
      failure_reason: null
    });
  }
  function createEventLog(event) {
    return taskTypes.createTaskEventLog({
      event_id: nextEventId(),
      service_order_id: event.service_order_id || null,
      trip_id: event.trip_id || null,
      pricing_decision_id: event.pricing_decision_id || null,
      pricing_strategy_run_id: event.pricing_strategy_run_id || null,
      task_id: event.task_id || null,
      robotaxi_id: event.robotaxi_id || null,
      worker_id: event.worker_id || null,
      route_execution_id: event.route_execution_id || null,
      route_id: event.route_id || null,
      route_strategy_id: event.route_strategy_id || null,
      trigger_type: event.trigger_type || null,
      event_type: event.event_type,
      event_result: event.event_result,
      message: event.message,
      created_at: now()
    });
  }
  function addServiceOrderEvent(event) {
    setTaskEventLogs(logs => [createEventLog(event), ...logs]);
  }
}
function WorkspaceBar({
  pages,
  activePage,
  onActivate,
  onClose
}) {
  const normalizedPages = normalizeWorkspacePages(pages, activePage);
  return /*#__PURE__*/React.createElement("div", {
    className: "workspace-bar",
    "aria-label": "\u5DF2\u6253\u5F00\u4E1A\u52A1\u9875\u9762"
  }, /*#__PURE__*/React.createElement("div", {
    className: "workspace-scroll"
  }, normalizedPages.map(page => {
    const isActive = page === activePage;
    const isPinned = page === "console";
    return /*#__PURE__*/React.createElement("button", {
      key: page,
      type: "button",
      className: isActive ? "workspace-tab active" : "workspace-tab",
      onClick: () => onActivate(page),
      title: getPageLabel(page)
    }, /*#__PURE__*/React.createElement("span", null, getPageLabel(page)), !isPinned && /*#__PURE__*/React.createElement("span", {
      role: "button",
      tabIndex: 0,
      className: "workspace-tab-close",
      title: "\u5173\u95ED\u9875\u9762",
      onClick: event => {
        event.stopPropagation();
        onClose(page);
      },
      onKeyDown: event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onClose(page);
        }
      }
    }, "\xD7"));
  })));
}
function RecordTable({
  page,
  rows,
  selected,
  uiState,
  onUiStateChange,
  onSelect,
  actions
}) {
  const isReadinessPage = page === "readinessTasks";
  const isDeploymentPage = page === "deploymentTasks";
  const isRouteExecutionPage = page === "routeExecutions";
  const isRoutePlanningPage = page === "routePlanningStrategies";
  const isRoutePlanningRunPage = page === "routePlanningRuns";
  const isDemandSimulationStrategyPage = page === "demandSimulationStrategies";
  const isServiceOrderPage = page === "serviceOrders";
  const isTripPage = page === "serviceFulfillmentRecords";
  const isPricingPage = page === "pricingStrategies";
  const isPricingRunPage = page === "pricingStrategyRuns";
  const isOrderMatchingPage = page === "orderMatchingStrategies";
  const isOrderMatchingRunPage = page === "orderMatchingRuns";
  const isSimulationPolicyPage = page === "simulationPolicies";
  const isWorkflowTimingRulePage = page === "workflowTimingRules";
  const isCostParameterRulePage = page === "costParameterRules";
  const isSimulationRunPage = page === "simulationRuns";
  const isSimulationEventPage = page === "simulationEvents";
  const isTaskOperationPage = isReadinessPage || isDeploymentPage || isRouteExecutionPage;
  const hasEventPanel = isTaskOperationPage || isServiceOrderPage || isTripPage || isRoutePlanningPage || isDemandSimulationStrategyPage || isPricingPage || isOrderMatchingPage || isSimulationRunPage || isSimulationEventPage;
  const config = tableConfig[page];
  const objectType = pageObjectType[page];
  const idField = idFieldByType[objectType];
  const statusField = statusFieldByPage[page];
  const [eventPanelHeight, setEventPanelHeight] = useState(112);
  const tableSectionRef = useRef(null);
  const [tableBodyHeight, setTableBodyHeight] = useState(220);
  const [abnormalTask, setAbnormalTask] = useState(null);
  const [abnormalIssueType, setAbnormalIssueType] = useState(taskTypes?.IssueType?.LOW_BATTERY || "LOW_BATTERY");
  const [abnormalArrivalExecution, setAbnormalArrivalExecution] = useState(null);
  const [abnormalArrivalType, setAbnormalArrivalType] = useState(taskTypes?.ArrivalExecutionResult?.ARRIVED_WITH_TARGET_OCCUPIED || "ARRIVED_WITH_TARGET_OCCUPIED");
  const filters = uiState.filters;
  const appliedFilters = uiState.appliedFilters;
  const pageSize = 14;
  const displayRows = useMemo(() => {
    return filterRecordRows(rows, config.columns, statusField, appliedFilters);
  }, [appliedFilters, config.columns, rows, statusField]);
  const maxPage = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const currentPage = Math.min(uiState.pagination?.current || 1, maxPage);
  const orderedStatusValues = getOrderedStatusValues(page);
  const statusContext = page === "deploymentTasks" ? "deployment" : page === "routeExecutions" ? "routeExecution" : null;
  const statusOptions = useMemo(() => createStatusOptions(rows, statusField, orderedStatusValues, statusContext), [orderedStatusValues, rows, statusContext, statusField]);
  const columns = config.columns.map(key => ({
    key,
    title: getFieldLabel(key),
    dataIndex: key,
    ellipsis: true,
    width: getColumnWidth(key),
    render: (_, row) => renderCellValue(key, row)
  }));
  const actionColumn = getActionColumn();
  const finalColumns = actionColumn ? [...columns, actionColumn] : columns;
  const eventRows = isSimulationRunPage || isSimulationEventPage ? actions.simulationEvents : isTripPage ? createTripEventRows(rows) : isServiceOrderPage ? createServiceOrderEventRows(actions.taskEventLogs, displayRows) : isDemandSimulationStrategyPage ? actions.demandSimulationRuns : isRoutePlanningPage ? actions.routePlanningRuns : isPricingPage ? actions.pricingStrategyRuns : isOrderMatchingPage ? actions.orderMatchingRuns : actions.taskEventLogs;
  const visibleEventRows = eventRows.slice(0, 300);
  const eventColumns = isSimulationRunPage || isSimulationEventPage ? tableConfig.simulationEvents.columns : isTripPage ? ["event_id", "event_time", "event_type", "event_result", "message", "trip_id", "service_order_id", "robotaxi_id", "route_id", "cell_id", "previous_status", "next_status"] : isServiceOrderPage ? ["event_id", "created_at", "event_type", "event_result", "message", "service_order_id", "trip_id", "pricing_decision_id", "pricing_strategy_run_id", "robotaxi_id"] : isDemandSimulationStrategyPage ? tableConfig.demandSimulationRuns.columns : isRoutePlanningPage ? tableConfig.routePlanningRuns.columns : isPricingPage ? tableConfig.pricingStrategyRuns.columns : isOrderMatchingPage ? tableConfig.orderMatchingRuns.columns : tableConfig.taskEventLogs.columns;
  const eventRowKey = isSimulationRunPage || isSimulationEventPage ? "simulation_event_id" : isTripPage ? "event_id" : isDemandSimulationStrategyPage ? "demand_simulation_run_id" : isRoutePlanningPage ? "route_planning_run_id" : isPricingPage ? "pricing_strategy_run_id" : isOrderMatchingPage ? "order_matching_run_id" : "event_id";
  useEffect(() => {
    const node = tableSectionRef.current;
    if (!node) return undefined;
    const updateTableBodyHeight = () => {
      const paginationHeight = node.querySelector(".ant-pagination")?.getBoundingClientRect().height || 32;
      const nextHeight = Math.max(96, Math.floor(node.clientHeight - paginationHeight - 48));
      setTableBodyHeight(currentHeight => currentHeight === nextHeight ? currentHeight : nextHeight);
    };
    updateTableBodyHeight();
    const observer = new ResizeObserver(updateTableBodyHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [eventPanelHeight, hasEventPanel, page, rows.length]);
  const tableScrollY = tableBodyHeight;
  const eventTableScrollY = Math.max(80, eventPanelHeight - 44);
  return /*#__PURE__*/React.createElement("section", {
    className: isReadinessPage ? "record-page-new readiness-page" : "record-page-new"
  }, statusOptions.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "status-segment-bar"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: !appliedFilters.statusValue ? "primary" : "default",
    onClick: () => applyStatusFilter(null)
  }, "\u5168\u90E8 ", rows.length), statusOptions.map(option => /*#__PURE__*/React.createElement(Button, {
    key: option.value,
    size: "small",
    type: appliedFilters.statusValue === option.value ? "primary" : "default",
    onClick: () => applyStatusFilter(option.value)
  }, option.label, " ", option.count))), /*#__PURE__*/React.createElement("div", {
    className: "list-filter-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "filter-field keyword-field"
  }, /*#__PURE__*/React.createElement("span", null, "\u5173\u952E\u8BCD"), /*#__PURE__*/React.createElement(Input, {
    size: "small",
    placeholder: isReadinessPage ? "任务编号 / Robotaxi / 作业人员" : "输入关键词",
    value: filters.keyword,
    onChange: event => updateFilters({
      ...filters,
      keyword: event.target.value
    })
  })), statusField && /*#__PURE__*/React.createElement("div", {
    className: "filter-field"
  }, /*#__PURE__*/React.createElement("span", null, "\u72B6\u6001"), /*#__PURE__*/React.createElement(Select, {
    size: "small",
    placeholder: "\u5168\u90E8\u72B6\u6001",
    allowClear: true,
    getPopupContainer: () => document.body,
    listHeight: 280,
    value: filters.statusValue,
    onChange: value => updateFilters({
      ...filters,
      statusValue: value || null
    }),
    options: statusOptions.map(option => ({
      value: option.value,
      label: option.label
    }))
  })), isReadinessPage && /*#__PURE__*/React.createElement("div", {
    className: "filter-field"
  }, /*#__PURE__*/React.createElement("span", null, "\u89E6\u53D1\u65B9\u5F0F"), /*#__PURE__*/React.createElement(Select, {
    size: "small",
    placeholder: "\u5168\u90E8\u65B9\u5F0F",
    allowClear: true,
    getPopupContainer: () => document.body,
    listHeight: 240,
    value: filters.triggerType,
    onChange: value => updateFilters({
      ...filters,
      triggerType: value || null
    }),
    options: triggerTypeOptions.map(value => ({
      value,
      label: getDisplayValue(value)
    }))
  })), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: "primary",
    "aria-label": "\u67E5\u8BE2",
    onClick: () => applyFilters(filters)
  }, "\u67E5\u8BE2"), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    "aria-label": "\u91CD\u7F6E",
    onClick: resetFilters
  }, "\u91CD\u7F6E")), isReadinessPage && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "list-action-bar"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: "primary",
    onClick: actions.createManualTask
  }, "\u751F\u6210\u51C6\u5165\u4EFB\u52A1"), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    onClick: actions.runAutoReadinessCheck
  }, "\u542F\u52A8\u81EA\u52A8\u51C6\u5165\u68C0\u67E5"))), isDeploymentPage && /*#__PURE__*/React.createElement("div", {
    className: "list-action-bar"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: "primary",
    onClick: actions.createDeploymentTasks
  }, "\u751F\u6210\u6295\u653E\u4EFB\u52A1")), isServiceOrderPage && /*#__PURE__*/React.createElement("div", {
    className: "list-action-bar"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: "primary",
    onClick: () => actions.createServiceOrderFromDemand("OWN_APP_SIMULATED_ORDER")
  }, "\u521B\u5EFA\u81EA\u6709\u5E73\u53F0\u670D\u52A1\u8BA2\u5355"), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    onClick: () => actions.createServiceOrderFromDemand("PARTNER_APP_SIMULATED_ORDER")
  }, "\u521B\u5EFA\u5916\u90E8\u5E73\u53F0\u670D\u52A1\u8BA2\u5355")), isSimulationRunPage && /*#__PURE__*/React.createElement("div", {
    className: "list-action-bar"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: "primary",
    onClick: () => actions.simActions?.createSimulationRun()
  }, "\u521B\u5EFA\u6A21\u62DF\u8FD0\u884C"), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    onClick: actions.clearSimulationEvents
  }, "\u6E05\u7A7A\u6A21\u62DF\u4E8B\u4EF6")), /*#__PURE__*/React.createElement("div", {
    className: "record-table-section",
    ref: tableSectionRef
  }, /*#__PURE__*/React.createElement(Table, {
    size: "small",
    rowKey: idField,
    columns: finalColumns,
    dataSource: displayRows,
    pagination: {
      current: currentPage,
      pageSize,
      size: "small",
      showSizeChanger: false
    },
    scroll: {
      x: "max-content",
      y: tableScrollY
    },
    rowClassName: row => selected?.type === objectType && selected?.id === row[idField] ? "active-table-row" : "",
    onRow: row => ({
      onClick: () => onSelect(objectType, row[idField])
    }),
    onChange: pagination => updatePagination(pagination.current)
  })), hasEventPanel && /*#__PURE__*/React.createElement("div", {
    className: "event-log-section",
    style: {
      height: eventPanelHeight
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "event-log-resizer",
    onPointerDown: handleEventResizeStart,
    title: "\u62D6\u52A8\u8C03\u6574\u4E8B\u4EF6\u533A\u9AD8\u5EA6"
  }), /*#__PURE__*/React.createElement("div", {
    className: "event-log-title"
  }, isTripPage ? "履约行驶事件" : isServiceOrderPage ? "最近事件记录" : isSimulationRunPage ? "模拟运行事件" : isDemandSimulationStrategyPage ? "需求模拟执行" : isRoutePlanningPage ? "路径规划执行记录" : isPricingPage ? "定价执行记录" : isOrderMatchingPage ? "匹配执行记录" : "最近任务事件"), /*#__PURE__*/React.createElement(Table, {
    size: "small",
    rowKey: eventRowKey,
    columns: eventColumns.map(key => ({
      key,
      title: getFieldLabel(key),
      dataIndex: key,
      ellipsis: true,
      width: getColumnWidth(key),
      render: (_, row) => renderCellValue(key, row)
    })),
    dataSource: visibleEventRows,
    pagination: false,
    scroll: {
      x: "max-content",
      y: eventTableScrollY
    }
  })), /*#__PURE__*/React.createElement(ModuleFooter, {
    page: page,
    totalCount: rows.length,
    displayCount: displayRows.length,
    eventCount: hasEventPanel ? eventRows?.length || 0 : null,
    appliedFilters: appliedFilters
  }), isReadinessPage && /*#__PURE__*/React.createElement(Modal, {
    title: "\u63D0\u4EA4\u5F02\u5E38\u68C0\u67E5\u7ED3\u679C",
    open: Boolean(abnormalTask),
    okText: "\u786E\u8BA4\u5F02\u5E38",
    cancelText: "\u53D6\u6D88",
    width: 520,
    onOk: confirmAbnormalResult,
    onCancel: () => setAbnormalTask(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "abnormal-modal-body"
  }, /*#__PURE__*/React.createElement(Descriptions, {
    column: 1,
    size: "small",
    colon: false
  }, /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u4EFB\u52A1\u7F16\u53F7"
  }, abnormalTask?.task_id || "无"), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "Robotaxi \u7F16\u53F7"
  }, abnormalTask?.robotaxi_id || "无"), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u4F5C\u4E1A\u4EBA\u5458\u7F16\u53F7"
  }, abnormalTask?.worker_id || "无")), /*#__PURE__*/React.createElement("div", {
    className: "abnormal-field"
  }, /*#__PURE__*/React.createElement("span", null, "\u5F02\u5E38\u7C7B\u578B"), /*#__PURE__*/React.createElement(Select, {
    size: "small",
    value: abnormalIssueType,
    getPopupContainer: () => document.body,
    listHeight: 280,
    onChange: setAbnormalIssueType,
    options: Object.values(taskTypes.IssueType).filter(value => value !== taskTypes.IssueType.NONE).map(value => ({
      value,
      label: getDisplayValue(value)
    }))
  })))), isRouteExecutionPage && /*#__PURE__*/React.createElement(Modal, {
    title: "\u63D0\u4EA4\u5F02\u5E38\u5230\u8FBE",
    open: Boolean(abnormalArrivalExecution),
    okText: "\u786E\u8BA4\u5F02\u5E38\u5230\u8FBE",
    cancelText: "\u53D6\u6D88",
    width: 620,
    onOk: confirmAbnormalArrival,
    onCancel: () => setAbnormalArrivalExecution(null)
  }, renderAbnormalArrivalModalBody(abnormalArrivalExecution, actions.data, abnormalArrivalType, setAbnormalArrivalType)));
  function getActionColumn() {
    if (isReadinessPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 240,
        render: (_, row) => renderActionCell(row, renderReadinessActions(row, {
          ...actions,
          openAbnormalModal: openAbnormalModal,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isDeploymentPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderActionCell(row, renderDeploymentActions(row, {
          ...actions,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isRouteExecutionPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderActionCell(row, renderRouteExecutionActions(row, {
          ...actions,
          openAbnormalArrivalModal,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isRoutePlanningRunPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 180,
        render: (_, row) => renderActionCell(row, renderRoutePlanningRunActions(row, {
          ...actions,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isServiceOrderPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 150,
        render: (_, row) => renderActionCell(row, renderServiceOrderActions(row, {
          ...actions,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isTripPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 150,
        render: (_, row) => renderActionCell(row, renderTripActions(row, {
          ...actions,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isPricingRunPage || isOrderMatchingRunPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, renderViewDetailAction(row, {
          ...actions,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isSimulationRunPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 470,
        render: (_, row) => renderActionCell(row, renderSimulationRunActions(row, {
          ...actions,
          page,
          objectType,
          idField
        }))
      };
    }
    if (isWorkflowTimingRulePage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 96,
        render: (_, row) => renderActionCell(row, row.duration_source_type === "INHERITED" ? renderViewDetailAction(row, {
          ...actions,
          page,
          objectType,
          idField
        }) : /*#__PURE__*/React.createElement(RowActionButton, {
          onClick: () => actions.editWorkflowTimingRule(row)
        }, "\u914D\u7F6E\u65F6\u957F"))
      };
    }
    if (isCostParameterRulePage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 96,
        render: (_, row) => renderActionCell(row, /*#__PURE__*/React.createElement(RowActionButton, {
          onClick: () => actions.editCostParameterRule(row)
        }, "\u914D\u7F6E"))
      };
    }
    return null;
  }
  function renderActionCell(row, actionContent) {
    return /*#__PURE__*/React.createElement("span", {
      className: "row-action-cell",
      onClickCapture: () => onSelect(objectType, row[idField])
    }, actionContent);
  }
  function openAbnormalModal(task) {
    setAbnormalTask(task);
    setAbnormalIssueType(taskTypes.IssueType.LOW_BATTERY);
  }
  function confirmAbnormalResult() {
    if (!abnormalTask) return;
    actions.submitCheckResult(abnormalTask.task_id, taskTypes.CheckResult.FAILED, abnormalIssueType);
    setAbnormalTask(null);
  }
  function openAbnormalArrivalModal(execution) {
    setAbnormalArrivalExecution(execution);
    setAbnormalArrivalType(taskTypes.ArrivalExecutionResult.ARRIVED_WITH_TARGET_OCCUPIED);
  }
  function confirmAbnormalArrival() {
    if (!abnormalArrivalExecution) return;
    actions.submitAbnormalArrival(abnormalArrivalExecution.route_execution_id, abnormalArrivalType);
    setAbnormalArrivalExecution(null);
  }
  function applyStatusFilter(statusValue) {
    const nextFilters = {
      ...defaultPageFilters,
      statusValue
    };
    onUiStateChange(createNextPageUiState(uiState, {
      filters: nextFilters,
      appliedFilters: nextFilters,
      pagination: {
        current: 1
      }
    }));
  }
  function resetFilters() {
    const resetValue = {
      keyword: "",
      statusValue: null,
      triggerType: null
    };
    onUiStateChange(createNextPageUiState(uiState, {
      filters: resetValue,
      appliedFilters: resetValue,
      pagination: {
        current: 1
      }
    }));
  }
  function updateFilters(nextFilters) {
    onUiStateChange(createNextPageUiState(uiState, {
      filters: nextFilters
    }));
  }
  function applyFilters(nextFilters) {
    onUiStateChange(createNextPageUiState(uiState, {
      filters: nextFilters,
      appliedFilters: nextFilters,
      pagination: {
        current: 1
      }
    }));
  }
  function updatePagination(current) {
    onUiStateChange(createNextPageUiState(uiState, {
      pagination: {
        current: current || 1
      }
    }));
  }
  function handleEventResizeStart(event) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = eventPanelHeight;
    const handleMove = moveEvent => {
      const nextHeight = startHeight - (moveEvent.clientY - startY);
      setEventPanelHeight(Math.min(360, Math.max(88, nextHeight)));
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }
}
function ModuleFooter({
  page,
  totalCount,
  displayCount,
  eventCount,
  appliedFilters
}) {
  const hasFilter = appliedFilters && (appliedFilters.keyword || appliedFilters.statusValue || appliedFilters.triggerType);
  if (["readinessTasks", "deploymentTasks", "routeExecutions", "serviceFulfillmentRecords", "routePlanningStrategies", "routePlanningRuns", "demandSimulationStrategies", "serviceOrders"].includes(page)) {
    return /*#__PURE__*/React.createElement("div", {
      className: "module-footer"
    }, /*#__PURE__*/React.createElement("span", null, "\u5F53\u524D\u663E\u793A ", displayCount, " / \u5168\u90E8 ", totalCount), eventCount !== null && /*#__PURE__*/React.createElement("span", null, "\u4E8B\u4EF6 ", eventCount), /*#__PURE__*/React.createElement("span", null, hasFilter ? "已应用筛选条件" : "未应用筛选"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "module-footer"
  }, /*#__PURE__*/React.createElement("span", null, "\u5F53\u524D\u663E\u793A ", displayCount, " / \u5168\u90E8 ", totalCount), /*#__PURE__*/React.createElement("span", null, hasFilter ? "已应用筛选条件" : "未应用筛选"), /*#__PURE__*/React.createElement("span", null, "\u70B9\u51FB\u8868\u683C\u884C\u53EF\u5728\u53F3\u4FA7\u67E5\u770B\u8BE6\u60C5"));
}
function createTripEventRows(trips = []) {
  return trips.flatMap(trip => (Array.isArray(trip.event_log) ? trip.event_log : []).map((event, index) => ({
    event_id: `TRIP-EVT-${trip.trip_id}-${String(index + 1).padStart(3, "0")}`,
    event_time: event.event_time || trip.created_at,
    event_type: event.event_type || "TRIP_STATUS_CHANGED",
    event_result: event.event_result || "SUCCESS",
    trip_id: trip.trip_id,
    service_order_id: trip.service_order_id,
    robotaxi_id: trip.robotaxi_id,
    route_id: event.route_id || trip.route_id,
    cell_id: event.cell_id || trip.current_cell_id,
    message: event.message || createTripEventMessage(event, trip),
    previous_status: event.previous_status || null,
    next_status: event.next_status || null
  }))).sort((left, right) => String(right.event_time || "").localeCompare(String(left.event_time || "")));
}
function createServiceOrderEventRows(eventLogs = [], serviceOrders = []) {
  const visibleOrderIds = new Set(serviceOrders.map(order => order.service_order_id).filter(Boolean));
  return (eventLogs || []).filter(event => event.service_order_id && (visibleOrderIds.size === 0 || visibleOrderIds.has(event.service_order_id))).sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}
function createTripEventMessage(event, trip) {
  const typeText = getDisplayValue(event.event_type || "TRIP_STATUS_CHANGED");
  const resultText = getDisplayValue(event.event_result || "SUCCESS");
  const nextStatusText = event.next_status ? getDisplayValue(event.next_status) : null;
  const routeText = event.route_id ? `路径 ${event.route_id}` : trip.route_id ? `路径 ${trip.route_id}` : "未生成路径";
  return nextStatusText ? `${typeText}，结果${resultText}，状态更新为${nextStatusText}，${routeText}` : `${typeText}，结果${resultText}，${routeText}`;
}
function DetailPanel({
  selectedObject,
  selectedType,
  onCollapse
}) {
  if (!selectedObject) {
    return /*#__PURE__*/React.createElement("section", {
      className: "detail-panel-new"
    }, /*#__PURE__*/React.createElement("div", {
      className: "panel-title"
    }, /*#__PURE__*/React.createElement("span", null, getDetailTitle(selectedType)), /*#__PURE__*/React.createElement(Button, {
      size: "small",
      type: "text",
      "aria-label": "\u9690\u85CF\u8BE6\u60C5",
      onClick: onCollapse
    }, "\u203A")), /*#__PURE__*/React.createElement(Empty, {
      image: Empty.PRESENTED_IMAGE_SIMPLE,
      description: "\u8BF7\u9009\u62E9\u5BF9\u8C61\u67E5\u770B\u8BE6\u60C5"
    }));
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "detail-panel-new"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-title"
  }, /*#__PURE__*/React.createElement("span", null, getDetailTitle(selectedType)), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: "text",
    "aria-label": "\u9690\u85CF\u8BE6\u60C5",
    onClick: onCollapse
  }, "\u203A")), hasTabbedDetail(selectedType) ? /*#__PURE__*/React.createElement(TabbedDetail, {
    selectedObject: selectedObject,
    selectedType: selectedType
  }) : /*#__PURE__*/React.createElement(Descriptions, {
    className: "compact-descriptions",
    column: 1,
    size: "small",
    colon: false,
    items: Object.entries(selectedObject).map(([key, value]) => ({
      key,
      label: getFieldLabel(key),
      children: renderDetailValue(key, value, selectedObject)
    }))
  }));
}
function hasTabbedDetail(selectedType) {
  return ["robotaxi", "worker", "route", "readinessTask", "deploymentTask", "routeExecution", "serviceOrder", "trip", "simulationPolicy", "simulationRun", "simulationEvent", "costModelProfile", "costParameterRule", "costCalculationRun", "costRecord", "revenueRecord", "revenueCalculationRun"].includes(selectedType);
}
function TabbedDetail({
  selectedObject,
  selectedType
}) {
  const tabs = getDetailTabs(selectedType, selectedObject);
  return /*#__PURE__*/React.createElement(Tabs, {
    className: "detail-tabs",
    size: "small",
    items: tabs.map(tab => ({
      key: tab.key,
      label: tab.label,
      children: tab.cost ? /*#__PURE__*/React.createElement(CostDetail, {
        selectedObject: selectedObject
      }) : tab.timeline ? /*#__PURE__*/React.createElement(StatusTimeline, {
        history: selectedObject.simulation_status_transition_history,
        statusField: getDetailStatusField(selectedType)
      }) : /*#__PURE__*/React.createElement(Descriptions, {
        className: "compact-descriptions",
        column: 1,
        size: "small",
        colon: false,
        items: tab.keys.map(key => ({
          key,
          label: getFieldLabel(key),
          children: renderDetailValue(key, selectedObject[key], selectedObject)
        }))
      })
    }))
  });
}
function getDetailTabs(selectedType) {
  if (selectedType === "robotaxi") {
    return [{
      key: "basic",
      label: "基础信息",
      keys: ["robotaxi_id", "fleet_id", "model_name", "automation_level", "battery_percent", "estimated_range_km", "availability_status", "motion_status", "unavailable_reason"]
    }, {
      key: "task",
      label: "任务状态",
      keys: ["current_task_id", "current_task_type", "current_task_status", "current_order_id", "current_route_id"]
    }, {
      key: "location",
      label: "位置上下文",
      keys: ["current_cell_id", "location_summary", "location_context"]
    }, {
      key: "execution",
      label: "行驶记录",
      keys: ["current_route_execution_id", "current_execution_status", "current_route_step"]
    }];
  }
  if (selectedType === "worker") {
    return [{
      key: "basic",
      label: "基础信息",
      keys: ["worker_id", "ops_center_id", "worker_name", "worker_role", "worker_status"]
    }, {
      key: "task",
      label: "任务状态",
      keys: ["current_task_id", "current_task_type", "current_task_status"]
    }, {
      key: "capacity",
      label: "作业能力",
      keys: ["time_per_robotaxi", "max_robotaxi_per_day"]
    }];
  }
  if (selectedType === "route") {
    return [{
      key: "basic",
      label: "路径信息",
      keys: ["route_id", "route_version", "route_usage_type", "route_status", "failure_reason", "route_strategy_id", "route_planning_run_id"]
    }, {
      key: "relation",
      label: "业务关联",
      keys: ["task_id", "service_order_id", "trip_id", "route_execution_id", "robotaxi_id"]
    }, {
      key: "location",
      label: "起终点",
      keys: ["origin_cell_id", "target_cell_id", "start_cell_id", "end_cell_id"]
    }, {
      key: "steps",
      label: "路径步骤",
      keys: ["road_segment_sequence", "route_segments", "route_step_count", "route_steps"]
    }, {
      key: "metrics",
      label: "路径指标",
      keys: ["total_distance_m", "related_service_area_ids"]
    }];
  }
  if (selectedType === "readinessTask") {
    return [{
      key: "basic",
      label: "任务信息",
      keys: ["task_id", "task_type", "task_status", "task_priority", "trigger_type", "source_type", "robotaxi_id", "worker_id", "check_result", "issue_type"]
    }, {
      key: "time",
      label: "时间与来源",
      keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason"]
    }, {
      key: "cost",
      label: "成本",
      cost: true,
      keys: []
    }, {
      key: "timeline",
      label: "状态时间线",
      timeline: true,
      keys: []
    }];
  }
  if (selectedType === "deploymentTask") {
    return [{
      key: "basic",
      label: "任务信息",
      keys: ["task_id", "task_type", "task_status", "task_priority", "trigger_type", "source_type", "robotaxi_id"]
    }, {
      key: "route",
      label: "路径信息",
      keys: ["route_id", "route_strategy_id", "route_summary", "route_detail"]
    }, {
      key: "arrival",
      label: "到达处理",
      keys: ["arrival_behavior", "blocked_handling_policy", "arrival_execution_result", "actual_target_cell_id", "actual_target_service_area_id"]
    }, {
      key: "location",
      label: "目标位置",
      keys: ["origin_cell_id", "origin_location_summary", "origin_location_detail", "planned_target_cell_id", "planned_target_service_area_id", "target_cell_id", "target_location_summary", "target_location_detail", "target_service_area_id", "actual_target_cell_id", "actual_target_service_area_id", "target_zone_id"]
    }, {
      key: "time",
      label: "时间与来源",
      keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason"]
    }, {
      key: "cost",
      label: "成本",
      cost: true,
      keys: []
    }, {
      key: "timeline",
      label: "状态时间线",
      timeline: true,
      keys: []
    }];
  }
  if (selectedType === "routeExecution") {
    return [{
      key: "basic",
      label: "行驶信息",
      keys: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id", "arrival_execution_result"]
    }, {
      key: "location",
      label: "位置信息",
      keys: ["origin_cell_id", "origin_location_summary", "planned_target_cell_id", "planned_target_service_area_id", "target_cell_id", "target_location_summary", "actual_target_cell_id", "actual_target_service_area_id", "current_cell_id", "current_location_summary"]
    }, {
      key: "progress",
      label: "行驶进度",
      keys: ["current_step_index", "total_step_count", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "time_elapsed", "battery_consumed_percent"]
    }, {
      key: "route",
      label: "路径信息",
      keys: ["route_id", "route_strategy_id", "current_target_service_area_id", "route_summary", "route_history_detail"]
    }, {
      key: "time",
      label: "时间与来源",
      keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason"]
    }, {
      key: "cost",
      label: "成本",
      cost: true,
      keys: []
    }, {
      key: "timeline",
      label: "状态时间线",
      timeline: true,
      keys: []
    }];
  }
  if (selectedType === "serviceOrder") {
    return [{
      key: "basic",
      label: "订单信息",
      keys: ["service_order_id", "order_status", "order_channel", "customer_id", "demand_simulation_result_id", "demand_simulation_run_id", "payment_status"]
    }, {
      key: "location",
      label: "需求位置",
      keys: ["customer_origin_location_type", "customer_origin_place_id", "customer_origin_road_segment_id", "customer_origin_cell_id", "pickup_service_area_id", "pickup_cell_id", "dropoff_service_area_id", "dropoff_cell_id"]
    }, {
      key: "pricing",
      label: "报价结算",
      keys: ["price_estimation_route_id", "estimated_pricing_decision_id", "final_pricing_decision_id", "quote_base_fare", "quote_distance_unit_price", "quote_time_unit_price", "estimated_distance_km", "estimated_duration_min", "estimated_price", "final_price", "pricing_explanation", "pricing_breakdown_snapshot"]
    }, {
      key: "matching",
      label: "匹配履约",
      keys: ["matched_robotaxi_id", "matched_robotaxi_location_summary", "matched_robotaxi_location_detail", "order_matching_decision_id", "trip_id", "trip_total_distance_km", "trip_total_duration_min", "trip_distance_traveled_km", "trip_distance_remaining_km", "paid_amount"]
    }, {
      key: "time",
      label: "时间与来源",
      keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "confirmed_at", "matched_at", "simulation_matched_at", "completed_at", "simulation_completed_at", "cancelled_at", "payment_completed_at", "simulation_payment_completed_at", "failure_reason"]
    }, {
      key: "cost",
      label: "成本",
      cost: true,
      keys: []
    }, {
      key: "timeline",
      label: "状态时间线",
      timeline: true,
      keys: []
    }];
  }
  if (selectedType === "trip") {
    return [{
      key: "basic",
      label: "履约信息",
      keys: ["trip_id", "trip_status", "trip_phase", "service_order_id", "robotaxi_id"]
    }, {
      key: "location",
      label: "位置信息",
      keys: ["pickup_service_area_id", "pickup_cell_id", "pickup_location_summary", "dropoff_service_area_id", "dropoff_cell_id", "dropoff_location_summary", "current_cell_id", "current_location_summary"]
    }, {
      key: "progress",
      label: "行驶进度",
      keys: ["current_step_index", "total_step_count", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "time_elapsed", "arrival_execution_result", "exception_type"]
    }, {
      key: "route",
      label: "路径信息",
      keys: ["route_id", "route_planning_run_id", "route_summary", "route_history_detail"]
    }, {
      key: "time",
      label: "时间与来源",
      keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason", "event_log"]
    }, {
      key: "cost",
      label: "成本",
      cost: true,
      keys: []
    }, {
      key: "timeline",
      label: "状态时间线",
      timeline: true,
      keys: []
    }];
  }
  if (selectedType === "simulationPolicy") {
    return [{
      key: "basic",
      label: "策略信息",
      keys: ["simulation_policy_id", "policy_name", "policy_status", "tick_minutes", "tick_seconds", "simulation_days", "run_speed_level", "random_seed", "max_drain_ticks"]
    }, {
      key: "time",
      label: "时间配置",
      keys: ["worker_work_start_time", "worker_work_end_time", "robotaxi_operating_start_time", "robotaxi_operating_end_time", "time_period_configs", "time_window_configs"]
    }, {
      key: "demand",
      label: "需求配置",
      keys: ["demand_generation_config", "demand_generation_enabled", "demand_generation_mode", "max_orders_per_tick_global", "demand_profiles"]
    }, {
      key: "supply",
      label: "供给侧配置",
      keys: ["supply_trigger_config", "supply_trigger_enabled", "readiness_trigger_enabled", "deployment_trigger_enabled", "route_execution_trigger_enabled"]
    }, {
      key: "auto",
      label: "自动化配置",
      keys: ["service_order_auto_config", "auto_pricing_enabled", "auto_customer_confirm_enabled", "auto_order_matching_enabled", "auto_trip_creation_enabled", "auto_trip_progress_enabled", "auto_payment_enabled"]
    }, {
      key: "execution",
      label: "执行配置",
      keys: ["execution_time_config", "worker_readiness_check_ticks", "passenger_boarding_ticks", "dropoff_and_payment_ticks", "robotaxi_speed_kmh", "default_completion_config", "enable_exception_probability"]
    }];
  }
  if (selectedType === "simulationRun") {
    return [{
      key: "basic",
      label: "运行信息",
      keys: ["simulation_run_id", "simulation_name", "simulation_status", "simulation_policy_id", "simulation_timeline_id", "previous_simulation_run_id", "total_days", "tick_minutes", "tick_seconds", "total_ticks", "simulation_start_at", "planned_simulation_end_at", "simulation_end_at", "created_at"]
    }, {
      key: "progress",
      label: "运行进度",
      keys: ["current_day", "current_time", "current_clock_time", "current_day_tick", "current_run_tick", "current_global_tick", "trigger_ticks_completed", "drain_ticks", "max_drain_ticks", "current_time_period", "current_period_type"]
    }, {
      key: "scene",
      label: "当前场景",
      keys: ["current_supply_scene", "current_demand_scene", "current_scene_summary", "current_tick_event_summary"]
    }, {
      key: "time",
      label: "状态时间",
      keys: ["started_at", "paused_at", "resumed_at", "completed_at", "stopped_at", "failure_reason", "failure_summary", "result_summary"]
    }, {
      key: "cost",
      label: "成本",
      keys: ["cost_calculation_status", "cost_calculation_progress_percent", "active_cost_calculation_run_id", "cost_model_profile_id", "cost_model_profile_version", "total_cost_amount", "cost_result_summary", "cost_calculation_errors"]
    }, {
      key: "revenue",
      label: "收入",
      keys: ["revenue_calculation_status", "revenue_calculation_progress_percent", "active_revenue_calculation_run_id", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_unreceived_revenue_amount", "revenue_result_summary", "revenue_calculation_errors"]
    }, {
      key: "policy",
      label: "策略快照",
      keys: ["simulation_policy_snapshot"]
    }];
  }
  if (selectedType === "simulationEvent") {
    return [{
      key: "basic",
      label: "事件信息",
      keys: ["simulation_event_id", "simulation_run_id", "simulation_day", "simulation_time", "day_tick", "global_tick", "event_type", "event_source", "event_result"]
    }, {
      key: "detail",
      label: "事件详情",
      keys: ["related_object_type", "related_object_id", "message", "failure_reason", "skip_reason", "event_payload", "created_at"]
    }];
  }
  if (selectedType === "costModelProfile") {
    return [{
      key: "basic",
      label: "配置信息",
      keys: ["cost_model_profile_id", "profile_name", "profile_version", "profile_status", "description", "currency_code", "created_at", "updated_at", "activated_at"]
    }, {
      key: "driving",
      label: "行驶成本",
      keys: ["distance_cost_per_km", "electricity_price_per_kwh", "energy_consumption_kwh_per_km"]
    }, {
      key: "labor",
      label: "人力成本",
      keys: ["worker_cost_per_hour", "worker_cost_per_minute"]
    }, {
      key: "asset",
      label: "资产折旧",
      keys: ["robotaxi_purchase_cost", "robotaxi_residual_value", "expected_lifetime_km", "depreciation_method", "fixed_operating_cost_per_day"]
    }];
  }
  if (selectedType === "costParameterRule") {
    return [{
      key: "basic",
      label: "配置项",
      keys: ["cost_parameter_rule_id", "cost_parameter_name", "cost_parameter_key", "cost_parameter_group", "configured_value", "parameter_unit", "cost_parameter_status", "participates_in_calculation", "profile_version"]
    }, {
      key: "profile",
      label: "配置版本",
      keys: ["cost_model_profile_id", "profile_name", "profile_version", "currency_code"]
    }];
  }
  if (selectedType === "costCalculationRun") {
    return [{
      key: "basic",
      label: "计算信息",
      keys: ["cost_calculation_run_id", "simulation_run_id", "cost_model_profile_id", "cost_model_profile_version", "calculation_status", "calculation_progress_percent", "started_at", "completed_at"]
    }, {
      key: "result",
      label: "计算结果",
      keys: ["processed_object_count", "generated_cost_record_count", "total_cost_amount", "error_count", "calculation_errors"]
    }, {
      key: "snapshot",
      label: "配置快照",
      keys: ["cost_model_profile_snapshot"]
    }];
  }
  if (selectedType === "costRecord") {
    return [{
      key: "basic",
      label: "成本信息",
      keys: ["cost_record_id", "simulation_run_id", "cost_calculation_run_id", "cost_model_profile_id", "cost_type", "cost_amount", "currency_code"]
    }, {
      key: "source",
      label: "业务归因",
      keys: ["source_object_type", "source_object_id", "related_order_id", "related_trip_id", "related_route_execution_id", "robotaxi_id", "worker_id", "simulation_cost_occurred_at"]
    }, {
      key: "calculation",
      label: "计算依据",
      keys: ["quantity", "quantity_unit", "unit_cost", "calculation_formula", "calculation_basis", "created_at"]
    }];
  }
  if (selectedType === "revenueRecord") {
    return [{
      key: "basic",
      label: "收入信息",
      keys: ["revenue_record_id", "simulation_run_id", "revenue_calculation_run_id", "service_order_id", "revenue_type", "revenue_amount", "currency_code"]
    }, {
      key: "source",
      label: "业务归因",
      keys: ["customer_id", "robotaxi_id", "revenue_basis_field", "simulation_revenue_occurred_at", "created_at"]
    }];
  }
  if (selectedType === "revenueCalculationRun") {
    return [{
      key: "basic",
      label: "生成信息",
      keys: ["revenue_calculation_run_id", "simulation_run_id", "calculation_status", "calculation_progress_percent", "started_at", "completed_at"]
    }, {
      key: "result",
      label: "生成结果",
      keys: ["processed_object_count", "generated_revenue_record_count", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_unreceived_revenue_amount", "error_count", "calculation_errors"]
    }];
  }
  return [];
}
function getDetailStatusField(selectedType) {
  return {
    readinessTask: "task_status",
    deploymentTask: "task_status",
    routeExecution: "execution_status",
    serviceOrder: "order_status",
    trip: "trip_status"
  }[selectedType] || null;
}
function StatusTimeline({
  history,
  statusField
}) {
  if (!Array.isArray(history) || history.length === 0) {
    return /*#__PURE__*/React.createElement(Empty, {
      image: Empty.PRESENTED_IMAGE_SIMPLE,
      description: "\u5C1A\u672A\u8BA1\u7B97\u4E1A\u52A1\u72B6\u6001\u65F6\u95F4\u7EBF"
    });
  }
  return /*#__PURE__*/React.createElement("ol", {
    className: "status-timeline"
  }, history.map(item => /*#__PURE__*/React.createElement("li", {
    key: item.status_transition_id
  }, /*#__PURE__*/React.createElement("span", {
    className: "status-timeline-marker"
  }), /*#__PURE__*/React.createElement("div", {
    className: "status-timeline-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "status-timeline-heading"
  }, /*#__PURE__*/React.createElement(StatusValue, {
    value: item.to_status,
    label: getDisplayValue(item.to_status, statusField)
  }), /*#__PURE__*/React.createElement(Text, null, item.calculated_simulation_status_changed_at)), /*#__PURE__*/React.createElement(Text, {
    type: "secondary"
  }, getDisplayValue(item.action_type, "action_type"), " \xB7 ", item.configured_duration_seconds || 0, " \u79D2"), item.movement_step_count !== null && item.movement_step_count !== undefined && /*#__PURE__*/React.createElement(Text, {
    type: "secondary"
  }, item.movement_step_count, " Cell \xD7 ", item.seconds_per_cell || 0, " \u79D2")))));
}
function CostDetail({
  selectedObject
}) {
  const records = Array.isArray(selectedObject.cost_records) ? selectedObject.cost_records : [];
  if (!selectedObject.cost_calculation_run_id && records.length === 0) {
    return /*#__PURE__*/React.createElement(Empty, {
      image: Empty.PRESENTED_IMAGE_SIMPLE,
      description: "\u5C1A\u672A\u8BA1\u7B97\u8FD0\u8425\u6210\u672C"
    });
  }
  const summaryItems = ["total_cost_amount", "distance_cost_amount", "energy_cost_amount", "labor_cost_amount", "asset_depreciation_cost_amount"];
  const metaItems = ["cost_calculated_at", "cost_calculation_run_id"];
  const groupedRecords = groupCostRecords(records);
  return /*#__PURE__*/React.createElement("div", {
    className: "cost-detail"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cost-summary-grid"
  }, summaryItems.map(key => /*#__PURE__*/React.createElement("div", {
    className: "cost-summary-item",
    key: key
  }, /*#__PURE__*/React.createElement("span", null, getFieldLabel(key)), /*#__PURE__*/React.createElement("strong", null, renderDetailValue(key, selectedObject[key], selectedObject))))), /*#__PURE__*/React.createElement(Descriptions, {
    className: "compact-descriptions cost-meta-descriptions",
    column: 1,
    size: "small",
    colon: false,
    items: metaItems.map(key => ({
      key,
      label: getFieldLabel(key),
      children: renderDetailValue(key, selectedObject[key], selectedObject)
    }))
  }), /*#__PURE__*/React.createElement("div", {
    className: "cost-record-list"
  }, groupedRecords.length === 0 ? /*#__PURE__*/React.createElement(Empty, {
    image: Empty.PRESENTED_IMAGE_SIMPLE,
    description: "\u6682\u65E0\u6210\u672C\u660E\u7EC6"
  }) : groupedRecords.map(group => /*#__PURE__*/React.createElement("section", {
    className: "cost-record-group",
    key: group.cost_type
  }, /*#__PURE__*/React.createElement("div", {
    className: "cost-record-group-head"
  }, /*#__PURE__*/React.createElement(StatusValue, {
    value: group.cost_type,
    label: getDisplayValue(group.cost_type, "cost_type")
  }), /*#__PURE__*/React.createElement("strong", null, formatCostAmount(group.totalAmount, group.currencyCode))), group.records.map(record => /*#__PURE__*/React.createElement("div", {
    className: "cost-record-line",
    key: record.cost_record_id
  }, /*#__PURE__*/React.createElement("div", {
    className: "cost-record-line-main"
  }, /*#__PURE__*/React.createElement("span", null, renderDetailValue("source_object_type", record.source_object_type, record), " \xB7 ", record.source_object_id), /*#__PURE__*/React.createElement("strong", null, formatCostAmount(record.cost_amount, record.currency_code))), /*#__PURE__*/React.createElement("div", {
    className: "cost-record-line-sub"
  }, /*#__PURE__*/React.createElement("span", null, getFieldLabel("quantity"), ": ", renderDetailValue("quantity", record.quantity, record), " ", renderDetailValue("quantity_unit", record.quantity_unit, record)), /*#__PURE__*/React.createElement("span", null, getFieldLabel("unit_cost"), ": ", renderDetailValue("unit_cost", record.unit_cost, record))), record.calculation_formula && /*#__PURE__*/React.createElement(Text, {
    type: "secondary"
  }, record.calculation_formula)))))));
}
function groupCostRecords(records) {
  const map = new Map();
  records.forEach(record => {
    const key = record.cost_type || "UNKNOWN";
    const group = map.get(key) || {
      cost_type: key,
      records: [],
      totalAmount: 0,
      currencyCode: record.currency_code || "CNY"
    };
    group.records.push(record);
    group.totalAmount += Number(record.cost_amount || 0);
    if (record.currency_code) group.currencyCode = record.currency_code;
    map.set(key, group);
  });
  return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}
function formatCostAmount(amount, currencyCode = "CNY") {
  const value = Number(amount || 0);
  return `${value.toFixed(2)} ${currencyCode || "CNY"}`;
}
function MapCanvas({
  data,
  selected,
  onSelect
}) {
  const map = data.maps[0];
  const dragRef = useRef(null);
  const [viewport, setViewport] = useState({
    zoom: 1,
    panX: 0,
    panY: 0
  });
  const placeTypeByCellId = createPlaceTypeByCellId(data.places);
  const selectedRoute = selected?.type === "route" ? data.routes.find(route => route.route_id === selected.id) : null;
  const highlightedCells = new Set(selectedRoute ? routeCellIds(selectedRoute, data.roadSegments) : []);
  function changeZoom(nextZoom) {
    setViewport(current => ({
      ...current,
      zoom: Math.min(4, Math.max(0.7, nextZoom))
    }));
  }
  function resetViewport() {
    setViewport({
      zoom: 1,
      panX: 0,
      panY: 0
    });
  }
  function handleWheel(event) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.12 : 0.12;
    changeZoom(viewport.zoom + direction);
  }
  function handlePointerDown(event) {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: viewport.panX,
      panY: viewport.panY
    };
  }
  function handlePointerMove(event) {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const unitX = map.grid_cols / rect.width / viewport.zoom;
    const unitY = map.grid_rows / rect.height / viewport.zoom;
    const deltaX = (event.clientX - dragRef.current.x) * unitX;
    const deltaY = (event.clientY - dragRef.current.y) * unitY;
    setViewport({
      zoom: viewport.zoom,
      panX: dragRef.current.panX + deltaX,
      panY: dragRef.current.panY + deltaY
    });
  }
  function handlePointerUp() {
    dragRef.current = null;
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "map-page-new"
  }, /*#__PURE__*/React.createElement("div", {
    className: "map-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "map-floating-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "small",
    onClick: () => changeZoom(viewport.zoom + 0.2)
  }, "\u653E\u5927"), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    onClick: () => changeZoom(viewport.zoom - 0.2)
  }, "\u7F29\u5C0F"), /*#__PURE__*/React.createElement(Button, {
    size: "small",
    onClick: resetViewport
  }, "\u590D\u4F4D")), /*#__PURE__*/React.createElement("svg", {
    className: "zone-canvas-new",
    viewBox: `0 0 ${map.grid_cols} ${map.grid_rows}`,
    preserveAspectRatio: "xMidYMid meet",
    role: "img",
    "aria-label": "Robotaxi simulation map",
    onWheel: handleWheel,
    onMouseDown: handlePointerDown,
    onMouseMove: handlePointerMove,
    onMouseUp: handlePointerUp,
    onMouseLeave: handlePointerUp
  }, /*#__PURE__*/React.createElement("g", {
    transform: `translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`
  }, /*#__PURE__*/React.createElement("g", {
    className: "map-cells"
  }, data.cells.map(cell => /*#__PURE__*/React.createElement("rect", {
    key: cell.cell_id,
    x: cell.col,
    y: cell.row,
    width: "1",
    height: "1",
    className: `map-cell ${getCellClass(cell, placeTypeByCellId)}`,
    "data-active": selected?.type === "cell" && selected?.id === cell.cell_id,
    "data-route": highlightedCells.has(cell.cell_id),
    onClick: () => onSelect("cell", cell.cell_id)
  }))), /*#__PURE__*/React.createElement(ServiceAreas, {
    serviceAreas: data.serviceAreas,
    selected: selected
  }), /*#__PURE__*/React.createElement(OpsCenters, {
    opsCenters: data.opsCenters || [],
    selected: selected
  }), /*#__PURE__*/React.createElement(RoadNodes, {
    roadNodes: data.roadNodes,
    selected: selected
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: map.grid_cols,
    height: map.grid_rows,
    className: "zone-boundary map-boundary",
    "data-active": selected?.type === "map" && selected?.id === map.map_id
  })))), /*#__PURE__*/React.createElement("div", {
    className: "legend-new"
  }, legendItems.map(([className, label]) => /*#__PURE__*/React.createElement("span", {
    className: "legend-item",
    key: className
  }, /*#__PURE__*/React.createElement("span", {
    className: `legend-dot ${className}`
  }), label))));
}
function ServiceAreas({
  serviceAreas,
  selected
}) {
  return /*#__PURE__*/React.createElement("g", {
    className: "service-area-layer"
  }, serviceAreas.flatMap(area => (area.cell_ids || area.covered_cell_ids || []).map(cellId => {
    const {
      row,
      col
    } = parseCellId(cellId);
    return /*#__PURE__*/React.createElement("rect", {
      key: `${area.service_area_id}-${cellId}`,
      x: col + 0.12,
      y: row + 0.12,
      width: "0.76",
      height: "0.76",
      className: "service-area-cell",
      "data-active": selected?.type === "serviceArea" && selected?.id === area.service_area_id
    });
  })));
}
function OpsCenters({
  opsCenters,
  selected
}) {
  return /*#__PURE__*/React.createElement("g", {
    className: "ops-center-layer"
  }, opsCenters.flatMap(opsCenter => opsCenter.cell_ids.map(cellId => {
    const {
      row,
      col
    } = parseCellId(cellId);
    return /*#__PURE__*/React.createElement("rect", {
      key: `${opsCenter.ops_center_id}-${cellId}`,
      x: col + 0.06,
      y: row + 0.06,
      width: "0.88",
      height: "0.88",
      className: "ops-center-cell",
      "data-active": selected?.type === "opsCenter" && selected?.id === opsCenter.ops_center_id
    });
  })));
}
function RoadNodes({
  roadNodes,
  selected
}) {
  return /*#__PURE__*/React.createElement("g", {
    className: "road-node-layer"
  }, roadNodes.map(node => /*#__PURE__*/React.createElement("circle", {
    key: node.road_node_id,
    cx: node.col + 0.5,
    cy: node.row + 0.5,
    r: "0.22",
    className: "road-node",
    "data-active": selected?.type === "roadNode" && selected?.id === node.road_node_id
  })));
}
function renderCellValue(key, row) {
  if (key === "cell_count") return row.cell_ids?.length ?? 0;
  if (key === "covered_cell_count") return (row.cell_ids || row.covered_cell_ids)?.length ?? 0;
  if (key === "route_step_count") return getMovementStepCount(row);
  if (key === "result") {
    const passed = row[key] === "PASS";
    return /*#__PURE__*/React.createElement(Tag, {
      color: passed ? "success" : "error"
    }, getDisplayValue(row[key]));
  }
  if (isStatusField(key)) {
    return /*#__PURE__*/React.createElement(StatusValue, {
      value: row[key],
      label: getFieldDisplayValue(key, row[key] ?? "", row)
    });
  }
  if (Array.isArray(row[key])) return row[key].join(" / ");
  if (typeof row[key] === "boolean") return row[key] ? "是" : "否";
  if (typeof row[key] === "object" && row[key] !== null) return summarizeObject(row[key]);
  return getFieldDisplayValue(key, row[key] ?? "", row);
}
function StatusValue({
  value,
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: `status-value status-${getStatusTone(value)}`
  }, label || "无");
}
function getStatusTone(value) {
  const normalized = String(value || "").toUpperCase();
  if (["ACTIVE", "AVAILABLE", "COMPLETED", "PAID", "PASSED", "PASS", "SUCCESS", "IDLE", "ARRIVED", "NORMAL_ARRIVAL"].includes(normalized)) return "success";
  if (["FAILED", "FAIL", "BLOCKED", "UNAVAILABLE", "CANCELLED"].some(token => normalized.includes(token)) || normalized.includes("ABNORMAL")) return "danger";
  if (["WAITING", "PENDING", "PAUSED", "DRAFT", "RESTRICTED", "STOPPED"].some(token => normalized.includes(token))) return "warning";
  if (normalized === "PARTIALLY_SUCCEEDED") return "warning";
  if (["RUNNING", "DRAINING", "MOVING", "CHECKING", "INSPECTION", "ASSIGNED", "PROCESSING", "ON_THE_WAY", "CALCULATING", "SETTLING", "BUSY"].some(token => normalized.includes(token))) return "info";
  return "neutral";
}
function RowActionButton({
  children,
  onClick,
  type = "primary",
  danger = false,
  disabled = false
}) {
  return /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: type,
    danger: danger,
    disabled: disabled,
    className: "row-action-button",
    onClick: event => {
      event.stopPropagation();
      onClick?.();
    }
  }, children);
}
function RowActionGroup({
  children
}) {
  return /*#__PURE__*/React.createElement(Space, {
    size: 4,
    className: "row-action-group"
  }, children);
}
function renderViewDetailAction(row, actions) {
  return /*#__PURE__*/React.createElement(RowActionButton, {
    type: "default",
    onClick: () => actions.viewRecordDetail(actions.page, actions.objectType, row[actions.idField])
  }, "\u67E5\u770B\u8BE6\u60C5");
}
function renderReadinessActions(row, actions) {
  if (row.task_status === "WAITING_ASSIGNMENT") {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.assignWorker(row.task_id)
    }, "\u5206\u914D\u4F5C\u4E1A\u4EBA\u5458");
  }
  if (row.task_status === "WAITING_CHECK") {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.startCheck(row.task_id)
    }, "\u5F00\u59CB\u68C0\u67E5");
  }
  if (row.task_status === "CHECKING") {
    return /*#__PURE__*/React.createElement(RowActionGroup, null, /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.submitCheckResult(row.task_id, taskTypes.CheckResult.PASSED)
    }, "\u68C0\u67E5\u901A\u8FC7"), /*#__PURE__*/React.createElement(RowActionButton, {
      type: "default",
      danger: true,
      onClick: () => actions.openAbnormalModal(row)
    }, "\u5F02\u5E38"));
  }
  return renderViewDetailAction(row, actions);
}
function renderDeploymentActions(row, actions) {
  if (["WAITING_ROUTE", "WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL"].includes(row.task_status)) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.viewRouteExecutionForDeployment(row)
    }, "\u67E5\u770B\u884C\u9A76\u8BB0\u5F55");
  }
  return renderViewDetailAction(row, actions);
}
function renderRouteExecutionActions(row, actions) {
  if (["WAITING_ROUTE", "ARRIVAL_ABNORMAL"].includes(row.execution_status)) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.planRouteExecutionRoute(row.route_execution_id)
    }, "\u8DEF\u5F84\u89C4\u5212");
  }
  if (row.execution_status === "WAITING_START") {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.startRouteExecution(row.route_execution_id)
    }, "\u5F00\u59CB\u884C\u9A76");
  }
  if (row.execution_status === "MOVING") {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.advanceRouteExecution(row.route_execution_id)
    }, "\u7EE7\u7EED\u884C\u9A76");
  }
  if (row.execution_status === "ARRIVED") {
    return /*#__PURE__*/React.createElement(RowActionGroup, null, /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.submitNormalArrival(row.route_execution_id)
    }, "\u6B63\u5E38\u5230\u8FBE"), /*#__PURE__*/React.createElement(RowActionButton, {
      type: "default",
      danger: true,
      onClick: () => actions.openAbnormalArrivalModal(row)
    }, "\u5F02\u5E38\u5230\u8FBE"));
  }
  return renderViewDetailAction(row, actions);
}
function renderRoutePlanningRunActions(row, actions) {
  if (row.result_route_id) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.viewGeneratedRoute(row)
    }, "\u67E5\u770B\u751F\u6210\u8DEF\u5F84");
  }
  return renderViewDetailAction(row, actions);
}
function renderSimulationRunActions(row, actions) {
  const sim = actions.simActions;
  if (!sim) return renderViewDetailAction(row, actions);
  const status = row.simulation_status;
  if (status === "READY") {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => sim.startSimulationRun(row.simulation_run_id)
    }, "\u542F\u52A8\u6A21\u62DF");
  }
  if (status === "RUNNING") {
    return /*#__PURE__*/React.createElement(RowActionGroup, null, /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => sim.pauseSimulationRun(row.simulation_run_id),
      type: "default"
    }, "\u6682\u505C"), /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => sim.stopSimulationRun(row.simulation_run_id),
      danger: true
    }, "\u505C\u6B62"));
  }
  if (status === "PAUSED") {
    return /*#__PURE__*/React.createElement(RowActionGroup, null, /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => sim.resumeSimulationRun(row.simulation_run_id)
    }, "\u7EE7\u7EED"), /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => sim.stopSimulationRun(row.simulation_run_id),
      danger: true
    }, "\u505C\u6B62"));
  }
  if (["COMPLETED", "STOPPED", "FAILED"].includes(status)) {
    const calculating = row.business_timing_calculation_status === "CALCULATING";
    const costCalculating = row.cost_calculation_status === "CALCULATING";
    const revenueCalculating = row.revenue_calculation_status === "CALCULATING";
    return /*#__PURE__*/React.createElement(RowActionGroup, null, /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.requestBusinessTimingCalculation(row.simulation_run_id),
      disabled: calculating
    }, calculating ? "计算中" : row.business_timing_calculation_status ? "重算运营模拟时间" : "计算运营模拟时间"), /*#__PURE__*/React.createElement(RowActionButton, {
      type: "default",
      onClick: () => actions.requestCostCalculation(row.simulation_run_id),
      disabled: costCalculating
    }, costCalculating ? "成本计算中" : row.cost_calculation_status ? "重新计算运营成本" : "计算运营成本"), /*#__PURE__*/React.createElement(RowActionButton, {
      type: "default",
      onClick: () => actions.requestRevenueCalculation(row.simulation_run_id),
      disabled: revenueCalculating
    }, revenueCalculating ? "收入生成中" : row.revenue_calculation_status ? "重新生成收入记录" : "生成收入记录"), renderViewDetailAction(row, actions));
  }
  return renderViewDetailAction(row, actions);
}
function renderServiceOrderActions(row, actions) {
  if (["WAITING_PRICE_ESTIMATE", "CREATED"].includes(row.order_status)) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.estimateServiceOrderPrice(row.service_order_id)
    }, "\u4EF7\u683C\u9884\u4F30");
  }
  if (["WAITING_ROBOTAXI_CALL", "WAITING_CUSTOMER_CONFIRM"].includes(row.order_status)) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.callRobotaxiForServiceOrder(row.service_order_id)
    }, "\u7ACB\u5373\u547C\u53EB Robotaxi");
  }
  if (["WAITING_ROBOTAXI_ASSIGNMENT", "ROBOTAXI_ASSIGNMENT_FAILED", "WAITING_FOR_VEHICLE", "MATCH_FAILED", "MATCHING_FAILED"].includes(row.order_status)) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.matchServiceOrder(row.service_order_id)
    }, "\u5206\u914D Robotaxi");
  }
  if (["ON_THE_WAY_PICKUP", "WAITING_CUSTOMER_BOARDING", "CUSTOMER_ONBOARD", "ON_THE_WAY_DESTINATION", "ARRIVED_DESTINATION", "VEHICLE_ASSIGNED", "VEHICLE_ON_THE_WAY_TO_PICKUP", "WAITING_PASSENGER_BOARDING", "PASSENGER_ONBOARD", "ON_THE_WAY_TO_DESTINATION"].includes(row.order_status)) {
    if (row.trip_id) {
      return /*#__PURE__*/React.createElement(RowActionButton, {
        onClick: () => actions.viewTripForServiceOrder(row)
      }, "\u67E5\u770B\u5C65\u7EA6\u884C\u9A76");
    }
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.createTripForOrder(row.service_order_id)
    }, "\u521B\u5EFA\u5C65\u7EA6\u884C\u9A76");
  }
  if (row.order_status === "SETTLING") {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.settleServiceOrder(row.service_order_id, row)
    }, "\u7ED3\u7B97");
  }
  if (row.order_status === "WAITING_PAYMENT") {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.payServiceOrder(row.service_order_id)
    }, "\u7ACB\u5373\u652F\u4ED8");
  }
  return renderViewDetailAction(row, actions);
}
function renderTripActions(row, actions) {
  const actionLabelByStatus = {
    WAITING_ROUTE: "路径规划",
    PENDING: "路径规划",
    ASSIGNED: "路径规划",
    WAITING_CUSTOMER_BOARDING: "确认上车",
    ARRIVED_PICKUP: "确认上车",
    CUSTOMER_ONBOARD: "路径规划",
    PASSENGER_ONBOARD: "路径规划",
    ARRIVED_DESTINATION: "客户下车"
  };
  if (row.trip_status === "ON_THE_WAY_PICKUP") {
    return /*#__PURE__*/React.createElement(RowActionGroup, null, /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.advanceTrip(row.trip_id)
    }, "\u7EE7\u7EED\u884C\u9A76"), /*#__PURE__*/React.createElement(RowActionButton, {
      type: "default",
      danger: true,
      onClick: () => actions.replanTripRouteException(row.trip_id)
    }, "\u8DEF\u5F84\u5F02\u5E38"));
  }
  if (row.trip_status === "ON_THE_WAY_DESTINATION") {
    return /*#__PURE__*/React.createElement(RowActionGroup, null, /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.advanceTrip(row.trip_id)
    }, "\u7EE7\u7EED\u884C\u9A76"), /*#__PURE__*/React.createElement(RowActionButton, {
      type: "default",
      onClick: () => actions.replanTripDestination(row.trip_id)
    }, "\u53D8\u66F4\u76EE\u7684\u5730"), /*#__PURE__*/React.createElement(RowActionButton, {
      type: "default",
      danger: true,
      onClick: () => actions.replanTripRouteException(row.trip_id)
    }, "\u8DEF\u5F84\u5F02\u5E38"));
  }
  const label = actionLabelByStatus[row.trip_status];
  if (label) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.advanceTrip(row.trip_id)
    }, label);
  }
  return renderViewDetailAction(row, actions);
}
function renderAbnormalArrivalModalBody(execution, data, abnormalArrivalType, setAbnormalArrivalType) {
  if (!execution) return null;
  const robotaxi = data?.robotaxis?.find(item => item.robotaxi_id === execution.robotaxi_id);
  const route = data?.routes?.find(item => item.route_id === execution.route_id);
  const currentLocation = data ? getLocationInfo(execution.current_cell_id, data) : {
    summary: "无",
    detail: null
  };
  const originLocation = data ? getLocationInfo(execution.origin_cell_id, data) : {
    summary: "无",
    detail: null
  };
  const targetLocation = data ? getLocationInfo(execution.target_cell_id, data) : {
    summary: "无",
    detail: null
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "abnormal-modal-body"
  }, /*#__PURE__*/React.createElement(Descriptions, {
    column: 1,
    size: "small",
    colon: false
  }, /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "Robotaxi \u7F16\u53F7"
  }, execution.robotaxi_id), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "Robotaxi \u72B6\u6001"
  }, getDisplayValue(robotaxi?.motion_status) || "无"), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u884C\u9A76\u8BB0\u5F55\u7F16\u53F7"
  }, execution.route_execution_id), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u5F53\u524D\u8DEF\u5F84"
  }, route ? summarizeRoute(route) : execution.route_id), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u8DEF\u5F84\u8D77\u70B9"
  }, originLocation.summary), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u8DEF\u5F84\u7EC8\u70B9"
  }, targetLocation.summary), /*#__PURE__*/React.createElement(Descriptions.Item, {
    label: "\u5F53\u524D\u4F4D\u7F6E"
  }, currentLocation.summary)), /*#__PURE__*/React.createElement("div", {
    className: "abnormal-field"
  }, /*#__PURE__*/React.createElement("span", null, "\u5F02\u5E38\u7C7B\u578B"), /*#__PURE__*/React.createElement(Select, {
    size: "small",
    value: abnormalArrivalType,
    getPopupContainer: () => document.body,
    listHeight: 280,
    onChange: setAbnormalArrivalType,
    options: [taskTypes.ArrivalExecutionResult.ARRIVED_WITH_TARGET_OCCUPIED, taskTypes.ArrivalExecutionResult.ARRIVED_WITH_TARGET_BLOCKED, taskTypes.ArrivalExecutionResult.ARRIVED_WITH_NO_AVAILABLE_STOPPING_CELL, taskTypes.ArrivalExecutionResult.ARRIVED_WITH_NO_AVAILABLE_PARKING_CELL, taskTypes.ArrivalExecutionResult.TARGET_SERVICE_AREA_UNAVAILABLE, taskTypes.ArrivalExecutionResult.UNKNOWN].map(value => ({
      value,
      label: getDisplayValue(value)
    }))
  })));
}
function renderDetailValue(key, value, row = null) {
  if (key === "result") {
    const passed = value === "PASS";
    return /*#__PURE__*/React.createElement(Tag, {
      color: passed ? "success" : "error"
    }, getDisplayValue(value));
  }
  if (isStatusField(key)) {
    return /*#__PURE__*/React.createElement(StatusValue, {
      value: value,
      label: getFieldDisplayValue(key, value ?? "", row)
    });
  }
  if (isLocationDetailKey(key) && value && typeof value === "object") {
    return /*#__PURE__*/React.createElement(CompactLocationDetail, {
      value: value
    });
  }
  if (key === "route_steps" && Array.isArray(value)) {
    return /*#__PURE__*/React.createElement(RouteStepsDetail, {
      routeSteps: value
    });
  }
  if (Array.isArray(value) || value && typeof value === "object") {
    return /*#__PURE__*/React.createElement(StructuredDetailValue, {
      value: value,
      fieldKey: key
    });
  }
  return /*#__PURE__*/React.createElement(Text, {
    className: "detail-value"
  }, formatDetailValue(value, key, row) || "无");
}
function isLocationDetailKey(key) {
  return ["location_context", "origin_location_detail", "target_location_detail", "current_location_detail"].includes(key);
}
function CompactLocationDetail({
  value
}) {
  const rows = [["网格", value.current_cell_id], ["地图", value.related_map], ["服务区", value.related_service_areas], ["地点", value.related_places], ["道路片段", value.related_road_segments], ["道路", value.related_roads], ["运营区域", value.related_zones], ["运营中心", value.related_ops_centers]].filter(([, itemValue]) => hasRelation(itemValue));
  if (rows.length === 0) return /*#__PURE__*/React.createElement(Text, {
    className: "detail-value"
  }, "\u65E0");
  return /*#__PURE__*/React.createElement("div", {
    className: "compact-location-detail"
  }, rows.slice(0, 4).map(([label, itemValue]) => /*#__PURE__*/React.createElement("span", {
    key: label
  }, label, ": ", formatDetailValue(itemValue, label))), rows.length > 4 && /*#__PURE__*/React.createElement("details", null, /*#__PURE__*/React.createElement("summary", null, "\u66F4\u591A\u4F4D\u7F6E\u5173\u8054"), rows.slice(4).map(([label, itemValue]) => /*#__PURE__*/React.createElement("div", {
    key: label
  }, label, ": ", formatDetailValue(itemValue, label)))));
}
function RouteStepsDetail({
  routeSteps
}) {
  if (!routeSteps || routeSteps.length === 0) return /*#__PURE__*/React.createElement(Text, {
    className: "detail-value"
  }, "\u65E0\u8DEF\u5F84\u6B65\u9AA4");
  const firstCellId = routeSteps[0]?.cell_id || "未知起点";
  const lastCellId = routeSteps[routeSteps.length - 1]?.cell_id || "未知终点";
  const movementSteps = routeSteps.slice(1);
  return /*#__PURE__*/React.createElement("div", {
    className: "compact-location-detail"
  }, /*#__PURE__*/React.createElement("span", null, "\u79FB\u52A8 ", movementSteps.length, " \u6B65\uFF1A", firstCellId, " \u2192 ", lastCellId), /*#__PURE__*/React.createElement("details", null, /*#__PURE__*/React.createElement("summary", null, "\u67E5\u770B\u79FB\u52A8\u6B65\u9AA4"), /*#__PURE__*/React.createElement("div", {
    className: "route-step-list"
  }, movementSteps.map((step, index) => /*#__PURE__*/React.createElement("div", {
    key: `${step.step_index}-${step.cell_id}`
  }, index + 1, " \u2192 ", step.cell_id, " \u2192 ", step.road_segment_id || "无道路片段", " \u2192 ", getDisplayValue(step.direction) || "未知方向", " \u2192 ", step.distance_km ?? 0, " km")))));
}
function StructuredDetailValue({
  value,
  fieldKey
}) {
  const empty = Array.isArray(value) ? value.length === 0 : !value || Object.keys(value).length === 0;
  if (empty) return /*#__PURE__*/React.createElement(Text, {
    className: "detail-value"
  }, "\u65E0");
  return /*#__PURE__*/React.createElement("details", {
    className: "structured-detail"
  }, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", {
    className: "structured-detail-summary"
  }, summarizeStructuredValue(value)), /*#__PURE__*/React.createElement("span", {
    className: "structured-detail-action structured-detail-action-closed"
  }, "\u5C55\u5F00"), /*#__PURE__*/React.createElement("span", {
    className: "structured-detail-action structured-detail-action-open"
  }, "\u6536\u8D77")), /*#__PURE__*/React.createElement("div", {
    className: "structured-detail-body"
  }, /*#__PURE__*/React.createElement(StructuredDetailNode, {
    value: value,
    fieldKey: fieldKey
  })));
}
function StructuredDetailNode({
  value,
  fieldKey
}) {
  if (value === null || typeof value !== "object") {
    return /*#__PURE__*/React.createElement("div", {
      className: "structured-value-list"
    }, /*#__PURE__*/React.createElement("span", null, formatStructuredScalar(value, fieldKey)));
  }
  if (Array.isArray(value)) {
    const complexItems = value.some(item => item && typeof item === "object");
    if (!complexItems) {
      return /*#__PURE__*/React.createElement("div", {
        className: "structured-value-list"
      }, value.map((item, index) => /*#__PURE__*/React.createElement("span", {
        key: `${fieldKey}-${index}`
      }, formatStructuredScalar(item, fieldKey))));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "structured-detail-groups"
    }, value.map((item, index) => /*#__PURE__*/React.createElement("details", {
      className: "structured-detail-group",
      key: `${fieldKey}-${index}`
    }, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", null, getStructuredItemTitle(item, index)), /*#__PURE__*/React.createElement("span", null, summarizeStructuredValue(item))), /*#__PURE__*/React.createElement("div", {
      className: "structured-detail-group-body"
    }, /*#__PURE__*/React.createElement(StructuredDetailNode, {
      value: item,
      fieldKey: fieldKey
    })))));
  }
  const entries = Object.entries(value || {}).filter(([, itemValue]) => itemValue !== undefined);
  const scalarEntries = entries.filter(([, itemValue]) => !itemValue || typeof itemValue !== "object");
  const complexEntries = entries.filter(([, itemValue]) => itemValue && typeof itemValue === "object");
  return /*#__PURE__*/React.createElement(React.Fragment, null, scalarEntries.length > 0 && /*#__PURE__*/React.createElement("dl", {
    className: "structured-detail-fields"
  }, scalarEntries.map(([key, itemValue]) => /*#__PURE__*/React.createElement("div", {
    className: "structured-detail-field",
    key: key
  }, /*#__PURE__*/React.createElement("dt", null, getFieldLabel(key)), /*#__PURE__*/React.createElement("dd", null, formatStructuredScalar(itemValue, key, value))))), complexEntries.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "structured-detail-groups"
  }, complexEntries.map(([key, itemValue]) => /*#__PURE__*/React.createElement("details", {
    className: "structured-detail-group",
    key: key
  }, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", null, getFieldLabel(key)), /*#__PURE__*/React.createElement("span", null, summarizeStructuredValue(itemValue))), /*#__PURE__*/React.createElement("div", {
    className: "structured-detail-group-body"
  }, /*#__PURE__*/React.createElement(StructuredDetailNode, {
    value: itemValue,
    fieldKey: key
  }))))));
}
function summarizeStructuredValue(value) {
  if (Array.isArray(value)) return `共 ${value.length} 项`;
  if (!value || typeof value !== "object") return formatStructuredScalar(value);
  const entries = Object.entries(value).filter(([, itemValue]) => itemValue !== null && itemValue !== undefined);
  const nameKey = ["policy_name", "profile_name", "strategy_name", "simulation_name", "name"].find(key => value[key]);
  const enabledCount = entries.filter(([, itemValue]) => itemValue === true).length;
  const parts = [];
  if (nameKey) parts.push(String(value[nameKey]));
  parts.push(`${entries.length} 项`);
  if (enabledCount > 0) parts.push(`启用 ${enabledCount} 项`);
  return parts.join(" · ");
}
function getStructuredItemTitle(item, index) {
  if (!item || typeof item !== "object") return `第 ${index + 1} 项`;
  const key = ["policy_name", "profile_name", "strategy_name", "simulation_name", "name", "time_window", "demand_profile_id", "route_id", "task_id", "event_id"].find(candidate => item[candidate]);
  return key ? String(item[key]) : `第 ${index + 1} 项`;
}
function formatStructuredScalar(value, key = null, row = null) {
  if (value === null || value === undefined || value === "") return "无";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(getFieldDisplayValue(key, value, row));
}
function summarizeObject(value) {
  const enabled = Object.entries(value).filter(([, itemValue]) => itemValue === true).map(([key]) => getFieldLabel(key));
  if (enabled.length > 0) return enabled.join(", ");
  const entries = Object.entries(value).filter(([, itemValue]) => itemValue !== null && itemValue !== undefined && itemValue !== false).map(([key, itemValue]) => `${getFieldLabel(key)}: ${getDisplayValue(itemValue)}`);
  return entries.length > 0 ? entries.join("; ") : "无";
}
function formatDetailValue(value, key, parentRow = null) {
  if (key === "route_detail" && value && typeof value === "object") return summarizeRouteDetail(value);
  if (key === "route_steps" && Array.isArray(value)) return summarizeRouteSteps(value);
  if (key === "route_history" && Array.isArray(value)) return summarizeRouteHistory(value);
  if (Array.isArray(value)) {
    if (value.some(item => item && typeof item === "object")) {
      return value.map(item => summarizeRecord(item)).join("；");
    }
    return value.map(item => formatDetailValue(item, key, parentRow)).join(", ");
  }
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).map(([itemKey, itemValue]) => `${getFieldLabel(itemKey)}: ${formatDetailValue(itemValue, itemKey, value)}`).join("; ");
  }
  return String(getFieldDisplayValue(key, value ?? "", parentRow));
}
function getFieldDisplayValue(key, value, row = null) {
  if (key === "direction" && value === "UNKNOWN") return "未知方向";
  if (key === "check_result" && value === "FAILED") return "检查不通过";
  if (key === "event_result" && value === "FAILED") return "失败";
  if (isStatusField(key)) return getStatusDisplayValue(key, value, row);
  return getDisplayValue(value, key);
}
function summarizeRouteDetail(routeDetail) {
  if (!routeDetail) return "无";
  const routeId = routeDetail.route_id || "未生成";
  const startCellId = routeDetail.start_cell_id || "未知起点";
  const endCellId = routeDetail.end_cell_id || "未知终点";
  const stepCount = routeDetail.route_step_count ?? getMovementStepCount(routeDetail);
  const strategyId = routeDetail.route_strategy_id ? `，策略 ${routeDetail.route_strategy_id}` : "";
  return `${routeId}：${startCellId} 到 ${endCellId}，移动 ${stepCount} 步${strategyId}`;
}
function summarizeRouteSteps(routeSteps) {
  if (!routeSteps || routeSteps.length === 0) return "无路径步骤";
  const firstCellId = routeSteps[0]?.cell_id || "未知起点";
  const lastCellId = routeSteps[routeSteps.length - 1]?.cell_id || "未知终点";
  return `移动 ${Math.max(0, routeSteps.length - 1)} 步：${firstCellId} → ${lastCellId}`;
}
function getMovementStepCount(route) {
  if (!route) return 0;
  if (Array.isArray(route.route_steps)) return Math.max(0, route.route_steps.length - 1);
  return Math.max(0, Number(route.total_step_count || 0));
}
function summarizeRouteHistory(routeHistory) {
  if (!routeHistory || routeHistory.length === 0) return "无路径历史";
  const latest = routeHistory[routeHistory.length - 1];
  const reason = latest?.route_change_reason ? getDisplayValue(latest.route_change_reason) : "无变化原因";
  return `共 ${routeHistory.length} 次路径记录，最近一次：${latest?.route_id || "未生成"}，${reason}`;
}
function summarizeRecord(record) {
  if (!record || typeof record !== "object") return formatDetailValue(record);
  const primaryId = record.route_id || record.cell_id || record.road_segment_id || record.route_planning_run_id || record.task_id || record.event_id;
  if (primaryId) return String(primaryId);
  return Object.entries(record).slice(0, 3).map(([itemKey, itemValue]) => `${getFieldLabel(itemKey)}: ${formatDetailValue(itemValue, itemKey, record)}`).join("，");
}
function isStatusField(key) {
  return ["task_status", "execution_status", "current_task_status", "current_execution_status", "availability_status", "motion_status", "worker_status", "route_status", "ops_center_status", "zone_status", "road_status", "node_status", "segment_status", "service_area_status", "place_status", "strategy_status", "status", "result", "planning_result", "simulation_result", "run_result", "pricing_result", "decision_result", "customer_status", "order_status", "trip_status", "payment_status", "simulation_status", "business_timing_calculation_status", "policy_status", "profile_status", "rule_status", "event_result", "event_source"].includes(key);
}
function getStatusDisplayValue(key, value, row = null) {
  if (!value) return "无";
  if (key === "customer_status" && value === "ACTIVE") return "可参与订单模拟";
  if (key === "customer_status" && value === "TEST_ONLY") return "仅测试使用";
  if (key === "customer_status" && value === "INACTIVE") return "不参与订单模拟";
  if (key === "customer_status" && value === "BLOCKED") return "被限制下单";
  if (key === "order_status" && value === "FAILED") return "订单失败";
  if (key === "payment_status" && value === "FAILED") return "支付失败";
  if (value === "WAITING_START" && (key === "execution_status" || key === "current_execution_status" || row?.status_context === "routeExecution")) return "待行驶";
  if (value === "WAITING_START" && isDeploymentLike(row)) return "待行驶";
  if (value === "MOVING" && (key === "execution_status" || key === "current_execution_status" || row?.status_context === "routeExecution" || isDeploymentLike(row))) return "行驶中";
  return getDisplayValue(value, key);
}
function isDeploymentLike(row) {
  return row?.status_context === "deployment" || row?.task_type === "DEPLOYMENT" || row?.current_task_type === "DEPLOYMENT" || String(row?.task_id || "").startsWith("TASK-DP-");
}
function getColumnWidth(key) {
  if (key.endsWith("_ids") || key === "cell_ids" || key === "cell_sequence" || key === "road_segment_sequence") return 220;
  if (key.endsWith("_rule") || key === "route_update_rule") return 260;
  if (key === "strategy_name") return 220;
  if (key.includes("name") || key === "rule_name" || key === "description") return 180;
  if (key === "customer_capabilities" || key === "vehicle_capabilities") return 220;
  return 128;
}
function createPlaceTypeByCellId(places) {
  const placeTypeByCellId = new Map();
  places.forEach(place => {
    place.cell_ids.forEach(cellId => placeTypeByCellId.set(cellId, place.place_type));
  });
  return placeTypeByCellId;
}
function getCellClass(cell, placeTypeByCellId) {
  if (cell.base_cell_type !== "PLACE") return cellClass[cell.base_cell_type];
  const placeType = placeTypeByCellId.get(cell.cell_id);
  if (!placeType) return cellClass.PLACE;
  return `${cellClass.PLACE} cell-place-${placeType.toLowerCase().replaceAll("_", "-")}`;
}
function routeCellIds(route, roadSegments) {
  if (Array.isArray(route.route_steps) && route.route_steps.length > 0) {
    return route.route_steps.map(step => step.cell_id);
  }
  const segmentById = new Map(roadSegments.map(segment => [segment.road_segment_id, segment]));
  return route.road_segment_sequence.flatMap(segmentId => segmentById.get(segmentId)?.cell_sequence || []);
}
function parseCellId(cellId) {
  const [, row, col] = cellId.split("-");
  return {
    row: Number(row),
    col: Number(col)
  };
}
async function bootstrap() {
  const [mapInitialization, mapValidation, operationsCenterInitialization, customerInitialization, demandSimulationInitialization, pricingInitialization, orderMatchingInitialization, operationsCenterValidation, customerValidation, demandSimulationValidation, serviceOrderValidation, pricingValidation, orderMatchingValidation, tripValidation, demandSimulationEngine, pricingEngine, orderMatchingEngine, serviceOrderTypeModule, pricingTypeModule, orderMatchingTypeModule, tripTypeModule, cellContext, fieldDictionary, readinessTaskValidation, deploymentTaskValidation, taskTypeModule, serviceOrderSettlementModule, serviceOrderServiceModule, tripServiceModule, simulationTypesModule, simulationInitializationModule, simulationEngineModule, simulationActionsModule, simulationLoopModule, simulationHandlersModule, simulationWorkflowEngineModule, simulationExecutionEngineModule, businessTimingCalculatorModule, costModelCalculatorModule, revenueCalculatorModule, simulationRunBusinessScopeModule, routePlanningServiceModule, statusRegistryModule, routePlanningStrategiesModule] = await Promise.all([import("./data/mapInitialization.js?v=20260608-v018-bfs-route-planning"), import("./data/mapValidation.js?v=20260608-v018-bfs-route-planning"), import("./data/operationsCenterInitialization.js?v=20260608-v018-bfs-route-planning"), import("./data/customerInitialization.js?v=20260611-v019-1-customer"), import("./data/demandSimulationInitialization.js?v=20260611-v019-2-demand-simulation"), import("./data/pricingInitialization.js?v=20260611-v019-4-pricing"), import("./data/orderMatchingInitialization.js?v=20260611-v019-5-order-matching"), import("./data/operationsCenterValidation.js?v=20260608-v018-bfs-route-planning"), import("./data/customerValidation.js?v=20260611-v019-1-customer"), import("./data/demandSimulationValidation.js?v=20260611-v019-2-demand-simulation"), import("./data/serviceOrderValidation.js?v=20260614-v020-5-settlement"), import("./data/pricingValidation.js?v=20260611-v019-4-pricing"), import("./data/orderMatchingValidation.js?v=20260611-v019-5-order-matching"), import("./data/tripValidation.js?v=20260614-v020-4-trip-flow"), import("./data/demandSimulationEngine.js?v=20260611-v019-2-demand-simulation"), import("./data/pricingEngine.js?v=20260611-v019-4-pricing"), import("./data/orderMatchingEngine.js?v=20260611-v019-5-order-matching"), import("./domain/serviceOrderTypes.js?v=20260614-v020-5-settlement"), import("./domain/pricingTypes.js?v=20260611-v019-4-pricing"), import("./domain/orderMatchingTypes.js?v=20260611-v019-5-order-matching"), import("./domain/tripTypes.js?v=20260624-v028-1-5"), import("./data/cellContext.js?v=20260608-v018-bfs-route-planning"), import("./domain/fieldDisplayService.js?v=20260625-v029-2"), import("./data/readinessCheckTaskValidation.js?v=20260608-v018-bfs-route-planning"), import("./data/deploymentTaskValidation.js?v=20260614-v020-6-route-execution"), import("./domain/taskTypes.js?v=20260614-v020-6-route-execution"), import("./domain/serviceOrderSettlement.js?v=20260624-v028-1-5"), import("./services/serviceOrderService.js?v=20260617-v023-1-service-extraction"), import("./services/tripService.js?v=20260624-v028-1-5"), import("./domain/simulationTypes.js?v=20260624-v028-1-2"), import("./data/simulationInitialization.js?v=20260620-v027-4"), import("./data/simulationEngine.js?v=20260624-v028-1-2"), import("./services/simulationActions.js?v=20260620-v027-4"), import("./data/simulationLoop.js?v=20260620-v027-4"), import("./services/simulationHandlers.js?v=20260624-v028-1-5"), import("./data/simulationWorkflowEngine.js?v=20260624-v028-1-1"), import("./data/simulationExecutionEngine.js"), import("./data/businessTimingCalculator.js?v=20260624-v028-1-3"), import("./data/costModelCalculator.js?v=20260625-v029-1"), import("./data/revenueCalculator.js?v=20260625-v029-1"), import("./data/simulationRunBusinessScope.js?v=20260625-v029-1"), import("./services/routePlanningService.js?v=20260625-v029-4"), import("./domain/statusRegistry.js?v=20260625-v030-1"), import("./domain/routePlanningStrategies.js?v=20260625-v030-3")]);
  initializeMapSpace = mapInitialization.initializeMapSpace;
  validateMapSpace = mapValidation.validateMapSpace;
  initializeOperationsCenter = operationsCenterInitialization.initializeOperationsCenter;
  initializeCustomers = customerInitialization.initializeCustomers;
  initializeDemandSimulation = demandSimulationInitialization.initializeDemandSimulation;
  initializePricing = pricingInitialization.initializePricing;
  initializeOrderMatching = orderMatchingInitialization.initializeOrderMatching;
  validateOperationsCenter = operationsCenterValidation.validateOperationsCenter;
  validateCustomers = customerValidation.validateCustomers;
  validateDemandSimulation = demandSimulationValidation.validateDemandSimulation;
  validateServiceOrders = serviceOrderValidation.validateServiceOrders;
  validatePricing = pricingValidation.validatePricing;
  validateOrderMatching = orderMatchingValidation.validateOrderMatching;
  validateTrips = tripValidation.validateTrips;
  runDemandSimulation = demandSimulationEngine.runDemandSimulation;
  runPricingEstimate = pricingEngine.runPricingEstimate;
  runOrderMatching = orderMatchingEngine.runOrderMatching;
  serviceOrderTypes = serviceOrderTypeModule;
  pricingTypes = pricingTypeModule;
  orderMatchingTypes = orderMatchingTypeModule;
  tripTypes = tripTypeModule;
  createCellContext = cellContext.createCellContext;
  getDetailTitle = fieldDictionary.getDetailTitle;
  getDisplayValue = fieldDictionary.getDisplayValue;
  getFieldLabel = fieldDictionary.getFieldLabel;
  validateReadinessCheckTasks = readinessTaskValidation.validateReadinessCheckTasks;
  validateDeploymentTasks = deploymentTaskValidation.validateDeploymentTasks;
  taskTypes = taskTypeModule;
  serviceOrderSettlement = serviceOrderSettlementModule;
  serviceOrderService = serviceOrderServiceModule;
  tripService = tripServiceModule;
  simulationTypes = simulationTypesModule;
  simulationInitialization = simulationInitializationModule;
  simulationEngine = simulationEngineModule;
  simulationLoop = simulationLoopModule;
  simulationActions = simulationActionsModule;
  businessTimingCalculator = businessTimingCalculatorModule;
  costModelCalculator = costModelCalculatorModule;
  revenueCalculator = revenueCalculatorModule;
  simulationRunBusinessScope = simulationRunBusinessScopeModule;
  routePlanningService = routePlanningServiceModule;
  statusRegistry = statusRegistryModule;
  routePlanningStrategies = routePlanningStrategiesModule;

  // 注册 Simulation 业务处理器到 ExecutionEngine
  if (simulationExecutionEngineModule && simulationHandlersModule) {
    simulationExecutionEngineModule.registerActionHandlers({
      SERVICE_ORDER_CREATE: simulationHandlersModule.handleServiceOrderCreate,
      PRICING_EXECUTE: simulationHandlersModule.handlePricingExecute,
      ROBOTAXI_CALL: simulationHandlersModule.handleRobotaxiCall,
      ORDER_MATCHING_EXECUTE: simulationHandlersModule.handleOrderMatchingExecute,
      TRIP_STEP_EXECUTE: simulationHandlersModule.handleTripStepExecute,
      PASSENGER_BOARD: simulationHandlersModule.handleTripStepExecute,
      PASSENGER_DROPOFF: simulationHandlersModule.handleTripStepExecute,
      SETTLEMENT_EXECUTE: simulationHandlersModule.handleSettlementExecute,
      PAYMENT_EXECUTE: simulationHandlersModule.handlePaymentExecute,
      READINESS_TASK_ASSIGN: simulationHandlersModule.handleReadinessTaskAssign,
      READINESS_TASK_START: simulationHandlersModule.handleReadinessTaskStart,
      READINESS_TASK_PASS: simulationHandlersModule.handleReadinessTaskPass,
      READINESS_TASK_CREATE: simulationHandlersModule.handleReadinessTaskCreate,
      DEPLOYMENT_TASK_CREATE: simulationHandlersModule.handleDeploymentTaskCreate,
      ROUTE_PLAN: simulationHandlersModule.handleRoutePlan,
      ROUTE_EXECUTION_STEP: simulationHandlersModule.handleRouteExecutionStep,
      ARRIVAL_CONFIRM: simulationHandlersModule.handleArrivalConfirm
    });
  }
  ReactDOM.createRoot(document.querySelector("#app")).render(/*#__PURE__*/React.createElement(App, null));
}
bootstrap();
function findNextCandidate(robotaxis, tasks) {
  return robotaxis.find(robotaxi => isCandidateRobotaxi(robotaxi, tasks));
}
function isCandidateRobotaxi(robotaxi, tasks) {
  return robotaxi.availability_status === "PENDING_INSPECTION" && !tasks.some(task => task.robotaxi_id === robotaxi.robotaxi_id && unfinishedTaskStatuses.has(task.task_status));
}
function isDeploymentCandidateRobotaxi(robotaxi, deploymentTasks) {
  return robotaxi.availability_status === "AVAILABLE" && !robotaxi.current_order_id && !deploymentTasks.some(task => task.robotaxi_id === robotaxi.robotaxi_id && unfinishedDeploymentStatuses.has(task.task_status));
}
function getDefaultDeploymentTarget(data, options = {}) {
  return routePlanningService.getDefaultDeploymentTarget(data, options);
}
function createDeploymentRoute(task, data, options = {}) {
  return routePlanningService.createDeploymentRouteForOperation({
    task,
    data,
    routeId: nextDeploymentRouteId(),
    routePlanningRunId: options.routePlanningRunId || null,
    routeExecutionId: options.routeExecutionId || null,
    originCellId: options.originCellId || task.origin_cell_id,
    targetCellId: options.targetCellId || task.planned_target_cell_id || task.target_cell_id,
    targetServiceAreaId: options.targetServiceAreaId || task.planned_target_service_area_id || task.target_service_area_id,
    strategyId: options.strategyId || taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT
  });
}
function createTripRoute(trip, data, options = {}) {
  return routePlanningService.createTripRouteForOperation({
    trip,
    data,
    routeId: nextServiceRouteId(),
    routePlanningRunId: options.routePlanningRunId || null,
    originCellId: options.originCellId || trip.current_cell_id,
    targetCellId: options.targetCellId,
    targetServiceAreaId: options.targetServiceAreaId,
    strategyId: options.strategyId
  });
}
function getServiceRouteUsageType(strategyId) {
  if (strategyId === taskTypes.RoutePlanningStrategy.SERVICE_ORDER_PICKUP) return taskTypes.RouteUsageType.SERVICE_PICKUP;
  if (strategyId === taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION) return taskTypes.RouteUsageType.SERVICE_DROPOFF;
  return taskTypes.RouteUsageType.SERVICE_REPLAN;
}
function createPriceEstimationRoute(serviceOrder, data, routePlanningRunId) {
  return routePlanningService.createPriceEstimationRoute({
    serviceOrder,
    data,
    routeId: nextServiceRouteId(),
    routePlanningRunId
  });
}
function createSingleCellRouteSteps(data, cellId) {
  if (!cellId) return [];
  return [{
    step_index: 0,
    cell_id: cellId,
    road_segment_id: findRoadSegmentIdByCell(data, cellId),
    road_node_id: data.roadNodes.find(node => node.cell_id === cellId)?.road_node_id || null,
    direction: "UNKNOWN",
    distance_km: 0,
    is_origin_step: true,
    is_target_step: true
  }];
}
function mergeRouteStepPlans(stepPlans, data) {
  const mergedCellIds = [];
  stepPlans.forEach(steps => {
    (steps || []).forEach(step => {
      if (!step?.cell_id) return;
      if (mergedCellIds[mergedCellIds.length - 1] !== step.cell_id) {
        mergedCellIds.push(step.cell_id);
      }
    });
  });
  const cellById = new Map(data.cells.map(cell => [cell.cell_id, cell]));
  return mergedCellIds.map((cellId, index) => {
    const nextCellId = mergedCellIds[index + 1];
    return {
      step_index: index,
      movement_step_index: index === 0 ? null : index,
      cell_id: cellId,
      road_segment_id: findRoadSegmentIdByCell(data, cellId),
      road_node_id: data.roadNodes.find(node => node.cell_id === cellId)?.road_node_id || null,
      direction: nextCellId ? inferStepDirection(cellById.get(cellId), cellById.get(nextCellId)) : "UNKNOWN",
      distance_km: index === 0 ? 0 : (data.maps[0]?.cell_size_m || 50) / 1000,
      is_origin_step: index === 0,
      is_target_step: index === mergedCellIds.length - 1
    };
  });
}
function findRoadSegmentIdByCell(data, cellId) {
  return data.roadSegments.find(segment => (segment.cell_sequence || segment.cell_ids || []).includes(cellId))?.road_segment_id || null;
}
function createRouteHistoryEntry(route, routeChangeReason, arrivalExecutionResult) {
  return routePlanningService.createRouteHistoryEntryWithOptions(route, routeChangeReason, arrivalExecutionResult, {
    createdAt: now(),
    triggerType: taskTypes.TriggerType.MANUAL
  });
}
function getAlternativeDeploymentTarget(data, serviceAreaId, excludedCellIds = []) {
  const serviceArea = data.serviceAreas.find(area => area.service_area_id === serviceAreaId);
  const excluded = new Set(excludedCellIds.filter(Boolean));
  const alternativeCellId = getCandidateServiceAreaCellIds(serviceArea).find(cellId => !excluded.has(cellId));
  if (!alternativeCellId) return null;
  return {
    target_cell_id: alternativeCellId,
    target_service_area_id: serviceArea.service_area_id,
    target_zone_id: data.zones.find(zone => zone.service_area_ids?.includes(serviceArea.service_area_id))?.zone_id || null
  };
}
function getAlternativeServiceOrderDestination(data, trip) {
  const excluded = new Set([trip.current_cell_id, trip.pickup_cell_id, trip.dropoff_cell_id, ...(Array.isArray(trip.route_history) ? trip.route_history.map(history => history.target_cell_id) : [])].filter(Boolean));
  const sameServiceArea = data.serviceAreas.find(area => area.service_area_id === trip.dropoff_service_area_id);
  const sameAreaCell = (sameServiceArea?.dropoff_cell_ids || []).find(cellId => !excluded.has(cellId));
  if (sameAreaCell) {
    return {
      target_cell_id: sameAreaCell,
      target_service_area_id: sameServiceArea.service_area_id
    };
  }
  for (const serviceArea of data.serviceAreas) {
    const targetCellId = (serviceArea.dropoff_cell_ids || []).find(cellId => !excluded.has(cellId));
    if (targetCellId) {
      return {
        target_cell_id: targetCellId,
        target_service_area_id: serviceArea.service_area_id
      };
    }
  }
  return null;
}
function getCandidateServiceAreaCellIds(serviceArea) {
  if (!serviceArea) return [];
  return [...(serviceArea.standby_cell_ids || []), ...(serviceArea.parking_cell_ids || []), ...(serviceArea.temp_stop_cell_ids || []), ...(serviceArea.pickup_cell_ids || []), ...(serviceArea.dropoff_cell_ids || []), ...(serviceArea.cell_ids || serviceArea.covered_cell_ids || [])].filter((cellId, index, list) => cellId && list.indexOf(cellId) === index);
}
function createBfsRoutePlan(data, originCellId, targetCellId) {
  const cellById = new Map(data.cells.map(cell => [cell.cell_id, cell]));
  const roadNodeByCellId = new Map(data.roadNodes.map(node => [node.cell_id, node]));
  const graph = buildRoadCellGraph(data.roadSegments);
  const graphCellIds = [...graph.keys()];
  if (!originCellId || !targetCellId || graphCellIds.length === 0) {
    return {
      road_segment_sequence: [],
      route_steps: []
    };
  }
  const originConnector = connectEndpointToGraph(originCellId, graph, cellById);
  const targetConnector = connectEndpointToGraph(targetCellId, graph, cellById);
  if (!originConnector || !targetConnector) {
    return {
      road_segment_sequence: [],
      route_steps: []
    };
  }
  const graphPath = findBfsCellPath(graph, originConnector.graphCellId, targetConnector.graphCellId);
  if (graphPath.length === 0) {
    return {
      road_segment_sequence: [],
      route_steps: []
    };
  }
  const targetConnectorCells = [...targetConnector.connectorCells].reverse().slice(1);
  const routeCellIds = [...originConnector.connectorCells, ...graphPath.slice(1), ...targetConnectorCells].filter((cellId, index, list) => cellId && (index === 0 || cellId !== list[index - 1]));
  const routeSteps = routeCellIds.map((cellId, index) => {
    const nextCellId = routeCellIds[index + 1];
    const edge = nextCellId ? graph.get(cellId)?.find(item => item.to === nextCellId) : null;
    const previousEdge = index > 0 ? graph.get(routeCellIds[index - 1])?.find(item => item.to === cellId) : null;
    const roadNode = roadNodeByCellId.get(cellId);
    return {
      step_index: index,
      cell_id: cellId,
      road_segment_id: edge?.road_segment_id || previousEdge?.road_segment_id || null,
      road_node_id: roadNode?.road_node_id || null,
      direction: nextCellId ? inferStepDirection(cellById.get(cellId), cellById.get(nextCellId)) : "UNKNOWN",
      distance_km: index === 0 ? 0 : (data.maps[0]?.cell_size_m || 50) / 1000,
      is_origin_step: index === 0,
      is_target_step: index === routeCellIds.length - 1
    };
  });
  return {
    road_segment_sequence: routeSteps.map(step => step.road_segment_id).filter((segmentId, index, list) => segmentId && list.indexOf(segmentId) === index),
    route_steps: routeSteps
  };
}
function buildRoadCellGraph(roadSegments) {
  const graph = new Map();
  roadSegments.filter(segment => segment.segment_status !== "BLOCKED" && segment.segment_status !== "CLOSED" && segment.allowed_direction !== "CLOSED").forEach(segment => {
    const cellSequence = segment.cell_sequence || segment.cell_ids || [];
    cellSequence.forEach(cellId => ensureGraphNode(graph, cellId));
    for (let index = 0; index < cellSequence.length - 1; index += 1) {
      const from = cellSequence[index];
      const to = cellSequence[index + 1];
      if (segment.allowed_direction === "FORWARD" || segment.allowed_direction === "BIDIRECTIONAL") {
        addGraphEdge(graph, from, to, segment.road_segment_id);
      }
      if (segment.allowed_direction === "BACKWARD" || segment.allowed_direction === "BIDIRECTIONAL") {
        addGraphEdge(graph, to, from, segment.road_segment_id);
      }
    }
  });
  return graph;
}
function ensureGraphNode(graph, cellId) {
  if (!graph.has(cellId)) graph.set(cellId, []);
}
function addGraphEdge(graph, from, to, roadSegmentId) {
  ensureGraphNode(graph, from);
  ensureGraphNode(graph, to);
  if (graph.get(from).some(edge => edge.to === to && edge.road_segment_id === roadSegmentId)) return;
  graph.get(from).push({
    to,
    road_segment_id: roadSegmentId
  });
}
function connectEndpointToGraph(endpointCellId, graph, cellById) {
  if (graph.has(endpointCellId)) {
    return {
      graphCellId: endpointCellId,
      connectorCells: [endpointCellId]
    };
  }
  const endpointCell = cellById.get(endpointCellId);
  if (!endpointCell) return null;
  const nearestGraphCellId = [...graph.keys()].map(cellId => ({
    cellId,
    distance: manhattanDistance(endpointCell, cellById.get(cellId))
  })).sort((a, b) => a.distance - b.distance)[0]?.cellId;
  if (!nearestGraphCellId) return null;
  const nearestGraphCell = cellById.get(nearestGraphCellId);
  return {
    graphCellId: nearestGraphCellId,
    connectorCells: createManhattanConnector(endpointCell, nearestGraphCell)
  };
}
function createManhattanConnector(startCell, endCell) {
  const cells = [];
  let row = startCell.row;
  let col = startCell.col;
  cells.push(cellIdFromCoord(row, col));
  while (row !== endCell.row) {
    row += row < endCell.row ? 1 : -1;
    cells.push(cellIdFromCoord(row, col));
  }
  while (col !== endCell.col) {
    col += col < endCell.col ? 1 : -1;
    cells.push(cellIdFromCoord(row, col));
  }
  return cells;
}
function findBfsCellPath(graph, originCellId, targetCellId) {
  const queue = [originCellId];
  const previous = new Map([[originCellId, null]]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === targetCellId) break;
    (graph.get(current) || []).forEach(edge => {
      if (previous.has(edge.to)) return;
      previous.set(edge.to, current);
      queue.push(edge.to);
    });
  }
  if (!previous.has(targetCellId)) return [];
  const path = [];
  let current = targetCellId;
  while (current) {
    path.unshift(current);
    current = previous.get(current);
  }
  return path;
}
function manhattanDistance(cellA, cellB) {
  if (!cellA || !cellB) return Number.POSITIVE_INFINITY;
  return Math.abs(cellA.row - cellB.row) + Math.abs(cellA.col - cellB.col);
}
function inferStepDirection(cellA, cellB) {
  if (!cellA || !cellB) return "UNKNOWN";
  if (cellA.row > cellB.row) return "NORTH";
  if (cellA.row < cellB.row) return "SOUTH";
  if (cellA.col > cellB.col) return "WEST";
  if (cellA.col < cellB.col) return "EAST";
  return "UNKNOWN";
}
function cellIdFromCoord(row, col) {
  return `C-${String(row).padStart(2, "0")}-${String(col).padStart(2, "0")}`;
}
function createRoutePlanningStrategyRows(data, routePlanningRuns) {
  const routeByStrategyId = new Map();
  data.routes.forEach(route => {
    if (!route.route_strategy_id) return;
    const current = routeByStrategyId.get(route.route_strategy_id) || 0;
    routeByStrategyId.set(route.route_strategy_id, current + 1);
  });
  const runCountByStrategyId = new Map();
  routePlanningRuns.forEach(run => {
    const routeStrategyId = run.route_strategy_id;
    if (!routeStrategyId) return;
    const current = runCountByStrategyId.get(routeStrategyId) || 0;
    runCountByStrategyId.set(routeStrategyId, current + 1);
  });
  return routePlanningStrategies.getRoutePlanningStrategies().map(strategy => ({
    ...strategy,
    strategy_usage_count: Math.max(routeByStrategyId.get(strategy.route_strategy_id) || 0, runCountByStrategyId.get(strategy.route_strategy_id) || 0),
    route_planning_run_count: runCountByStrategyId.get(strategy.route_strategy_id) || 0
  }));
}
function createDemandSimulationStrategyRows(data, demandSimulationRuns) {
  const runCountByStrategyId = new Map();
  const successCountByStrategyId = new Map();
  demandSimulationRuns.forEach(run => {
    const strategyId = run.demand_simulation_strategy_id;
    if (!strategyId) return;
    runCountByStrategyId.set(strategyId, (runCountByStrategyId.get(strategyId) || 0) + 1);
    if (run.simulation_result === "SUCCESS") {
      successCountByStrategyId.set(strategyId, (successCountByStrategyId.get(strategyId) || 0) + 1);
    }
  });
  return (data.demandSimulationStrategies || []).map(strategy => ({
    ...strategy,
    demand_simulation_run_count: runCountByStrategyId.get(strategy.demand_simulation_strategy_id) || 0,
    demand_simulation_success_count: successCountByStrategyId.get(strategy.demand_simulation_strategy_id) || 0
  }));
}
function createDemandSimulationResultRows(demandSimulationRuns) {
  return (demandSimulationRuns || []).map(run => ({
    demand_simulation_result_id: getDemandSimulationResultId(run.demand_simulation_run_id),
    demand_simulation_run_id: run.demand_simulation_run_id,
    demand_simulation_strategy_id: run.demand_simulation_strategy_id,
    strategy_name: run.strategy_name,
    simulation_algorithm: run.simulation_algorithm,
    simulation_result: run.simulation_result,
    order_channel: run.order_channel,
    customer_id: run.customer_id,
    customer_origin_location_type: run.customer_origin_location_type,
    customer_origin_place_id: run.customer_origin_place_id,
    customer_origin_road_segment_id: run.customer_origin_road_segment_id,
    customer_origin_cell_id: run.customer_origin_cell_id,
    pickup_service_area_id: run.pickup_service_area_id,
    pickup_cell_id: run.pickup_cell_id,
    dropoff_service_area_id: run.dropoff_service_area_id,
    dropoff_cell_id: run.dropoff_cell_id,
    failure_reason: run.failure_reason,
    created_at: run.created_at
  }));
}
function getDemandSimulationResultId(runId) {
  const serial = String(runId || "").match(/\d+$/)?.[0] || "000";
  return `DSRES-${serial.padStart(3, "0")}`;
}
function createPricingStrategyRows(data, pricingStrategyRuns) {
  const runCountByStrategyId = new Map();
  pricingStrategyRuns.forEach(run => {
    const strategyId = run.pricing_strategy_id;
    if (!strategyId) return;
    runCountByStrategyId.set(strategyId, (runCountByStrategyId.get(strategyId) || 0) + 1);
  });
  return (data.pricingStrategies || []).map(strategy => ({
    ...strategy,
    dynamic_multiplier: getPricingStrategyDisplayMultiplier(strategy),
    pricing_strategy_run_count: runCountByStrategyId.get(strategy.pricing_strategy_id) || 0
  }));
}
function getPricingStrategyDisplayMultiplier(strategy) {
  if (strategy.pricing_algorithm === pricingTypes.PricingAlgorithm.BASIC_FINAL_FARE_CALCULATION) {
    return null;
  }
  const multiplierValues = [strategy.supply_demand_multiplier, strategy.time_period_multiplier, strategy.service_area_multiplier, strategy.channel_multiplier].map(Number);
  if (!multiplierValues.every(Number.isFinite)) {
    return null;
  }
  return Number(multiplierValues.reduce((total, value) => total * value, 1).toFixed(3));
}
function createOrderMatchingStrategyRows(data, orderMatchingRuns) {
  const runCountByStrategyId = new Map();
  orderMatchingRuns.forEach(run => {
    const strategyId = run.order_matching_strategy_id;
    if (!strategyId) return;
    runCountByStrategyId.set(strategyId, (runCountByStrategyId.get(strategyId) || 0) + 1);
  });
  return (data.orderMatchingStrategies || []).map(strategy => ({
    ...strategy,
    order_matching_run_count: runCountByStrategyId.get(strategy.order_matching_strategy_id) || 0
  }));
}
function createRoutePlanningRun(options) {
  return routePlanningService.createRoutePlanningRun({
    ...options,
    routePlanningRunId: options.routePlanningRunId || nextRoutePlanningRunId(),
    createdAt: now()
  });
}
function getRouteExecutionCells(route, roadSegments, originCellId, targetCellId) {
  return routePlanningService.getRouteExecutionCells(route, roadSegments, originCellId, targetCellId);
}
function enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks) {
  const currentTask = findCurrentTask(worker.current_task_id, readinessTasks, deploymentTasks);
  return {
    ...worker,
    current_task_type: currentTask?.task_type || null,
    current_task_status: currentTask?.task_status || null
  };
}
function attachCostRecords(item, objectType, costRecords = [], routeExecutions = []) {
  if (!item) return item;
  let records = [];
  if (objectType === "serviceOrder") {
    records = costRecords.filter(record => record.related_order_id === item.service_order_id);
  } else if (objectType === "trip") {
    records = costRecords.filter(record => record.source_object_type === "trip" && record.source_object_id === item.trip_id);
  } else if (objectType === "routeExecution") {
    records = costRecords.filter(record => record.source_object_type === "routeExecution" && record.source_object_id === item.route_execution_id);
  } else if (objectType === "readinessTask") {
    records = costRecords.filter(record => record.source_object_type === "readinessTask" && record.source_object_id === item.task_id);
  } else if (objectType === "deploymentTask") {
    const executionIds = routeExecutions.filter(execution => execution.task_id === item.task_id).map(execution => execution.route_execution_id);
    records = costRecords.filter(record => record.source_object_type === "deploymentTask" && record.source_object_id === item.task_id || executionIds.includes(record.source_object_id));
  }
  return {
    ...item,
    cost_records: records
  };
}
function enrichDeploymentTaskForDisplay(task, data) {
  const route = data.routes.find(item => item.route_id === task.route_id);
  const originLocation = getLocationInfo(task.origin_cell_id, data);
  const targetLocation = getLocationInfo(task.target_cell_id, data);
  return {
    ...task,
    route_strategy_id: route?.route_strategy_id || task.route_strategy_id || null,
    route_summary: summarizeRoute(route),
    origin_location_summary: originLocation.summary,
    target_location_summary: targetLocation.summary,
    origin_location_detail: originLocation.detail,
    target_location_detail: targetLocation.detail,
    route_detail: route ? getRouteDetail(route) : null
  };
}
function enrichRouteExecutionForDisplay(execution, data) {
  const route = data.routes.find(item => item.route_id === execution.route_id);
  const originLocation = getLocationInfo(execution.origin_cell_id, data);
  const targetLocation = getLocationInfo(execution.target_cell_id, data);
  const currentLocation = getLocationInfo(execution.current_cell_id, data);
  const executionMetrics = getTravelMetrics(execution, data);
  return {
    ...execution,
    route_strategy_id: route?.route_strategy_id || execution.route_strategy_id || null,
    route_summary: summarizeRoute(route),
    route_detail: route ? getRouteDetail(route) : null,
    route_history_detail: createRouteHistoryDetail(execution, data),
    origin_location_summary: originLocation.summary,
    target_location_summary: targetLocation.summary,
    current_location_summary: currentLocation.summary,
    origin_location_detail: originLocation.detail,
    target_location_detail: targetLocation.detail,
    current_location_detail: currentLocation.detail,
    total_distance_km: executionMetrics.totalDistanceKm,
    distance_traveled_km: executionMetrics.distanceTraveledKm,
    distance_remaining_km: executionMetrics.distanceRemainingKm
  };
}
function enrichServiceOrderForDisplay(order, data, trips) {
  const robotaxi = data.robotaxis.find(item => item.robotaxi_id === order.matched_robotaxi_id);
  const trip = trips.find(item => item.trip_id === order.trip_id || item.service_order_id === order.service_order_id);
  const robotaxiLocation = getLocationInfo(robotaxi?.current_cell_id, data);
  const tripMetrics = getTripMetrics(trip, data);
  return {
    ...order,
    matched_robotaxi_location_summary: robotaxi ? robotaxiLocation.summary : null,
    matched_robotaxi_location_detail: robotaxi ? robotaxiLocation.detail : null,
    trip_total_distance_km: tripMetrics.totalDistanceKm,
    trip_total_duration_min: tripMetrics.durationMin,
    trip_distance_traveled_km: tripMetrics.distanceTraveledKm,
    trip_distance_remaining_km: tripMetrics.distanceRemainingKm
  };
}
function enrichOrderMatchingDecisionForDisplay(decision, data) {
  const robotaxi = data.robotaxis.find(item => item.robotaxi_id === decision.selected_robotaxi_id);
  const robotaxiLocation = getLocationInfo(robotaxi?.current_cell_id, data);
  return {
    ...decision,
    selected_robotaxi_location_summary: robotaxi ? robotaxiLocation.summary : null,
    selected_robotaxi_location_detail: robotaxi ? robotaxiLocation.detail : null
  };
}
function enrichTripForDisplay(trip, data) {
  const pickupLocation = getLocationInfo(trip.pickup_cell_id, data);
  const dropoffLocation = getLocationInfo(trip.dropoff_cell_id, data);
  const currentLocation = getLocationInfo(trip.current_cell_id, data);
  const route = data.routes.find(item => item.route_id === trip.route_id);
  const routeHistoryDetail = createTripRouteHistoryDetail(trip, data);
  const tripMetrics = getTripMetrics(trip, data);
  return {
    ...trip,
    pickup_location_summary: pickupLocation.summary,
    dropoff_location_summary: dropoffLocation.summary,
    current_location_summary: currentLocation.summary,
    pickup_location_detail: pickupLocation.detail,
    dropoff_location_detail: dropoffLocation.detail,
    current_location_detail: currentLocation.detail,
    route_summary: summarizeRoute(route),
    route_detail: route ? getRouteDetail(route) : null,
    route_history_detail: routeHistoryDetail,
    total_distance_km: tripMetrics.totalDistanceKm,
    distance_traveled_km: tripMetrics.distanceTraveledKm,
    distance_remaining_km: tripMetrics.distanceRemainingKm
  };
}
function getTripMetrics(trip, data = null) {
  if (!trip) {
    return {
      totalDistanceKm: null,
      distanceTraveledKm: null,
      distanceRemainingKm: null,
      durationMin: null
    };
  }
  const travelMetrics = data ? getTravelMetrics(trip, data) : null;
  const distanceTraveledKm = travelMetrics?.distanceTraveledKm ?? roundDistance(trip.distance_traveled_km || 0);
  const distanceRemainingKm = travelMetrics?.distanceRemainingKm ?? roundDistance(trip.distance_remaining_km || 0);
  return {
    totalDistanceKm: travelMetrics?.totalDistanceKm ?? roundDistance(distanceTraveledKm + distanceRemainingKm),
    distanceTraveledKm,
    distanceRemainingKm,
    durationMin: parseElapsedMinutes(trip.time_elapsed)
  };
}
function getTravelMetrics(record, data) {
  const metrics = routePlanningService.calculateTravelDistanceMetrics(record, data.routes || []);
  return {
    totalDistanceKm: metrics.total_distance_km,
    distanceTraveledKm: metrics.distance_traveled_km,
    distanceRemainingKm: metrics.distance_remaining_km
  };
}
function createTripRouteHistoryDetail(trip, data) {
  return createRouteHistoryDetail(trip, data);
}
function createRouteHistoryDetail(record, data) {
  const history = Array.isArray(record.route_history) ? record.route_history : [];
  if (history.length === 0) return [];
  return history.map((item, index) => {
    const route = data.routes.find(routeItem => routeItem.route_id === item.route_id);
    return {
      index: index + 1,
      route_id: item.route_id,
      route_strategy_id: item.route_strategy_id,
      route_change_reason: item.route_change_reason,
      origin_cell_id: item.origin_cell_id,
      target_cell_id: item.target_cell_id,
      route_step_count: route ? getMovementStepCount(route) : null,
      total_distance_km: route ? roundDistance(Number(route.total_distance_km ?? Number(route.total_distance_m || 0) / 1000)) : null,
      is_current_route: item.route_id === record.route_id
    };
  });
}
function mergeServiceOrderTripMetrics(order, trip, data = null) {
  const tripMetrics = getTripMetrics(trip, data);
  return {
    ...order,
    trip_total_distance_km: tripMetrics.totalDistanceKm ?? order.trip_total_distance_km,
    trip_total_duration_min: tripMetrics.durationMin ?? order.trip_total_duration_min,
    trip_distance_traveled_km: tripMetrics.distanceTraveledKm ?? order.trip_distance_traveled_km,
    trip_distance_remaining_km: tripMetrics.distanceRemainingKm ?? order.trip_distance_remaining_km
  };
}
function enrichRouteForDisplay(route, data, deploymentTasks, routeExecutions, routePlanningRuns) {
  const planningRun = routePlanningRuns.find(run => run.result_route_id === route.route_id || run.route_planning_run_id === route.route_planning_run_id);
  const execution = routeExecutions.find(item => item.route_id === route.route_id || item.route_history?.some(history => history.route_id === route.route_id));
  const task = deploymentTasks.find(item => item.route_id === route.route_id || item.task_id === route.task_id || item.task_id === execution?.task_id);
  return {
    ...route,
    route_version: route.route_version || 1,
    task_id: route.task_id || planningRun?.task_id || execution?.task_id || task?.task_id || null,
    route_execution_id: route.route_execution_id || planningRun?.route_execution_id || execution?.route_execution_id || null,
    route_planning_run_id: route.route_planning_run_id || planningRun?.route_planning_run_id || null,
    robotaxi_id: route.robotaxi_id || planningRun?.robotaxi_id || execution?.robotaxi_id || task?.robotaxi_id || null,
    origin_cell_id: route.origin_cell_id || route.start_cell_id,
    target_cell_id: route.target_cell_id || route.end_cell_id,
    failure_reason: route.failure_reason || null,
    route_step_count: getMovementStepCount(route)
  };
}
function enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions = []) {
  const currentTask = findCurrentTask(robotaxi.current_task_id, readinessTasks, deploymentTasks);
  const currentRouteExecution = findCurrentRouteExecution(robotaxi, routeExecutions);
  const location = getLocationInfo(robotaxi.current_cell_id, data);
  return {
    ...robotaxi,
    current_task_type: currentTask?.task_type || null,
    current_task_status: currentTask?.task_status || null,
    current_route_execution_id: currentRouteExecution?.route_execution_id || null,
    location_summary: location.summary
  };
}
function enrichRobotaxiForDetail(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions) {
  const currentTask = findCurrentTask(robotaxi.current_task_id, readinessTasks, deploymentTasks);
  const currentRouteExecution = findCurrentRouteExecution(robotaxi, routeExecutions);
  const location = getLocationInfo(robotaxi.current_cell_id, data);
  return {
    ...enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions),
    current_route_execution_id: currentRouteExecution?.route_execution_id || null,
    current_execution_status: currentRouteExecution?.execution_status || null,
    current_route_step: currentRouteExecution ? `${currentRouteExecution.current_step_index} / ${currentRouteExecution.total_step_count}` : null,
    location_context: location.detail
  };
}
function findCurrentRouteExecution(robotaxi, routeExecutions) {
  return routeExecutions.find(execution => execution.robotaxi_id === robotaxi.robotaxi_id && ["WAITING_ROUTE", "WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL", "PAUSED"].includes(execution.execution_status));
}
function summarizeRobotaxiLocation(cellContext) {
  if (!cellContext) return "未知位置";
  if (hasRelation(cellContext.related_ops_centers)) return `运营中心：${cellContext.related_ops_centers}`;
  if (hasRelation(cellContext.related_places)) return `地点：${cellContext.related_places}`;
  if (hasRelation(cellContext.related_service_areas)) return `服务区：${cellContext.related_service_areas}`;
  if (hasRelation(cellContext.related_road_segments)) return `道路片段：${cellContext.related_road_segments}`;
  if (hasRelation(cellContext.related_roads)) return `道路：${cellContext.related_roads}`;
  if (hasRelation(cellContext.related_zones)) return `运营区域：${cellContext.related_zones}`;
  return "空白网格";
}
function getLocationInfo(cellId, data) {
  const cell = data.cells.find(item => item.cell_id === cellId);
  const cellContext = cell ? createCellContext(cell, data) : null;
  return {
    summary: summarizeRobotaxiLocation(cellContext),
    detail: cellContext ? {
      current_cell_id: cellContext.cell_id,
      related_map: cellContext.related_map,
      related_zones: cellContext.related_zones,
      related_roads: cellContext.related_roads,
      related_road_segments: cellContext.related_road_segments,
      related_road_nodes: cellContext.related_road_nodes,
      related_service_areas: cellContext.related_service_areas,
      related_places: cellContext.related_places,
      related_ops_centers: cellContext.related_ops_centers,
      service_eligibility: cellContext.service_eligibility
    } : null
  };
}
function summarizeRoute(route) {
  if (!route) return "未生成";
  return `${route.route_id} ${route.route_name || ""}`.trim();
}
function getRouteDetail(route) {
  return {
    route_id: route.route_id,
    route_version: route.route_version,
    route_name: route.route_name,
    origin_cell_id: route.origin_cell_id || route.start_cell_id,
    target_cell_id: route.target_cell_id || route.end_cell_id,
    start_cell_id: route.start_cell_id || route.origin_cell_id,
    end_cell_id: route.end_cell_id || route.target_cell_id,
    route_strategy_id: route.route_strategy_id,
    route_planning_run_id: route.route_planning_run_id,
    task_id: route.task_id,
    service_order_id: route.service_order_id,
    trip_id: route.trip_id,
    route_execution_id: route.route_execution_id,
    robotaxi_id: route.robotaxi_id,
    road_segment_sequence: route.road_segment_sequence,
    route_usage_type: route.route_usage_type,
    route_segments: route.route_segments,
    route_step_count: getMovementStepCount(route),
    route_steps: route.route_steps,
    related_service_area_ids: route.related_service_area_ids,
    total_distance_km: roundDistance(Number(route.total_distance_km ?? Number(route.total_distance_m || 0) / 1000)),
    total_distance_m: route.total_distance_m,
    route_status: route.route_status,
    failure_reason: route.failure_reason
  };
}
function hasRelation(value) {
  return Boolean(value) && value !== "无关联";
}
function findCurrentTask(taskId, readinessTasks, deploymentTasks) {
  if (!taskId) return null;
  return readinessTasks.find(task => task.task_id === taskId) || deploymentTasks.find(task => task.task_id === taskId) || null;
}
function createTripRouteUpdate(trip, nextTrip, data) {
  const result = routePlanningService.createTripRouteUpdate({
    trip,
    nextTrip,
    data,
    routeId: nextServiceRouteId(),
    routePlanningRunId: nextRoutePlanningRunId()
  });
  if (result?.nextTrip?.route_history?.length) {
    const routeHistory = result.nextTrip.route_history.map((entry, index, list) => index === list.length - 1 ? {
      ...entry,
      started_at: now(),
      trigger_type: taskTypes.TriggerType.MANUAL
    } : entry);
    return {
      ...result,
      nextTrip: {
        ...result.nextTrip,
        route_history: routeHistory
      }
    };
  }
  return result;
}
function replanTripRoute(trip, options) {
  const routePlanningRunId = nextRoutePlanningRunId();
  if (!options.targetCellId) {
    const routePlanningRun = createRoutePlanningRun({
      routePlanningRunId,
      routeStrategyId: options.strategyId,
      planningAlgorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
      taskId: null,
      serviceOrderId: trip.service_order_id,
      tripId: trip.trip_id,
      routeExecutionId: null,
      robotaxiId: trip.robotaxi_id,
      originCellId: trip.current_cell_id,
      targetCellId: null,
      resultRouteId: null,
      planningResult: taskTypes.RoutePlanningResult.FAILED,
      failureReason: options.failureReason || taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL
    });
    return {
      routePlanningRun,
      waitingTrip: createWaitingDecisionTrip(trip, options, routePlanningRun.failure_reason)
    };
  }
  const route = createTripRoute(trip, data, {
    originCellId: trip.current_cell_id,
    targetCellId: options.targetCellId,
    targetServiceAreaId: options.targetServiceAreaId,
    strategyId: options.strategyId,
    routePlanningRunId
  });
  const routePlanningRun = createRoutePlanningRun({
    routePlanningRunId,
    routeStrategyId: route.route_strategy_id,
    planningAlgorithm: route.planning_algorithm,
    taskId: null,
    serviceOrderId: trip.service_order_id,
    tripId: trip.trip_id,
    routeExecutionId: null,
    robotaxiId: trip.robotaxi_id,
    originCellId: route.origin_cell_id,
    targetCellId: route.target_cell_id,
    resultRouteId: route.route_steps.length > 0 ? route.route_id : null,
    planningResult: route.route_steps.length > 0 ? taskTypes.RoutePlanningResult.SUCCESS : taskTypes.RoutePlanningResult.FAILED,
    failureReason: route.route_steps.length > 0 ? taskTypes.RoutePlanningFailureReason.NONE : route.failure_reason,
    routeStepCount: route.route_step_count,
    totalDistanceKm: route.total_distance_km
  });
  if (route.route_steps.length === 0) {
    return {
      routePlanningRun,
      waitingTrip: createWaitingDecisionTrip(trip, options, route.failure_reason)
    };
  }
  const routeHistory = [...(Array.isArray(trip.route_history) ? trip.route_history : []), createRouteHistoryEntry(route, options.routeChangeReason, options.exceptionType)];
  return {
    route,
    routePlanningRun,
    nextTrip: routePlanningService.applyTravelMetrics({
      record: {
        ...trip,
        route_id: route.route_id,
        route_planning_run_id: routePlanningRun.route_planning_run_id,
        route_history: routeHistory,
        dropoff_cell_id: options.routeChangeReason === taskTypes.RouteChangeReason.DESTINATION_CHANGE_REPLAN ? options.targetCellId : trip.dropoff_cell_id,
        dropoff_service_area_id: options.routeChangeReason === taskTypes.RouteChangeReason.DESTINATION_CHANGE_REPLAN ? options.targetServiceAreaId : trip.dropoff_service_area_id,
        current_step_index: 0,
        total_step_count: Math.max(0, route.route_steps.length - 1),
        arrival_execution_result: options.exceptionType,
        exception_type: options.exceptionType,
        failure_reason: null
      },
      routes: [route, ...data.routes],
      currentRouteId: route.route_id,
      currentStepIndex: 0
    })
  };
}
function createWaitingDecisionTrip(trip, options, failureReason) {
  return {
    ...trip,
    trip_status: tripTypes.TripStatus.WAITING_OPERATION_DECISION,
    arrival_execution_result: options.exceptionType || null,
    exception_type: options.exceptionType || null,
    failure_reason: failureReason,
    event_log: [...(Array.isArray(trip.event_log) ? trip.event_log : []), {
      event_time: now(),
      previous_status: trip.trip_status,
      next_status: tripTypes.TripStatus.WAITING_OPERATION_DECISION,
      event_type: options.exceptionType || "ROUTE_PLANNING_FAILED",
      event_result: taskTypes.RoutePlanningResult.FAILED
    }]
  };
}
function getTripRouteRequest(trip) {
  if (["WAITING_ROUTE", "PENDING", "ASSIGNED"].includes(trip.trip_status)) {
    return {
      originCellId: trip.current_cell_id,
      targetCellId: trip.pickup_cell_id,
      targetServiceAreaId: trip.pickup_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_PICKUP,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ORDER_PICKUP_PLANNING
    };
  }
  if (["CUSTOMER_ONBOARD", "PASSENGER_ONBOARD"].includes(trip.trip_status)) {
    return {
      originCellId: trip.current_cell_id || trip.pickup_cell_id,
      targetCellId: trip.dropoff_cell_id,
      targetServiceAreaId: trip.dropoff_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ORDER_DESTINATION_PLANNING
    };
  }
  return null;
}
function updateRobotaxiForTrip(robotaxi, trip) {
  const movingStatuses = ["ON_THE_WAY_PICKUP", "ON_THE_WAY_DESTINATION"];
  const completed = trip.trip_status === "COMPLETED";
  const waitingDecision = trip.trip_status === "WAITING_OPERATION_DECISION";
  return {
    ...robotaxi,
    current_cell_id: trip.current_cell_id || robotaxi.current_cell_id,
    current_route_id: completed ? null : trip.route_id || robotaxi.current_route_id,
    current_order_id: completed ? null : trip.service_order_id,
    availability_status: completed ? "AVAILABLE" : robotaxi.availability_status,
    motion_status: completed || waitingDecision ? "STOPPED" : movingStatuses.includes(trip.trip_status) ? "MOVING" : "STOPPED",
    available_for_dispatch: completed
  };
}
function updateServiceOrderForTrip(order, trip) {
  const orderStatusByTripStatus = {
    ON_THE_WAY_PICKUP: "ON_THE_WAY_PICKUP",
    WAITING_CUSTOMER_BOARDING: "WAITING_CUSTOMER_BOARDING",
    ARRIVED_PICKUP: "WAITING_CUSTOMER_BOARDING",
    CUSTOMER_ONBOARD: "CUSTOMER_ONBOARD",
    PASSENGER_ONBOARD: "CUSTOMER_ONBOARD",
    ON_THE_WAY_DESTINATION: "ON_THE_WAY_DESTINATION",
    ARRIVED_DESTINATION: "ARRIVED_DESTINATION",
    SETTLING: "SETTLING",
    WAITING_OPERATION_DECISION: "WAITING_OPERATION_DECISION",
    COMPLETED: "SETTLING"
  };
  const nextOrderStatus = orderStatusByTripStatus[trip.trip_status] || order.order_status;
  const syncedOrder = serviceOrderSettlement.createServiceOrderActualSnapshotFromTrip(order, trip, serviceOrderTypes, tripTypes);
  return {
    ...syncedOrder,
    ...order,
    trip_id: trip.trip_id,
    order_status: nextOrderStatus,
    trip_total_distance_km: syncedOrder.trip_total_distance_km,
    trip_total_duration_min: syncedOrder.trip_total_duration_min,
    final_price: order.final_price,
    completed_at: order.completed_at,
    failure_reason: null
  };
}
function addElapsedMinutes(value, minutes) {
  const current = parseElapsedMinutes(value);
  return String(roundDuration((Number.isFinite(current) ? current : 0) + minutes));
}
function parseElapsedMinutes(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  const parts = String(value || "0").split(":").map(part => Number.parseInt(part, 10) || 0);
  if (parts.length >= 3) return parts[0] * 60 + parts[1] + Math.ceil(parts[2] / 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
function roundDuration(value) {
  return Number(Number(value || 0).toFixed(2));
}
function roundDistance(value) {
  return Number(Number(value || 0).toFixed(2));
}
function now() {
  return new Date().toISOString();
}
function nextTaskId() {
  taskSequence += 1;
  return `TASK-RC-${String(taskSequence).padStart(3, "0")}`;
}
function nextDeploymentTaskId() {
  deploymentTaskSequence += 1;
  return `TASK-DP-${String(deploymentTaskSequence).padStart(3, "0")}`;
}
function nextRouteExecutionId() {
  routeExecutionSequence += 1;
  return `REX-${String(routeExecutionSequence).padStart(3, "0")}`;
}
function nextDeploymentRouteId() {
  deploymentRouteSequence += 1;
  return `DRT-${String(deploymentRouteSequence).padStart(3, "0")}`;
}
function nextServiceRouteId() {
  serviceRouteSequence += 1;
  return `SRT-${String(serviceRouteSequence).padStart(3, "0")}`;
}
function nextRoutePlanningRunId() {
  routePlanningRunSequence += 1;
  return `RPR-${String(routePlanningRunSequence).padStart(3, "0")}`;
}
function nextDemandSimulationRunId() {
  demandSimulationRunSequence += 1;
  return `DSR-${String(demandSimulationRunSequence).padStart(3, "0")}`;
}
function nextServiceOrderId() {
  serviceOrderSequence += 1;
  return `SO-${String(serviceOrderSequence).padStart(3, "0")}`;
}
function nextPricingStrategyRunId() {
  pricingStrategyRunSequence += 1;
  return `DPR-${String(pricingStrategyRunSequence).padStart(3, "0")}`;
}
function nextPricingDecisionId() {
  pricingDecisionSequence += 1;
  return `PD-${String(pricingDecisionSequence).padStart(3, "0")}`;
}
function nextOrderMatchingRunId() {
  orderMatchingRunSequence += 1;
  return `OMR-${String(orderMatchingRunSequence).padStart(3, "0")}`;
}
function nextOrderMatchingDecisionId() {
  orderMatchingDecisionSequence += 1;
  return `OMD-${String(orderMatchingDecisionSequence).padStart(3, "0")}`;
}
function nextTripId() {
  tripSequence += 1;
  return `TRIP-${String(tripSequence).padStart(3, "0")}`;
}
function nextEventId() {
  eventSequence += 1;
  return `EVT-${String(eventSequence).padStart(3, "0")}`;
}
function createDefaultPageUiState() {
  return {
    filters: {
      ...defaultPageFilters
    },
    appliedFilters: {
      ...defaultPageFilters
    },
    pagination: {
      current: 1
    }
  };
}
function normalizePageUiState(uiState) {
  const fallback = createDefaultPageUiState();
  return {
    filters: {
      ...fallback.filters,
      ...(uiState?.filters || {})
    },
    appliedFilters: {
      ...fallback.appliedFilters,
      ...(uiState?.appliedFilters || {})
    },
    pagination: {
      ...fallback.pagination,
      ...(uiState?.pagination || {})
    }
  };
}
function createNextPageUiState(currentState, patch) {
  const normalizedState = normalizePageUiState(currentState);
  return normalizePageUiState({
    ...normalizedState,
    ...patch,
    filters: patch.filters ? {
      ...normalizedState.filters,
      ...patch.filters
    } : normalizedState.filters,
    appliedFilters: patch.appliedFilters ? {
      ...normalizedState.appliedFilters,
      ...patch.appliedFilters
    } : normalizedState.appliedFilters,
    pagination: patch.pagination ? {
      ...normalizedState.pagination,
      ...patch.pagination
    } : normalizedState.pagination
  });
}
function normalizePageUiStateMap(pageUiState) {
  return Object.entries(pageUiState || {}).reduce((result, [page, state]) => ({
    ...result,
    [page]: normalizePageUiState(state)
  }), {});
}
function getDefaultSelection(page, data) {
  if (page === "console") return {
    type: "map",
    id: data.maps[0].map_id
  };
  const type = pageObjectType[page];
  return type ? {
    type,
    id: null
  } : {
    type: null,
    id: null
  };
}
function getPageLabel(page) {
  if (page === "console") return "运营中控台";
  return tableConfig[page]?.title || findPageMenuLabel(page) || "业务页面";
}
function findPageMenuLabel(page) {
  for (const group of pageGroups) {
    for (const item of group.children || []) {
      if (item.key === page) return item.label;
      for (const child of item.children || []) {
        if (child.key === page) return child.label;
      }
    }
  }
  return null;
}
function isLeafPage(page) {
  if (hiddenWorkspacePages.has(page)) return false;
  return page === "console" || Boolean(pageObjectType[page] || tableConfig[page]);
}
function normalizeWorkspacePages(pages, activePage = "console") {
  const nextPages = ["console"];
  [...(Array.isArray(pages) ? pages : []), activePage].forEach(page => {
    if (isLeafPage(page) && !nextPages.includes(page)) nextPages.push(page);
  });
  return nextPages;
}
function addWorkspacePage(pages, page) {
  return normalizeWorkspacePages([...(Array.isArray(pages) ? pages : []), page], page);
}
function mergeCalculatedObjects(current = [], updates = [], idField) {
  const updateById = new Map((updates || []).map(item => [item[idField], item]));
  return current.map(item => updateById.get(item[idField]) || item);
}
function loadRuntimeSnapshot(initialData) {
  const fallback = {
    operationalData: initialData,
    readinessTasks: [],
    deploymentTasks: [],
    routeExecutions: [],
    routePlanningRuns: [],
    demandSimulationRuns: [],
    serviceOrders: [],
    pricingStrategyRuns: [],
    pricingDecisions: [],
    orderMatchingRuns: [],
    orderMatchingDecisions: [],
    trips: [],
    taskEventLogs: [],
    simulationPolicies: [],
    workflowTimingProfiles: [businessTimingCalculator.initializeDefaultWorkflowTimingProfile()],
    businessTimingCalculationRuns: [],
    costModelProfiles: [costModelCalculator.initializeDefaultCostModelProfile()],
    costCalculationRuns: [],
    costRecords: [],
    revenueCalculationRuns: [],
    revenueRecords: [],
    simulationRuns: [],
    simulationEvents: [],
    timedOperations: [],
    activePage: "console",
    workspacePages: ["console"],
    detailCollapsedByPage: {},
    pageSelections: {
      console: {
        type: "map",
        id: initialData.maps[0].map_id
      }
    },
    pageUiState: {}
  };
  if (typeof window === "undefined") return fallback;
  try {
    if (new URLSearchParams(window.location.search).get("resetRuntime") === "1") {
      clearRobotaxiRuntimeStorage();
      removeRuntimeResetParam();
      return fallback;
    }
    const rawValue = window.localStorage.getItem(runtimeStorageKey);
    if (!rawValue) return fallback;
    const snapshot = JSON.parse(rawValue);
    const readinessTasks = Array.isArray(snapshot.readinessTasks) ? snapshot.readinessTasks : [];
    const deploymentTasks = normalizeRouteStrategyReferences(Array.isArray(snapshot.deploymentTasks) ? snapshot.deploymentTasks : []);
    const routeExecutions = normalizeRouteStrategyReferences(Array.isArray(snapshot.routeExecutions) ? snapshot.routeExecutions : []);
    const routePlanningRuns = normalizeRouteStrategyReferences(Array.isArray(snapshot.routePlanningRuns) ? snapshot.routePlanningRuns : []);
    const demandSimulationRuns = Array.isArray(snapshot.demandSimulationRuns) ? snapshot.demandSimulationRuns : [];
    const serviceOrders = normalizeServiceOrders(Array.isArray(snapshot.serviceOrders) ? snapshot.serviceOrders : []);
    const pricingStrategyRuns = Array.isArray(snapshot.pricingStrategyRuns) ? snapshot.pricingStrategyRuns : [];
    const pricingDecisions = Array.isArray(snapshot.pricingDecisions) ? snapshot.pricingDecisions : [];
    const orderMatchingRuns = Array.isArray(snapshot.orderMatchingRuns) ? snapshot.orderMatchingRuns : [];
    const orderMatchingDecisions = Array.isArray(snapshot.orderMatchingDecisions) ? snapshot.orderMatchingDecisions : [];
    const trips = Array.isArray(snapshot.trips) ? snapshot.trips.map(trip => tripTypes.normalizeTripRecord(trip)) : [];
    const taskEventLogs = normalizeRouteStrategyReferences(Array.isArray(snapshot.taskEventLogs) ? snapshot.taskEventLogs : []);
    const simulationPolicies = Array.isArray(snapshot.simulationPolicies) ? snapshot.simulationPolicies : [];
    const workflowTimingProfiles = Array.isArray(snapshot.workflowTimingProfiles) && snapshot.workflowTimingProfiles.length ? snapshot.workflowTimingProfiles.map(profile => businessTimingCalculator.normalizeWorkflowTimingProfile(profile)) : [businessTimingCalculator.initializeDefaultWorkflowTimingProfile()];
    const businessTimingCalculationRuns = Array.isArray(snapshot.businessTimingCalculationRuns) ? snapshot.businessTimingCalculationRuns : [];
    const costModelProfiles = Array.isArray(snapshot.costModelProfiles) && snapshot.costModelProfiles.length ? snapshot.costModelProfiles.map(profile => costModelCalculator.normalizeCostModelProfile(profile)) : [costModelCalculator.initializeDefaultCostModelProfile()];
    const costCalculationRuns = Array.isArray(snapshot.costCalculationRuns) ? snapshot.costCalculationRuns : [];
    const costRecords = Array.isArray(snapshot.costRecords) ? snapshot.costRecords : [];
    const revenueCalculationRuns = Array.isArray(snapshot.revenueCalculationRuns) ? snapshot.revenueCalculationRuns : [];
    const revenueRecords = Array.isArray(snapshot.revenueRecords) ? snapshot.revenueRecords : [];
    const simulationRuns = Array.isArray(snapshot.simulationRuns) ? snapshot.simulationRuns : [];
    const simulationEvents = Array.isArray(snapshot.simulationEvents) ? snapshot.simulationEvents : [];
    const timedOperations = Array.isArray(snapshot.timedOperations) ? snapshot.timedOperations : [];
    const operationalData = normalizeOperationalRouteStrategies(snapshot.operationalData || initialData);
    taskSequence = deriveSequence(readinessTasks, "task_id", "TASK-RC-");
    deploymentTaskSequence = deriveSequence(deploymentTasks, "task_id", "TASK-DP-");
    routeExecutionSequence = deriveSequence(routeExecutions, "route_execution_id", "REX-");
    routePlanningRunSequence = deriveSequence(routePlanningRuns, "route_planning_run_id", "RPR-");
    demandSimulationRunSequence = deriveSequence(demandSimulationRuns, "demand_simulation_run_id", "DSR-");
    serviceOrderSequence = deriveSequence(serviceOrders, "service_order_id", "SO-");
    pricingStrategyRunSequence = deriveSequence(pricingStrategyRuns, "pricing_strategy_run_id", "DPR-");
    pricingDecisionSequence = deriveSequence(pricingDecisions, "pricing_decision_id", "PD-");
    orderMatchingRunSequence = deriveSequence(orderMatchingRuns, "order_matching_run_id", "OMR-");
    orderMatchingDecisionSequence = deriveSequence(orderMatchingDecisions, "order_matching_decision_id", "OMD-");
    tripSequence = deriveSequence(trips, "trip_id", "TRIP-");
    deploymentRouteSequence = deriveSequence(operationalData.routes || [], "route_id", "DRT-");
    serviceRouteSequence = deriveSequence(operationalData.routes || [], "route_id", "SRT-");
    eventSequence = deriveSequence(taskEventLogs, "event_id", "EVT-");
    const restoredActivePage = isLeafPage(snapshot.activePage) ? snapshot.activePage : "console";
    return {
      operationalData,
      readinessTasks,
      deploymentTasks,
      routeExecutions,
      routePlanningRuns,
      demandSimulationRuns,
      serviceOrders,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      trips,
      taskEventLogs,
      simulationPolicies,
      workflowTimingProfiles,
      businessTimingCalculationRuns,
      costModelProfiles,
      costCalculationRuns,
      costRecords,
      revenueCalculationRuns,
      revenueRecords,
      simulationRuns,
      simulationEvents,
      timedOperations,
      activePage: restoredActivePage,
      workspacePages: normalizeWorkspacePages(snapshot.workspacePages, restoredActivePage),
      detailCollapsedByPage: snapshot.detailCollapsedByPage || {},
      pageSelections: {
        console: {
          type: "map",
          id: initialData.maps[0].map_id
        },
        ...(snapshot.pageSelections || {})
      },
      pageUiState: normalizePageUiStateMap(snapshot.pageUiState)
    };
  } catch (error) {
    return fallback;
  }
}
function clearRobotaxiRuntimeStorage() {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage).filter(key => key.startsWith(runtimeStorageKeyPrefix)).forEach(key => window.localStorage.removeItem(key));
  window.sessionStorage?.clear?.();
  clearPersistedSimulationEvents();
  clearPersistedRuntimeSnapshot();
}
function removeRuntimeResetParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("resetRuntime");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
function normalizeOperationalRouteStrategies(operationalData) {
  return {
    ...operationalData,
    routes: normalizeRouteStrategyReferences(operationalData.routes || [])
  };
}
function normalizeServiceOrders(orders) {
  return orders.map(order => ({
    ...order,
    order_status: order.order_status || deriveServiceOrderStatus(order)
  }));
}
function deriveServiceOrderStatus(order) {
  if (order.trip_id || order.matched_robotaxi_id) return "ON_THE_WAY_PICKUP";
  if (order.estimated_pricing_decision_id || order.estimated_price || order.quoted_price) return "WAITING_ROBOTAXI_CALL";
  return "WAITING_PRICE_ESTIMATE";
}
function normalizeRouteStrategyReferences(items) {
  return items.map(item => ({
    ...item,
    route_strategy_id: normalizeRouteStrategyId(item.route_strategy_id),
    route_history: Array.isArray(item.route_history) ? normalizeRouteStrategyReferences(item.route_history) : item.route_history
  }));
}
function normalizeRouteStrategyId(routeStrategyId) {
  return legacyRouteStrategyIdMap[routeStrategyId] || routeStrategyId || null;
}
function saveRuntimeSnapshot(snapshot) {
  if (typeof window === "undefined") return;
  const storedSnapshot = {
    ...snapshot,
    taskSequence,
    deploymentRouteSequence,
    serviceRouteSequence,
    routePlanningRunSequence,
    demandSimulationRunSequence,
    serviceOrderSequence,
    pricingStrategyRunSequence,
    pricingDecisionSequence,
    orderMatchingRunSequence,
    orderMatchingDecisionSequence,
    tripSequence,
    eventSequence,
    simulationPolicies: snapshot.simulationPolicies || [],
    workflowTimingProfiles: snapshot.workflowTimingProfiles || [],
    businessTimingCalculationRuns: snapshot.businessTimingCalculationRuns || [],
    costModelProfiles: snapshot.costModelProfiles || [],
    costCalculationRuns: snapshot.costCalculationRuns || [],
    costRecords: snapshot.costRecords || [],
    revenueCalculationRuns: snapshot.revenueCalculationRuns || [],
    revenueRecords: snapshot.revenueRecords || [],
    simulationRuns: snapshot.simulationRuns || [],
    simulationEvents: [],
    timedOperations: snapshot.timedOperations || []
  };
  persistRuntimeSnapshot(storedSnapshot);
  try {
    window.localStorage.setItem(runtimeStorageKey, JSON.stringify({
      runtime_snapshot_in_indexed_db: true,
      activePage: snapshot.activePage,
      workspacePages: snapshot.workspacePages,
      detailCollapsedByPage: snapshot.detailCollapsedByPage,
      pageSelections: snapshot.pageSelections,
      pageUiState: snapshot.pageUiState,
      simulationPolicies: [],
      simulationRuns: [],
      simulationEvents: [],
      timedOperations: [],
      costModelProfiles: [],
      costCalculationRuns: [],
      costRecords: [],
      revenueCalculationRuns: [],
      revenueRecords: []
    }));
  } catch (error) {
    // Local persistence is a convenience for this prototype; runtime should continue if storage is unavailable.
  }
}
async function loadPersistedRuntimeSnapshot() {
  if (typeof indexedDB === "undefined") return null;
  try {
    const database = await openRuntimeSnapshotDatabase();
    return await runRuntimeStoreRequest(database, "readonly", store => store.get(runtimeStorageKey));
  } catch (error) {
    return null;
  }
}
async function persistRuntimeSnapshot(snapshot) {
  if (typeof indexedDB === "undefined") return;
  try {
    const database = await openRuntimeSnapshotDatabase();
    await runRuntimeStoreRequest(database, "readwrite", store => store.put(snapshot, runtimeStorageKey));
  } catch (error) {
    // Runtime continues in memory when persistent snapshot storage is unavailable.
  }
}
async function clearPersistedRuntimeSnapshot() {
  if (typeof indexedDB === "undefined") return;
  try {
    const database = await openRuntimeSnapshotDatabase();
    await runRuntimeStoreRequest(database, "readwrite", store => store.clear());
  } catch (error) {
    // In-memory reset remains authoritative.
  }
}
function openRuntimeSnapshotDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(runtimeSnapshotDbName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(runtimeSnapshotStoreName)) {
        database.createObjectStore(runtimeSnapshotStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function runRuntimeStoreRequest(database, mode, createRequest) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(runtimeSnapshotStoreName, mode);
    const request = createRequest(transaction.objectStore(runtimeSnapshotStoreName));
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}
function mergeSimulationEvents(current, persisted) {
  const byId = new Map();
  [...current, ...persisted].forEach(event => {
    const id = `${event.simulation_run_id || "run"}:${event.simulation_event_id || event.created_at}`;
    if (!byId.has(id)) byId.set(id, event);
  });
  return [...byId.values()].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}
async function loadPersistedSimulationEvents() {
  if (typeof indexedDB === "undefined") return [];
  try {
    const database = await openSimulationEventDatabase();
    const records = await runEventStoreRequest(database, "readonly", store => store.getAll());
    const events = records.map(record => record.event).filter(Boolean);
    events.forEach(event => persistedSimulationEventIds.add(getSimulationEventStorageId(event)));
    return events;
  } catch (error) {
    return [];
  }
}
async function persistSimulationEvents(events) {
  if (typeof indexedDB === "undefined" || !events.length) return;
  const pendingEvents = events.filter(event => !persistedSimulationEventIds.has(getSimulationEventStorageId(event)));
  if (!pendingEvents.length) return;
  try {
    const database = await openSimulationEventDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(simulationEventStoreName, "readwrite");
      const store = transaction.objectStore(simulationEventStoreName);
      pendingEvents.forEach(event => store.put({
        storage_id: getSimulationEventStorageId(event),
        event
      }));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    pendingEvents.forEach(event => persistedSimulationEventIds.add(getSimulationEventStorageId(event)));
  } catch (error) {
    // Runtime continues in memory when persistent event storage is unavailable.
  }
}
async function clearPersistedSimulationEvents() {
  persistedSimulationEventIds.clear();
  if (typeof indexedDB === "undefined") return;
  try {
    const database = await openSimulationEventDatabase();
    await runEventStoreRequest(database, "readwrite", store => store.clear());
  } catch (error) {
    // In-memory reset remains authoritative.
  }
}
function openSimulationEventDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(simulationEventDbName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(simulationEventStoreName)) {
        database.createObjectStore(simulationEventStoreName, {
          keyPath: "storage_id"
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function runEventStoreRequest(database, mode, createRequest) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(simulationEventStoreName, mode);
    const request = createRequest(transaction.objectStore(simulationEventStoreName));
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
function getSimulationEventStorageId(event) {
  return `${event.simulation_run_id || "run"}:${event.simulation_event_id || event.created_at}`;
}
function deriveSequence(items, field, prefix) {
  return items.reduce((maxValue, item) => {
    const value = String(item[field] || "");
    if (!value.startsWith(prefix)) return maxValue;
    const numberValue = Number(value.slice(prefix.length));
    return Number.isFinite(numberValue) ? Math.max(maxValue, numberValue) : maxValue;
  }, 0);
}
function restoreRuntimeSequences(snapshot) {
  taskSequence = deriveSequence(snapshot.readinessTasks || [], "task_id", "TASK-RC-");
  deploymentTaskSequence = deriveSequence(snapshot.deploymentTasks || [], "task_id", "TASK-DP-");
  routeExecutionSequence = deriveSequence(snapshot.routeExecutions || [], "route_execution_id", "REX-");
  routePlanningRunSequence = deriveSequence(snapshot.routePlanningRuns || [], "route_planning_run_id", "RPR-");
  demandSimulationRunSequence = deriveSequence(snapshot.demandSimulationRuns || [], "demand_simulation_run_id", "DSR-");
  serviceOrderSequence = deriveSequence(snapshot.serviceOrders || [], "service_order_id", "SO-");
  pricingStrategyRunSequence = deriveSequence(snapshot.pricingStrategyRuns || [], "pricing_strategy_run_id", "DPR-");
  pricingDecisionSequence = deriveSequence(snapshot.pricingDecisions || [], "pricing_decision_id", "PD-");
  orderMatchingRunSequence = deriveSequence(snapshot.orderMatchingRuns || [], "order_matching_run_id", "OMR-");
  orderMatchingDecisionSequence = deriveSequence(snapshot.orderMatchingDecisions || [], "order_matching_decision_id", "OMD-");
  tripSequence = deriveSequence(snapshot.trips || [], "trip_id", "TRIP-");
  eventSequence = deriveSequence(snapshot.taskEventLogs || [], "event_id", "EVT-");
}
function filterRecordRows(rows, columns, statusField, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  return rows.filter(row => {
    const keywordMatched = !keyword || columns.some(key => String(row[key] || "").toLowerCase().includes(keyword));
    const statusMatched = !statusField || !filters.statusValue || row[statusField] === filters.statusValue;
    const triggerMatched = !filters.triggerType || row.trigger_type === filters.triggerType;
    return keywordMatched && statusMatched && triggerMatched;
  });
}
function getOrderedStatusValues(page) {
  const registryOptions = statusRegistry?.getPageStatusOptions?.(page);
  if (registryOptions?.length) return registryOptions;
  if (page === "routePlanningRuns") return routePlanningResultOptions;
  if (page === "pricingStrategyRuns") return pricingResultOptions;
  if (page === "pricingDecisions") return pricingResultOptions;
  if (page === "orderMatchingRuns") return orderMatchingResultOptions;
  if (page === "orderMatchingDecisions") return orderMatchingResultOptions;
  if (page === "customers") return customerStatusOptions;
  return [];
}
function createStatusOptions(rows, statusField, orderedValues = [], statusContext = null) {
  if (!statusField) return [];
  const values = orderedValues.length > 0 ? orderedValues : rows.map(row => row[statusField]).filter(Boolean);
  return [...new Set(values)].map(value => ({
    value,
    label: getStatusDisplayValue(statusField, value, rows.find(row => row[statusField] === value) || {
      status_context: statusContext
    }),
    count: rows.filter(row => row[statusField] === value).length
  })).filter(item => item.count > 0 || orderedValues.includes(item.value));
}
function getOpenKeysForPage(pageKey) {
  if (pageKey === "console") return [];
  const parentKeys = [];
  pageGroups.forEach(group => {
    group.children?.forEach(item => {
      if (item.key === pageKey) parentKeys.push(group.key);
      item.children?.forEach(child => {
        if (child.key === pageKey) parentKeys.push(group.key, item.key);
      });
    });
  });
  return parentKeys;
}
function getRootMenuKey(key) {
  if (pageGroups.some(group => group.key === key)) return key;
  const parentKeys = getOpenKeysForPage(key);
  return parentKeys[0] || key;
}
