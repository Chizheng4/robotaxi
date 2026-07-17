const { useEffect, useMemo, useRef, useState } = React;
const { Button, Descriptions, Dropdown, Empty, Input, Layout, Menu, Modal, Popover, Select, Space, Table, Tabs, Tag, Typography } = antd;
const { Sider, Content } = Layout;
const { Text } = Typography;

let initializeMapSpace;
let validateMapSpace;
let initializeOperationsCenter;
let initializeCustomers;
let initializeDemandSimulation;
let initializeSupplyManagement;
let initializeSpatialBusinessProfiles;
let normalizeDemandProfiles;
let splitDemandProfilesByTarget;
let updateDemandProfileConfig;
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
let businessActionService;
let businessTimingCalculator;
let costModelCalculator;
let revenueCalculator;
let metricCalculator;
let operatingDataPoolService;
let simulationRunBusinessScope;
let statusRegistry;
let routePlanningStrategies;
let timedOperationDiagnostics;
let fleetOperationTaskService;
let robotaxiTaskPriorityService;
let fleetOperationPolicyService;
let fleetOperationDispatchService;
let taskDispatchStrategyService;
let robotaxiTaskPlanningService;
let businessPlanningService;
let operatingPlanningService;
let supplyDemandBalanceService;
let publicDemoBootstrapService;
let platformExperience;
let releaseFreshnessService;
let robotaxiMapProjection;
let responsiveViewport;
let spatialCatalogService;
let mapSceneService;
let pageContextService;
let dataChartService;
let metricObjectPresentationService;
let navigationRegistry;
let pageArchitectureRegistry;
let operatingModelService;
let decisionControlService;
let releaseHistory = [];
let projectReadmeService;
let taskSequence = 0;
let fleetOperationTaskSequence = 0;
let fleetOperationPolicyRunSequence = 0;
let fleetOperationPolicyResultSequence = 0;
    // taskPriorityConfig has no sequence counter
let fleetOperationDispatchRunSequence = 0;
let fleetOperationDispatchDecisionSequence = 0;
let taskDispatchRunSequence = 0;
let taskDispatchResultSequence = 0;
let taskPlanningRunSequence = 0;
let taskPlanningResultSequence = 0;
let longTermDemandForecastRunSequence = 0;
let longTermDemandForecastResultSequence = 0;
let supplyDecisionRunSequence = 0;
let shortTermDemandForecastRunSequence = 0;
let shortTermDemandForecastResultSequence = 0;
let deploymentDecisionRunSequence = 0;
let deploymentPlanSequence = 0;
let supplyPlanSequence = 0;
let productionBatchSequence = 0;
let fleetAllocationRunSequence = 0;
let fleetAllocationResultSequence = 0;
let supplyDemandBalanceRunSequence = 0;
let supplyDemandBalanceResultSequence = 0;
let robotaxiDeliveryOrderSequence = 0;
let producedRobotaxiSequence = 0;
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
let manualBusinessActionSequence = 0;

const unfinishedTaskStatuses = new Set([
  "WAITING_ASSIGNMENT",
  "WAITING_CHECK",
  "CHECKING",
]);

const DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM = 0.16;

const unfinishedDeploymentStatuses = new Set([
  "WAITING_ROUTE",
  "WAITING_START",
  "MOVING",
  "ARRIVED",
  "ARRIVAL_ABNORMAL",
]);

let pageGroups = [];
let menuGroupIcons = {};
const hiddenWorkspacePages = new Set([
  "simulationEvents",
  "costCalculationRuns",
  "revenueCalculationRuns",
  "costModelProfiles",
  "taskPriorityConfig",
  "taskDispatchStrategies",
  "taskDispatchRuns",
  "taskDispatchResults",
  "placeDemandProfiles",
  "serviceAreaDemandProfiles",
  "zoneDemandProfiles",
  "supplyDemandBalanceStrategies",
  "supplyDemandBalanceRuns",
  "supplyDemandBalanceResults",
]);

const tableConfig = {
  operatingModel: {
    title: "经营模型",
    description: "统一展示需求、供给、服务、资产、财务和经营反馈之间的经营结构。",
    columns: ["operating_model_id", "operating_model_name", "operating_model_status", "operating_model_version", "model_description", "updated_at"],
  },
  decisionCenter: {
    title: "决策中心",
    description: "统一观察跨价值流策略能力、执行、结果、异常和经营效果。",
    columns: ["decision_capability_name", "value_stream_name", "strategy_count", "active_strategy_count", "run_count", "decision_result_count", "decision_exception_count", "decision_execution_success_rate", "latest_run_at"],
  },
  maps: {
    title: "地图管理",
    description: "地图是 Robotaxi 运营模拟中的空间容器。",
    columns: ["map_id", "map_name", "map_width_m", "map_height_m", "cell_size_m", "grid_cols", "grid_rows", "total_cells", "coordinate_type"],
  },
  cells: {
    title: "网格单元管理",
    description: "网格单元是地图的最小空间单元，用于表达基础空间事实。",
    columns: ["cell_id", "row", "col", "base_cell_type", "traversable"],
  },
  roads: {
    title: "道路管理",
    description: "道路用于表达完整道路语义，由多个道路片段组成。",
    columns: ["road_id", "road_name", "road_type", "road_status", "road_segment_ids"],
  },
  roadNodes: {
    title: "道路节点管理",
    description: "道路节点是道路网络中的连接点。",
    columns: ["road_node_id", "cell_id", "row", "col", "node_type", "node_status"],
  },
  roadSegments: {
    title: "道路片段管理",
    description: "道路片段是道路网络的最小计算和通行单元。",
    columns: ["road_segment_id", "road_id", "start_node_id", "end_node_id", "cell_sequence", "direction", "allowed_direction", "segment_status", "distance_m", "total_distance_km", "service_area_ids"],
  },
  places: {
    title: "地点管理",
    description: "地点表示会产生出行需求的建筑或土地使用区域。",
    columns: ["place_id", "place_name", "place_type", "demand_weight", "peak_pattern", "nearby_service_area_ids", "cell_count"],
  },
  serviceAreas: {
    title: "服务区管理",
    description: "服务区是 Robotaxi 可服务、可停靠、可待命的道路服务区域。",
    columns: ["service_area_id", "service_area_name", "service_area_type", "service_area_status", "road_segment_ids", "pickup_cell_ids", "dropoff_cell_ids", "temp_stop_cell_ids", "parking_cell_ids", "standby_cell_ids", "capacity", "current_robotaxi_count"],
  },
  zones: {
    title: "运营区域管理",
    description: "运营区域用于经营统计和管理。",
    columns: ["zone_id", "parent_zone_id", "zone_name", "zone_level", "zone_type", "zone_status", "cell_count", "place_ids", "service_area_ids"],
  },
  demandProfiles: {
    title: "需求画像",
    description: "需求画像统一展示地点、服务区和区域画像记录，用于经营规划中的长期需求预测和供给规划。",
    columns: [
      "target_object_type",
      "target_object_name",
      "baseline_addressable_daily_orders",
      "baseline_peak_hour_orders",
      "place_period_growth_rate",
      "zone_period_growth_rate",
      "effective_daily_capacity",
      "effective_peak_hour_capacity",
      "waiting_robotaxi_capacity",
      "profile_status",
      "calculated_at",
    ],
  },
  businessTargets: {
    title: "经营目标",
    description: "经营目标定义预测周期、期末订单目标、Robotaxi 规模约束和基础经济假设。",
    columns: ["business_target_id", "target_name", "target_status", "forecast_start_date", "forecast_end_date", "forecast_period_unit", "forecast_period_count", "target_zone_ids", "target_end_daily_orders", "target_minimum_robotaxi_quantity", "target_task_utilization_rate", "target_order_fulfillment_rate", "planning_mode", "updated_at"],
  },
  supplyProductionProfiles: {
    title: "生产画像",
    description: "生产画像描述企业自有生产形成 Robotaxi 供给能力的约束、产能和节奏。",
    columns: ["profile_id", "profile_name", "profile_status", "production_lead_time_days", "production_capacity_period_unit", "production_capacity_per_period", "ramp_up_periods", "ramp_up_capacity_ratios", "quality_inspection_lead_time_days", "delivery_capacity_per_period", "effective_from", "effective_to"],
  },
  placeDemandProfiles: {
    title: "地点需求画像",
    description: "地点需求画像描述 Place 的需求产生能力，配置后用于区域画像和需求预测。",
    columns: ["profile_id", "place_id", "profile_status", "resident_population", "working_population", "daily_visitors", "trip_generation_rate", "demand_weight", "peak_pattern", "growth_rate", "robotaxi_adoption_rate", "effective_from", "effective_to"],
  },
  serviceAreaDemandProfiles: {
    title: "服务区需求画像",
    description: "服务区需求画像描述服务区域的上车、下车、等待和周转能力。",
    columns: ["profile_id", "service_area_id", "profile_status", "pickup_probability", "dropoff_probability", "peak_demand_ratio", "service_capacity", "waiting_capacity", "turnover_capacity", "effective_from", "effective_to"],
  },
  zoneDemandProfiles: {
    title: "区域需求画像",
    description: "区域需求画像由地点和服务区画像计算得到，用于供给规划和运营投放判断。",
    columns: ["profile_id", "zone_id", "profile_status", "potential_demand", "expected_robotaxi_demand", "peak_hour_demand", "growth_factor", "supply_need_score", "calculated_at"],
  },
  routes: {
    title: "路径规划结果",
    description: "路径规划结果是路径规划策略执行后生成的 Route，可供运营行驶记录或履约行驶记录引用。",
    columns: ["route_id", "route_version", "route_usage_type", "route_strategy_id", "route_planning_run_id", "task_id", "service_order_id", "trip_id", "route_execution_id", "robotaxi_id", "origin_cell_id", "target_cell_id", "road_segment_sequence", "route_step_count", "total_distance_km", "total_distance_m", "route_status", "failure_reason"],
  },
  customers: {
    title: "客户管理",
    description: "客户是服务订单的需求发起主体，当前位置由订单创建时动态生成。",
    columns: ["customer_id", "customer_name", "customer_type", "default_order_channel", "customer_status", "created_at"],
  },
  demandSimulationStrategies: {
    title: "需求模拟策略",
    description: "需求模拟策略用于生成客户、需求位置、上车点和下车点上下文。",
    columns: ["demand_simulation_strategy_id", "strategy_name", "strategy_type", "simulation_algorithm", "location_type_weights", "strategy_status", "demand_simulation_run_count"],
  },
  demandSimulationRuns: {
    title: "需求模拟执行",
    description: "记录每次需求模拟策略执行过程。",
    columns: ["demand_simulation_run_id", "simulation_result", "demand_simulation_strategy_id", "order_channel", "customer_id", "customer_origin_location_type", "customer_origin_cell_id", "pickup_service_area_id", "pickup_cell_id", "dropoff_service_area_id", "dropoff_cell_id", "failure_reason", "created_at"],
  },
  demandSimulationResults: {
    title: "需求模拟结果",
    description: "需求模拟结果是策略执行后返回给服务订单创建流程的订单上下文。",
    columns: ["demand_simulation_result_id", "simulation_result", "demand_simulation_run_id", "demand_simulation_strategy_id", "order_channel", "customer_id", "customer_origin_location_type", "customer_origin_cell_id", "pickup_service_area_id", "pickup_cell_id", "dropoff_service_area_id", "dropoff_cell_id", "failure_reason", "created_at"],
  },
  serviceOrders: {
    title: "服务订单管理",
    description: "服务订单记录客户发起的出行服务需求，当前支持创建、定价和车辆匹配。",
    columns: ["service_order_id", "order_status", "assignment_status", "assignment_attempt_count", "assignment_remaining_seconds", "order_channel", "customer_id", "demand_simulation_result_id", "customer_origin_cell_id", "pickup_cell_id", "dropoff_cell_id", "price_estimation_route_id", "estimated_pricing_decision_id", "final_pricing_decision_id", "estimated_distance_km", "estimated_duration_min", "estimated_price", "final_price", "trip_id", "trip_total_distance_km", "trip_total_duration_min", "trip_distance_traveled_km", "trip_distance_remaining_km", "matched_robotaxi_id", "matched_robotaxi_location_summary", "order_matching_decision_id", "payment_status", "created_at", "simulation_created_at"],
  },
  opsCenters: {
    title: "运营中心管理",
    description: "运营中心是 Robotaxi 进入运营闭环的供给侧设施。",
    columns: ["ops_center_id", "ops_center_name", "place_id", "map_id", "cell_ids", "service_area_ids", "capacity", "ops_center_status"],
  },
  workers: {
    title: "作业人员管理",
    description: "作业人员是运营中心内部的人工运维资源，当前仅初始化检查作业能力。",
    columns: ["worker_id", "ops_center_id", "worker_name", "worker_role", "worker_status", "current_task_id", "current_task_type", "current_task_status", "time_per_robotaxi", "max_robotaxi_per_day"],
  },
  readinessTasks: {
    title: "运营准入任务",
    description: "用于将待检查 Robotaxi 转化为可运营车辆的准入任务单。",
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "worker_id", "check_result", "issue_type", "created_at", "simulation_created_at"],
  },
  longTermDemandForecasts: {
    title: "需求预测结果",
    description: "需求预测结果记录长期需求预测策略执行后形成的区域 Robotaxi 需求和供给缺口。",
    columns: ["forecast_result_id", "forecast_name", "forecast_status", "forecast_period_unit", "forecast_period_count", "zone_id", "market_forecast_daily_orders", "target_end_daily_orders", "planned_daily_orders", "required_robotaxi_quantity", "effective_current_robotaxi", "robotaxi_gap_quantity", "planned_production_quantity", "uncovered_robotaxi_gap", "requirement_driver", "data_quality_level", "created_at"],
  },
  longTermDemandForecastStrategies: {
    title: "需求预测策略",
    description: "需求预测策略定义经营目标、需求画像和生产画像如何转化为长期 Robotaxi 需求预测。",
    columns: ["forecast_strategy_id", "strategy_name", "strategy_status", "strategy_version", "target_zone_ids", "growth_scenario", "growth_model", "growth_adjustment_rate", "demand_buffer_ratio", "operational_availability_rate", "robotaxi_available_hours_per_day", "average_pickup_duration_min", "average_trip_duration_min", "average_turnaround_duration_min", "updated_at"],
  },
  longTermDemandForecastRuns: {
    title: "需求预测执行",
    description: "需求预测执行记录一次长期需求预测策略运行的输入、配置快照和执行状态。",
    columns: ["forecast_run_id", "forecast_strategy_id", "business_target_id", "supply_production_profile_id", "strategy_version", "run_status", "target_zone_ids", "forecast_period_unit", "forecast_period_count", "forecast_start_date", "forecast_end_date", "started_at", "completed_at", "result_count", "failure_reason"],
  },
  supplyDecisionStrategies: {
    title: "供应决策策略",
    description: "依据长期需求预测和生产画像，决定各区域的生产数量与交付节奏。",
    columns: ["supply_decision_strategy_id", "strategy_name", "strategy_status", "strategy_version", "decision_algorithm", "demand_coverage_rate", "safety_capacity_ratio", "capacity_constraint_mode", "updated_at"],
  },
  supplyDecisionRuns: {
    title: "供应决策执行",
    description: "记录供应决策的输入、执行状态及其直接形成的生产计划。",
    columns: ["supply_decision_run_id", "supply_decision_strategy_id", "forecast_result_id", "run_status", "supply_plan_id", "started_at", "completed_at", "failure_reason"],
  },
  supplyPlans: {
    title: "生产计划",
    description: "生产计划把需求预测结果转化为自有生产的 Robotaxi 数量和交付节奏。",
    columns: ["supply_plan_id", "plan_name", "plan_status", "forecast_result_id", "target_zone_id", "planned_robotaxi_count", "fleet_gap_quantity", "feasible_production_quantity", "production_gap_quantity", "production_lead_time_days", "planned_start_date", "planned_end_date", "created_at"],
  },
  productionBatches: {
    title: "生产批次",
    description: "生产批次记录自有工厂生产 Robotaxi 的执行过程，完成后形成具体 Robotaxi 资产。",
    columns: ["production_batch_id", "batch_name", "batch_status", "supply_plan_id", "target_zone_id", "planned_robotaxi_count", "produced_robotaxi_count", "produced_robotaxi_ids", "production_started_at", "production_completed_at", "created_at"],
  },
  fleetAllocationStrategies: {
    title: "交付编排策略",
    description: "交付编排策略依据生产计划确定的区域和数量，选择具体 Robotaxi、运营中心与交付批次。",
    columns: ["fleet_allocation_strategy_id", "strategy_name", "strategy_status", "strategy_version", "allocation_algorithm", "target_zone_ids", "target_ops_center_ids", "urgency_weight", "demand_gap_weight", "production_ready_weight", "max_robotaxi_per_delivery_order", "created_at", "updated_at"],
  },
  fleetAllocationRuns: {
    title: "交付编排执行",
    description: "记录每次交付编排的输入、策略快照和结果数量。",
    columns: ["fleet_allocation_run_id", "fleet_allocation_strategy_id", "strategy_version", "run_status", "target_zone_ids", "target_ops_center_ids", "started_at", "completed_at", "result_count", "failure_reason"],
  },
  fleetAllocationResults: {
    title: "交付编排结果",
    description: "按生产计划、目标区域和运营中心记录具体 Robotaxi 列表，可用于创建交付单。",
    columns: ["fleet_allocation_result_id", "fleet_allocation_run_id", "result_status", "target_zone_id", "target_ops_center_id", "supply_plan_id", "allocated_quantity", "allocated_robotaxi_ids", "candidate_robotaxi_ids", "created_at"],
  },
  robotaxiDeliveryOrders: {
    title: "区域交付",
    description: "区域交付是一张把待交付 Robotaxi 交付到区域分配目标运营区域的批次单，完成后逐车触发运营准入任务。",
    columns: ["delivery_order_id", "delivery_order_name", "delivery_status", "fleet_allocation_result_id", "target_zone_id", "target_ops_center_id", "robotaxi_count", "robotaxi_ids", "delivered_robotaxi_ids", "readiness_task_ids", "created_at", "delivery_completed_at"],
  },
  supplyOrders: {
    title: "供给单",
    description: "供给单用于记录 Robotaxi 供给获取过程，当前为未来对象占位。",
    columns: ["supply_order_id", "supply_plan_id", "supply_source_type", "supplier_id", "ordered_robotaxi_count", "delivered_robotaxi_count", "order_status", "created_at"],
  },
  dealerSupplies: {
    title: "车商供给",
    description: "车商供给管理合作车商或车厂作为 Robotaxi 供应来源的基础信息。",
    columns: ["dealer_supply_id", "dealer_name", "dealer_status", "supported_model_names", "monthly_supply_capacity", "quality_rating", "created_at"],
  },
  ownerSupplies: {
    title: "车主供给",
    description: "车主供给管理具备自动驾驶能力的私家车车主作为网络化供给来源的信息。",
    columns: ["owner_supply_id", "owner_name", "owner_status", "vehicle_count", "qualified_vehicle_count", "service_area_ids", "created_at"],
  },
  cleaningTasks: {
    title: "清洁任务",
    description: "用于将 Robotaxi 从需要清洁状态恢复到可运营状态。",
    columns: ["task_id", "task_status", "trigger_type", "trigger_source", "trigger_object_type", "trigger_object_id", "fleet_operation_policy_run_id", "robotaxi_id", "robotaxi_current_location_summary", "origin_cell_id", "origin_location_summary", "target_ops_center_id", "target_cell_id", "target_location_summary", "route_execution_id", "worker_id", "clean_level_before", "clean_level_after", "pending_since_at", "operation_created_at", "operation_completed_at"],
  },
  chargingTasks: {
    title: "充电任务",
    description: "用于将 Robotaxi 从低电量或计划补能状态恢复到可运营电量状态。",
    columns: ["task_id", "task_status", "trigger_type", "trigger_source", "trigger_object_type", "trigger_object_id", "fleet_operation_policy_run_id", "robotaxi_id", "robotaxi_current_location_summary", "origin_cell_id", "origin_location_summary", "target_ops_center_id", "target_cell_id", "target_location_summary", "route_execution_id", "worker_id", "charger_id", "robotaxi_current_battery_kwh", "robotaxi_battery_capacity_kwh", "charged_energy_kwh", "battery_percent_before", "target_battery_percent", "battery_percent_after", "charging_started_at", "charging_completed_at"],
  },
  maintenanceTasks: {
    title: "维修任务",
    description: "用于处理 Robotaxi 硬件、软件、传感器、电池、轮胎等维修事项。",
    columns: ["task_id", "task_status", "trigger_type", "trigger_source", "trigger_object_type", "trigger_object_id", "fleet_operation_policy_run_id", "robotaxi_id", "robotaxi_current_location_summary", "origin_cell_id", "origin_location_summary", "maintenance_type", "target_ops_center_id", "target_cell_id", "target_location_summary", "route_execution_id", "worker_id", "repair_result", "requires_readiness_check", "pending_since_at", "operation_completed_at"],
  },
  failureHandlingTasks: {
    title: "故障处理",
    description: "用于确认、分级和处置 Robotaxi 故障事件。",
    columns: ["task_id", "task_status", "trigger_type", "trigger_source", "trigger_object_type", "trigger_object_id", "fleet_operation_policy_run_id", "robotaxi_id", "robotaxi_current_location_summary", "origin_cell_id", "origin_location_summary", "target_ops_center_id", "target_cell_id", "target_location_summary", "route_execution_id", "worker_id", "failure_type", "failure_severity", "allow_current_service_completion", "diagnosis_result", "disposition_result", "maintenance_task_id", "retirement_task_id"],
  },
  retirementTasks: {
    title: "退役任务",
    description: "用于将 Robotaxi 从运营系统中永久移除并沉淀资产退出结果。",
    columns: ["task_id", "task_status", "trigger_type", "trigger_source", "trigger_object_type", "trigger_object_id", "fleet_operation_policy_run_id", "robotaxi_id", "robotaxi_current_location_summary", "origin_cell_id", "origin_location_summary", "retirement_reason", "approval_status", "target_ops_center_id", "target_cell_id", "target_location_summary", "route_execution_id", "worker_id", "asset_exit_result", "operation_created_at", "operation_completed_at"],
  },
  fleetOperationPolicies: {
    title: "运维策略配置",
    description: "配置清洁、充电、维修、故障处理和退役任务的触发参数。",
    columns: ["fleet_operation_policy_id", "policy_name", "policy_type", "target_task_type", "policy_status", "policy_version", "execution_scope", "low_peak_start_time", "low_peak_end_time", "service_order_count_threshold", "service_duration_minutes_threshold", "battery_percent_threshold", "maintenance_due_days_threshold", "failure_severity_threshold", "retirement_score_threshold", "updated_at"],
  },
  fleetOperationPolicyRuns: {
    title: "运维策略执行",
    description: "记录每次运维策略扫描、候选车辆、生成任务和配置快照。",
    columns: ["fleet_operation_policy_run_id", "fleet_operation_policy_id", "policy_type", "target_task_type", "run_status", "trigger_type", "generated_task_count", "skipped_robotaxi_count", "candidate_robotaxi_ids", "generated_task_ids", "no_action_reason", "result_summary", "started_at", "completed_at"],
  },
  fleetOperationPolicyResults: {
    title: "运维策略结果",
    description: "按单车记录每次运维策略执行的生成、跳过和失败结果，便于复盘策略是否准确命中 Robotaxi。",
    columns: ["fleet_operation_policy_result_id", "fleet_operation_policy_run_id", "fleet_operation_policy_id", "policy_type", "target_task_type", "robotaxi_id", "result_status", "result_reason", "task_id", "task_type", "robotaxi_snapshot", "created_at"],
  },
  fleetOperationDispatchStrategies: {
    title: "运维调度策略",
    description: "配置运维任务的目的地调度规则。",
    columns: ["fleet_operation_dispatch_strategy_id", "strategy_name", "dispatch_algorithm", "strategy_status", "created_at"],
  },
  fleetOperationDispatchRuns: {
    title: "运维调度执行",
    description: "记录每次运维调度策略的执行过程。",
    columns: ["fleet_operation_dispatch_run_id", "fleet_operation_dispatch_strategy_id", "task_id", "task_type", "robotaxi_id", "origin_cell_id", "run_status", "decision_count", "created_at"],
  },
  fleetOperationDispatchDecisions: {
    title: "运维调度结果",
    description: "记录每次运维调度的目标选择、距离和失败原因。",
    columns: ["fleet_operation_dispatch_decision_id", "fleet_operation_dispatch_run_id", "fleet_operation_dispatch_strategy_id", "task_id", "task_type", "robotaxi_id", "selected_ops_center_id", "target_cell_id", "decision_result", "distance_m", "total_distance_km", "reason", "created_at"],
  },
  taskDispatchStrategies: {
    title: "任务调度策略",
    description: "配置 Robotaxi 释放后的订单、投放任务和排队运维任务选择规则。",
    columns: ["task_dispatch_strategy_id", "strategy_name", "dispatch_algorithm", "strategy_status", "fleet_operation_priority", "service_order_priority", "deployment_task_priority", "created_at", "updated_at"],
  },
  robotaxiTaskPlanningStrategies: {
    title: "任务规划策略",
    description: "配置单台 Robotaxi 在不同综合状态下能否接收、排队、拒绝或执行任务。",
    columns: ["robotaxi_task_planning_strategy_id", "strategy_name", "planning_algorithm", "strategy_status", "priority_rank", "queue_policy", "phase_rules", "compatibility_rules", "failure_trigger_policy", "external_assignment_queue_policy", "created_at", "updated_at"],
  },
  robotaxiTaskPlanningRuns: {
    title: "任务规划执行",
    description: "记录真实业务触发时任务规划策略的执行过程；页面刷新和按钮预览不生成执行记录。",
    columns: ["robotaxi_task_planning_run_id", "robotaxi_task_planning_strategy_id", "strategy_name", "robotaxi_id", "requested_assignment_type", "requested_task_type", "trigger_source", "trigger_object_type", "trigger_object_id", "run_status", "planning_decision", "decision_reason", "output_snapshot", "created_at"],
  },
  robotaxiTaskPlanningResults: {
    title: "任务规划结果",
    description: "记录任务规划策略对单次 Robotaxi 候选的允许、排队或拒绝结果。",
    columns: ["robotaxi_task_planning_result_id", "robotaxi_task_planning_run_id", "robotaxi_task_planning_strategy_id", "robotaxi_id", "requested_assignment_type", "requested_task_type", "decision_result", "planning_decision", "decision_reason", "queue_sequence", "queue_entry", "queue_snapshot", "message", "created_at"],
  },
  taskDispatchRuns: {
    title: "任务调度执行",
    description: "记录每次任务调度策略执行过程和选中候选。",
    columns: ["task_dispatch_run_id", "task_dispatch_strategy_id", "strategy_name", "robotaxi_id", "trigger_object_type", "trigger_object_id", "run_status", "candidate_count", "selected_candidate_type", "selected_object_id", "no_action_reason", "created_at"],
  },
  taskDispatchResults: {
    title: "任务调度结果",
    description: "按候选对象记录任务调度策略的选择、跳过和无候选原因。",
    columns: ["task_dispatch_result_id", "task_dispatch_run_id", "task_dispatch_strategy_id", "robotaxi_id", "candidate_type", "candidate_object_id", "candidate_status", "candidate_priority", "decision_result", "decision_reason", "created_at"],
  },
  taskPriorityConfig: {
    title: "任务优先级调度配置",
    description: "配置 Robotaxi 运维任务之间的优先级、中断和排队策略。",
    columns: ["config_id", "config_status", "priority_rank", "interrupt_policy", "allow_queuing", "max_queue_size"],
  },
  deploymentTasks: {
    title: "运营投放任务",
    description: "用于将可运营 Robotaxi 投放到指定服务区或待命位置。",
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "origin_cell_id", "planned_target_cell_id", "target_cell_id", "actual_target_cell_id", "arrival_behavior", "blocked_handling_policy", "arrival_execution_result", "planned_target_service_area_id", "target_service_area_id", "actual_target_service_area_id", "route_id", "route_strategy_id", "route_summary", "created_at", "simulation_created_at"],
  },
  shortTermDemandForecastStrategies: {
    title: "短期需求预测策略",
    description: "基于需求画像、历史订单、近期趋势和日期类型预测短期需求。",
    columns: ["short_term_forecast_strategy_id", "strategy_name", "strategy_status", "strategy_version", "forecast_horizon_value", "forecast_horizon_unit", "time_bucket_unit", "recent_window_days", "profile_weight", "historical_weight", "recent_trend_weight", "updated_at"],
  },
  shortTermDemandForecastRuns: {
    title: "短期需求预测执行",
    description: "记录一次短期需求预测的时间窗口、输入快照和结果数量。",
    columns: ["short_term_forecast_run_id", "short_term_forecast_strategy_id", "run_status", "forecast_start_at", "forecast_end_at", "time_bucket_unit", "target_zone_ids", "result_count", "started_at", "completed_at", "failure_reason"],
  },
  shortTermDemandForecastResults: {
    title: "短期需求预测结果",
    description: "按时间粒度和空间对象记录预测订单量及置信区间。",
    columns: ["short_term_forecast_result_id", "short_term_forecast_run_id", "forecast_status", "target_object_type", "target_object_name", "target_zone_id", "forecast_bucket_start_at", "forecast_bucket_end_at", "time_bucket_unit", "predicted_order_count", "predicted_order_lower_bound", "predicted_order_upper_bound", "data_quality_level", "forecast_method", "created_at"],
  },
  deploymentDecisionStrategies: {
    title: "投放决策策略",
    description: "结合短期需求、当前供给和经济性，决定各服务区域的投放数量与优先级。",
    columns: ["deployment_decision_strategy_id", "strategy_name", "strategy_status", "strategy_version", "decision_algorithm", "target_utilization_rate", "average_fulfillment_duration_min", "average_fulfillment_cost_per_order", "demand_weight", "supply_gap_weight", "service_pressure_weight", "profit_weight", "updated_at"],
  },
  deploymentDecisionRuns: {
    title: "投放决策执行",
    description: "记录投放决策使用的预测执行、车辆快照和计划数量。",
    columns: ["deployment_decision_run_id", "deployment_decision_strategy_id", "short_term_forecast_run_id", "run_status", "plan_count", "started_at", "completed_at", "failure_reason"],
  },
  deploymentPlans: {
    title: "投放计划",
    description: "投放计划是投放决策的正式输出，确认后可分解为运营投放任务。",
    columns: ["deployment_plan_id", "plan_name", "plan_status", "target_object_type", "target_object_name", "target_zone_id", "plan_start_at", "plan_end_at", "predicted_order_count", "expected_robotaxi_demand", "current_supply_quantity", "robotaxi_gap_quantity", "planned_robotaxi_count", "dispatched_robotaxi_count", "remaining_robotaxi_count", "deployment_priority_rank", "incremental_service_order_count", "expected_revenue_amount", "estimated_fulfillment_cost_amount", "estimated_deployment_cost_amount", "expected_profit_amount", "created_at"],
  },
  supplyDemandBalanceStrategies: {
    title: "供需平衡策略",
    description: "供需平衡策略用于运营阶段短期预测各区域、地点和服务区域的 Robotaxi 缺口、投放优先级和经济性。",
    columns: ["supply_demand_balance_strategy_id", "strategy_name", "strategy_status", "strategy_version", "balance_algorithm", "target_zone_ids", "forecast_window_hours", "demand_weight", "gap_weight", "urgency_weight", "profit_weight", "vehicle_service_capacity_per_hour", "default_average_order_revenue", "deployment_cost_per_km", "average_reposition_distance_km", "created_at", "updated_at"],
  },
  supplyDemandBalanceRuns: {
    title: "供需平衡执行",
    description: "供需平衡执行记录一次短期供需投放预测的输入快照、执行状态和结果数量。",
    columns: ["supply_demand_balance_run_id", "supply_demand_balance_strategy_id", "strategy_name", "strategy_version", "balance_algorithm", "run_status", "target_zone_ids", "forecast_window_hours", "started_at", "completed_at", "result_count", "failure_reason"],
  },
  supplyDemandBalanceResults: {
    title: "供需平衡结果",
    description: "供需平衡结果按 Zone、Place 和服务区域给出 Robotaxi 缺口、需求紧迫度、投放优先级和利润测算，后续可触发投放需求单。",
    columns: ["supply_demand_balance_result_id", "supply_demand_balance_run_id", "result_status", "target_object_type", "target_object_id", "target_object_name", "target_zone_id", "forecast_window_hours", "historical_order_count", "completed_order_count", "forecast_order_count", "expected_demand_quantity", "current_supply_quantity", "robotaxi_gap_quantity", "demand_urgency_score", "deployment_priority_rank", "recommended_deployment_quantity", "expected_revenue_amount", "estimated_deployment_cost_amount", "expected_profit_amount", "profit_score", "deployment_demand_order_id", "created_at"],
  },
  routeExecutions: {
    title: "运营行驶记录",
    description: "记录 Robotaxi 执行任务时的模拟行驶过程。",
    columns: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id", "route_id", "route_strategy_id", "planned_target_cell_id", "target_cell_id", "actual_target_cell_id", "planned_target_service_area_id", "current_target_service_area_id", "actual_target_service_area_id", "arrival_execution_result", "route_summary", "current_cell_id", "current_location_summary", "current_step_index", "total_step_count", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "battery_consumed_kwh", "time_elapsed", "created_at", "simulation_created_at"],
  },
  taskEventLogs: {
    title: "任务事件日志",
    description: "记录运营准入任务的创建、分配、检查和状态反馈事件。",
    columns: ["event_id", "event_type", "event_result", "message", "service_order_id", "trip_id", "pricing_decision_id", "pricing_strategy_run_id", "task_id", "robotaxi_id", "worker_id", "route_execution_id", "created_at"],
  },
  routePlanningStrategies: {
    title: "路径规划策略",
    description: "用于管理路径规划策略对象，定义不同场景下如何生成路径。",
    columns: ["route_strategy_id", "strategy_name", "strategy_type", "planning_algorithm", "trigger_task_status", "origin_rule", "target_rule", "service_area_scope_rule", "route_generation_rule", "route_update_rule", "strategy_status", "strategy_usage_count", "route_planning_run_count"],
  },
  routePlanningRuns: {
    title: "路径规划执行",
    description: "记录每次路径规划策略执行过程。",
    columns: ["route_planning_run_id", "planning_result", "route_strategy_id", "planning_algorithm", "task_id", "service_order_id", "trip_id", "route_execution_id", "robotaxi_id", "origin_cell_id", "target_cell_id", "result_route_id", "failure_reason", "created_at"],
  },
  pricingStrategies: {
    title: "定价策略",
    description: "定价策略定义价格公式、基础价格参数和动态系数。",
    columns: ["pricing_strategy_id", "strategy_name", "strategy_type", "pricing_algorithm", "base_fare", "distance_unit_price", "time_unit_price", "dynamic_multiplier", "strategy_status", "pricing_strategy_run_count"],
  },
  pricingStrategyRuns: {
    title: "定价执行",
    description: "记录每次定价策略执行过程。",
    columns: ["pricing_strategy_run_id", "run_result", "pricing_strategy_id", "pricing_algorithm", "service_order_id", "pricing_stage", "failure_reason", "created_at"],
  },
  pricingDecisions: {
    title: "定价结果",
    description: "记录服务订单使用的价格结果。",
    columns: ["pricing_decision_id", "pricing_result", "pricing_strategy_run_id", "pricing_strategy_id", "service_order_id", "estimated_distance_km", "estimated_duration_min", "estimated_price", "fulfillment_distance_km", "fulfillment_duration_min", "base_price", "dynamic_multiplier", "final_price", "pricing_stage", "created_at"],
  },
  orderMatchingStrategies: {
    title: "订单匹配策略",
    description: "订单匹配策略定义服务订单如何选择可用 Robotaxi。",
    columns: ["order_matching_strategy_id", "strategy_name", "strategy_type", "matching_algorithm", "candidate_filter_rule", "distance_rule", "battery_rule", "scoring_rule", "min_battery_threshold", "strategy_status", "order_matching_run_count"],
  },
  orderMatchingRuns: {
    title: "订单匹配执行",
    description: "记录每次订单匹配策略执行过程。",
    columns: ["order_matching_run_id", "run_result", "order_matching_strategy_id", "matching_algorithm", "service_order_id", "pickup_cell_id", "candidate_robotaxi_count", "eligible_robotaxi_count", "selected_robotaxi_id", "failure_reason", "created_at"],
  },
  orderMatchingDecisions: {
    title: "订单匹配结果",
    description: "记录服务订单匹配 Robotaxi 的决策结果。",
    columns: ["order_matching_decision_id", "decision_result", "order_matching_run_id", "order_matching_strategy_id", "service_order_id", "selected_robotaxi_id", "selected_robotaxi_location_summary", "estimated_pickup_distance_km", "estimated_pickup_duration_min", "matching_score", "failure_reason", "created_at"],
  },
  serviceFulfillmentRecords: {
    title: "履约行驶记录",
    description: "履约行驶记录用于模拟 Robotaxi 执行客户服务订单的接驾、载客和完成过程。",
    columns: ["trip_id", "trip_status", "service_order_id", "robotaxi_id", "pickup_cell_id", "dropoff_cell_id", "current_cell_id", "trip_phase", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "battery_consumed_kwh", "time_elapsed", "route_id", "created_at", "simulation_created_at"],
  },
  robotaxis: {
    title: "Robotaxi 管理",
    description: "Robotaxi 是等待运维检查后进入运营闭环的自动驾驶车辆资产。",
    columns: ["robotaxi_id", "fleet_id", "availability_status", "motion_status", "max_range_km", "battery_capacity_kwh", "current_battery_kwh", "battery_percent", "estimated_range_km", "lifetime_distance_km", "lifetime_battery_consumed_kwh", "lifetime_charged_energy_kwh", "completed_service_order_count", "completed_cleaning_count", "completed_charging_count", "completed_maintenance_count", "current_cell_id", "location_summary", "current_task_id", "current_task_type", "current_task_status", "current_order_id", "pending_task_queue", "operation_blocking_reason"],
  },
  validations: {
    title: "初始化校验",
    description: "根据初始化规则检查生成后的运营空间数据。",
    columns: ["rule_id", "rule_name", "result", "detail"],
  },
  simulationPolicies: {
    title: "模拟规则配置",
    description: "配置模拟运行的规则参数，包括 Tick 粒度、时间段、需求分布和自动化开关。",
    columns: ["simulation_policy_id", "policy_name", "policy_status", "tick_seconds", "simulation_days", "run_speed_level", "ticks_per_real_cycle", "real_cycle_interval_ms", "random_seed"],
  },
  workflowTimingRules: {
    title: "工作流时效配置",
    description: "配置业务动作的运行时耗时，用于时间作业和业务生命周期推进。",
    columns: ["workflow_timing_rule_id", "business_object_type", "from_status", "action_type", "to_status", "transition_mode", "duration_source_type", "duration_mode", "configured_duration_seconds", "seconds_per_cell", "rule_status", "profile_version"],
  },
  costParameterRules: {
    title: "成本配置",
    description: "逐项配置距离、能源、人力、资产折旧和固定运营成本参数。",
    columns: ["cost_parameter_rule_id", "cost_parameter_name", "cost_parameter_group", "configured_value", "parameter_unit", "cost_parameter_status", "participates_in_calculation", "profile_version"],
  },
  costModelProfiles: {
    title: "成本模型配置",
    description: "成本模型配置的版本化汇总，当前隐藏在菜单中。",
    columns: ["cost_model_profile_id", "profile_name", "profile_version", "profile_status", "currency_code"],
  },
  costCalculationRuns: {
    title: "成本计算记录",
    description: "记录每次运营成本计算使用的配置快照、计算状态、生成记录数和总成本。",
    columns: ["cost_calculation_run_id", "simulation_run_id", "calculation_status", "calculation_progress_percent", "processed_object_count", "generated_cost_record_count", "total_cost_amount", "error_count", "started_at", "completed_at"],
  },
  costRecords: {
    title: "成本记录",
    description: "统一记录业务对象产生的距离、能源、人力和资产折旧成本明细。",
    columns: ["cost_record_id", "simulation_run_id", "source_object_type", "source_object_id", "cost_type", "quantity", "quantity_unit", "unit_cost", "cost_amount", "currency_code", "robotaxi_id", "worker_id", "simulation_cost_occurred_at"],
  },
  revenueRecords: {
    title: "收入记录",
    description: "从服务订单生成应收、实收和未收收入事实。",
    columns: ["revenue_record_id", "simulation_run_id", "service_order_id", "revenue_type", "revenue_amount", "currency_code", "revenue_basis_field", "simulation_revenue_occurred_at", "created_at"],
  },
  revenueCalculationRuns: {
    title: "收入生成记录",
    description: "记录每次收入记录生成的范围、状态、金额和错误。",
    columns: ["revenue_calculation_run_id", "simulation_run_id", "calculation_status", "calculation_progress_percent", "processed_object_count", "generated_revenue_record_count", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_unreceived_revenue_amount", "error_count", "started_at", "completed_at"],
  },
  operatingMetricsOverview: {
    title: "经营总览",
    description: "汇总规划基线、经营事实和关键结果，识别经营目标达成与主要偏差。",
    columns: ["metric_name_cn", "metric_value", "metric_unit", "quality_status", "quality_reason", "metric_period_label", "source_record_count"],
  },
  financialMetrics: {
    title: "财务效率",
    description: "区分变动成本、折旧和固定成本，判断经营贡献、模拟运营利润与单均经济性。",
    columns: ["metric_name_cn", "metric_value", "metric_unit", "quality_status", "quality_reason", "metric_period_label", "source_record_count"],
  },
  serviceMetrics: {
    title: "需求服务",
    description: "分析观察需求、成熟订单结果和履约效率，判断需求变化与服务能力是否匹配。",
    columns: ["metric_name_cn", "metric_value", "metric_unit", "quality_status", "quality_reason", "metric_period_label", "source_record_count"],
  },
  supplyAssetMetrics: {
    title: "供给资产",
    description: "连接生产、交付、准入与 Robotaxi 资产状态，判断供给形成和资产使用效率。",
    columns: ["metric_name_cn", "metric_domain", "metric_value", "metric_unit", "quality_status", "quality_reason", "source_record_count", "metric_period_label"],
  },
  processDiagnostics: {
    title: "经营诊断",
    description: "从服务过程、决策影响和数据质量解释经营偏差，定位需要处理的原因。",
    columns: ["metric_name_cn", "metric_domain", "metric_value", "metric_unit", "quality_status", "quality_reason", "source_record_count", "metric_period_label"],
  },
  metricDefinitions: {
    title: "指标定义",
    description: "指标定义明确经营指标的口径、公式、来源字段、窗口和质量规则。",
    columns: ["metric_definition_id", "metric_name_cn", "metric_domain", "metric_role", "measurement_type", "management_question", "calculation_formula", "display_unit", "data_readiness", "metric_status", "definition_version"],
  },
  metricCalculationRuns: {
    title: "计算记录",
    description: "记录每次经营数据更新的范围、可用结果、质量问题和建议处理方式。",
    columns: ["metric_calculation_run_id", "metric_period_label", "calculation_status", "successful_metric_count", "warning_metric_count", "failed_metric_count", "calculation_issue_summary", "recommended_action", "started_at", "completed_at"],
  },
  metricObservations: {
    title: "指标观测",
    description: "保存每个模拟运行、窗口和维度下的经营指标结果。",
    columns: ["metric_observation_id", "metric_definition_id", "metric_scope_type", "metric_period_type", "metric_period_label", "dimension_type", "dimension_id", "metric_value", "metric_unit", "quality_status", "quality_reason", "source_record_count"],
  },
  simulationRuns: {
    title: "模拟运行管理",
    description: "创建和管理运营模拟运行，查看实时进度、财务结果和指标结果。",
    columns: ["simulation_run_id", "simulation_name", "simulation_status", "cost_calculation_status", "revenue_calculation_status", "calculation_progress_percent", "total_cost_amount", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_days", "current_day", "current_time", "current_global_tick", "started_at", "completed_at"],
  },
  simulationEvents: {
    title: "模拟事件记录",
    description: "查看所有模拟运行产生的事件记录，包括触发、执行和结果。",
    columns: ["simulation_event_id", "simulation_run_id", "event_type", "event_source", "event_result", "message", "simulation_time", "global_tick"],
  },
  timedOperations: {
    title: "时间作业",
    description: "统一展示随时间推进的自动化作业，供真实自动化和模拟自动化复用。",
    columns: ["timed_operation_id", "operation_status", "operation_type", "time_mode", "object_type", "object_id", "action_type", "start_seconds", "planned_completed_seconds", "duration_seconds", "elapsed_seconds", "remaining_seconds", "progress_percent", "simulation_started_at", "simulation_planned_completed_at", "simulation_completed_at", "created_at"],
  },
};

const pageObjectType = {
  operatingModel: "operatingModel",
  decisionCenter: "decisionCapability",
  maps: "map",
  cells: "cell",
  roads: "road",
  roadNodes: "roadNode",
  roadSegments: "roadSegment",
  places: "place",
  serviceAreas: "serviceArea",
  zones: "zone",
  demandProfiles: "demandProfile",
  businessTargets: "businessTarget",
  supplyProductionProfiles: "supplyProductionProfile",
  placeDemandProfiles: "placeDemandProfile",
  serviceAreaDemandProfiles: "serviceAreaDemandProfile",
  zoneDemandProfiles: "zoneDemandProfile",
  routes: "route",
  customers: "customer",
  demandSimulationStrategies: "demandSimulationStrategy",
  demandSimulationRuns: "demandSimulationRun",
  demandSimulationResults: "demandSimulationResult",
  serviceOrders: "serviceOrder",
  opsCenters: "opsCenter",
  workers: "worker",
  readinessTasks: "readinessTask",
  longTermDemandForecasts: "longTermDemandForecast",
  longTermDemandForecastStrategies: "longTermDemandForecastStrategy",
  longTermDemandForecastRuns: "longTermDemandForecastRun",
  supplyDecisionStrategies: "supplyDecisionStrategy",
  supplyDecisionRuns: "supplyDecisionRun",
  supplyPlans: "supplyPlan",
  productionBatches: "productionBatch",
  fleetAllocationStrategies: "fleetAllocationStrategy",
  fleetAllocationRuns: "fleetAllocationRun",
  fleetAllocationResults: "fleetAllocationResult",
  robotaxiDeliveryOrders: "robotaxiDeliveryOrder",
  supplyOrders: "supplyOrder",
  dealerSupplies: "dealerSupply",
  ownerSupplies: "ownerSupply",
  cleaningTasks: "cleaningTask",
  chargingTasks: "chargingTask",
  maintenanceTasks: "maintenanceTask",
  failureHandlingTasks: "failureHandlingTask",
  retirementTasks: "retirementTask",
  fleetOperationPolicies: "fleetOperationPolicy",
  fleetOperationPolicyRuns: "fleetOperationPolicyRun",
  fleetOperationPolicyResults: "fleetOperationPolicyResult",
  fleetOperationDispatchStrategies: "fleetOperationDispatchStrategy",
  fleetOperationDispatchRuns: "fleetOperationDispatchRun",
  fleetOperationDispatchDecisions: "fleetOperationDispatchDecision",
  taskDispatchStrategies: "taskDispatchStrategy",
  robotaxiTaskPlanningStrategies: "robotaxiTaskPlanningStrategy",
  robotaxiTaskPlanningRuns: "robotaxiTaskPlanningRun",
  robotaxiTaskPlanningResults: "robotaxiTaskPlanningResult",
  taskDispatchRuns: "taskDispatchRun",
  taskDispatchResults: "taskDispatchResult",
  taskPriorityConfig: "taskPriorityConfig",
  deploymentTasks: "deploymentTask",
  shortTermDemandForecastStrategies: "shortTermDemandForecastStrategy",
  shortTermDemandForecastRuns: "shortTermDemandForecastRun",
  shortTermDemandForecastResults: "shortTermDemandForecastResult",
  deploymentDecisionStrategies: "deploymentDecisionStrategy",
  deploymentDecisionRuns: "deploymentDecisionRun",
  deploymentPlans: "deploymentPlan",
  supplyDemandBalanceStrategies: "supplyDemandBalanceStrategy",
  supplyDemandBalanceRuns: "supplyDemandBalanceRun",
  supplyDemandBalanceResults: "supplyDemandBalanceResult",
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
  operatingMetricsOverview: "metricObservation",
  financialMetrics: "metricObservation",
  serviceMetrics: "metricObservation",
  supplyAssetMetrics: "metricObservation",
  processDiagnostics: "metricObservation",
  metricDefinitions: "metricDefinition",
  metricCalculationRuns: "metricCalculationRun",
  metricObservations: "metricObservation",
  simulationRuns: "simulationRun",
  simulationEvents: "simulationEvent",
  timedOperations: "timedOperation",
};

const idFieldByType = {
  operatingModel: "operating_model_id",
  decisionCapability: "decision_capability_id",
  map: "map_id",
  cell: "cell_id",
  road: "road_id",
  roadNode: "road_node_id",
  roadSegment: "road_segment_id",
  place: "place_id",
  serviceArea: "service_area_id",
  zone: "zone_id",
  demandProfile: "profile_id",
  businessTarget: "business_target_id",
  placeDemandProfile: "profile_id",
  serviceAreaDemandProfile: "profile_id",
  zoneDemandProfile: "profile_id",
  supplyProductionProfile: "profile_id",
  longTermDemandForecastStrategy: "forecast_strategy_id",
  longTermDemandForecastRun: "forecast_run_id",
  supplyDecisionStrategy: "supply_decision_strategy_id",
  supplyDecisionRun: "supply_decision_run_id",
  route: "route_id",
  customer: "customer_id",
  demandSimulationStrategy: "demand_simulation_strategy_id",
  demandSimulationRun: "demand_simulation_run_id",
  demandSimulationResult: "demand_simulation_result_id",
  serviceOrder: "service_order_id",
  opsCenter: "ops_center_id",
  worker: "worker_id",
  readinessTask: "task_id",
  longTermDemandForecast: "forecast_result_id",
  supplyPlan: "supply_plan_id",
  productionBatch: "production_batch_id",
  fleetAllocationStrategy: "fleet_allocation_strategy_id",
  fleetAllocationRun: "fleet_allocation_run_id",
  fleetAllocationResult: "fleet_allocation_result_id",
  robotaxiDeliveryOrder: "delivery_order_id",
  supplyOrder: "supply_order_id",
  dealerSupply: "dealer_supply_id",
  ownerSupply: "owner_supply_id",
  cleaningTask: "task_id",
  chargingTask: "task_id",
  maintenanceTask: "task_id",
  failureHandlingTask: "task_id",
  retirementTask: "task_id",
  fleetOperationPolicy: "fleet_operation_policy_id",
  fleetOperationPolicyRun: "fleet_operation_policy_run_id",
  fleetOperationPolicyResult: "fleet_operation_policy_result_id",
  fleetOperationDispatchStrategy: "fleet_operation_dispatch_strategy_id",
  fleetOperationDispatchRun: "fleet_operation_dispatch_run_id",
  fleetOperationDispatchDecision: "fleet_operation_dispatch_decision_id",
  taskDispatchStrategy: "task_dispatch_strategy_id",
  robotaxiTaskPlanningStrategy: "robotaxi_task_planning_strategy_id",
  robotaxiTaskPlanningRun: "robotaxi_task_planning_run_id",
  robotaxiTaskPlanningResult: "robotaxi_task_planning_result_id",
  taskDispatchRun: "task_dispatch_run_id",
  taskDispatchResult: "task_dispatch_result_id",
  taskPriorityConfig: "config_id",
  deploymentTask: "task_id",
  shortTermDemandForecastStrategy: "short_term_forecast_strategy_id",
  shortTermDemandForecastRun: "short_term_forecast_run_id",
  shortTermDemandForecastResult: "short_term_forecast_result_id",
  deploymentDecisionStrategy: "deployment_decision_strategy_id",
  deploymentDecisionRun: "deployment_decision_run_id",
  deploymentPlan: "deployment_plan_id",
  supplyDemandBalanceStrategy: "supply_demand_balance_strategy_id",
  supplyDemandBalanceRun: "supply_demand_balance_run_id",
  supplyDemandBalanceResult: "supply_demand_balance_result_id",
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
  metricDefinition: "metric_definition_id",
  metricCalculationRun: "metric_calculation_run_id",
  metricObservation: "metric_observation_id",
  simulationRun: "simulation_run_id",
  simulationEvent: "simulation_event_id",
  timedOperation: "timed_operation_id",
  pricingDecision: "pricing_decision_id",
  orderMatchingStrategy: "order_matching_strategy_id",
  orderMatchingRun: "order_matching_run_id",
  orderMatchingDecision: "order_matching_decision_id",
  trip: "trip_id",
  robotaxi: "robotaxi_id",
  validation: "rule_id",
};

const statusFieldByPage = {
  decisionCenter: "decision_domain",
  roads: "road_status",
  roadNodes: "node_status",
  roadSegments: "segment_status",
  places: "place_status",
  serviceAreas: "service_area_status",
  zones: "zone_status",
  demandProfiles: "profile_status",
  businessTargets: "target_status",
  supplyProductionProfiles: "profile_status",
  placeDemandProfiles: "profile_status",
  serviceAreaDemandProfiles: "profile_status",
  zoneDemandProfiles: "profile_status",
  routes: "route_status",
  opsCenters: "ops_center_status",
  workers: "worker_status",
  readinessTasks: "task_status",
  longTermDemandForecasts: "forecast_status",
  longTermDemandForecastStrategies: "strategy_status",
  longTermDemandForecastRuns: "run_status",
  supplyDecisionStrategies: "strategy_status",
  supplyDecisionRuns: "run_status",
  supplyPlans: "plan_status",
  productionBatches: "batch_status",
  fleetAllocationStrategies: "strategy_status",
  fleetAllocationRuns: "run_status",
  fleetAllocationResults: "result_status",
  robotaxiDeliveryOrders: "delivery_status",
  supplyOrders: "order_status",
  dealerSupplies: "dealer_status",
  ownerSupplies: "owner_status",
  cleaningTasks: "task_status",
  chargingTasks: "task_status",
  maintenanceTasks: "task_status",
  failureHandlingTasks: "task_status",
  retirementTasks: "task_status",
  fleetOperationPolicies: "policy_status",
  fleetOperationPolicyRuns: "run_status",
  fleetOperationPolicyResults: "result_status",
  fleetOperationDispatchStrategies: "strategy_status",
  fleetOperationDispatchRuns: "run_status",
  fleetOperationDispatchDecisions: "decision_result",
  taskDispatchStrategies: "strategy_status",
  robotaxiTaskPlanningStrategies: "strategy_status",
  robotaxiTaskPlanningRuns: "run_status",
  robotaxiTaskPlanningResults: "decision_result",
  taskDispatchRuns: "run_status",
  taskDispatchResults: "decision_result",
  taskPriorityConfig: "config_status",
  deploymentTasks: "task_status",
  shortTermDemandForecastStrategies: "strategy_status",
  shortTermDemandForecastRuns: "run_status",
  shortTermDemandForecastResults: "forecast_status",
  deploymentDecisionStrategies: "strategy_status",
  deploymentDecisionRuns: "run_status",
  deploymentPlans: "plan_status",
  supplyDemandBalanceStrategies: "strategy_status",
  supplyDemandBalanceRuns: "run_status",
  supplyDemandBalanceResults: "result_status",
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
  operatingMetricsOverview: "quality_status",
  financialMetrics: "quality_status",
  serviceMetrics: "quality_status",
  supplyAssetMetrics: "quality_status",
  processDiagnostics: "quality_status",
  metricDefinitions: "metric_status",
  metricCalculationRuns: "calculation_status",
  metricObservations: "quality_status",
  simulationRuns: "simulation_status",
  simulationEvents: "event_result",
  timedOperations: "operation_status",
};

const cellClass = {
  EMPTY: "cell-empty",
  ROAD: "cell-road",
  PLACE: "cell-place",
  BLOCKED: "cell-blocked",
};

const legendItems = [
  ["cell-empty", "空白网格"],
  ["cell-road", "道路网格"],
  ["place-residential-swatch", "住宅地点"],
  ["place-office-swatch", "办公地点"],
  ["place-commercial-swatch", "商业地点"],
  ["place-hospital-swatch", "医院学校"],
  ["place-metro-station-swatch", "地铁接驳"],
  ["place-ops-center-swatch", "运营中心地点"],
  ["service-area-swatch", "服务区域"],
  ["ops-center-swatch", "运营中心覆盖"],
  ["route-swatch", "选中路径"],
  ["road-node-swatch", "道路节点"],
];

const routePlanningResultOptions = ["SUCCESS", "FAILED"];
const pricingResultOptions = ["SUCCESS", "FAILED"];
const orderMatchingResultOptions = ["SUCCESS", "FAILED"];
const customerStatusOptions = ["ACTIVE", "TEST_ONLY", "INACTIVE", "BLOCKED"];
const triggerTypeOptions = ["AUTO", "MANUAL"];
const peakPatternOptions = ["BALANCED", "MORNING_OUTBOUND", "EVENING_INBOUND", "EVENING_OUTBOUND", "ALL_DAY_STABLE", "WEEKEND_PEAK", "EVENT_DRIVEN", "LOW_DEMAND"];
const runtimeStorageKey = "robotaxi.runtime.v019-7-service-route";
const runtimeStorageKeyPrefix = "robotaxi.runtime.";
const simulationEventDbName = "robotaxi.simulation.events.v027";
const simulationEventStoreName = "simulationEvents";
const runtimeSnapshotDbName = "robotaxi.runtime.snapshot.v027";
const runtimeSnapshotStoreName = "runtimeSnapshots";
const persistedSimulationEventIds = new Set();
const defaultPageFilters = { keyword: "", statusValue: null, triggerType: null, objectType: null };
const demandTrendMetricIds = ["DEMAND-TREND-001", "DEMAND-TREND-002"];
const metricPeriodOptions = [
  { value: "ALL", label: "全量经营周期" },
  { value: "LATEST_DAY", label: "最近 1 个模拟日" },
  { value: "LATEST_7_DAYS", label: "最近 7 个模拟日" },
];
const legacyRouteStrategyIdMap = {
  "RPS-INITIAL-DEPLOYMENT": "RPS-001",
  "RPS-ABNORMAL-SAME-SA": "RPS-002",
};

function createDemandProfileRows(data) {
  const rows = normalizeDemandProfiles ? normalizeDemandProfiles(data) : (data.demandProfiles || []);
  const order = { ZONE: 0, PLACE: 1, SERVICE_AREA: 2 };
  return [...rows].sort((left, right) => {
    const typeDelta = (order[left.target_object_type] ?? 9) - (order[right.target_object_type] ?? 9);
    if (typeDelta !== 0) return typeDelta;
    return String(left.target_object_id || left.profile_id || "").localeCompare(String(right.target_object_id || right.profile_id || ""));
  });
}

function getDemandProfileConfigFields(profile) {
  if (!profile) return [];
  const commonFields = [{ key: "profile_name", type: "text" }];
  if (profile.target_object_type === "PLACE") {
    return [
      ...commonFields,
      { key: "resident_population", type: "number", min: 0, step: 1 },
      { key: "working_population", type: "number", min: 0, step: 1 },
      { key: "daily_visitors", type: "number", min: 0, step: 1 },
      { key: "resident_trip_weight", type: "number", min: 0, step: 0.01 },
      { key: "worker_trip_weight", type: "number", min: 0, step: 0.01 },
      { key: "visitor_trip_weight", type: "number", min: 0, step: 0.01 },
      { key: "trip_generation_rate", type: "number", min: 0, step: 0.01 },
      { key: "demand_weight", type: "number", min: 0, step: 0.01 },
      { key: "busiest_hour_share", type: "number", min: 0, max: 1, step: 0.01 },
      { key: "robotaxi_adoption_rate", type: "number", min: 0, max: 1, step: 0.01 },
      { key: "service_acceptance_rate", type: "number", min: 0, max: 1, step: 0.01 },
      { key: "competition_retention_rate", type: "number", min: 0, max: 1, step: 0.01 },
      { key: "place_period_growth_rate", type: "number", step: 0.01 },
      { key: "growth_rate_unit", type: "select", options: ["WEEK", "MONTH", "QUARTER", "YEAR"] },
      { key: "growth_rate_source", type: "select", options: ["MANUAL_ASSUMPTION", "SIMULATION_CONFIG", "HISTORICAL_CALCULATION", "EXTERNAL_INPUT"] },
    ];
  }
  if (profile.target_object_type === "SERVICE_AREA") {
    return [
      ...commonFields,
      { key: "parent_place_id", type: "text" },
      { key: "waiting_robotaxi_capacity", type: "number", min: 0, step: 1 },
      { key: "pickup_position_capacity", type: "number", min: 1, step: 1 },
      { key: "dropoff_position_capacity", type: "number", min: 1, step: 1 },
      { key: "average_service_time_min", type: "number", min: 1, step: 1 },
      { key: "operating_hours_per_day", type: "number", min: 1, max: 24, step: 1 },
      { key: "accessibility_factor", type: "number", min: 0, step: 0.01 },
      { key: "capacity_availability_rate", type: "number", min: 0, max: 1, step: 0.01 },
    ];
  }
  if (profile.target_object_type === "ZONE") {
    return commonFields;
  }
  return commonFields;
}

function createDemandProfileConfigDraft(profile) {
  return Object.fromEntries(getDemandProfileConfigFields(profile).map((field) => [
    field.key,
    profile?.[field.key] ?? "",
  ]));
}

function normalizeDemandProfileDraft(profile, draft) {
  return Object.fromEntries(getDemandProfileConfigFields(profile).map((field) => {
    const value = draft[field.key];
    if (field.type === "number") return [field.key, Number(value || 0)];
    return [field.key, value];
  }));
}

function getDemandProfileConfigHelp(profile, fieldKey) {
  const explanation = profile?.profile_field_explanations?.[fieldKey];
  const content = typeof explanation === "string"
    ? explanation
    : explanation?.meaning || explanation?.calculation_logic || explanation?.source;
  const growthHint = fieldKey === "place_period_growth_rate"
    ? "输入比例，例如 0.008 表示 0.8%。"
    : "";
  return [content, growthHint].filter(Boolean).join(" ")
    || "该字段参与画像配置；保存后将整体重算地点、服务区域和区域画像。";
}

const supplyProductionProfileConfigFields = [
  { key: "profile_name", type: "text" },
  { key: "production_lead_time_days", type: "number", min: 0, step: 1 },
  { key: "production_capacity_period_unit", type: "select", options: ["WEEK", "MONTH", "QUARTER", "YEAR"] },
  { key: "production_capacity_per_period", type: "number", min: 0, step: 1 },
  { key: "ramp_up_periods", type: "number", min: 0, step: 1 },
  { key: "ramp_up_capacity_ratios", type: "text" },
  { key: "delivery_capacity_per_period", type: "number", min: 0, step: 1 },
  { key: "quality_inspection_lead_time_days", type: "number", min: 0, step: 1 },
  { key: "effective_from", type: "text" },
  { key: "effective_to", type: "text" },
];

const businessTargetConfigFields = [
  { key: "target_name", type: "text" },
  { key: "forecast_start_date", type: "text" },
  { key: "forecast_period_unit", type: "select", options: ["WEEK", "MONTH", "QUARTER", "YEAR"] },
  { key: "forecast_period_count", type: "number", min: 1, step: 1 },
  { key: "target_end_daily_orders", type: "number", min: 0, step: 1 },
  { key: "target_minimum_robotaxi_quantity", type: "number", min: 0, step: 1 },
  { key: "target_task_utilization_rate", type: "number", min: 0, max: 1, step: 0.01 },
  { key: "target_order_fulfillment_rate", type: "number", min: 0, max: 1, step: 0.01 },
  { key: "planning_mode", type: "select", options: ["MARKET_LED", "TARGET_LED", "BALANCED"] },
  { key: "average_revenue_per_order", type: "number", min: 0, step: 1 },
  { key: "average_variable_cost_per_order", type: "number", min: 0, step: 1 },
  { key: "daily_fixed_operating_cost", type: "number", min: 0, step: 100 },
  { key: "minimum_contribution_margin_rate", type: "number", min: 0, max: 1, step: 0.01 },
];

const longTermDemandForecastStrategyConfigFields = [
  { key: "strategy_name", type: "text" },
  { key: "growth_scenario", type: "select", options: ["CONSERVATIVE", "BASELINE", "AGGRESSIVE"] },
  { key: "growth_model", type: "select", options: ["LINEAR", "COMPOUND"] },
  { key: "growth_adjustment_rate", type: "number", step: 0.001 },
  { key: "demand_buffer_ratio", type: "number", min: 0, max: 1, step: 0.01 },
  { key: "operational_availability_rate", type: "number", min: 0, max: 1, step: 0.01 },
  { key: "robotaxi_available_hours_per_day", type: "number", min: 0.1, max: 24, step: 0.1 },
  { key: "average_pickup_duration_min", type: "number", min: 0, step: 1 },
  { key: "average_trip_duration_min", type: "number", min: 0, step: 1 },
  { key: "average_turnaround_duration_min", type: "number", min: 0, step: 1 },
];

function createPlanningConfigDraft(fields, object) {
  return Object.fromEntries(fields.map((field) => [field.key, object?.[field.key] ?? ""]));
}

function normalizePlanningConfigDraft(fields, draft) {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === "number" ? Number(draft[field.key] || 0) : draft[field.key]]));
}

function createBusinessTargetDraft(businessTarget) {
  return Object.fromEntries(businessTargetConfigFields.map((field) => [
    field.key,
    businessTarget?.[field.key] ?? "",
  ]));
}

function normalizeBusinessTargetDraft(draft) {
  return Object.fromEntries(businessTargetConfigFields.map((field) => {
    const value = draft[field.key];
    if (field.type === "number") return [field.key, Number(value || 0)];
    return [field.key, value || null];
  }));
}

function createSupplyProductionProfileDraft(profile) {
  return Object.fromEntries(supplyProductionProfileConfigFields.map((field) => [
    field.key,
    profile?.[field.key] ?? "",
  ]));
}

function normalizeSupplyProductionProfileDraft(draft) {
  return Object.fromEntries(supplyProductionProfileConfigFields.map((field) => {
    const value = draft[field.key];
    if (field.type === "number") return [field.key, Number(value || 0)];
    if (field.key === "ramp_up_capacity_ratios") {
      const ratios = Array.isArray(value) ? value : String(value || "").split(",").map((item) => Number(item.trim())).filter(Number.isFinite);
      return [field.key, ratios];
    }
    return [field.key, value || null];
  }));
}

function PlatformEntry() {
  const [accessSession, setAccessSession] = useState(() => platformExperience.readAccessSession());

  useEffect(() => {
    releaseFreshnessService?.ensureLatestRelease?.();
  }, []);

  useEffect(() => {
    if (!accessSession) return undefined;
    const remainingMs = Math.max(0, accessSession.expires_at - Date.now());
    const timeoutId = window.setTimeout(() => {
      platformExperience.clearAccessSession();
      setAccessSession(null);
    }, Math.min(remainingMs, 2_147_483_647));
    const handleStorage = (event) => {
      if (event.key !== platformExperience.getAccessSessionStorageKey()) return;
      setAccessSession(platformExperience.readAccessSession());
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorage);
    };
  }, [accessSession]);

  function enterPlatform(userName) {
    const result = platformExperience.createAccessSession(userName);
    if (result.succeeded) setAccessSession(result.session);
    return result;
  }

  function exitPlatform() {
    platformExperience.clearAccessSession();
    setAccessSession(null);
  }

  if (!accessSession) return <PlatformLogin onEnter={enterPlatform} />;
  return <App currentUser={accessSession.user_name} onLogout={exitPlatform} />;
}

function PlatformLogin({ onEnter }) {
  const [userName, setUserName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function attemptLogin(value) {
    const result = onEnter(value);
    setErrorMessage(result.succeeded ? "" : result.reason);
  }

  function submitLogin(event) {
    event.preventDefault();
    attemptLogin(userName);
  }

  return (
    <main className="platform-login-shell">
      <section className="platform-login-panel" aria-labelledby="platform-login-title">
        <div className="platform-login-brand">
          <h1 id="platform-login-title">Robotaxi 经营模拟</h1>
        </div>
        <form className="platform-login-form" onSubmit={submitLogin}>
          <input
            aria-label="登录名称"
            autoComplete="name"
            className={errorMessage ? "platform-login-input error" : "platform-login-input"}
            enterKeyHint="go"
            value={userName}
            placeholder={`请输入：${platformExperience.getDemoUserName()}`}
            onChange={(event) => {
              setUserName(event.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              attemptLogin(event.currentTarget.value);
            }}
          />
          <button className="platform-login-submit" type="submit">进入</button>
        </form>
        <div className={errorMessage ? "platform-login-feedback visible" : "platform-login-feedback"} role="status">
          {errorMessage || "登录名称校验"}
        </div>
      </section>
    </main>
  );
}

function ReleaseHistoryPanel({ open, onClose }) {
  const [showAllReleases, setShowAllReleases] = useState(false);
  const initialVisibleCount = 8;
  const visibleReleases = showAllReleases ? releaseHistory : releaseHistory.slice(0, initialVisibleCount);

  useEffect(() => {
    if (!open) setShowAllReleases(false);
  }, [open]);

  if (!open) return null;
  return (
    <section className="release-history-panel" role="dialog" aria-label="更新记录">
      <header className="release-history-header">
        <div>
          <strong>更新记录</strong>
          <span>持续更新 · 当前 {releaseHistory[0]?.version || "版本"}</span>
        </div>
        <Button type="text" size="small" aria-label="关闭更新记录" onClick={onClose}>×</Button>
      </header>
      <div className="release-history-scroll">
        {visibleReleases.map((release, index) => (
          <article className={index === 0 ? "release-history-item current" : "release-history-item"} key={release.version}>
            <details open={index === 0}>
              <summary>
                <div className="release-history-item-heading">
                  <strong>{release.version}</strong>
                  {index === 0 && <span>当前版本</span>}
                </div>
                <p>{release.audienceTitle}</p>
              </summary>
              {release.audienceChanges.length > 0 && (
                <ul>
                  {release.audienceChanges.map((change) => <li key={change}>{change}</li>)}
                </ul>
              )}
            </details>
          </article>
        ))}
        {releaseHistory.length > initialVisibleCount && (
          <Button
            className="release-history-more"
            type="text"
            onClick={() => setShowAllReleases((current) => !current)}
          >
            {showAllReleases ? "收起历史更新" : `查看更多更新（${releaseHistory.length - initialVisibleCount}）`}
          </Button>
        )}
      </div>
    </section>
  );
}

function ProjectReadmePanel({ open, onClose }) {
  const [state, setState] = useState({ loading: true, blocks: [], error: null });
  useEffect(() => {
    if (!open || !projectReadmeService) return undefined;
    let cancelled = false;
    setState({ loading: true, blocks: [], error: null });
    projectReadmeService.loadProjectReadme()
      .then((markdown) => {
        if (!cancelled) setState({ loading: false, blocks: projectReadmeService.parseProjectReadme(markdown), error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, blocks: [], error: error.message || "项目说明读取失败" });
      });
    return () => { cancelled = true; };
  }, [open]);
  if (!open) return null;
  return (
    <section className="project-readme-panel" role="dialog" aria-label="项目说明">
      <header className="release-history-header">
        <div><strong>项目 README</strong><span>项目定位、业务理解与当前范围</span></div>
        <Button type="text" size="small" aria-label="关闭项目说明" onClick={onClose}>×</Button>
      </header>
      <div className="project-readme-scroll">
        {state.loading && <div className="project-readme-state">正在读取项目说明</div>}
        {state.error && <div className="project-readme-state">{state.error}</div>}
        {!state.loading && !state.error && state.blocks.map((block, index) => (
          <ProjectReadmeBlock block={block} key={`${block.type}-${index}`} />
        ))}
      </div>
    </section>
  );
}

function ProjectReadmeBlock({ block }) {
  if (block.type === "heading") {
    const Heading = `h${Math.min(4, Math.max(2, block.level + 1))}`;
    return <Heading>{formatReadmeInline(block.content)}</Heading>;
  }
  if (block.type === "quote") return <blockquote>{formatReadmeInline(block.content)}</blockquote>;
  if (block.type === "list" || block.type === "orderedList") {
    const List = block.type === "orderedList" ? "ol" : "ul";
    return <List>{block.items.map((item, index) => <li key={index}>{formatReadmeInline(item)}</li>)}</List>;
  }
  if (block.type === "table") {
    return (
      <div className="project-readme-table-wrap"><table><thead><tr>{block.headers.map((cell, index) => <th key={index}>{formatReadmeInline(cell)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{formatReadmeInline(cell)}</td>)}</tr>)}</tbody></table></div>
    );
  }
  if (block.type === "diagram") return <ProjectReadmeDiagram source={block.content} />;
  if (block.type === "code") return <pre className="project-readme-code">{block.content}</pre>;
  return <p>{formatReadmeInline(block.content)}</p>;
}

function ProjectReadmeDiagram({ source }) {
  const graph = useMemo(() => projectReadmeService.parseMermaidFlowchart(source), [source]);
  const markerId = useMemo(() => `readme-arrow-${Math.random().toString(36).slice(2)}`, []);
  return (
    <div className="project-readme-diagram" role="img" aria-label="结构关系图">
      <svg viewBox={`0 0 ${graph.width} ${graph.height}`} width={graph.width} height={graph.height}>
        <defs>
          <marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>
        </defs>
        <g className="project-readme-diagram-edges">
          {graph.edges.map((edge, index) => <ProjectReadmeDiagramEdge edge={edge} markerId={markerId} key={`${edge.from}-${edge.to}-${index}`} />)}
        </g>
        <g className="project-readme-diagram-nodes">
          {graph.nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
              <rect width={node.width} height={node.height} rx="6" />
              <text x={node.width / 2} y={node.label.includes("\n") ? 23 : 34} textAnchor="middle">
                {node.label.split("\n").map((line, index) => <tspan x={node.width / 2} dy={index === 0 ? 0 : 18} key={index}>{line}</tspan>)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function ProjectReadmeDiagramEdge({ edge, markerId }) {
  const { fromNode, toNode, operator } = edge;
  if (!fromNode || !toNode) return null;
  const horizontal = Math.abs(toNode.x - fromNode.x) >= Math.abs(toNode.y - fromNode.y);
  const start = horizontal
    ? { x: fromNode.x + fromNode.width, y: fromNode.y + fromNode.height / 2 }
    : { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height };
  const end = horizontal
    ? { x: toNode.x, y: toNode.y + toNode.height / 2 }
    : { x: toNode.x + toNode.width / 2, y: toNode.y };
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const path = horizontal
    ? `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
  return <path d={path} data-dashed={operator === "-.->"} markerEnd={operator === "---" ? undefined : `url(#${markerId})`} markerStart={operator === "<-->" ? `url(#${markerId})` : undefined} />;
}

function formatReadmeInline(content = "") {
  return String(content).replaceAll("**", "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replaceAll("`", "");
}

function App({ currentUser, onLogout }) {
  const initialData = useMemo(() => {
    const baseData = {
      ...initializeMapSpace(),
      ...initializeOperationsCenter(),
      ...initializeCustomers(),
      ...initializeDemandSimulation(),
      ...initializePricing(),
      ...initializeOrderMatching(),
      ...initializeSupplyManagement(),
    };
    return {
      ...baseData,
      ...initializeSpatialBusinessProfiles(baseData),
    };
  }, []);
  const initialRuntime = useMemo(() => loadRuntimeSnapshot(initialData), [initialData]);
  const [operationalData, setOperationalData] = useState(initialRuntime.operationalData);
  const [readinessTasks, setReadinessTasks] = useState(initialRuntime.readinessTasks);
  const [cleaningTasks, setCleaningTasks] = useState(initialRuntime.cleaningTasks);
  const [chargingTasks, setChargingTasks] = useState(initialRuntime.chargingTasks);
  const [maintenanceTasks, setMaintenanceTasks] = useState(initialRuntime.maintenanceTasks);
  const [failureHandlingTasks, setFailureHandlingTasks] = useState(initialRuntime.failureHandlingTasks);
  const [retirementTasks, setRetirementTasks] = useState(initialRuntime.retirementTasks);
  const [fleetOperationPolicies, setFleetOperationPolicies] = useState(initialRuntime.fleetOperationPolicies);
  const [fleetOperationPolicyRuns, setFleetOperationPolicyRuns] = useState(initialRuntime.fleetOperationPolicyRuns);
  const [fleetOperationPolicyResults, setFleetOperationPolicyResults] = useState(initialRuntime.fleetOperationPolicyResults);
  const [fleetOperationDispatchStrategies, setFleetOperationDispatchStrategies] = useState(initialRuntime.fleetOperationDispatchStrategies);
  const [fleetOperationDispatchRuns, setFleetOperationDispatchRuns] = useState(initialRuntime.fleetOperationDispatchRuns);
  const [fleetOperationDispatchDecisions, setFleetOperationDispatchDecisions] = useState(initialRuntime.fleetOperationDispatchDecisions);
  const [taskDispatchStrategies, setTaskDispatchStrategies] = useState(initialRuntime.taskDispatchStrategies);
  const [robotaxiTaskPlanningStrategies, setRobotaxiTaskPlanningStrategies] = useState(initialRuntime.robotaxiTaskPlanningStrategies);
  const [robotaxiTaskPlanningRuns, setRobotaxiTaskPlanningRuns] = useState(initialRuntime.robotaxiTaskPlanningRuns);
  const [robotaxiTaskPlanningResults, setRobotaxiTaskPlanningResults] = useState(initialRuntime.robotaxiTaskPlanningResults);
  const [taskDispatchRuns, setTaskDispatchRuns] = useState(initialRuntime.taskDispatchRuns);
  const [taskDispatchResults, setTaskDispatchResults] = useState(initialRuntime.taskDispatchResults);
  const [taskPriorityConfigs, setTaskPriorityConfigs] = useState(initialRuntime.taskPriorityConfigs);
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
  const [metricDefinitions, setMetricDefinitions] = useState(initialRuntime.metricDefinitions);
  const [metricCalculationRuns, setMetricCalculationRuns] = useState(initialRuntime.metricCalculationRuns);
  const [metricObservations, setMetricObservations] = useState(initialRuntime.metricObservations);
  const [simulationRuns, setSimulationRuns] = useState(initialRuntime.simulationRuns);
  const [simulationEvents, setSimulationEvents] = useState(initialRuntime.simulationEvents);
  const [timedOperations, setTimedOperations] = useState(initialRuntime.timedOperations);

  useEffect(() => {
    let cancelled = false;
    loadPersistedSimulationEvents().then((events) => {
      if (cancelled || !events.length) return;
      setSimulationEvents((current) => mergeSimulationEvents(current, events));
    });
    return () => { cancelled = true; };
  }, []);
  const initialValidations = useMemo(() => [
    ...validateMapSpace(initialData),
    ...validateOperationsCenter(initialData),
    ...validateCustomers(initialData),
  ], [initialData]);
  const currentSpatialData = useMemo(
    () => spatialCatalogService.mergeSpatialCatalog(operationalData, initialData),
    [initialData, operationalData],
  );
  const data = useMemo(() => ({
    ...currentSpatialData,
    readinessCheckTasks: readinessTasks,
    cleaningTasks,
    chargingTasks,
    maintenanceTasks,
    failureHandlingTasks,
    retirementTasks,
    deploymentTasks,
    routeExecutions,
    routePlanningRuns,
    demandSimulationRuns,
    serviceOrders,
    pricingStrategyRuns,
    pricingDecisions,
    orderMatchingRuns,
    orderMatchingDecisions,
    taskDispatchStrategies,
    robotaxiTaskPlanningStrategies,
    robotaxiTaskPlanningRuns,
    robotaxiTaskPlanningResults,
    taskDispatchRuns,
    taskDispatchResults,
    trips,
    taskEventLogs,
  }), [chargingTasks, cleaningTasks, currentSpatialData, demandSimulationRuns, deploymentTasks, failureHandlingTasks, maintenanceTasks, orderMatchingDecisions, orderMatchingRuns, pricingDecisions, pricingStrategyRuns, readinessTasks, retirementTasks, robotaxiTaskPlanningResults, robotaxiTaskPlanningRuns, robotaxiTaskPlanningStrategies, routeExecutions, routePlanningRuns, serviceOrders, taskDispatchResults, taskDispatchRuns, taskDispatchStrategies, taskEventLogs, trips]);
  const validations = useMemo(() => [
    ...initialValidations,
    ...validateDemandSimulation(data),
    ...validateServiceOrders(data),
    ...validatePricing(data),
    ...validateOrderMatching(data),
    ...validateTrips(data),
    ...validateReadinessCheckTasks(data),
    ...validateDeploymentTasks(data),
  ], [data, initialValidations]);
  const allFleetOperationTasks = useMemo(() => ([
    ...cleaningTasks,
    ...chargingTasks,
    ...maintenanceTasks,
    ...failureHandlingTasks,
    ...retirementTasks,
  ]), [chargingTasks, cleaningTasks, failureHandlingTasks, maintenanceTasks, retirementTasks]);
  const [activePage, setActivePage] = useState(initialRuntime.activePage);
  const [selected, setSelected] = useState(initialRuntime.pageSelections[initialRuntime.activePage] || getDefaultSelection(initialRuntime.activePage, data));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches);
  const [releaseHistoryOpen, setReleaseHistoryOpen] = useState(false);
  const [projectReadmeOpen, setProjectReadmeOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
  const [pendingBusinessTarget, setPendingBusinessTarget] = useState(null);
  const [businessTargetModalOpen, setBusinessTargetModalOpen] = useState(false);
  const [businessTargetDraft, setBusinessTargetDraft] = useState({});
  const [pendingFleetOperationPolicy, setPendingFleetOperationPolicy] = useState(null);
  const [fleetOperationPolicyModalOpen, setFleetOperationPolicyModalOpen] = useState(false);
  const [fleetOperationPolicyDraft, setFleetOperationPolicyDraft] = useState({});
  const [pendingDemandProfile, setPendingDemandProfile] = useState(null);
  const [demandProfileModalOpen, setDemandProfileModalOpen] = useState(false);
  const [demandProfileDraft, setDemandProfileDraft] = useState({});
  const [pendingSupplyProductionProfile, setPendingSupplyProductionProfile] = useState(null);
  const [supplyProductionProfileModalOpen, setSupplyProductionProfileModalOpen] = useState(false);
  const [supplyProductionProfileDraft, setSupplyProductionProfileDraft] = useState({});
  const [pendingLongTermDemandForecastStrategy, setPendingLongTermDemandForecastStrategy] = useState(null);
  const [longTermDemandForecastStrategyModalOpen, setLongTermDemandForecastStrategyModalOpen] = useState(false);
  const [longTermDemandForecastStrategyDraft, setLongTermDemandForecastStrategyDraft] = useState({});
  const [metricPeriodType, setMetricPeriodType] = useState(initialRuntime.metricPeriodType || "ALL");
  const [metricCalculationInProgress, setMetricCalculationInProgress] = useState(false);
  const operatingDataPool = useMemo(() => operatingDataPoolService.createOperatingDataPool({
    metricObservations,
    metricDefinitions,
    metricCalculationRuns,
    simulationRuns,
    periodType: metricPeriodType,
    businessTargets: operationalData.businessTargets,
    demandForecasts: operationalData.longTermDemandForecasts,
    supplyPlans: operationalData.supplyPlans,
    robotaxis: operationalData.robotaxis,
  }), [metricCalculationRuns, metricDefinitions, metricObservations, metricPeriodType, operationalData.businessTargets, operationalData.longTermDemandForecasts, operationalData.supplyPlans, operationalData.robotaxis, simulationRuns]);
  const metricDisplayRows = operatingDataPool.rows;
  const decisionControlView = useMemo(() => decisionControlService.createDecisionControlView({
    collections: {
      longTermDemandForecastStrategies: operationalData.longTermDemandForecastStrategies,
      longTermDemandForecastRuns: operationalData.longTermDemandForecastRuns,
      longTermDemandForecasts: operationalData.longTermDemandForecasts,
      supplyDecisionStrategies: operationalData.supplyDecisionStrategies,
      supplyDecisionRuns: operationalData.supplyDecisionRuns,
      supplyPlans: operationalData.supplyPlans,
      fleetAllocationStrategies: operationalData.fleetAllocationStrategies,
      fleetAllocationRuns: operationalData.fleetAllocationRuns,
      fleetAllocationResults: operationalData.fleetAllocationResults,
      supplyDemandBalanceStrategies: operationalData.supplyDemandBalanceStrategies,
      supplyDemandBalanceRuns: operationalData.supplyDemandBalanceRuns,
      supplyDemandBalanceResults: operationalData.supplyDemandBalanceResults,
      shortTermDemandForecastStrategies: operationalData.shortTermDemandForecastStrategies,
      shortTermDemandForecastRuns: operationalData.shortTermDemandForecastRuns,
      shortTermDemandForecastResults: operationalData.shortTermDemandForecastResults,
      deploymentDecisionStrategies: operationalData.deploymentDecisionStrategies,
      deploymentDecisionRuns: operationalData.deploymentDecisionRuns,
      deploymentPlans: operationalData.deploymentPlans,
      routePlanningStrategies: createRoutePlanningStrategyRows(data, routePlanningRuns),
      routePlanningRuns,
      routes: data.routes,
      pricingStrategies: createPricingStrategyRows(data, pricingStrategyRuns),
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingStrategies: createOrderMatchingStrategyRows(data, orderMatchingRuns),
      orderMatchingRuns,
      orderMatchingDecisions,
      serviceOrders,
      fleetOperationPolicies,
      fleetOperationPolicyRuns,
      fleetOperationPolicyResults,
      fleetOperationDispatchStrategies,
      fleetOperationDispatchRuns,
      fleetOperationDispatchDecisions,
      robotaxiTaskPlanningStrategies,
      robotaxiTaskPlanningRuns,
      robotaxiTaskPlanningResults,
      demandSimulationStrategies: createDemandSimulationStrategyRows(data, demandSimulationRuns),
      demandSimulationRuns,
      demandSimulationResults: createDemandSimulationResultRows(demandSimulationRuns),
    },
    metricRows: operatingDataPool.pages.decisionCenter,
    comparisons: operatingDataPool.comparisons,
  }), [data, demandSimulationRuns, fleetOperationDispatchDecisions, fleetOperationDispatchRuns, fleetOperationDispatchStrategies, fleetOperationPolicies, fleetOperationPolicyResults, fleetOperationPolicyRuns, operatingDataPool.comparisons, operatingDataPool.pages.decisionCenter, operationalData, orderMatchingDecisions, orderMatchingRuns, pricingDecisions, pricingStrategyRuns, robotaxiTaskPlanningResults, robotaxiTaskPlanningRuns, robotaxiTaskPlanningStrategies, routePlanningRuns, serviceOrders]);
  const autoFinanceCalculationRunIdsRef = useRef(new Set());
  const autoMetricCalculationRunIdsRef = useRef(new Set());
  const publicDemoBootstrapRef = useRef({
    completed: false,
    forecastRequested: false,
    shortTermForecastRequested: false,
    simulationCreated: false,
    startedSimulationRunIds: new Set(),
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    const applyMobileWorkspace = (event) => {
      setMobileLayout(event.matches);
      if (!event.matches) return;
      setCollapsed(true);
      setDetailCollapsedByPage((current) => ({ ...current, [activePage]: true }));
    };
    applyMobileWorkspace(mobileViewport);
    mobileViewport.addEventListener?.("change", applyMobileWorkspace);
    return () => mobileViewport.removeEventListener?.("change", applyMobileWorkspace);
  }, [activePage, runtimeHydrated]);

  useEffect(() => {
    if (activePage === "console") {
      setDetailCollapsedByPage((current) => ({ ...current, console: true }));
    }
  }, [activePage]);

  useEffect(() => {
    if (!releaseHistoryOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setReleaseHistoryOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [releaseHistoryOpen]);

  useEffect(() => {
    let cancelled = false;
    loadPersistedRuntimeSnapshot().then((snapshot) => {
      if (cancelled || !snapshot) return;
      setOperationalData(normalizeOperationalRouteStrategies({
        ...initialData,
        ...(snapshot.operationalData || {}),
        businessTargets: snapshot.operationalData?.businessTargets || initialData.businessTargets || [],
        supplyProductionProfiles: snapshot.operationalData?.supplyProductionProfiles || initialData.supplyProductionProfiles || [],
        longTermDemandForecastStrategies: snapshot.operationalData?.longTermDemandForecastStrategies || initialData.longTermDemandForecastStrategies || [],
        longTermDemandForecastRuns: snapshot.operationalData?.longTermDemandForecastRuns || initialData.longTermDemandForecastRuns || [],
        longTermDemandForecasts: snapshot.operationalData?.longTermDemandForecasts || initialData.longTermDemandForecasts || [],
        supplyDecisionStrategies: snapshot.operationalData?.supplyDecisionStrategies || initialData.supplyDecisionStrategies || [],
        supplyDecisionRuns: snapshot.operationalData?.supplyDecisionRuns || initialData.supplyDecisionRuns || [],
        supplyPlans: snapshot.operationalData?.supplyPlans || initialData.supplyPlans || [],
        productionBatches: snapshot.operationalData?.productionBatches || initialData.productionBatches || [],
        fleetAllocationStrategies: snapshot.operationalData?.fleetAllocationStrategies || initialData.fleetAllocationStrategies || [],
        fleetAllocationRuns: snapshot.operationalData?.fleetAllocationRuns || initialData.fleetAllocationRuns || [],
        fleetAllocationResults: snapshot.operationalData?.fleetAllocationResults || initialData.fleetAllocationResults || [],
        robotaxiDeliveryOrders: snapshot.operationalData?.robotaxiDeliveryOrders || initialData.robotaxiDeliveryOrders || [],
        shortTermDemandForecastStrategies: snapshot.operationalData?.shortTermDemandForecastStrategies || initialData.shortTermDemandForecastStrategies || [],
        shortTermDemandForecastRuns: snapshot.operationalData?.shortTermDemandForecastRuns || initialData.shortTermDemandForecastRuns || [],
        shortTermDemandForecastResults: snapshot.operationalData?.shortTermDemandForecastResults || initialData.shortTermDemandForecastResults || [],
        deploymentDecisionStrategies: snapshot.operationalData?.deploymentDecisionStrategies || initialData.deploymentDecisionStrategies || [],
        deploymentDecisionRuns: snapshot.operationalData?.deploymentDecisionRuns || initialData.deploymentDecisionRuns || [],
        deploymentPlans: snapshot.operationalData?.deploymentPlans || initialData.deploymentPlans || [],
      }));
      setReadinessTasks(Array.isArray(snapshot.readinessTasks) ? snapshot.readinessTasks : []);
      setCleaningTasks(Array.isArray(snapshot.cleaningTasks) ? snapshot.cleaningTasks : []);
      setChargingTasks(Array.isArray(snapshot.chargingTasks) ? snapshot.chargingTasks : []);
      setMaintenanceTasks(Array.isArray(snapshot.maintenanceTasks) ? snapshot.maintenanceTasks : []);
      setFailureHandlingTasks(Array.isArray(snapshot.failureHandlingTasks) ? snapshot.failureHandlingTasks : []);
      setRetirementTasks(Array.isArray(snapshot.retirementTasks) ? snapshot.retirementTasks : []);
      setTaskPriorityConfigs(snapshot.taskPriorityConfigs?.length ? snapshot.taskPriorityConfigs : [robotaxiTaskPriorityService.initializeDefaultPriorityConfig()]);
      setFleetOperationPolicies(snapshot.fleetOperationPolicies?.length ? snapshot.fleetOperationPolicies : fleetOperationPolicyService.initializeDefaultFleetOperationPolicies());
      setFleetOperationPolicyRuns(Array.isArray(snapshot.fleetOperationPolicyRuns) ? snapshot.fleetOperationPolicyRuns : []);
      setFleetOperationPolicyResults(Array.isArray(snapshot.fleetOperationPolicyResults) ? snapshot.fleetOperationPolicyResults : []);
      setFleetOperationDispatchStrategies(Array.isArray(snapshot.fleetOperationDispatchStrategies) && snapshot.fleetOperationDispatchStrategies.length
        ? snapshot.fleetOperationDispatchStrategies
        : fleetOperationDispatchService.initializeDefaultFleetOperationDispatchStrategies());
      setFleetOperationDispatchRuns(Array.isArray(snapshot.fleetOperationDispatchRuns) ? snapshot.fleetOperationDispatchRuns : []);
      setFleetOperationDispatchDecisions(Array.isArray(snapshot.fleetOperationDispatchDecisions) ? snapshot.fleetOperationDispatchDecisions : []);
      setTaskDispatchStrategies(Array.isArray(snapshot.taskDispatchStrategies) && snapshot.taskDispatchStrategies.length
        ? snapshot.taskDispatchStrategies
        : taskDispatchStrategyService.initializeDefaultTaskDispatchStrategies());
      setRobotaxiTaskPlanningStrategies(Array.isArray(snapshot.robotaxiTaskPlanningStrategies) && snapshot.robotaxiTaskPlanningStrategies.length
        ? snapshot.robotaxiTaskPlanningStrategies
        : robotaxiTaskPlanningService.initializeDefaultRobotaxiTaskPlanningStrategies());
      setRobotaxiTaskPlanningRuns(Array.isArray(snapshot.robotaxiTaskPlanningRuns) ? snapshot.robotaxiTaskPlanningRuns : []);
      setRobotaxiTaskPlanningResults(Array.isArray(snapshot.robotaxiTaskPlanningResults) ? snapshot.robotaxiTaskPlanningResults : []);
      setTaskDispatchRuns(Array.isArray(snapshot.taskDispatchRuns) ? snapshot.taskDispatchRuns : []);
      setTaskDispatchResults(Array.isArray(snapshot.taskDispatchResults) ? snapshot.taskDispatchResults : []);
      setDeploymentTasks(normalizeRouteStrategyReferences(snapshot.deploymentTasks || []));
      setRouteExecutions(normalizeRouteStrategyReferences(snapshot.routeExecutions || []));
      setRoutePlanningRuns(normalizeRouteStrategyReferences(snapshot.routePlanningRuns || []));
      setDemandSimulationRuns(Array.isArray(snapshot.demandSimulationRuns) ? snapshot.demandSimulationRuns : []);
      setServiceOrders(normalizeServiceOrders(snapshot.serviceOrders || []));
      setPricingStrategyRuns(snapshot.pricingStrategyRuns || []);
      setPricingDecisions(snapshot.pricingDecisions || []);
      setOrderMatchingRuns(snapshot.orderMatchingRuns || []);
      setOrderMatchingDecisions(snapshot.orderMatchingDecisions || []);
      setTrips(Array.isArray(snapshot.trips) ? snapshot.trips.map((trip) => tripTypes.normalizeTripRecord(trip)) : []);
      setTaskEventLogs(normalizeRouteStrategyReferences(snapshot.taskEventLogs || []));
      setSimulationPolicies(snapshot.simulationPolicies || []);
      setWorkflowTimingProfiles(snapshot.workflowTimingProfiles?.length
        ? snapshot.workflowTimingProfiles.map((profile) => businessTimingCalculator.normalizeWorkflowTimingProfile(profile))
        : [businessTimingCalculator.initializeDefaultWorkflowTimingProfile()]);
      setBusinessTimingCalculationRuns(snapshot.businessTimingCalculationRuns || []);
      setCostModelProfiles(snapshot.costModelProfiles?.length
        ? snapshot.costModelProfiles.map((profile) => costModelCalculator.normalizeCostModelProfile(profile))
        : [costModelCalculator.initializeDefaultCostModelProfile()]);
      setCostCalculationRuns(snapshot.costCalculationRuns || []);
      setCostRecords(snapshot.costRecords || []);
      setRevenueCalculationRuns(snapshot.revenueCalculationRuns || []);
      setRevenueRecords(snapshot.revenueRecords || []);
      setMetricDefinitions(snapshot.metricDefinitions?.length ? metricCalculator.normalizeMetricDefinitions(snapshot.metricDefinitions) : metricCalculator.initializeDefaultMetricDefinitions());
      setMetricCalculationRuns(snapshot.metricCalculationRuns || []);
      setMetricObservations(snapshot.metricObservations || []);
      setMetricPeriodType(snapshot.metricPeriodType || "ALL");
      setSimulationRuns(snapshot.simulationRuns || []);
      setTimedOperations(snapshot.timedOperations || []);
      const restoredPage = isLeafPage(snapshot.activePage) ? snapshot.activePage : "console";
      const restoredSelections = snapshot.pageSelections || {};
      const restoredSelection = restoredSelections[restoredPage] || getDefaultSelection(restoredPage, initialData);
      setActivePage(restoredPage);
      setWorkspacePages(normalizeWorkspacePages(snapshot.workspacePages, restoredPage));
      setDetailCollapsedByPage({
        ...(snapshot.detailCollapsedByPage || {}),
        [restoredPage]: restoredSelection?.id ? snapshot.detailCollapsedByPage?.[restoredPage] ?? false : true,
        console: true,
      });
      setPageSelections(restoredSelections);
      setSelected(restoredSelection);
      setOpenMenuKeys(getOpenKeysForPage(restoredPage));
      setPageUiState(normalizePageUiStateMap(snapshot.pageUiState));
      restoreRuntimeSequences(snapshot);
    }).finally(() => {
      if (!cancelled) setRuntimeHydrated(true);
    });
    return () => { cancelled = true; };
  }, [initialData]);

  const rowsByPage = useMemo(() => {
    const demandProfileRows = createDemandProfileRows(data);
    const legacyDemandProfileRows = splitDemandProfilesByTarget ? splitDemandProfilesByTarget(demandProfileRows) : {
      placeDemandProfiles: data.placeDemandProfiles || [],
      serviceAreaDemandProfiles: data.serviceAreaDemandProfiles || [],
      zoneDemandProfiles: data.zoneDemandProfiles || [],
    };
    return {
      operatingModel: [operatingModelService.getOperatingModelDefinition()],
      decisionCenter: decisionControlView.capabilities,
      maps: data.maps,
    cells: data.cells,
    roads: data.roads,
    roadNodes: data.roadNodes,
    roadSegments: data.roadSegments,
    places: data.places,
    serviceAreas: data.serviceAreas,
    zones: data.zones,
    businessTargets: data.businessTargets || [],
    demandProfiles: demandProfileRows,
    placeDemandProfiles: legacyDemandProfileRows.placeDemandProfiles,
    serviceAreaDemandProfiles: legacyDemandProfileRows.serviceAreaDemandProfiles,
    zoneDemandProfiles: legacyDemandProfileRows.zoneDemandProfiles,
    routes: data.routes.map((route) => enrichRouteForDisplay(route, data, deploymentTasks, routeExecutions, routePlanningRuns)),
    customers: data.customers || [],
    demandSimulationStrategies: createDemandSimulationStrategyRows(data, demandSimulationRuns),
    demandSimulationRuns,
    demandSimulationResults: createDemandSimulationResultRows(demandSimulationRuns),
    serviceOrders: serviceOrders.map((order) => attachRevenueRecords(attachCostRecords(enrichServiceOrderForDisplay(order, data, trips), "serviceOrder", costRecords), revenueRecords)),
    opsCenters: data.opsCenters,
    workers: data.workers.map((worker) => enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks)),
    readinessTasks: readinessTasks.map((task) => attachCostRecords(task, "readinessTask", costRecords)),
    supplyProductionProfiles: data.supplyProductionProfiles || [],
    longTermDemandForecastStrategies: data.longTermDemandForecastStrategies || [],
    longTermDemandForecastRuns: data.longTermDemandForecastRuns || [],
    longTermDemandForecasts: data.longTermDemandForecasts || [],
    supplyDecisionStrategies: data.supplyDecisionStrategies || [],
    supplyDecisionRuns: data.supplyDecisionRuns || [],
    supplyPlans: data.supplyPlans || [],
    productionBatches: data.productionBatches || [],
    fleetAllocationStrategies: data.fleetAllocationStrategies || [],
    fleetAllocationRuns: data.fleetAllocationRuns || [],
    fleetAllocationResults: data.fleetAllocationResults || [],
    robotaxiDeliveryOrders: data.robotaxiDeliveryOrders || [],
    shortTermDemandForecastStrategies: data.shortTermDemandForecastStrategies || [],
    shortTermDemandForecastRuns: data.shortTermDemandForecastRuns || [],
    shortTermDemandForecastResults: data.shortTermDemandForecastResults || [],
    deploymentDecisionStrategies: data.deploymentDecisionStrategies || [],
    deploymentDecisionRuns: data.deploymentDecisionRuns || [],
    deploymentPlans: data.deploymentPlans || [],
    supplyDemandBalanceStrategies: data.supplyDemandBalanceStrategies || [],
    supplyDemandBalanceRuns: data.supplyDemandBalanceRuns || [],
    supplyDemandBalanceResults: data.supplyDemandBalanceResults || [],
    supplyOrders: data.supplyOrders || [],
    dealerSupplies: data.dealerSupplies || [],
    ownerSupplies: data.ownerSupplies || [],
    cleaningTasks: cleaningTasks.map((task) => attachCostRecords(enrichFleetOperationTaskForDisplay(task, data), "cleaningTask", costRecords)),
    chargingTasks: chargingTasks.map((task) => attachCostRecords(enrichFleetOperationTaskForDisplay(task, data), "chargingTask", costRecords)),
    maintenanceTasks: maintenanceTasks.map((task) => attachCostRecords(enrichFleetOperationTaskForDisplay(task, data), "maintenanceTask", costRecords)),
    failureHandlingTasks: failureHandlingTasks.map((task) => attachCostRecords(enrichFleetOperationTaskForDisplay(task, data), "failureHandlingTask", costRecords)),
    retirementTasks: retirementTasks.map((task) => attachCostRecords(enrichFleetOperationTaskForDisplay(task, data), "retirementTask", costRecords)),
    fleetOperationPolicies,
    fleetOperationPolicyRuns,
    fleetOperationPolicyResults,
    fleetOperationDispatchStrategies,
    fleetOperationDispatchRuns,
    fleetOperationDispatchDecisions,
    taskDispatchStrategies,
    robotaxiTaskPlanningStrategies,
    robotaxiTaskPlanningRuns,
    robotaxiTaskPlanningResults,
    taskDispatchRuns,
    taskDispatchResults,
    taskPriorityConfig: taskPriorityConfigs,
    deploymentTasks: deploymentTasks.map((task) => attachCostRecords(enrichDeploymentTaskForDisplay(task, data), "deploymentTask", costRecords, routeExecutions)),
    routeExecutions: routeExecutions.map((execution) => attachCostRecords(enrichRouteExecutionForDisplay(execution, data), "routeExecution", costRecords)),
    taskEventLogs,
    routePlanningStrategies: createRoutePlanningStrategyRows(data, routePlanningRuns),
    routePlanningRuns,
    pricingStrategies: createPricingStrategyRows(data, pricingStrategyRuns),
    pricingStrategyRuns,
    pricingDecisions,
    orderMatchingStrategies: createOrderMatchingStrategyRows(data, orderMatchingRuns),
    orderMatchingRuns,
    orderMatchingDecisions: orderMatchingDecisions.map((decision) => enrichOrderMatchingDecisionForDisplay(decision, data)),
    serviceFulfillmentRecords: trips.map((trip) => attachCostRecords(enrichTripForDisplay(trip, data), "trip", costRecords)),
    robotaxis: data.robotaxis.map((robotaxi) => enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, allFleetOperationTasks, routeExecutions)),
    simulationPolicies,
    workflowTimingRules: (workflowTimingProfiles[0]?.timing_rules || []).map((rule) => ({
      ...rule,
      workflow_timing_profile_id: workflowTimingProfiles[0]?.workflow_timing_profile_id,
      profile_name: workflowTimingProfiles[0]?.profile_name,
      profile_version: workflowTimingProfiles[0]?.profile_version,
    })),
    costModelProfiles,
    costParameterRules: (costModelProfiles[0]?.cost_parameter_rules || []).map((rule) => ({
      ...rule,
      cost_model_profile_id: costModelProfiles[0]?.cost_model_profile_id,
      profile_name: costModelProfiles[0]?.profile_name,
      profile_version: costModelProfiles[0]?.profile_version,
      currency_code: costModelProfiles[0]?.currency_code,
    })),
    costCalculationRuns,
    costRecords,
    revenueCalculationRuns,
    revenueRecords,
    operatingMetricsOverview: operatingDataPool.pages.operatingMetricsOverview,
    financialMetrics: operatingDataPool.pages.financialMetrics,
    serviceMetrics: operatingDataPool.pages.serviceMetrics,
    supplyAssetMetrics: operatingDataPool.pages.supplyAssetMetrics,
    processDiagnostics: operatingDataPool.pages.processDiagnostics,
    metricDefinitions,
    metricCalculationRuns,
    metricObservations: metricDisplayRows,
    simulationRuns,
    simulationEvents,
    timedOperations,
    validations,
    };
  }, [allFleetOperationTasks, chargingTasks, cleaningTasks, data, decisionControlView.capabilities, demandSimulationRuns, deploymentTasks, failureHandlingTasks, fleetOperationDispatchDecisions, fleetOperationDispatchRuns, fleetOperationDispatchStrategies, fleetOperationPolicies, fleetOperationPolicyResults, fleetOperationPolicyRuns, maintenanceTasks, orderMatchingDecisions, orderMatchingRuns, pricingDecisions, pricingStrategyRuns, readinessTasks, retirementTasks, robotaxiTaskPlanningResults, robotaxiTaskPlanningRuns, robotaxiTaskPlanningStrategies, routeExecutions, routePlanningRuns, serviceOrders, taskDispatchResults, taskDispatchRuns, taskDispatchStrategies, taskEventLogs, trips, simulationPolicies, workflowTimingProfiles, taskPriorityConfigs, costModelProfiles, costCalculationRuns, costRecords, revenueCalculationRuns, revenueRecords, metricDisplayRows, metricDefinitions, metricCalculationRuns, metricPeriodType, simulationRuns, simulationEvents, timedOperations, validations]);

  const selectedObject = useMemo(() => {
    if (selected.type === "cell") {
      const cell = data.cells.find((item) => item.cell_id === selected.id);
      return cell ? createCellContext(cell, data) : null;
    }

    if (selected.type === "robotaxi") {
      const robotaxi = data.robotaxis.find((item) => item.robotaxi_id === selected.id);
      return robotaxi ? enrichRobotaxiForDetail(robotaxi, data, readinessTasks, deploymentTasks, allFleetOperationTasks, routeExecutions) : null;
    }

    if (selected.type === "worker") {
      const worker = data.workers.find((item) => item.worker_id === selected.id);
      return worker ? enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks) : null;
    }

    if (selected.type === "deploymentTask") {
      const task = deploymentTasks.find((item) => item.task_id === selected.id);
      return task ? attachCostRecords(enrichDeploymentTaskForDisplay(task, data), "deploymentTask", costRecords, routeExecutions) : null;
    }

    if (selected.type === "routeExecution") {
      const execution = routeExecutions.find((item) => item.route_execution_id === selected.id);
      return execution ? attachCostRecords(enrichRouteExecutionForDisplay(execution, data), "routeExecution", costRecords) : null;
    }

    const collections = {
      operatingModel: rowsByPage.operatingModel,
      map: data.maps,
      road: data.roads,
      roadNode: data.roadNodes,
      roadSegment: data.roadSegments,
      place: data.places,
      serviceArea: data.serviceAreas,
      zone: data.zones,
      demandProfile: rowsByPage.demandProfiles,
      placeDemandProfile: rowsByPage.placeDemandProfiles,
      serviceAreaDemandProfile: rowsByPage.serviceAreaDemandProfiles,
      zoneDemandProfile: rowsByPage.zoneDemandProfiles,
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
      metricDefinition: rowsByPage.metricDefinitions,
      metricCalculationRun: rowsByPage.metricCalculationRuns,
      metricObservation: rowsByPage.metricObservations,
      simulationRun: simulationRuns,
      simulationEvent: simulationEvents,
      timedOperation: timedOperations,
      opsCenter: data.opsCenters,
      worker: data.workers,
      readinessTask: rowsByPage.readinessTasks,
      businessTarget: rowsByPage.businessTargets,
      supplyProductionProfile: rowsByPage.supplyProductionProfiles,
      longTermDemandForecastStrategy: rowsByPage.longTermDemandForecastStrategies,
      longTermDemandForecastRun: rowsByPage.longTermDemandForecastRuns,
      longTermDemandForecast: rowsByPage.longTermDemandForecasts,
      supplyDecisionStrategy: rowsByPage.supplyDecisionStrategies,
      supplyDecisionRun: rowsByPage.supplyDecisionRuns,
      supplyPlan: rowsByPage.supplyPlans,
      productionBatch: rowsByPage.productionBatches,
      fleetAllocationStrategy: rowsByPage.fleetAllocationStrategies,
      fleetAllocationRun: rowsByPage.fleetAllocationRuns,
      fleetAllocationResult: rowsByPage.fleetAllocationResults,
      robotaxiDeliveryOrder: rowsByPage.robotaxiDeliveryOrders,
      shortTermDemandForecastStrategy: rowsByPage.shortTermDemandForecastStrategies,
      shortTermDemandForecastRun: rowsByPage.shortTermDemandForecastRuns,
      shortTermDemandForecastResult: rowsByPage.shortTermDemandForecastResults,
      deploymentDecisionStrategy: rowsByPage.deploymentDecisionStrategies,
      deploymentDecisionRun: rowsByPage.deploymentDecisionRuns,
      deploymentPlan: rowsByPage.deploymentPlans,
      supplyOrder: rowsByPage.supplyOrders,
      dealerSupply: rowsByPage.dealerSupplies,
      ownerSupply: rowsByPage.ownerSupplies,
      cleaningTask: rowsByPage.cleaningTasks,
      chargingTask: rowsByPage.chargingTasks,
      maintenanceTask: rowsByPage.maintenanceTasks,
      failureHandlingTask: rowsByPage.failureHandlingTasks,
      retirementTask: rowsByPage.retirementTasks,
      fleetOperationPolicy: rowsByPage.fleetOperationPolicies,
      fleetOperationPolicyRun: rowsByPage.fleetOperationPolicyRuns,
      fleetOperationPolicyResult: rowsByPage.fleetOperationPolicyResults,
      fleetOperationDispatchStrategy: rowsByPage.fleetOperationDispatchStrategies,
      fleetOperationDispatchRun: rowsByPage.fleetOperationDispatchRuns,
      fleetOperationDispatchDecision: rowsByPage.fleetOperationDispatchDecisions,
      taskDispatchStrategy: rowsByPage.taskDispatchStrategies,
      robotaxiTaskPlanningStrategy: rowsByPage.robotaxiTaskPlanningStrategies,
      robotaxiTaskPlanningRun: rowsByPage.robotaxiTaskPlanningRuns,
      robotaxiTaskPlanningResult: rowsByPage.robotaxiTaskPlanningResults,
      taskDispatchRun: rowsByPage.taskDispatchRuns,
      taskDispatchResult: rowsByPage.taskDispatchResults,
      taskPriorityConfig: rowsByPage.taskPriorityConfig,
      taskEventLog: taskEventLogs,
      validation: validations,
    };

    return collections[selected.type]?.find((item) => item[idFieldByType[selected.type]] === selected.id) || null;
  }, [allFleetOperationTasks, costRecords, data, deploymentTasks, readinessTasks, routeExecutions, rowsByPage, selected, simulationPolicies, simulationRuns, simulationEvents, taskEventLogs, timedOperations, validations]);

  const menuItems = pageGroups.map((group) => {
    const icon = <span className="menu-group-icon" aria-hidden="true">{menuGroupIcons[group.key] || "·"}</span>;
    const children = createMenuItems(group.children || []);
    return {
      key: group.key,
      label: group.label,
      icon,
      ...(children.length ? { children } : {}),
    };
  });
  const activeConfig = tableConfig[activePage];
  const activeObjectType = pageObjectType[activePage];
  const detailSelectedObject = activePage === "console"
    ? selectedObject
    : selected.type === activeObjectType ? selectedObject : null;
  const detailSelectedType = activePage === "console" ? selected.type : activeObjectType;
  const showConsoleSummary = activePage === "console";
  const pageContext = pageContextService.resolvePageContext({ page: activePage, menuLabel: getPageLabel(activePage), config: activeConfig });
  const pagePresentation = pageContextService.resolvePagePresentation(activePage);
  const topTitle = showConsoleSummary ? "地图空间" : pageContext.title;
  const topDescription = showConsoleSummary ? null : pageContext.description;
  const activeRows = rowsByPage[activePage] || [];
  const detailCollapsed = detailCollapsedByPage[activePage] ?? !detailSelectedObject;
  const detailHidden = !pagePresentation.usesDetailRail;

  useEffect(() => {
    if (!runtimeHydrated) return;
    const debounceMs = getRuntimePersistenceDebounceMs(simulationPolicies);
    const timerId = window.setTimeout(() => {
      saveRuntimeSnapshot({
        operationalData,
        readinessTasks,
        cleaningTasks,
        chargingTasks,
        maintenanceTasks,
        failureHandlingTasks,
        retirementTasks,
        fleetOperationPolicies,
        fleetOperationPolicyRuns,
        fleetOperationPolicyResults,
        fleetOperationDispatchStrategies,
        fleetOperationDispatchRuns,
        fleetOperationDispatchDecisions,
        taskDispatchStrategies,
        robotaxiTaskPlanningStrategies,
        robotaxiTaskPlanningRuns,
        robotaxiTaskPlanningResults,
        taskDispatchRuns,
        taskDispatchResults,
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
        metricDefinitions,
        metricCalculationRuns,
        metricObservations,
        metricPeriodType,
        simulationRuns,
        simulationEvents,
        timedOperations,
        activePage,
        workspacePages,
        detailCollapsedByPage,
        pageSelections,
        pageUiState,
      });
      persistSimulationEvents(simulationEvents);
    }, debounceMs);
    return () => window.clearTimeout(timerId);
  }, [activePage, businessTimingCalculationRuns, chargingTasks, cleaningTasks, costCalculationRuns, costModelProfiles, costRecords, demandSimulationRuns, deploymentTasks, detailCollapsedByPage, failureHandlingTasks, fleetOperationDispatchDecisions, fleetOperationDispatchRuns, fleetOperationDispatchStrategies, fleetOperationPolicies, fleetOperationPolicyResults, fleetOperationPolicyRuns, maintenanceTasks, metricCalculationRuns, metricDefinitions, metricObservations, metricPeriodType, operationalData, orderMatchingDecisions, orderMatchingRuns, pageSelections, pageUiState, pricingDecisions, pricingStrategyRuns, readinessTasks, retirementTasks, revenueCalculationRuns, revenueRecords, robotaxiTaskPlanningResults, robotaxiTaskPlanningRuns, robotaxiTaskPlanningStrategies, routeExecutions, routePlanningRuns, runtimeHydrated, serviceOrders, simulationEvents, simulationPolicies, simulationRuns, taskDispatchResults, taskDispatchRuns, taskDispatchStrategies, taskEventLogs, timedOperations, trips, workflowTimingProfiles, workspacePages]);



  // ===== Simulation 控制 =====
  const getBusinessData = () => {
    const businessData = {
      serviceOrders,
      trips,
      readinessTasks,
      cleaningTasks,
      chargingTasks,
      maintenanceTasks,
      failureHandlingTasks,
      retirementTasks,
      fleetOperationPolicies,
      fleetOperationPolicyRuns,
      fleetOperationPolicyResults,
      taskDispatchStrategies,
      robotaxiTaskPlanningStrategies,
      robotaxiTaskPlanningRuns,
      robotaxiTaskPlanningResults,
      taskDispatchRuns,
      taskDispatchResults,
      deploymentTasks,
      routeExecutions,
      routes: data.routes,
      workers: data.workers,
      routePlanningRuns,
      robotaxis: data.robotaxis,
      data,
      serviceOrderService,
      tripService,
      demandSimulationEngine: { runDemandSimulation },
      demandSimulationRuns,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      taskEventLogs,
      timedOperations,
      workflowTimingProfiles,
      costModelProfiles,
      costRecords,
      revenueRecords,
    };
    const refreshContextData = () => {
      businessData.data = {
        ...businessData.data,
        robotaxis: businessData.robotaxis,
        serviceOrders: businessData.serviceOrders,
        trips: businessData.trips,
        readinessCheckTasks: businessData.readinessTasks,
        cleaningTasks: businessData.cleaningTasks,
        chargingTasks: businessData.chargingTasks,
        maintenanceTasks: businessData.maintenanceTasks,
        failureHandlingTasks: businessData.failureHandlingTasks,
        retirementTasks: businessData.retirementTasks,
        taskDispatchStrategies: businessData.taskDispatchStrategies,
        robotaxiTaskPlanningStrategies: businessData.robotaxiTaskPlanningStrategies,
        robotaxiTaskPlanningRuns: businessData.robotaxiTaskPlanningRuns,
        robotaxiTaskPlanningResults: businessData.robotaxiTaskPlanningResults,
        taskDispatchRuns: businessData.taskDispatchRuns,
        taskDispatchResults: businessData.taskDispatchResults,
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
        timedOperations: businessData.timedOperations,
        workflowTimingProfiles: businessData.workflowTimingProfiles,
        costModelProfiles: businessData.costModelProfiles,
        costRecords: businessData.costRecords,
        revenueRecords: businessData.revenueRecords,
      };
    };
    const bindSetter = (key, setter) => (updater) => {
      const nextValue = typeof updater === "function" ? updater(businessData[key]) : updater;
      businessData[key] = nextValue;
      refreshContextData();
      setter(nextValue);
    };
    businessData.setServiceOrders = bindSetter("serviceOrders", setServiceOrders);
    businessData.setTrips = bindSetter("trips", setTrips);
    businessData.setReadinessTasks = bindSetter("readinessTasks", setReadinessTasks);
    businessData.setCleaningTasks = bindSetter("cleaningTasks", setCleaningTasks);
    businessData.setChargingTasks = bindSetter("chargingTasks", setChargingTasks);
    businessData.setMaintenanceTasks = bindSetter("maintenanceTasks", setMaintenanceTasks);
    businessData.setFailureHandlingTasks = bindSetter("failureHandlingTasks", setFailureHandlingTasks);
    businessData.setRetirementTasks = bindSetter("retirementTasks", setRetirementTasks);
    businessData.setDeploymentTasks = bindSetter("deploymentTasks", setDeploymentTasks);
    businessData.setRouteExecutions = bindSetter("routeExecutions", setRouteExecutions);
    businessData.setRoutePlanningRuns = bindSetter("routePlanningRuns", setRoutePlanningRuns);
    businessData.setDemandSimulationRuns = bindSetter("demandSimulationRuns", setDemandSimulationRuns);
    businessData.setPricingStrategyRuns = bindSetter("pricingStrategyRuns", setPricingStrategyRuns);
    businessData.setPricingDecisions = bindSetter("pricingDecisions", setPricingDecisions);
    businessData.setOrderMatchingRuns = bindSetter("orderMatchingRuns", setOrderMatchingRuns);
    businessData.setOrderMatchingDecisions = bindSetter("orderMatchingDecisions", setOrderMatchingDecisions);
    businessData.setRobotaxiTaskPlanningRuns = bindSetter("robotaxiTaskPlanningRuns", setRobotaxiTaskPlanningRuns);
    businessData.setRobotaxiTaskPlanningResults = bindSetter("robotaxiTaskPlanningResults", setRobotaxiTaskPlanningResults);
    businessData.setTaskDispatchRuns = bindSetter("taskDispatchRuns", setTaskDispatchRuns);
    businessData.setTaskDispatchResults = bindSetter("taskDispatchResults", setTaskDispatchResults);
    businessData.setTaskEventLogs = bindSetter("taskEventLogs", setTaskEventLogs);
    businessData.setTimedOperations = bindSetter("timedOperations", setTimedOperations);
    businessData.setCostRecords = bindSetter("costRecords", setCostRecords);
    businessData.setRevenueRecords = bindSetter("revenueRecords", setRevenueRecords);
    businessData.setRobotaxis = (updater) => {
      const nextRobotaxis = typeof updater === "function" ? updater(businessData.robotaxis) : updater;
      businessData.robotaxis = nextRobotaxis;
      refreshContextData();
      setOperationalData((prev) => ({ ...prev, robotaxis: nextRobotaxis }));
    };
    businessData.setRoutes = (updater) => {
      const nextRoutes = typeof updater === "function" ? updater(businessData.routes) : updater;
      businessData.routes = nextRoutes;
      refreshContextData();
      setOperationalData((prev) => ({ ...prev, routes: nextRoutes }));
    };
    refreshContextData();
    return businessData;
  };

  function runManualBusinessAction(action) {
    if (!businessActionService || typeof action !== "function") return null;
    const state = {
      data,
      demandSimulationEngine: { runDemandSimulation },
      demandSimulationRuns,
      serviceOrders,
      trips,
      readinessTasks,
      deploymentTasks,
      cleaningTasks,
      chargingTasks,
      maintenanceTasks,
      failureHandlingTasks,
      retirementTasks,
      routeExecutions,
      routes: data.routes,
      routePlanningRuns,
      robotaxis: data.robotaxis,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      robotaxiTaskPlanningRuns,
      robotaxiTaskPlanningResults,
      taskEventLogs,
      timedOperations,
      workflowTimingProfiles,
      costModelProfiles,
      costRecords,
      revenueRecords,
    };
    const activeWorkflowTimingProfile = getActiveWorkflowTimingProfileForBusinessAction();
    const runtime = {
      nextId: nextManualBusinessActionId,
      timeContext: { time_mode: "REAL_TIME", simulation_run_id: null, simulation_timeline_id: null },
      now,
      simulationTime: now,
      randomSeed: () => `MANUAL-${Date.now()}-${manualBusinessActionSequence}`,
      audit: (options = {}) => {
        const timestamp = now();
        return {
          record_source: "MANUAL",
          updated_at: timestamp,
          ...(options.created ? { created_at: timestamp } : {}),
          ...(options.completed ? { completed_at: timestamp } : {}),
        };
      },
      workflowTimingProfile: activeWorkflowTimingProfile,
      context: { trigger_source: "MANUAL_UI" },
    };
    const result = action({ state, runtime });
    applyManualBusinessUpdates(result?.updates || {});
    return result;
  }

  function runRepeatedManualBusinessAction(action, { maxIterations = 50, isProgressResult = null } = {}) {
    return runManualBusinessAction(({ state, runtime }) => {
      let workingState = state;
      const results = [];
      for (let index = 0; index < maxIterations; index += 1) {
        const result = action({ state: workingState, runtime });
        if (!result?.success || !result.updates || (isProgressResult && !isProgressResult(result))) {
          if (results.length === 0) return result;
          break;
        }
        results.push(result);
        workingState = {
          ...workingState,
          ...result.updates,
          data: {
            ...(workingState.data || {}),
            ...(result.updates.robotaxis ? { robotaxis: result.updates.robotaxis } : {}),
            ...(result.updates.workers ? { workers: result.updates.workers } : {}),
            ...(result.updates.routes ? { routes: result.updates.routes } : {}),
            ...(result.updates.serviceOrders ? { serviceOrders: result.updates.serviceOrders } : {}),
            ...(result.updates.trips ? { trips: result.updates.trips } : {}),
            ...(result.updates.deploymentTasks ? { deploymentTasks: result.updates.deploymentTasks } : {}),
            ...(result.updates.readinessTasks ? { readinessTasks: result.updates.readinessTasks } : {}),
            ...(result.updates.routeExecutions ? { routeExecutions: result.updates.routeExecutions } : {}),
          },
        };
      }
      const latest = results.at(-1);
      return {
        success: true,
        resultType: latest?.resultType || "BATCH_BUSINESS_ACTION_COMPLETED",
        message: `批量业务动作完成 ${results.length} 条`,
        data: {
          objectType: latest?.data?.objectType || null,
          objectId: latest?.data?.objectId || null,
          results: results.map((item) => item.data).filter(Boolean),
          createdCount: results.length,
        },
        updates: Object.fromEntries(Object.entries(workingState).filter(([key]) => key !== "data")),
      };
    });
  }

  function getActiveWorkflowTimingProfileForBusinessAction() {
    return workflowTimingProfiles.find((item) => item.profile_status === "ACTIVE") || workflowTimingProfiles[0] || null;
  }

  function applyManualBusinessUpdates(updates) {
    if (!updates || typeof updates !== "object") return;
    if (updates.serviceOrders) setServiceOrders(updates.serviceOrders);
    if (updates.trips) setTrips(updates.trips);
    if (updates.readinessTasks) setReadinessTasks(updates.readinessTasks);
    if (updates.deploymentTasks) setDeploymentTasks(updates.deploymentTasks);
    if (updates.cleaningTasks) setCleaningTasks(updates.cleaningTasks);
    if (updates.chargingTasks) setChargingTasks(updates.chargingTasks);
    if (updates.maintenanceTasks) setMaintenanceTasks(updates.maintenanceTasks);
    if (updates.failureHandlingTasks) setFailureHandlingTasks(updates.failureHandlingTasks);
    if (updates.retirementTasks) setRetirementTasks(updates.retirementTasks);
    if (updates.routeExecutions) setRouteExecutions(updates.routeExecutions);
    if (updates.routePlanningRuns) setRoutePlanningRuns(updates.routePlanningRuns);
    if (updates.pricingStrategyRuns) setPricingStrategyRuns(updates.pricingStrategyRuns);
    if (updates.pricingDecisions) setPricingDecisions(updates.pricingDecisions);
    if (updates.orderMatchingRuns) setOrderMatchingRuns(updates.orderMatchingRuns);
    if (updates.orderMatchingDecisions) setOrderMatchingDecisions(updates.orderMatchingDecisions);
    if (updates.robotaxiTaskPlanningRuns) setRobotaxiTaskPlanningRuns(updates.robotaxiTaskPlanningRuns);
    if (updates.robotaxiTaskPlanningResults) setRobotaxiTaskPlanningResults(updates.robotaxiTaskPlanningResults);
    if (updates.taskEventLogs) setTaskEventLogs(updates.taskEventLogs);
    if (updates.timedOperations) setTimedOperations(updates.timedOperations);
    if (updates.costRecords) setCostRecords(updates.costRecords);
    if (updates.revenueRecords) setRevenueRecords(updates.revenueRecords);
    if (updates.demandSimulationRuns) setDemandSimulationRuns(updates.demandSimulationRuns);
    if (updates.routes || updates.robotaxis || updates.workers) {
      setOperationalData((current) => ({
        ...current,
        ...(updates.routes ? { routes: updates.routes } : {}),
        ...(updates.robotaxis ? { robotaxis: updates.robotaxis } : {}),
        ...(updates.workers ? { workers: updates.workers } : {}),
      }));
    }
  }

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
    getBusinessData,
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
    if (!runtimeHydrated || !publicDemoBootstrapService) return;
    const bootstrapState = publicDemoBootstrapRef.current;
    if (bootstrapState.completed) return;
    const plan = publicDemoBootstrapService.createPublicDemoBootstrapPlan({
      locationLike: window.location,
      forecastResults: operationalData.longTermDemandForecasts || [],
      shortTermForecastResults: operationalData.shortTermDemandForecastResults || [],
      simulationRuns,
    });
    if (!plan.enabled) return;
    if (plan.forecastAction === publicDemoBootstrapService.PublicDemoBootstrapAction.NONE
      && plan.shortTermForecastAction === publicDemoBootstrapService.PublicDemoBootstrapAction.NONE
      && plan.simulationAction === publicDemoBootstrapService.PublicDemoBootstrapAction.NONE) {
      bootstrapState.completed = true;
      return;
    }

    if (plan.forecastAction === publicDemoBootstrapService.PublicDemoBootstrapAction.EXECUTE_FORECAST
      && !bootstrapState.forecastRequested) {
      bootstrapState.forecastRequested = true;
      const forecast = publicDemoBootstrapService.executePublicDemoForecast({
        planningService: businessPlanningService,
        operationalData,
        context: {
          now,
          nextRunId: nextLongTermDemandForecastRunId,
          nextResultBaseId: nextLongTermDemandForecastResultBaseId,
        },
      });
      if (forecast.executed) setOperationalData(forecast.operationalData);
    }

    if (plan.shortTermForecastAction === publicDemoBootstrapService.PublicDemoBootstrapAction.EXECUTE_SHORT_TERM_FORECAST
      && !bootstrapState.shortTermForecastRequested) {
      bootstrapState.shortTermForecastRequested = true;
      setOperationalData((current) => publicDemoBootstrapService.executePublicDemoShortTermForecast({
        planningService: operatingPlanningService,
        operationalData: current,
        context: {
          now,
          nextRunId: nextShortTermDemandForecastRunId,
          nextResultId: nextShortTermDemandForecastResultId,
        },
      }).operationalData);
    }

    const actions = simActionsRef.current;
    if (!actions) return;
    if (plan.simulationAction === publicDemoBootstrapService.PublicDemoBootstrapAction.CREATE_SIMULATION
      && simulationPolicies.length
      && !bootstrapState.simulationCreated) {
      bootstrapState.simulationCreated = true;
      actions.createSimulationRun();
    }
    if (plan.simulationAction === publicDemoBootstrapService.PublicDemoBootstrapAction.START_SIMULATION
      && plan.simulationRunId
      && !bootstrapState.startedSimulationRunIds.has(plan.simulationRunId)) {
      bootstrapState.startedSimulationRunIds.add(plan.simulationRunId);
      actions.startSimulationRun(plan.simulationRunId);
    }
  }, [operationalData, runtimeHydrated, simulationPolicies.length, simulationRuns]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("publicDemo") !== "1") return;
    window.__robotaxiPublicDemoState = {
      forecastResultCount: operationalData.longTermDemandForecasts?.length || 0,
      shortTermForecastResultCount: operationalData.shortTermDemandForecastResults?.length || 0,
      simulationStatuses: simulationRuns.map((item) => item.simulation_status),
    };
  }, [operationalData.longTermDemandForecasts, operationalData.shortTermDemandForecastResults, simulationRuns]);

  useEffect(() => {
    return () => { if (simActionsRef.current) simActionsRef.current.cleanup(); };
  }, []);

  useEffect(() => {
    simulationRuns
      .filter((run) => run.simulation_status === "COMPLETED")
      .filter((run) => !autoFinanceCalculationRunIdsRef.current.has(run.simulation_run_id))
      .filter((run) => run.cost_calculation_status !== "CALCULATING" && run.revenue_calculation_status !== "CALCULATING")
      .forEach((run) => {
        autoFinanceCalculationRunIdsRef.current.add(run.simulation_run_id);
        window.setTimeout(() => {
          runCostCalculation(run.simulation_run_id, { automatic: true });
          runRevenueCalculation(run.simulation_run_id, { automatic: true });
        }, 0);
      });
  }, [simulationRuns]);

  useEffect(() => {
    if (metricCalculationInProgress) return;
    const eligibleRuns = simulationRuns
      .filter((run) => run.simulation_status === "COMPLETED")
      .filter((run) => !autoMetricCalculationRunIdsRef.current.has(run.simulation_run_id))
      .filter((run) => isFinanceCalculationTerminal(run.cost_calculation_status))
      .filter((run) => isFinanceCalculationTerminal(run.revenue_calculation_status));
    if (!eligibleRuns.length) return;
    eligibleRuns.forEach((run) => autoMetricCalculationRunIdsRef.current.add(run.simulation_run_id));
    window.setTimeout(() => {
      runMetricCalculation(metricPeriodType, { automatic: true });
    }, 0);
  }, [simulationRuns, costRecords, revenueRecords, metricPeriodType, metricCalculationInProgress]);

  function requestBusinessTimingCalculation(runId) {
    const run = simulationRuns.find((item) => item.simulation_run_id === runId);
    if (!run) return;
    setPendingCalculationRunId(runId);
  }

  function runBusinessTimingCalculation(runId, { automatic = false } = {}) {
    const run = simulationRuns.find((item) => item.simulation_run_id === runId);
    const profile = workflowTimingProfiles.find((item) => item.profile_status === "ACTIVE");
    if (!run || !profile || !["COMPLETED", "STOPPED", "FAILED"].includes(run.simulation_status)) return;
    const calculationRunId = `BTCR-${String(businessTimingCalculationRuns.length + 1).padStart(4, "0")}`;
    const calculationStartedAt = Date.now();
    const scope = createCurrentBusinessScope(run);
    setSimulationEvents((current) => [simulationEngine.createOperatingSimulationTimeCalculationEvent({
      simulationRun: run,
      eventType: "OPERATING_SIMULATION_TIME_CALCULATION_STARTED",
      message: `开始计算 ${run.simulation_run_id} 的运营模拟时间`,
      calculationRunId,
      profile,
    }), ...current]);
    setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
      ...item,
      business_timing_calculation_status: "CALCULATING",
      calculation_progress_percent: 12,
      active_business_timing_calculation_run_id: calculationRunId,
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
            cleaningTasks,
            chargingTasks,
            maintenanceTasks,
            failureHandlingTasks,
            retirementTasks,
            deploymentTasks,
            routeExecutions,
            serviceOrders,
            trips,
            pricingStrategyRuns,
            pricingDecisions,
            orderMatchingRuns,
            orderMatchingDecisions,
            routePlanningRuns,
            demandSimulationRuns,
          },
        });
        const calculated = result.businessData;
        setReadinessTasks((current) => mergeCalculatedObjects(current, calculated.readinessTasks, "task_id"));
        setCleaningTasks((current) => mergeCalculatedObjects(current, calculated.cleaningTasks, "task_id"));
        setChargingTasks((current) => mergeCalculatedObjects(current, calculated.chargingTasks, "task_id"));
        setMaintenanceTasks((current) => mergeCalculatedObjects(current, calculated.maintenanceTasks, "task_id"));
        setFailureHandlingTasks((current) => mergeCalculatedObjects(current, calculated.failureHandlingTasks, "task_id"));
        setRetirementTasks((current) => mergeCalculatedObjects(current, calculated.retirementTasks, "task_id"));
        setDeploymentTasks((current) => mergeCalculatedObjects(current, calculated.deploymentTasks, "task_id"));
        setRouteExecutions((current) => mergeCalculatedObjects(current, calculated.routeExecutions, "route_execution_id"));
        setServiceOrders((current) => mergeCalculatedObjects(current, calculated.serviceOrders, "service_order_id"));
        setTrips((current) => mergeCalculatedObjects(current, calculated.trips, "trip_id"));
        setPricingStrategyRuns((current) => mergeCalculatedObjects(current, calculated.pricingStrategyRuns, "pricing_strategy_run_id"));
        setPricingDecisions((current) => mergeCalculatedObjects(current, calculated.pricingDecisions, "pricing_decision_id"));
        setOrderMatchingRuns((current) => mergeCalculatedObjects(current, calculated.orderMatchingRuns, "order_matching_run_id"));
        setOrderMatchingDecisions((current) => mergeCalculatedObjects(current, calculated.orderMatchingDecisions, "order_matching_decision_id"));
        setRoutePlanningRuns((current) => mergeCalculatedObjects(current, calculated.routePlanningRuns, "route_planning_run_id"));
        setDemandSimulationRuns((current) => mergeCalculatedObjects(current, calculated.demandSimulationRuns, "demand_simulation_run_id"));
        setBusinessTimingCalculationRuns((current) => [result.calculationRun, ...current]);
        setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
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
            total_transition_count: result.calculationRun.total_transition_count,
          },
          business_timing_calculation_errors: result.calculationRun.calculation_errors,
        } : item));
        const resultSummary = {
          calculation_status: result.calculationRun.calculation_status,
          total_object_count: result.calculationRun.total_object_count,
          success_object_count: result.calculationRun.success_object_count,
          failed_object_count: result.calculationRun.failed_object_count,
          total_transition_count: result.calculationRun.total_transition_count,
          calculation_duration_ms: Date.now() - calculationStartedAt,
          calculation_errors: result.calculationRun.calculation_errors,
        };
        setSimulationEvents((current) => [simulationEngine.createOperatingSimulationTimeCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_SIMULATION_TIME_CALCULATION_COMPLETED",
          message: result.calculationRun.calculation_status === "SUCCEEDED"
            ? `运营模拟时间计算完成：${result.calculationRun.total_object_count} 个对象、${result.calculationRun.total_transition_count} 次状态变更`
            : `运营模拟时间计算完成，${result.calculationRun.failed_object_count} 个对象需要检查`,
          calculationRunId,
          profile,
          resultSummary,
        }), ...current]);
        if (!automatic) antd.message.success(result.calculationRun.calculation_status === "SUCCEEDED" ? "运营模拟时间计算完成" : "运营模拟时间计算完成，存在待检查项");
      } catch (error) {
        setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
          ...item,
          business_timing_calculation_status: "FAILED",
          calculation_progress_percent: 100,
          business_timing_calculation_errors: [{ error_type: "CALCULATION_FAILED", error_message: error.message }],
        } : item));
        setSimulationEvents((current) => [simulationEngine.createOperatingSimulationTimeCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_SIMULATION_TIME_CALCULATION_FAILED",
          eventResult: "FAILED",
          message: `运营模拟时间计算失败：${error.message}`,
          calculationRunId,
          profile,
          failureReason: error.message,
          resultSummary: { calculation_duration_ms: Date.now() - calculationStartedAt },
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
    setWorkflowTimingProfiles((profiles) => profiles.map((profile) => profile.profile_status === "ACTIVE"
      ? businessTimingCalculator.updateWorkflowTimingRule(profile, pendingTimingRule.workflow_timing_rule_id, timingRuleValue)
      : profile));
    setTimingRuleModalOpen(false);
  }

  function confirmBusinessTimingCalculation() {
    if (!pendingCalculationRunId) return;
    const runId = pendingCalculationRunId;
    setPendingCalculationRunId(null);
    runBusinessTimingCalculation(runId, { automatic: false });
  }

  function requestCostCalculation(runId) {
    const run = simulationRuns.find((item) => item.simulation_run_id === runId);
    if (!run) return;
    setPendingCostCalculationRunId(runId);
  }

  function confirmCostCalculation() {
    if (!pendingCostCalculationRunId) return;
    const runId = pendingCostCalculationRunId;
    setPendingCostCalculationRunId(null);
    runCostCalculation(runId);
  }

  function runCostCalculation(runId, { automatic = false } = {}) {
    const run = simulationRuns.find((item) => item.simulation_run_id === runId);
    const profile = costModelProfiles.find((item) => item.profile_status === "ACTIVE");
    if (!run || !profile || !["COMPLETED", "STOPPED", "FAILED"].includes(run.simulation_status)) return;
    const calculationRunId = `CCR-${String(costCalculationRuns.length + 1).padStart(4, "0")}`;
    const scope = createCurrentBusinessScope(run);
    setSimulationEvents((current) => [simulationEngine.createOperatingCostCalculationEvent({
      simulationRun: run,
      eventType: "OPERATING_COST_CALCULATION_STARTED",
      message: `开始计算 ${run.simulation_run_id} 的运营成本`,
      calculationRunId,
      profile,
    }), ...current]);
    setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
      ...item,
      cost_calculation_status: "CALCULATING",
      cost_calculation_progress_percent: 15,
      active_cost_calculation_run_id: calculationRunId,
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
            cleaningTasks,
            chargingTasks,
            maintenanceTasks,
            failureHandlingTasks,
            retirementTasks,
            deploymentTasks,
            routeExecutions,
            serviceOrders,
            trips,
          },
        });
        const calculated = result.businessData;
        setReadinessTasks((current) => mergeCalculatedObjects(current, calculated.readinessTasks, "task_id"));
        setCleaningTasks((current) => mergeCalculatedObjects(current, calculated.cleaningTasks, "task_id"));
        setChargingTasks((current) => mergeCalculatedObjects(current, calculated.chargingTasks, "task_id"));
        setMaintenanceTasks((current) => mergeCalculatedObjects(current, calculated.maintenanceTasks, "task_id"));
        setFailureHandlingTasks((current) => mergeCalculatedObjects(current, calculated.failureHandlingTasks, "task_id"));
        setRetirementTasks((current) => mergeCalculatedObjects(current, calculated.retirementTasks, "task_id"));
        setDeploymentTasks((current) => mergeCalculatedObjects(current, calculated.deploymentTasks, "task_id"));
        setRouteExecutions((current) => mergeCalculatedObjects(current, calculated.routeExecutions, "route_execution_id"));
        setServiceOrders((current) => mergeCalculatedObjects(current, calculated.serviceOrders, "service_order_id"));
        setTrips((current) => mergeCalculatedObjects(current, calculated.trips, "trip_id"));
        setCostRecords((current) => [
          ...result.costRecords,
          ...current.filter((record) => record.simulation_run_id !== runId),
        ]);
        setCostCalculationRuns((current) => [result.calculationRun, ...current]);
        setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
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
            error_count: result.calculationRun.error_count,
          },
          cost_calculation_errors: result.calculationRun.calculation_errors,
        } : item));
        setSimulationEvents((current) => [simulationEngine.createOperatingCostCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_COST_CALCULATION_COMPLETED",
          message: result.calculationRun.calculation_status === "SUCCEEDED"
            ? `运营成本计算完成：生成 ${result.calculationRun.generated_cost_record_count} 条成本记录，总成本 ${result.calculationRun.total_cost_amount} ${profile.currency_code}`
            : `运营成本计算完成，${result.calculationRun.error_count} 项需要检查`,
          calculationRunId,
          profile,
          resultSummary: {
            calculation_status: result.calculationRun.calculation_status,
            generated_cost_record_count: result.calculationRun.generated_cost_record_count,
            total_cost_amount: result.calculationRun.total_cost_amount,
            error_count: result.calculationRun.error_count,
            calculation_errors: result.calculationRun.calculation_errors,
          },
        }), ...current]);
        if (!automatic) antd.message.success(result.calculationRun.calculation_status === "SUCCEEDED" ? "运营成本计算完成" : "运营成本计算完成，存在待检查项");
      } catch (error) {
        setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
          ...item,
          cost_calculation_status: "FAILED",
          cost_calculation_progress_percent: 100,
          cost_calculation_errors: [{ error_type: "COST_CALCULATION_FAILED", error_message: error.message }],
        } : item));
        setSimulationEvents((current) => [simulationEngine.createOperatingCostCalculationEvent({
          simulationRun: run,
          eventType: "OPERATING_COST_CALCULATION_FAILED",
          eventResult: "FAILED",
          message: `运营成本计算失败：${error.message}`,
          calculationRunId,
          profile,
          failureReason: error.message,
        }), ...current]);
        if (!automatic) antd.message.error(`运营成本计算失败：${error.message}`);
      }
    }, 80);
  }

  function createCurrentBusinessScope(run) {
    return simulationRunBusinessScope.createSimulationRunBusinessScope(run, {
      ...data,
      readinessTasks,
      cleaningTasks,
      chargingTasks,
      maintenanceTasks,
      failureHandlingTasks,
      retirementTasks,
      deploymentTasks,
      routeExecutions,
      serviceOrders,
      trips,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      routePlanningRuns,
      demandSimulationRuns,
    });
  }

  function createOperatingMetricScope() {
    return {
      serviceOrders,
      trips,
      readinessTasks,
      cleaningTasks,
      chargingTasks,
      maintenanceTasks,
      failureHandlingTasks,
      retirementTasks,
      deploymentTasks,
      routeExecutions,
      pricingStrategyRuns,
      pricingDecisions,
      orderMatchingRuns,
      orderMatchingDecisions,
      routePlanningRuns,
      demandSimulationRuns,
      demandSimulationResults: createDemandSimulationResultRows(demandSimulationRuns),
      longTermDemandForecastRuns: data.longTermDemandForecastRuns || [],
      longTermDemandForecasts: data.longTermDemandForecasts || [],
      fleetAllocationRuns: data.fleetAllocationRuns || [],
      fleetAllocationResults: data.fleetAllocationResults || [],
      supplyDemandBalanceRuns: data.supplyDemandBalanceRuns || [],
      supplyDemandBalanceResults: data.supplyDemandBalanceResults || [],
      fleetOperationPolicyRuns,
      fleetOperationPolicyResults,
      fleetOperationDispatchRuns,
      fleetOperationDispatchDecisions,
      robotaxiTaskPlanningRuns,
      robotaxiTaskPlanningResults,
      supplyPlans: data.supplyPlans || [],
      productionBatches: data.productionBatches || [],
      robotaxiDeliveryOrders: data.robotaxiDeliveryOrders || [],
      decisionProcesses: decisionControlView.processes || [],
      routes: data.routes,
      robotaxis: data.robotaxis,
      maps: data.maps,
    };
  }

  function requestRevenueCalculation(runId) {
    const run = simulationRuns.find((item) => item.simulation_run_id === runId);
    if (!run) return;
    setPendingRevenueCalculationRunId(runId);
  }

  function refreshOperatingMetrics(periodType = metricPeriodType) {
    runMetricCalculation(periodType, { automatic: false });
  }

  function confirmRevenueCalculation() {
    if (!pendingRevenueCalculationRunId) return;
    const runId = pendingRevenueCalculationRunId;
    setPendingRevenueCalculationRunId(null);
    runRevenueCalculation(runId);
  }

  function runRevenueCalculation(runId, { automatic = false } = {}) {
    const run = simulationRuns.find((item) => item.simulation_run_id === runId);
    if (!run || !["COMPLETED", "STOPPED", "FAILED"].includes(run.simulation_status)) return;
    const calculationRunId = `RCR-${String(revenueCalculationRuns.length + 1).padStart(4, "0")}`;
    const scope = createCurrentBusinessScope(run);
    setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
      ...item,
      revenue_calculation_status: "CALCULATING",
      revenue_calculation_progress_percent: 15,
      active_revenue_calculation_run_id: calculationRunId,
    } : item));
    setTimeout(() => {
      try {
        const result = revenueCalculator.createRevenueCalculation({ simulationRun: run, scope, calculationRunId });
        if (result.businessData?.serviceOrders) {
          setServiceOrders((current) => mergeCalculatedObjects(current, result.businessData.serviceOrders, "service_order_id"));
        }
        setRevenueRecords((current) => [
          ...result.revenueRecords,
          ...current.filter((record) => record.simulation_run_id !== runId),
        ]);
        setRevenueCalculationRuns((current) => [result.calculationRun, ...current]);
        setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
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
            error_count: result.calculationRun.error_count,
          },
          revenue_calculation_errors: result.calculationRun.calculation_errors,
        } : item));
        if (!automatic) antd.message.success(result.calculationRun.calculation_status === "SUCCEEDED" ? "收入记录生成完成" : "收入记录生成完成，存在待检查项");
      } catch (error) {
        setSimulationRuns((current) => current.map((item) => item.simulation_run_id === runId ? {
          ...item,
          revenue_calculation_status: "FAILED",
          revenue_calculation_progress_percent: 100,
          revenue_calculation_errors: [{ error_type: "REVENUE_CALCULATION_FAILED", error_message: error.message }],
        } : item));
        if (!automatic) antd.message.error(`收入记录生成失败：${error.message}`);
      }
    }, 80);
  }

  function runMetricCalculation(periodType = metricPeriodType, { automatic = false } = {}) {
    if (metricCalculationInProgress) return;
    const calculationRunId = `MCR-${String(metricCalculationRuns.length + 1).padStart(4, "0")}`;
    const scope = createOperatingMetricScope();
    setMetricCalculationInProgress(true);
    setTimeout(() => {
      try {
        const result = operatingDataPoolService.calculateOperatingDataPool({
          simulationRuns,
          scope,
          revenueRecords,
          costRecords,
          metricDefinitions,
          calculationRunId,
          periodType,
        });
        setMetricObservations((current) => [
          ...result.metricObservations,
          ...current.filter((record) => !(record.metric_scope_type === "OPERATING_PERIOD" && record.metric_period_type === periodType)),
        ]);
        setMetricCalculationRuns((current) => [result.calculationRun, ...current]);
        if (!automatic) antd.message.success(result.calculationRun.calculation_status === "SUCCEEDED" ? "经营数据已更新" : "经营数据已更新，存在质量提示");
      } catch (error) {
        setMetricCalculationRuns((current) => [{
          metric_calculation_run_id: calculationRunId,
          metric_scope_type: "OPERATING_PERIOD",
          metric_period_type: periodType,
          metric_period_label: metricPeriodOptions.find((item) => item.value === periodType)?.label || "经营周期",
          simulation_run_id: null,
          simulation_run_ids: simulationRuns.map((run) => run.simulation_run_id),
          calculation_status: "FAILED",
          calculation_progress_percent: 100,
          metric_definition_count: metricDefinitions.length,
          generated_metric_observation_count: 0,
          error_count: 1,
          calculation_errors: [{ error_type: "METRIC_CALCULATION_FAILED", error_message: error.message }],
          algorithm_version: "1.0.0",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }, ...current]);
        if (!automatic) antd.message.error(`经营数据更新失败：${error.message}`);
      } finally {
        setMetricCalculationInProgress(false);
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
    setCostModelProfiles((profiles) => profiles.map((profile) => profile.profile_status === "ACTIVE"
      ? costModelCalculator.updateCostParameterRule(profile, pendingCostParameterRule.cost_parameter_key, costParameterValue)
      : profile));
    setCostParameterModalOpen(false);
  }

  function editDemandProfile(profile) {
    setPendingDemandProfile(profile);
    setDemandProfileDraft(createDemandProfileConfigDraft(profile));
    setDemandProfileModalOpen(true);
  }

  function saveDemandProfileConfig() {
    if (!pendingDemandProfile || !updateDemandProfileConfig) return;
    const patch = normalizeDemandProfileDraft(pendingDemandProfile, demandProfileDraft);
    setOperationalData((current) => {
      const nextDemandProfiles = updateDemandProfileConfig({
        demandProfiles: current.demandProfiles || [],
        profileId: pendingDemandProfile.profile_id,
        patch,
        places: current.places || [],
        serviceAreas: current.serviceAreas || [],
        zones: current.zones || [],
      });
      const legacyGroups = splitDemandProfilesByTarget ? splitDemandProfilesByTarget(nextDemandProfiles) : {};
      return normalizeOperationalRouteStrategies({
        ...current,
        demandProfiles: nextDemandProfiles,
        ...legacyGroups,
      });
    });
    setDemandProfileModalOpen(false);
    setPendingDemandProfile(null);
    setDemandProfileDraft({});
    antd.message.success("需求画像配置已保存，区域画像已重新计算");
  }

  function editBusinessTarget(businessTarget) {
    setPendingBusinessTarget(businessTarget);
    setBusinessTargetDraft(createBusinessTargetDraft(businessTarget));
    setBusinessTargetModalOpen(true);
  }

  function saveBusinessTargetConfig() {
    if (!pendingBusinessTarget || !businessPlanningService?.updateBusinessTargetConfig) return;
    const result = businessPlanningService.updateBusinessTargetConfig({
      businessTarget: pendingBusinessTarget,
      patch: normalizeBusinessTargetDraft(businessTargetDraft),
      context: { now },
    });
    if (!result.succeeded) {
      antd.message.warning(getDisplayValue(result.reason));
      return;
    }
    setOperationalData((current) => ({
      ...current,
      businessTargets: replaceCollectionItem(current.businessTargets || [], "business_target_id", result.businessTarget),
    }));
    setBusinessTargetModalOpen(false);
    setPendingBusinessTarget(null);
    setBusinessTargetDraft({});
    antd.message.success("经营目标配置已保存");
  }

  function editSupplyProductionProfile(profile) {
    setPendingSupplyProductionProfile(profile);
    setSupplyProductionProfileDraft(createSupplyProductionProfileDraft(profile));
    setSupplyProductionProfileModalOpen(true);
  }

  function saveSupplyProductionProfileConfig() {
    if (!pendingSupplyProductionProfile || !businessPlanningService?.updateSupplyProductionProfileConfig) return;
    const result = businessPlanningService.updateSupplyProductionProfileConfig({
      profile: pendingSupplyProductionProfile,
      patch: normalizeSupplyProductionProfileDraft(supplyProductionProfileDraft),
      context: { now },
    });
    if (!result.succeeded) {
      antd.message.warning(getDisplayValue(result.reason));
      return;
    }
    setOperationalData((current) => ({
      ...current,
      supplyProductionProfiles: replaceCollectionItem(current.supplyProductionProfiles || [], "profile_id", result.profile),
    }));
    setSupplyProductionProfileModalOpen(false);
    setPendingSupplyProductionProfile(null);
    setSupplyProductionProfileDraft({});
    antd.message.success("生产画像配置已保存");
  }

  function runLongTermDemandForecastStrategy(strategy) {
    if (!businessPlanningService?.executeLongTermDemandForecastStrategy || !strategy) return;
    const result = businessPlanningService.executeLongTermDemandForecastStrategy({
      strategy,
      businessTargets: data.businessTargets || [],
      demandProfiles: data.demandProfiles || [],
      supplyProductionProfiles: data.supplyProductionProfiles || [],
      robotaxis: data.robotaxis || [],
      context: {
        now,
        nextRunId: nextLongTermDemandForecastRunId,
        nextResultBaseId: nextLongTermDemandForecastResultBaseId,
      },
    });
    setOperationalData((current) => ({
      ...current,
      longTermDemandForecastRuns: [result.run, ...(current.longTermDemandForecastRuns || [])],
      longTermDemandForecasts: [...(result.results || []), ...(current.longTermDemandForecasts || [])],
    }));
    if (result.results?.length) {
      setActivePageAndMenu("longTermDemandForecasts");
      selectForPage("longTermDemandForecasts", "longTermDemandForecast", result.results[0].forecast_result_id);
    } else {
      appendRecordOperationEvent("longTermDemandForecastStrategies", {
        business_object_type: "longTermDemandForecastStrategy",
        business_object_id: strategy.forecast_strategy_id,
        action_type: "LONG_TERM_FORECAST_EXECUTE",
        result_type: "NO_RESULT",
        event_type: "LONG_TERM_FORECAST_EXECUTE",
        event_result: taskTypes.TaskEventResult.SKIPPED,
        message: "需求预测执行完成，但未生成预测结果",
      });
    }
  }

  function editLongTermDemandForecastStrategy(strategy) {
    setPendingLongTermDemandForecastStrategy(strategy);
    setLongTermDemandForecastStrategyDraft(createPlanningConfigDraft(longTermDemandForecastStrategyConfigFields, strategy));
    setLongTermDemandForecastStrategyModalOpen(true);
  }

  function saveLongTermDemandForecastStrategyConfig() {
    if (!pendingLongTermDemandForecastStrategy || !businessPlanningService?.updateLongTermDemandForecastStrategyConfig) return;
    const result = businessPlanningService.updateLongTermDemandForecastStrategyConfig({
      strategy: pendingLongTermDemandForecastStrategy,
      patch: normalizePlanningConfigDraft(longTermDemandForecastStrategyConfigFields, longTermDemandForecastStrategyDraft),
      context: { now },
    });
    if (!result.succeeded) return;
    setOperationalData((current) => ({
      ...current,
      longTermDemandForecastStrategies: replaceCollectionItem(current.longTermDemandForecastStrategies || [], "forecast_strategy_id", result.strategy),
    }));
    setLongTermDemandForecastStrategyModalOpen(false);
    setPendingLongTermDemandForecastStrategy(null);
    setLongTermDemandForecastStrategyDraft({});
  }

  function runSupplyDemandBalanceStrategy(strategy) {
    if (!supplyDemandBalanceService?.executeSupplyDemandBalanceStrategy || !strategy) return;
    const result = supplyDemandBalanceService.executeSupplyDemandBalanceStrategy({
      strategy,
      demandProfiles: data.demandProfiles || [],
      serviceOrders,
      trips,
      robotaxis: data.robotaxis || [],
      zones: data.zones || [],
      places: data.places || [],
      serviceAreas: data.serviceAreas || [],
      context: {
        now,
        nextRunId: nextSupplyDemandBalanceRunId,
        nextResultId: nextSupplyDemandBalanceResultId,
      },
    });
    setOperationalData((current) => ({
      ...current,
      supplyDemandBalanceRuns: [result.run, ...(current.supplyDemandBalanceRuns || [])],
      supplyDemandBalanceResults: [...(result.results || []), ...(current.supplyDemandBalanceResults || [])],
    }));
    if (result.results?.length) {
      selectForPage("supplyDemandBalanceResults", "supplyDemandBalanceResult", result.results[0].supply_demand_balance_result_id);
    } else {
      appendRecordOperationEvent("supplyDemandBalanceStrategies", {
        business_object_type: "supplyDemandBalanceStrategy",
        business_object_id: strategy.supply_demand_balance_strategy_id,
        action_type: "SUPPLY_DEMAND_BALANCE_EXECUTE",
        result_type: result.run?.failure_reason || "NO_RESULT",
        event_type: "SUPPLY_DEMAND_BALANCE_EXECUTE",
        event_result: taskTypes.TaskEventResult.SKIPPED,
        message: getDisplayValue(result.run?.failure_reason || "NO_SUPPLY_DEMAND_RESULT"),
      });
    }
  }

  function runShortTermDemandForecastStrategy(strategy) {
    if (!operatingPlanningService?.executeShortTermDemandForecast || !strategy) return;
    const result = operatingPlanningService.executeShortTermDemandForecast({
      strategy,
      demandProfiles: data.demandProfiles || [],
      serviceOrders,
      trips,
      zones: data.zones || [],
      places: data.places || [],
      serviceAreas: data.serviceAreas || [],
      context: { now, nextRunId: nextShortTermDemandForecastRunId, nextResultId: nextShortTermDemandForecastResultId },
    });
    setOperationalData((current) => ({
      ...current,
      shortTermDemandForecastRuns: [result.run, ...(current.shortTermDemandForecastRuns || [])],
      shortTermDemandForecastResults: [...(result.results || []), ...(current.shortTermDemandForecastResults || [])],
    }));
    if (result.results?.length) {
      setActivePageAndMenu("shortTermDemandForecastResults");
      selectForPage("shortTermDemandForecastResults", "shortTermDemandForecastResult", result.results[0].short_term_forecast_result_id);
    }
  }

  function runDeploymentDecisionStrategy(strategy) {
    if (!operatingPlanningService?.executeDeploymentDecision || !strategy) return;
    const forecastRun = (data.shortTermDemandForecastRuns || [])
      .filter((item) => item.run_status === "SUCCEEDED")
      .sort((left, right) => Date.parse(right.completed_at || right.started_at || 0) - Date.parse(left.completed_at || left.started_at || 0))[0];
    const result = operatingPlanningService.executeDeploymentDecision({
      strategy,
      forecastResults: data.shortTermDemandForecastResults || [],
      forecastRunId: forecastRun?.short_term_forecast_run_id || null,
      robotaxis: data.robotaxis || [],
      serviceOrders,
      trips,
      zones: data.zones || [],
      places: data.places || [],
      serviceAreas: data.serviceAreas || [],
      context: { now, nextRunId: nextDeploymentDecisionRunId, nextPlanId: nextDeploymentPlanId },
    });
    setOperationalData((current) => ({
      ...current,
      deploymentDecisionRuns: [result.run, ...(current.deploymentDecisionRuns || [])],
      deploymentPlans: [...(result.plans || []), ...(current.deploymentPlans || [])],
    }));
    if (result.plans?.length) {
      setActivePageAndMenu("deploymentPlans");
      selectForPage("deploymentPlans", "deploymentPlan", result.plans[0].deployment_plan_id);
    }
  }

  function runSupplyDecisionStrategy(strategy) {
    const forecast = (data.longTermDemandForecasts || [])[0];
    if (!forecast || !businessPlanningService?.executeSupplyDecisionStrategy) return;
    const result = businessPlanningService.executeSupplyDecisionStrategy({
      strategy,
      forecast,
      supplyProductionProfiles: data.supplyProductionProfiles || [],
      existingSupplyPlans: data.supplyPlans || [],
      context: { now, nextRunId: nextSupplyDecisionRunId, nextSupplyPlanId },
    });
    setOperationalData((current) => ({
      ...current,
      supplyDecisionRuns: [result.run, ...(current.supplyDecisionRuns || [])],
      supplyPlans: result.succeeded ? [result.supplyPlan, ...(current.supplyPlans || [])] : current.supplyPlans,
    }));
    if (result.succeeded) {
      setActivePageAndMenu("supplyPlans");
      selectForPage("supplyPlans", "supplyPlan", result.supplyPlan.supply_plan_id);
    }
  }

  function createSupplyPlanFromForecast(row) {
    if (!businessPlanningService?.executeSupplyDecisionStrategy || !row) return;
    const strategy = (data.supplyDecisionStrategies || []).find((item) => item.strategy_status === "ACTIVE") || data.supplyDecisionStrategies?.[0];
    const result = businessPlanningService.executeSupplyDecisionStrategy({
      strategy,
      forecast: row,
      supplyProductionProfiles: data.supplyProductionProfiles || [],
      existingSupplyPlans: data.supplyPlans || [],
      context: { now, nextRunId: nextSupplyDecisionRunId, nextSupplyPlanId },
    });
    if (!result.succeeded) {
      appendRecordOperationEvent("longTermDemandForecasts", {
        business_object_type: "longTermDemandForecast",
        business_object_id: row.forecast_result_id,
        action_type: "SUPPLY_PLAN_CREATE",
        result_type: result.reason || "FAILED",
        event_type: "SUPPLY_PLAN_CREATE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      supplyDecisionRuns: [result.run, ...(current.supplyDecisionRuns || [])],
      supplyPlans: [result.supplyPlan, ...(current.supplyPlans || [])],
    }));
    selectForPage("supplyPlans", "supplyPlan", result.supplyPlan.supply_plan_id);
  }

  function completeSupplyManagementLoopFromForecast(row) {
    if (!businessPlanningService?.completeSupplyManagementLoopFromForecast || !row) return;
    const result = businessPlanningService.completeSupplyManagementLoopFromForecast({
      forecast: row,
      supplyProductionProfiles: data.supplyProductionProfiles || [],
      supplyDecisionStrategies: data.supplyDecisionStrategies || [],
      fleetAllocationStrategies: data.fleetAllocationStrategies || [],
      existingRobotaxis: data.robotaxis || [],
      existingSupplyPlans: data.supplyPlans || [],
      opsCenters: data.opsCenters || [],
      readinessTasks,
      context: {
        now,
        nextSupplyPlanId,
        nextRunId: nextSupplyDecisionRunId,
        nextProductionBatchId,
        nextRobotaxiId: nextProducedRobotaxiId,
        nextFleetAllocationRunId,
        nextFleetAllocationResultId,
        nextDeliveryOrderId: nextRobotaxiDeliveryOrderId,
        nextReadinessTaskId: nextTaskId,
      },
    });
    if (!result.succeeded) {
      appendRecordOperationEvent("longTermDemandForecasts", {
        business_object_type: "longTermDemandForecast",
        business_object_id: row.forecast_result_id,
        action_type: "SUPPLY_MANAGEMENT_LOOP_EXECUTE",
        result_type: result.reason || "FAILED",
        event_type: "SUPPLY_MANAGEMENT_LOOP_EXECUTE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: `供应闭环未完成：${getDisplayValue(result.reason || "操作条件不足")}`,
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      supplyPlans: [result.supplyPlan, ...(current.supplyPlans || [])],
      supplyDecisionRuns: [result.supplyDecisionRun, ...(current.supplyDecisionRuns || [])],
      productionBatches: [result.productionBatch, ...(current.productionBatches || [])],
      robotaxis: result.robotaxis,
      fleetAllocationRuns: [result.fleetAllocationRun, ...(current.fleetAllocationRuns || [])],
      fleetAllocationResults: [...(result.fleetAllocationResults || []), ...(current.fleetAllocationResults || [])],
      robotaxiDeliveryOrders: [result.deliveryOrder, ...(current.robotaxiDeliveryOrders || [])],
    }));
    setReadinessTasks(result.readinessTasks || readinessTasks);
    selectForPage("readinessTasks", "readinessTask", result.readinessTaskIds?.[0] || null);
  }

  function confirmSupplyPlan(row) {
    if (!businessPlanningService?.confirmSupplyPlan || !row) return;
    const result = businessPlanningService.confirmSupplyPlan({ supplyPlan: row, context: { now } });
    if (!result.succeeded) {
      appendRecordOperationEvent("supplyPlans", {
        business_object_type: "supplyPlan",
        business_object_id: row.supply_plan_id,
        action_type: "SUPPLY_PLAN_CONFIRM",
        result_type: result.reason || "FAILED",
        event_type: "SUPPLY_PLAN_CONFIRM",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      supplyPlans: replaceCollectionItem(current.supplyPlans || [], "supply_plan_id", result.supplyPlan),
    }));
  }

  function createProductionBatchFromSupplyPlan(row) {
    if (!businessPlanningService?.createProductionBatchFromSupplyPlan || !row) return;
    const result = businessPlanningService.createProductionBatchFromSupplyPlan({
      supplyPlan: row,
      context: { now, nextProductionBatchId },
    });
    if (!result.succeeded) {
      appendRecordOperationEvent("supplyPlans", {
        business_object_type: "supplyPlan",
        business_object_id: row.supply_plan_id,
        action_type: "PRODUCTION_BATCH_CREATE",
        result_type: result.reason || "FAILED",
        event_type: "PRODUCTION_BATCH_CREATE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      productionBatches: [result.productionBatch, ...(current.productionBatches || [])],
    }));
    selectForPage("productionBatches", "productionBatch", result.productionBatch.production_batch_id);
  }

  function startProductionBatch(row) {
    if (!businessPlanningService?.startProductionBatch || !row) return;
    const result = businessPlanningService.startProductionBatch({ productionBatch: row, context: { now } });
    if (!result.succeeded) {
      appendRecordOperationEvent("productionBatches", {
        business_object_type: "productionBatch",
        business_object_id: row.production_batch_id,
        action_type: "PRODUCTION_BATCH_START",
        result_type: result.reason || "FAILED",
        event_type: "PRODUCTION_BATCH_START",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      productionBatches: replaceCollectionItem(current.productionBatches || [], "production_batch_id", result.productionBatch),
    }));
  }

  function completeProductionBatch(row) {
    if (!businessPlanningService?.completeProductionBatch || !row) return;
    const result = businessPlanningService.completeProductionBatch({
      productionBatch: row,
      existingRobotaxis: data.robotaxis || [],
      opsCenters: data.opsCenters || [],
      context: { now, nextRobotaxiId: nextProducedRobotaxiId },
    });
    if (!result.succeeded) {
      appendRecordOperationEvent("productionBatches", {
        business_object_type: "productionBatch",
        business_object_id: row.production_batch_id,
        action_type: "PRODUCTION_BATCH_COMPLETE",
        result_type: result.reason || "FAILED",
        event_type: "PRODUCTION_BATCH_COMPLETE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      productionBatches: replaceCollectionItem(current.productionBatches || [], "production_batch_id", result.productionBatch),
      robotaxis: [...(result.robotaxis || []), ...(current.robotaxis || [])],
    }));
  }

  function runFleetAllocationStrategy(row) {
    if (!businessPlanningService?.executeFleetAllocationStrategy || !row) return;
    const result = businessPlanningService.executeFleetAllocationStrategy({
      strategy: row,
      robotaxis: data.robotaxis || [],
      supplyPlans: data.supplyPlans || [],
      productionBatches: data.productionBatches || [],
      opsCenters: data.opsCenters || [],
      context: {
        now,
        nextFleetAllocationRunId,
        nextFleetAllocationResultId,
      },
    });
    setOperationalData((current) => ({
      ...current,
      fleetAllocationRuns: [result.run, ...(current.fleetAllocationRuns || [])],
      fleetAllocationResults: [...(result.results || []), ...(current.fleetAllocationResults || [])],
    }));
    if (result.results?.length) {
      selectForPage("fleetAllocationResults", "fleetAllocationResult", result.results[0].fleet_allocation_result_id);
    } else {
      appendRecordOperationEvent("fleetAllocationStrategies", {
        business_object_type: "fleetAllocationStrategy",
        business_object_id: row.fleet_allocation_strategy_id,
        action_type: "FLEET_ALLOCATION_EXECUTE",
        result_type: result.run.failure_reason || "NO_ELIGIBLE_ROBOTAXI",
        event_type: "FLEET_ALLOCATION_EXECUTE",
        event_result: taskTypes.TaskEventResult.SKIPPED,
        message: getDisplayValue(result.run.failure_reason || "NO_ELIGIBLE_ROBOTAXI"),
      });
    }
  }

  function createDeliveryOrderFromAllocationResult(row) {
    if (!businessPlanningService?.createDeliveryOrderFromAllocationResult || !row) return;
    const result = businessPlanningService.createDeliveryOrderFromAllocationResult({
      allocationResult: row,
      context: { now, nextDeliveryOrderId: nextRobotaxiDeliveryOrderId },
    });
    if (!result.succeeded) {
      appendRecordOperationEvent("fleetAllocationResults", {
        business_object_type: "fleetAllocationResult",
        business_object_id: row.fleet_allocation_result_id,
        action_type: "DELIVERY_ORDER_CREATE",
        result_type: result.reason || "FAILED",
        event_type: "DELIVERY_ORDER_CREATE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      robotaxiDeliveryOrders: [result.deliveryOrder, ...(current.robotaxiDeliveryOrders || [])],
      fleetAllocationResults: replaceCollectionItem(current.fleetAllocationResults || [], "fleet_allocation_result_id", {
        ...row,
        result_status: "USED_FOR_DELIVERY",
      }),
    }));
    selectForPage("robotaxiDeliveryOrders", "robotaxiDeliveryOrder", result.deliveryOrder.delivery_order_id);
  }

  function createRegionDeliveryOrder() {
    if (!businessPlanningService?.executeFleetAllocationStrategy || !businessPlanningService?.createDeliveryOrderFromAllocationResult) return;
    const strategy = (data.fleetAllocationStrategies || []).find((item) => item.strategy_status === "ACTIVE")
      || (data.fleetAllocationStrategies || [])[0];
    if (!strategy) {
      appendRecordOperationEvent("robotaxiDeliveryOrders", {
        business_object_type: "robotaxiDeliveryOrder",
        business_object_id: null,
        action_type: "DELIVERY_ORDER_CREATE",
        result_type: "NO_ACTIVE_FLEET_ALLOCATION_STRATEGY",
        event_type: "DELIVERY_ORDER_CREATE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: "没有可用的交付编排策略",
      });
      return;
    }
    const allocation = businessPlanningService.executeFleetAllocationStrategy({
      strategy,
      robotaxis: data.robotaxis || [],
      supplyPlans: data.supplyPlans || [],
      productionBatches: data.productionBatches || [],
      opsCenters: data.opsCenters || [],
      context: {
        now,
        nextFleetAllocationRunId,
        nextFleetAllocationResultId,
      },
    });
    if (!allocation.results?.length) {
      setOperationalData((current) => ({
        ...current,
        fleetAllocationRuns: [allocation.run, ...(current.fleetAllocationRuns || [])],
      }));
      appendRecordOperationEvent("robotaxiDeliveryOrders", {
        business_object_type: "robotaxiDeliveryOrder",
        business_object_id: null,
        action_type: "DELIVERY_ORDER_CREATE",
        result_type: allocation.run.failure_reason || "NO_ELIGIBLE_ROBOTAXI",
        event_type: "DELIVERY_ORDER_CREATE",
        event_result: taskTypes.TaskEventResult.SKIPPED,
        message: getDisplayValue(allocation.run.failure_reason || "NO_ELIGIBLE_ROBOTAXI"),
      });
      return;
    }
    const delivery = businessPlanningService.createDeliveryOrderFromAllocationResult({
      allocationResult: allocation.results[0],
      context: { now, nextDeliveryOrderId: nextRobotaxiDeliveryOrderId },
    });
    if (!delivery.succeeded) {
      appendRecordOperationEvent("robotaxiDeliveryOrders", {
        business_object_type: "robotaxiDeliveryOrder",
        business_object_id: null,
        action_type: "DELIVERY_ORDER_CREATE",
        result_type: delivery.reason || "FAILED",
        event_type: "DELIVERY_ORDER_CREATE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(delivery.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      fleetAllocationRuns: [allocation.run, ...(current.fleetAllocationRuns || [])],
      fleetAllocationResults: [
        { ...allocation.results[0], result_status: "USED_FOR_DELIVERY" },
        ...(allocation.results || []).slice(1),
        ...(current.fleetAllocationResults || []),
      ],
      robotaxiDeliveryOrders: [delivery.deliveryOrder, ...(current.robotaxiDeliveryOrders || [])],
    }));
    selectForPage("robotaxiDeliveryOrders", "robotaxiDeliveryOrder", delivery.deliveryOrder.delivery_order_id);
  }

  function startDeliveryOrder(row) {
    if (!businessPlanningService?.startDeliveryOrder || !row) return;
    const result = businessPlanningService.startDeliveryOrder({
      deliveryOrder: row,
      robotaxis: data.robotaxis || [],
      context: { now },
    });
    if (!result.succeeded) {
      appendRecordOperationEvent("robotaxiDeliveryOrders", {
        business_object_type: "robotaxiDeliveryOrder",
        business_object_id: row.delivery_order_id,
        action_type: "DELIVERY_ORDER_START",
        result_type: result.reason || "FAILED",
        event_type: "DELIVERY_ORDER_START",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      robotaxiDeliveryOrders: replaceCollectionItem(current.robotaxiDeliveryOrders || [], "delivery_order_id", result.deliveryOrder),
      robotaxis: result.robotaxis,
    }));
  }

  function completeDeliveryOrder(row) {
    if (!businessPlanningService?.completeDeliveryOrder || !row) return;
    const result = businessPlanningService.completeDeliveryOrder({
      deliveryOrder: row,
      robotaxis: data.robotaxis || [],
      readinessTasks,
      opsCenters: data.opsCenters || [],
      context: { now, nextReadinessTaskId: nextTaskId },
    });
    if (!result.succeeded) {
      appendRecordOperationEvent("robotaxiDeliveryOrders", {
        business_object_type: "robotaxiDeliveryOrder",
        business_object_id: row.delivery_order_id,
        action_type: "DELIVERY_ORDER_COMPLETE",
        result_type: result.reason || "FAILED",
        event_type: "DELIVERY_ORDER_COMPLETE",
        event_result: taskTypes.TaskEventResult.FAILED,
        message: getDisplayValue(result.reason),
      });
      return;
    }
    setOperationalData((current) => ({
      ...current,
      robotaxiDeliveryOrders: replaceCollectionItem(current.robotaxiDeliveryOrders || [], "delivery_order_id", result.deliveryOrder),
      robotaxis: result.robotaxis,
    }));
    setReadinessTasks(result.readinessTasks);
    selectForPage("readinessTasks", "readinessTask", result.deliveryOrder.readiness_task_ids?.[0] || null);
  }
  return (
    <Layout className="ops-shell">
      <header className="global-system-bar">
        <div className={collapsed ? "system-brand collapsed" : "system-brand"}>
          <Button
            aria-label="Robotaxi 经营模拟，返回运营中控台"
            className="brand-title-button"
            type="text"
            onClick={goToConsole}
          >
            {collapsed ? "R" : "Robotaxi 经营模拟"}
          </Button>
          <Button type="text" size="small" aria-label={collapsed ? "展开菜单" : "收起菜单"} onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? "≡" : "‹"}
          </Button>
        </div>
        <div className="top-strip">
          <div className="top-strip-title">
            <Text strong>{topTitle}</Text>
            {topDescription && <Text type="secondary">{topDescription}</Text>}
          </div>
          <div className="top-strip-tools">
            <div className="top-strip-metrics">
              {showConsoleSummary ? (
                null
              ) : (
                <Tag bordered={false}>记录 {activeRows.length}</Tag>
              )}
              <Button size="small" onClick={resetRuntime}>重置模拟数据</Button>
            </div>
            <div className="platform-utilities" aria-label="平台工具">
              <Button
                className="release-history-trigger"
                type="text"
                size="small"
                aria-expanded={releaseHistoryOpen}
                aria-label={`打开更新记录，当前版本 ${releaseHistory[0]?.version || "未知"}`}
                onClick={() => setReleaseHistoryOpen((current) => !current)}
              >
                {releaseHistory[0]?.version || "版本"}
              </Button>
              <Popover
                placement="bottomRight"
                trigger="click"
                overlayClassName="platform-user-popover"
                open={accountMenuOpen}
                onOpenChange={setAccountMenuOpen}
                content={<div className="platform-account-menu"><Button className="platform-account-action" type="text" size="small" onClick={() => { setProjectReadmeOpen(true); setAccountMenuOpen(false); }}>项目 README</Button><Button className="platform-account-action" type="text" size="small" onClick={onLogout}>退出</Button></div>}
              >
                <Button
                  className="platform-user-trigger"
                  type="text"
                  size="small"
                  aria-haspopup="menu"
                  aria-label={`当前登录用户：${currentUser}，打开账户菜单`}
                >
                  <span>{currentUser}</span>
                  <span className="platform-user-indicator" aria-hidden="true">⌄</span>
                </Button>
              </Popover>
            </div>
          </div>
          <ReleaseHistoryPanel open={releaseHistoryOpen} onClose={() => setReleaseHistoryOpen(false)} />
          <ProjectReadmePanel open={projectReadmeOpen} onClose={() => setProjectReadmeOpen(false)} />
        </div>
      </header>

      <Layout className="ops-workspace-shell">
        <Sider className="ops-sider" width={200} collapsedWidth={mobileLayout ? 52 : 60} collapsed={collapsed} trigger={null}>
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            className="ops-menu"
            selectedKeys={[activePage]}
            openKeys={openMenuKeys}
            items={menuItems}
            onOpenChange={handleMenuOpenChange}
            onClick={({ key }) => handleMenuClick(key)}
          />
        </Sider>

        <Layout className="ops-main-layout">

          <WorkspaceBar
            pages={workspacePages}
            activePage={activePage}
            onActivate={activateWorkspacePage}
            onClose={closeWorkspacePage}
          />

          <Layout className={detailHidden ? "workbench detail-hidden" : detailCollapsed ? "workbench detail-collapsed" : "workbench"}>
            <Content className="work-content">
              {activePage === "console" ? (
                <MapCanvas
                  data={data}
                  selected={selected}
                  mobileLayout={mobileLayout}
                  onSelect={(type, id) => {
                    selectForPage("console", type, id);
                    setDetailCollapsedForPage("console", false);
                  }}
                  onClear={() => {
                    selectForPage("console", "map", data.maps[0].map_id);
                    setDetailCollapsedForPage("console", true);
                  }}
                  onBlankCell={(cellId) => {
                    selectForPage("console", "cell", cellId);
                    setDetailCollapsedForPage("console", true);
                  }}
                />
              ) : (
                <RecordTable
                key={activePage}
                page={activePage}
                rows={rowsByPage[activePage] || []}
                selected={selected}
                uiState={pageUiState[activePage] || createDefaultPageUiState()}
                onUiStateChange={(nextState) => updatePageUiState(activePage, nextState)}
                onSelect={(type, id) => viewRecordDetail(activePage, type, id)}
                actions={{
                  createManualTask,
                  runAutoReadinessCheck,
                  runFleetOperationPolicyForPage,
                  runFleetOperationPolicy,
                  getRobotaxiFleetOperationActions,
                  createDirectFleetOperationTaskFromRobotaxi,
                  confirmRetirement,
                  dispatchFleetOperationTaskDestination,
                  planFleetOperationRoute,
                  advanceFleetOperationRouteExecution,
                  confirmFleetOperationArrival,
                  approveRetirementTask,
                  rejectRetirementTask,
                  assignFleetOperationWorker,
                  startFleetOperationWork,
                  completeFleetOperationWork,
                  editFleetOperationPolicy,
                  runLongTermDemandForecastStrategy,
                  editLongTermDemandForecastStrategy,
                  runSupplyDecisionStrategy,
                  runShortTermDemandForecastStrategy,
                  runDeploymentDecisionStrategy,
                  runSupplyDemandBalanceStrategy,
                  createSupplyPlanFromForecast,
                  completeSupplyManagementLoopFromForecast,
                  confirmSupplyPlan,
                  createProductionBatchFromSupplyPlan,
                  startProductionBatch,
                  completeProductionBatch,
                  runFleetAllocationStrategy,
                  createDeliveryOrderFromAllocationResult,
                  createRegionDeliveryOrder,
                  startDeliveryOrder,
                  completeDeliveryOrder,
                  assignWorker,
                  startCheck,
                  submitCheckResult,
                  createDeploymentTasks,
                  confirmDeploymentPlan,
                  cancelDeploymentPlan,
                  dispatchDeploymentPlan,
                  createServiceOrderFromDemand,
                  estimateServiceOrderPrice,
                  callRobotaxiForServiceOrder,
                  matchServiceOrder,
                  settleServiceOrder,
                  payServiceOrder,
                  createTripForOrder,
                  viewTripForServiceOrder,
                  advanceTrip,
                  completeTripTravelNow,
                  replanTripDestination,
                  replanTripRouteException,
                  planRouteExecutionRoute,
                  viewRecordDetail,
                  viewGeneratedRoute,
                  viewRouteExecutionForDeployment,
                  startRouteExecution,
                  advanceRouteExecution,
                  completeRouteExecutionTravelNow,
                  submitNormalArrival,
                  submitAbnormalArrival,
                  data,
                  taskEventLogs,
                  taskDispatchRuns,
                  taskDispatchResults,
                  fleetOperationPolicyRuns,
                  fleetOperationPolicyResults,
                  fleetOperationDispatchRuns,
                  fleetOperationDispatchDecisions,
                  robotaxiTaskPlanningRuns,
                  robotaxiTaskPlanningResults,
                  routePlanningRuns: rowsByPage.routePlanningRuns,
                  demandSimulationRuns: rowsByPage.demandSimulationRuns,
                  longTermDemandForecastRuns: rowsByPage.longTermDemandForecastRuns,
                  supplyDecisionRuns: rowsByPage.supplyDecisionRuns,
                  shortTermDemandForecastRuns: rowsByPage.shortTermDemandForecastRuns,
                  deploymentDecisionRuns: rowsByPage.deploymentDecisionRuns,
                  fleetAllocationRuns: rowsByPage.fleetAllocationRuns,
                  supplyDemandBalanceRuns: rowsByPage.supplyDemandBalanceRuns,
                  pricingStrategyRuns: rowsByPage.pricingStrategyRuns,
                  orderMatchingRuns: rowsByPage.orderMatchingRuns,
                  simActions,
                  clearSimulationEvents,
                  simulationPolicies,
                  workflowTimingProfiles,
                  editWorkflowTimingRule,
                  requestCostCalculation,
                  requestRevenueCalculation,
                  refreshOperatingMetrics,
                  metricPeriodType,
                  setMetricPeriodType,
                  metricCalculationInProgress,
                  editCostParameterRule,
                  editDemandProfile,
                  editBusinessTarget,
                  editSupplyProductionProfile,
                  clearEndedTimedOperations,
                  requestClearAllTimedOperations,
                  businessTimingCalculationRuns,
                  costCalculationRuns,
                  costRecords,
                  revenueCalculationRuns,
                  revenueRecords,
                  metricDefinitions,
                  metricDisplayRows,
                  metricCalculationRuns,
                  metricObservations,
                  operatingDataPool,
                  decisionControlView,
                  navigateToPage: activateWorkspacePage,
                  simulationRuns,
                  simulationEvents,
                  timedOperations,
                }}
                />
              )}
            </Content>
            {!detailHidden && <aside className="detail-rail">
              {detailCollapsed ? (
                <Button className="detail-toggle-button" size="small" type="text" aria-label="展开详情" onClick={() => setDetailCollapsedForPage(activePage, false)}>‹</Button>
              ) : (
                <DetailPanel
                  selectedObject={detailSelectedObject}
                  selectedType={detailSelectedType}
                  onCollapse={() => setDetailCollapsedForPage(activePage, true)}
                />
              )}
            </aside>}
          </Layout>
        </Layout>
      </Layout>
      <Modal
        title="调整工作流时效"
        open={timingRuleModalOpen}
        okText="保存配置"
        cancelText="取消"
        width={520}
        onCancel={() => setTimingRuleModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setTimingRuleModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveWorkflowTimingRule}>保存配置</Button>,
        ]}
      >
        <div className="timing-rule-editor">
          <Descriptions size="small" column={1} colon={false}>
            <Descriptions.Item label="业务对象">{getDisplayValue(pendingTimingRule?.business_object_type)}</Descriptions.Item>
            <Descriptions.Item label="状态变化">{getDisplayValue(pendingTimingRule?.from_status)} → {getDisplayValue(pendingTimingRule?.to_status)}</Descriptions.Item>
            <Descriptions.Item label="功能操作">{getDisplayValue(pendingTimingRule?.action_type)}</Descriptions.Item>
          </Descriptions>
          <label>
            <span>{pendingTimingRule?.duration_mode === "PER_CELL_DURATION" ? "单 Cell 行驶时长（秒）" : "操作时长（秒）"}</span>
            <Input type="number" min={0} value={timingRuleValue} onChange={(event) => setTimingRuleValue(event.target.value)} />
          </label>
        </div>
      </Modal>
      <Modal
        title="配置运维策略"
        open={fleetOperationPolicyModalOpen}
        okText="保存配置"
        cancelText="取消"
        width={560}
        onCancel={() => setFleetOperationPolicyModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setFleetOperationPolicyModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveFleetOperationPolicy}>保存配置</Button>,
        ]}
      >
        <div className="timing-rule-editor">
          <Descriptions size="small" column={1} colon={false}>
            <Descriptions.Item label="策略编号">{pendingFleetOperationPolicy?.fleet_operation_policy_id || "无"}</Descriptions.Item>
            <Descriptions.Item label="策略类型">{getDisplayValue(pendingFleetOperationPolicy?.policy_type, "policy_type")}</Descriptions.Item>
            <Descriptions.Item label="目标任务">{getDisplayValue(pendingFleetOperationPolicy?.target_task_type, "task_type")}</Descriptions.Item>
          </Descriptions>
          {Object.entries(fleetOperationPolicyDraft).map(([key, value]) => (
            <label key={key}>
              <span>{getFieldLabel(key)}</span>
              <Input
                size="small"
                type={typeof value === "number" ? "number" : "text"}
                value={value}
                onChange={(event) => setFleetOperationPolicyDraft((draft) => ({ ...draft, [key]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      </Modal>
      <Modal
        title={simulationRuns.find((item) => item.simulation_run_id === pendingCostCalculationRunId)?.cost_calculation_status ? "重新计算运营成本" : "计算运营成本"}
        open={Boolean(pendingCostCalculationRunId)}
        okText="开始计算"
        cancelText="取消"
        width={560}
        onCancel={() => setPendingCostCalculationRunId(null)}
        footer={[
          <Button key="cancel" onClick={() => setPendingCostCalculationRunId(null)}>取消</Button>,
          <Button key="calculate" type="primary" onClick={confirmCostCalculation}>开始计算</Button>,
        ]}
      >
        <Text>将使用当前生效的成本模型配置生成成本记录，并更新相关业务单据的成本汇总。原始模拟事件、业务状态和真实审计时间不会被修改。</Text>
      </Modal>
      <Modal
        title={simulationRuns.find((item) => item.simulation_run_id === pendingRevenueCalculationRunId)?.revenue_calculation_status ? "重新生成收入记录" : "生成收入记录"}
        open={Boolean(pendingRevenueCalculationRunId)}
        okText="开始生成"
        cancelText="取消"
        width={560}
        onCancel={() => setPendingRevenueCalculationRunId(null)}
        footer={[
          <Button key="cancel" onClick={() => setPendingRevenueCalculationRunId(null)}>取消</Button>,
          <Button key="calculate" type="primary" onClick={confirmRevenueCalculation}>开始生成</Button>,
        ]}
      >
        <Text>将从当前模拟运行的服务订单生成应收、实收和未收收入记录。重新生成会替换当前有效收入记录，不会重复累加。</Text>
      </Modal>
      <Modal
        title="调整成本配置"
        open={costParameterModalOpen}
        okText="保存配置"
        cancelText="取消"
        width={520}
        onCancel={() => setCostParameterModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCostParameterModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveCostParameterRule}>保存配置</Button>,
        ]}
      >
        <div className="timing-rule-editor">
          <Descriptions size="small" column={1} colon={false}>
            <Descriptions.Item label="配置项">{pendingCostParameterRule?.cost_parameter_name || "无"}</Descriptions.Item>
            <Descriptions.Item label="成本分组">{getDisplayValue(pendingCostParameterRule?.cost_parameter_group)}</Descriptions.Item>
            <Descriptions.Item label="单位">{getDisplayValue(pendingCostParameterRule?.parameter_unit, "parameter_unit")}</Descriptions.Item>
          </Descriptions>
          <label>
            <span>配置值</span>
            {pendingCostParameterRule?.cost_parameter_key === "depreciation_method" ? (
              <Select
                size="small"
                value={costParameterValue}
                onChange={setCostParameterValue}
                options={["PER_KM", "PER_HOUR", "PER_DAY"].map((value) => ({ value, label: getDisplayValue(value, "depreciation_method") }))}
              />
            ) : (
              <Input type="number" min={0} value={costParameterValue} onChange={(event) => setCostParameterValue(event.target.value)} />
            )}
          </label>
        </div>
      </Modal>
      <Modal
        title="配置需求画像"
        open={demandProfileModalOpen}
        okText="保存配置"
        cancelText="取消"
        width={640}
        onCancel={() => setDemandProfileModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDemandProfileModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveDemandProfileConfig}>保存配置</Button>,
        ]}
      >
        <div className="timing-rule-editor demand-profile-editor">
          <Descriptions size="small" column={1} colon={false}>
            <Descriptions.Item label="画像编号">{pendingDemandProfile?.profile_id || "无"}</Descriptions.Item>
            <Descriptions.Item label="目标对象">{getDisplayValue(pendingDemandProfile?.target_object_type, "target_object_type")} · {pendingDemandProfile?.target_object_name || pendingDemandProfile?.target_object_id || "无"}</Descriptions.Item>
          </Descriptions>
          {getDemandProfileConfigFields(pendingDemandProfile).map((field) => (
            <label key={field.key}>
              <span>{getFieldLabel(field.key)}</span>
              {field.type === "select" ? (
                <Select
                  size="small"
                  value={demandProfileDraft[field.key]}
                  onChange={(value) => setDemandProfileDraft((draft) => ({ ...draft, [field.key]: value }))}
                  options={field.options.map((value) => ({ value, label: getDisplayValue(value, field.key) }))}
                  getPopupContainer={() => document.body}
                />
              ) : (
                <Input
                  size="small"
                  type={field.type === "number" ? "number" : "text"}
                  min={field.min ?? undefined}
                  max={field.max ?? undefined}
                  step={field.step ?? undefined}
                  value={demandProfileDraft[field.key] ?? ""}
                  onChange={(event) => setDemandProfileDraft((draft) => ({ ...draft, [field.key]: event.target.value }))}
                />
              )}
              <small className="planning-config-help">{getDemandProfileConfigHelp(pendingDemandProfile, field.key)}</small>
            </label>
          ))}
          {pendingDemandProfile?.target_object_type === "ZONE" && (
            <Text type="secondary">区域画像的需求、容量和增长率由所属地点与服务区域自动汇总，仅画像名称可编辑。</Text>
          )}
        </div>
      </Modal>
      <Modal
        title="配置经营目标"
        open={businessTargetModalOpen}
        okText="保存配置"
        cancelText="取消"
        width={560}
        onCancel={() => setBusinessTargetModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setBusinessTargetModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveBusinessTargetConfig}>保存配置</Button>,
        ]}
      >
        <div className="timing-rule-editor">
          <Descriptions size="small" column={1} colon={false}>
            <Descriptions.Item label="目标编号">{pendingBusinessTarget?.business_target_id || "无"}</Descriptions.Item>
            <Descriptions.Item label="目标状态">{getDisplayValue(pendingBusinessTarget?.target_status)}</Descriptions.Item>
          </Descriptions>
          {businessTargetConfigFields.map((field) => (
            <label key={field.key}>
              <span>{getFieldLabel(field.key)}</span>
              {field.type === "select" ? (
                <Select size="small" value={businessTargetDraft[field.key]} onChange={(value) => setBusinessTargetDraft((draft) => ({ ...draft, [field.key]: value }))} options={field.options.map((value) => ({ value, label: getDisplayValue(value, field.key) }))} />
              ) : (
                <Input size="small" type={field.type === "number" ? "number" : "text"} min={field.min ?? undefined} max={field.max ?? undefined} step={field.step ?? undefined} value={businessTargetDraft[field.key] ?? ""} onChange={(event) => setBusinessTargetDraft((draft) => ({ ...draft, [field.key]: event.target.value }))} />
              )}
              <small className="planning-config-help">{getPlanningFieldExplanation("businessTarget", field.key)}</small>
            </label>
          ))}
        </div>
      </Modal>
      <Modal
        title="配置生产画像"
        open={supplyProductionProfileModalOpen}
        okText="保存配置"
        cancelText="取消"
        width={560}
        onCancel={() => setSupplyProductionProfileModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setSupplyProductionProfileModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveSupplyProductionProfileConfig}>保存配置</Button>,
        ]}
      >
        <div className="timing-rule-editor">
          <Descriptions size="small" column={1} colon={false}>
            <Descriptions.Item label="画像编号">{pendingSupplyProductionProfile?.profile_id || "无"}</Descriptions.Item>
            <Descriptions.Item label="画像状态">{getDisplayValue(pendingSupplyProductionProfile?.profile_status)}</Descriptions.Item>
          </Descriptions>
          {supplyProductionProfileConfigFields.map((field) => (
            <label key={field.key}>
              <span>{getFieldLabel(field.key)}</span>
              {field.type === "select" ? (
                <Select size="small" value={supplyProductionProfileDraft[field.key]} onChange={(value) => setSupplyProductionProfileDraft((draft) => ({ ...draft, [field.key]: value }))} options={field.options.map((value) => ({ value, label: getDisplayValue(value, field.key) }))} />
              ) : (
                <Input size="small" type={field.type === "number" ? "number" : "text"} min={field.min ?? undefined} step={field.step ?? undefined} value={Array.isArray(supplyProductionProfileDraft[field.key]) ? supplyProductionProfileDraft[field.key].join(", ") : (supplyProductionProfileDraft[field.key] ?? "")} onChange={(event) => setSupplyProductionProfileDraft((draft) => ({ ...draft, [field.key]: event.target.value }))} />
              )}
              <small className="planning-config-help">{getPlanningFieldExplanation("supplyProductionProfile", field.key)}</small>
            </label>
          ))}
        </div>
      </Modal>
      <Modal
        title="配置需求预测策略"
        open={longTermDemandForecastStrategyModalOpen}
        width={560}
        onCancel={() => setLongTermDemandForecastStrategyModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setLongTermDemandForecastStrategyModalOpen(false)}>取消</Button>,
          <Button key="save" type="primary" onClick={saveLongTermDemandForecastStrategyConfig}>保存配置</Button>,
        ]}
      >
        <div className="timing-rule-editor">
          {longTermDemandForecastStrategyConfigFields.map((field) => (
            <label key={field.key}>
              <span>{getFieldLabel(field.key)}</span>
              {field.type === "select" ? (
                <Select size="small" value={longTermDemandForecastStrategyDraft[field.key]} onChange={(value) => setLongTermDemandForecastStrategyDraft((draft) => ({ ...draft, [field.key]: value }))} options={field.options.map((value) => ({ value, label: getDisplayValue(value, field.key) }))} />
              ) : (
                <Input size="small" type={field.type === "number" ? "number" : "text"} min={field.min ?? undefined} max={field.max ?? undefined} step={field.step ?? undefined} value={longTermDemandForecastStrategyDraft[field.key] ?? ""} onChange={(event) => setLongTermDemandForecastStrategyDraft((draft) => ({ ...draft, [field.key]: event.target.value }))} />
              )}
              <small className="planning-config-help">{getPlanningFieldExplanation("longTermDemandForecastStrategy", field.key)}</small>
            </label>
          ))}
        </div>
      </Modal>
    </Layout>
  );

  function handleMenuClick(key) {
    if (!isRenderablePage(key)) return;
    activateWorkspacePage(key);
    if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 767px)").matches) {
      setCollapsed(true);
    }
  }

  function handleMenuOpenChange(keys) {
    const latestKey = keys.find((key) => !openMenuKeys.includes(key));
    if (!latestKey) {
      setOpenMenuKeys(keys);
      return;
    }
    const rootKey = getRootMenuKey(latestKey);
    setOpenMenuKeys(keys.filter((key) => getRootMenuKey(key) === rootKey));
  }

  function goToConsole() {
    setActivePageAndMenu("console");
    setWorkspacePages((current) => addWorkspacePage(current, "console"));
    const consoleSelection = pageSelections.console || { type: "map", id: data.maps[0].map_id };
    setSelected(consoleSelection);
    setDetailCollapsedForPage("console", true);
  }

  function resetRuntime() {
    taskSequence = 0;
    fleetOperationTaskSequence = 0;
    fleetOperationPolicyRunSequence = 0;
    fleetOperationPolicyResultSequence = 0;
    fleetOperationDispatchRunSequence = 0;
    fleetOperationDispatchDecisionSequence = 0;
    taskDispatchRunSequence = 0;
    taskDispatchResultSequence = 0;
    taskPlanningRunSequence = 0;
    taskPlanningResultSequence = 0;
    longTermDemandForecastRunSequence = 0;
    longTermDemandForecastResultSequence = 0;
    supplyDecisionRunSequence = 0;
    shortTermDemandForecastRunSequence = 0;
    shortTermDemandForecastResultSequence = 0;
    deploymentDecisionRunSequence = 0;
    deploymentPlanSequence = 0;
    supplyPlanSequence = 0;
    productionBatchSequence = 0;
    fleetAllocationRunSequence = 0;
    fleetAllocationResultSequence = 0;
    supplyDemandBalanceRunSequence = 0;
    supplyDemandBalanceResultSequence = 0;
    robotaxiDeliveryOrderSequence = 0;
    producedRobotaxiSequence = deriveSequence(initialData.robotaxis || [], "robotaxi_id", "RTX-");
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
    simActionsRef.current?.cleanup?.();
    autoFinanceCalculationRunIdsRef.current.clear();
    autoMetricCalculationRunIdsRef.current.clear();
    simulationEngine?.resetSimulationCounters?.();
    const nextSelection = { type: "map", id: initialData.maps[0].map_id };
    setOperationalData(initialData);
    setReadinessTasks([]);
    setCleaningTasks([]);
    setChargingTasks([]);
    setMaintenanceTasks([]);
    setFailureHandlingTasks([]);
    setRetirementTasks([]);
    setFleetOperationPolicies(fleetOperationPolicyService.initializeDefaultFleetOperationPolicies());
    setFleetOperationPolicyRuns([]);
    setFleetOperationPolicyResults([]);
    setFleetOperationDispatchStrategies(fleetOperationDispatchService.initializeDefaultFleetOperationDispatchStrategies());
    setFleetOperationDispatchRuns([]);
    setFleetOperationDispatchDecisions([]);
    setTaskDispatchStrategies(taskDispatchStrategyService.initializeDefaultTaskDispatchStrategies());
    setRobotaxiTaskPlanningStrategies(robotaxiTaskPlanningService.initializeDefaultRobotaxiTaskPlanningStrategies());
    setRobotaxiTaskPlanningRuns([]);
    setRobotaxiTaskPlanningResults([]);
    setTaskDispatchRuns([]);
    setTaskDispatchResults([]);
    setTaskPriorityConfigs([robotaxiTaskPriorityService.initializeDefaultPriorityConfig()]);
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
    setMetricDefinitions(metricCalculator.initializeDefaultMetricDefinitions());
    setMetricCalculationRuns([]);
    setMetricObservations([]);
    setMetricPeriodType("ALL");
    setMetricCalculationInProgress(false);
    setSimulationRuns([]);
    setSimulationEvents([]);
    setTimedOperations([]);
    setActivePage("console");
    setOpenMenuKeys([]);
    setSelected(nextSelection);
    setWorkspacePages(["console"]);
    setDetailCollapsedByPage({ console: true });
    setPageSelections({ console: nextSelection });
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

  function clearEndedTimedOperations() {
    setTimedOperations((current) => timedOperationDiagnostics.clearEndedTimedOperations(current));
  }

  function requestClearAllTimedOperations() {
    const activeRun = timedOperationDiagnostics.getActiveSimulationRunForTimedOperationClear(simulationRuns);
    if (activeRun) {
      antd.message.warning(`模拟运行 ${activeRun.simulation_run_id} 仍在${getDisplayValue(activeRun.simulation_status, "simulation_status")}，暂不能清空全部时间作业`);
      return;
    }
    Modal.confirm({
      title: "清空全部时间作业",
      content: "这会删除当前所有时间作业诊断数据。建议只在模拟运行结束并确认无需继续排查后执行。",
      okText: "清空",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => setTimedOperations([]),
    });
  }

  function selectForPage(page, type, id) {
    const nextSelection = { type, id };
    setSelected(nextSelection);
    setWorkspacePages((current) => addWorkspacePage(current, page));
    setPageSelections((current) => ({ ...current, [page]: nextSelection }));
  }

  function viewRecordDetail(page, type, id) {
    selectForPage(page, type, id);
    setDetailCollapsedForPage(page, false);
  }

  function viewRouteExecutionForDeployment(task) {
    const execution = routeExecutions.find((item) =>
      item.task_id === task.task_id &&
      item.robotaxi_id === task.robotaxi_id
    );
    if (!execution) {
      const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
      if (collectionKey) {
        viewRecordDetail(collectionKey, pageObjectType[collectionKey], task.task_id);
        return;
      }
      viewRecordDetail("deploymentTasks", "deploymentTask", task.task_id);
      return;
    }
    const nextFilters = { keyword: task.task_id, statusValue: null, triggerType: null };
    const nextSelection = { type: "routeExecution", id: execution.route_execution_id };
    setActivePageAndMenu("routeExecutions");
    setWorkspacePages((current) => addWorkspacePage(current, "routeExecutions"));
    setSelected(nextSelection);
    setDetailCollapsedForPage("routeExecutions", false);
    setPageSelections((current) => ({ ...current, routeExecutions: nextSelection }));
    setPageUiState((current) => ({
      ...current,
      routeExecutions: createNextPageUiState(current.routeExecutions, { filters: nextFilters, appliedFilters: nextFilters, pagination: { current: 1 } }),
    }));
  }

  function focusRouteExecutionStatus(statusValue) {
    setPageUiState((current) => ({
      ...current,
      routeExecutions: createNextPageUiState(current.routeExecutions, {
        filters: { statusValue },
        appliedFilters: { statusValue },
        pagination: { current: 1 },
      }),
    }));
  }

  function viewGeneratedRoute(routePlanningRun) {
    if (!routePlanningRun?.result_route_id) {
      viewRecordDetail("routePlanningRuns", "routePlanningRun", routePlanningRun?.route_planning_run_id);
      return;
    }
    const nextSelection = { type: "route", id: routePlanningRun.result_route_id };
    setActivePageAndMenu("routes");
    setWorkspacePages((current) => addWorkspacePage(current, "routes"));
    setSelected(nextSelection);
    setDetailCollapsedForPage("routes", false);
    setPageSelections((current) => ({ ...current, routes: nextSelection }));
    setPageUiState((current) => ({
      ...current,
      routes: createNextPageUiState(current.routes, {
        filters: { keyword: routePlanningRun.result_route_id, statusValue: null, triggerType: null },
        appliedFilters: { keyword: routePlanningRun.result_route_id, statusValue: null, triggerType: null },
        pagination: { current: 1 },
      }),
    }));
  }

  function updatePageUiState(page, nextState) {
    setPageUiState((current) => ({ ...current, [page]: normalizePageUiState(nextState) }));
  }

  function activateWorkspacePage(page) {
    setActivePageAndMenu(page);
    setWorkspacePages((current) => addWorkspacePage(current, page));
    const nextSelection = getDefaultSelection(page, data);
    setSelected(nextSelection);
    setPageSelections((current) => ({ ...current, [page]: nextSelection }));
    setDetailCollapsedForPage(page, true);
    if (page === "console") setDetailCollapsedForPage("console", true);
  }

  function closeWorkspacePage(page) {
    if (page === "console") return;
    setWorkspacePages((current) => {
      const currentPages = normalizeWorkspacePages(current, activePage);
      const closeIndex = currentPages.indexOf(page);
      const nextPages = currentPages.filter((item) => item !== page);
      if (page === activePage) {
        const nextPage = nextPages[Math.max(0, closeIndex - 1)] || "console";
        const nextSelection = pageSelections[nextPage] || getDefaultSelection(nextPage, data);
        setActivePageAndMenu(nextPage);
        setSelected(nextSelection);
        if (!nextSelection?.id) setDetailCollapsedForPage(nextPage, true);
      }
      return nextPages.length > 0 ? nextPages : ["console"];
    });
  }

  function setActivePageAndMenu(page) {
    setActivePage(page);
    setOpenMenuKeys(getOpenKeysForPage(page));
  }

  function setDetailCollapsedForPage(page, collapsedValue) {
    setDetailCollapsedByPage((current) => ({ ...current, [page]: collapsedValue }));
  }

  function createManualTask() {
    const result = runRepeatedManualBusinessAction(
      (params) => businessActionService.createReadinessTask({
        ...params,
        runtime: {
          ...params.runtime,
          context: { ...(params.runtime.context || {}), trigger_type: taskTypes.TriggerType.MANUAL },
        },
      }),
      { maxIterations: data.robotaxis.length, isProgressResult: (item) => item.resultType === "READINESS_CREATED" },
    );
    const created = result?.data?.results || [];
    if (!created.length) {
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.MANUAL_TRIGGER_STARTED,
          event_result: taskTypes.TaskEventResult.SUCCESS,
          trigger_type: taskTypes.TriggerType.MANUAL,
          message: "手动触发运营准入任务生成",
        }),
        createEventLog({
          event_type: taskTypes.TaskEventType.NO_CANDIDATE_ROBOTAXI,
          event_result: taskTypes.TaskEventResult.SKIPPED,
          trigger_type: taskTypes.TriggerType.MANUAL,
          message: "当前没有可生成准入任务的 Robotaxi",
        }),
        ...logs,
      ]);
      return;
    }
    setTaskEventLogs((logs) => [
      ...created.map((item) => createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: item.objectId,
        robotaxi_id: item.robotaxiId,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: `已创建 ${item.robotaxiId} 的运营准入任务`,
      })),
      createEventLog({
        event_type: taskTypes.TaskEventType.MANUAL_TRIGGER_STARTED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: `手动触发运营准入任务生成，生成 ${created.length} 条`,
      }),
      ...logs,
    ]);
    selectForPage("readinessTasks", "readinessTask", created[0]?.objectId);
  }

  function runAutoReadinessCheck() {
    const result = runRepeatedManualBusinessAction(
      (params) => businessActionService.createReadinessTask({
        ...params,
        runtime: {
          ...params.runtime,
          context: { ...(params.runtime.context || {}), trigger_type: taskTypes.TriggerType.AUTO },
        },
      }),
      { maxIterations: data.robotaxis.length, isProgressResult: (item) => item.resultType === "READINESS_CREATED" },
    );
    const created = result?.data?.results || [];
    const triggerLog = createEventLog({
      event_type: taskTypes.TaskEventType.AUTO_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.AUTO,
      message: created.length ? `启动自动准入检查，生成 ${created.length} 条` : "启动自动准入检查",
    });

    if (!created.length) {
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.NO_CANDIDATE_ROBOTAXI,
          event_result: taskTypes.TaskEventResult.SKIPPED,
          trigger_type: taskTypes.TriggerType.AUTO,
          message: "自动触发未找到候选 Robotaxi",
        }),
        triggerLog,
        ...logs,
      ]);
      return;
    }

    setTaskEventLogs((logs) => [
      ...created.map((item) => createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: item.objectId,
        robotaxi_id: item.robotaxiId,
        trigger_type: taskTypes.TriggerType.AUTO,
        message: `自动创建 ${item.robotaxiId} 的运营准入任务`,
      })),
      triggerLog,
      ...logs,
    ]);
    selectForPage("readinessTasks", "readinessTask", created[0]?.objectId);
  }

  function runFleetOperationPolicyForPage(page) {
    const taskType = getFleetOperationTaskTypeByPage(page);
    if (taskType) runFleetOperationPolicy(taskType);
  }

  function getActiveTaskDispatchStrategy() {
    return taskDispatchStrategies.find((item) => item.strategy_status === "ACTIVE") || taskDispatchStrategies[0] || null;
  }

  function getActiveTaskPriorityConfig() {
    return robotaxiTaskPlanningService?.resolveTaskPriorityConfig(getActiveRobotaxiTaskPlanningStrategy())
      || taskPriorityConfigs[0]
      || robotaxiTaskPriorityService.initializeDefaultPriorityConfig();
  }

  function getActiveRobotaxiTaskPlanningStrategy() {
    return robotaxiTaskPlanningService?.getActiveRobotaxiTaskPlanningStrategy(robotaxiTaskPlanningStrategies) || null;
  }

  function getAllFleetOperationTasks() {
    return allFleetOperationTasks;
  }

  function createRobotaxiPlanningData() {
    return {
      ...data,
      readinessTasks,
      deploymentTasks,
      serviceOrders,
      fleetOperationTasks: getAllFleetOperationTasks(),
      robotaxiTaskPlanningStrategies,
    };
  }

  function appendTaskPlanningAudit(runs = [], results = []) {
    const nextRuns = (runs || []).filter(Boolean);
    const nextResults = (results || []).filter(Boolean);
    if (nextRuns.length) setRobotaxiTaskPlanningRuns((current) => [...nextRuns, ...current]);
    if (nextResults.length) setRobotaxiTaskPlanningResults((current) => [...nextResults, ...current]);
  }

  function runFleetOperationPolicy(taskType) {
    const policy = fleetOperationPolicies.find((item) => item.target_task_type === taskType && item.policy_status === "ACTIVE")
      || fleetOperationPolicies.find((item) => item.target_task_type === taskType);
    if (!policy) {
      appendFleetOperationPageEvent(getFleetOperationTaskCollectionKey(taskType), {
        event_type: taskTypes.TaskEventType.TASK_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        trigger_type: taskTypes.TriggerType.MANUAL,
        task_type: taskType,
        message: "没有找到可用的运维策略配置",
      });
      return;
    }

    const collectionKey = getFleetOperationTaskCollectionKey(taskType);
    const result = fleetOperationPolicyService.executeFleetOperationPolicy({
      policy,
      robotaxis: data.robotaxis,
      existingTasks: getAllFleetOperationTasks(),
      triggerType: taskTypes.TriggerType.MANUAL,
      context: {
        now,
        nextId: nextFleetOperationTaskId,
        nextRunId: nextFleetOperationPolicyRunId,
        nextResultId: nextFleetOperationPolicyResultId,
        nextTaskPlanningRunId,
        nextTaskPlanningResultId,
        recordTaskPlanningAudit: true,
        opsCenters: data.opsCenters,
        taskPriorityConfig: getActiveTaskPriorityConfig(),
        robotaxiTaskPlanningStrategy: getActiveRobotaxiTaskPlanningStrategy(),
        readinessTasks,
        deploymentTasks,
        serviceOrders,
      },
    });

    setFleetOperationPolicyRuns((runs) => [result.run, ...runs]);
    setFleetOperationPolicyResults((results) => [...(result.policyResults || []), ...results]);
    appendTaskPlanningAudit(result.taskPlanningRuns, result.taskPlanningResults);
    setOperationalData((current) => ({
      ...current,
      robotaxis: result.robotaxis?.length ? result.robotaxis : current.robotaxis,
    }));

    if (result.tasks?.length) {
      appendFleetOperationTasks(collectionKey, result.tasks);
      setTaskEventLogs((logs) => [
        ...result.tasks.map((task) => createEventLog({
          event_type: taskTypes.TaskEventType.TASK_CREATED,
          event_result: taskTypes.TaskEventResult.SUCCESS,
          task_id: task.task_id,
          task_type: task.task_type,
          source_page: collectionKey,
          source_object_type: "fleetOperationPolicy",
          source_object_id: policy.fleet_operation_policy_id,
          fleet_operation_policy_run_id: result.run.fleet_operation_policy_run_id,
          robotaxi_id: task.robotaxi_id,
          trigger_type: task.trigger_type,
          message: `运维策略已创建 ${getDisplayValue(task.task_type)}任务`,
        })),
        ...logs,
      ]);
      const firstTask = result.tasks[0];
      selectForPage(collectionKey, pageObjectType[collectionKey], firstTask.task_id);
      return;
    }

    appendFleetOperationPageEvent(collectionKey, {
      event_type: taskTypes.TaskEventType.NO_CANDIDATE_ROBOTAXI,
      event_result: taskTypes.TaskEventResult.SKIPPED,
      trigger_type: taskTypes.TriggerType.MANUAL,
      task_type: taskType,
      source_object_type: "fleetOperationPolicy",
      source_object_id: policy.fleet_operation_policy_id,
      fleet_operation_policy_run_id: result.run.fleet_operation_policy_run_id,
      message: result.run.result_summary || "当前无符合条件的 Robotaxi",
    });
  }

  function createDirectFleetOperationTaskFromRobotaxi(robotaxi, taskType) {
    if (!robotaxi?.robotaxi_id || !taskType) return;
    const sourceRobotaxi = data.robotaxis.find((item) => item.robotaxi_id === robotaxi.robotaxi_id) || robotaxi;
    const collectionKey = getFleetOperationTaskCollectionKey(taskType);
    const result = fleetOperationPolicyService.createDirectFleetOperationTask({
      taskType,
      robotaxi: sourceRobotaxi,
      existingTasks: getAllFleetOperationTasks(),
      taskFields: {
        ...createDirectFleetOperationTaskFields(sourceRobotaxi, taskType),
        trigger_object_type: "robotaxi",
        trigger_object_id: sourceRobotaxi.robotaxi_id,
      },
      context: {
        now,
        nextId: nextFleetOperationTaskId,
        nextTaskPlanningRunId,
        nextTaskPlanningResultId,
        recordTaskPlanningAudit: true,
        opsCenters: data.opsCenters,
        taskPriorityConfig: getActiveTaskPriorityConfig(),
        robotaxiTaskPlanningStrategy: getActiveRobotaxiTaskPlanningStrategy(),
        readinessTasks,
        deploymentTasks,
        serviceOrders,
      },
    });

    appendTaskPlanningAudit(result.planningRun ? [result.planningRun] : [], result.planningResult ? [result.planningResult] : []);

    if (!result.created) {
      if (result.robotaxi) {
        setOperationalData((current) => ({
          ...current,
          robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
        }));
      }
      if (result.queued) {
        setTaskEventLogs((logs) => [
          createEventLog({
            event_type: taskTypes.TaskEventType.TASK_CREATED,
            event_result: taskTypes.TaskEventResult.SKIPPED,
            task_id: result.task?.task_id || null,
            task_type: taskType,
            source_page: collectionKey,
            robotaxi_id: sourceRobotaxi.robotaxi_id,
            trigger_type: taskTypes.TriggerType.MANUAL,
            message: `${getDisplayValue(taskType)}任务已进入待执行队列`,
          }),
          ...logs,
        ]);
        return;
      }
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.TASK_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_type: taskType,
        robotaxi_id: sourceRobotaxi.robotaxi_id,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: getDisplayValue(result.reason, "result_reason") || "当前 Robotaxi 暂不能生成运维任务",
      });
      return;
    }

    appendFleetOperationTasks(collectionKey, [result.task]);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
    }));
    setTaskEventLogs((logs) => [
      createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: result.task.task_id,
        task_type: result.task.task_type,
        source_page: collectionKey,
        source_object_type: "robotaxi",
        source_object_id: sourceRobotaxi.robotaxi_id,
        robotaxi_id: result.task.robotaxi_id,
        trigger_type: result.task.trigger_type,
        message: result.queued
          ? `${getDisplayValue(taskType)}任务已创建并等待 Robotaxi 可执行`
          : `Robotaxi 直接触发${getDisplayValue(taskType)}任务`,
      }),
      ...logs,
    ]);
    selectForPage(collectionKey, pageObjectType[collectionKey], result.task.task_id);
  }

  function getRobotaxiFleetOperationActions(robotaxi) {
    if (!robotaxiTaskPlanningService) return [];
    const sourceRobotaxi = data.robotaxis.find((item) => item.robotaxi_id === robotaxi?.robotaxi_id) || robotaxi;
    return robotaxiTaskPlanningService.getAvailableRobotaxiActions({
      robotaxi: sourceRobotaxi,
      readinessTasks,
      deploymentTasks,
      serviceOrders,
      fleetOperationTasks: getAllFleetOperationTasks(),
      strategy: getActiveRobotaxiTaskPlanningStrategy(),
    });
  }

  function confirmRetirement(robotaxi) {
    if (!robotaxi?.robotaxi_id) return;
    Modal.confirm({
      title: "确认退役 Robotaxi",
      content: `${robotaxi.robotaxi_id} 退役后将不再参与投放和服务匹配。`,
      okText: "确认退役",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => createDirectFleetOperationTaskFromRobotaxi(robotaxi, taskTypes.TaskType.RETIREMENT),
    });
  }

  function editFleetOperationPolicy(policy) {
    setPendingFleetOperationPolicy(policy);
    setFleetOperationPolicyDraft({ ...(policy.policy_parameters || {}) });
    setFleetOperationPolicyModalOpen(true);
  }

  function saveFleetOperationPolicy() {
    if (!pendingFleetOperationPolicy) return;
    const normalizedParameters = Object.entries(fleetOperationPolicyDraft).reduce((result, [key, value]) => ({
      ...result,
      [key]: normalizePolicyParameterValue(value),
    }), {});
    setFleetOperationPolicies((policies) => policies.map((policy) => {
      if (policy.fleet_operation_policy_id !== pendingFleetOperationPolicy.fleet_operation_policy_id) return policy;
      return fleetOperationPolicyService.createFleetOperationPolicy({
        ...policy,
        policy_parameters: normalizedParameters,
        updated_at: now(),
      });
    }));
    setFleetOperationPolicyModalOpen(false);
    setPendingFleetOperationPolicy(null);
    appendFleetOperationPageEvent(getFleetOperationTaskCollectionKey(pendingFleetOperationPolicy.target_task_type), {
      event_type: "FLEET_OPERATION_POLICY_UPDATED",
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_type: pendingFleetOperationPolicy.target_task_type,
      source_object_type: "fleetOperationPolicy",
      source_object_id: pendingFleetOperationPolicy.fleet_operation_policy_id,
      message: "运维策略配置已更新",
    });
  }

  function getFleetOperationTaskTypeByPage(page) {
    const map = {
      cleaningTasks: taskTypes.TaskType.CLEANING,
      chargingTasks: taskTypes.TaskType.CHARGING,
      maintenanceTasks: taskTypes.TaskType.MAINTENANCE,
      failureHandlingTasks: taskTypes.TaskType.FAILURE_HANDLING,
      retirementTasks: taskTypes.TaskType.RETIREMENT,
    };
    return map[page] || null;
  }

  function getFleetOperationTaskCollectionKey(taskType) {
    const map = {
      [taskTypes.TaskType.CLEANING]: "cleaningTasks",
      [taskTypes.TaskType.CHARGING]: "chargingTasks",
      [taskTypes.TaskType.MAINTENANCE]: "maintenanceTasks",
      [taskTypes.TaskType.FAILURE_HANDLING]: "failureHandlingTasks",
      [taskTypes.TaskType.RETIREMENT]: "retirementTasks",
    };
    return map[taskType] || null;
  }

  function getFleetOperationTasksByCollection(collectionKey) {
    const map = {
      cleaningTasks,
      chargingTasks,
      maintenanceTasks,
      failureHandlingTasks,
      retirementTasks,
    };
    return map[collectionKey] || [];
  }

  function getFleetOperationTasksByType() {
    return {
      cleaningTasks,
      chargingTasks,
      maintenanceTasks,
      failureHandlingTasks,
      retirementTasks,
    };
  }

  function findFleetOperationTaskByExecution(execution) {
    if (!execution?.task_id || execution.task_type === taskTypes.TaskType.DEPLOYMENT) return null;
    const collectionKey = getFleetOperationTaskCollectionKey(execution.task_type);
    if (!collectionKey) return null;
    return getFleetOperationTasksByCollection(collectionKey).find((item) => item.task_id === execution.task_id) || null;
  }

  function updateFleetOperationTask(nextTask) {
    if (!nextTask?.task_id) return;
    const collectionKey = getFleetOperationTaskCollectionKey(nextTask.task_type);
    const setter = (items) => items.map((item) => item.task_id === nextTask.task_id ? nextTask : item);
    if (collectionKey === "cleaningTasks") setCleaningTasks(setter);
    if (collectionKey === "chargingTasks") setChargingTasks(setter);
    if (collectionKey === "maintenanceTasks") setMaintenanceTasks(setter);
    if (collectionKey === "failureHandlingTasks") setFailureHandlingTasks(setter);
    if (collectionKey === "retirementTasks") setRetirementTasks(setter);
  }

  function appendFleetOperationTasks(collectionKey, tasks) {
    const updater = (current) => [...tasks, ...current];
    if (collectionKey === "cleaningTasks") setCleaningTasks(updater);
    if (collectionKey === "chargingTasks") setChargingTasks(updater);
    if (collectionKey === "maintenanceTasks") setMaintenanceTasks(updater);
    if (collectionKey === "failureHandlingTasks") setFailureHandlingTasks(updater);
    if (collectionKey === "retirementTasks") setRetirementTasks(updater);
  }

  function createFleetOperationRouteExecution(task, robotaxiOverride = null) {
    if (!task?.task_id || !task.robotaxi_id || !task.target_cell_id || !fleetOperationTaskService) return null;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = robotaxiOverride || operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!robotaxi || !routePlanningService) return;
    const result = fleetOperationTaskService.createFleetOperationRouteExecution({
      task,
      robotaxi,
      context: {
        now,
        workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction(),
        nextId: (prefix) => {
          if (prefix === "REX") return nextRouteExecutionId();
          if (prefix === "RPR") return nextRoutePlanningRunId();
          return nextDeploymentRouteId();
        },
      },
    });
    if (result.succeeded) {
      setOperationalData((current) => ({
        ...current,
        robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      }));
      setRouteExecutions((items) => (
        items.some((item) => item.route_execution_id === result.routeExecution.route_execution_id)
          ? items.map((item) => item.route_execution_id === result.routeExecution.route_execution_id ? result.routeExecution : item)
          : [result.routeExecution, ...items]
      ));
      updateFleetOperationTask(result.task);
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.ROUTE_EXECUTION_CREATED,
          event_result: taskTypes.TaskEventResult.SUCCESS,
          task_id: result.task.task_id,
          task_type: result.task.task_type,
          source_page: collectionKey,
          robotaxi_id: result.task.robotaxi_id,
          route_execution_id: result.routeExecution.route_execution_id,
          message: "运营行驶记录已生成，等待路径规划",
        }),
        ...logs,
      ]);
    } else {
      if (result.task) updateFleetOperationTask(result.task);
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        task_type: task.task_type,
        robotaxi_id: task.robotaxi_id,
        message: "路径规划失败",
      });
    }
    return result;
  }

  function planFleetOperationRoute(task) {
    if (!task?.route_execution_id || !fleetOperationTaskService) return null;
    const execution = routeExecutions.find((item) => item.route_execution_id === task.route_execution_id);
    const robotaxi = operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!execution || !robotaxi) return null;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const result = fleetOperationTaskService.planFleetOperationRoute({
      task,
      robotaxi,
      execution,
      data,
      context: {
        now,
        workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction(),
        nextId: (prefix) => {
          if (prefix === "RPR") return nextRoutePlanningRunId();
          return nextDeploymentRouteId();
        },
      },
    });
    if (result.routePlanningRun) setRoutePlanningRuns((items) => [result.routePlanningRun, ...items]);
    if (result?.succeeded) {
      setOperationalData((current) => ({
        ...current,
        routes: [result.route, ...current.routes],
        robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      }));
      setRouteExecutions((items) => items.map((item) => item.route_execution_id === result.routeExecution.route_execution_id ? result.routeExecution : item));
      updateFleetOperationTask(result.task);
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
          event_result: taskTypes.TaskEventResult.SUCCESS,
          task_id: result.task.task_id,
          task_type: result.task.task_type,
          source_page: collectionKey,
          robotaxi_id: result.task.robotaxi_id,
          route_execution_id: result.routeExecution.route_execution_id,
          message: "路径规划完成，Robotaxi 前往目的地",
        }),
        ...logs,
      ]);
      selectForPage("routeExecutions", "routeExecution", result.routeExecution.route_execution_id);
    } else if (result?.task) {
      updateFleetOperationTask(result.task);
      if (result.routeExecution) {
        setRouteExecutions((items) => items.map((item) => item.route_execution_id === result.routeExecution.route_execution_id ? result.routeExecution : item));
      }
    }
    return result;
  }

  function planFleetOperationRouteExecutionRecord(execution) {
    if (!execution || !fleetOperationTaskService) return;
    const task = findFleetOperationTaskByExecution(execution);
    if (!task) return;
    if (execution.execution_status === taskTypes.RouteExecutionStatus.WAITING_ROUTE) {
      planFleetOperationRoute(task);
      return;
    }
    if (execution.execution_status !== taskTypes.RouteExecutionStatus.ARRIVAL_ABNORMAL) return;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = operationalData.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
    if (!robotaxi) return;
    const result = fleetOperationTaskService.replanFleetOperationRouteAfterAbnormalArrival({
      execution,
      task,
      robotaxi,
      data,
      context: {
        now,
        nextId: (prefix) => {
          if (prefix === "RPR") return nextRoutePlanningRunId();
          return nextDeploymentRouteId();
        },
      },
    });
    if (result.routePlanningRun) setRoutePlanningRuns((items) => [result.routePlanningRun, ...items]);
    if (result.succeeded) {
      setOperationalData((current) => ({
        ...current,
        routes: [result.route, ...current.routes],
        robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      }));
      setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? result.routeExecution : item));
      updateFleetOperationTask(result.task);
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: result.task.task_id,
        task_type: result.task.task_type,
        robotaxi_id: result.task.robotaxi_id,
        route_execution_id: result.routeExecution.route_execution_id,
        message: "异常到达后已重新规划行驶路径",
      });
      focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.MOVING);
      selectForPage("routeExecutions", "routeExecution", result.routeExecution.route_execution_id);
      return;
    }
    if (result.task) updateFleetOperationTask(result.task);
    appendFleetOperationPageEvent(collectionKey, {
      event_type: taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
      event_result: taskTypes.TaskEventResult.FAILED,
      task_id: task.task_id,
      task_type: task.task_type,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: `异常到达后路径规划失败：${getDisplayValue(result.reason)}`,
    });
  }

  function startFleetOperationRouteExecutionRecord(execution) {
    if (!execution || execution.execution_status !== taskTypes.RouteExecutionStatus.WAITING_START) return;
    const task = findFleetOperationTaskByExecution(execution);
    const route = data.routes.find((item) => item.route_id === execution.route_id);
    const robotaxi = operationalData.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
    if (!task || !route || !robotaxi) return;
    const movingStatus = fleetOperationTaskService.getFleetOperationMovingStatus(task.task_type);
    setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? {
      ...item,
      execution_status: taskTypes.RouteExecutionStatus.MOVING,
      started_at: now(),
      updated_at: now(),
    } : item));
    updateFleetOperationTask({
      ...task,
      task_status: movingStatus,
      started_at: now(),
      updated_at: now(),
    });
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === robotaxi.robotaxi_id ? {
        ...item,
        motion_status: "MOVING",
        current_route_id: route.route_id,
        current_route_execution_id: execution.route_execution_id,
        current_task_id: task.task_id,
        current_task_type: task.task_type,
        current_task_status: movingStatus,
        updated_at: now(),
      } : item),
    }));
    appendFleetOperationPageEvent(getFleetOperationTaskCollectionKey(task.task_type), {
      event_type: taskTypes.TaskEventType.DEPLOYMENT_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      task_type: task.task_type,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: "Robotaxi 开始前往目的地",
    });
  }

  function advanceFleetOperationRouteExecution(execution) {
    if (!execution || !fleetOperationTaskService) return;
    const task = findFleetOperationTaskByExecution(execution);
    const route = data.routes.find((item) => item.route_id === execution.route_id);
    const robotaxi = operationalData.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
    const result = fleetOperationTaskService.advanceFleetOperationRouteExecution({
      execution,
      task,
      route,
      robotaxi,
      context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() },
    });
    if (!result.succeeded) return;
    setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? result.routeExecution : item));
    if (result.task) updateFleetOperationTask(result.task);
    if (result.robotaxi) {
      setOperationalData((current) => ({
        ...current,
        robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      }));
    }
    focusRouteExecutionStatus(result.arrived ? taskTypes.RouteExecutionStatus.ARRIVED : taskTypes.RouteExecutionStatus.MOVING);
  }

  function confirmFleetOperationArrival(task) {
    const execution = routeExecutions.find((item) => item.route_execution_id === task?.route_execution_id);
    if (!execution || !fleetOperationTaskService) return;
    submitFleetOperationNormalArrival(execution);
  }

  function submitFleetOperationNormalArrival(execution) {
    if (!execution || !fleetOperationTaskService) return;
    const task = findFleetOperationTaskByExecution(execution);
    const collectionKey = getFleetOperationTaskCollectionKey(task?.task_type);
    const robotaxi = operationalData.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
    const activeCostProfile = costModelProfiles.find((item) => item.profile_status === "ACTIVE") || costModelProfiles[0] || null;
    const result = fleetOperationTaskService.confirmFleetOperationArrival({
      execution,
      task,
      robotaxi,
      context: {
        now,
        workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction(),
        costModelProfile: activeCostProfile,
        costRecords,
        businessData: { ...data, routeExecutions, routes: data.routes },
        nextCostFactRunId: () => `CFR-${String(costRecords.length + 1).padStart(4, "0")}-${String(Date.now()).slice(-6)}`,
      },
    });
    if (!result.succeeded) return;
    setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? result.routeExecution : item));
    updateFleetOperationTask(result.task);
    if (Array.isArray(result.costRecords)) setCostRecords(result.costRecords);
    if (result.robotaxi) {
      setOperationalData((current) => ({
        ...current,
        robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      }));
    }
    appendFleetOperationPageEvent(collectionKey, {
      event_type: taskTypes.TaskEventType.ARRIVAL_NORMAL,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: result.task.task_id,
      task_type: result.task.task_type,
      robotaxi_id: result.task.robotaxi_id,
      route_execution_id: result.routeExecution.route_execution_id,
      message: "已确认到达，任务进入后续作业",
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.COMPLETED);
  }

  function submitFleetOperationAbnormalArrival(execution, arrivalResult) {
    if (!execution || !fleetOperationTaskService) return;
    const task = findFleetOperationTaskByExecution(execution);
    const collectionKey = getFleetOperationTaskCollectionKey(task?.task_type);
    const robotaxi = operationalData.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
    const result = fleetOperationTaskService.confirmFleetOperationAbnormalArrival({
      execution,
      task,
      robotaxi,
      arrivalResult,
      context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() },
    });
    if (!result.succeeded) return;
    setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? result.routeExecution : item));
    updateFleetOperationTask(result.task);
    if (result.robotaxi) {
      setOperationalData((current) => ({
        ...current,
        robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      }));
    }
    appendFleetOperationPageEvent(collectionKey, {
      event_type: taskTypes.TaskEventType.ARRIVAL_ABNORMAL,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: result.task.task_id,
      task_type: result.task.task_type,
      robotaxi_id: result.task.robotaxi_id,
      route_execution_id: result.routeExecution.route_execution_id,
      message: `运维行驶异常到达：${getDisplayValue(arrivalResult)}`,
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.ARRIVAL_ABNORMAL);
  }

  function dispatchFleetOperationTaskDestination(task) {
    if (!task?.task_id || !fleetOperationTaskService) return;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!robotaxi) return;
    const strategy = (Array.isArray(fleetOperationDispatchStrategies) ? fleetOperationDispatchStrategies : [])[0] || null;
    const result = fleetOperationTaskService.dispatchFleetOperationTaskDestination({
      task,
      robotaxi,
      opsCenters: data.opsCenters,
      cells: data.cells,
      strategy,
      context: {
        now,
        workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction(),
        nextDispatchRunId: nextFleetOperationDispatchRunId,
        nextDispatchDecisionId: nextFleetOperationDispatchDecisionId,
      },
    });
    if (result.run) setFleetOperationDispatchRuns((runs) => [result.run, ...runs]);
    if (result.decision) setFleetOperationDispatchDecisions((d) => [result.decision, ...d]);
    if (result.succeeded) {
      updateFleetOperationTask(result.task);
      if (result.robotaxi) {
        setOperationalData((current) => ({
          ...current,
          robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
        }));
      }
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.TASK_CREATED,
          event_result: taskTypes.TaskEventResult.SUCCESS,
          task_id: result.task.task_id,
          task_type: result.task.task_type,
          source_page: collectionKey,
          robotaxi_id: result.task.robotaxi_id,
          message: result.dispatchSkipped
            ? "Robotaxi 已在具备能力的运维点，已进入作业分配"
            : result.alreadyAssigned ? "任务已有目的地，等待行驶" : "已分配目的地，等待行驶",
        }),
        ...logs,
      ]);
      if (!result.dispatchSkipped) {
        const routeResult = createFleetOperationRouteExecution(result.task, result.robotaxi);
        if (routeResult?.succeeded) {
          selectForPage("routeExecutions", "routeExecution", routeResult.routeExecution.route_execution_id);
        }
      }
    } else {
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.TASK_FAILED,
          event_result: taskTypes.TaskEventResult.FAILED,
          task_id: task.task_id,
          task_type: task.task_type,
          source_page: collectionKey,
          robotaxi_id: task.robotaxi_id,
          message: result.run?.run_status === "NO_ELIGIBLE_CENTER" ? "没有符合条件的运维中心" : "目的地分配失败",
        }),
        ...logs,
      ]);
    }
  }

  function startFleetOperationWork(task) {
    if (!task?.task_id || !fleetOperationTaskService) return;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!robotaxi) return;
    const result = fleetOperationTaskService.startFleetOperationWork({ task, robotaxi, context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() } });
    if (!result.succeeded) {
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.TASK_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        task_type: task.task_type,
        robotaxi_id: task.robotaxi_id,
        message: "当前任务不能开始作业",
      });
      return;
    }
    updateFleetOperationTask(result.task);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      workers: result.worker
        ? current.workers.map((item) => item.worker_id === result.worker.worker_id ? { ...item, ...result.worker } : item)
        : current.workers,
    }));
    setTaskEventLogs((logs) => [
      createEventLog({
        event_type: taskTypes.TaskEventType.CHECK_STARTED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: result.task.task_id,
        task_type: result.task.task_type,
        source_page: collectionKey,
        robotaxi_id: result.task.robotaxi_id,
        message: `${getDisplayValue(result.task.task_status)}已开始`,
      }),
      ...logs,
    ]);
  }

  function completeFleetOperationWork(task) {
    if (!task?.task_id || !fleetOperationTaskService) return;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!robotaxi) return;
    const activeCostProfile = costModelProfiles.find((item) => item.profile_status === "ACTIVE") || costModelProfiles[0] || null;
    const result = fleetOperationTaskService.completeFleetOperationWork({
      task,
      robotaxi,
      context: {
        now,
        workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction(),
        costModelProfile: activeCostProfile,
        costRecords,
        businessData: { ...data, routeExecutions, routes: data.routes },
        nextCostFactRunId: () => `CFR-${String(costRecords.length + 1).padStart(4, "0")}-${String(Date.now()).slice(-6)}`,
      },
    });
    if (!result.succeeded) {
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.TASK_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        task_type: task.task_type,
        robotaxi_id: task.robotaxi_id,
        message: "当前任务不能完成作业",
      });
      return;
    }
    updateFleetOperationTask(result.task);
    if (Array.isArray(result.costRecords)) setCostRecords(result.costRecords);
    const activation = result.task.task_status === "COMPLETED"
      ? fleetOperationTaskService.activateNextQueuedFleetOperationTask({
        robotaxi: result.robotaxi,
        tasksByType: getFleetOperationTasksByType(),
        opsCenters: data.opsCenters,
        context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() },
      })
      : null;
    if (activation?.activated && activation.task) updateFleetOperationTask(activation.task);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? (activation?.robotaxi || result.robotaxi) : item),
      workers: result.worker
        ? current.workers.map((item) => item.worker_id === result.worker.worker_id ? { ...item, ...result.worker } : item)
        : current.workers,
    }));
    setTaskEventLogs((logs) => [
      createEventLog({
        event_type: result.task.task_status === "COMPLETED" ? taskTypes.TaskEventType.ROBOTAXI_MARKED_AVAILABLE : taskTypes.TaskEventType.CHECK_SUBMITTED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: result.task.task_id,
        task_type: result.task.task_type,
        source_page: collectionKey,
        robotaxi_id: result.task.robotaxi_id,
        message: result.task.task_status === "COMPLETED"
          ? activation?.activated ? "运维任务已完成，Robotaxi 已激活下一排队任务" : "运维任务已完成，Robotaxi 恢复可运营"
          : `${getDisplayValue(result.task.task_status)}已完成`,
      }),
      ...(activation?.activated ? [createEventLog({
        event_type: taskTypes.TaskEventType.TASK_ASSIGNED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: activation.task.task_id,
        task_type: activation.task.task_type,
        source_page: getFleetOperationTaskCollectionKey(activation.task.task_type),
        robotaxi_id: activation.task.robotaxi_id,
        message: `已按排队序号激活下一运维任务 ${activation.task.task_id}`,
      })] : []),
      ...logs,
    ]);
  }

  function assignFleetOperationWorker(task) {
    if (!task?.task_id || !fleetOperationTaskService) return;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!robotaxi) return;
    const result = fleetOperationTaskService.assignFleetOperationWorker({
      task,
      robotaxi,
      workers: data.workers,
      context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() },
    });
    if (!result.succeeded) {
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.NO_IDLE_WORKER,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        task_type: task.task_type,
        robotaxi_id: task.robotaxi_id,
        message: "没有可分配的空闲作业人员",
      });
      return;
    }
    updateFleetOperationTask(result.task);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
      workers: current.workers.map((item) => item.worker_id === result.workerRecord.worker_id ? result.workerRecord : item),
    }));
    appendFleetOperationPageEvent(collectionKey, {
      event_type: taskTypes.TaskEventType.WORKER_ASSIGNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: result.task.task_id,
      task_type: result.task.task_type,
      robotaxi_id: result.task.robotaxi_id,
      worker_id: result.worker.worker_id,
      message: `${result.worker.worker_id} 已分配到 ${result.task.task_id}`,
    });
  }

  function approveRetirementTask(task) {
    if (!task?.task_id || !fleetOperationTaskService) return;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!robotaxi) return;
    const result = fleetOperationTaskService.confirmRetirementTask({
      task,
      robotaxi,
      opsCenters: data.opsCenters,
      context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() },
    });
    if (!result.succeeded) {
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.TASK_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        task_type: task.task_type,
        robotaxi_id: task.robotaxi_id,
        message: getDisplayValue(result.reason, "result_reason") || "当前退役任务不能确认",
      });
      return;
    }
    updateFleetOperationTask(result.task);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
    }));
    appendFleetOperationPageEvent(collectionKey, {
      event_type: taskTypes.TaskEventType.TASK_ASSIGNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: result.task.task_id,
      task_type: result.task.task_type,
      robotaxi_id: result.task.robotaxi_id,
      message: result.alreadyAtCapableCenter ? "退役已确认，Robotaxi 已在退役处理位置" : "退役已确认，等待分配退役处理中心",
    });
  }

  function rejectRetirementTask(task) {
    if (!task?.task_id || !fleetOperationTaskService) return;
    const collectionKey = getFleetOperationTaskCollectionKey(task.task_type);
    const robotaxi = operationalData.robotaxis?.find((r) => r.robotaxi_id === task.robotaxi_id);
    if (!robotaxi) return;
    const result = fleetOperationTaskService.rejectRetirementTask({
      task,
      robotaxi,
      context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() },
    });
    if (!result.succeeded) {
      appendFleetOperationPageEvent(collectionKey, {
        event_type: taskTypes.TaskEventType.TASK_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        task_type: task.task_type,
        robotaxi_id: task.robotaxi_id,
        message: getDisplayValue(result.reason, "result_reason") || "当前退役任务不能驳回",
      });
      return;
    }
    updateFleetOperationTask(result.task);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === result.robotaxi.robotaxi_id ? result.robotaxi : item),
    }));
    appendFleetOperationPageEvent(collectionKey, {
      event_type: taskTypes.TaskEventType.ROBOTAXI_MARKED_AVAILABLE,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: result.task.task_id,
      task_type: result.task.task_type,
      robotaxi_id: result.task.robotaxi_id,
      message: "退役已驳回，Robotaxi 恢复可运营",
    });
  }

  function assignWorker(taskId) {
    const task = readinessTasks.find((item) => item.task_id === taskId);
    if (!task) return;
    const result = runManualBusinessAction((params) => businessActionService.assignReadinessTask({ ...params, objectId: taskId }));
    const nextTask = result?.updates?.readinessTasks?.find((item) => item.task_id === taskId);
    if (!result?.success) {
      addLog({
        event_type: taskTypes.TaskEventType.NO_IDLE_WORKER,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        message: getDisplayValue(result?.data?.failureReason, "result_reason") || "没有可分配的空闲作业人员",
      });
      return;
    }
    addLog({
      event_type: taskTypes.TaskEventType.WORKER_ASSIGNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: nextTask?.worker_id,
      message: `${nextTask?.worker_id || "Worker"} 已分配到 ${task.task_id}`,
    });
  }

  function startCheck(taskId) {
    const task = readinessTasks.find((item) => item.task_id === taskId);
    if (!task) return;
    const result = runManualBusinessAction((params) => businessActionService.startReadinessTask({ ...params, objectId: taskId }));
    if (!result?.success) return;
    addLog({
      event_type: taskTypes.TaskEventType.CHECK_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: task.worker_id,
      message: `${task.task_id} 开始检查`,
    });
  }

  function submitCheckResult(taskId, checkResult, issueType = taskTypes.IssueType.NONE) {
    const task = readinessTasks.find((item) => item.task_id === taskId);
    if (!task) return;
    const passed = checkResult === taskTypes.CheckResult.PASSED;
    const result = runManualBusinessAction((params) => passed
      ? businessActionService.passReadinessTask({ ...params, objectId: taskId })
      : businessActionService.failReadinessTask({ ...params, objectId: taskId, issueType }));
    if (!result?.success) return;
    addLog({
      event_type: taskTypes.TaskEventType.CHECK_SUBMITTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: task.worker_id,
      message: passed ? "检查通过" : `检查不通过：${getDisplayValue(issueType)}`,
    });
    addLog({
      event_type: passed ? taskTypes.TaskEventType.ROBOTAXI_MARKED_AVAILABLE : taskTypes.TaskEventType.ROBOTAXI_MARKED_UNAVAILABLE,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: task.worker_id,
      message: passed ? `${task.robotaxi_id} 已标记为可运营` : `${task.robotaxi_id} 已标记为不可运营`,
    });
  }

  function createDeploymentTasks() {
    const result = runRepeatedManualBusinessAction(
      (params) => businessActionService.createDeploymentTask({
        ...params,
        runtime: {
          ...params.runtime,
          context: {
            ...(params.runtime.context || {}),
            trigger_type: taskTypes.TriggerType.MANUAL,
            source_type: taskTypes.TaskSourceType.MANUAL_OPERATION,
          },
        },
      }),
      { maxIterations: data.robotaxis.length, isProgressResult: (item) => item.resultType === "DEPLOYMENT_CREATED" },
    );
    const created = result?.data?.results || [];
    const triggerLog = createEventLog({
      event_type: taskTypes.TaskEventType.DEPLOYMENT_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: created.length ? `手动触发运营投放任务生成，生成 ${created.length} 条` : "手动触发运营投放任务生成",
    });

    if (!created.length) {
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.DEPLOYMENT_FAILED,
          event_result: taskTypes.TaskEventResult.SKIPPED,
          trigger_type: taskTypes.TriggerType.MANUAL,
          message: result?.message || "当前没有可运营投放的 Robotaxi 或有效投放目标",
        }),
        triggerLog,
        ...logs,
      ]);
      return;
    }

    setTaskEventLogs((logs) => [
      ...created.map((item) => createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: item.objectId,
        robotaxi_id: item.robotaxiId,
        route_execution_id: item.routeExecutionId,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: `已创建 ${item.robotaxiId} 的运营投放任务`,
      })),
      ...created.map((item) => createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: item.objectId,
        robotaxi_id: item.robotaxiId,
        route_execution_id: item.routeExecutionId,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: `已创建 ${item.robotaxiId} 的运营行驶记录 ${item.routeExecutionId}`,
      })),
      triggerLog,
      ...logs,
    ]);
    selectForPage("deploymentTasks", "deploymentTask", created[0]?.objectId);
  }

  function confirmDeploymentPlan(plan) {
    const result = operatingPlanningService?.confirmDeploymentPlan({ plan, context: { now } });
    if (!result?.succeeded) return;
    setOperationalData((current) => ({ ...current, deploymentPlans: replaceCollectionItem(current.deploymentPlans || [], "deployment_plan_id", result.plan) }));
  }

  function cancelDeploymentPlan(plan) {
    const result = operatingPlanningService?.cancelDeploymentPlan({ plan, context: { now } });
    if (!result?.succeeded) return;
    setOperationalData((current) => ({ ...current, deploymentPlans: replaceCollectionItem(current.deploymentPlans || [], "deployment_plan_id", result.plan) }));
  }

  function dispatchDeploymentPlan(plan) {
    if (!["CONFIRMED", "PARTIALLY_DISPATCHED"].includes(plan?.plan_status)) return;
    const result = runManualBusinessAction((params) => businessActionService.createDeploymentTasksFromPlan({
      ...params,
      plan,
      runtime: { ...params.runtime, context: { ...(params.runtime.context || {}), trigger_type: taskTypes.TriggerType.MANUAL, source_type: "DEPLOYMENT_PLAN" } },
    }));
    const taskIds = result?.data?.taskIds || [];
    if (!taskIds.length) return;
    const transition = operatingPlanningService.markDeploymentPlanDispatched({
      plan,
      taskIds,
      failureReasons: result?.data?.failureReasons || [],
      context: { now },
    });
    if (transition.succeeded) setOperationalData((current) => ({ ...current, deploymentPlans: replaceCollectionItem(current.deploymentPlans || [], "deployment_plan_id", transition.plan) }));
    selectForPage("deploymentTasks", "deploymentTask", taskIds[0]);
  }

  function createServiceOrderFromDemand(orderChannel) {
    const result = runManualBusinessAction((params) => businessActionService.createServiceOrder({
      ...params,
      runtime: {
        ...params.runtime,
        context: { ...(params.runtime.context || {}), order_channel: orderChannel },
      },
    }));
    const order = result?.updates?.serviceOrders?.[0];
    if (!result?.success || !order) return;
    addServiceOrderEvent({
      service_order_id: order.service_order_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${order.service_order_id} 已创建服务订单`,
    });
    selectForPage("serviceOrders", "serviceOrder", order.service_order_id);
  }

  function estimateServiceOrderPrice(serviceOrderId) {
    const serviceOrder = serviceOrders.find((item) => item.service_order_id === serviceOrderId);
    if (!serviceOrder || ![serviceOrderTypes.ServiceOrderStatus.WAITING_PRICE_ESTIMATE, serviceOrderTypes.ServiceOrderStatus.CREATED].includes(serviceOrder.order_status)) return;
    const result = runManualBusinessAction((params) => businessActionService.executePricing({ ...params, objectId: serviceOrderId }));
    const nextOrder = result?.updates?.serviceOrders?.find((order) => order.service_order_id === serviceOrderId);
    if (!result?.success) {
      addServiceOrderEvent({
        service_order_id: serviceOrderId,
        event_type: taskTypes.TaskEventType.SERVICE_ORDER_PRICE_ESTIMATED,
        event_result: taskTypes.TaskEventResult.FAILED,
        message: `${serviceOrderId} 价格预估失败：${getDisplayValue(result?.data?.failureReason)}`,
      });
      selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
      return;
    }
    const pricingDecision = result?.updates?.pricingDecisions?.[0];
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      pricing_strategy_run_id: result?.updates?.pricingStrategyRuns?.[0]?.pricing_strategy_run_id,
      pricing_decision_id: pricingDecision?.pricing_decision_id,
      route_id: nextOrder?.price_estimation_route_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_PRICE_ESTIMATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 价格预估完成，预估价格 ${pricingDecision?.estimated_price ?? nextOrder?.estimated_price}`,
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }

  function callRobotaxiForServiceOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find((item) => item.service_order_id === serviceOrderId);
    if (!serviceOrder || ![serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_CALL, serviceOrderTypes.ServiceOrderStatus.WAITING_CUSTOMER_CONFIRM].includes(serviceOrder.order_status)) return;
    const result = runManualBusinessAction((params) => businessActionService.callRobotaxi({ ...params, objectId: serviceOrderId }));
    if (!result?.success) return;
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_ROBOTAXI_CALLED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 已呼叫 Robotaxi，等待分配`,
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }

  function matchServiceOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find((item) => item.service_order_id === serviceOrderId);
    const assignableStatuses = [
      serviceOrderTypes.ServiceOrderStatus.WAITING_ROBOTAXI_ASSIGNMENT,
      serviceOrderTypes.ServiceOrderStatus.ROBOTAXI_ASSIGNMENT_FAILED,
      serviceOrderTypes.ServiceOrderStatus.WAITING_FOR_VEHICLE,
      serviceOrderTypes.ServiceOrderStatus.MATCH_FAILED,
      serviceOrderTypes.ServiceOrderStatus.MATCHING_FAILED,
    ];
    if (!serviceOrder || !assignableStatuses.includes(serviceOrder.order_status)) return;
    const result = runManualBusinessAction((params) => businessActionService.executeOrderMatching({ ...params, objectId: serviceOrderId }));
    const nextOrder = result?.updates?.serviceOrders?.find((order) => order.service_order_id === serviceOrderId);
    const trip = nextOrder?.trip_id ? result?.updates?.trips?.find((item) => item.trip_id === nextOrder.trip_id) : null;
    if (!result?.success) {
      addServiceOrderEvent({
        service_order_id: serviceOrderId,
        event_type: taskTypes.TaskEventType.SERVICE_ORDER_ASSIGNMENT_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        message: `${serviceOrderId} 分配 Robotaxi 失败：${getDisplayValue(result?.data?.failureReason)}`,
      });
      selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
      return;
    }
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: trip?.trip_id || nextOrder?.trip_id,
      robotaxi_id: nextOrder?.matched_robotaxi_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_ROBOTAXI_ASSIGNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 已分配 ${nextOrder?.matched_robotaxi_id}，并创建履约行驶记录 ${trip?.trip_id || nextOrder?.trip_id}`,
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }

  function createTripForOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find((item) => item.service_order_id === serviceOrderId);
    if (!serviceOrder || serviceOrder.trip_id || !serviceOrder.matched_robotaxi_id) return;
    const result = runManualBusinessAction((params) => businessActionService.advanceTrip({ ...params, objectId: serviceOrderId }));
    const trip = result?.updates?.trips?.find((item) => item.service_order_id === serviceOrderId);
    if (!result?.success || !trip) return;
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: trip.trip_id,
      robotaxi_id: serviceOrder.matched_robotaxi_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_TRIP_CREATED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 已创建履约行驶记录 ${trip.trip_id}`,
    });
    selectForPage("serviceFulfillmentRecords", "trip", trip.trip_id);
  }

  function settleServiceOrder(serviceOrderId, visibleOrder = null) {
    const serviceOrder = serviceOrders.find((item) => item.service_order_id === serviceOrderId);
    const result = runManualBusinessAction((params) => businessActionService.settleServiceOrder({ ...params, objectId: serviceOrderId }));
    const settledOrder = result?.updates?.serviceOrders?.find((item) => item.service_order_id === serviceOrderId);
    const trip = trips.find((item) => item.trip_id === serviceOrder?.trip_id || item.service_order_id === serviceOrderId);
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: trip?.trip_id,
      event_type: result?.success ? taskTypes.TaskEventType.SERVICE_ORDER_SETTLED : taskTypes.TaskEventType.SERVICE_ORDER_SETTLEMENT_FAILED,
      event_result: result?.success ? taskTypes.TaskEventResult.SUCCESS : taskTypes.TaskEventResult.FAILED,
      message: result?.success
        ? `${serviceOrderId} 结算完成，最终价格 ${settledOrder?.final_price ?? visibleOrder?.final_price ?? serviceOrder?.final_price ?? ""}`
        : `${serviceOrderId} 结算失败：${getDisplayValue(result?.data?.failureReason)}`,
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }

  function payServiceOrder(serviceOrderId) {
    const serviceOrder = serviceOrders.find((item) => item.service_order_id === serviceOrderId);
    if (!serviceOrder || serviceOrder.order_status !== serviceOrderTypes.ServiceOrderStatus.WAITING_PAYMENT) return;
    const result = runManualBusinessAction((params) => businessActionService.payServiceOrder({ ...params, objectId: serviceOrderId }));
    if (!result?.success) return;
    const paidOrder = result.updates?.serviceOrders?.find((order) => order.service_order_id === serviceOrderId);
    addServiceOrderEvent({
      service_order_id: serviceOrderId,
      trip_id: serviceOrder.trip_id,
      event_type: taskTypes.TaskEventType.SERVICE_ORDER_PAID,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      message: `${serviceOrderId} 支付完成，支付金额 ${paidOrder?.paid_amount ?? paidOrder?.final_price ?? serviceOrder.final_price}`,
    });
    selectForPage("serviceOrders", "serviceOrder", serviceOrderId);
  }

  function viewTripForServiceOrder(serviceOrder) {
    const trip = trips.find((item) =>
      item.trip_id === serviceOrder.trip_id ||
      item.service_order_id === serviceOrder.service_order_id
    );
    if (!trip) {
      viewRecordDetail("serviceOrders", "serviceOrder", serviceOrder.service_order_id);
      return;
    }
    const nextFilters = { keyword: trip.trip_id, statusValue: null, triggerType: null };
    const nextSelection = { type: "trip", id: trip.trip_id };
    setActivePageAndMenu("serviceFulfillmentRecords");
    setWorkspacePages((current) => addWorkspacePage(current, "serviceFulfillmentRecords"));
    setSelected(nextSelection);
    setDetailCollapsedForPage("serviceFulfillmentRecords", false);
    setPageSelections((current) => ({ ...current, serviceFulfillmentRecords: nextSelection }));
    setPageUiState((current) => ({
      ...current,
      serviceFulfillmentRecords: createNextPageUiState(current.serviceFulfillmentRecords, { filters: nextFilters, appliedFilters: nextFilters, pagination: { current: 1 } }),
    }));
  }

  function createTripRecord({ serviceOrder, robotaxiId }) {
    return tripTypes.createTrip({
      trip_id: nextTripId(),
      service_order_id: serviceOrder.service_order_id,
      robotaxi_id: robotaxiId,
      pickup_cell_id: serviceOrder.pickup_cell_id,
      pickup_service_area_id: serviceOrder.pickup_service_area_id,
      dropoff_cell_id: serviceOrder.dropoff_cell_id,
      dropoff_service_area_id: serviceOrder.dropoff_service_area_id,
      current_cell_id: data.robotaxis.find((robotaxi) => robotaxi.robotaxi_id === robotaxiId)?.current_cell_id || serviceOrder.pickup_cell_id,
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
      failure_reason: null,
    });
  }

  function advanceTrip(tripId) {
    const trip = trips.find((item) => item.trip_id === tripId);
    if (!trip) return;
    const result = runManualBusinessAction((params) => businessActionService.advanceTrip({ ...params, objectId: tripId }));
    if (!result?.success) return;
    const nextTrip = result.updates?.trips?.find((item) => item.trip_id === tripId);
    if (nextTrip) {
      addServiceOrderEvent({
        service_order_id: nextTrip.service_order_id,
        trip_id: nextTrip.trip_id,
        robotaxi_id: nextTrip.robotaxi_id,
        event_type: taskTypes.TaskEventType.ROUTE_STEP_ADVANCED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        message: `履约行驶 ${nextTrip.trip_id} 已推进至 ${getDisplayValue(nextTrip.trip_status)}`,
      });
    }
    selectForPage("serviceFulfillmentRecords", "trip", tripId);
  }

  function completeTripTravelNow(tripId) {
    const trip = trips.find((item) => item.trip_id === tripId);
    if (!trip || ![tripTypes.TripStatus.ON_THE_WAY_PICKUP, tripTypes.TripStatus.ON_THE_WAY_DESTINATION].includes(trip.trip_status)) return;
    const result = runManualBusinessAction((params) => businessActionService.completeTripTravel({ ...params, objectId: tripId }));
    if (!result?.success) return;
    const nextTrip = result.updates?.trips?.find((item) => item.trip_id === tripId);
    if (nextTrip) {
      addServiceOrderEvent({
        service_order_id: nextTrip.service_order_id,
        trip_id: nextTrip.trip_id,
        robotaxi_id: nextTrip.robotaxi_id,
        event_type: taskTypes.TaskEventType.ROUTE_EXECUTION_ARRIVED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        message: `履约行驶 ${nextTrip.trip_id} 已自动到达 ${getDisplayValue(nextTrip.trip_status)}`,
      });
    }
    selectForPage("serviceFulfillmentRecords", "trip", tripId);
  }

  function replanTripDestination(tripId) {
    const trip = trips.find((item) => item.trip_id === tripId);
    if (!trip || trip.trip_status !== tripTypes.TripStatus.ON_THE_WAY_DESTINATION) return;
    const target = getAlternativeServiceOrderDestination(data, trip);
    const result = replanTripRoute(trip, {
      targetCellId: target?.target_cell_id || null,
      targetServiceAreaId: target?.target_service_area_id || null,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION_CHANGE,
      routeChangeReason: taskTypes.RouteChangeReason.DESTINATION_CHANGE_REPLAN,
      exceptionType: "DESTINATION_CHANGE_REPLAN",
      failureReason: target ? null : taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL,
    });
    applyTripReplanResult(trip, result);
  }

  function replanTripRouteException(tripId) {
    const trip = trips.find((item) => item.trip_id === tripId);
    if (!trip || ![tripTypes.TripStatus.ON_THE_WAY_PICKUP, tripTypes.TripStatus.ON_THE_WAY_DESTINATION].includes(trip.trip_status)) return;
    const isPickupPhase = trip.trip_status === tripTypes.TripStatus.ON_THE_WAY_PICKUP;
    const result = replanTripRoute(trip, {
      targetCellId: isPickupPhase ? trip.pickup_cell_id : trip.dropoff_cell_id,
      targetServiceAreaId: isPickupPhase ? trip.pickup_service_area_id : trip.dropoff_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ROUTE_EXCEPTION_REPLAN,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ROUTE_EXCEPTION_REPLAN,
      exceptionType: "SERVICE_ROUTE_EXCEPTION_REPLAN",
      failureReason: null,
    });
    applyTripReplanResult(trip, result);
  }

  function applyTripReplanResult(trip, result) {
    setRoutePlanningRuns((items) => [result.routePlanningRun, ...items]);
    if (result.route) {
      setOperationalData((current) => ({
        ...current,
        routes: [result.route, ...current.routes],
        robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === trip.robotaxi_id ? {
          ...robotaxi,
          current_route_id: result.route.route_id,
          motion_status: "MOVING",
          current_order_id: trip.service_order_id,
          available_for_dispatch: false,
        } : robotaxi),
      }));
      setTrips((items) => items.map((item) => item.trip_id === trip.trip_id ? result.nextTrip : item));
      setServiceOrders((items) => items.map((order) => order.service_order_id === trip.service_order_id ? updateServiceOrderForTrip(order, result.nextTrip) : order));
    } else {
      setTrips((items) => items.map((item) => item.trip_id === trip.trip_id ? result.waitingTrip : item));
      setServiceOrders((items) => items.map((order) => order.service_order_id === trip.service_order_id ? updateServiceOrderForTrip(order, result.waitingTrip) : order));
      setOperationalData((current) => ({
        ...current,
        robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === trip.robotaxi_id ? updateRobotaxiForTrip(robotaxi, result.waitingTrip, trip) : robotaxi),
      }));
    }
    selectForPage("serviceFulfillmentRecords", "trip", trip.trip_id);
  }

  function planRouteExecutionRoute(routeExecutionId) {
    const execution = routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
    if (execution?.task_type && execution.task_type !== taskTypes.TaskType.DEPLOYMENT) {
      planFleetOperationRouteExecutionRecord(execution);
      return;
    }
    const task = deploymentTasks.find((item) => item.task_id === execution?.task_id);
    if (!execution || !task) return;
    if (execution.execution_status === taskTypes.RouteExecutionStatus.ARRIVAL_ABNORMAL) {
      planAbnormalArrivalRoute(execution, task);
      return;
    }
    if (execution.execution_status !== taskTypes.RouteExecutionStatus.WAITING_ROUTE) return;
    const serviceResult = runManualBusinessAction((params) => businessActionService.executeRoutePlanning({
      ...params,
      objectType: "routeExecution",
      objectId: routeExecutionId,
    }));
    const plannedExecution = serviceResult?.updates?.routeExecutions?.find((item) => item.route_execution_id === routeExecutionId);
    const plannedTask = plannedExecution ? serviceResult?.updates?.deploymentTasks?.find((item) => item.task_id === plannedExecution.task_id) : task;
    addLog({
      event_type: serviceResult?.success ? taskTypes.TaskEventType.ROUTE_PLANNED : taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
      event_result: serviceResult?.success ? taskTypes.TaskEventResult.SUCCESS : taskTypes.TaskEventResult.FAILED,
      task_id: plannedTask?.task_id || task.task_id,
      robotaxi_id: plannedExecution?.robotaxi_id || task.robotaxi_id,
      route_execution_id: routeExecutionId,
      route_id: plannedExecution?.route_id || null,
      message: serviceResult?.success
        ? `${task.task_id} 的行驶记录 ${routeExecutionId} 已通过服务层完成路径规划`
        : `${task.task_id} 路径规划失败：${getDisplayValue(serviceResult?.data?.failureReason)}`,
    });
    if (serviceResult?.success) focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.MOVING);
    selectForPage("routeExecutions", "routeExecution", routeExecutionId);
    return;

    const routePlanningRunId = nextRoutePlanningRunId();
    const route = createDeploymentRoute(task, data, {
      originCellId: execution.current_cell_id || task.origin_cell_id,
      targetCellId: execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id,
      targetServiceAreaId: execution.planned_target_service_area_id || task.planned_target_service_area_id || task.target_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
      routeExecutionId: execution.route_execution_id,
      routePlanningRunId,
    });
    if (route.route_steps.length === 0) {
      setRoutePlanningRuns((items) => [createRoutePlanningRun({
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
        failureReason: route.failure_reason,
      }), ...items]);
      setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? {
        ...item,
        execution_status: taskTypes.RouteExecutionStatus.FAILED,
        failure_reason: route.failure_reason,
      } : item));
      setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === task.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.FAILED,
        failure_reason: route.failure_reason,
      } : item));
      addLog({
        event_type: taskTypes.TaskEventType.DEPLOYMENT_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        route_strategy_id: route.route_strategy_id,
        message: `${task.task_id} 路径规划失败：${getDisplayValue(route.failure_reason)}`,
      });
      return;
    }
    const routeCells = getRouteExecutionCells(route, data.roadSegments, execution.current_cell_id || task.origin_cell_id, execution.planned_target_cell_id || task.planned_target_cell_id || task.target_cell_id);
    setOperationalData((current) => ({
      ...current,
      routes: [route, ...current.routes],
      robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        current_task_id: task.task_id,
        current_route_id: route.route_id,
        motion_status: "MOVING",
      } : robotaxi),
    }));
    setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? routePlanningService.applyTravelMetrics({
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
        battery_consumed_kwh: 0,
        battery_consumed_percent: 0,
        started_at: now(),
        completed_at: null,
        failure_reason: null,
      },
      routes: [route, ...data.routes],
      currentRouteId: route.route_id,
      currentStepIndex: 0,
    }) : item));
    setRoutePlanningRuns((items) => [createRoutePlanningRun({
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
      totalDistanceKm: route.total_distance_km,
    }), ...items]);
    setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === execution.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.MOVING,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      started_at: now(),
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      message: `${task.task_id} 的行驶记录 ${execution.route_execution_id} 已生成模拟路径 ${route.route_id}，进入行驶中`,
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.MOVING);
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }

  function planAbnormalArrivalRoute(execution, task) {
    if (!execution || task.blocked_handling_policy !== taskTypes.BlockedHandlingPolicy.SAME_SERVICE_AREA_RETRY) return;
    const currentCellId = execution.current_cell_id;
    const excludedCellIds = [
      currentCellId,
      task.planned_target_cell_id,
      task.target_cell_id,
      task.actual_target_cell_id,
      execution.actual_target_cell_id,
      ...(execution.route_history || []).map((history) => history.target_cell_id),
    ];
    const target = getAlternativeDeploymentTarget(
      data,
      task.planned_target_service_area_id || task.target_service_area_id,
      excludedCellIds,
    );
    if (!target) {
      setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === task.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.ARRIVAL_ABNORMAL,
        failure_reason: taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL,
      } : item));
      setRoutePlanningRuns((items) => [createRoutePlanningRun({
        routeStrategyId: taskTypes.RoutePlanningStrategy.ABNORMAL_SAME_SERVICE_AREA,
        planningAlgorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
        taskId: task.task_id,
        routeExecutionId: execution.route_execution_id,
        robotaxiId: task.robotaxi_id,
        originCellId: currentCellId,
        targetCellId: null,
        resultRouteId: null,
        planningResult: taskTypes.RoutePlanningResult.FAILED,
        failureReason: taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL,
      }), ...items]);
      addLog({
        event_type: taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        route_execution_id: execution.route_execution_id,
        message: `${task.task_id} 未找到同服务区替代目标，路径规划执行失败`,
      });
      return;
    }

    const route = createDeploymentRoute(task, data, {
      routeExecutionId: execution.route_execution_id,
      originCellId: currentCellId,
      targetCellId: target.target_cell_id,
      targetServiceAreaId: target.target_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.ABNORMAL_SAME_SERVICE_AREA,
      routePlanningRunId: nextRoutePlanningRunId(),
    });
    if (route.route_steps.length === 0) {
      setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === task.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.ARRIVAL_ABNORMAL,
        failure_reason: route.failure_reason,
      } : item));
      setRoutePlanningRuns((items) => [createRoutePlanningRun({
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
        failureReason: route.failure_reason,
      }), ...items]);
      addLog({
        event_type: taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        route_execution_id: execution.route_execution_id,
        route_strategy_id: route.route_strategy_id,
        message: `${task.task_id} 异常到达后路径规划失败：${getDisplayValue(route.failure_reason)}`,
      });
      return;
    }
    const routeCells = getRouteExecutionCells(route, data.roadSegments, currentCellId, target.target_cell_id);

    setOperationalData((current) => ({
      ...current,
      routes: [route, ...current.routes],
      robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        current_route_id: route.route_id,
        current_task_id: task.task_id,
        motion_status: "MOVING",
      } : robotaxi),
    }));
    setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? routePlanningService.applyTravelMetrics({
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
        route_history: [
          ...(item.route_history || []),
          createRouteHistoryEntry(route, taskTypes.RouteChangeReason.ABNORMAL_ARRIVAL_REPLAN, task.arrival_execution_result),
        ],
        time_elapsed: "0",
        completed_at: null,
        failure_reason: null,
      },
      routes: [route, ...data.routes],
      currentRouteId: route.route_id,
      currentStepIndex: 0,
    }) : item));
    setRoutePlanningRuns((items) => [createRoutePlanningRun({
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
      totalDistanceKm: route.total_distance_km,
    }), ...items]);
    setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === task.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.MOVING,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      target_cell_id: target.target_cell_id,
      target_service_area_id: target.target_service_area_id,
      actual_target_service_area_id: null,
      actual_target_cell_id: null,
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      message: `${task.task_id} 异常到达后已生成替代路径 ${route.route_id}`,
    });
    focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.MOVING);
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }

  function startRouteExecution(routeExecutionId) {
    const execution = routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
    if (execution?.task_type && execution.task_type !== taskTypes.TaskType.DEPLOYMENT) {
      startFleetOperationRouteExecutionRecord(execution);
      return;
    }
    const task = deploymentTasks.find((item) => item.task_id === execution?.task_id);
    const route = data.routes.find((item) => item.route_id === execution?.route_id);
    if (!task || !route || !execution || execution.execution_status !== taskTypes.RouteExecutionStatus.WAITING_START) return;

    setRouteExecutions((items) => items.map((item) => item.route_execution_id === execution.route_execution_id ? {
      ...item,
      execution_status: taskTypes.RouteExecutionStatus.MOVING,
      started_at: now(),
    } : item));
    setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === execution.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.MOVING,
      started_at: now(),
    } : item));
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        motion_status: "MOVING",
        current_route_id: route.route_id,
        current_task_id: task.task_id,
      } : robotaxi),
    }));
    addLog({
      event_type: taskTypes.TaskEventType.DEPLOYMENT_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: `${task.robotaxi_id} 开始自动行驶`,
    });
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }

  function advanceRouteExecution(routeExecutionId) {
    const execution = routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
    if (!execution || execution.execution_status !== taskTypes.RouteExecutionStatus.MOVING) return;
    if (execution.task_type && execution.task_type !== taskTypes.TaskType.DEPLOYMENT) {
      advanceFleetOperationRouteExecution(execution);
      return;
    }
    const task = deploymentTasks.find((item) => item.task_id === execution.task_id);
    const route = data.routes.find((item) => item.route_id === execution.route_id);
    if (!task || !route) return;
    const serviceResult = runManualBusinessAction((params) => businessActionService.advanceRouteExecution({ ...params, objectId: routeExecutionId }));
    const nextExecution = serviceResult?.updates?.routeExecutions?.find((item) => item.route_execution_id === routeExecutionId);
    if (serviceResult?.success && nextExecution) {
      addLog({
        event_type: nextExecution.execution_status === taskTypes.RouteExecutionStatus.ARRIVED
          ? taskTypes.TaskEventType.ROUTE_EXECUTION_ARRIVED
          : taskTypes.TaskEventType.ROUTE_STEP_ADVANCED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: nextExecution.task_id,
        robotaxi_id: nextExecution.robotaxi_id,
        route_execution_id: nextExecution.route_execution_id,
        message: nextExecution.execution_status === taskTypes.RouteExecutionStatus.ARRIVED
          ? `${nextExecution.robotaxi_id} 已到达当前路径目标，等待到达结果`
          : `${nextExecution.robotaxi_id} 继续行驶至 ${nextExecution.current_cell_id}`,
      });
      focusRouteExecutionStatus(nextExecution.execution_status);
      return;
    }
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_PLANNING_FAILED,
      event_result: taskTypes.TaskEventResult.FAILED,
      task_id: execution.task_id,
      robotaxi_id: execution.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: serviceResult?.message || `${execution.robotaxi_id} 继续行驶失败`,
    });
  }

  function completeRouteExecutionTravelNow(routeExecutionId) {
    const execution = routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
    if (!execution || execution.execution_status !== taskTypes.RouteExecutionStatus.MOVING) return;
    const route = data.routes.find((item) => item.route_id === execution.route_id);
    if (!route) return;
    if (execution.task_type && execution.task_type !== taskTypes.TaskType.DEPLOYMENT) {
      let nextExecution = execution;
      let nextTask = findFleetOperationTaskByExecution(execution);
      let nextRobotaxi = operationalData.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
      if (!nextTask || !nextRobotaxi || !fleetOperationTaskService) return;
      for (let index = Number(nextExecution.current_step_index || 0); index < Number(nextExecution.total_step_count || 0); index += 1) {
        const result = fleetOperationTaskService.advanceFleetOperationRouteExecution({
          execution: nextExecution,
          task: nextTask,
          route,
          robotaxi: nextRobotaxi,
          context: { now, workflowTimingProfile: getActiveWorkflowTimingProfileForBusinessAction() },
        });
        if (!result.succeeded) return;
        nextExecution = result.routeExecution;
        nextTask = result.task || nextTask;
        nextRobotaxi = result.robotaxi || nextRobotaxi;
        if (nextExecution.execution_status === taskTypes.RouteExecutionStatus.ARRIVED) break;
      }
      setRouteExecutions((items) => items.map((item) => item.route_execution_id === routeExecutionId ? nextExecution : item));
      if (nextTask) updateFleetOperationTask(nextTask);
      if (nextRobotaxi) {
        setOperationalData((current) => ({
          ...current,
          robotaxis: current.robotaxis.map((item) => item.robotaxi_id === nextRobotaxi.robotaxi_id ? nextRobotaxi : item),
        }));
      }
      addLog({
        event_type: taskTypes.TaskEventType.ROUTE_EXECUTION_ARRIVED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: nextExecution.task_id,
        robotaxi_id: nextExecution.robotaxi_id,
        route_execution_id: nextExecution.route_execution_id,
        message: `${nextExecution.robotaxi_id} 已按自动行驶到达目的地，等待到达确认`,
      });
      focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.ARRIVED);
      return;
    }

    const task = deploymentTasks.find((item) => item.task_id === execution.task_id);
    const robotaxi = operationalData.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
    if (!task || !robotaxi) return;
    const serviceResult = runManualBusinessAction((params) => businessActionService.completeRouteExecutionTravel({ ...params, objectId: routeExecutionId }));
    const nextExecution = serviceResult?.updates?.routeExecutions?.find((item) => item.route_execution_id === routeExecutionId);
    if (serviceResult?.success && nextExecution) {
      addLog({
        event_type: taskTypes.TaskEventType.ROUTE_EXECUTION_ARRIVED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: nextExecution.task_id,
        robotaxi_id: nextExecution.robotaxi_id,
        route_execution_id: nextExecution.route_execution_id,
        message: `${nextExecution.robotaxi_id} 已按自动行驶到达目的地，等待到达确认`,
      });
      focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.ARRIVED);
      return;
    }
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_EXECUTION_ARRIVED,
      event_result: taskTypes.TaskEventResult.FAILED,
      task_id: execution.task_id,
      robotaxi_id: execution.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: serviceResult?.message || `${execution.robotaxi_id} 自动到达失败`,
    });
  }

  function submitNormalArrival(routeExecutionId) {
    const execution = routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
    if (execution?.task_type && execution.task_type !== taskTypes.TaskType.DEPLOYMENT) {
      submitFleetOperationNormalArrival(execution);
      return;
    }
    const task = deploymentTasks.find((item) => item.task_id === execution?.task_id);
    if (!execution || !task || execution.execution_status !== taskTypes.RouteExecutionStatus.ARRIVED) return;
    const serviceResult = runManualBusinessAction((params) => businessActionService.confirmRouteExecutionArrival({ ...params, objectId: routeExecutionId }));
    const confirmedExecution = serviceResult?.updates?.routeExecutions?.find((item) => item.route_execution_id === routeExecutionId);
    if (serviceResult?.success && confirmedExecution) {
      addLog({
        event_type: taskTypes.TaskEventType.ARRIVAL_NORMAL,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: task.task_id,
        robotaxi_id: execution.robotaxi_id,
        route_execution_id: execution.route_execution_id,
        message: `${execution.robotaxi_id} 正常到达，运营投放完成`,
      });
      focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.COMPLETED);
      return;
    }
    addLog({
      event_type: taskTypes.TaskEventType.ARRIVAL_NORMAL,
      event_result: taskTypes.TaskEventResult.FAILED,
      task_id: task.task_id,
      robotaxi_id: execution.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: serviceResult?.message || `${execution.robotaxi_id} 正常到达确认失败`,
    });
  }

  function submitAbnormalArrival(routeExecutionId, arrivalResult) {
    const execution = routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
    if (execution?.task_type && execution.task_type !== taskTypes.TaskType.DEPLOYMENT) {
      submitFleetOperationAbnormalArrival(execution, arrivalResult);
      return;
    }
    const task = deploymentTasks.find((item) => item.task_id === execution?.task_id);
    if (!execution || !task || execution.execution_status !== taskTypes.RouteExecutionStatus.ARRIVED) return;
    const serviceResult = runManualBusinessAction((params) => businessActionService.confirmRouteExecutionAbnormalArrival({
      ...params,
      objectId: routeExecutionId,
      arrivalResult,
    }));
    const abnormalExecution = serviceResult?.updates?.routeExecutions?.find((item) => item.route_execution_id === routeExecutionId);
    addLog({
      event_type: taskTypes.TaskEventType.ARRIVAL_ABNORMAL,
      event_result: serviceResult?.success ? taskTypes.TaskEventResult.SUCCESS : taskTypes.TaskEventResult.FAILED,
      task_id: task.task_id,
      robotaxi_id: execution.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: serviceResult?.success
        ? `${execution.robotaxi_id} 异常到达：${getDisplayValue(arrivalResult)}`
        : serviceResult?.message || `${execution.robotaxi_id} 异常到达确认失败`,
    });
    if (abnormalExecution) focusRouteExecutionStatus(taskTypes.RouteExecutionStatus.ARRIVAL_ABNORMAL);
  }

  function addLog(log) {
    setTaskEventLogs((logs) => [createEventLog(log), ...logs]);
  }

  function appendFleetOperationPageEvent(page, event) {
    if (!page) return;
    setTaskEventLogs((logs) => [
      createEventLog({
        ...event,
        source_page: page,
      }),
      ...logs,
    ]);
  }

  function appendRecordOperationEvent(page, event) {
    if (!page) return;
    const operationEvent = businessPlanningService?.createBusinessOperationEvent
      ? businessPlanningService.createBusinessOperationEvent({
        page,
        businessObjectType: event.business_object_type || event.source_object_type || null,
        businessObjectId: event.business_object_id || event.source_object_id || null,
        actionType: event.action_type || event.event_type,
        resultType: event.result_type || event.event_result,
        eventResult: event.event_result,
        message: event.message,
        occurredAt: now(),
      })
      : { ...event, source_page: page };
    setTaskEventLogs((logs) => [
      createEventLog({
        ...operationEvent,
        source_page: page,
      }),
      ...logs,
    ]);
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
      source_page: event.source_page || null,
      business_object_type: event.business_object_type || event.source_object_type || null,
      business_object_id: event.business_object_id || event.source_object_id || null,
      action_type: event.action_type || event.event_type,
      result_type: event.result_type || event.event_result,
      trigger_type: event.trigger_type || null,
      event_type: event.event_type,
      event_result: event.event_result,
      message: event.message,
      created_at: now(),
    });
  }

  function addServiceOrderEvent(event) {
    setTaskEventLogs((logs) => [createEventLog(event), ...logs]);
  }
}

function WorkspaceBar({ pages, activePage, onActivate, onClose }) {
  const normalizedPages = normalizeWorkspacePages(pages, activePage);
  return (
    <div className="workspace-bar" aria-label="已打开业务页面">
      <div className="workspace-scroll">
        {normalizedPages.map((page) => {
          const isActive = page === activePage;
          const isPinned = page === "console";
          return (
            <button
              key={page}
              type="button"
              className={isActive ? "workspace-tab active" : "workspace-tab"}
              onClick={() => onActivate(page)}
              title={getPageLabel(page)}
            >
              <span>{getPageLabel(page)}</span>
              {!isPinned && (
                <span
                  role="button"
                  tabIndex={0}
                  className="workspace-tab-close"
                  title="关闭页面"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(page);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onClose(page);
                    }
                  }}
                >
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecordTable({ page, rows, selected, uiState, onUiStateChange, onSelect, actions }) {
  const pagePresentation = pageContextService.resolvePagePresentation(page);
  const pageArchitecture = pageArchitectureRegistry.getPageArchitecture(page);
  const isReadinessPage = page === "readinessTasks";
  const isFleetOperationTaskPage = ["cleaningTasks", "chargingTasks", "maintenanceTasks", "failureHandlingTasks", "retirementTasks"].includes(page);
  const isFleetOperationPolicyPage = page === "fleetOperationPolicies";
  const isFleetOperationDispatchStrategyPage = page === "fleetOperationDispatchStrategies";
  const isRobotaxiTaskPlanningStrategyPage = page === "robotaxiTaskPlanningStrategies";
  const isTaskDispatchStrategyPage = page === "taskDispatchStrategies";
  const isRobotaxiPage = page === "robotaxis";
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
  const isTimedOperationPage = page === "timedOperations";
  const isDemandProfilePage = page === "demandProfiles";
  const isBusinessTargetPage = page === "businessTargets";
  const isSupplyProductionProfilePage = page === "supplyProductionProfiles";
  const isLongTermDemandForecastStrategyPage = page === "longTermDemandForecastStrategies";
  const isSupplyDecisionStrategyPage = page === "supplyDecisionStrategies";
  const isShortTermDemandForecastStrategyPage = page === "shortTermDemandForecastStrategies";
  const isDeploymentDecisionStrategyPage = page === "deploymentDecisionStrategies";
  const isDeploymentPlanPage = page === "deploymentPlans";
  const isLongTermDemandForecastPage = page === "longTermDemandForecasts";
  const isOperatingModelPage = page === "operatingModel";
  const isDecisionCenterPage = page === "decisionCenter";
  const isSupplyPlanPage = page === "supplyPlans";
  const isProductionBatchPage = page === "productionBatches";
  const isFleetAllocationStrategyPage = page === "fleetAllocationStrategies";
  const isFleetAllocationResultPage = page === "fleetAllocationResults";
  const isSupplyDemandBalanceStrategyPage = page === "supplyDemandBalanceStrategies";
  const isRobotaxiDeliveryOrderPage = page === "robotaxiDeliveryOrders";
  const isMetricAnalysisPage = ["operatingMetricsOverview", "serviceMetrics", "supplyAssetMetrics", "financialMetrics", "processDiagnostics"].includes(page);
  const isSupplyDocumentPage = isSupplyPlanPage || isProductionBatchPage || isRobotaxiDeliveryOrderPage || isDeploymentPlanPage;
  const isBusinessOperationResultPage = isFleetAllocationResultPage || page === "supplyDemandBalanceResults";
  const isTaskOperationPage = isReadinessPage || isFleetOperationTaskPage || isDeploymentPage || isRouteExecutionPage;
  const isStrategyExecutionPanelPage = isFleetOperationPolicyPage || isFleetOperationDispatchStrategyPage || isRobotaxiTaskPlanningStrategyPage || isTaskDispatchStrategyPage || isFleetAllocationStrategyPage || isSupplyDemandBalanceStrategyPage || isSupplyDecisionStrategyPage || isShortTermDemandForecastStrategyPage || isDeploymentDecisionStrategyPage;
  const hasEventPanel = Boolean(pageArchitecture?.eventPanel);
  const config = tableConfig[page];
  const objectType = pageObjectType[page];
  if (!config || !objectType) {
    return (
      <div className="record-page">
        <Empty description="页面配置已更新，请从左侧菜单重新打开页面" />
      </div>
    );
  }
  const idField = idFieldByType[objectType];
  const statusField = statusFieldByPage[page];
  const [eventPanelHeight, setEventPanelHeight] = useState(112);
  const tableSectionRef = useRef(null);
  const [tableBodyHeight, setTableBodyHeight] = useState(220);
  const [abnormalTask, setAbnormalTask] = useState(null);
  const [abnormalIssueType, setAbnormalIssueType] = useState(taskTypes?.IssueType?.LOW_BATTERY || "LOW_BATTERY");
  const [abnormalArrivalExecution, setAbnormalArrivalExecution] = useState(null);
  const [abnormalArrivalType, setAbnormalArrivalType] = useState(taskTypes?.ArrivalExecutionResult?.ARRIVED_WITH_TARGET_OCCUPIED || "ARRIVED_WITH_TARGET_OCCUPIED");
  const [metricTableVisible, setMetricTableVisible] = useState(false);
  const filters = uiState.filters;
  const appliedFilters = uiState.appliedFilters;
  const pageSize = 14;
  const displayRows = useMemo(() => {
    return filterRecordRows(rows, config.columns, statusField, appliedFilters);
  }, [appliedFilters, config.columns, rows, statusField]);
  const robotaxiOperationActionMap = useMemo(() => {
    if (!isRobotaxiPage || !actions.getRobotaxiFleetOperationActions) return new Map();
    return new Map(displayRows.map((row) => [
      row.robotaxi_id,
      actions.getRobotaxiFleetOperationActions(row),
    ]));
  }, [actions.getRobotaxiFleetOperationActions, displayRows, isRobotaxiPage]);
  const maxPage = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const currentPage = Math.min(uiState.pagination?.current || 1, maxPage);
  const orderedStatusValues = getOrderedStatusValues(page);
  const statusContext = page === "deploymentTasks" ? "deployment" : page === "routeExecutions" ? "routeExecution" : null;
  const statusOptions = useMemo(() => createStatusOptions(rows, statusField, orderedStatusValues, statusContext), [orderedStatusValues, rows, statusContext, statusField]);
  const timedOperationObjectTypeOptions = useMemo(() => (
    isTimedOperationPage ? timedOperationDiagnostics.getTimedOperationObjectTypeOptions(rows) : []
  ), [isTimedOperationPage, rows]);
  const columns = config.columns.map((key) => ({
    key,
    title: getFieldLabel(key),
    dataIndex: key,
    ellipsis: false,
    width: getColumnWidth(key, displayRows),
    render: (_, row) => renderCellValue(key, row),
  }));
  const actionColumn = getActionColumn();
  const expectsRowAction = ["row", "view"].includes(pageArchitecture?.actionMode);
  if (expectsRowAction !== Boolean(actionColumn)) throw new Error(`页面操作合同与实现不一致：${page}`);
  const compactActionColumn = actionColumn ? { ...actionColumn, width: 136 } : null;
  const finalColumns = compactActionColumn ? [
    ...columns,
    compactActionColumn,
  ] : columns;
  const eventRows = isSimulationRunPage || isSimulationEventPage ? actions.simulationEvents : isSupplyDocumentPage ? createDocumentEventRows(displayRows, objectType, idField, actions.taskEventLogs, page) : isBusinessOperationResultPage ? createRecordOperationEventRows(actions.taskEventLogs, displayRows, objectType, idField, page) : isTripPage ? createTripEventRows(rows) : isServiceOrderPage ? createServiceOrderEventRows(actions.taskEventLogs, displayRows) : isLongTermDemandForecastStrategyPage ? createStrategyRunRows(actions.longTermDemandForecastRuns || [], displayRows, "forecast_strategy_id") : isSupplyDecisionStrategyPage ? createStrategyRunRows(actions.supplyDecisionRuns || [], displayRows, "supply_decision_strategy_id") : isShortTermDemandForecastStrategyPage ? createStrategyRunRows(actions.shortTermDemandForecastRuns || [], displayRows, "short_term_forecast_strategy_id") : isDeploymentDecisionStrategyPage ? createStrategyRunRows(actions.deploymentDecisionRuns || [], displayRows, "deployment_decision_strategy_id") : isFleetAllocationStrategyPage ? createStrategyRunRows(actions.fleetAllocationRuns || [], displayRows, "fleet_allocation_strategy_id") : isSupplyDemandBalanceStrategyPage ? createStrategyRunRows(actions.supplyDemandBalanceRuns || [], displayRows, "supply_demand_balance_strategy_id") : isFleetOperationPolicyPage ? createFleetOperationPolicyRunRows(actions.fleetOperationPolicyRuns, displayRows) : isFleetOperationDispatchStrategyPage ? createStrategyRunRows(actions.fleetOperationDispatchRuns, displayRows, "fleet_operation_dispatch_strategy_id") : isRobotaxiTaskPlanningStrategyPage ? createStrategyRunRows(actions.robotaxiTaskPlanningRuns, displayRows, "robotaxi_task_planning_strategy_id") : isTaskDispatchStrategyPage ? actions.taskDispatchRuns : isFleetOperationTaskPage ? createFleetTaskEventRows(actions.taskEventLogs, displayRows, page) : isDemandSimulationStrategyPage ? actions.demandSimulationRuns : isRoutePlanningPage ? actions.routePlanningRuns : isPricingPage ? actions.pricingStrategyRuns : isOrderMatchingPage ? actions.orderMatchingRuns : actions.taskEventLogs;
  const visibleEventRows = eventRows.slice(0, 300);
  const eventColumns = isSimulationRunPage || isSimulationEventPage ? tableConfig.simulationEvents.columns : isSupplyDocumentPage || isBusinessOperationResultPage ? ["event_id", "occurred_at", "business_object_type", "business_object_id", "action_type", "result_type", "message", "from_status", "to_status"] : isTripPage ? ["event_id", "event_time", "event_type", "event_result", "message", "trip_id", "service_order_id", "robotaxi_id", "route_id", "cell_id", "previous_status", "next_status"] : isServiceOrderPage ? ["event_id", "created_at", "event_type", "event_result", "message", "service_order_id", "trip_id", "pricing_decision_id", "pricing_strategy_run_id", "robotaxi_id"] : isLongTermDemandForecastStrategyPage ? tableConfig.longTermDemandForecastRuns.columns : isSupplyDecisionStrategyPage ? tableConfig.supplyDecisionRuns.columns : isShortTermDemandForecastStrategyPage ? tableConfig.shortTermDemandForecastRuns.columns : isDeploymentDecisionStrategyPage ? tableConfig.deploymentDecisionRuns.columns : isFleetAllocationStrategyPage ? tableConfig.fleetAllocationRuns.columns : isSupplyDemandBalanceStrategyPage ? tableConfig.supplyDemandBalanceRuns.columns : isFleetOperationPolicyPage ? tableConfig.fleetOperationPolicyRuns.columns : isFleetOperationDispatchStrategyPage ? tableConfig.fleetOperationDispatchRuns.columns : isRobotaxiTaskPlanningStrategyPage ? tableConfig.robotaxiTaskPlanningRuns.columns : isTaskDispatchStrategyPage ? tableConfig.taskDispatchRuns.columns : isDemandSimulationStrategyPage ? tableConfig.demandSimulationRuns.columns : isRoutePlanningPage ? tableConfig.routePlanningRuns.columns : isPricingPage ? tableConfig.pricingStrategyRuns.columns : isOrderMatchingPage ? tableConfig.orderMatchingRuns.columns : tableConfig.taskEventLogs.columns;
  const eventRowKey = isSimulationRunPage || isSimulationEventPage ? "simulation_event_id" : isSupplyDocumentPage ? "event_id" : isTripPage ? "event_id" : isLongTermDemandForecastStrategyPage ? "forecast_run_id" : isSupplyDecisionStrategyPage ? "supply_decision_run_id" : isShortTermDemandForecastStrategyPage ? "short_term_forecast_run_id" : isDeploymentDecisionStrategyPage ? "deployment_decision_run_id" : isFleetAllocationStrategyPage ? "fleet_allocation_run_id" : isSupplyDemandBalanceStrategyPage ? "supply_demand_balance_run_id" : isFleetOperationPolicyPage ? "fleet_operation_policy_run_id" : isFleetOperationDispatchStrategyPage ? "fleet_operation_dispatch_run_id" : isRobotaxiTaskPlanningStrategyPage ? "robotaxi_task_planning_run_id" : isTaskDispatchStrategyPage ? "task_dispatch_run_id" : isDemandSimulationStrategyPage ? "demand_simulation_run_id" : isRoutePlanningPage ? "route_planning_run_id" : isPricingPage ? "pricing_strategy_run_id" : isOrderMatchingPage ? "order_matching_run_id" : "event_id";
  useEffect(() => {
    const node = tableSectionRef.current;
    if (!node) return undefined;
    const updateTableBodyHeight = () => {
      const paginationHeight = node.querySelector(".ant-pagination")?.getBoundingClientRect().height || 32;
      const nextHeight = Math.max(96, Math.floor(node.clientHeight - paginationHeight - 48));
      setTableBodyHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    };
    updateTableBodyHeight();
    const observer = new ResizeObserver(updateTableBodyHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [eventPanelHeight, hasEventPanel, page, rows.length]);

  const tableScrollY = tableBodyHeight;
  const eventTableScrollY = Math.max(80, eventPanelHeight - 44);
  const tableScrollX = finalColumns.reduce((sum, column) => sum + Number(column.width || 128), 0);
  const eventTableScrollX = eventColumns.reduce((sum, key) => sum + getColumnWidth(key, visibleEventRows), 0);
  const isForecastAnalysisPage = isLongTermDemandForecastPage;
  const showMainTable = isForecastAnalysisPage || isOperatingModelPage || isDecisionCenterPage ? false : (!isMetricAnalysisPage || metricTableVisible);

  useEffect(() => {
    if (isMetricAnalysisPage) setMetricTableVisible(false);
  }, [isMetricAnalysisPage, page]);

  const pageClassName = [
    "record-page-new",
    `page-presentation-${pagePresentation.mode}`,
    pagePresentation.mode === "analysis" ? "analytical-workspace" : "",
    isReadinessPage ? "readiness-page" : "",
    isOperatingModelPage ? "operating-model-page" : "",
    isDecisionCenterPage ? "decision-center-page" : "",
    isMetricAnalysisPage ? "metric-analysis-page" : "",
    isForecastAnalysisPage ? "forecast-analysis-page" : "",
  ].filter(Boolean).join(" ");

  return (
    <section
      className={pageClassName}
      data-page={page}
      data-page-mode={pageArchitecture.mode}
      data-resource-kind={pageArchitecture.resourceKind}
      data-detail-mode={pageArchitecture.detailMode}
    >
      {isRobotaxiPage && (
        <RobotaxiOperationPanel
          rows={displayRows}
          selectedRow={selected?.type === objectType ? displayRows.find((row) => row[idField] === selected.id) : null}
          actionMap={robotaxiOperationActionMap}
          onSelect={(row) => onSelect(objectType, row[idField])}
        />
      )}
      {pagePresentation.mode !== "analysis" && statusOptions.length > 0 && (
        <div className="status-segment-bar">
          <Button
            size="small"
            type={!appliedFilters.statusValue ? "primary" : "default"}
            onClick={() => applyStatusFilter(null)}
          >
            全部 {rows.length}
          </Button>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              size="small"
              type={appliedFilters.statusValue === option.value ? "primary" : "default"}
              onClick={() => applyStatusFilter(option.value)}
            >
              {option.label} {option.count}
            </Button>
          ))}
        </div>
      )}
      {pagePresentation.mode !== "analysis" && (
      <div className="list-filter-bar">
        <div className="filter-field keyword-field">
          <span>关键词</span>
          <Input
            size="small"
            placeholder={isReadinessPage ? "任务编号 / Robotaxi / 作业人员" : "输入关键词"}
            value={filters.keyword}
            onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })}
          />
        </div>
        {statusField && (
          <div className="filter-field">
            <span>状态</span>
            <Select
              size="small"
              placeholder="全部状态"
              allowClear
              getPopupContainer={() => document.body}
              listHeight={280}
              value={filters.statusValue}
              onChange={(value) => updateFilters({ ...filters, statusValue: value || null })}
              options={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
            />
          </div>
        )}
        {isReadinessPage && (
          <div className="filter-field">
            <span>触发方式</span>
            <Select
              size="small"
              placeholder="全部方式"
              allowClear
              getPopupContainer={() => document.body}
              listHeight={240}
              value={filters.triggerType}
              onChange={(value) => updateFilters({ ...filters, triggerType: value || null })}
              options={triggerTypeOptions.map((value) => ({ value, label: getDisplayValue(value) }))}
            />
          </div>
        )}
        {isTimedOperationPage && (
          <div className="filter-field">
            <span>业务单类型</span>
            <Select
              size="small"
              placeholder="全部类型"
              allowClear
              getPopupContainer={() => document.body}
              listHeight={240}
              value={filters.objectType}
              onChange={(value) => updateFilters({ ...filters, objectType: value || null })}
              options={timedOperationObjectTypeOptions.map((value) => ({ value, label: getDisplayValue(value, "object_type") }))}
            />
          </div>
        )}
        <Button size="small" type="primary" aria-label="查询" onClick={() => applyFilters(filters)}>查询</Button>
        <Button size="small" aria-label="重置" onClick={resetFilters}>重置</Button>
      </div>
      )}
      {isReadinessPage && (
        <>
          <div className="list-action-bar">
            <Button size="small" type="primary" onClick={actions.createManualTask}>生成准入任务</Button>
            <Button size="small" onClick={actions.runAutoReadinessCheck}>启动自动准入检查</Button>
          </div>
        </>
      )}
      {isDeploymentPage && (
        <div className="list-action-bar">
          <Button size="small" type="primary" onClick={actions.createDeploymentTasks}>生成投放任务</Button>
        </div>
      )}
      {isFleetOperationTaskPage && (
        <div className="list-action-bar">
          <Button size="small" type="primary" onClick={() => actions.runFleetOperationPolicyForPage(page)}>
            {getFleetOperationTaskActionLabel(page)}
          </Button>
        </div>
      )}
      {isRobotaxiDeliveryOrderPage && (
        <div className="list-action-bar">
          <Button size="small" type="primary" onClick={actions.createRegionDeliveryOrder}>创建区域交付</Button>
        </div>
      )}
      {isServiceOrderPage && (
        <div className="list-action-bar">
          <Button size="small" type="primary" onClick={() => actions.createServiceOrderFromDemand("OWN_APP_SIMULATED_ORDER")}>创建自有平台服务订单</Button>
          <Button size="small" onClick={() => actions.createServiceOrderFromDemand("PARTNER_APP_SIMULATED_ORDER")}>创建外部平台服务订单</Button>
        </div>
      )}
      {isSimulationRunPage && (
        <div className="list-action-bar">
          <Button size="small" type="primary" onClick={() => actions.simActions?.createSimulationRun()}>创建模拟运行</Button>
          <Button size="small" onClick={actions.clearSimulationEvents}>清空模拟事件</Button>
        </div>
      )}
      {isTimedOperationPage && (
        <div className="list-action-bar">
          <Button size="small" onClick={actions.clearEndedTimedOperations}>清空已结束作业</Button>
          <Button size="small" danger onClick={actions.requestClearAllTimedOperations}>清空全部作业</Button>
        </div>
      )}
      {isMetricAnalysisPage && (
        <div className="list-action-bar metric-period-actions">
          <span>统计周期</span>
          <Select
            size="small"
            value={actions.metricPeriodType}
            onChange={actions.setMetricPeriodType}
            getPopupContainer={() => document.body}
            options={metricPeriodOptions}
          />
          <Button size="small" type="primary" onClick={() => actions.refreshOperatingMetrics(actions.metricPeriodType)} disabled={actions.metricCalculationInProgress}>
            {actions.metricCalculationInProgress ? "数据更新中" : "更新经营数据"}
          </Button>
          <span className="metric-data-pool-state">{formatOperatingDataPoolState(actions.metricCalculationRuns, actions.metricPeriodType)}</span>
        </div>
      )}
      {isForecastAnalysisPage && (
        <AnalysisContentViewport>
          <ForecastAnalysisPanel
            rows={displayRows}
            selectedId={selected?.type === objectType ? selected.id : null}
            onSelect={(row) => onSelect(objectType, row[idField])}
            onCreateSupplyPlan={actions.createSupplyPlanFromForecast}
          />
        </AnalysisContentViewport>
      )}
      {isOperatingModelPage && (
        <AnalysisContentViewport>
          <OperatingModelPanel model={displayRows[0] || operatingModelService.getOperatingModelDefinition()} />
        </AnalysisContentViewport>
      )}
      {isDecisionCenterPage && (
        <AnalysisContentViewport>
          <DecisionCenterPanel view={actions.decisionControlView} onNavigate={actions.navigateToPage} />
        </AnalysisContentViewport>
      )}
      {isMetricAnalysisPage && (
        <AnalysisContentViewport>
          <MetricExperiencePanel
            page={page}
            rows={displayRows}
            allRows={actions.metricDisplayRows || rows}
            metricCalculationRuns={actions.metricCalculationRuns}
            metricPeriodType={actions.metricPeriodType}
            planningBaseline={actions.operatingDataPool?.planningBaseline}
            comparisons={actions.operatingDataPool?.comparisons}
            analysisModel={actions.operatingDataPool?.analysisModels?.[page]}
            onSelect={(row) => onSelect(objectType, row[idField])}
          />
        </AnalysisContentViewport>
      )}
      {isMetricAnalysisPage && (
        <div className="metric-table-disclosure">
          <div>
            <span>指标明细表</span>
            <small>用于核对计算结果和来源记录，默认收起以保留经营分析阅读空间。</small>
          </div>
          <Button size="small" onClick={() => setMetricTableVisible((visible) => !visible)}>
            {metricTableVisible ? "收起明细表" : "查看明细表"}
          </Button>
        </div>
      )}
      {showMainTable && (
      <div className="record-table-section" ref={tableSectionRef}>
        <Table
          size="small"
          rowKey={idField}
          columns={finalColumns}
          dataSource={displayRows}
          pagination={{ current: currentPage, pageSize, size: "small", showSizeChanger: false }}
          scroll={{ x: tableScrollX, y: tableScrollY }}
          tableLayout="auto"
          rowClassName={(row) => selected?.type === objectType && selected?.id === row[idField] ? "active-table-row" : ""}
          onRow={(row) => ({ onClick: () => onSelect(objectType, row[idField]) })}
          onChange={(pagination) => updatePagination(pagination.current)}
        />
      </div>
      )}
      {hasEventPanel && (
        <div className="event-log-section" style={{ height: eventPanelHeight }}>
          <div className="event-log-resizer" onPointerDown={handleEventResizeStart} title="拖动调整事件区高度" />
          <div className="event-log-title">{pageArchitecture.eventPanel.label}</div>
          <Table
            size="small"
            rowKey={eventRowKey}
            columns={eventColumns.map((key) => ({
              key,
              title: getFieldLabel(key),
              dataIndex: key,
              ellipsis: false,
              width: getColumnWidth(key, visibleEventRows),
              render: (_, row) => renderCellValue(key, row),
            }))}
            dataSource={visibleEventRows}
            pagination={false}
            scroll={{ x: eventTableScrollX, y: eventTableScrollY }}
            tableLayout="auto"
          />
        </div>
      )}
      {!isForecastAnalysisPage && !isOperatingModelPage && !isDecisionCenterPage && <ModuleFooter
        page={page}
        totalCount={rows.length}
        displayCount={displayRows.length}
        eventCount={hasEventPanel ? eventRows?.length || 0 : null}
        appliedFilters={appliedFilters}
      />}
      {isReadinessPage && (
        <Modal
          title="提交异常检查结果"
          open={Boolean(abnormalTask)}
          okText="确认异常"
          cancelText="取消"
          width={520}
          onOk={confirmAbnormalResult}
          onCancel={() => setAbnormalTask(null)}
        >
          <div className="abnormal-modal-body">
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="任务编号">{abnormalTask?.task_id || "无"}</Descriptions.Item>
              <Descriptions.Item label="Robotaxi 编号">{abnormalTask?.robotaxi_id || "无"}</Descriptions.Item>
              <Descriptions.Item label="作业人员编号">{abnormalTask?.worker_id || "无"}</Descriptions.Item>
            </Descriptions>
            <div className="abnormal-field">
              <span>异常类型</span>
              <Select
                size="small"
                value={abnormalIssueType}
                getPopupContainer={() => document.body}
                listHeight={280}
                onChange={setAbnormalIssueType}
                options={Object.values(taskTypes.IssueType)
                  .filter((value) => value !== taskTypes.IssueType.NONE)
                  .map((value) => ({ value, label: getDisplayValue(value) }))}
              />
            </div>
          </div>
        </Modal>
      )}
      {isRouteExecutionPage && (
        <Modal
          title="提交异常到达"
          open={Boolean(abnormalArrivalExecution)}
          okText="确认异常到达"
          cancelText="取消"
          width={620}
          onOk={confirmAbnormalArrival}
          onCancel={() => setAbnormalArrivalExecution(null)}
        >
          {renderAbnormalArrivalModalBody(abnormalArrivalExecution, actions.data, abnormalArrivalType, setAbnormalArrivalType)}
        </Modal>
      )}
    </section>
  );

  function getActionColumn() {
    if (isReadinessPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 240,
        render: (_, row) => renderActionCell(row, renderReadinessActions(row, { ...actions, openAbnormalModal: openAbnormalModal, page, objectType, idField })),
      };
    }
    if (isDeploymentPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderActionCell(row, renderDeploymentActions(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isRouteExecutionPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderActionCell(row, renderRouteExecutionActions(row, { ...actions, openAbnormalArrivalModal, page, objectType, idField })),
      };
    }
    if (isRoutePlanningRunPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 180,
        render: (_, row) => renderActionCell(row, renderRoutePlanningRunActions(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isServiceOrderPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 150,
        render: (_, row) => renderActionCell(row, renderServiceOrderActions(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isTripPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 150,
        render: (_, row) => renderActionCell(row, renderTripActions(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isPricingRunPage || isOrderMatchingRunPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, renderViewDetailAction(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isSimulationRunPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 470,
        render: (_, row) => renderActionCell(row, renderSimulationRunActions(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isWorkflowTimingRulePage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 96,
        render: (_, row) => renderActionCell(row, row.duration_source_type === "INHERITED"
          ? renderViewDetailAction(row, { ...actions, page, objectType, idField })
          : <RowActionButton onClick={() => actions.editWorkflowTimingRule(row)}>配置时长</RowActionButton>),
      };
    }
    if (isCostParameterRulePage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 96,
        render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.editCostParameterRule(row)}>配置</RowActionButton>),
      };
    }
    if (isDemandProfilePage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.editDemandProfile(row)}>配置</RowActionButton>),
      };
    }
    if (isBusinessTargetPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.editBusinessTarget(row)}>配置</RowActionButton>),
      };
    }
    if (isSupplyProductionProfilePage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.editSupplyProductionProfile(row)}>配置</RowActionButton>),
      };
    }
    if (isLongTermDemandForecastStrategyPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, (
          <RowActionGroup>
            <RowActionButton onClick={() => actions.runLongTermDemandForecastStrategy(row)}>执行</RowActionButton>
            <RowActionButton type="default" onClick={() => actions.editLongTermDemandForecastStrategy(row)}>配置</RowActionButton>
          </RowActionGroup>
        )),
      };
    }
    if (isSupplyDecisionStrategyPage) {
      return { key: "actions", title: "操作", fixed: "right", width: 120, render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.runSupplyDecisionStrategy(row)}>执行</RowActionButton>) };
    }
    if (isShortTermDemandForecastStrategyPage) {
      return { key: "actions", title: "操作", fixed: "right", width: 120, render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.runShortTermDemandForecastStrategy(row)}>执行</RowActionButton>) };
    }
    if (isDeploymentDecisionStrategyPage) {
      return { key: "actions", title: "操作", fixed: "right", width: 120, render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.runDeploymentDecisionStrategy(row)}>执行</RowActionButton>) };
    }
    if (isDeploymentPlanPage) {
      return {
        key: "actions", title: "操作", fixed: "right", width: 180,
        render: (_, row) => renderActionCell(row, <RowActionGroup>
          {row.plan_status === "DRAFT" && <RowActionButton onClick={() => actions.confirmDeploymentPlan(row)}>确认计划</RowActionButton>}
          {row.plan_status === "CONFIRMED" && <RowActionButton onClick={() => actions.dispatchDeploymentPlan(row)}>生成投放任务</RowActionButton>}
          {row.plan_status === "PARTIALLY_DISPATCHED" && <RowActionButton onClick={() => actions.dispatchDeploymentPlan(row)}>继续生成任务</RowActionButton>}
          {!["CANCELLED", "PARTIALLY_DISPATCHED", "DISPATCHED"].includes(row.plan_status) && <RowActionButton type="default" onClick={() => actions.cancelDeploymentPlan(row)}>取消</RowActionButton>}
        </RowActionGroup>),
      };
    }
    if (isSupplyPlanPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 260,
        render: (_, row) => renderActionCell(row, renderSupplyPlanActions(row, actions)),
      };
    }
    if (isProductionBatchPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderActionCell(row, renderProductionBatchActions(row, actions)),
      };
    }
    if (isFleetAllocationStrategyPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.runFleetAllocationStrategy(row)}>执行</RowActionButton>),
      };
    }
    if (isSupplyDemandBalanceStrategyPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 120,
        render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.runSupplyDemandBalanceStrategy(row)}>执行</RowActionButton>),
      };
    }
    if (isFleetAllocationResultPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 150,
        render: (_, row) => renderActionCell(row, <RowActionButton onClick={() => actions.createDeliveryOrderFromAllocationResult(row)}>生成交付单</RowActionButton>),
      };
    }
    if (isRobotaxiDeliveryOrderPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderActionCell(row, renderRobotaxiDeliveryOrderActions(row, actions)),
      };
    }
    if (isRobotaxiPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 320,
        render: (_, row) => renderActionCell(row, renderRobotaxiFleetOperationActions(row, { ...actions, page, objectType, idField, robotaxiOperationActionMap })),
      };
    }
    if (isFleetOperationTaskPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 150,
        render: (_, row) => renderActionCell(row, renderFleetOperationTaskActions(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isRouteExecutionPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 260,
        render: (_, row) => renderActionCell(row, renderRouteExecutionActions(row, { ...actions, page, objectType, idField })),
      };
    }
    if (isFleetOperationPolicyPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 150,
        render: (_, row) => renderActionCell(row, renderFleetOperationPolicyActions(row, { ...actions, page, objectType, idField })),
      };
    }
    return null;
  }

  function renderActionCell(_row, actionContent) {
    return (
      <span className="row-action-cell" onClick={(event) => event.stopPropagation()}>
        {actionContent}
      </span>
    );
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
    const nextFilters = { ...defaultPageFilters, statusValue };
    onUiStateChange(createNextPageUiState(uiState, { filters: nextFilters, appliedFilters: nextFilters, pagination: { current: 1 } }));
  }

  function resetFilters() {
    const resetValue = { ...defaultPageFilters };
    onUiStateChange(createNextPageUiState(uiState, { filters: resetValue, appliedFilters: resetValue, pagination: { current: 1 } }));
  }

  function updateFilters(nextFilters) {
    onUiStateChange(createNextPageUiState(uiState, { filters: nextFilters }));
  }

  function applyFilters(nextFilters) {
    onUiStateChange(createNextPageUiState(uiState, { filters: nextFilters, appliedFilters: nextFilters, pagination: { current: 1 } }));
  }

  function updatePagination(current) {
    onUiStateChange(createNextPageUiState(uiState, { pagination: { current: current || 1 } }));
  }

  function handleEventResizeStart(event) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = eventPanelHeight;
    const handleMove = (moveEvent) => {
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

function ModuleFooter({ page, totalCount, displayCount, eventCount, appliedFilters }) {
  const hasFilter = appliedFilters && (
    appliedFilters.keyword ||
    appliedFilters.statusValue ||
    appliedFilters.triggerType
  );
  if (["readinessTasks", "deploymentTasks", "routeExecutions", "serviceFulfillmentRecords", "routePlanningStrategies", "routePlanningRuns", "demandSimulationStrategies", "serviceOrders"].includes(page)) {
    return (
      <div className="module-footer">
        <span>当前显示 {displayCount} / 全部 {totalCount}</span>
        {eventCount !== null && <span>事件 {eventCount}</span>}
        <span>{hasFilter ? "已应用筛选条件" : "未应用筛选"}</span>
      </div>
    );
  }

  return (
    <div className="module-footer">
      <span>当前显示 {displayCount} / 全部 {totalCount}</span>
      <span>{hasFilter ? "已应用筛选条件" : "未应用筛选"}</span>
      <span>点击表格行可在右侧查看详情</span>
    </div>
  );
}

function createTripEventRows(trips = []) {
  return trips.flatMap((trip) => (Array.isArray(trip.event_log) ? trip.event_log : []).map((event, index) => ({
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
    next_status: event.next_status || null,
  }))).sort((left, right) => String(right.event_time || "").localeCompare(String(left.event_time || "")));
}

function createServiceOrderEventRows(eventLogs = [], serviceOrders = []) {
  const visibleOrderIds = new Set(serviceOrders.map((order) => order.service_order_id).filter(Boolean));
  return (eventLogs || [])
    .filter((event) => event.service_order_id && (visibleOrderIds.size === 0 || visibleOrderIds.has(event.service_order_id)))
    .sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

function createFleetTaskEventRows(eventLogs = [], tasks = [], page = null) {
  const visibleTaskIds = new Set(tasks.map((task) => task.task_id).filter(Boolean));
  return (eventLogs || [])
    .filter((event) => {
      if (visibleTaskIds.size > 0) return event.task_id && visibleTaskIds.has(event.task_id);
      return page && event.source_page === page;
    })
    .sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
}

function createRecordOperationEventRows(eventLogs = [], rows = [], objectType, idField, page = null) {
  const visibleIds = new Set(rows.map((row) => row[idField]).filter(Boolean));
  return (eventLogs || [])
    .filter((event) => {
      if (page && event.source_page !== page) return false;
      if (event.business_object_type && event.business_object_type !== objectType) return false;
      if (visibleIds.size === 0) return true;
      return event.business_object_id && visibleIds.has(event.business_object_id);
    })
    .map((event) => ({
      event_id: event.event_id,
      occurred_at: event.created_at || event.occurred_at,
      business_object_type: event.business_object_type || objectType,
      business_object_id: event.business_object_id || null,
      action_type: event.action_type || event.event_type,
      result_type: event.result_type || event.event_result,
      message: event.message,
      from_status: event.from_status || null,
      to_status: event.to_status || null,
    }))
    .sort((left, right) => String(right.occurred_at || "").localeCompare(String(left.occurred_at || "")));
}

function createDocumentEventRows(rows = [], objectType, idField, eventLogs = [], page = null) {
  return [
    ...createLifecycleEventRows(rows, objectType, idField),
    ...createRecordOperationEventRows(eventLogs, rows, objectType, idField, page),
  ].sort((left, right) => String(right.occurred_at || "").localeCompare(String(left.occurred_at || "")));
}

function createLifecycleEventRows(rows = [], objectType, idField) {
  return (rows || []).flatMap((row) => {
    const history = Array.isArray(row.simulation_status_transition_history) ? row.simulation_status_transition_history : [];
    return history.map((transition, index) => ({
      event_id: `${row[idField] || objectType}-${transition.status_transition_id || index + 1}`,
      occurred_at: transition.occurred_at || row.updated_at || row.created_at,
      business_object_type: transition.business_object_type || objectType,
      business_object_id: transition.business_object_id || row[idField],
      action_type: transition.action_type,
      result_type: transition.result_type,
      from_status: transition.from_status,
      to_status: transition.to_status,
    }));
  }).sort((left, right) => String(right.occurred_at || "").localeCompare(String(left.occurred_at || "")));
}

function createFleetOperationPolicyRunRows(policyRuns = [], policies = []) {
  const visiblePolicyIds = new Set(policies.map((policy) => policy.fleet_operation_policy_id).filter(Boolean));
  return (policyRuns || [])
    .filter((run) => run.fleet_operation_policy_id && (visiblePolicyIds.size === 0 || visiblePolicyIds.has(run.fleet_operation_policy_id)))
    .sort((left, right) => String(right.started_at || right.created_at || "").localeCompare(String(left.started_at || left.created_at || "")));
}

function createStrategyRunRows(runs = [], strategies = [], strategyIdField) {
  const visibleStrategyIds = new Set((strategies || []).map((strategy) => strategy[strategyIdField]).filter(Boolean));
  return (runs || [])
    .filter((run) => run[strategyIdField] && (visibleStrategyIds.size === 0 || visibleStrategyIds.has(run[strategyIdField])))
    .sort((left, right) => String(right.started_at || right.created_at || "").localeCompare(String(left.started_at || left.created_at || "")));
}

function getFleetOperationTaskActionLabel(page) {
  const labels = {
    cleaningTasks: "生成清洁任务",
    chargingTasks: "生成充电任务",
    maintenanceTasks: "生成维修任务",
    failureHandlingTasks: "生成故障处理任务",
    retirementTasks: "生成退役任务",
  };
  return labels[page] || "生成运维任务";
}

function createTripEventMessage(event, trip) {
  const typeText = getDisplayValue(event.event_type || "TRIP_STATUS_CHANGED");
  const resultText = getDisplayValue(event.event_result || "SUCCESS");
  const nextStatusText = event.next_status ? getDisplayValue(event.next_status) : null;
  const routeText = event.route_id ? `路径 ${event.route_id}` : trip.route_id ? `路径 ${trip.route_id}` : "未生成路径";
  return nextStatusText
    ? `${typeText}，结果${resultText}，状态更新为${nextStatusText}，${routeText}`
    : `${typeText}，结果${resultText}，${routeText}`;
}

function DetailPanel({ selectedObject, selectedType, onCollapse }) {
  if (!selectedObject) {
    return (
      <section className="detail-panel-new">
        <div className="panel-title">
          <span>{getDetailTitle(selectedType)}</span>
          <Button className="detail-toggle-button" size="small" type="text" aria-label="隐藏详情" onClick={onCollapse}>›</Button>
        </div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择对象查看详情" />
      </section>
    );
  }

  return (
    <section className="detail-panel-new object-inspector">
      <div className="panel-title">
        <span>{getDetailTitle(selectedType)}</span>
        <Button className="detail-toggle-button" size="small" type="text" aria-label="隐藏详情" onClick={onCollapse}>›</Button>
      </div>
      {selectedType === "robotaxi" && <RobotaxiObjectSummary robotaxi={selectedObject} />}
      <TabbedDetail selectedObject={selectedObject} selectedType={selectedType} />
    </section>
  );
}

function DetailContentViewport({ children, className = "" }) {
  return <div className={`object-inspector-content ${className}`.trim()}>{children}</div>;
}

function AnalysisContentViewport({ children, className = "" }) {
  return <div className={`analysis-content-viewport ${className}`.trim()}>{children}</div>;
}

function RobotaxiObjectSummary({ robotaxi }) {
  const currentTask = robotaxi.current_task_type
    ? `${getDisplayValue(robotaxi.current_task_type)}${robotaxi.current_task_id ? ` · ${robotaxi.current_task_id}` : ""}`
    : "空闲";
  const nextTask = robotaxi.pending_task_queue?.[0];
  const nextTaskText = nextTask
    ? `${getDisplayValue(nextTask.task_type || nextTask.business_object_type)}${nextTask.task_id ? ` · ${nextTask.task_id}` : ""}`
    : "暂无排队任务";
  return (
    <section className="object-inspector-summary" aria-label={`${robotaxi.robotaxi_id} 运营摘要`}>
      <div className="object-inspector-identity">
        <div>
          <strong>{robotaxi.robotaxi_id}</strong>
          <span>{getDisplayValue(robotaxi.availability_status)} · {getDisplayValue(robotaxi.motion_status)}</span>
        </div>
        <span className="object-inspector-battery">{Number(robotaxi.battery_percent || 0).toFixed(0)}%</span>
      </div>
      <dl className="object-inspector-facts">
        <div><dt>当前位置</dt><dd>{robotaxi.location_summary || robotaxi.current_cell_id || "暂无位置"}</dd></div>
        <div><dt>当前任务</dt><dd>{currentTask}</dd></div>
        <div><dt>下一任务</dt><dd>{nextTaskText}</dd></div>
      </dl>
    </section>
  );
}

function TabbedDetail({ selectedObject, selectedType }) {
  const tabs = getDetailTabs(selectedType, selectedObject);
  const tabKeys = tabs.map((tab) => tab.key).join("|");
  const [activeTabKey, setActiveTabKey] = useState(tabs[0]?.key);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTabKey)) {
      setActiveTabKey(tabs[0]?.key);
    }
  }, [activeTabKey, tabKeys]);

  return (
    <div className="detail-tabs-control">
      <div className="detail-tabs-scroll" role="tablist" aria-label="详情分类">
        {tabs.map((tab) => (
          <button
            className={`detail-tab-button${activeTabKey === tab.key ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTabKey === tab.key}
            key={tab.key}
            onClick={() => setActiveTabKey(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Tabs
        className="detail-tabs detail-tabs-content-only"
        size="small"
        activeKey={activeTabKey}
        animated={false}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          children: (
            <DetailContentViewport className="object-inspector-tab-content">
              {tab.explanations ? (
                <PlanningFieldExplanations explanations={tab.explanations} />
              ) : tab.cost ? (
                <CostDetail selectedObject={selectedObject} />
              ) : tab.timeline ? (
                <StatusTimeline history={selectedObject.simulation_status_transition_history} statusField={getDetailStatusField(selectedType)} row={selectedObject} />
              ) : (
                <DetailFieldContent selectedObject={selectedObject} keys={tab.keys} />
              )}
            </DetailContentViewport>
          ),
        }))}
      />
    </div>
  );
}

function DetailFieldContent({ selectedObject, keys }) {
  const visibleKeys = (keys || []).filter((key) => selectedObject[key] !== undefined);
  const simpleKeys = visibleKeys.filter((key) => !isComplexDetailField(key, selectedObject[key]));
  const complexKeys = visibleKeys.filter((key) => isComplexDetailField(key, selectedObject[key]));

  return (
    <div className="object-inspector-fields">
      {simpleKeys.length > 0 && (
        <Descriptions
          className="compact-descriptions"
          column={1}
          size="small"
          colon={false}
          items={simpleKeys.map((key) => ({
            key,
            label: getFieldLabel(key),
            children: renderDetailValue(key, selectedObject[key], selectedObject),
          }))}
        />
      )}
      {complexKeys.length > 0 && (
        <div className="detail-block-list">
          {complexKeys.map((key) => (
            <section className="detail-block" key={key}>
              <div className="detail-block-label">{getFieldLabel(key)}</div>
              <div className="detail-block-content">{renderDetailValue(key, selectedObject[key], selectedObject)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function isComplexDetailField(key, value) {
  if (["profile_field_explanations", "profile_calculation_steps", "route_steps", "route_links_detail", "pending_task_queue"].includes(key)) return true;
  return Array.isArray(value) || Boolean(value && typeof value === "object");
}

function getDetailTabs(selectedType, selectedObject) {
  const planningSchema = businessPlanningService?.businessPlanningObjectSchemas?.[selectedType];
  if (planningSchema) {
    return [
      ...planningSchema.tabs.map((tab) => ({ ...tab, keys: tab.fields })),
      { key: "explanations", label: "字段解释", explanations: planningSchema.explanations },
    ];
  }
  const metricSchema = metricObjectPresentationService?.metricObjectSchemas?.[selectedType];
  if (metricSchema) {
    return [
      ...metricSchema.tabs.map((tab) => ({ ...tab, keys: tab.fields })),
      { key: "explanations", label: "字段解释", explanations: metricSchema.explanations },
    ];
  }
  if (selectedType === "robotaxi") {
    return [
      { key: "basic", label: "基础信息", keys: ["robotaxi_id", "fleet_id", "model_name", "automation_level", "availability_status", "operation_blocking_reason", "motion_status"] },
      { key: "asset", label: "资产事实", keys: ["max_range_km", "battery_capacity_kwh", "current_battery_kwh", "battery_percent", "estimated_range_km", "lifetime_distance_km", "lifetime_battery_consumed_kwh", "lifetime_charged_energy_kwh", "completed_service_order_count", "completed_cleaning_count", "completed_charging_count", "completed_maintenance_count"] },
      { key: "task", label: "任务状态", keys: ["current_task_id", "current_task_type", "current_task_status", "current_order_id", "current_order_status", "current_route_id", "pending_task_queue", "pending_fleet_task_type", "pending_fleet_task_id"] },
      { key: "location", label: "位置上下文", keys: ["current_cell_id", "location_summary", "location_context"] },
      { key: "execution", label: "行驶记录", keys: ["current_route_execution_id", "current_execution_status", "current_route_step"] },
    ];
  }
  if (selectedType === "worker") {
    return [
      { key: "basic", label: "基础信息", keys: ["worker_id", "ops_center_id", "worker_name", "worker_role", "worker_status"] },
      { key: "task", label: "任务状态", keys: ["current_task_id", "current_task_type", "current_task_status"] },
      { key: "capacity", label: "作业能力", keys: ["time_per_robotaxi", "max_robotaxi_per_day"] },
    ];
  }
  if (selectedType === "route") {
    return [
      { key: "basic", label: "路径信息", keys: ["route_id", "route_version", "route_usage_type", "route_status", "failure_reason", "route_strategy_id", "route_planning_run_id"] },
      { key: "relation", label: "业务关联", keys: ["task_id", "service_order_id", "trip_id", "route_execution_id", "robotaxi_id"] },
      { key: "location", label: "起终点", keys: ["origin_cell_id", "target_cell_id", "start_cell_id", "end_cell_id"] },
      { key: "steps", label: "路径步骤", keys: ["road_segment_sequence", "route_segments", "route_step_count", "route_steps"] },
      { key: "metrics", label: "路径指标", keys: ["total_distance_m", "related_service_area_ids"] },
    ];
  }
  if (selectedType === "demandProfile") {
    return getDemandProfileDetailTabs(selectedObject);
  }
  if (selectedType === "readinessTask") {
    return [
      { key: "basic", label: "任务信息", keys: ["task_id", "task_type", "task_status", "task_priority", "trigger_type", "source_type", "robotaxi_id", "worker_id", "check_result", "issue_type"] },
      { key: "time", label: "时间与来源", keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason"] },
      { key: "cost", label: "成本", cost: true, keys: [] },
      { key: "timeline", label: "状态时间线", timeline: true, keys: [] },
    ];
  }
  if (selectedType === "deploymentTask") {
    return [
      { key: "basic", label: "任务信息", keys: ["task_id", "task_type", "task_status", "task_priority", "trigger_type", "source_type", "robotaxi_id"] },
      { key: "route", label: "路径信息", keys: ["route_id", "route_strategy_id", "route_summary", "route_detail"] },
      { key: "arrival", label: "到达处理", keys: ["arrival_behavior", "blocked_handling_policy", "arrival_execution_result", "actual_target_cell_id", "actual_target_service_area_id"] },
      { key: "location", label: "目标位置", keys: ["origin_cell_id", "origin_location_summary", "origin_location_detail", "planned_target_cell_id", "planned_target_service_area_id", "target_cell_id", "target_location_summary", "target_location_detail", "target_service_area_id", "actual_target_cell_id", "actual_target_service_area_id", "target_zone_id"] },
      { key: "rebalance", label: "再平衡", keys: ["deployment_target_model", "rebalance_reason", "service_area_vehicle_count", "estimated_distance_steps"] },
      { key: "time", label: "时间与来源", keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason"] },
      { key: "cost", label: "成本", cost: true, keys: [] },
      { key: "timeline", label: "状态时间线", timeline: true, keys: [] },
    ];
  }
  if (["cleaningTask", "chargingTask", "maintenanceTask", "failureHandlingTask", "retirementTask"].includes(selectedType)) {
    return [
      { key: "basic", label: "任务信息", keys: ["task_id", "task_type", "task_status", "task_priority", "trigger_type", "trigger_source", "trigger_object_type", "trigger_object_id", "fleet_operation_policy_run_id", "robotaxi_id"] },
      { key: "location", label: "位置与行驶", keys: ["robotaxi_current_cell_id", "robotaxi_current_location_summary", "robotaxi_current_location_detail", "origin_cell_id", "origin_location_summary", "origin_location_detail", "target_ops_center_id", "target_cell_id", "target_location_summary", "target_location_detail", "route_execution_id", "route_id", "route_strategy_id"] },
      { key: "work", label: "作业信息", keys: ["worker_id", "charger_id", "maintenance_type", "clean_level_before", "clean_level_after", "robotaxi_current_battery_kwh", "robotaxi_battery_capacity_kwh", "charged_energy_kwh", "battery_percent_before", "target_battery_percent", "battery_percent_after", "failure_type", "failure_severity", "diagnosis_result", "disposition_result", "repair_result", "requires_readiness_check", "retirement_reason", "approval_status", "asset_exit_result"] },
      { key: "time", label: "时间与来源", keys: ["pending_since_at", "operation_created_at", "created_at", "started_at", "work_started_at", "charging_started_at", "charging_completed_at", "operation_completed_at", "completed_at", "simulation_created_at", "simulation_completed_at", "failure_reason"] },
      { key: "cost", label: "成本", cost: true, keys: [] },
      { key: "timeline", label: "状态时间线", timeline: true, keys: [] },
    ];
  }
  if (selectedType === "routeExecution") {
    return [
      { key: "basic", label: "行驶信息", keys: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id", "arrival_execution_result"] },
      { key: "location", label: "位置信息", keys: ["origin_cell_id", "origin_location_summary", "planned_target_cell_id", "planned_target_service_area_id", "target_cell_id", "target_location_summary", "actual_target_cell_id", "actual_target_service_area_id", "current_cell_id", "current_location_summary"] },
      { key: "progress", label: "行驶进度", keys: ["current_step_index", "total_step_count", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "battery_consumed_kwh", "time_elapsed"] },
      { key: "route", label: "路径信息", keys: ["route_id", "route_strategy_id", "current_target_service_area_id", "route_summary", "route_links_detail"] },
      { key: "time", label: "时间与来源", keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason"] },
      { key: "cost", label: "成本", cost: true, keys: [] },
      { key: "timeline", label: "状态时间线", timeline: true, keys: [] },
    ];
  }
  if (selectedType === "serviceOrder") {
    return [
      { key: "basic", label: "订单信息", keys: ["service_order_id", "order_status", "order_channel", "customer_id", "demand_simulation_result_id", "demand_simulation_run_id", "payment_status"] },
      { key: "location", label: "需求位置", keys: ["customer_origin_location_type", "customer_origin_place_id", "customer_origin_road_segment_id", "customer_origin_cell_id", "pickup_service_area_id", "pickup_cell_id", "dropoff_service_area_id", "dropoff_cell_id"] },
      { key: "pricing", label: "报价结算", keys: ["price_estimation_route_id", "estimated_pricing_decision_id", "final_pricing_decision_id", "quote_base_fare", "quote_distance_unit_price", "quote_time_unit_price", "estimated_distance_km", "estimated_duration_min", "estimated_price", "final_price", "pricing_explanation", "pricing_breakdown_snapshot"] },
      { key: "matching", label: "匹配履约", keys: ["assignment_mode", "assignment_status", "assignment_max_wait_seconds", "assignment_retry_interval_seconds", "assignment_attempt_count", "assignment_elapsed_seconds", "assignment_remaining_seconds", "assignment_deadline_simulation_at", "assignment_last_attempt_simulation_at", "assignment_last_failure_reason", "matched_robotaxi_id", "matched_robotaxi_location_summary", "matched_robotaxi_location_detail", "order_matching_decision_id", "matching_attempt_count", "matching_retry_pending", "next_matching_retry_seconds", "last_matching_failure_reason", "trip_id", "trip_total_distance_km", "trip_total_duration_min", "trip_distance_traveled_km", "trip_distance_remaining_km", "paid_amount"] },
      { key: "time", label: "时间与来源", keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "confirmed_at", "matched_at", "simulation_matched_at", "completed_at", "simulation_completed_at", "cancelled_at", "payment_completed_at", "simulation_payment_completed_at", "failure_reason"] },
      { key: "cost", label: "成本", cost: true, keys: [] },
      { key: "timeline", label: "状态时间线", timeline: true, keys: [] },
    ];
  }
  if (selectedType === "trip") {
    return [
      { key: "basic", label: "履约信息", keys: ["trip_id", "trip_status", "trip_phase", "service_order_id", "robotaxi_id"] },
      { key: "location", label: "位置信息", keys: ["pickup_service_area_id", "pickup_cell_id", "pickup_location_summary", "dropoff_service_area_id", "dropoff_cell_id", "dropoff_location_summary", "current_cell_id", "current_location_summary"] },
      { key: "progress", label: "行驶进度", keys: ["current_step_index", "total_step_count", "total_distance_km", "distance_traveled_km", "distance_remaining_km", "battery_consumed_kwh", "time_elapsed", "arrival_execution_result", "exception_type"] },
      { key: "route", label: "路径信息", keys: ["route_id", "route_planning_run_id", "route_summary", "route_links_detail"] },
      { key: "time", label: "时间与来源", keys: ["created_at", "simulation_created_at", "record_source", "simulation_run_id", "simulation_global_tick", "started_at", "completed_at", "simulation_completed_at", "failure_reason", "event_log"] },
      { key: "cost", label: "成本", cost: true, keys: [] },
      { key: "timeline", label: "状态时间线", timeline: true, keys: [] },
    ];
  }
  if (selectedType === "simulationPolicy") {
    return [
      { key: "basic", label: "策略信息", keys: ["simulation_policy_id", "policy_name", "policy_status", "tick_seconds", "tick_minutes", "simulation_days", "run_speed_level", "simulation_speed_config", "simulation_performance_config", "random_seed", "max_drain_ticks"] },
      { key: "time", label: "时间配置", keys: ["worker_work_start_time", "worker_work_end_time", "robotaxi_operating_start_time", "robotaxi_operating_end_time", "time_period_configs", "time_window_configs"] },
      { key: "demand", label: "需求配置", keys: ["demand_generation_config", "demand_generation_enabled", "demand_generation_mode", "max_orders_per_tick_global", "demand_profiles"] },
      { key: "supply", label: "供给侧配置", keys: ["supply_trigger_config", "supply_trigger_enabled", "readiness_trigger_enabled", "deployment_trigger_enabled", "route_execution_trigger_enabled"] },
      { key: "auto", label: "自动化配置", keys: ["service_order_auto_config", "auto_pricing_enabled", "auto_customer_confirm_enabled", "auto_order_matching_enabled", "auto_trip_creation_enabled", "auto_trip_progress_enabled", "auto_payment_enabled"] },
      { key: "execution", label: "执行配置", keys: ["execution_time_config", "worker_readiness_check_ticks", "passenger_boarding_ticks", "dropoff_and_payment_ticks", "robotaxi_speed_kmh", "default_completion_config", "enable_exception_probability"] },
    ];
  }
  if (selectedType === "simulationRun") {
    return [
      { key: "basic", label: "运行信息", keys: ["simulation_run_id", "simulation_name", "simulation_status", "simulation_policy_id", "simulation_timeline_id", "previous_simulation_run_id", "total_days", "tick_seconds", "tick_minutes", "total_ticks", "simulation_start_at", "planned_simulation_end_at", "simulation_end_at", "simulation_time_world_summary", "created_at"] },
      { key: "progress", label: "运行进度", keys: ["current_day", "current_time", "current_clock_time", "current_day_tick", "current_run_tick", "current_global_tick", "trigger_ticks_completed", "drain_ticks", "max_drain_ticks", "current_time_period", "current_period_type"] },
      { key: "scene", label: "当前场景", keys: ["current_supply_scene", "current_demand_scene", "current_scene_summary", "current_tick_event_summary"] },
      { key: "time", label: "状态时间", keys: ["started_at", "paused_at", "resumed_at", "completed_at", "stopped_at", "failure_reason", "failure_summary", "result_summary"] },
      { key: "cost", label: "成本", keys: ["cost_calculation_status", "cost_calculation_progress_percent", "active_cost_calculation_run_id", "cost_model_profile_id", "cost_model_profile_version", "total_cost_amount", "cost_result_summary", "cost_calculation_errors"] },
      { key: "revenue", label: "收入", keys: ["revenue_calculation_status", "revenue_calculation_progress_percent", "active_revenue_calculation_run_id", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_unreceived_revenue_amount", "revenue_result_summary", "revenue_calculation_errors"] },
      { key: "policy", label: "策略快照", keys: ["simulation_policy_snapshot"] },
    ];
  }
  if (selectedType === "simulationEvent") {
    return [
      { key: "basic", label: "事件信息", keys: ["simulation_event_id", "simulation_run_id", "simulation_day", "simulation_time", "day_tick", "global_tick", "event_type", "event_source", "event_result"] },
      { key: "detail", label: "事件详情", keys: ["related_object_type", "related_object_id", "message", "failure_reason", "skip_reason", "event_payload", "created_at"] },
    ];
  }
  if (selectedType === "timedOperation") {
    return [
      { key: "basic", label: "作业信息", keys: ["timed_operation_id", "operation_status", "operation_type", "time_mode", "object_type", "object_id", "action_type"] },
      { key: "time", label: "时间计算", keys: ["start_seconds", "planned_completed_seconds", "duration_seconds", "elapsed_seconds", "remaining_seconds", "progress_percent", "simulation_started_at", "simulation_planned_completed_at", "simulation_completed_at"] },
      { key: "payload", label: "计算依据", keys: ["operation_payload", "failure_reason", "created_at"] },
    ];
  }
  if (selectedType === "costModelProfile") {
    return [
      { key: "basic", label: "配置信息", keys: ["cost_model_profile_id", "profile_name", "profile_version", "profile_status", "description", "currency_code", "created_at", "updated_at", "activated_at"] },
      { key: "driving", label: "行驶成本", keys: ["distance_cost_per_km", "electricity_price_per_kwh", "energy_consumption_kwh_per_km"] },
      { key: "labor", label: "人力成本", keys: ["worker_cost_per_hour", "worker_cost_per_minute"] },
      { key: "asset", label: "资产折旧", keys: ["robotaxi_purchase_cost", "robotaxi_residual_value", "expected_lifetime_km", "depreciation_method", "fixed_operating_cost_per_day"] },
    ];
  }
  if (selectedType === "costParameterRule") {
    return [
      { key: "basic", label: "配置项", keys: ["cost_parameter_rule_id", "cost_parameter_name", "cost_parameter_key", "cost_parameter_group", "configured_value", "parameter_unit", "cost_parameter_status", "participates_in_calculation", "profile_version"] },
      { key: "profile", label: "配置版本", keys: ["cost_model_profile_id", "profile_name", "profile_version", "currency_code"] },
    ];
  }
  if (selectedType === "costCalculationRun") {
    return [
      { key: "basic", label: "计算信息", keys: ["cost_calculation_run_id", "simulation_run_id", "cost_model_profile_id", "cost_model_profile_version", "calculation_status", "calculation_progress_percent", "started_at", "completed_at"] },
      { key: "result", label: "计算结果", keys: ["processed_object_count", "generated_cost_record_count", "total_cost_amount", "error_count", "calculation_errors"] },
      { key: "snapshot", label: "配置快照", keys: ["cost_model_profile_snapshot"] },
    ];
  }
  if (selectedType === "costRecord") {
    return [
      { key: "basic", label: "成本信息", keys: ["cost_record_id", "simulation_run_id", "cost_calculation_run_id", "cost_model_profile_id", "cost_type", "cost_amount", "currency_code"] },
      { key: "source", label: "业务归因", keys: ["source_object_type", "source_object_id", "related_order_id", "related_trip_id", "related_route_execution_id", "robotaxi_id", "worker_id", "simulation_cost_occurred_at"] },
      { key: "calculation", label: "计算依据", keys: ["quantity", "quantity_unit", "unit_cost", "calculation_formula", "calculation_basis", "created_at"] },
    ];
  }
  if (selectedType === "revenueRecord") {
    return [
      { key: "basic", label: "收入信息", keys: ["revenue_record_id", "simulation_run_id", "revenue_calculation_run_id", "service_order_id", "revenue_type", "revenue_amount", "currency_code"] },
      { key: "source", label: "业务归因", keys: ["customer_id", "robotaxi_id", "revenue_basis_field", "simulation_revenue_occurred_at", "created_at"] },
    ];
  }
  if (selectedType === "revenueCalculationRun") {
    return [
      { key: "basic", label: "生成信息", keys: ["revenue_calculation_run_id", "simulation_run_id", "calculation_status", "calculation_progress_percent", "started_at", "completed_at"] },
      { key: "result", label: "生成结果", keys: ["processed_object_count", "generated_revenue_record_count", "total_receivable_revenue_amount", "total_collected_revenue_amount", "total_unreceived_revenue_amount", "error_count", "calculation_errors"] },
    ];
  }
  return getSemanticDetailTabs(selectedObject);
}

function getSemanticDetailTabs(selectedObject) {
  const keys = Object.keys(selectedObject || {}).filter((key) => selectedObject[key] !== undefined);
  const primaryIdKey = keys.find((key) => key.endsWith("_id"));
  const identityKeys = keys.filter((key) => isIdentityDetailKey(key, primaryIdKey));
  const relationKeys = keys.filter((key) => !identityKeys.includes(key) && isRelationDetailKey(key, selectedObject[key]));
  const businessKeys = keys.filter((key) => !identityKeys.includes(key) && !relationKeys.includes(key));
  return [
    { key: "overview", label: "基本信息", keys: identityKeys },
    { key: "business", label: "业务信息", keys: businessKeys },
    { key: "relation", label: "关联与结构", keys: relationKeys },
  ].filter((tab) => tab.keys.length > 0);
}

function isIdentityDetailKey(key, primaryIdKey) {
  return key === primaryIdKey
    || /(_name|_status|_type|_version)$/.test(key)
    || ["created_at", "updated_at", "started_at", "completed_at"].includes(key);
}

function isRelationDetailKey(key, value) {
  return Array.isArray(value)
    || Boolean(value && typeof value === "object")
    || /(_id|_ids|_snapshot|_sequence|_steps|_rules|_config|_detail)$/.test(key);
}

function PlanningFieldExplanations({ explanations = {} }) {
  return (
    <div className="planning-field-explanations">
      {Object.entries(explanations).map(([field, explanation]) => (
        <section key={field}>
          <strong>{getFieldLabel(field)}</strong>
          <p>{explanation}</p>
        </section>
      ))}
    </div>
  );
}

function getPlanningFieldExplanation(schemaKey, fieldKey) {
  return businessPlanningService?.businessPlanningObjectSchemas?.[schemaKey]?.explanations?.[fieldKey]
    || "该字段参与当前对象的经营规划配置。";
}

function getDemandProfileDetailTabs(profile) {
  const basic = { key: "basic", label: "画像信息", keys: ["profile_id", "profile_name", "target_object_type", "target_object_id", "target_object_name", "profile_version", "profile_status", "effective_from", "effective_to"] };
  if (profile?.target_object_type === "PLACE") {
    return [
      basic,
      { key: "config", label: "需求参数", keys: ["resident_population", "working_population", "daily_visitors", "resident_trip_weight", "worker_trip_weight", "visitor_trip_weight", "trip_generation_rate", "demand_weight", "robotaxi_adoption_rate", "service_acceptance_rate", "competition_retention_rate", "busiest_hour_share"] },
      { key: "growth", label: "增长假设", keys: ["place_period_growth_rate", "growth_rate_unit", "growth_rate_source", "growth_rate_updated_at"] },
      { key: "calculated", label: "自动计算", keys: ["daily_population_exposure", "potential_daily_trips", "baseline_addressable_daily_orders", "baseline_peak_hour_orders", "calculated_at"] },
      { key: "steps", label: "计算过程", keys: ["profile_calculation_steps"] },
      { key: "explanation", label: "字段解释", keys: ["profile_field_explanations"] },
    ];
  }
  if (profile?.target_object_type === "SERVICE_AREA") {
    return [
      basic,
      { key: "config", label: "承载参数", keys: ["parent_place_id", "waiting_robotaxi_capacity", "pickup_position_capacity", "dropoff_position_capacity", "average_service_time_min", "operating_hours_per_day", "accessibility_factor", "capacity_availability_rate"] },
      { key: "calculated", label: "自动计算", keys: ["position_throughput_per_hour", "service_capacity_per_hour", "effective_peak_hour_capacity", "effective_daily_capacity", "calculated_at"] },
      { key: "steps", label: "计算过程", keys: ["profile_calculation_steps"] },
      { key: "explanation", label: "字段解释", keys: ["profile_field_explanations"] },
    ];
  }
  if (profile?.target_object_type === "ZONE") {
    return [
      basic,
      { key: "calculated", label: "自动汇总", keys: ["potential_daily_trips", "baseline_addressable_daily_orders", "baseline_peak_hour_orders", "busiest_hour_share", "zone_period_growth_rate", "growth_rate_unit", "effective_daily_capacity", "effective_peak_hour_capacity", "waiting_robotaxi_capacity", "demand_distribution", "calculated_from_profile_ids", "calculated_at"] },
      { key: "steps", label: "计算过程", keys: ["profile_calculation_steps"] },
      { key: "explanation", label: "字段解释", keys: ["profile_field_explanations"] },
    ];
  }
  return [basic];
}

function getDetailStatusField(selectedType) {
  return {
    readinessTask: "task_status",
    deploymentTask: "task_status",
    cleaningTask: "task_status",
    chargingTask: "task_status",
    maintenanceTask: "task_status",
    failureHandlingTask: "task_status",
    retirementTask: "task_status",
    routeExecution: "execution_status",
    serviceOrder: "order_status",
    trip: "trip_status",
  }[selectedType] || null;
}

function StatusTimeline({ history, statusField, row = null }) {
  if (!Array.isArray(history) || history.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无业务状态时间线" />;
  }
  return (
    <ol className="status-timeline">
      {history.map((item) => (
        <li key={item.status_transition_id}>
          <span className="status-timeline-marker" />
          <div className="status-timeline-content">
            <div className="status-timeline-heading">
              <StatusValue value={item.to_status} label={getFieldDisplayValue(statusField, item.to_status, row)} />
              <Text>{item.simulation_status_changed_at || item.calculated_simulation_status_changed_at}</Text>
            </div>
            <Text type="secondary">{getDisplayValue(item.action_type, "action_type")} · {item.configured_duration_seconds || 0} 秒</Text>
            {item.movement_step_count !== null && item.movement_step_count !== undefined && (
              <Text type="secondary">{item.movement_step_count} Cell × {item.seconds_per_cell || 0} 秒</Text>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function CostDetail({ selectedObject }) {
  const records = Array.isArray(selectedObject.cost_records) ? selectedObject.cost_records : [];
  if (!selectedObject.cost_calculation_run_id && records.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未计算运营成本" />;
  }
  const summaryItems = ["total_cost_amount", "distance_cost_amount", "energy_cost_amount", "labor_cost_amount", "asset_depreciation_cost_amount"];
  const metaItems = ["cost_calculated_at", "cost_calculation_run_id"];
  const groupedRecords = groupCostRecords(records);
  return (
    <div className="cost-detail">
      <div className="cost-summary-grid">
        {summaryItems.map((key) => (
          <div className="cost-summary-item" key={key}>
            <span>{getFieldLabel(key)}</span>
            <strong>{renderDetailValue(key, selectedObject[key], selectedObject)}</strong>
          </div>
        ))}
      </div>
      <Descriptions
        className="compact-descriptions cost-meta-descriptions"
        column={1}
        size="small"
        colon={false}
        items={metaItems.map((key) => ({
          key,
          label: getFieldLabel(key),
          children: renderDetailValue(key, selectedObject[key], selectedObject),
        }))}
      />
      <div className="cost-record-list">
        {groupedRecords.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无成本明细" />
        ) : groupedRecords.map((group) => (
          <section className="cost-record-group" key={group.cost_type}>
            <div className="cost-record-group-head">
              <StatusValue value={group.cost_type} label={getDisplayValue(group.cost_type, "cost_type")} />
              <strong>{formatCostAmount(group.totalAmount, group.currencyCode)}</strong>
            </div>
            {group.records.map((record) => (
              <div className="cost-record-line" key={record.cost_record_id}>
                <div className="cost-record-line-main">
                  <span>{renderDetailValue("source_object_type", record.source_object_type, record)} · {record.source_object_id}</span>
                  <strong>{formatCostAmount(record.cost_amount, record.currency_code)}</strong>
                </div>
                <div className="cost-record-line-sub">
                  <span>{getFieldLabel("quantity")}: {renderDetailValue("quantity", record.quantity, record)} {renderDetailValue("quantity_unit", record.quantity_unit, record)}</span>
                  <span>{getFieldLabel("unit_cost")}: {renderDetailValue("unit_cost", record.unit_cost, record)}</span>
                </div>
                {record.calculation_formula && <Text type="secondary">{record.calculation_formula}</Text>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function groupCostRecords(records) {
  const map = new Map();
  records.forEach((record) => {
    const key = record.cost_type || "UNKNOWN";
    const group = map.get(key) || { cost_type: key, records: [], totalAmount: 0, currencyCode: record.currency_code || "CNY" };
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

function MapCanvas({ data, selected, mobileLayout = false, onSelect, onClear, onBlankCell }) {
  const map = data.maps[0];
  const compactMapViewport = typeof window !== "undefined" && window.matchMedia("(max-width: 560px)").matches;
  const defaultViewport = { zoom: 1, panX: 0, panY: 0 };
  const scene = useMemo(
    () => mapSceneService.createMapScene(data),
    [data.maps, data.zones, data.places, data.serviceAreas, data.roads, data.roadSegments],
  );
  const dragRef = useRef(null);
  const didDragRef = useRef(false);
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const frameRef = useRef(0);
  const [stageSize, setStageSize] = useState({ width: compactMapViewport ? 320 : 960, height: 720 });
  const [viewport, setViewport] = useState(defaultViewport);
  const [hovered, setHovered] = useState(null);
  const [focusedCellId, setFocusedCellId] = useState(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const selectedRobotaxi = selected?.type === "robotaxi"
    ? data.robotaxis?.find((robotaxi) => robotaxi.robotaxi_id === selected.id)
    : null;
  const selectedRouteId = selected?.type === "route" ? selected.id : selectedRobotaxi?.current_route_id;
  const selectedRoute = selectedRouteId
    ? data.routes.find((route) => route.route_id === selectedRouteId)
    : null;
  const highlightedCells = new Set(selectedRoute ? routeCellIds(selectedRoute, data.roadSegments) : []);
  const highlightedRoutePoints = [...highlightedCells].map((cellId) => {
    const { row, col } = parseCellId(cellId);
    return `${col + 0.5},${row + 0.5}`;
  }).join(" ");
  const zoomBand = viewport.zoom >= 2 ? "detail" : viewport.zoom >= 1.25 ? "district" : "network";
  const hoverPresentation = hovered
    ? mapSceneService.getMapObjectPresentation(hovered.type, hovered.id, data)
    : null;
  const camera = useMemo(
    () => createMapCamera(map, stageSize, compactMapViewport),
    [compactMapViewport, map, stageSize],
  );

  useEffect(() => {
    applySceneTransform(viewport);
  }, [viewport]);

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, entry.contentRect.width);
      const height = Math.max(1, entry.contentRect.height);
      setStageSize((current) => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  function applySceneTransform(nextViewport) {
    sceneRef.current?.setAttribute(
      "transform",
      `translate(${nextViewport.panX} ${nextViewport.panY}) scale(${nextViewport.zoom})`,
    );
  }

  function changeZoom(nextZoom) {
    setViewport((current) => ({
      ...current,
      zoom: Math.min(4, Math.max(0.7, nextZoom)),
    }));
  }

  function resetViewport() {
    setViewport(defaultViewport);
  }

  function handleWheel(event) {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.12 : 0.12;
    changeZoom(viewport.zoom + direction);
  }

  function handlePointerDown(event) {
    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      x: event.clientX,
      y: event.clientY,
      panX: viewport.panX,
      panY: viewport.panY,
      next: viewport,
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const unitX = camera.width / rect.width / viewport.zoom;
    const unitY = camera.height / rect.height / viewport.zoom;
    const deltaX = (event.clientX - dragRef.current.x) * unitX;
    const deltaY = (event.clientY - dragRef.current.y) * unitY;
    if (Math.hypot(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y) > 4) {
      if (!didDragRef.current) {
        dragRef.current.target?.setPointerCapture?.(dragRef.current.pointerId);
      }
      didDragRef.current = true;
      setHovered(null);
    }
    dragRef.current.next = {
      zoom: viewport.zoom,
      panX: dragRef.current.panX + deltaX,
      panY: dragRef.current.panY + deltaY,
    };
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      if (dragRef.current?.next) applySceneTransform(dragRef.current.next);
    });
  }

  function handlePointerUp(event) {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragRef.current?.next) setViewport(dragRef.current.next);
    dragRef.current = null;
  }

  function showHover(event, type, id, pinned = false) {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.closest(".map-stage")?.getBoundingClientRect();
    const pointerX = event.clientX - (rect?.left || 0);
    const pointerY = event.clientY - (rect?.top || 0);
    const x = Math.max(8, Math.min(pointerX + 12, (rect?.width || 260) - 248));
    const y = Math.max(8, Math.min(pointerY + 12, (rect?.height || 180) - 172));
    setHovered({ type, id, x, y, pinned });
  }

  function showTouchSummary(event, type, id) {
    const rect = event.currentTarget.closest(".map-stage")?.getBoundingClientRect();
    const pointerX = event.clientX - (rect?.left || 0);
    const pointerY = event.clientY - (rect?.top || 0);
    const cardWidth = Math.min(260, Math.max(220, (rect?.width || 260) - 16));
    const x = Math.max(8, Math.min(pointerX - cardWidth / 2, (rect?.width || 260) - cardWidth - 8));
    const y = Math.max(8, pointerY + 160 <= (rect?.height || 320) ? pointerY + 14 : pointerY - 150);
    setHovered({ type, id, x, y, touch: true });
  }

  function hideHover(event) {
    if (event?.pointerType === "touch") return;
    if (hovered?.pinned) return;
    setHovered(null);
  }

  function selectMapObject(event, type, id) {
    event.stopPropagation();
    setFocusedCellId(resolveEventCellId(event));
    if (mobileLayout) {
      if (hovered?.touch && hovered.type === type && hovered.id === id) {
        setHovered(null);
        onSelect(type, id);
        return;
      }
      showTouchSummary(event, type, id);
      return;
    }
    showHover(event, type, id, true);
    onSelect(type, id);
  }

  function handleMapClick(event) {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setHovered(null);
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const coordinates = point.matrixTransform(sceneRef.current?.getScreenCTM()?.inverse());
    const cellId = mapSceneService.resolveCellAtPoint({ x: coordinates.x, y: coordinates.y, map });
    if (cellId) {
      setFocusedCellId(cellId);
      const objectReference = mapSceneService.resolveMapObjectAtCell(cellId, data);
      if (objectReference) {
        if (!mobileLayout) showHover(event, objectReference.type, objectReference.id, true);
        onSelect(objectReference.type, objectReference.id);
      } else {
        onBlankCell?.(cellId);
      }
      return;
    }
    setFocusedCellId(null);
    onClear?.();
  }

  function resolveEventCellId(event) {
    const svg = event.currentTarget.closest("svg");
    if (!svg || !sceneRef.current) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const coordinates = point.matrixTransform(sceneRef.current.getScreenCTM()?.inverse());
    return mapSceneService.resolveCellAtPoint({ x: coordinates.x, y: coordinates.y, map });
  }

  return (
    <section className="map-page-new">
      <div ref={stageRef} className="map-stage" data-zoom-band={zoomBand}>
        <div className="map-floating-actions">
          <Button size="small" aria-label="放大地图" title="放大" onClick={() => changeZoom(viewport.zoom + 0.2)}>+</Button>
          <Button size="small" aria-label="缩小地图" title="缩小" onClick={() => changeZoom(viewport.zoom - 0.2)}>−</Button>
          <Button size="small" aria-label="复位地图" title="复位" onClick={resetViewport}>⌖</Button>
          <Button size="small" aria-label="地图图层" title="图层" onClick={() => setLayersOpen((current) => !current)}>▤</Button>
        </div>
        {layersOpen && (
          <div className="map-layer-panel" role="dialog" aria-label="地图图层说明">
            {legendItems.map(([className, label]) => (
              <span className="legend-item" key={className}><span className={`legend-dot ${className}`} />{label}</span>
            ))}
          </div>
        )}
        <svg
          className="zone-canvas-new"
          viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Robotaxi 双区域运营地图"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleMapClick}
        >
          <defs>
            <pattern id="map-grid-pattern" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" className="map-grid-line" />
            </pattern>
          </defs>
          <g ref={sceneRef} transform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`}>
            <rect className="map-ground" x="0" y="0" width={map.grid_cols} height={map.grid_rows} />
            <rect className="map-grid" x="0" y="0" width={map.grid_cols} height={map.grid_rows} fill="url(#map-grid-pattern)" />
            <g className="zone-layer">
              {scene.zones.map((zone) => (
                <g key={zone.zone_id} className="map-zone-object" data-planned={zone.zone_status === "Planned"}>
                  <rect className="map-zone-fill" x={zone.bounds.x} y={zone.bounds.y} width={zone.bounds.width} height={zone.bounds.height} />
                  <rect
                    className="map-zone-boundary"
                    x={zone.bounds.x + 0.18}
                    y={zone.bounds.y + 0.18}
                    width={zone.bounds.width - 0.36}
                    height={zone.bounds.height - 0.36}
                    data-active={selected?.type === "zone" && selected?.id === zone.zone_id}
                    onPointerEnter={(event) => showHover(event, "zone", zone.zone_id)}
                    onPointerLeave={hideHover}
                    onClick={(event) => selectMapObject(event, "zone", zone.zone_id)}
                  />
                </g>
              ))}
            </g>
            <g className="place-layer">
              {scene.places.map((place) => (
                <g key={place.place_id} className={`map-place-object map-place-${String(place.place_type).toLowerCase().replaceAll("_", "-")}`} data-planned={place.place_status === "Planned"}>
                  <rect
                    x={place.bounds.x}
                    y={place.bounds.y}
                    width={place.bounds.width}
                    height={place.bounds.height}
                    data-active={selected?.type === "place" && selected?.id === place.place_id}
                    onPointerEnter={(event) => showHover(event, "place", place.place_id)}
                    onPointerLeave={hideHover}
                    onClick={(event) => selectMapObject(event, "place", place.place_id)}
                  />
                </g>
              ))}
            </g>
            <g className="road-layer">
              {scene.roads.map((road) => (
                <g key={road.road_id} className="map-road-object" data-planned={road.road_status === "Planned"}>
                <path
                  className="map-road-cells"
                  data-planned={road.road_status === "Planned"}
                  d={road.path}
                  onPointerEnter={(event) => showHover(event, "road", road.road_id)}
                  onPointerLeave={hideHover}
                  onClick={(event) => selectMapObject(event, "road", road.road_id)}
                />
                </g>
              ))}
            </g>
            <g className="service-area-layer">
              {scene.serviceAreas.map((area) => (
                <g key={area.service_area_id} className="map-service-area-object" data-planned={area.service_area_status === "PLANNED"}>
                  <path
                    className="service-area-cell"
                    d={area.path}
                    data-active={selected?.type === "serviceArea" && selected?.id === area.service_area_id}
                    onPointerEnter={(event) => showHover(event, "serviceArea", area.service_area_id)}
                    onPointerLeave={hideHover}
                    onClick={(event) => selectMapObject(event, "serviceArea", area.service_area_id)}
                  />
                </g>
              ))}
            </g>
            <g className="map-label-layer">
              {scene.zones.map((zone) => (
                <MapAnchorLabel key={`label-${zone.zone_id}`} className="map-zone-anchor" x={zone.labelX} y={zone.bounds.y + 1.2} scale={camera.labelScale / viewport.zoom} label={zone.zone_name} />
              ))}
              {scene.places.map((place) => (
                <MapAnchorLabel key={`label-${place.place_id}`} className="map-place-anchor" x={place.bounds.x + 0.7} y={place.bounds.y + 0.7} scale={camera.labelScale / viewport.zoom} label={place.place_name} />
              ))}
              {scene.roads.filter((road) => road.bounds.width > 0).map((road) => (
                <MapAnchorLabel key={`label-${road.road_id}`} className="map-road-anchor" x={road.bounds.centerX} y={road.bounds.centerY} scale={camera.labelScale / viewport.zoom} label={road.road_name} />
              ))}
              {scene.serviceAreas.map((area) => (
                <MapAnchorLabel key={`label-${area.service_area_id}`} className="map-service-area-anchor" x={area.bounds.centerX} y={area.bounds.centerY} scale={camera.labelScale / viewport.zoom} label={area.service_area_name} />
              ))}
            </g>
            {highlightedRoutePoints && <polyline className="map-selected-route" points={highlightedRoutePoints} />}
            <OpsCenters opsCenters={data.opsCenters || []} selected={selected} onSelect={selectMapObject} onHover={showHover} onHoverEnd={hideHover} />
            <RoadNodes roadNodes={data.roadNodes} selected={selected} />
            <Robotaxis robotaxis={data.robotaxis || []} selected={selected} onSelect={selectMapObject} onHover={showHover} onHoverEnd={hideHover} />
            {focusedCellId && (() => {
              const { row, col } = parseCellId(focusedCellId);
              return <rect className="map-selected-cell" x={col + 0.06} y={row + 0.06} width="0.88" height="0.88" />;
            })()}
            <rect
              x="0"
              y="0"
              width={map.grid_cols}
              height={map.grid_rows}
              className="zone-boundary map-boundary"
              data-active={selected?.type === "map" && selected?.id === map.map_id}
            />
          </g>
        </svg>
        {hoverPresentation && (
          <div className={hovered.touch ? "map-hover-card touch" : "map-hover-card"} style={{ left: hovered.x, top: hovered.y }} role="status">
            <strong>{hoverPresentation.title}</strong>
            {hoverPresentation.subtitle && <span>{getDisplayValue(hoverPresentation.subtitle)}</span>}
            <dl>
              {hoverPresentation.fields.map(({ field, value }) => (
                <div key={field}><dt>{getFieldLabel(field)}</dt><dd>{getFieldDisplayValue(field, value, {})}</dd></div>
              ))}
            </dl>
            {hovered.touch && (
              <Button
                className="map-hover-detail-action"
                type="text"
                size="small"
                onClick={() => {
                  const { type, id } = hovered;
                  setHovered(null);
                  onSelect(type, id);
                }}
              >
                查看详情
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MapAnchorLabel({ className, x, y, scale, label }) {
  return (
    <g className={`map-anchor-label ${className || ""}`} transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      <circle cx="0" cy="0" r="0.13" />
      <path d="M0.18 0 L0.62 -0.34" />
      <text x="0.78" y="-0.34">{label}</text>
    </g>
  );
}

function createMapCamera(map, stageSize, compact) {
  const stageAspect = Math.max(0.25, stageSize.width / Math.max(1, stageSize.height));
  if (compact) {
    const width = 24;
    const height = width / stageAspect;
    return {
      x: 25 - width / 2,
      y: (map.grid_rows - height) / 2,
      width,
      height,
      labelScale: (11 * width / Math.max(1, stageSize.width)) / 0.54,
    };
  }
  const contentWidth = map.grid_cols + 4;
  const contentHeight = map.grid_rows + 4;
  const contentAspect = contentWidth / contentHeight;
  const width = stageAspect < contentAspect ? contentWidth : contentHeight * stageAspect;
  const height = width / stageAspect;
  return {
    x: (map.grid_cols - width) / 2,
    y: (map.grid_rows - height) / 2,
    width,
    height,
    labelScale: (11 * width / Math.max(1, stageSize.width)) / 0.54,
  };
}

function OpsCenters({ opsCenters, selected, onSelect, onHover, onHoverEnd }) {
  return (
    <g className="ops-center-layer">
      {opsCenters.flatMap((opsCenter) => opsCenter.cell_ids.map((cellId) => {
        const { row, col } = parseCellId(cellId);
        return (
          <rect
            key={`${opsCenter.ops_center_id}-${cellId}`}
            x={col + 0.06}
            y={row + 0.06}
            width="0.88"
            height="0.88"
            className="ops-center-cell"
            data-active={selected?.type === "opsCenter" && selected?.id === opsCenter.ops_center_id}
            onPointerEnter={(event) => onHover(event, "opsCenter", opsCenter.ops_center_id)}
            onPointerLeave={onHoverEnd}
            onClick={(event) => onSelect(event, "opsCenter", opsCenter.ops_center_id)}
          />
        );
      }))}
    </g>
  );
}

function RoadNodes({ roadNodes, selected }) {
  return (
    <g className="road-node-layer">
      {roadNodes.map((node) => (
        <circle
          key={node.road_node_id}
          cx={node.col + 0.5}
          cy={node.row + 0.5}
          r="0.22"
          className="road-node"
          data-active={selected?.type === "roadNode" && selected?.id === node.road_node_id}
        />
      ))}
    </g>
  );
}

function Robotaxis({ robotaxis, selected, onSelect, onHover, onHoverEnd }) {
  const projections = useMemo(
    () => robotaxiMapProjection.createRobotaxiMapProjections(robotaxis),
    [robotaxis],
  );
  return (
    <g className="robotaxi-map-layer">
      {projections.map(({ vehicle: item, cellId, offsetX, offsetY }) => {
        const { row, col } = parseCellId(cellId);
        const centerX = col + 0.5 + offsetX;
        const centerY = row + 0.5 + offsetY;
        const active = selected?.type === "robotaxi" && selected.id === item.robotaxi_id;
        const batteryPercent = Number(item.battery_percent || 0);
        return (
          <g
            className={`robotaxi-map-object status-${getStatusTone(item.availability_status)}`}
            data-active={active}
            data-cell-id={cellId}
            key={item.robotaxi_id}
            role="button"
            tabIndex="0"
            aria-label={`${item.robotaxi_id}，${getDisplayValue(item.availability_status)}，当前位置 ${cellId}，当前电量 ${batteryPercent.toFixed(0)}%`}
            onPointerEnter={(event) => onHover(event, "robotaxi", item.robotaxi_id)}
            onPointerLeave={onHoverEnd}
            onClick={(event) => {
              onSelect(event, "robotaxi", item.robotaxi_id);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onSelect(event, "robotaxi", item.robotaxi_id);
            }}
          >
            <circle className="robotaxi-map-halo" cx={centerX} cy={centerY} r="0.24" />
            <image
              className="robotaxi-map-marker robotaxi-map-image"
              href="./src/assets/robotaxi-map-marker.png"
              x={centerX - 0.17}
              y={centerY - 0.23}
              width="0.34"
              height="0.46"
              preserveAspectRatio="xMidYMid meet"
            />
            <text className="robotaxi-map-label" x={centerX} y={centerY - 0.58} textAnchor="middle">
              {item.robotaxi_id} · {batteryPercent.toFixed(0)}%
            </text>
          </g>
        );
      })}
    </g>
  );
}

function renderCellValue(key, row) {
  if (key === "cell_count") return row.cell_ids?.length ?? 0;
  if (key === "covered_cell_count") return (row.cell_ids || row.covered_cell_ids)?.length ?? 0;
  if (key === "route_step_count") return getMovementStepCount(row);
  if (key === "operation_tags") return renderOperationTags(row);
  if (key === "pending_task_queue" && Array.isArray(row[key])) {
    const summary = formatRobotaxiQueueSummary(row[key]);
    return (
      <Popover title="待执行任务队列" content={<RobotaxiQueuePopover queueItems={row[key]} />} placement="bottomLeft" trigger="hover">
        <Text className="table-queue-summary">{summary}</Text>
      </Popover>
    );
  }
  if (key === "result") {
    const passed = row[key] === "PASS";
    return <Tag color={passed ? "success" : "error"}>{getDisplayValue(row[key])}</Tag>;
  }
  if (isStatusField(key)) {
    return <StatusValue value={row[key]} label={getFieldDisplayValue(key, row[key] ?? "", row)} />;
  }
  if (Array.isArray(row[key])) return row[key].map((item) => formatDetailValue(item, key, row)).join(" / ");
  if (typeof row[key] === "boolean") return row[key] ? "是" : "否";
  if (typeof row[key] === "object" && row[key] !== null) return summarizeObject(row[key]);
  return getFieldDisplayValue(key, row[key] ?? "", row);
}

function StatusValue({ value, label }) {
  return (
    <span className={`status-value status-${getStatusTone(value)}`}>
      {label || "无"}
    </span>
  );
}

function getStatusTone(value) {
  const normalized = String(value || "").toUpperCase();
  if (["ACTIVE", "AVAILABLE", "COMPLETED", "PAID", "PASSED", "PASS", "SUCCESS", "IDLE", "ARRIVED", "NORMAL_ARRIVAL"].includes(normalized)) return "success";
  if (["FAILED", "FAIL", "BLOCKED", "UNAVAILABLE", "CANCELLED"].some((token) => normalized.includes(token)) || normalized.includes("ABNORMAL")) return "danger";
  if (["WAITING", "PENDING", "PAUSED", "DRAFT", "RESTRICTED", "STOPPED"].some((token) => normalized.includes(token))) return "warning";
  if (normalized === "PARTIALLY_SUCCEEDED") return "warning";
  if (["RUNNING", "DRAINING", "MOVING", "CHECKING", "INSPECTION", "ASSIGNED", "PROCESSING", "ON_THE_WAY", "CALCULATING", "SETTLING", "BUSY"].some((token) => normalized.includes(token))) return "info";
  return "neutral";
}

function RowActionButton({ children, onClick, type = "primary", danger = false, disabled = false }) {
  return (
    <Button
      size="small"
      type={type}
      danger={danger}
      disabled={disabled}
      title={typeof children === "string" ? children : undefined}
      className="row-action-button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      {children}
    </Button>
  );
}

function RowActionGroup({ children }) {
  const actions = React.Children.toArray(children).filter(Boolean);
  if (actions.length <= 1) return actions[0] || null;
  const items = actions.map((action, index) => ({
    key: String(index),
    label: action.props.children,
    danger: Boolean(action.props.danger),
    disabled: Boolean(action.props.disabled),
  }));
  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        items,
        onClick: ({ key, domEvent }) => {
          domEvent?.stopPropagation?.();
          actions[Number(key)]?.props?.onClick?.();
        },
      }}
    >
      <Button
        size="small"
        type="text"
        className="row-action-menu-trigger"
        title={typeof actions[0].props.children === "string" ? actions[0].props.children : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <span>{actions[0].props.children}</span>
        <span aria-hidden="true">⌄</span>
      </Button>
    </Dropdown>
  );
}

function formatPlanningValue(value) {
  if (value === null || value === undefined || value === "") return "无";
  return typeof value === "number" ? value.toLocaleString("zh-CN", { maximumFractionDigits: 2 }) : String(value);
}

function OperatingModelPanel({ model }) {
  const domains = model?.model_domains || [];
  const domainNameById = new Map(domains.map((item) => [item.model_domain_id, item.model_domain_name]));
  return (
    <div className="operating-model-panel">
      <header className="operating-model-header">
        <div>
          <span className="analysis-eyebrow">经营结构</span>
          <h2>{model?.operating_model_name || "经营模型"}</h2>
          <p>{model?.model_description}</p>
        </div>
        <div className="operating-model-version">
          <span>{getDisplayValue(model?.operating_model_status)}</span>
          <small>版本 {model?.operating_model_version}</small>
        </div>
      </header>
      <div className="operating-model-domain-grid">
        {domains.map((domain, index) => (
          <React.Fragment key={domain.model_domain_id}>
            <article className="operating-model-domain">
              <div className="operating-model-domain-index">{String(index + 1).padStart(2, "0")}</div>
              <h3>{domain.model_domain_name}</h3>
              <p>{domain.management_question}</p>
              <dl>
                <div><dt>规划输入</dt><dd>{domain.planning_input_types.map(operatingModelService.getModelObjectTypeLabel).join("、") || "无"}</dd></div>
                <div><dt>经营事实</dt><dd>{domain.fact_source_types.map(operatingModelService.getModelObjectTypeLabel).join("、") || "无"}</dd></div>
                <div><dt>经营指标</dt><dd>{domain.metric_definition_ids.length} 项统一指标</dd></div>
              </dl>
            </article>
            {index < domains.length - 1 && <span className="operating-model-arrow" aria-hidden="true">→</span>}
          </React.Fragment>
        ))}
      </div>
      <section className="operating-model-relations">
        <div>
          <span className="analysis-eyebrow">经营传导</span>
          <h3>从规划到反馈的闭环</h3>
        </div>
        <div className="operating-model-relation-list">
          {(model?.model_relations || []).map((relation) => (
            <div key={relation.model_relation_id}>
              <strong>{domainNameById.get(relation.source_model_domain_id)} → {domainNameById.get(relation.target_model_domain_id)}</strong>
              <span>{relation.relation_description}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DecisionCenterPanel({ view, onNavigate }) {
  const summary = view?.summary || {};
  const capabilities = view?.capabilities || [];
  const activities = (view?.activities || []).slice(0, 12);
  const exceptions = (view?.exceptions || []).slice(0, 6);
  const summaryItems = [
    ["策略执行", summary.run_count, "次"],
    ["决策过程", summary.decision_process_count, "个"],
    ["异常尝试", summary.decision_exception_attempt_count, "次"],
    ["受影响对象", summary.affected_business_object_count, "个"],
    ["重试后恢复", summary.recovered_exception_process_count, "个"],
    ["终局影响", summary.terminal_impact_object_count, "个"],
  ];
  const unresolvedCount = summary.unresolved_exception_process_count || 0;
  return (
    <div className="decision-center-panel">
      <header className="decision-center-header">
        <div>
          <span className="analysis-eyebrow">经营决策控制</span>
          <h2>跨价值流决策运行视图</h2>
          <p>策略事实仍由各价值流独立拥有；这里统一观察执行质量、异常和经营效果。</p>
        </div>
        <div className={unresolvedCount > 0 ? "decision-health is-warning" : "decision-health"}>
          <span>{unresolvedCount > 0 ? "待处理决策过程" : summary.decision_exception_count ? "异常过程均已恢复" : "决策运行正常"}</span>
          <strong>{unresolvedCount}</strong>
        </div>
      </header>
      <div className="decision-data-contract">
        <span>来源版本 {summary.decision_source_version || "暂无"}</span>
        <span>来源更新 {summary.source_updated_at || "暂无"}</span>
        <span>经营指标 {summary.metrics_need_recalculation ? "待重算" : summary.metric_updated_at ? `已更新 ${summary.metric_updated_at}` : "暂无计算"}</span>
      </div>
      <section className="decision-summary-grid" aria-label="决策运行摘要">
        {summaryItems.map(([label, value, unit]) => (
          <div key={label} className="decision-summary-item">
            <span>{label}</span>
            <strong>{unit === "percent" ? formatDecisionRate(value) : `${formatPlanningValue(value)}${unit || ""}`}</strong>
          </div>
        ))}
      </section>
      <section className="decision-section">
        <div className="decision-section-heading"><div><span className="analysis-eyebrow">能力目录</span><h3>策略能力与运行状态</h3></div><small>选择入口可进入原业务页面</small></div>
        <div className="decision-capability-grid">
          {capabilities.map((item) => (
            <article className="decision-capability" key={item.decision_capability_id}>
              <div className="decision-capability-title"><div><span>{item.value_stream_name}</span><h4>{item.decision_capability_name}</h4></div><Tag color={item.unresolved_exception_process_count ? "warning" : item.run_count ? "success" : "default"}>{item.unresolved_exception_process_count ? `${item.unresolved_exception_process_count} 个待处理` : item.decision_exception_count ? "异常已恢复" : item.run_count ? "正常" : "未执行"}</Tag></div>
              <dl>
                <div><dt>策略</dt><dd>{item.active_strategy_count} / {item.strategy_count} 启用</dd></div>
                <div><dt>执行 / 过程</dt><dd>{item.run_count} / {item.decision_process_count}</dd></div>
                <div><dt>成功率</dt><dd>{formatDecisionRate(item.decision_execution_success_rate)}</dd></div>
                <div><dt>异常尝试 / 影响</dt><dd>{item.decision_exception_attempt_count} / {item.affected_business_object_count}</dd></div>
              </dl>
              <div className="decision-capability-actions">
                <Button size="small" type="text" onClick={() => onNavigate?.(item.strategy_page_key)}>策略配置</Button>
                <Button size="small" type="text" onClick={() => onNavigate?.(item.run_page_key)}>执行记录</Button>
                <Button size="small" type="text" onClick={() => onNavigate?.(item.result_page_key)}>决策结果</Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="decision-section decision-execution-section">
        <div className="decision-section-heading"><div><span className="analysis-eyebrow">执行监控</span><h3>最近策略执行</h3></div><small>跨领域状态已归一化，源状态保持不变</small></div>
        {activities.length ? (
          <div className="decision-table-scroll"><table className="decision-table"><thead><tr><th>决策能力</th><th>价值流</th><th>策略</th><th>来源对象</th><th>执行状态</th><th>结果数</th><th>发生时间</th></tr></thead><tbody>{activities.map((item) => <tr key={item.decision_activity_id}><td>{item.decision_capability_name}</td><td>{item.value_stream_name}</td><td>{item.strategy_name}</td><td>{item.source_business_object_id || "无"}</td><td><span className={`decision-status is-${String(item.normalized_status).toLowerCase()}`}>{getDisplayValue(item.normalized_status)}</span></td><td>{item.decision_result_count}</td><td>{item.occurred_at || "暂无时间"}</td></tr>)}</tbody></table></div>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="执行策略后将在这里形成跨价值流运行记录" />}
      </section>
      <section className="decision-lower-grid">
        <div className="decision-section">
          <div className="decision-section-heading"><div><span className="analysis-eyebrow">异常治理</span><h3>待关注执行</h3></div></div>
          {exceptions.length ? <div className="decision-exception-list">{exceptions.map((item) => <button type="button" key={item.decision_process_id} onClick={() => onNavigate?.(item.run_page_key)}><span>{item.decision_capability_name} · {getDisplayValue(item.exception_category)} · {getDisplayValue(item.business_impact_status)}</span><strong>{item.source_business_object_id || "无来源对象"} · {item.exception_attempt_count} 次异常尝试 · {getDisplayValue(item.result_summary || "无异常说明")}</strong></button>)}</div> : <div className="decision-empty-state">当前没有异常决策过程</div>}
        </div>
        <div className="decision-section">
          <div className="decision-section-heading"><div><span className="analysis-eyebrow">经营效果</span><h3>关联核心指标</h3></div><small>来自统一经营数据池</small></div>
          <div className="decision-effect-list">{dedupeDecisionEffectMetrics(capabilities).slice(0, 8).map((metric) => <div key={metric.metric_definition_id || metric.performance_indicator_id}><span>{metric.metric_name_cn || metric.performance_indicator_name}</span><strong>{formatDecisionMetric(metric)}</strong></div>)}</div>
        </div>
      </section>
    </div>
  );
}

function dedupeDecisionEffectMetrics(capabilities = []) {
  const byId = new Map();
  capabilities.flatMap((item) => item.effect_metrics || []).forEach((metric) => {
    const id = metric.metric_definition_id || metric.performance_indicator_id;
    if (id && !byId.has(id)) byId.set(id, metric);
  });
  return [...byId.values()];
}

function formatDecisionRate(value) {
  return value === null || value === undefined ? "暂无" : formatPlanningPercent(value);
}

function formatDecisionMetric(metric = {}) {
  const value = metric.metric_value ?? metric.actual_value;
  const unit = metric.metric_unit || metric.value_unit;
  if (unit === "percent" || unit === "比例") return formatPlanningPercent(value);
  return value === null || value === undefined ? "数据待更新" : `${formatPlanningValue(value)}${unit && !["count", "currency"].includes(unit) ? ` ${getDisplayValue(unit)}` : ""}`;
}

function ForecastAnalysisPanel({ rows = [], selectedId = null, onSelect, onCreateSupplyPlan }) {
  const [trendTimeUnit, setTrendTimeUnit] = useState("MONTH");
  const selected = rows.find((row) => row.forecast_result_id === selectedId) || rows[0] || null;
  if (!selected) return <Empty description="执行需求预测后将在这里展示经营规划结论" />;
  const forecastDays = Math.max(0, (Date.parse(`${selected.forecast_end_date}T00:00:00Z`) - Date.parse(`${selected.forecast_start_date}T00:00:00Z`)) / 86400000);
  const availableTrendUnits = new Set([...(forecastDays <= 180 ? ["DAY"] : []), ...(forecastDays <= 730 ? ["WEEK"] : []), "MONTH"]);
  const trendRows = selected.forecast_trend_series?.[trendTimeUnit] || [];
  const supplyTrendRows = selected.supply_trend_series || [];
  const normalizedTrendRows = normalizeForecastChartRows(trendRows, trendTimeUnit);
  const normalizedSupplyTrendRows = normalizeForecastChartRows(supplyTrendRows, "DAY");
  const metrics = ["market_forecast_daily_orders", "target_end_daily_orders", "planned_daily_orders", "required_robotaxi_quantity", "robotaxi_gap_quantity", "planned_production_quantity", "uncovered_robotaxi_gap", "forecast_cumulative_market_orders", "forecast_cumulative_planned_orders"];
  const bottlenecks = ["daily_required_robotaxi", "peak_required_robotaxi", "daily_capacity_gap", "peak_capacity_gap"];
  return (
    <div className="forecast-analysis">
      <div className="forecast-analysis-toolbar">
        <div className="forecast-result-switcher">
          {rows.map((row) => <Button key={row.forecast_result_id} size="small" type={row.forecast_result_id === selected.forecast_result_id ? "primary" : "default"} onClick={() => onSelect(row)}>{formatForecastResultLabel(row)}</Button>)}
        </div>
        <div className="forecast-analysis-actions">
          <Button size="small" type="primary" onClick={() => onCreateSupplyPlan?.(selected)}>执行供应决策</Button>
        </div>
      </div>
      <div className="forecast-context-strip">
        <span>{selected.forecast_start_date || "无"} 至 {selected.forecast_end_date || "无"}</span>
        <span>{formatPlanningValue(selected.forecast_period_count)} {getDisplayValue(selected.forecast_period_unit)}</span>
        <span>{getDisplayValue(selected.growth_model || "COMPOUND")}</span>
        <span>有效周期增长率 {formatPlanningPercent(selected.effective_period_growth_rate)}</span>
      </div>
      <div className="analysis-summary-grid">
        {metrics.map((key) => <div className="analysis-summary-card" key={key}><span>{getFieldLabel(key)}</span><strong>{formatPlanningValue(selected[key])}</strong></div>)}
      </div>
      <div className="forecast-trend-section">
        <div className="forecast-trend-toolbar">
          <div><strong>预测趋势</strong><small>增长变化与累计总量使用同一预测周期快照</small></div>
          <div className="forecast-time-unit-switcher">
            {["DAY", "WEEK", "MONTH"].map((unit) => <Button key={unit} size="small" disabled={!availableTrendUnits.has(unit)} type={trendTimeUnit === unit ? "primary" : "default"} onClick={() => setTrendTimeUnit(unit)}>按{getDisplayValue(unit)}</Button>)}
          </div>
        </div>
        <div className="forecast-trend-grid">
          <DataSeriesChart
            title="需求增长趋势"
            description="各时间点的典型日订单变化"
            rows={normalizedTrendRows}
            series={[{ key: "market_daily_orders", label: getFieldLabel("market_daily_orders"), unit: "单 / 日" }, { key: "planned_daily_orders", label: getFieldLabel("planned_daily_orders"), unit: "单 / 日" }]}
            emptyText="该历史结果尚未保存需求趋势快照，请重新执行预测策略"
          />
          <DataSeriesChart
            title="累计需求总量"
            description="从预测起点累计至当前时间点"
            rows={normalizedTrendRows}
            series={[{ key: "cumulative_market_orders", label: getFieldLabel("cumulative_market_orders"), unit: "单" }, { key: "cumulative_planned_orders", label: getFieldLabel("cumulative_planned_orders"), unit: "单" }]}
            emptyText="该历史结果尚未保存累计需求快照，请重新执行预测策略"
            zeroBased
          />
        </div>
      </div>
      <div className="forecast-trend-section">
        <div className="forecast-trend-toolbar">
          <div><strong>生产与交付规划</strong><small>按生产画像展示预计产出、交付和 Robotaxi 剩余缺口</small></div>
        </div>
        <div className="forecast-trend-grid">
          <DataSeriesChart
            title="每期生产与交付"
            description="每个生产能力周期预计形成和交付的 Robotaxi"
            rows={normalizedSupplyTrendRows}
            series={[{ key: "period_production_quantity", label: "当期生产量", unit: "辆" }, { key: "period_delivery_quantity", label: "当期交付量", unit: "辆" }]}
            emptyText="该历史结果尚未保存生产交付趋势"
            zeroBased
          />
          <DataSeriesChart
            title="累计供给与剩余缺口"
            description="累计生产、累计交付与尚未覆盖的 Robotaxi 缺口"
            rows={normalizedSupplyTrendRows}
            series={[{ key: "cumulative_production_quantity", label: "累计生产量", unit: "辆" }, { key: "cumulative_delivery_quantity", label: "累计交付量", unit: "辆" }, { key: "remaining_robotaxi_gap", label: "剩余缺口", unit: "辆" }]}
            emptyText="该历史结果尚未保存累计供给趋势"
            zeroBased
          />
        </div>
      </div>
      <div className="forecast-analysis-grid">
        <section><h3>能力与瓶颈</h3>{bottlenecks.map((key) => <div className="forecast-analysis-row" key={key}><span>{getFieldLabel(key)}</span><strong>{formatPlanningValue(selected[key])}</strong></div>)}</section>
        <section><h3>Robotaxi 规模</h3><div className="forecast-analysis-row"><span>当前有效</span><strong>{formatPlanningValue(selected.effective_current_robotaxi)}</strong></div><div className="forecast-analysis-row"><span>需求驱动</span><strong>{getDisplayValue(selected.requirement_driver)}</strong></div><div className="forecast-analysis-row"><span>单车有效日产能</span><strong>{formatPlanningValue(selected.robotaxi_effective_daily_orders)}</strong></div></section>
        <section><h3>生产可行性</h3><div className="forecast-analysis-row"><span>建议生产数量</span><strong>{formatPlanningValue(selected.recommended_production_quantity)}</strong></div><div className="forecast-analysis-row"><span>生产准备完成</span><strong>{selected.production_ready_date || "无"}</strong></div><div className="forecast-analysis-row"><span>预测期可形成供给</span><strong>{formatPlanningValue(selected.feasible_supply_quantity)}</strong></div><div className="forecast-analysis-row"><span>全部供给完成</span><strong>{selected.full_supply_completion_date || "超出当前规划范围"}</strong></div></section>
      </div>
      <details className="forecast-calculation-details"><summary><span>{getFieldLabel("calculation_steps")}</span><small>按需展开查看输入、模型、公式、来源与结果</small></summary>{groupForecastCalculationSteps(selected.calculation_steps).map((group) => <section className="forecast-calculation-group" key={group.name}><h4>{group.name}</h4>{group.steps.map((step) => <div className="forecast-calculation-step" key={step.step_order || step.output_field}><span className="forecast-calculation-title"><em>{step.step_order}</em><b>{getFieldLabel(step.output_field)}</b><i>{step.step_action}</i></span><div className="forecast-calculation-explanation"><small><b>{getFieldLabel("input_values")}：</b>{formatPlanningCalculationInputs(step.input_values)}</small><small><b>{getFieldLabel("calculation_model")}：</b>{getDisplayValue(step.calculation_model)}</small><small><b>{getFieldLabel("formula_expression")}：</b>{formatPlanningCalculationExpression(step.formula_expression)}</small><small><b>{getFieldLabel("source_refs")}：</b>{formatPlanningSourceRefs(step.source_refs)}</small></div><strong>{formatPlanningValue(step.output_value)}{step.output_unit ? ` ${step.output_unit}` : ""}</strong></div>)}</section>)}</details>
    </div>
  );
}

function formatPlanningPercent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${(numeric * 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%` : "无";
}

function formatForecastResultLabel(row = {}) {
  const name = row.zone_name || row.forecast_name || "预测结果";
  if (!row.created_at) return name;
  const date = new Date(row.created_at);
  if (Number.isNaN(date.getTime())) return name;
  return `${name} · ${date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function groupForecastCalculationSteps(steps = []) {
  const groups = [];
  (steps || []).forEach((step) => {
    const name = step.step_group || "计算过程";
    let group = groups.find((item) => item.name === name);
    if (!group) {
      group = { name, steps: [] };
      groups.push(group);
    }
    group.steps.push(step);
  });
  return groups;
}

function formatPlanningCalculationInputs(inputValues = {}) {
  const entries = Object.entries(inputValues || {});
  if (!entries.length) return "无额外输入";
  return entries.map(([key, value]) => `${getFieldLabel(key)} ${formatPlanningCalculationValue(value, key)}`).join("；");
}

function formatPlanningCalculationValue(value, key) {
  if (typeof value === "number") {
    if (key.endsWith("_rate") || key.endsWith("_ratio") || key.endsWith("_share")) return formatPlanningPercent(value);
    return formatPlanningValue(value);
  }
  return getDisplayValue(value, key);
}

function formatPlanningCalculationExpression(expression = "") {
  const operators = { max: "最大值", min: "最小值", ceil: "向上取整", Place: "地点" };
  return String(expression || "无公式").replace(/[A-Za-z][A-Za-z0-9_]*/g, (token) => operators[token] || getFieldLabel(token));
}

function formatPlanningSourceRefs(sourceRefs = []) {
  return sourceRefs?.length ? sourceRefs.map((key) => getFieldLabel(key)).join("、") : "当前步骤计算结果";
}

const DATA_CHART_COLORS = ["#4b78c7", "#3f9580", "#a86f42", "#8a6fb2"];

function DataSeriesChart({
  title,
  description,
  rows = [],
  series = [],
  variant = "LINE",
  emptyText = "暂无趋势数据",
  zeroBased = variant === "BAR",
  onSelect,
}) {
  const chartElementRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesSignature = series.map((item) => item.key).join("|");
  const [visibleKeys, setVisibleKeys] = useState(() => series.map((item) => item.key));
  useEffect(() => {
    setVisibleKeys(series.map((item) => item.key));
  }, [seriesSignature]);
  const chartSeries = useMemo(() => series.map((item, index) => ({
    ...item,
    color: item.color || DATA_CHART_COLORS[index % DATA_CHART_COLORS.length],
    visible: visibleKeys.includes(item.key),
  })), [series, visibleKeys]);
  const option = useMemo(() => dataChartService.createEchartsOption({
    rows,
    series: chartSeries,
    variant,
    zeroBased,
  }), [rows, chartSeries, variant, zeroBased]);
  useEffect(() => {
    if (!rows.length || !chartElementRef.current || !window.echarts) return undefined;
    const chart = window.echarts.init(chartElementRef.current, null, { renderer: "canvas" });
    chartInstanceRef.current = chart;
    const { __sampledRows, __sampled, ...echartsOption } = option;
    chart.setOption(echartsOption, { notMerge: true, lazyUpdate: true });
    const handleClick = (event) => {
      if (event.componentType === "series") onSelect?.(__sampledRows?.[event.dataIndex]?.raw);
    };
    chart.on("click", handleClick);
    const observer = new ResizeObserver(() => chart.resize({ animation: { duration: 0 } }));
    observer.observe(chartElementRef.current);
    return () => {
      observer.disconnect();
      chart.off("click", handleClick);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [rows, option, onSelect]);
  const toggleSeries = (key) => {
    setVisibleKeys((current) => current.includes(key)
      ? (current.length > 1 ? current.filter((item) => item !== key) : current)
      : [...current, key]);
  };
  return (
    <section className="data-chart" data-variant={variant.toLowerCase()}>
      <header className="data-chart-header">
        <div><strong>{title}</strong>{description && <small>{description}</small>}</div>
        <span>{rows.length ? `${rows.length} 个时间点` : "等待数据"}</span>
      </header>
      {rows.length > 0 ? <>
        <div className="data-chart-legend" aria-label="图例">
          {chartSeries.map((item) => (
            <button key={item.key} type="button" aria-pressed={item.visible} onClick={() => toggleSeries(item.key)}>
              <i style={{ backgroundColor: item.color }} />{item.label}{item.unit ? <small>{item.unit}</small> : null}
            </button>
          ))}
        </div>
        <div ref={chartElementRef} className="data-chart-viewport" data-point-count={rows.length} role="img" aria-label={`${title}，移动或点击数据点可查看具体数值`} />
        {option.__sampled && <small className="data-chart-sample-note">数据量较大，图形已等距抽样，原始结果保持完整。</small>}
      </> : <div className="data-chart-empty">{emptyText}</div>}
    </section>
  );
}

function normalizeForecastChartRows(rows = [], timeUnit = "DAY") {
  return rows.map((row, index) => ({
    key: `${row.trend_date || "period"}-${index}`,
    label: formatForecastAxisLabel(row.trend_date, timeUnit),
    tooltipLabel: row.trend_date || `第 ${index + 1} 期`,
    values: row,
    raw: row,
  }));
}

function formatForecastAxisLabel(value, timeUnit) {
  if (!value) return "无日期";
  if (timeUnit === "MONTH") return String(value).slice(0, 7);
  return String(value).slice(5, 10) || String(value);
}

function MetricExperiencePanel({ page, rows = [], allRows = [], metricCalculationRuns = [], metricPeriodType = "ALL", planningBaseline = {}, comparisons = [], analysisModel = null, onSelect }) {
  const [demandTrendMode, setDemandTrendMode] = useState("HOURLY");
  const latestRows = operatingDataPoolService.getLatestMetricRows(rows);
  const insightSourceRows = allRows.filter((row) => (
    row.metric_scope_type === "OPERATING_PERIOD"
    && row.metric_period_type === metricPeriodType
  ));
  const hourlyDemandRows = createMetricTrendRows(insightSourceRows, "DEMAND-TREND-001")
    .filter((row) => row.dimension_type === "SIMULATION_HOUR");
  const trendDayOptions = createTrendDayOptions(hourlyDemandRows);
  const [selectedTrendDay, setSelectedTrendDay] = useState(null);
  const activeTrendDay = selectedTrendDay && trendDayOptions.some((option) => option.value === selectedTrendDay)
    ? selectedTrendDay
    : trendDayOptions[0]?.value || null;
  const dailyDemandRows = createDailyDemandTrendRows(hourlyDemandRows);
  const displayedDemandRows = demandTrendMode === "DAILY"
    ? dailyDemandRows
    : hourlyDemandRows.filter((row) => getMetricTrendDayValue(row) === activeTrendDay);
  const timeSegmentDemandRows = createMetricTrendRows(insightSourceRows, "DEMAND-TREND-001")
    .filter((row) => row.dimension_type === "DEMAND_TIME_SEGMENT");
  const overviewRows = page === "operatingMetricsOverview"
    ? operatingDataPoolService.OPERATING_ANALYSIS_PAGE_METRICS.operatingMetricsOverview
      .map((id) => latestRows.find((row) => row.metric_definition_id === id))
      .filter(Boolean)
    : latestRows.slice(0, 6);
  const warningRows = insightSourceRows.filter((row) => row.quality_status && row.quality_status !== "PASS").slice(0, 4);
  const latestCalculationRun = operatingDataPoolService.getLatestCalculationRun(metricCalculationRuns, metricPeriodType);
  const periodLabel = latestRows[0]?.metric_period_label || latestCalculationRun?.metric_period_label || "尚未更新";
  const metricById = new Map(operatingDataPoolService.getLatestMetricRows(insightSourceRows).map((row) => [row.metric_definition_id, row]));
  const sourceRecordCount = latestRows.reduce((total, row) => total + Number(row.source_record_count || 0), 0);
  const qualityMetric = metricById.get("QUALITY-DATA-001");
  const qualitySummary = qualityMetric ? `${getMetricDisplayName(qualityMetric)} ${formatMetricDisplayValue(qualityMetric)}` : "等待数据质量结果";
  const calculationSummary = latestCalculationRun
    ? `${latestCalculationRun.metric_calculation_run_id} · ${getDisplayValue(latestCalculationRun.calculation_status, "calculation_status")}`
    : "暂无更新批次";
  const insightGroups = (analysisModel?.insightGroups || []).map((group) => createMetricInsightGroup({
    title: group.title,
    description: metricById.get(group.primaryMetricId)?.business_definition || analysisModel?.managementQuestion || "查看经营结果与驱动关系。",
    primary: metricById.get(group.primaryMetricId),
    secondary: (group.secondaryMetricIds || []).map((id) => metricById.get(id)),
  }));
  const pageComparisons = (comparisons || []).filter((item) => (
    !analysisModel?.comparisonDomains || analysisModel.comparisonDomains.includes(item.performance_domain)
  ));
  const activeTarget = planningBaseline?.businessTarget;
  return (
    <div className="metric-experience-panel">
      <section className="metric-planning-baseline">
        <div>
          <span>{analysisModel?.title || "经营规划基线"}</span>
          <strong>{activeTarget?.target_name || "尚未建立经营目标"}</strong>
          <small>{analysisModel?.managementQuestion || (activeTarget ? `${activeTarget.forecast_start_date || ""} 至 ${activeTarget.forecast_end_date || ""}` : "完成经营规划后将自动进入统一数据池")}</small>
        </div>
        <div className="metric-planning-facts">
          <span>预测结果 <strong>{planningBaseline?.forecasts?.length || 0}</strong></span>
          <span>生产计划 <strong>{planningBaseline?.supplyPlans?.length || 0}</strong></span>
          <span>事实截止 <strong>{periodLabel}</strong></span>
        </div>
      </section>
      {pageComparisons.length > 0 && <section className="metric-comparison-grid" aria-label="规划与实际对比">
        {pageComparisons.map((item) => (
          <article key={item.performance_indicator_id} className={`metric-comparison-card status-${String(item.performance_status || "").toLowerCase()}`}>
            <header><span>{item.performance_domain}</span><em>{getDisplayValue(item.performance_status)}</em></header>
            <h3>{item.performance_indicator_name}</h3>
            <div className="metric-comparison-values">
              <span>实际<strong>{formatPerformanceValue(item.actual_value, item.value_unit)}</strong></span>
              <span>预测<strong>{formatPerformanceValue(item.forecast_value, item.value_unit)}</strong></span>
              <span>目标<strong>{formatPerformanceValue(item.target_value, item.value_unit)}</strong></span>
            </div>
            <footer>
              <span>达成率 {formatPerformanceRate(item.attainment_rate)}</span>
              <small>{item.comparison_explanation}</small>
            </footer>
          </article>
        ))}
      </section>}
      <div className="metric-card-grid">
        {overviewRows.length > 0 ? overviewRows.map((row) => (
          <button key={row.metric_observation_id} className="metric-summary-card" onClick={() => onSelect(row)}>
            <span>{getMetricDisplayName(row)}</span>
            <strong>{formatMetricDisplayValue(row)}</strong>
            <small>{row.quality_status === "PASS" ? "数据通过" : row.quality_reason || "存在质量提示"}</small>
          </button>
        )) : (
          <div className="metric-empty-summary">暂无经营数据，请选择统计周期后更新经营数据。</div>
        )}
      </div>
      <div className="metric-insight-lanes">
        {insightGroups.map((group) => (
          <button key={group.title} className="metric-insight-lane" onClick={() => group.primary?.row && onSelect(group.primary.row)}>
            <span>{group.title}</span>
            <strong>{group.primaryText}</strong>
            <small>{group.secondaryText}</small>
            <em>{group.description}</em>
          </button>
        ))}
      </div>
      {analysisModel?.showDemandTrend && (
        <div className="metric-trend-toolbar">
          <span>需求趋势</span>
          <Button size="small" type={demandTrendMode === "HOURLY" ? "primary" : "default"} onClick={() => setDemandTrendMode("HOURLY")}>按小时</Button>
          <Button size="small" type={demandTrendMode === "DAILY" ? "primary" : "default"} onClick={() => setDemandTrendMode("DAILY")}>按天</Button>
          {demandTrendMode === "HOURLY" && (
            <Select
              size="small"
              value={activeTrendDay}
              placeholder="选择模拟日"
              onChange={setSelectedTrendDay}
              getPopupContainer={() => document.body}
              options={trendDayOptions}
            />
          )}
        </div>
      )}
      {analysisModel?.showDemandTrend && (
        <div className="metric-trend-grid">
          <DataSeriesChart
            title={demandTrendMode === "DAILY" ? "每日订单量" : "每小时订单量"}
            description={demandTrendMode === "DAILY" ? "按模拟日观察订单需求变化" : "按小时观察所选模拟日的订单需求变化"}
            rows={normalizeMetricChartRows(displayedDemandRows)}
            series={[{ key: "metric_value", label: "订单量", unit: "单" }]}
            emptyText={demandTrendMode === "DAILY" ? "暂无每日订单趋势" : "暂无每小时订单趋势"}
            onSelect={onSelect}
          />
          <DataSeriesChart
            title="时段订单量"
            description="比较高峰、平峰和低峰时段的需求规模"
            rows={normalizeMetricChartRows(timeSegmentDemandRows)}
            series={[{ key: "metric_value", label: "订单量", unit: "单" }]}
            variant="BAR"
            emptyText="暂无时段订单趋势"
            onSelect={onSelect}
          />
        </div>
      )}
      <div className="metric-quality-strip">
        <span>数据池：{calculationSummary}</span>
        <span>当前统计周期：{periodLabel}</span>
        <span>指标结果 {latestRows.length}</span>
        <span>来源记录 {sourceRecordCount}</span>
        <span>{qualitySummary}</span>
        <span>{warningRows[0] ? `${getMetricDisplayName(warningRows[0])}：${warningRows[0].quality_reason || "存在质量提示"}` : "暂无质量提示"}</span>
      </div>
    </div>
  );
}

function formatPerformanceValue(value, unit) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "未形成";
  const number = Number(value);
  if (unit === "比例") return `${(number * 100).toFixed(1)}%`;
  const formatted = Math.abs(number) >= 100 ? number.toFixed(0) : number.toFixed(2).replace(/\.00$/, "");
  return `${formatted}${unit && unit !== "金额" ? ` ${unit}` : ""}`;
}

function formatPerformanceRate(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? "未形成" : `${(Number(value) * 100).toFixed(1)}%`;
}

function normalizeMetricChartRows(rows = []) {
  return rows.map((row, index) => ({
    key: row.metric_observation_id || `metric-${index}`,
    label: formatTrendDimensionLabel(row),
    tooltipLabel: row.metric_period_label || row.window_label || formatTrendDimensionLabel(row),
    values: { metric_value: Number(row.metric_value || 0) },
    raw: row,
  }));
}

function createMetricTrendRows(rows = [], metricDefinitionId) {
  return (rows || [])
    .filter((row) => row.metric_definition_id === metricDefinitionId)
    .sort((left, right) => Number(left.window_start_seconds || 0) - Number(right.window_start_seconds || 0));
}

function createTrendDayOptions(rows = []) {
  const dayValues = [...new Set((rows || []).map(getMetricTrendDayValue).filter(Boolean))];
  return dayValues.map((value) => ({ value, label: value }));
}

function getMetricTrendDayValue(row) {
  const seconds = Number(row?.window_start_seconds || 0);
  if (!Number.isFinite(seconds)) return null;
  return `Day${Math.floor(seconds / 86400) + 1}`;
}

function createDailyDemandTrendRows(hourlyRows = []) {
  const grouped = new Map();
  hourlyRows.forEach((row) => {
    const day = getMetricTrendDayValue(row);
    if (!day) return;
    const current = grouped.get(day) || {
      ...row,
      metric_observation_id: `${row.metric_calculation_run_id || "MCR"}-DAILY-${day}`,
      dimension_type: "SIMULATION_DAY",
      dimension_id: day,
      window_type: "DAY",
      window_start_seconds: Math.floor(Number(row.window_start_seconds || 0) / 86400) * 86400,
      window_end_seconds: Math.floor(Number(row.window_start_seconds || 0) / 86400) * 86400 + 86400,
      window_label: day,
      metric_value: 0,
      numerator_value: 0,
      denominator_value: 1,
      source_record_count: 0,
      source_object_refs: [],
    };
    current.metric_value = Number(current.metric_value || 0) + Number(row.metric_value || 0);
    current.numerator_value = Number(current.numerator_value || 0) + Number(row.numerator_value || row.metric_value || 0);
    current.source_record_count = Number(current.source_record_count || 0) + Number(row.source_record_count || 0);
    current.source_object_refs = [...(current.source_object_refs || []), ...(row.source_object_refs || [])].slice(0, 20);
    grouped.set(day, current);
  });
  return [...grouped.values()].sort((left, right) => Number(left.window_start_seconds || 0) - Number(right.window_start_seconds || 0));
}

function formatTrendDimensionLabel(row) {
  if (row.dimension_type === "SIMULATION_DAY") return row.dimension_id || row.window_label || "模拟日";
  if (row.dimension_type === "DEMAND_TIME_SEGMENT") {
    if (row.dimension_id === "PEAK") return "高峰";
    if (row.dimension_id === "NORMAL") return "平峰";
    if (row.dimension_id === "OFF_PEAK") return "低峰";
    return row.window_label || "时段";
  }
  if (row.dimension_type === "SIMULATION_HOUR") {
    const seconds = Number(row.window_start_seconds || 0);
    const hour = Math.floor((seconds % 86400) / 3600);
    return `${String(hour).padStart(2, "0")}:00`;
  }
  return row.window_label || row.dimension_id || "趋势点";
}

function RobotaxiOperationPanel({ rows = [], selectedRow = null, actionMap = new Map(), onSelect }) {
  const activeRow = selectedRow || rows[0] || null;
  const pendingAdmissionCount = rows.filter((row) => row.availability_status === "PENDING_ADMISSION" || row.availability_status === "PENDING_INSPECTION").length;
  const availableCount = rows.filter((row) => row.availability_status === "AVAILABLE").length;
  const fleetOperationCount = rows.filter((row) => row.availability_status === "IN_FLEET_OPERATION" || row.availability_status === "UNAVAILABLE").length;
  const retiredCount = rows.filter((row) => row.availability_status === "RETIRED").length;
  const queuedCount = rows.filter((row) => Array.isArray(row.pending_task_queue) && row.pending_task_queue.length > 0).length;
  const occupiedCount = rows.filter((row) => row.current_task_id || row.current_order_id).length;
  const availableActions = activeRow ? actionMap.get(activeRow.robotaxi_id) || [] : [];
  const queueItems = activeRow?.pending_task_queue || [];
  const selectActiveRow = () => {
    if (activeRow) onSelect(activeRow);
  };
  return (
    <div className="robotaxi-operation-panel">
      <div className="robotaxi-fleet-summary-scroll" aria-label="车队状态摘要">
        <div className="robotaxi-fleet-summary">
          <RobotaxiSummaryMetric label="可运营" value={availableCount} />
          <RobotaxiSummaryMetric label="待准入" value={pendingAdmissionCount} />
          <RobotaxiSummaryMetric label="运维中" value={fleetOperationCount} />
          <RobotaxiSummaryMetric label="已退役" value={retiredCount} />
          <RobotaxiSummaryMetric label="执行中" value={occupiedCount} />
          <RobotaxiSummaryMetric label="有排队任务" value={queuedCount} />
        </div>
      </div>
      <div className="robotaxi-selected-card">
        {activeRow ? (
          <div
            className="robotaxi-selected-card-inner"
            role="button"
            tabIndex={0}
            onClick={selectActiveRow}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") selectActiveRow();
            }}
          >
            <div className="robotaxi-selected-card-head">
              <span>当前 Robotaxi</span>
              <strong>{activeRow.robotaxi_id}</strong>
              <small>{getFieldDisplayValue("availability_status", activeRow.availability_status)} · {getFieldDisplayValue("motion_status", activeRow.motion_status)}</small>
            </div>
            <div className="robotaxi-selected-meta-scroll" aria-label="当前 Robotaxi 摘要">
              <div className="robotaxi-selected-meta">
                <RobotaxiSummaryItem
                  label="当前位置"
                  value={activeRow.location_summary || activeRow.current_cell_id || "未知位置"}
                  popoverTitle="当前位置详情"
                  popoverContent={<RobotaxiLocationPopover row={activeRow} />}
                />
                <RobotaxiSummaryItem label="当前任务" value={formatRobotaxiCurrentTask(activeRow)} />
                <RobotaxiSummaryItem label="待处理" value={formatRobotaxiOperationNeedSummary(activeRow)} />
                <RobotaxiSummaryItem
                  label="待执行队列"
                  value={formatRobotaxiQueueSummary(queueItems)}
                  popoverTitle="待执行任务队列"
                  popoverContent={<RobotaxiQueuePopover queueItems={queueItems} />}
                />
                <RobotaxiSummaryItem
                  label="可触发"
                  value={formatRobotaxiActionSummary(availableActions)}
                  popoverTitle="当前可触发运维"
                  popoverContent={<RobotaxiActionsPopover actions={availableActions} />}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="robotaxi-empty-summary">暂无符合筛选条件的 Robotaxi。</div>
        )}
      </div>
    </div>
  );
}

function RobotaxiSummaryMetric({ label, value }) {
  return (
    <div className="robotaxi-summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RobotaxiSummaryItem({ label, value, popoverTitle = null, popoverContent = null }) {
  const content = (
    <div className="robotaxi-summary-item">
      <span>{label}</span>
      <strong>{value || "无"}</strong>
    </div>
  );
  if (!popoverContent) return content;
  return (
    <Popover title={popoverTitle} content={popoverContent} placement="bottomLeft" trigger="hover">
      {content}
    </Popover>
  );
}

function RobotaxiLocationPopover({ row }) {
  if (row?.location_context) return <CompactLocationDetail value={row.location_context} />;
  return <div className="robotaxi-popover-list"><span>{row?.location_summary || row?.current_cell_id || "未知位置"}</span></div>;
}

function RobotaxiQueuePopover({ queueItems = [] }) {
  if (!queueItems.length) return <div className="robotaxi-popover-list"><span>无排队任务</span></div>;
  return (
    <div className="robotaxi-popover-list">
      {queueItems.map((item, index) => (
        <span key={`${item.task_id || item.task_type}-${index}`}>{formatRobotaxiQueueItem(item, index, { showPriority: true })}</span>
      ))}
    </div>
  );
}

function RobotaxiActionsPopover({ actions = [] }) {
  if (!actions.length) return <div className="robotaxi-popover-list"><span>无可触发任务</span></div>;
  return (
    <div className="robotaxi-popover-list">
      {actions.map((item) => (
        <span key={item.task_type}>{getDisplayValue(item.task_type)}：可创建</span>
      ))}
    </div>
  );
}

function formatRobotaxiCurrentTask(row) {
  if (!row) return "空闲";
  if (row.current_order_id) return `服务订单 ${row.current_order_id}`;
  if (row.current_task_id) {
    const taskTypeText = getDisplayValue(row.current_task_type, "current_task_type") || getDisplayValue(row.current_task_type) || "任务";
    return `${taskTypeText} ${row.current_task_id}`;
  }
  return "空闲";
}

function formatRobotaxiOperationNeedSummary(row) {
  if (row?.current_task_type) return getDisplayValue(row.current_task_type, "current_task_type") || getDisplayValue(row.current_task_type);
  if (Array.isArray(row?.pending_task_queue) && row.pending_task_queue.length > 0) return `排队 ${row.pending_task_queue.length} 项`;
  if (row?.operation_blocking_reason) return getDisplayValue(row.operation_blocking_reason) || row.operation_blocking_reason;
  return "无";
}

function formatRobotaxiQueueItem(item, index, { showPriority = false } = {}) {
  const sequence = item.queue_sequence || index + 1;
  const priority = showPriority && item.priority !== undefined && item.priority !== null ? ` · 优先级 ${item.priority}` : "";
  const taskId = item.task_id ? ` ${item.task_id}` : "";
  return `${sequence}. ${getDisplayValue(item.task_type)}${taskId}${priority}`;
}

function formatRobotaxiQueueSummary(queueItems = []) {
  if (!queueItems.length) return "无";
  const first = formatRobotaxiQueueItem(queueItems[0], 0);
  return queueItems.length > 1 ? `${first}（共 ${queueItems.length} 项）` : first;
}

function formatRobotaxiActionSummary(actions = []) {
  if (!actions.length) return "无可触发任务";
  const labels = actions.slice(0, 3).map((item) => getDisplayValue(item.task_type));
  return actions.length > 3 ? `${labels.join(" / ")} / +${actions.length - 3}` : labels.join(" / ");
}

function formatRobotaxiQueueItems(queueItems = []) {
  if (!queueItems.length) return "无";
  return queueItems.map((item, index) => formatRobotaxiQueueItem(item, index)).join(" / ");
}

function renderViewDetailAction(row, actions) {
  return (
    <RowActionButton
      type="default"
      onClick={() => actions.viewRecordDetail(actions.page, actions.objectType, row[actions.idField])}
    >
      查看详情
    </RowActionButton>
  );
}

function renderSupplyPlanActions(row, actions) {
  if (row.plan_status === "DRAFT") {
    return <RowActionButton onClick={() => actions.confirmSupplyPlan(row)}>确认计划</RowActionButton>;
  }
  if (row.plan_status === "CONFIRMED") {
    return <RowActionButton onClick={() => actions.createProductionBatchFromSupplyPlan(row)}>生成生产批次</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function renderProductionBatchActions(row, actions) {
  if (row.batch_status === "PLANNED") {
    return <RowActionButton onClick={() => actions.startProductionBatch(row)}>开始生产</RowActionButton>;
  }
  if (row.batch_status === "IN_PRODUCTION") {
    return <RowActionButton onClick={() => actions.completeProductionBatch(row)}>生产完成</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function renderRobotaxiDeliveryOrderActions(row, actions) {
  if (row.delivery_status === "CREATED") {
    return <RowActionButton onClick={() => actions.startDeliveryOrder(row)}>开始交付</RowActionButton>;
  }
  if (row.delivery_status === "IN_DELIVERY") {
    return <RowActionButton onClick={() => actions.completeDeliveryOrder(row)}>交付完成</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function renderReadinessActions(row, actions) {
  if (row.task_status === "WAITING_ASSIGNMENT") {
    return <RowActionButton onClick={() => actions.assignWorker(row.task_id)}>分配作业人员</RowActionButton>;
  }
  if (row.task_status === "WAITING_CHECK") {
    return <RowActionButton onClick={() => actions.startCheck(row.task_id)}>开始检查</RowActionButton>;
  }
  if (row.task_status === "CHECKING") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => actions.submitCheckResult(row.task_id, taskTypes.CheckResult.PASSED)}>检查通过</RowActionButton>
        <RowActionButton type="default" danger onClick={() => actions.openAbnormalModal(row)}>异常</RowActionButton>
      </RowActionGroup>
    );
  }
  return renderViewDetailAction(row, actions);
}

function renderDeploymentActions(row, actions) {
  if (["WAITING_ROUTE", "WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL"].includes(row.task_status)) {
    return <RowActionButton onClick={() => actions.viewRouteExecutionForDeployment(row)}>查看行驶记录</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function renderFleetOperationTaskActions(row, actions) {
  const status = row.task_status;
  const dispatchLabel = getFleetOperationDispatchLabel(row.task_type);
  if (row.task_type === "RETIREMENT" && status === "WAITING_RETIREMENT_APPROVAL") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => actions.approveRetirementTask(row)}>确认退役</RowActionButton>
        <RowActionButton type="default" onClick={() => actions.rejectRetirementTask(row)}>驳回退役</RowActionButton>
      </RowActionGroup>
    );
  }
  if (isFleetOperationDestinationStatus(status)) {
    return <RowActionButton onClick={() => actions.dispatchFleetOperationTaskDestination(row)}>{dispatchLabel}</RowActionButton>;
  }
  if (isFleetOperationRouteRecordStatus(row)) {
    return <RowActionButton onClick={() => actions.viewRouteExecutionForDeployment(row)}>查看行驶记录</RowActionButton>;
  }
  if (isFleetOperationWorkerAssignmentStatus(row)) {
    return <RowActionButton onClick={() => actions.assignFleetOperationWorker(row)}>分配 Worker</RowActionButton>;
  }
  if (isFleetOperationReadyToStartStatus(row)) {
    return <RowActionButton onClick={() => actions.startFleetOperationWork(row)}>{getFleetOperationStartWorkLabel(row)}</RowActionButton>;
  }
  if (isFleetOperationWorkActiveStatus(row)) {
    return <RowActionButton onClick={() => actions.completeFleetOperationWork(row)}>{getFleetOperationCompleteWorkLabel(row)}</RowActionButton>;
  }
  return <RowActionButton type="default" onClick={() => actions.viewRecordDetail(actions.page, actions.objectType, row[actions.idField])}>查看详情</RowActionButton>;
}

function isFleetOperationRouteRecordStatus(row) {
  if (!row?.route_execution_id) return false;
  return [
    "WAITING_ROUTE",
    "MOVING_TO_OPS_CENTER",
    "MOVING_TO_CHARGER",
    "MOVING_TO_MAINTENANCE_CENTER",
    "MOVING_TO_RETIREMENT_CENTER",
    "ARRIVED_OPS_CENTER",
    "ARRIVED_CHARGER",
    "ARRIVED_MAINTENANCE_CENTER",
    "ARRIVED_RETIREMENT_CENTER",
    "ARRIVAL_ABNORMAL",
  ].includes(row.task_status);
}

function isFleetOperationDestinationStatus(status) {
  return [
    "WAITING_DESTINATION_ASSIGNMENT",
    "WAITING_CHARGING_DESTINATION_ASSIGNMENT",
    "WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT",
  ].includes(status);
}

function isFleetOperationWorkerAssignmentStatus(row) {
  if (!row?.task_status) return false;
  if (row.task_status === "WAITING_WORKER_ASSIGNMENT") return true;
  if (row.task_status === "WAITING_RESOURCE_ASSIGNMENT") return true;
  if (row.task_status === "WAITING_CHARGER_ASSIGNMENT") return true;
  if (row.task_status === "WAITING_DIAGNOSIS_ASSIGNMENT") return true;
  return false;
}

function isFleetOperationReadyToStartStatus(row) {
  return [
    "READY_TO_CLEAN",
    "READY_TO_START",
    "READY_TO_REPAIR",
    "READY_TO_CHARGE",
  ].includes(row?.task_status);
}

function isFleetOperationWorkActiveStatus(row) {
  return [
    "CLEANING",
    "CLEANING_IN_PROGRESS",
    "REPAIRING",
    "MAINTENANCE_IN_PROGRESS",
    "CHARGING",
    "READY_TO_DISCONNECT",
    "DIAGNOSING",
    "PROCESSING_RETIREMENT",
  ].includes(row?.task_status);
}

function getFleetOperationStartWorkLabel(row) {
  if (row.task_type === "CHARGING") return "接入充电头";
  if (row.task_type === "CLEANING") return "开始清洁";
  if (row.task_type === "MAINTENANCE") return "开始维修";
  if (row.task_type === "FAILURE_HANDLING") return "开始诊断";
  if (row.task_type === "RETIREMENT") return "开始退役";
  return "开始作业";
}

function getFleetOperationCompleteWorkLabel(row) {
  if (row.task_status === "CHARGING") return "充电完成";
  if (row.task_status === "READY_TO_DISCONNECT") return "断开电源";
  if (row.task_type === "CLEANING") return "清洁完成";
  if (row.task_type === "MAINTENANCE") return "维修完成";
  if (row.task_type === "FAILURE_HANDLING") return "诊断完成";
  if (row.task_type === "RETIREMENT") return "退役完成";
  return "完成作业";
}

function getFleetOperationDispatchLabel(taskType) {
  if (taskType === "CLEANING") return "分配清洁站";
  if (taskType === "CHARGING") return "分配充电站";
  if (taskType === "MAINTENANCE") return "分配维修站";
  if (taskType === "FAILURE_HANDLING") return "分配故障处理中心";
  if (taskType === "RETIREMENT") return "分配退役处理中心";
  return "分配运维中心";
}


function renderOperationTags(row) {
  const tags = [];
  if (row.needs_cleaning) tags.push(React.createElement("span",{key:"cln",className:"tag tag-warning",style:{marginRight:4}},"清洁"));
  if (row.needs_charging) tags.push(React.createElement("span",{key:"chg",className:"tag tag-info",style:{marginRight:4}},"充电"));
  if (row.needs_maintenance) tags.push(React.createElement("span",{key:"mnt",className:"tag tag-danger",style:{marginRight:4}},"维修"));
  if (row.failure_status && row.failure_status !== "NONE") tags.push(React.createElement("span",{key:"flr",className:"tag tag-danger",style:{marginRight:4}},"故障"));
  return tags.length > 0 ? React.createElement("span",null,...tags) : React.createElement("span",{style:{color:"var(--muted)"}},"无");
}
function renderRobotaxiFleetOperationActions(row, actions) {
  const isRetired = row.availability_status === "RETIRED";
  const availableActions = actions.robotaxiOperationActionMap?.get(row.robotaxi_id)
    || (actions.getRobotaxiFleetOperationActions ? actions.getRobotaxiFleetOperationActions(row) : []);
  const can = (taskType) => availableActions.some((action) => action.task_type === taskType);
  
  if (isRetired) {
    return <RowActionButton type="default" onClick={() => actions.viewRecordDetail(actions.page, actions.objectType, row[actions.idField])}>查看详情</RowActionButton>;
  }
  
  return (
    <RowActionGroup>
      {can(taskTypes.TaskType.CLEANING) && <RowActionButton onClick={() => actions.createDirectFleetOperationTaskFromRobotaxi(row, taskTypes.TaskType.CLEANING)}>清洁</RowActionButton>}
      {can(taskTypes.TaskType.CHARGING) && <RowActionButton type="default" onClick={() => actions.createDirectFleetOperationTaskFromRobotaxi(row, taskTypes.TaskType.CHARGING)}>充电</RowActionButton>}
      {can(taskTypes.TaskType.MAINTENANCE) && <RowActionButton type="default" onClick={() => actions.createDirectFleetOperationTaskFromRobotaxi(row, taskTypes.TaskType.MAINTENANCE)}>维修</RowActionButton>}
      {can(taskTypes.TaskType.FAILURE_HANDLING) && <RowActionButton type="default" danger onClick={() => actions.createDirectFleetOperationTaskFromRobotaxi(row, taskTypes.TaskType.FAILURE_HANDLING)}>故障</RowActionButton>}
      {availableActions.length === 0 && <RowActionButton type="default" onClick={() => actions.viewRecordDetail(actions.page, actions.objectType, row[actions.idField])}>查看详情</RowActionButton>}
    </RowActionGroup>
  );
}

function renderFleetOperationPolicyActions(row, actions) {
  return (
    <RowActionGroup>
      <RowActionButton type="default" onClick={() => actions.editFleetOperationPolicy(row)}>配置</RowActionButton>
      <RowActionButton onClick={() => actions.runFleetOperationPolicy(row.target_task_type)}>执行</RowActionButton>
    </RowActionGroup>
  );
}

function renderRouteExecutionActions(row, actions) {
  if (["WAITING_ROUTE", "ARRIVAL_ABNORMAL"].includes(row.execution_status)) {
    return <RowActionButton onClick={() => actions.planRouteExecutionRoute(row.route_execution_id)}>路径规划</RowActionButton>;
  }
  if (row.execution_status === "WAITING_START") {
    return <RowActionButton onClick={() => actions.startRouteExecution(row.route_execution_id)}>开始行驶</RowActionButton>;
  }
  if (row.execution_status === "MOVING") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => actions.advanceRouteExecution(row.route_execution_id)}>继续行驶</RowActionButton>
        <RowActionButton type="default" onClick={() => actions.completeRouteExecutionTravelNow(row.route_execution_id)}>自动到达</RowActionButton>
      </RowActionGroup>
    );
  }
  if (row.execution_status === "ARRIVED") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => actions.submitNormalArrival(row.route_execution_id)}>正常到达</RowActionButton>
        <RowActionButton type="default" danger onClick={() => actions.openAbnormalArrivalModal(row)}>异常到达</RowActionButton>
      </RowActionGroup>
    );
  }
  return renderViewDetailAction(row, actions);
}

function renderRoutePlanningRunActions(row, actions) {
  if (row.result_route_id) {
    return <RowActionButton onClick={() => actions.viewGeneratedRoute(row)}>查看生成路径</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function renderSimulationRunActions(row, actions) {
  const sim = actions.simActions;
  if (!sim) return renderViewDetailAction(row, actions);
  const status = row.simulation_status;
  if (status === "READY") {
    return <RowActionButton onClick={() => sim.startSimulationRun(row.simulation_run_id)}>启动模拟</RowActionButton>;
  }
  if (status === "RUNNING") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => sim.pauseSimulationRun(row.simulation_run_id)} type="default">暂停</RowActionButton>
        <RowActionButton onClick={() => sim.stopSimulationRun(row.simulation_run_id)} danger>停止</RowActionButton>
      </RowActionGroup>
    );
  }
  if (status === "PAUSED") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => sim.resumeSimulationRun(row.simulation_run_id)}>继续</RowActionButton>
        <RowActionButton onClick={() => sim.stopSimulationRun(row.simulation_run_id)} danger>停止</RowActionButton>
      </RowActionGroup>
    );
  }
  if (["COMPLETED", "STOPPED", "FAILED"].includes(status)) {
    const costCalculating = row.cost_calculation_status === "CALCULATING";
    const revenueCalculating = row.revenue_calculation_status === "CALCULATING";
    return (
      <RowActionGroup>
        <RowActionButton type="default" onClick={() => actions.requestCostCalculation(row.simulation_run_id)} disabled={costCalculating}>
          {costCalculating ? "成本计算中" : row.cost_calculation_status ? "重新计算运营成本" : "计算运营成本"}
        </RowActionButton>
        <RowActionButton type="default" onClick={() => actions.requestRevenueCalculation(row.simulation_run_id)} disabled={revenueCalculating}>
          {revenueCalculating ? "收入生成中" : row.revenue_calculation_status ? "重新生成收入记录" : "生成收入记录"}
        </RowActionButton>
        {renderViewDetailAction(row, actions)}
      </RowActionGroup>
    );
  }
  return renderViewDetailAction(row, actions);
}

function renderServiceOrderActions(row, actions) {
  if (["WAITING_PRICE_ESTIMATE", "CREATED"].includes(row.order_status)) {
    return <RowActionButton onClick={() => actions.estimateServiceOrderPrice(row.service_order_id)}>价格预估</RowActionButton>;
  }
  if (["WAITING_ROBOTAXI_CALL", "WAITING_CUSTOMER_CONFIRM"].includes(row.order_status)) {
    return <RowActionButton onClick={() => actions.callRobotaxiForServiceOrder(row.service_order_id)}>立即呼叫 Robotaxi</RowActionButton>;
  }
  if (["WAITING_ROBOTAXI_ASSIGNMENT", "ROBOTAXI_ASSIGNMENT_FAILED", "WAITING_FOR_VEHICLE", "MATCH_FAILED", "MATCHING_FAILED"].includes(row.order_status)) {
    return <RowActionButton onClick={() => actions.matchServiceOrder(row.service_order_id)}>分配 Robotaxi</RowActionButton>;
  }
  if (["ON_THE_WAY_PICKUP", "WAITING_CUSTOMER_BOARDING", "CUSTOMER_ONBOARD", "ON_THE_WAY_DESTINATION", "ARRIVED_DESTINATION", "VEHICLE_ASSIGNED", "VEHICLE_ON_THE_WAY_TO_PICKUP", "WAITING_PASSENGER_BOARDING", "PASSENGER_ONBOARD", "ON_THE_WAY_TO_DESTINATION"].includes(row.order_status)) {
    if (row.trip_id) {
      return <RowActionButton onClick={() => actions.viewTripForServiceOrder(row)}>查看履约行驶</RowActionButton>;
    }
    return <RowActionButton onClick={() => actions.createTripForOrder(row.service_order_id)}>创建履约行驶</RowActionButton>;
  }
  if (row.order_status === "SETTLING") {
    return <RowActionButton onClick={() => actions.settleServiceOrder(row.service_order_id, row)}>结算</RowActionButton>;
  }
  if (row.order_status === "WAITING_PAYMENT") {
    return <RowActionButton onClick={() => actions.payServiceOrder(row.service_order_id)}>立即支付</RowActionButton>;
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
    ARRIVED_DESTINATION: "客户下车",
  };
  if (row.trip_status === "ON_THE_WAY_PICKUP") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => actions.advanceTrip(row.trip_id)}>继续行驶</RowActionButton>
        <RowActionButton type="default" onClick={() => actions.completeTripTravelNow(row.trip_id)}>自动到达</RowActionButton>
        <RowActionButton type="default" danger onClick={() => actions.replanTripRouteException(row.trip_id)}>路径异常</RowActionButton>
      </RowActionGroup>
    );
  }
  if (row.trip_status === "ON_THE_WAY_DESTINATION") {
    return (
      <RowActionGroup>
        <RowActionButton onClick={() => actions.advanceTrip(row.trip_id)}>继续行驶</RowActionButton>
        <RowActionButton type="default" onClick={() => actions.completeTripTravelNow(row.trip_id)}>自动到达</RowActionButton>
        <RowActionButton type="default" onClick={() => actions.replanTripDestination(row.trip_id)}>变更目的地</RowActionButton>
        <RowActionButton type="default" danger onClick={() => actions.replanTripRouteException(row.trip_id)}>路径异常</RowActionButton>
      </RowActionGroup>
    );
  }
  const label = actionLabelByStatus[row.trip_status];
  if (label) {
    return <RowActionButton onClick={() => actions.advanceTrip(row.trip_id)}>{label}</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function createDirectFleetOperationTaskFields(robotaxi, taskType) {
  const commonFields = {
    trigger_source: "DIRECT_ROBOTAXI_OPERATION",
    target_ops_center_id: null,
  };
  if (taskType === taskTypes.TaskType.CLEANING) {
    return {
      ...commonFields,
      clean_level_before: robotaxi.cleanliness_status || "NEEDS_CLEANING",
      clean_level_after: "CLEAN",
    };
  }
  if (taskType === taskTypes.TaskType.CHARGING) {
    return {
      ...commonFields,
      robotaxi_current_battery_kwh: robotaxi.current_battery_kwh ?? null,
      robotaxi_battery_capacity_kwh: robotaxi.battery_capacity_kwh ?? null,
      battery_percent_before: robotaxi.battery_percent ?? null,
      target_battery_percent: 100,
    };
  }
  if (taskType === taskTypes.TaskType.MAINTENANCE) {
    return {
      ...commonFields,
      maintenance_type: "GENERAL",
      requires_readiness_check: true,
    };
  }
  if (taskType === taskTypes.TaskType.FAILURE_HANDLING) {
    return {
      ...commonFields,
      failure_type: robotaxi.failure_type || "GENERAL",
      failure_severity: robotaxi.failure_severity || "MEDIUM",
      allow_current_service_completion: true,
    };
  }
  if (taskType === taskTypes.TaskType.RETIREMENT) {
    return {
      ...commonFields,
      retirement_reason: "MANUAL_REVIEW",
      approval_status: "PENDING",
    };
  }
  return commonFields;
}

function normalizePolicyParameterValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "" || value === null || value === undefined) return value;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && String(value).trim() !== "" ? numberValue : value;
}

function renderAbnormalArrivalModalBody(execution, data, abnormalArrivalType, setAbnormalArrivalType) {
  if (!execution) return null;
  const robotaxi = data?.robotaxis?.find((item) => item.robotaxi_id === execution.robotaxi_id);
  const route = data?.routes?.find((item) => item.route_id === execution.route_id);
  const currentLocation = data ? getLocationInfo(execution.current_cell_id, data) : { summary: "无", detail: null };
  const originLocation = data ? getLocationInfo(execution.origin_cell_id, data) : { summary: "无", detail: null };
  const targetLocation = data ? getLocationInfo(execution.target_cell_id, data) : { summary: "无", detail: null };
  return (
    <div className="abnormal-modal-body">
      <Descriptions column={1} size="small" colon={false}>
        <Descriptions.Item label="Robotaxi 编号">{execution.robotaxi_id}</Descriptions.Item>
        <Descriptions.Item label="Robotaxi 状态">{getDisplayValue(robotaxi?.motion_status) || "无"}</Descriptions.Item>
        <Descriptions.Item label="行驶记录编号">{execution.route_execution_id}</Descriptions.Item>
        <Descriptions.Item label="当前路径">{route ? summarizeRoute(route) : execution.route_id}</Descriptions.Item>
        <Descriptions.Item label="路径起点">{originLocation.summary}</Descriptions.Item>
        <Descriptions.Item label="路径终点">{targetLocation.summary}</Descriptions.Item>
        <Descriptions.Item label="当前位置">{currentLocation.summary}</Descriptions.Item>
      </Descriptions>
      <div className="abnormal-field">
        <span>异常类型</span>
        <Select
          size="small"
          value={abnormalArrivalType}
          getPopupContainer={() => document.body}
          listHeight={280}
          onChange={setAbnormalArrivalType}
          options={[
            taskTypes.ArrivalExecutionResult.ARRIVED_WITH_TARGET_OCCUPIED,
            taskTypes.ArrivalExecutionResult.ARRIVED_WITH_TARGET_BLOCKED,
            taskTypes.ArrivalExecutionResult.ARRIVED_WITH_NO_AVAILABLE_STOPPING_CELL,
            taskTypes.ArrivalExecutionResult.ARRIVED_WITH_NO_AVAILABLE_PARKING_CELL,
            taskTypes.ArrivalExecutionResult.TARGET_SERVICE_AREA_UNAVAILABLE,
            taskTypes.ArrivalExecutionResult.UNKNOWN,
          ].map((value) => ({ value, label: getDisplayValue(value) }))}
        />
      </div>
    </div>
  );
}

function renderDetailValue(key, value, row = null) {
  if (key === "result") {
    const passed = value === "PASS";
    return <Tag color={passed ? "success" : "error"}>{getDisplayValue(value)}</Tag>;
  }
  if (key === "pending_task_queue" && Array.isArray(value)) {
    return <Text className="detail-value">{formatRobotaxiQueueItems(value)}</Text>;
  }
  if (key === "source_objects" && Array.isArray(value)) {
    return <Text className="detail-value">{value.map(metricObjectPresentationService.getMetricSourceObjectLabel).join(" / ") || "无"}</Text>;
  }
  if (key === "source_fields" && Array.isArray(value)) {
    return <Text className="detail-value">{value.map(getFieldLabel).join(" / ") || "无"}</Text>;
  }
  if (isStatusField(key)) {
    return <StatusValue value={value} label={getFieldDisplayValue(key, value ?? "", row)} />;
  }
  if (isLocationDetailKey(key) && value && typeof value === "object") {
    return <CompactLocationDetail value={value} />;
  }
  if (key === "route_steps" && Array.isArray(value)) {
    return <RouteStepsDetail routeSteps={value} />;
  }
  if (key === "route_links_detail" && Array.isArray(value)) {
    return <RouteLinksDetail routes={value} />;
  }
  if (key === "simulation_time_world_summary") {
    return <SimulationTimeWorldSummary row={row} />;
  }
  if (key === "profile_calculation_steps") {
    return <DemandProfileCalculationSteps steps={value} />;
  }
  if (key === "profile_field_explanations") {
    return <DemandProfileFieldExplanations explanations={value} />;
  }
  if ((Array.isArray(value) || (value && typeof value === "object"))) {
    return <StructuredDetailValue value={value} fieldKey={key} />;
  }
  return <Text className="detail-value">{formatDetailValue(value, key, row) || "无"}</Text>;
}

function DemandProfileCalculationSteps({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return <Text className="detail-value">暂无计算过程</Text>;
  }
  return (
    <div className="structured-detail-groups">
      {steps.map((step, index) => (
        <details className="structured-detail-group" key={`${step.step_name || "step"}-${index}`} open={index === 0}>
          <summary>
            <span>{step.step_name || `步骤 ${index + 1}`}</span>
            <span>{formatDemandProfileCalculationOutput(step) || "无结果"}</span>
          </summary>
          <div className="structured-detail-group-body">
            <dl className="structured-detail-fields">
              <div className="structured-detail-field">
                <dt>{getFieldLabel("formula")}</dt>
                <dd>{step.formula || "无"}</dd>
              </div>
              <div className="structured-detail-field">
                <dt>{getFieldLabel("input_values")}</dt>
                <dd><StructuredDetailNode value={step.input_values || {}} fieldKey="input_values" /></dd>
              </div>
              <div className="structured-detail-field">
                <dt>{getFieldLabel("output_value")}</dt>
                <dd>{formatDemandProfileCalculationOutput(step) || "无"}</dd>
              </div>
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}

function DemandProfileFieldExplanations({ explanations }) {
  const entries = Object.entries(explanations || {});
  if (entries.length === 0) return <Text className="detail-value">暂无字段解释</Text>;
  return (
    <div className="structured-detail-groups">
      {entries.map(([fieldKey, explanation]) => (
        <details className="structured-detail-group" key={fieldKey}>
          <summary>
            <span>{getStructuredKeyLabel(fieldKey)}</span>
            <span>{explanation?.calculation_logic ? "含计算逻辑" : "配置说明"}</span>
          </summary>
          <div className="structured-detail-group-body">
            <dl className="structured-detail-fields">
              {explanation?.meaning && (
                <div className="structured-detail-field">
                  <dt>{getFieldLabel("meaning")}</dt>
                  <dd>{explanation.meaning}</dd>
                </div>
              )}
              {explanation?.source && (
                <div className="structured-detail-field">
                  <dt>{getFieldLabel("source")}</dt>
                  <dd>{explanation.source}</dd>
                </div>
              )}
              {explanation?.calculation_logic && (
                <div className="structured-detail-field">
                  <dt>{getFieldLabel("calculation_logic")}</dt>
                  <dd>{explanation.calculation_logic}</dd>
                </div>
              )}
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}

function isLocationDetailKey(key) {
  return ["location_context", "origin_location_detail", "target_location_detail", "current_location_detail"].includes(key);
}

function CompactLocationDetail({ value }) {
  const rows = [
    ["网格", value.current_cell_id],
    ["地图", value.related_map],
    ["服务区", value.related_service_areas],
    ["地点", value.related_places],
    ["道路片段", value.related_road_segments],
    ["道路", value.related_roads],
    ["运营区域", value.related_zones],
    ["运营中心", value.related_ops_centers],
  ].filter(([, itemValue]) => hasRelation(itemValue));

  if (rows.length === 0) return <Text className="detail-value">无</Text>;

  return (
    <div className="compact-location-detail">
      {rows.slice(0, 4).map(([label, itemValue]) => (
        <span key={label}>{label}: {formatDetailValue(itemValue, label)}</span>
      ))}
      {rows.length > 4 && (
        <details>
          <summary>更多位置关联</summary>
          {rows.slice(4).map(([label, itemValue]) => (
            <div key={label}>{label}: {formatDetailValue(itemValue, label)}</div>
          ))}
        </details>
      )}
    </div>
  );
}

function RouteStepsDetail({ routeSteps }) {
  if (!routeSteps || routeSteps.length === 0) return <Text className="detail-value">无路径步骤</Text>;
  const firstCellId = routeSteps[0]?.cell_id || "未知起点";
  const lastCellId = routeSteps[routeSteps.length - 1]?.cell_id || "未知终点";
  const movementSteps = routeSteps.slice(1);

  return (
    <div className="compact-location-detail">
      <span>移动 {movementSteps.length} 步：{firstCellId} → {lastCellId}</span>
      <details>
        <summary>查看移动步骤</summary>
        <div className="route-step-list">
          {movementSteps.map((step, index) => (
            <div key={`${step.step_index}-${step.cell_id}`}>
              {index + 1} → {step.cell_id} → {step.road_segment_id || "无道路片段"} → {getDisplayValue(step.direction) || "未知方向"} → {step.distance_km ?? 0} km
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function RouteLinksDetail({ routes }) {
  if (!routes || routes.length === 0) return <Text className="detail-value">无关联路径</Text>;
  return (
    <div className="route-link-summary-list">
      {routes.map((route, index) => (
        <div className="route-link-summary" key={`${route.route_id}-${index}`}>
          <div className="route-link-summary-head">
            <strong>{route.is_current_route ? "当前路径" : `关联路径 ${index + 1}`}</strong>
            <span>{formatDetailValue(route.route_id, "route_id")}</span>
          </div>
          <div className="route-link-summary-grid">
            <span>起点: {formatDetailValue(route.origin_cell_id, "origin_cell_id")}</span>
            <span>终点: {formatDetailValue(route.target_cell_id, "target_cell_id")}</span>
            <span>移动步数: {formatDetailValue(route.route_step_count, "route_step_count")}</span>
            <span>总距离: {formatDetailValue(route.total_distance_km, "total_distance_km")} km</span>
            <span>策略: {formatDetailValue(route.route_strategy_id, "route_strategy_id")}</span>
            <span>状态: {getDisplayValue(route.route_status) || "无"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimulationTimeWorldSummary({ row }) {
  if (!row) return <Text className="detail-value">无</Text>;
  const tickSeconds = Number(row.tick_seconds || 0);
  const currentSeconds = Number(row.current_simulation_seconds ?? row.simulation_start_seconds ?? 0);
  return (
    <div className="compact-location-detail">
      <span>统一时间源: 模拟绝对秒 {formatDetailValue(currentSeconds, "current_simulation_seconds")}</span>
      <span>当前显示时间: {formatDetailValue(row.current_time, "current_time")}</span>
      <span>Tick 推进: 每次 {formatDetailValue(tickSeconds, "tick_seconds")} 秒</span>
      <span>计划范围: {formatDetailValue(row.simulation_start_at, "simulation_start_at")} → {formatDetailValue(row.planned_simulation_end_at, "planned_simulation_end_at")}</span>
    </div>
  );
}

function StructuredDetailValue({ value, fieldKey }) {
  const empty = Array.isArray(value)
    ? value.length === 0
    : !value || Object.keys(value).length === 0;
  if (empty) return <Text className="detail-value">无</Text>;

  return (
    <details className="structured-detail">
      <summary>
        <span className="structured-detail-summary">{summarizeStructuredValue(value)}</span>
        <span className="structured-detail-action structured-detail-action-closed">展开</span>
        <span className="structured-detail-action structured-detail-action-open">收起</span>
      </summary>
      <div className="structured-detail-body">
        <StructuredDetailNode value={value} fieldKey={fieldKey} />
      </div>
    </details>
  );
}

function StructuredDetailNode({ value, fieldKey }) {
  if (value === null || typeof value !== "object") {
    return <div className="structured-value-list"><span>{formatStructuredScalar(value, fieldKey)}</span></div>;
  }
  if (Array.isArray(value)) {
    const complexItems = value.some((item) => item && typeof item === "object");
    if (!complexItems) {
      return (
        <div className="structured-value-list">
          {value.map((item, index) => (
            <span key={`${fieldKey}-${index}`}>{formatStructuredScalar(item, fieldKey)}</span>
          ))}
        </div>
      );
    }
    return (
      <div className="structured-detail-groups">
        {value.map((item, index) => (
          <details className="structured-detail-group" key={`${fieldKey}-${index}`}>
            <summary>
              <span>{getStructuredItemTitle(item, index)}</span>
              <span>{summarizeStructuredValue(item)}</span>
            </summary>
            <div className="structured-detail-group-body">
              <StructuredDetailNode value={item} fieldKey={fieldKey} />
            </div>
          </details>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value || {}).filter(([, itemValue]) => itemValue !== undefined);
  const scalarEntries = entries.filter(([, itemValue]) => !itemValue || typeof itemValue !== "object");
  const complexEntries = entries.filter(([, itemValue]) => itemValue && typeof itemValue === "object");

  return (
    <>
      {scalarEntries.length > 0 && (
        <dl className="structured-detail-fields">
          {scalarEntries.map(([key, itemValue]) => (
            <div className="structured-detail-field" key={key}>
              <dt>{getStructuredKeyLabel(key)}</dt>
              <dd>{formatStructuredScalar(itemValue, key, value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {complexEntries.length > 0 && (
        <div className="structured-detail-groups">
          {complexEntries.map(([key, itemValue]) => (
            <details className="structured-detail-group" key={key}>
              <summary>
                <span>{getStructuredKeyLabel(key)}</span>
                <span>{summarizeStructuredValue(itemValue)}</span>
              </summary>
              <div className="structured-detail-group-body">
                <StructuredDetailNode value={itemValue} fieldKey={key} />
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}

function summarizeStructuredValue(value) {
  if (Array.isArray(value)) return `共 ${value.length} 项`;
  if (!value || typeof value !== "object") return formatStructuredScalar(value);
  const entries = Object.entries(value).filter(([, itemValue]) => itemValue !== null && itemValue !== undefined);
  const nameKey = ["policy_name", "profile_name", "strategy_name", "simulation_name", "name"].find((key) => value[key]);
  const enabledCount = entries.filter(([, itemValue]) => itemValue === true).length;
  const parts = [];
  if (nameKey) parts.push(formatStructuredScalar(value[nameKey], nameKey, value));
  parts.push(`${entries.length} 项`);
  if (enabledCount > 0) parts.push(`启用 ${enabledCount} 项`);
  return parts.join(" · ");
}

function getStructuredItemTitle(item, index) {
  if (!item || typeof item !== "object") return `第 ${index + 1} 项`;
  const key = [
    "policy_name", "profile_name", "strategy_name", "simulation_name", "name",
    "time_window", "demand_profile_id", "route_id", "task_id", "event_id",
  ].find((candidate) => item[candidate]);
  return key ? formatStructuredScalar(item[key], key, item) : `第 ${index + 1} 项`;
}

function formatStructuredScalar(value, key = null, row = null) {
  if (value === null || value === undefined || value === "") return "无";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(getFieldDisplayValue(key, value, row));
}

function getStructuredKeyLabel(key) {
  if (/^[A-Z][A-Z0-9_]*$/.test(String(key || ""))) {
    const enumLabel = getDisplayValue(key);
    if (enumLabel !== key) return enumLabel;
  }
  const fieldLabel = getFieldLabel(key);
  return fieldLabel || "未定义字段";
}

function summarizeObject(value) {
  const enabled = Object.entries(value)
    .filter(([, itemValue]) => itemValue === true)
    .map(([key]) => getStructuredKeyLabel(key));
  if (enabled.length > 0) return enabled.join(", ");
  const entries = Object.entries(value)
    .filter(([, itemValue]) => itemValue !== null && itemValue !== undefined && itemValue !== false)
    .map(([key, itemValue]) => `${getStructuredKeyLabel(key)}: ${getFieldDisplayValue(key, itemValue, value)}`);
  return entries.length > 0 ? entries.join("; ") : "无";
}

function formatDetailValue(value, key, parentRow = null) {
  if (key === "route_detail" && value && typeof value === "object") return summarizeRouteDetail(value);
  if (key === "route_steps" && Array.isArray(value)) return summarizeRouteSteps(value);
  if (key === "route_history" && Array.isArray(value)) return summarizeRouteHistory(value);
  if (Array.isArray(value)) {
    if (value.some((item) => item && typeof item === "object")) {
      return value.map((item) => summarizeRecord(item)).join("；");
    }
    return value.map((item) => formatDetailValue(item, key, parentRow)).join(", ");
  }
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([itemKey, itemValue]) => `${getStructuredKeyLabel(itemKey)}: ${formatDetailValue(itemValue, itemKey, value)}`)
      .join("; ");
  }
  return String(getFieldDisplayValue(key, value ?? "", parentRow));
}

function getFieldDisplayValue(key, value, row = null) {
  if (key === "direction" && value === "UNKNOWN") return "未知方向";
  if (key === "check_result" && value === "FAILED") return "检查不通过";
  if (key === "event_result" && value === "FAILED") return "失败";
  if (["place_period_growth_rate", "zone_period_growth_rate"].includes(key)) return formatDemandProfileGrowthRate(value);
  if (isStatusField(key)) return getStatusDisplayValue(key, value, row);
  return getDisplayValue(value, key);
}

function formatDemandProfileGrowthRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `${(numeric * 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%`
    : "无";
}

function formatDemandProfileCalculationOutput(step = {}) {
  return String(step.step_name || "").includes("增长率")
    ? formatDemandProfileGrowthRate(step.output_value)
    : formatDetailValue(step.output_value, "output_value");
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
  return Object.entries(record)
    .slice(0, 3)
    .map(([itemKey, itemValue]) => `${getStructuredKeyLabel(itemKey)}: ${formatDetailValue(itemValue, itemKey, record)}`)
    .join("，");
}

function isStatusField(key) {
  return [
    "task_status",
    "execution_status",
    "current_task_status",
    "current_execution_status",
    "availability_status",
    "fleet_operation_status",
    "motion_status",
    "worker_status",
    "route_status",
    "ops_center_status",
    "zone_status",
    "road_status",
    "node_status",
    "segment_status",
    "service_area_status",
    "place_status",
    "strategy_status",
    "status",
    "result",
    "planning_result",
    "simulation_result",
    "run_result",
    "pricing_result",
    "decision_result",
    "customer_status",
    "order_status",
    "trip_status",
    "payment_status",
    "simulation_status",
    "business_timing_calculation_status",
    "calculation_status",
    "metric_status",
    "data_readiness",
    "quality_status",
    "metric_calculation_status",
    "cost_calculation_status",
    "revenue_calculation_status",
    "policy_status",
    "profile_status",
    "rule_status",
    "event_result",
    "event_source",
  ].includes(key);
}

function getStatusDisplayValue(key, value, row = null) {
  if (!value) return "无";
  if (key === "task_status" || key === "current_task_status") {
    const fleetTaskLabel = getFleetOperationStatusDisplay(row?.task_type || row?.current_task_type, value);
    if (fleetTaskLabel) return fleetTaskLabel;
  }
  if (key === "customer_status" && value === "ACTIVE") return "可参与订单模拟";
  if (key === "customer_status" && value === "TEST_ONLY") return "仅测试使用";
  if (key === "customer_status" && value === "INACTIVE") return "不参与订单模拟";
  if (key === "customer_status" && value === "BLOCKED") return "被限制下单";
  if (key === "order_status" && value === "FAILED") return "订单失败";
  if (key === "payment_status" && value === "FAILED") return "支付失败";
  if (key === "run_status" && row?.robotaxi_task_planning_run_id) {
    if (value === "SUCCEEDED") return "规划成功";
    if (value === "REJECTED") return "规划拒绝";
    if (value === "FAILED") return "规划失败";
  }
  if (value === "WAITING_START" && (key === "execution_status" || key === "current_execution_status" || row?.status_context === "routeExecution")) return "待行驶";
  if (value === "WAITING_START" && isDeploymentLike(row)) return "待行驶";
  if (value === "MOVING" && (key === "execution_status" || key === "current_execution_status" || row?.status_context === "routeExecution" || isDeploymentLike(row))) return "行驶中";
  return getDisplayValue(value, key);
}

function getFleetOperationStatusDisplay(taskType, status) {
  if (status === "WAITING_ROBOTAXI_AVAILABLE") return "任务排队中";
  if (status === "WAITING_DESTINATION_ASSIGNMENT" && taskType === "CLEANING") return "待分配清洁站";
  if (status === "WAITING_CHARGING_DESTINATION_ASSIGNMENT" && taskType === "CHARGING") return "待分配充电站";
  if (status === "WAITING_MAINTENANCE_DESTINATION_ASSIGNMENT" && taskType === "MAINTENANCE") return "待分配维修站";
  if (status === "WAITING_ROUTE") return "待行驶";
  if (["MOVING_TO_OPS_CENTER", "MOVING_TO_CHARGER", "MOVING_TO_MAINTENANCE_CENTER"].includes(status)) return "前往目的地";
  if (["ARRIVED_OPS_CENTER", "ARRIVED_CHARGER", "ARRIVED_MAINTENANCE_CENTER"].includes(status)) return "已到达目的地";
  if (["WAITING_WORKER_ASSIGNMENT", "WAITING_RESOURCE_ASSIGNMENT", "WAITING_CHARGER_ASSIGNMENT", "WAITING_DIAGNOSIS_ASSIGNMENT"].includes(status)) return "待分配 Worker";
  if (status === "ARRIVAL_ABNORMAL") return "异常到达";
  if (status === "READY_TO_CLEAN") return "待清洁";
  if (status === "READY_TO_START" && taskType === "CLEANING") return "待清洁（兼容）";
  if (status === "READY_TO_REPAIR") return "待维修";
  if (status === "READY_TO_START" && taskType === "MAINTENANCE") return "待维修（兼容）";
  if (status === "READY_TO_CHARGE") return "待充电";
  if (status === "READY_TO_DISCONNECT") return "待拔充电头";
  if (status === "CLEANING") return "清洁中";
  if (status === "CLEANING_IN_PROGRESS") return "清洁中（兼容）";
  if (status === "REPAIRING") return "维修中";
  if (status === "MAINTENANCE_IN_PROGRESS") return "维修中（兼容）";
  if (status === "CHARGING") return "充电中";
  return null;
}

function isDeploymentLike(row) {
  return row?.status_context === "deployment" || row?.task_type === "DEPLOYMENT" || row?.current_task_type === "DEPLOYMENT" || String(row?.task_id || "").startsWith("TASK-DP-");
}

function getColumnWidth(key, rows = []) {
  const labelLength = estimateCellTextLength(getFieldLabel(key));
  const sampleRows = Array.isArray(rows) ? rows.slice(0, 80) : [];
  const contentLength = sampleRows.reduce((max, row) => Math.max(max, estimateCellTextLength(row?.[key])), 0);
  const estimatedWidth = Math.ceil(Math.max(labelLength, contentLength) * 12) + 36;
  const [minWidth, maxWidth] = getColumnWidthBounds(key);
  return clampNumber(estimatedWidth, minWidth, maxWidth);
}

function getColumnWidthBounds(key) {
  if (key === "actions") return [120, 520];
  if (key.endsWith("_ids") || key === "cell_ids" || key === "cell_sequence" || key === "road_segment_sequence") return [220, 520];
  if (key.endsWith("_snapshot") || key.endsWith("_detail") || key.endsWith("_parameters") || key === "message") return [260, 560];
  if (key.endsWith("_rule") || key === "route_update_rule" || key === "candidate_filter_rule") return [240, 460];
  if (key.includes("description") || key.includes("reason") || key.includes("summary")) return [220, 460];
  if (key.includes("time") || key.endsWith("_at") || key.endsWith("_date")) return [168, 260];
  if (key.includes("status") || key.includes("type") || key.includes("result") || key.includes("phase")) return [148, 260];
  if (key.includes("name") || key === "rule_name" || key === "strategy_name") return [180, 360];
  if (key.endsWith("_id") || key === "id") return [168, 300];
  if (key.includes("count") || key.includes("percent") || key.includes("amount") || key.includes("score") || key.includes("distance")) return [132, 240];
  return [132, 340];
}

function estimateCellTextLength(value) {
  if (value == null || value === "") return 2;
  if (Array.isArray(value)) return Math.min(80, value.map((item) => estimateCellTextLength(item)).reduce((sum, length) => sum + length + 2, 0));
  if (typeof value === "object") return Math.min(80, Object.entries(value).slice(0, 8).reduce((sum, [entryKey, entryValue]) => sum + String(entryKey).length + estimateCellTextLength(entryValue) + 2, 0));
  return Math.min(80, String(value).length);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createPlaceTypeByCellId(places) {
  const placeTypeByCellId = new Map();
  places.forEach((place) => {
    place.cell_ids.forEach((cellId) => placeTypeByCellId.set(cellId, place.place_type));
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
    return route.route_steps.map((step) => step.cell_id);
  }
  const segmentById = new Map(roadSegments.map((segment) => [segment.road_segment_id, segment]));
  return route.road_segment_sequence.flatMap((segmentId) => segmentById.get(segmentId)?.cell_sequence || []);
}

function parseCellId(cellId) {
  const [, row, col] = cellId.split("-");
  return {
    row: Number(row),
    col: Number(col),
  };
}

async function bootstrap() {
  const [
    mapInitialization,
    mapValidation,
    operationsCenterInitialization,
    customerInitialization,
    demandSimulationInitialization,
    pricingInitialization,
    orderMatchingInitialization,
    operationsCenterValidation,
    customerValidation,
    demandSimulationValidation,
    serviceOrderValidation,
    pricingValidation,
    orderMatchingValidation,
    tripValidation,
    demandSimulationEngine,
    pricingEngine,
    orderMatchingEngine,
    serviceOrderTypeModule,
    pricingTypeModule,
    orderMatchingTypeModule,
    tripTypeModule,
    cellContext,
    fieldDictionary,
    readinessTaskValidation,
    deploymentTaskValidation,
    taskTypeModule,
    serviceOrderSettlementModule,
		    serviceOrderServiceModule,
		    tripServiceModule,
		    simulationTypesModule,
		    simulationInitializationModule,
		    simulationEngineModule,
		    simulationActionsModule,
		    simulationLoopModule,
		    simulationHandlersModule,
		    simulationWorkflowEngineModule,
		    simulationExecutionEngineModule,
		    businessTimingCalculatorModule,
		    costModelCalculatorModule,
		    revenueCalculatorModule,
		    metricCalculatorModule,
		    operatingDataPoolServiceModule,
		    simulationRunBusinessScopeModule,
		    routePlanningServiceModule,
		    statusRegistryModule,
		    routePlanningStrategiesModule,
		    timedOperationDiagnosticsModule,
		    businessActionServiceModule,
		    robotaxiTaskPriorityServiceModule,
		    fleetOperationTaskServiceModule,
		    fleetOperationPolicyServiceModule,
		    fleetOperationDispatchServiceModule,
		    taskDispatchStrategyServiceModule,
		    robotaxiTaskPlanningServiceModule,
		    businessPlanningServiceModule,
		    operatingPlanningServiceModule,
		    supplyDemandBalanceServiceModule,
		    supplyManagementInitializationModule,
		    spatialBusinessProfileInitializationModule,
		    platformExperienceModule,
		    robotaxiMapProjectionModule,
		    responsiveViewportModule,
		    spatialCatalogServiceModule,
		    mapSceneServiceModule,
		    pageContextServiceModule,
		    dataChartServiceModule,
		    metricObjectPresentationServiceModule,
		    navigationRegistryModule,
		    pageArchitectureRegistryModule,
		    operatingModelServiceModule,
		    decisionControlServiceModule,
		    releaseHistoryModule,
		    projectReadmeModule,
		    publicDemoBootstrapServiceModule,
		    releaseFreshnessServiceModule,
		  ] = await Promise.all([
    import("./data/mapInitialization.js?v=20260712-v042-0-0"),
    import("./data/mapValidation.js?v=20260712-v042-0-0"),
    import("./data/operationsCenterInitialization.js?v=20260608-v018-bfs-route-planning"),
    import("./data/customerInitialization.js?v=20260611-v019-1-customer"),
    import("./data/demandSimulationInitialization.js?v=20260611-v019-2-demand-simulation"),
    import("./data/pricingInitialization.js?v=20260611-v019-4-pricing"),
    import("./data/orderMatchingInitialization.js?v=20260611-v019-5-order-matching"),
    import("./data/operationsCenterValidation.js?v=20260608-v018-bfs-route-planning"),
    import("./data/customerValidation.js?v=20260611-v019-1-customer"),
    import("./data/demandSimulationValidation.js?v=20260611-v019-2-demand-simulation"),
    import("./data/serviceOrderValidation.js?v=20260614-v020-5-settlement"),
    import("./data/pricingValidation.js?v=20260611-v019-4-pricing"),
    import("./data/orderMatchingValidation.js?v=20260611-v019-5-order-matching"),
    import("./data/tripValidation.js?v=20260614-v020-4-trip-flow"),
    import("./data/demandSimulationEngine.js?v=20260611-v019-2-demand-simulation"),
    import("./data/pricingEngine.js?v=20260611-v019-4-pricing"),
    import("./data/orderMatchingEngine.js?v=20260611-v019-5-order-matching"),
    import("./domain/serviceOrderTypes.js?v=20260614-v020-5-settlement"),
    import("./domain/pricingTypes.js?v=20260611-v019-4-pricing"),
    import("./domain/orderMatchingTypes.js?v=20260611-v019-5-order-matching"),
    import("./domain/tripTypes.js?v=20260624-v028-1-5"),
    import("./data/cellContext.js?v=20260608-v018-bfs-route-planning"),
	    import("./domain/fieldDisplayService.js?v=20260717-v046-0-7"),
    import("./data/readinessCheckTaskValidation.js?v=20260608-v018-bfs-route-planning"),
    import("./data/deploymentTaskValidation.js?v=20260614-v020-6-route-execution"),
    import("./domain/taskTypes.js?v=20260614-v020-6-route-execution"),
	    import("./domain/serviceOrderSettlement.js?v=20260624-v028-1-5"),
	    import("./services/serviceOrderService.js?v=20260617-v023-1-service-extraction"),
	    import("./services/tripService.js?v=20260624-v028-1-5"),
		    import("./domain/simulationTypes.js?v=20260624-v028-1-2"),
		    import("./data/simulationInitialization.js?v=20260620-v027-4"),
			    import("./data/simulationEngine.js?v=20260630-v036-2"),
			    import("./services/simulationActions.js?v=20260630-v036-2"),
			    import("./data/simulationLoop.js?v=20260630-v036-1"),
			    import("./services/simulationHandlers.js?v=20260630-v036-3"),
		    import("./data/simulationWorkflowEngine.js?v=20260624-v028-1-1"),
		    import("./data/simulationExecutionEngine.js"),
		    import("./data/businessTimingCalculator.js?v=20260624-v028-1-3"),
		    import("./data/costModelCalculator.js?v=20260625-v029-1"),
		    import("./data/revenueCalculator.js?v=20260625-v029-1"),
		    import("./data/metricCalculator.js?v=20260717-v047-0-0"),
		    import("./services/operatingDataPoolService.js?v=20260717-v047-0-0"),
		    import("./data/simulationRunBusinessScope.js?v=20260625-v029-1"),
		    import("./services/routePlanningService.js?v=20260712-v042-0-0"),
		    import("./domain/statusRegistry.js?v=20260625-v030-1"),
		    import("./domain/routePlanningStrategies.js?v=20260625-v030-3"),
		    import("./data/timedOperationDiagnostics.js?v=20260630-v036-1"),
		    import("./services/businessActionService.js?v=20260716-v046-0-6"),
		    import("./services/robotaxiTaskPriorityService.js?v=20260702-v040-1"),
		    import("./services/fleetOperationTaskService.js?v=20260702-v039-7"),
		    import("./services/fleetOperationPolicyService.js?v=20260702-v038-0"),
		    import("./services/fleetOperationDispatchService.js?v=20260702-v039-0"),
		    import("./services/taskDispatchStrategyService.js?v=20260703-v040-9"),
		    import("./services/robotaxiTaskPlanningService.js?v=20260704-v040-14"),
		    import("./services/businessPlanningService.js?v=20260713-v043-0-0"),
		    import("./services/operatingPlanningService.js?v=20260716-v046-0-6"),
		    import("./services/supplyDemandBalanceService.js?v=20260712-v042-0-0"),
		    import("./data/supplyManagementInitialization.js?v=20260716-v046-0-6"),
		    import("./data/spatialBusinessProfileInitialization.js?v=20260713-v043-0-0"),
		    import("./ui/platformExperience.js?v=20260710-v041-2-15"),
		    import("./ui/robotaxiMapProjection.js?v=20260712-v042-0-1"),
		    import("./ui/responsiveViewport.js?v=20260711-v041-4-0"),
		    import("./services/spatialCatalogService.js?v=20260712-v042-0-0"),
		    import("./ui/mapSceneService.js?v=20260715-v044-4-0"),
		    import("./ui/pageContextService.js?v=20260717-v047-0-0"),
		    import("./ui/dataChartService.js?v=20260714-v043-0-1"),
		    import("./ui/metricObjectPresentationService.js?v=20260717-v047-0-0"),
		    import("./ui/navigationRegistry.js?v=20260717-v047-0-0"),
		    import("./ui/pageArchitectureRegistry.js?v=20260717-v047-0-0"),
		    import("./services/operatingModelService.js?v=20260717-v047-0-0"),
		    import("./services/decisionControlService.js?v=20260717-v046-0-7"),
		    import("./ui/releaseHistory.js?v=20260714-v043-0-1"),
		    import("./ui/projectReadme.js?v=20260714-v043-0-1"),
		    import("./services/publicDemoBootstrapService.js?v=20260715-v043-0-7"),
		    import("./ui/releaseFreshnessService.js?v=20260715-v043-0-7"),
		  ]);

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
		  metricCalculator = metricCalculatorModule;
		  operatingDataPoolService = operatingDataPoolServiceModule;
		  simulationRunBusinessScope = simulationRunBusinessScopeModule;
		  routePlanningService = routePlanningServiceModule;
		  statusRegistry = statusRegistryModule;
		  routePlanningStrategies = routePlanningStrategiesModule;
		  timedOperationDiagnostics = timedOperationDiagnosticsModule;
		  businessActionService = businessActionServiceModule;
		  robotaxiTaskPriorityService = robotaxiTaskPriorityServiceModule;
		  fleetOperationTaskService = fleetOperationTaskServiceModule;
		  fleetOperationPolicyService = fleetOperationPolicyServiceModule;
		  fleetOperationDispatchService = fleetOperationDispatchServiceModule;
		  taskDispatchStrategyService = taskDispatchStrategyServiceModule;
		  robotaxiTaskPlanningService = robotaxiTaskPlanningServiceModule;
		  businessPlanningService = businessPlanningServiceModule;
		  operatingPlanningService = operatingPlanningServiceModule;
		  supplyDemandBalanceService = supplyDemandBalanceServiceModule;
		  publicDemoBootstrapService = publicDemoBootstrapServiceModule;
		  initializeSupplyManagement = supplyManagementInitializationModule.initializeSupplyManagement;
		  initializeSpatialBusinessProfiles = spatialBusinessProfileInitializationModule.initializeSpatialBusinessProfiles;
		  normalizeDemandProfiles = spatialBusinessProfileInitializationModule.normalizeDemandProfiles;
		  splitDemandProfilesByTarget = spatialBusinessProfileInitializationModule.splitDemandProfilesByTarget;
		  updateDemandProfileConfig = spatialBusinessProfileInitializationModule.updateDemandProfileConfig;
		  platformExperience = platformExperienceModule;
		  robotaxiMapProjection = robotaxiMapProjectionModule;
		  responsiveViewport = responsiveViewportModule;
		  spatialCatalogService = spatialCatalogServiceModule;
		  mapSceneService = mapSceneServiceModule;
		  pageContextService = pageContextServiceModule;
		  dataChartService = dataChartServiceModule;
		  metricObjectPresentationService = metricObjectPresentationServiceModule;
		  navigationRegistry = navigationRegistryModule;
		  pageArchitectureRegistry = pageArchitectureRegistryModule;
		  operatingModelService = operatingModelServiceModule;
		  decisionControlService = decisionControlServiceModule;
		  pageGroups = navigationRegistry.navigationGroups;
		  menuGroupIcons = navigationRegistry.navigationIcons;
		  const navigationValidation = navigationRegistry.validateNavigationRegistry(Object.keys(tableConfig));
		  if (!navigationValidation.valid) throw new Error(`导航注册表校验失败：${navigationValidation.errors.join("；")}`);
		  const architectureValidation = pageArchitectureRegistry.validatePageArchitecture(navigationValidation.leafKeys);
		  if (!architectureValidation.valid) throw new Error(`页面架构校验失败：${architectureValidation.errors.join("；")}`);
  releaseHistory = releaseHistoryModule.releaseHistory;
  projectReadmeService = projectReadmeModule;
  releaseFreshnessService = releaseFreshnessServiceModule;

  // 注册 Simulation 业务处理器到 ExecutionEngine
  if (simulationExecutionEngineModule && simulationHandlersModule) {
    simulationExecutionEngineModule.registerActionHandlers({
      SERVICE_ORDER_CREATE: simulationHandlersModule.handleServiceOrderCreate,
      PRICING_EXECUTE: simulationHandlersModule.handlePricingExecute,
      ROBOTAXI_CALL: simulationHandlersModule.handleRobotaxiCall,
      ORDER_MATCHING_EXECUTE: simulationHandlersModule.handleOrderMatchingExecute,
      ORDER_AUTO_ASSIGNMENT_TICK: simulationHandlersModule.handleOrderAutoAssignmentTick,
      SERVICE_ORDER_CANCEL: simulationHandlersModule.handleServiceOrderCancel,
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
      ROUTE_EXECUTION_STEP: simulationHandlersModule.handleRouteExecutionTravelComplete,
      ROUTE_EXECUTION_TRAVEL_COMPLETE: simulationHandlersModule.handleRouteExecutionTravelComplete,
      ARRIVAL_CONFIRM: simulationHandlersModule.handleArrivalConfirm,
      TRIP_TRAVEL_COMPLETE: simulationHandlersModule.handleTripTravelComplete,
    });
  }

	  responsiveViewport.attachResponsiveViewport();
	  ReactDOM.createRoot(document.querySelector("#app")).render(<PlatformEntry />);
}

bootstrap();

function findNextCandidate(robotaxis, tasks) {
  return robotaxis.find((robotaxi) => isCandidateRobotaxi(robotaxi, tasks));
}

function isCandidateRobotaxi(robotaxi, tasks) {
  return ["PENDING_ADMISSION", "PENDING_INSPECTION"].includes(robotaxi.availability_status) && !tasks.some((task) =>
    task.robotaxi_id === robotaxi.robotaxi_id && unfinishedTaskStatuses.has(task.task_status)
  );
}

function isDeploymentCandidateRobotaxi(robotaxi, context = {}) {
  const deploymentTasks = Array.isArray(context) ? context : context.deploymentTasks || [];
  const hasOpenDeployment = deploymentTasks.some((task) =>
    task.robotaxi_id === robotaxi.robotaxi_id && unfinishedDeploymentStatuses.has(task.task_status)
  );
  if (hasOpenDeployment) return false;
  if (!robotaxiTaskPlanningService) {
    return robotaxi.availability_status === "AVAILABLE" && !robotaxi.current_order_id && !robotaxi.current_task_id;
  }
  return robotaxiTaskPlanningService.planRobotaxiTask({
    robotaxi,
    requestedAssignmentType: robotaxiTaskPlanningService.TaskPlanningAssignmentType.DEPLOYMENT_TASK,
    requestedTaskType: taskTypes.TaskType.DEPLOYMENT,
    triggerSource: "DEPLOYMENT_TASK_CREATE",
    readinessTasks: context.readinessTasks || [],
    deploymentTasks,
    serviceOrders: context.serviceOrders || [],
    fleetOperationTasks: context.fleetOperationTasks || [],
    strategy: context.planningStrategy,
  }).allowed;
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
    strategyId: options.strategyId || taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
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
    strategyId: options.strategyId,
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
    routePlanningRunId,
  });
}

function createSingleCellRouteSteps(data, cellId) {
  if (!cellId) return [];
  return [{
    step_index: 0,
    cell_id: cellId,
    road_segment_id: findRoadSegmentIdByCell(data, cellId),
    road_node_id: data.roadNodes.find((node) => node.cell_id === cellId)?.road_node_id || null,
    direction: "UNKNOWN",
    distance_km: 0,
    is_origin_step: true,
    is_target_step: true,
  }];
}

function mergeRouteStepPlans(stepPlans, data) {
  const mergedCellIds = [];
  stepPlans.forEach((steps) => {
    (steps || []).forEach((step) => {
      if (!step?.cell_id) return;
      if (mergedCellIds[mergedCellIds.length - 1] !== step.cell_id) {
        mergedCellIds.push(step.cell_id);
      }
    });
  });
  const cellById = new Map(data.cells.map((cell) => [cell.cell_id, cell]));
  return mergedCellIds.map((cellId, index) => {
    const nextCellId = mergedCellIds[index + 1];
    return {
      step_index: index,
      movement_step_index: index === 0 ? null : index,
      cell_id: cellId,
      road_segment_id: findRoadSegmentIdByCell(data, cellId),
      road_node_id: data.roadNodes.find((node) => node.cell_id === cellId)?.road_node_id || null,
      direction: nextCellId ? inferStepDirection(cellById.get(cellId), cellById.get(nextCellId)) : "UNKNOWN",
      distance_km: index === 0 ? 0 : (data.maps[0]?.cell_size_m || 50) / 1000,
      is_origin_step: index === 0,
      is_target_step: index === mergedCellIds.length - 1,
    };
  });
}

function findRoadSegmentIdByCell(data, cellId) {
  return data.roadSegments.find((segment) => (segment.cell_sequence || segment.cell_ids || []).includes(cellId))?.road_segment_id || null;
}

function createRouteHistoryEntry(route, routeChangeReason, arrivalExecutionResult) {
  return routePlanningService.createRouteHistoryEntryWithOptions(route, routeChangeReason, arrivalExecutionResult, {
    createdAt: now(),
    triggerType: taskTypes.TriggerType.MANUAL,
  });
}

function getAlternativeDeploymentTarget(data, serviceAreaId, excludedCellIds = []) {
  const serviceArea = data.serviceAreas.find((area) => area.service_area_id === serviceAreaId);
  const excluded = new Set(excludedCellIds.filter(Boolean));
  const alternativeCellId = getCandidateServiceAreaCellIds(serviceArea).find((cellId) => !excluded.has(cellId));
  if (!alternativeCellId) return null;
  return {
    target_cell_id: alternativeCellId,
    target_service_area_id: serviceArea.service_area_id,
    target_zone_id: data.zones.find((zone) => zone.service_area_ids?.includes(serviceArea.service_area_id))?.zone_id || null,
  };
}

function getAlternativeServiceOrderDestination(data, trip) {
  const excluded = new Set([
    trip.current_cell_id,
    trip.pickup_cell_id,
    trip.dropoff_cell_id,
    ...(Array.isArray(trip.route_history) ? trip.route_history.map((history) => history.target_cell_id) : []),
  ].filter(Boolean));
  const sameServiceArea = data.serviceAreas.find((area) => area.service_area_id === trip.dropoff_service_area_id);
  const sameAreaCell = (sameServiceArea?.dropoff_cell_ids || []).find((cellId) => !excluded.has(cellId));
  if (sameAreaCell) {
    return {
      target_cell_id: sameAreaCell,
      target_service_area_id: sameServiceArea.service_area_id,
    };
  }
  for (const serviceArea of data.serviceAreas) {
    const targetCellId = (serviceArea.dropoff_cell_ids || []).find((cellId) => !excluded.has(cellId));
    if (targetCellId) {
      return {
        target_cell_id: targetCellId,
        target_service_area_id: serviceArea.service_area_id,
      };
    }
  }
  return null;
}

function getCandidateServiceAreaCellIds(serviceArea) {
  if (!serviceArea) return [];
  return [
    ...(serviceArea.standby_cell_ids || []),
    ...(serviceArea.parking_cell_ids || []),
    ...(serviceArea.temp_stop_cell_ids || []),
    ...(serviceArea.pickup_cell_ids || []),
    ...(serviceArea.dropoff_cell_ids || []),
    ...(serviceArea.cell_ids || serviceArea.covered_cell_ids || []),
  ].filter((cellId, index, list) => cellId && list.indexOf(cellId) === index);
}

function createBfsRoutePlan(data, originCellId, targetCellId) {
  const cellById = new Map(data.cells.map((cell) => [cell.cell_id, cell]));
  const roadNodeByCellId = new Map(data.roadNodes.map((node) => [node.cell_id, node]));
  const graph = buildRoadCellGraph(data.roadSegments);
  const graphCellIds = [...graph.keys()];
  if (!originCellId || !targetCellId || graphCellIds.length === 0) {
    return { road_segment_sequence: [], route_steps: [] };
  }

  const originConnector = connectEndpointToGraph(originCellId, graph, cellById);
  const targetConnector = connectEndpointToGraph(targetCellId, graph, cellById);
  if (!originConnector || !targetConnector) {
    return { road_segment_sequence: [], route_steps: [] };
  }

  const graphPath = findBfsCellPath(graph, originConnector.graphCellId, targetConnector.graphCellId);
  if (graphPath.length === 0) {
    return { road_segment_sequence: [], route_steps: [] };
  }

  const targetConnectorCells = [...targetConnector.connectorCells].reverse().slice(1);
  const routeCellIds = [
    ...originConnector.connectorCells,
    ...graphPath.slice(1),
    ...targetConnectorCells,
  ].filter((cellId, index, list) => cellId && (index === 0 || cellId !== list[index - 1]));

  const routeSteps = routeCellIds.map((cellId, index) => {
    const nextCellId = routeCellIds[index + 1];
    const edge = nextCellId ? graph.get(cellId)?.find((item) => item.to === nextCellId) : null;
    const previousEdge = index > 0 ? graph.get(routeCellIds[index - 1])?.find((item) => item.to === cellId) : null;
    const roadNode = roadNodeByCellId.get(cellId);
    return {
      step_index: index,
      cell_id: cellId,
      road_segment_id: edge?.road_segment_id || previousEdge?.road_segment_id || null,
      road_node_id: roadNode?.road_node_id || null,
      direction: nextCellId ? inferStepDirection(cellById.get(cellId), cellById.get(nextCellId)) : "UNKNOWN",
      distance_km: index === 0 ? 0 : (data.maps[0]?.cell_size_m || 50) / 1000,
      is_origin_step: index === 0,
      is_target_step: index === routeCellIds.length - 1,
    };
  });

  return {
    road_segment_sequence: routeSteps
      .map((step) => step.road_segment_id)
      .filter((segmentId, index, list) => segmentId && list.indexOf(segmentId) === index),
    route_steps: routeSteps,
  };
}

function buildRoadCellGraph(roadSegments) {
  const graph = new Map();
  roadSegments
    .filter((segment) => segment.segment_status !== "BLOCKED" && segment.segment_status !== "CLOSED" && segment.allowed_direction !== "CLOSED")
    .forEach((segment) => {
      const cellSequence = segment.cell_sequence || segment.cell_ids || [];
      cellSequence.forEach((cellId) => ensureGraphNode(graph, cellId));
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
  if (graph.get(from).some((edge) => edge.to === to && edge.road_segment_id === roadSegmentId)) return;
  graph.get(from).push({ to, road_segment_id: roadSegmentId });
}

function connectEndpointToGraph(endpointCellId, graph, cellById) {
  if (graph.has(endpointCellId)) {
    return { graphCellId: endpointCellId, connectorCells: [endpointCellId] };
  }
  const endpointCell = cellById.get(endpointCellId);
  if (!endpointCell) return null;
  const nearestGraphCellId = [...graph.keys()]
    .map((cellId) => ({ cellId, distance: manhattanDistance(endpointCell, cellById.get(cellId)) }))
    .sort((a, b) => a.distance - b.distance)[0]?.cellId;
  if (!nearestGraphCellId) return null;
  const nearestGraphCell = cellById.get(nearestGraphCellId);
  return {
    graphCellId: nearestGraphCellId,
    connectorCells: createManhattanConnector(endpointCell, nearestGraphCell),
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
    (graph.get(current) || []).forEach((edge) => {
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
  data.routes.forEach((route) => {
    if (!route.route_strategy_id) return;
    const current = routeByStrategyId.get(route.route_strategy_id) || 0;
    routeByStrategyId.set(route.route_strategy_id, current + 1);
  });
  const runCountByStrategyId = new Map();
  routePlanningRuns.forEach((run) => {
    const routeStrategyId = run.route_strategy_id;
    if (!routeStrategyId) return;
    const current = runCountByStrategyId.get(routeStrategyId) || 0;
    runCountByStrategyId.set(routeStrategyId, current + 1);
  });
  return routePlanningStrategies.getRoutePlanningStrategies().map((strategy) => ({
    ...strategy,
    strategy_usage_count: Math.max(
      routeByStrategyId.get(strategy.route_strategy_id) || 0,
      runCountByStrategyId.get(strategy.route_strategy_id) || 0,
    ),
    route_planning_run_count: runCountByStrategyId.get(strategy.route_strategy_id) || 0,
  }));
}

function createDemandSimulationStrategyRows(data, demandSimulationRuns) {
  const runCountByStrategyId = new Map();
  const successCountByStrategyId = new Map();
  demandSimulationRuns.forEach((run) => {
    const strategyId = run.demand_simulation_strategy_id;
    if (!strategyId) return;
    runCountByStrategyId.set(strategyId, (runCountByStrategyId.get(strategyId) || 0) + 1);
    if (run.simulation_result === "SUCCESS") {
      successCountByStrategyId.set(strategyId, (successCountByStrategyId.get(strategyId) || 0) + 1);
    }
  });
  return (data.demandSimulationStrategies || []).map((strategy) => ({
    ...strategy,
    demand_simulation_run_count: runCountByStrategyId.get(strategy.demand_simulation_strategy_id) || 0,
    demand_simulation_success_count: successCountByStrategyId.get(strategy.demand_simulation_strategy_id) || 0,
  }));
}

function createDemandSimulationResultRows(demandSimulationRuns) {
  return (demandSimulationRuns || []).map((run) => ({
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
    created_at: run.created_at,
  }));
}

function getDemandSimulationResultId(runId) {
  const serial = String(runId || "").match(/\d+$/)?.[0] || "000";
  return `DSRES-${serial.padStart(3, "0")}`;
}

function createPricingStrategyRows(data, pricingStrategyRuns) {
  const runCountByStrategyId = new Map();
  pricingStrategyRuns.forEach((run) => {
    const strategyId = run.pricing_strategy_id;
    if (!strategyId) return;
    runCountByStrategyId.set(strategyId, (runCountByStrategyId.get(strategyId) || 0) + 1);
  });
  return (data.pricingStrategies || []).map((strategy) => ({
    ...strategy,
    dynamic_multiplier: getPricingStrategyDisplayMultiplier(strategy),
    pricing_strategy_run_count: runCountByStrategyId.get(strategy.pricing_strategy_id) || 0,
  }));
}

function getPricingStrategyDisplayMultiplier(strategy) {
  if (strategy.pricing_algorithm === pricingTypes.PricingAlgorithm.BASIC_FINAL_FARE_CALCULATION) {
    return null;
  }
  const multiplierValues = [
    strategy.supply_demand_multiplier,
    strategy.time_period_multiplier,
    strategy.service_area_multiplier,
    strategy.channel_multiplier,
  ].map(Number);
  if (!multiplierValues.every(Number.isFinite)) {
    return null;
  }
  return Number(multiplierValues.reduce((total, value) => total * value, 1).toFixed(3));
}

function createOrderMatchingStrategyRows(data, orderMatchingRuns) {
  const runCountByStrategyId = new Map();
  orderMatchingRuns.forEach((run) => {
    const strategyId = run.order_matching_strategy_id;
    if (!strategyId) return;
    runCountByStrategyId.set(strategyId, (runCountByStrategyId.get(strategyId) || 0) + 1);
  });
  return (data.orderMatchingStrategies || []).map((strategy) => ({
    ...strategy,
    order_matching_run_count: runCountByStrategyId.get(strategy.order_matching_strategy_id) || 0,
  }));
}

function createRoutePlanningRun(options) {
  return routePlanningService.createRoutePlanningRun({
    ...options,
    routePlanningRunId: options.routePlanningRunId || nextRoutePlanningRunId(),
    createdAt: now(),
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
    current_task_status: currentTask?.task_status || null,
  };
}

function attachCostRecords(item, objectType, costRecords = [], routeExecutions = []) {
  if (!item) return item;
  let records = [];
  if (objectType === "serviceOrder") {
    records = costRecords.filter((record) => record.related_order_id === item.service_order_id);
  } else if (objectType === "trip") {
    records = costRecords.filter((record) => record.source_object_type === "trip" && record.source_object_id === item.trip_id);
  } else if (objectType === "routeExecution") {
    records = costRecords.filter((record) => record.source_object_type === "routeExecution" && record.source_object_id === item.route_execution_id);
  } else if (objectType === "readinessTask") {
    records = costRecords.filter((record) => record.source_object_type === "readinessTask" && record.source_object_id === item.task_id);
  } else if (objectType === "deploymentTask") {
    const executionIds = routeExecutions
      .filter((execution) => execution.task_id === item.task_id)
      .map((execution) => execution.route_execution_id);
    records = costRecords.filter((record) =>
      (record.source_object_type === "deploymentTask" && record.source_object_id === item.task_id) ||
      executionIds.includes(record.source_object_id)
    );
  } else if (["cleaningTask", "chargingTask", "maintenanceTask", "failureHandlingTask", "retirementTask"].includes(objectType)) {
    records = costRecords.filter((record) =>
      (record.source_object_type === objectType && record.source_object_id === item.task_id) ||
      (item.route_execution_id && record.source_object_type === "routeExecution" && record.source_object_id === item.route_execution_id)
    );
  }
  return {
    ...item,
    ...(records.length ? summarizeCostRecords(records) : {}),
    cost_records: records,
  };
}

function summarizeCostRecords(records = []) {
  const summary = {
    total_cost_amount: 0,
    distance_cost_amount: 0,
    energy_cost_amount: 0,
    labor_cost_amount: 0,
    asset_depreciation_cost_amount: 0,
  };
  records.forEach((record) => {
    const amount = Number(record.cost_amount || 0);
    summary.total_cost_amount += amount;
    if (record.cost_type === "DISTANCE_COST") summary.distance_cost_amount += amount;
    if (record.cost_type === "ENERGY_COST") summary.energy_cost_amount += amount;
    if (record.cost_type === "LABOR_COST") summary.labor_cost_amount += amount;
    if (record.cost_type === "ASSET_DEPRECIATION_COST") summary.asset_depreciation_cost_amount += amount;
  });
  Object.keys(summary).forEach((key) => {
    summary[key] = Number(summary[key].toFixed(2));
  });
  return summary;
}

function attachRevenueRecords(order, revenueRecords = []) {
  if (!order) return order;
  const records = (revenueRecords || []).filter((record) => record.service_order_id === order.service_order_id);
  const summary = {
    total_receivable_revenue_amount: 0,
    total_collected_revenue_amount: 0,
    total_unreceived_revenue_amount: 0,
  };
  records.forEach((record) => {
    const amount = Number(record.revenue_amount || 0);
    if (record.revenue_type === "RECEIVABLE_REVENUE") summary.total_receivable_revenue_amount += amount;
    if (record.revenue_type === "COLLECTED_REVENUE") summary.total_collected_revenue_amount += amount;
    if (record.revenue_type === "UNRECEIVED_REVENUE") summary.total_unreceived_revenue_amount += amount;
  });
  Object.keys(summary).forEach((key) => {
    summary[key] = Number(summary[key].toFixed(2));
  });
  return {
    ...order,
    ...(records.length ? summary : {}),
    revenue_records: records,
  };
}

function enrichDeploymentTaskForDisplay(task, data) {
  const route = data.routes.find((item) => item.route_id === task.route_id);
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
    route_detail: route ? getRouteDetail(route) : null,
  };
}

function enrichFleetOperationTaskForDisplay(task, data) {
  const robotaxi = data.robotaxis.find((item) => item.robotaxi_id === task.robotaxi_id);
  const robotaxiLocation = getLocationInfo(robotaxi?.current_cell_id || task.origin_cell_id || null, data);
  const originLocation = getLocationInfo(task.origin_cell_id || null, data);
  const targetLocation = getLocationInfo(task.target_cell_id || task.actual_target_cell_id || null, data);
  return {
    ...task,
    robotaxi_current_cell_id: robotaxi?.current_cell_id || null,
    robotaxi_current_location_summary: robotaxiLocation.summary,
    robotaxi_current_location_detail: robotaxiLocation.detail,
    origin_location_summary: originLocation.summary,
    origin_location_detail: originLocation.detail,
    target_location_summary: targetLocation.summary,
    target_location_detail: targetLocation.detail,
  };
}

function enrichRouteExecutionForDisplay(execution, data) {
  const route = data.routes.find((item) => item.route_id === execution.route_id);
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
    route_links_detail: createRouteLinksDetail(execution, data),
    origin_location_summary: originLocation.summary,
    target_location_summary: targetLocation.summary,
    current_location_summary: currentLocation.summary,
    origin_location_detail: originLocation.detail,
    target_location_detail: targetLocation.detail,
    current_location_detail: currentLocation.detail,
    total_distance_km: executionMetrics.totalDistanceKm,
    distance_traveled_km: executionMetrics.distanceTraveledKm,
    distance_remaining_km: executionMetrics.distanceRemainingKm,
    battery_consumed_kwh: execution.battery_consumed_kwh ?? Number((Number(executionMetrics.distanceTraveledKm || 0) * DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM).toFixed(2)),
  };
}

function enrichServiceOrderForDisplay(order, data, trips) {
  const robotaxi = data.robotaxis.find((item) => item.robotaxi_id === order.matched_robotaxi_id);
  const trip = trips.find((item) => item.trip_id === order.trip_id || item.service_order_id === order.service_order_id);
  const robotaxiLocation = getLocationInfo(robotaxi?.current_cell_id, data);
  const tripMetrics = getTripMetrics(trip, data);
  return {
    ...order,
    matched_robotaxi_location_summary: robotaxi ? robotaxiLocation.summary : null,
    matched_robotaxi_location_detail: robotaxi ? robotaxiLocation.detail : null,
    trip_total_distance_km: tripMetrics.totalDistanceKm,
    trip_total_duration_min: tripMetrics.durationMin,
    trip_distance_traveled_km: tripMetrics.distanceTraveledKm,
    trip_distance_remaining_km: tripMetrics.distanceRemainingKm,
  };
}

function enrichOrderMatchingDecisionForDisplay(decision, data) {
  const robotaxi = data.robotaxis.find((item) => item.robotaxi_id === decision.selected_robotaxi_id);
  const robotaxiLocation = getLocationInfo(robotaxi?.current_cell_id, data);
  return {
    ...decision,
    selected_robotaxi_location_summary: robotaxi ? robotaxiLocation.summary : null,
    selected_robotaxi_location_detail: robotaxi ? robotaxiLocation.detail : null,
  };
}

function enrichTripForDisplay(trip, data) {
  const pickupLocation = getLocationInfo(trip.pickup_cell_id, data);
  const dropoffLocation = getLocationInfo(trip.dropoff_cell_id, data);
  const currentLocation = getLocationInfo(trip.current_cell_id, data);
  const route = data.routes.find((item) => item.route_id === trip.route_id);
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
    route_links_detail: createRouteLinksDetail(trip, data),
    total_distance_km: tripMetrics.totalDistanceKm,
    distance_traveled_km: tripMetrics.distanceTraveledKm,
    distance_remaining_km: tripMetrics.distanceRemainingKm,
  };
}

function getTripMetrics(trip, data = null) {
  if (!trip) {
    return {
      totalDistanceKm: null,
      distanceTraveledKm: null,
      distanceRemainingKm: null,
      durationMin: null,
    };
  }
  const travelMetrics = data ? getTravelMetrics(trip, data) : null;
  const distanceTraveledKm = travelMetrics?.distanceTraveledKm ?? roundDistance(trip.distance_traveled_km || 0);
  const distanceRemainingKm = travelMetrics?.distanceRemainingKm ?? roundDistance(trip.distance_remaining_km || 0);
  return {
    totalDistanceKm: travelMetrics?.totalDistanceKm ?? roundDistance(distanceTraveledKm + distanceRemainingKm),
    distanceTraveledKm,
    distanceRemainingKm,
    durationMin: parseElapsedMinutes(trip.time_elapsed),
  };
}

function getTravelMetrics(record, data) {
  const metrics = routePlanningService.calculateTravelDistanceMetrics(record, data.routes || []);
  return {
    totalDistanceKm: metrics.total_distance_km,
    distanceTraveledKm: metrics.distance_traveled_km,
    distanceRemainingKm: metrics.distance_remaining_km,
  };
}

function createTripRouteHistoryDetail(trip, data) {
  return createRouteHistoryDetail(trip, data);
}

function createRouteHistoryDetail(record, data) {
  const history = Array.isArray(record.route_history) ? record.route_history : [];
  if (history.length === 0) return [];
  return history.map((item, index) => {
    const route = data.routes.find((routeItem) => routeItem.route_id === item.route_id);
    return {
      index: index + 1,
      route_id: item.route_id,
      route_strategy_id: item.route_strategy_id,
      route_change_reason: item.route_change_reason,
      origin_cell_id: item.origin_cell_id,
      target_cell_id: item.target_cell_id,
      route_step_count: route ? getMovementStepCount(route) : null,
      total_distance_km: route ? roundDistance(Number(route.total_distance_km ?? Number(route.total_distance_m || 0) / 1000)) : null,
      is_current_route: item.route_id === record.route_id,
    };
  });
}

function createRouteLinksDetail(record, data) {
  const routeRefs = [];
  const history = Array.isArray(record.route_history) ? record.route_history : [];
  history.forEach((item) => {
    if (item?.route_id && !routeRefs.some((routeRef) => routeRef.route_id === item.route_id)) {
      routeRefs.push(item);
    }
  });
  if (record.route_id && !routeRefs.some((routeRef) => routeRef.route_id === record.route_id)) {
    routeRefs.push({
      route_id: record.route_id,
      route_strategy_id: record.route_strategy_id,
      origin_cell_id: record.origin_cell_id || record.pickup_cell_id,
      target_cell_id: record.target_cell_id || record.dropoff_cell_id,
      route_change_reason: "CURRENT_ROUTE",
    });
  }
  return routeRefs.map((item, index) => {
    const route = data.routes.find((routeItem) => routeItem.route_id === item.route_id);
    return {
      index: index + 1,
      route_id: item.route_id,
      route_usage_type: route?.route_usage_type || item.route_usage_type || null,
      route_status: route?.route_status || null,
      route_strategy_id: route?.route_strategy_id || item.route_strategy_id || null,
      origin_cell_id: route?.origin_cell_id || route?.start_cell_id || item.origin_cell_id || null,
      target_cell_id: route?.target_cell_id || route?.end_cell_id || item.target_cell_id || null,
      route_step_count: route ? getMovementStepCount(route) : item.route_step_count || null,
      total_distance_km: route ? roundDistance(Number(route.total_distance_km ?? Number(route.total_distance_m || 0) / 1000)) : null,
      route_change_reason: item.route_change_reason || null,
      is_current_route: item.route_id === record.route_id,
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
    trip_distance_remaining_km: tripMetrics.distanceRemainingKm ?? order.trip_distance_remaining_km,
  };
}

function enrichRouteForDisplay(route, data, deploymentTasks, routeExecutions, routePlanningRuns) {
  const planningRun = routePlanningRuns.find((run) =>
    run.result_route_id === route.route_id || run.route_planning_run_id === route.route_planning_run_id
  );
  const execution = routeExecutions.find((item) =>
    item.route_id === route.route_id || item.route_history?.some((history) => history.route_id === route.route_id)
  );
  const task = deploymentTasks.find((item) =>
    item.route_id === route.route_id || item.task_id === route.task_id || item.task_id === execution?.task_id
  );

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
    route_step_count: getMovementStepCount(route),
  };
}

function enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, fleetOperationTasks = [], routeExecutions = []) {
  const currentTask = findCurrentTask(robotaxi.current_task_id, readinessTasks, deploymentTasks, fleetOperationTasks);
  const currentRouteExecution = findCurrentRouteExecution(robotaxi, routeExecutions);
  const location = getLocationInfo(robotaxi.current_cell_id, data);
  return {
    ...robotaxi,
    current_task_id: currentTask?.task_id || currentRouteExecution?.task_id || null,
    current_task_type: currentTask?.task_type || currentRouteExecution?.task_type || null,
    current_task_status: currentTask?.task_status || currentRouteExecution?.execution_status || null,
    current_route_execution_id: currentRouteExecution?.route_execution_id || null,
    location_summary: location.summary,
  };
}

function enrichRobotaxiForDetail(robotaxi, data, readinessTasks, deploymentTasks, fleetOperationTasks, routeExecutions) {
  const currentRouteExecution = findCurrentRouteExecution(robotaxi, routeExecutions);
  const location = getLocationInfo(robotaxi.current_cell_id, data);

  return {
    ...enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, fleetOperationTasks, routeExecutions),
    current_route_execution_id: currentRouteExecution?.route_execution_id || null,
    current_execution_status: currentRouteExecution?.execution_status || null,
    current_route_step: currentRouteExecution
      ? `${currentRouteExecution.current_step_index} / ${currentRouteExecution.total_step_count}`
      : null,
    location_context: location.detail,
  };
}

function findCurrentRouteExecution(robotaxi, routeExecutions) {
  return routeExecutions.find((execution) =>
    execution.robotaxi_id === robotaxi.robotaxi_id && ["WAITING_ROUTE", "WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL", "PAUSED"].includes(execution.execution_status)
  );
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
  const cell = data.cells.find((item) => item.cell_id === cellId);
  const cellContext = cell ? createCellContext(cell, data) : null;
  const contextSummary = summarizeRobotaxiLocation(cellContext);
  return {
    summary: cellId ? `${cellId} · ${contextSummary}` : contextSummary,
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
      service_eligibility: cellContext.service_eligibility,
    } : null,
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
    failure_reason: route.failure_reason,
  };
}

function hasRelation(value) {
  return Boolean(value) && value !== "无关联";
}

function findCurrentTask(taskId, readinessTasks, deploymentTasks, fleetOperationTasks = []) {
  if (!taskId) return null;
  return readinessTasks.find((task) => task.task_id === taskId) ||
    deploymentTasks.find((task) => task.task_id === taskId) ||
    fleetOperationTasks.find((task) => task.task_id === taskId) ||
    null;
}


function createTripRouteUpdate(trip, nextTrip, data) {
  const result = routePlanningService.createTripRouteUpdate({
    trip,
    nextTrip,
    data,
    routeId: nextServiceRouteId(),
    routePlanningRunId: nextRoutePlanningRunId(),
  });
  if (result?.nextTrip?.route_history?.length) {
    const routeHistory = result.nextTrip.route_history.map((entry, index, list) => index === list.length - 1 ? {
      ...entry,
      started_at: now(),
      trigger_type: taskTypes.TriggerType.MANUAL,
    } : entry);
    return { ...result, nextTrip: { ...result.nextTrip, route_history: routeHistory } };
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
      failureReason: options.failureReason || taskTypes.RoutePlanningFailureReason.NO_AVAILABLE_TARGET_CELL,
    });
    return {
      routePlanningRun,
      waitingTrip: createWaitingDecisionTrip(trip, options, routePlanningRun.failure_reason),
    };
  }

  const route = createTripRoute(trip, data, {
    originCellId: trip.current_cell_id,
    targetCellId: options.targetCellId,
    targetServiceAreaId: options.targetServiceAreaId,
    strategyId: options.strategyId,
    routePlanningRunId,
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
    totalDistanceKm: route.total_distance_km,
  });
  if (route.route_steps.length === 0) {
    return {
      routePlanningRun,
      waitingTrip: createWaitingDecisionTrip(trip, options, route.failure_reason),
    };
  }

  const routeHistory = [
    ...(Array.isArray(trip.route_history) ? trip.route_history : []),
    createRouteHistoryEntry(route, options.routeChangeReason, options.exceptionType),
  ];
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
        failure_reason: null,
      },
      routes: [route, ...data.routes],
      currentRouteId: route.route_id,
      currentStepIndex: 0,
    }),
  };
}

function createWaitingDecisionTrip(trip, options, failureReason) {
  return {
    ...trip,
    trip_status: tripTypes.TripStatus.WAITING_OPERATION_DECISION,
    arrival_execution_result: options.exceptionType || null,
    exception_type: options.exceptionType || null,
    failure_reason: failureReason,
    event_log: [
      ...(Array.isArray(trip.event_log) ? trip.event_log : []),
      {
        event_time: now(),
        previous_status: trip.trip_status,
        next_status: tripTypes.TripStatus.WAITING_OPERATION_DECISION,
        event_type: options.exceptionType || "ROUTE_PLANNING_FAILED",
        event_result: taskTypes.RoutePlanningResult.FAILED,
      },
    ],
  };
}

function getTripRouteRequest(trip) {
  if (["WAITING_ROUTE", "PENDING", "ASSIGNED"].includes(trip.trip_status)) {
    return {
      originCellId: trip.current_cell_id,
      targetCellId: trip.pickup_cell_id,
      targetServiceAreaId: trip.pickup_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_PICKUP,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ORDER_PICKUP_PLANNING,
    };
  }
  if (["CUSTOMER_ONBOARD", "PASSENGER_ONBOARD"].includes(trip.trip_status)) {
    return {
      originCellId: trip.current_cell_id || trip.pickup_cell_id,
      targetCellId: trip.dropoff_cell_id,
      targetServiceAreaId: trip.dropoff_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.SERVICE_ORDER_DESTINATION,
      routeChangeReason: taskTypes.RouteChangeReason.SERVICE_ORDER_DESTINATION_PLANNING,
    };
  }
  return null;
}

function updateRobotaxiForTrip(robotaxi, trip, previousTrip = {}) {
  const movingStatuses = ["ON_THE_WAY_PICKUP", "ON_THE_WAY_DESTINATION"];
  const completed = trip.trip_status === "COMPLETED";
  const waitingDecision = trip.trip_status === "WAITING_OPERATION_DECISION";
  const distanceDeltaKm = Number(Math.max(0, Number(trip.distance_traveled_km || 0) - Number(previousTrip.distance_traveled_km || 0)).toFixed(2));
  const batteryDeltaKwh = Number(Math.max(0, Number(trip.battery_consumed_kwh || 0) - Number(previousTrip.battery_consumed_kwh || 0)).toFixed(2));
  const fallbackBatteryDeltaKwh = Number((distanceDeltaKm * DEFAULT_ENERGY_CONSUMPTION_KWH_PER_KM).toFixed(2));
  const nextBatteryDeltaKwh = batteryDeltaKwh || fallbackBatteryDeltaKwh;
  const batteryDeltaPercent = robotaxi.battery_capacity_kwh
    ? Number((nextBatteryDeltaKwh / robotaxi.battery_capacity_kwh * 100).toFixed(2))
    : robotaxi.max_range_km
      ? Number((distanceDeltaKm / robotaxi.max_range_km * 100).toFixed(2))
      : Number(Math.max(0, Number(trip.battery_consumed_percent || 0) - Number(previousTrip.battery_consumed_percent || 0)).toFixed(2));
  const completedNow = completed && previousTrip.trip_status !== "COMPLETED";
  return {
    ...robotaxi,
    current_cell_id: trip.current_cell_id || robotaxi.current_cell_id,
    current_route_id: completed ? null : trip.route_id || robotaxi.current_route_id,
    current_order_id: completed ? null : trip.service_order_id,
    availability_status: completed ? "AVAILABLE" : robotaxi.availability_status,
    motion_status: completed || waitingDecision ? "STOPPED" : movingStatuses.includes(trip.trip_status) ? "MOVING" : "STOPPED",
    available_for_dispatch: completed,
    battery_percent: Number(Math.max(0, Number(robotaxi.battery_percent || 0) - batteryDeltaPercent).toFixed(2)),
    current_battery_kwh: Number(Math.max(0, Number(robotaxi.current_battery_kwh ?? robotaxi.battery_capacity_kwh * robotaxi.battery_percent / 100) - nextBatteryDeltaKwh).toFixed(2)),
    estimated_range_km: Number(Math.max(0, Number(robotaxi.estimated_range_km || 0) - distanceDeltaKm).toFixed(2)),
    lifetime_distance_km: Number((Number(robotaxi.lifetime_distance_km || 0) + distanceDeltaKm).toFixed(2)),
    lifetime_battery_consumed_kwh: Number((Number(robotaxi.lifetime_battery_consumed_kwh || 0) + nextBatteryDeltaKwh).toFixed(2)),
    lifetime_battery_consumed_percent: Number((Number(robotaxi.lifetime_battery_consumed_percent || 0) + batteryDeltaPercent).toFixed(2)),
    completed_service_order_count: completedNow ? Number(robotaxi.completed_service_order_count || 0) + 1 : robotaxi.completed_service_order_count || 0,
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
    COMPLETED: "SETTLING",
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
    failure_reason: null,
  };
}

function addElapsedMinutes(value, minutes) {
  const current = parseElapsedMinutes(value);
  return String(roundDuration((Number.isFinite(current) ? current : 0) + minutes));
}

function parseElapsedMinutes(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  const parts = String(value || "0").split(":").map((part) => Number.parseInt(part, 10) || 0);
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

function nextManualBusinessActionId(prefix) {
  if (prefix === "TASK-RC") return nextTaskId();
  if (prefix === "TASK-DP") return nextDeploymentTaskId();
  if (prefix === "TASK-FOP") return nextFleetOperationTaskId();
  if (prefix === "REX") return nextRouteExecutionId();
  if (prefix === "DRT") return nextDeploymentRouteId();
  if (prefix === "SRT") return nextServiceRouteId();
  if (prefix === "RPR") return nextRoutePlanningRunId();
  if (prefix === "DPR") return nextPricingStrategyRunId();
  if (prefix === "PD") return nextPricingDecisionId();
  if (prefix === "OMR") return nextOrderMatchingRunId();
  if (prefix === "OMD") return nextOrderMatchingDecisionId();
  if (prefix === "TPR") return nextTaskPlanningRunId();
  if (prefix === "TPRS") return nextTaskPlanningResultId();
  if (prefix === "TRIP") return nextTripId();
  manualBusinessActionSequence += 1;
  return `${prefix || "MANUAL"}-${String(manualBusinessActionSequence).padStart(4, "0")}`;
}

function nextEventId() {
  eventSequence += 1;
  return `EVT-${String(eventSequence).padStart(3, "0")}`;
}

function nextFleetOperationTaskId(prefix) {
  fleetOperationTaskSequence += 1;
  return `${prefix}-${String(fleetOperationTaskSequence).padStart(4, "0")}`;
}

function nextFleetOperationPolicyRunId() {
  fleetOperationPolicyRunSequence += 1;
  return `FOP-RUN-${String(fleetOperationPolicyRunSequence).padStart(4, "0")}`;
}

function nextFleetOperationPolicyResultId() {
  fleetOperationPolicyResultSequence += 1;
  return `FOP-RESULT-${String(fleetOperationPolicyResultSequence).padStart(4, "0")}`;
}

function nextFleetOperationDispatchRunId() {
  fleetOperationDispatchRunSequence += 1;
  return `FODR-${String(fleetOperationDispatchRunSequence).padStart(4, "0")}`;
}

function nextFleetOperationDispatchDecisionId() {
  fleetOperationDispatchDecisionSequence += 1;
  return `FODD-${String(fleetOperationDispatchDecisionSequence).padStart(4, "0")}`;
}

function nextTaskDispatchRunId() {
  taskDispatchRunSequence += 1;
  return `TDR-${String(taskDispatchRunSequence).padStart(4, "0")}`;
}

function nextTaskDispatchResultId() {
  taskDispatchResultSequence += 1;
  return `TDRS-${String(taskDispatchResultSequence).padStart(4, "0")}`;
}

function nextTaskPlanningRunId() {
  taskPlanningRunSequence += 1;
  return `TPR-${String(taskPlanningRunSequence).padStart(4, "0")}`;
}

function nextTaskPlanningResultId() {
  taskPlanningResultSequence += 1;
  return `TPRS-${String(taskPlanningResultSequence).padStart(4, "0")}`;
}

function nextLongTermDemandForecastRunId() {
  longTermDemandForecastRunSequence += 1;
  return `LDF-RUN-${String(longTermDemandForecastRunSequence).padStart(4, "0")}`;
}

function nextLongTermDemandForecastResultBaseId() {
  longTermDemandForecastResultSequence += 1;
  return `LDF-RES-${String(longTermDemandForecastResultSequence).padStart(4, "0")}`;
}

function nextSupplyDecisionRunId() {
  supplyDecisionRunSequence += 1;
  return `SD-RUN-${String(supplyDecisionRunSequence).padStart(4, "0")}`;
}

function nextShortTermDemandForecastRunId() {
  shortTermDemandForecastRunSequence += 1;
  return `STF-RUN-${String(shortTermDemandForecastRunSequence).padStart(4, "0")}`;
}

function nextShortTermDemandForecastResultId() {
  shortTermDemandForecastResultSequence += 1;
  return `STF-RES-${String(shortTermDemandForecastResultSequence).padStart(4, "0")}`;
}

function nextDeploymentDecisionRunId() {
  deploymentDecisionRunSequence += 1;
  return `DD-RUN-${String(deploymentDecisionRunSequence).padStart(4, "0")}`;
}

function nextDeploymentPlanId() {
  deploymentPlanSequence += 1;
  return `DPL-${String(deploymentPlanSequence).padStart(4, "0")}`;
}

function nextSupplyPlanId() {
  supplyPlanSequence += 1;
  return `FPP-${String(supplyPlanSequence).padStart(4, "0")}`;
}

function nextProductionBatchId() {
  productionBatchSequence += 1;
  return `PB-${String(productionBatchSequence).padStart(4, "0")}`;
}

function nextFleetAllocationRunId() {
  fleetAllocationRunSequence += 1;
  return `FAR-${String(fleetAllocationRunSequence).padStart(4, "0")}`;
}

function nextFleetAllocationResultId() {
  fleetAllocationResultSequence += 1;
  return `FAR-RES-${String(fleetAllocationResultSequence).padStart(4, "0")}`;
}

function nextSupplyDemandBalanceRunId() {
  supplyDemandBalanceRunSequence += 1;
  return `SDB-RUN-${String(supplyDemandBalanceRunSequence).padStart(4, "0")}`;
}

function nextSupplyDemandBalanceResultId() {
  supplyDemandBalanceResultSequence += 1;
  return `SDB-RES-${String(supplyDemandBalanceResultSequence).padStart(4, "0")}`;
}

function nextRobotaxiDeliveryOrderId() {
  robotaxiDeliveryOrderSequence += 1;
  return `RDO-${String(robotaxiDeliveryOrderSequence).padStart(4, "0")}`;
}

function nextProducedRobotaxiId() {
  producedRobotaxiSequence += 1;
  return `RTX-${String(producedRobotaxiSequence).padStart(3, "0")}`;
}

function createDefaultPageUiState() {
  return {
    filters: { ...defaultPageFilters },
    appliedFilters: { ...defaultPageFilters },
    pagination: { current: 1 },
  };
}

function normalizePageUiState(uiState) {
  const fallback = createDefaultPageUiState();
  return {
    filters: {
      ...fallback.filters,
      ...(uiState?.filters || {}),
    },
    appliedFilters: {
      ...fallback.appliedFilters,
      ...(uiState?.appliedFilters || {}),
    },
    pagination: {
      ...fallback.pagination,
      ...(uiState?.pagination || {}),
    },
  };
}

function createNextPageUiState(currentState, patch) {
  const normalizedState = normalizePageUiState(currentState);
  return normalizePageUiState({
    ...normalizedState,
    ...patch,
    filters: patch.filters ? { ...normalizedState.filters, ...patch.filters } : normalizedState.filters,
    appliedFilters: patch.appliedFilters ? { ...normalizedState.appliedFilters, ...patch.appliedFilters } : normalizedState.appliedFilters,
    pagination: patch.pagination ? { ...normalizedState.pagination, ...patch.pagination } : normalizedState.pagination,
  });
}

function createMenuItems(items = []) {
  return items
    .filter((item) => !hiddenWorkspacePages.has(item.key))
    .map((item) => {
      const children = createMenuItems(item.children || []);
      return {
        key: item.key,
        label: item.label,
        ...(children.length ? { children } : {}),
      };
    });
}

function normalizePageUiStateMap(pageUiState) {
  return Object.entries(pageUiState || {}).reduce((result, [page, state]) => ({
    ...result,
    [page]: normalizePageUiState(state),
  }), {});
}

function isRenderablePage(page) {
  if (page === "console") return true;
  return Boolean(tableConfig[page] && pageObjectType[page]);
}

function getDefaultSelection(page, data) {
  if (page === "console") return { type: "map", id: data.maps[0].map_id };
  const type = pageObjectType[page];
  return type ? { type, id: null } : { type: null, id: null };
}

function getPageLabel(page) {
  if (page === "console") return "运营中控台";
  return findPageMenuLabel(page) || tableConfig[page]?.title || "业务页面";
}

function findMenuPath(page) {
  return navigationRegistry?.findNavigationPath(page) || [];
}

function findPageMenuLabel(page) {
  const path = findMenuPath(page);
  return path.length ? path[path.length - 1].label : null;
}

function isLeafPage(page) {
  if (hiddenWorkspacePages.has(page)) return false;
  return isRenderablePage(page);
}

function normalizeWorkspacePages(pages, activePage = "console") {
  const nextPages = ["console"];
  [...(Array.isArray(pages) ? pages : []), activePage].forEach((page) => {
    if (isLeafPage(page) && !nextPages.includes(page)) nextPages.push(page);
  });
  return nextPages;
}

function addWorkspacePage(pages, page) {
  return normalizeWorkspacePages([...(Array.isArray(pages) ? pages : []), page], page);
}

function mergeCalculatedObjects(current = [], updates = [], idField) {
  const updateById = new Map((updates || []).map((item) => [item[idField], item]));
  return current.map((item) => updateById.get(item[idField]) || item);
}

function replaceCollectionItem(collection = [], idField, nextItem) {
  return collection.map((item) => item[idField] === nextItem?.[idField] ? nextItem : item);
}

function loadRuntimeSnapshot(initialData) {
  const fallback = {
    operationalData: initialData,
    readinessTasks: [],
    cleaningTasks: [],
    chargingTasks: [],
    maintenanceTasks: [],
    failureHandlingTasks: [],
    retirementTasks: [],
    fleetOperationPolicies: fleetOperationPolicyService.initializeDefaultFleetOperationPolicies(),
    fleetOperationPolicyRuns: [],
    fleetOperationPolicyResults: [],
    fleetOperationDispatchStrategies: fleetOperationDispatchService.initializeDefaultFleetOperationDispatchStrategies(),
    fleetOperationDispatchRuns: [],
    fleetOperationDispatchDecisions: [],
    taskDispatchStrategies: taskDispatchStrategyService.initializeDefaultTaskDispatchStrategies(),
    robotaxiTaskPlanningStrategies: robotaxiTaskPlanningService.initializeDefaultRobotaxiTaskPlanningStrategies(),
    robotaxiTaskPlanningRuns: [],
    robotaxiTaskPlanningResults: [],
    taskDispatchRuns: [],
    taskDispatchResults: [],
    taskPriorityConfigs: [robotaxiTaskPriorityService?.initializeDefaultPriorityConfig() || {}],
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
    metricDefinitions: metricCalculator.initializeDefaultMetricDefinitions(),
    metricCalculationRuns: [],
    metricObservations: [],
    metricPeriodType: "ALL",
    simulationRuns: [],
    simulationEvents: [],
    timedOperations: [],
    activePage: "console",
    workspacePages: ["console"],
    detailCollapsedByPage: { console: true },
    pageSelections: { console: { type: "map", id: initialData.maps[0].map_id } },
    pageUiState: {},
  };
  deriveInitialRuntimeSequences(fallback);
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
    const cleaningTasks = Array.isArray(snapshot.cleaningTasks) ? snapshot.cleaningTasks : [];
    const chargingTasks = Array.isArray(snapshot.chargingTasks) ? snapshot.chargingTasks : [];
    const maintenanceTasks = Array.isArray(snapshot.maintenanceTasks) ? snapshot.maintenanceTasks : [];
    const failureHandlingTasks = Array.isArray(snapshot.failureHandlingTasks) ? snapshot.failureHandlingTasks : [];
    const retirementTasks = Array.isArray(snapshot.retirementTasks) ? snapshot.retirementTasks : [];
    const fleetOperationPolicies = Array.isArray(snapshot.fleetOperationPolicies) && snapshot.fleetOperationPolicies.length
      ? snapshot.fleetOperationPolicies
      : fleetOperationPolicyService.initializeDefaultFleetOperationPolicies();
    const fleetOperationPolicyRuns = Array.isArray(snapshot.fleetOperationPolicyRuns) ? snapshot.fleetOperationPolicyRuns : [];
    const fleetOperationPolicyResults = Array.isArray(snapshot.fleetOperationPolicyResults) ? snapshot.fleetOperationPolicyResults : [];
    const fleetOperationDispatchStrategies = Array.isArray(snapshot.fleetOperationDispatchStrategies) && snapshot.fleetOperationDispatchStrategies.length
      ? snapshot.fleetOperationDispatchStrategies
      : fleetOperationDispatchService.initializeDefaultFleetOperationDispatchStrategies();
    const fleetOperationDispatchRuns = Array.isArray(snapshot.fleetOperationDispatchRuns) ? snapshot.fleetOperationDispatchRuns : [];
    const fleetOperationDispatchDecisions = Array.isArray(snapshot.fleetOperationDispatchDecisions) ? snapshot.fleetOperationDispatchDecisions : [];
    const taskDispatchStrategies = Array.isArray(snapshot.taskDispatchStrategies) && snapshot.taskDispatchStrategies.length
      ? snapshot.taskDispatchStrategies
      : taskDispatchStrategyService.initializeDefaultTaskDispatchStrategies();
    const robotaxiTaskPlanningStrategies = Array.isArray(snapshot.robotaxiTaskPlanningStrategies) && snapshot.robotaxiTaskPlanningStrategies.length
      ? snapshot.robotaxiTaskPlanningStrategies
      : robotaxiTaskPlanningService.initializeDefaultRobotaxiTaskPlanningStrategies();
    const robotaxiTaskPlanningRuns = Array.isArray(snapshot.robotaxiTaskPlanningRuns) ? snapshot.robotaxiTaskPlanningRuns : [];
    const robotaxiTaskPlanningResults = Array.isArray(snapshot.robotaxiTaskPlanningResults) ? snapshot.robotaxiTaskPlanningResults : [];
    const taskPriorityConfigs = Array.isArray(snapshot.taskPriorityConfigs) && snapshot.taskPriorityConfigs.length
      ? snapshot.taskPriorityConfigs
      : [robotaxiTaskPriorityService?.initializeDefaultPriorityConfig() || {}];
    const taskDispatchRuns = Array.isArray(snapshot.taskDispatchRuns) ? snapshot.taskDispatchRuns : [];
    const taskDispatchResults = Array.isArray(snapshot.taskDispatchResults) ? snapshot.taskDispatchResults : [];
    const deploymentTasks = normalizeRouteStrategyReferences(Array.isArray(snapshot.deploymentTasks) ? snapshot.deploymentTasks : []);
    const routeExecutions = normalizeRouteStrategyReferences(Array.isArray(snapshot.routeExecutions) ? snapshot.routeExecutions : []);
    const routePlanningRuns = normalizeRouteStrategyReferences(Array.isArray(snapshot.routePlanningRuns) ? snapshot.routePlanningRuns : []);
    const demandSimulationRuns = Array.isArray(snapshot.demandSimulationRuns) ? snapshot.demandSimulationRuns : [];
    const serviceOrders = normalizeServiceOrders(Array.isArray(snapshot.serviceOrders) ? snapshot.serviceOrders : []);
    const pricingStrategyRuns = Array.isArray(snapshot.pricingStrategyRuns) ? snapshot.pricingStrategyRuns : [];
    const pricingDecisions = Array.isArray(snapshot.pricingDecisions) ? snapshot.pricingDecisions : [];
    const orderMatchingRuns = Array.isArray(snapshot.orderMatchingRuns) ? snapshot.orderMatchingRuns : [];
    const orderMatchingDecisions = Array.isArray(snapshot.orderMatchingDecisions) ? snapshot.orderMatchingDecisions : [];
    const trips = Array.isArray(snapshot.trips) ? snapshot.trips.map((trip) => tripTypes.normalizeTripRecord(trip)) : [];
    const taskEventLogs = normalizeRouteStrategyReferences(Array.isArray(snapshot.taskEventLogs) ? snapshot.taskEventLogs : []);
    const simulationPolicies = Array.isArray(snapshot.simulationPolicies) ? snapshot.simulationPolicies : [];
    const workflowTimingProfiles = Array.isArray(snapshot.workflowTimingProfiles) && snapshot.workflowTimingProfiles.length
      ? snapshot.workflowTimingProfiles.map((profile) => businessTimingCalculator.normalizeWorkflowTimingProfile(profile))
      : [businessTimingCalculator.initializeDefaultWorkflowTimingProfile()];
    const businessTimingCalculationRuns = Array.isArray(snapshot.businessTimingCalculationRuns) ? snapshot.businessTimingCalculationRuns : [];
    const costModelProfiles = Array.isArray(snapshot.costModelProfiles) && snapshot.costModelProfiles.length
      ? snapshot.costModelProfiles.map((profile) => costModelCalculator.normalizeCostModelProfile(profile))
      : [costModelCalculator.initializeDefaultCostModelProfile()];
    const costCalculationRuns = Array.isArray(snapshot.costCalculationRuns) ? snapshot.costCalculationRuns : [];
    const costRecords = Array.isArray(snapshot.costRecords) ? snapshot.costRecords : [];
    const revenueCalculationRuns = Array.isArray(snapshot.revenueCalculationRuns) ? snapshot.revenueCalculationRuns : [];
    const revenueRecords = Array.isArray(snapshot.revenueRecords) ? snapshot.revenueRecords : [];
    const metricDefinitions = Array.isArray(snapshot.metricDefinitions) && snapshot.metricDefinitions.length
      ? metricCalculator.normalizeMetricDefinitions(snapshot.metricDefinitions)
      : metricCalculator.initializeDefaultMetricDefinitions();
    const metricCalculationRuns = Array.isArray(snapshot.metricCalculationRuns) ? snapshot.metricCalculationRuns : [];
    const metricObservations = Array.isArray(snapshot.metricObservations) ? snapshot.metricObservations : [];
    const metricPeriodType = snapshot.metricPeriodType || "ALL";
    const simulationRuns = Array.isArray(snapshot.simulationRuns) ? snapshot.simulationRuns : [];
    const simulationEvents = Array.isArray(snapshot.simulationEvents) ? snapshot.simulationEvents : [];
    const timedOperations = Array.isArray(snapshot.timedOperations) ? snapshot.timedOperations : [];
    const operationalData = normalizeOperationalRouteStrategies(spatialCatalogService.mergeSpatialCatalog({
      ...initialData,
      ...(snapshot.operationalData || {}),
      businessTargets: snapshot.operationalData?.businessTargets || initialData.businessTargets || [],
      supplyProductionProfiles: snapshot.operationalData?.supplyProductionProfiles || initialData.supplyProductionProfiles || [],
      longTermDemandForecastStrategies: snapshot.operationalData?.longTermDemandForecastStrategies || initialData.longTermDemandForecastStrategies || [],
      longTermDemandForecastRuns: snapshot.operationalData?.longTermDemandForecastRuns || initialData.longTermDemandForecastRuns || [],
      longTermDemandForecasts: snapshot.operationalData?.longTermDemandForecasts || initialData.longTermDemandForecasts || [],
      supplyDecisionStrategies: snapshot.operationalData?.supplyDecisionStrategies || initialData.supplyDecisionStrategies || [],
      supplyDecisionRuns: snapshot.operationalData?.supplyDecisionRuns || initialData.supplyDecisionRuns || [],
      supplyPlans: snapshot.operationalData?.supplyPlans || initialData.supplyPlans || [],
      productionBatches: snapshot.operationalData?.productionBatches || initialData.productionBatches || [],
      fleetAllocationStrategies: snapshot.operationalData?.fleetAllocationStrategies || initialData.fleetAllocationStrategies || [],
      fleetAllocationRuns: snapshot.operationalData?.fleetAllocationRuns || initialData.fleetAllocationRuns || [],
      fleetAllocationResults: snapshot.operationalData?.fleetAllocationResults || initialData.fleetAllocationResults || [],
      robotaxiDeliveryOrders: snapshot.operationalData?.robotaxiDeliveryOrders || initialData.robotaxiDeliveryOrders || [],
      shortTermDemandForecastStrategies: snapshot.operationalData?.shortTermDemandForecastStrategies || initialData.shortTermDemandForecastStrategies || [],
      shortTermDemandForecastRuns: snapshot.operationalData?.shortTermDemandForecastRuns || initialData.shortTermDemandForecastRuns || [],
      shortTermDemandForecastResults: snapshot.operationalData?.shortTermDemandForecastResults || initialData.shortTermDemandForecastResults || [],
      deploymentDecisionStrategies: snapshot.operationalData?.deploymentDecisionStrategies || initialData.deploymentDecisionStrategies || [],
      deploymentDecisionRuns: snapshot.operationalData?.deploymentDecisionRuns || initialData.deploymentDecisionRuns || [],
      deploymentPlans: snapshot.operationalData?.deploymentPlans || initialData.deploymentPlans || [],
      supplyDemandBalanceStrategies: snapshot.operationalData?.supplyDemandBalanceStrategies || initialData.supplyDemandBalanceStrategies || [],
      supplyDemandBalanceRuns: snapshot.operationalData?.supplyDemandBalanceRuns || initialData.supplyDemandBalanceRuns || [],
      supplyDemandBalanceResults: snapshot.operationalData?.supplyDemandBalanceResults || initialData.supplyDemandBalanceResults || [],
      supplyOrders: snapshot.operationalData?.supplyOrders || initialData.supplyOrders || [],
      dealerSupplies: snapshot.operationalData?.dealerSupplies || initialData.dealerSupplies || [],
      ownerSupplies: snapshot.operationalData?.ownerSupplies || initialData.ownerSupplies || [],
      demandProfiles: snapshot.operationalData?.demandProfiles || initialData.demandProfiles || [],
      placeDemandProfiles: snapshot.operationalData?.placeDemandProfiles || initialData.placeDemandProfiles || [],
      serviceAreaDemandProfiles: snapshot.operationalData?.serviceAreaDemandProfiles || initialData.serviceAreaDemandProfiles || [],
      zoneDemandProfiles: snapshot.operationalData?.zoneDemandProfiles || initialData.zoneDemandProfiles || [],
    }, initialData));
    taskSequence = deriveSequence(readinessTasks, "task_id", "TASK-RC-");
    fleetOperationTaskSequence = Math.max(
      deriveSequence(cleaningTasks, "task_id", "TASK-CLN-"),
      deriveSequence(chargingTasks, "task_id", "TASK-CHG-"),
      deriveSequence(maintenanceTasks, "task_id", "TASK-MNT-"),
      deriveSequence(failureHandlingTasks, "task_id", "TASK-FHL-"),
      deriveSequence(retirementTasks, "task_id", "TASK-RET-"),
    );
    fleetOperationPolicyRunSequence = deriveSequence(fleetOperationPolicyRuns, "fleet_operation_policy_run_id", "FOP-RUN-");
    // taskPriorityConfig no sequence restore needed
  fleetOperationPolicyResultSequence = deriveSequence(fleetOperationPolicyResults, "fleet_operation_policy_result_id", "FOP-RESULT-");
    fleetOperationDispatchRunSequence = deriveSequence(fleetOperationDispatchRuns, "fleet_operation_dispatch_run_id", "FODR-");
    fleetOperationDispatchDecisionSequence = deriveSequence(fleetOperationDispatchDecisions, "fleet_operation_dispatch_decision_id", "FODD-");
    taskDispatchRunSequence = deriveSequence(taskDispatchRuns, "task_dispatch_run_id", "TDR-");
    taskDispatchResultSequence = deriveSequence(taskDispatchResults, "task_dispatch_result_id", "TDRS-");
    taskPlanningRunSequence = deriveSequence(robotaxiTaskPlanningRuns, "robotaxi_task_planning_run_id", "TPR-");
    taskPlanningResultSequence = deriveSequence(robotaxiTaskPlanningResults, "robotaxi_task_planning_result_id", "TPRS-");
    longTermDemandForecastRunSequence = deriveSequence(operationalData.longTermDemandForecastRuns || [], "forecast_run_id", "LDF-RUN-");
    longTermDemandForecastResultSequence = deriveSequence(operationalData.longTermDemandForecasts || [], "forecast_result_id", "LDF-RES-");
    supplyDecisionRunSequence = deriveSequence(operationalData.supplyDecisionRuns || [], "supply_decision_run_id", "SD-RUN-");
    shortTermDemandForecastRunSequence = deriveSequence(operationalData.shortTermDemandForecastRuns || [], "short_term_forecast_run_id", "STF-RUN-");
    shortTermDemandForecastResultSequence = deriveSequence(operationalData.shortTermDemandForecastResults || [], "short_term_forecast_result_id", "STF-RES-");
    deploymentDecisionRunSequence = deriveSequence(operationalData.deploymentDecisionRuns || [], "deployment_decision_run_id", "DD-RUN-");
    deploymentPlanSequence = deriveSequence(operationalData.deploymentPlans || [], "deployment_plan_id", "DPL-");
    supplyPlanSequence = deriveSequence(operationalData.supplyPlans || [], "supply_plan_id", "FPP-");
    productionBatchSequence = deriveSequence(operationalData.productionBatches || [], "production_batch_id", "PB-");
    fleetAllocationRunSequence = deriveSequence(operationalData.fleetAllocationRuns || [], "fleet_allocation_run_id", "FAR-");
    fleetAllocationResultSequence = deriveSequence(operationalData.fleetAllocationResults || [], "fleet_allocation_result_id", "FAR-RES-");
    supplyDemandBalanceRunSequence = deriveSequence(operationalData.supplyDemandBalanceRuns || [], "supply_demand_balance_run_id", "SDB-RUN-");
    supplyDemandBalanceResultSequence = deriveSequence(operationalData.supplyDemandBalanceResults || [], "supply_demand_balance_result_id", "SDB-RES-");
    robotaxiDeliveryOrderSequence = deriveSequence(operationalData.robotaxiDeliveryOrders || [], "delivery_order_id", "RDO-");
    producedRobotaxiSequence = deriveSequence(operationalData.robotaxis || [], "robotaxi_id", "RTX-");
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
      cleaningTasks,
      chargingTasks,
      maintenanceTasks,
      failureHandlingTasks,
      retirementTasks,
      fleetOperationPolicies,
      fleetOperationPolicyRuns,
      fleetOperationPolicyResults,
      fleetOperationDispatchStrategies,
      fleetOperationDispatchRuns,
      fleetOperationDispatchDecisions,
      taskDispatchStrategies,
      robotaxiTaskPlanningStrategies,
      robotaxiTaskPlanningRuns,
      robotaxiTaskPlanningResults,
      taskDispatchRuns,
      taskDispatchResults,
      taskPriorityConfigs,
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
      metricDefinitions,
      metricCalculationRuns,
      metricObservations,
      metricPeriodType,
      simulationRuns,
      simulationEvents,
      timedOperations,
      activePage: restoredActivePage,
      workspacePages: normalizeWorkspacePages(snapshot.workspacePages, restoredActivePage),
      detailCollapsedByPage: { ...(snapshot.detailCollapsedByPage || {}), console: true },
      pageSelections: {
        console: { type: "map", id: initialData.maps[0].map_id },
        ...(snapshot.pageSelections || {}),
      },
      pageUiState: normalizePageUiStateMap(snapshot.pageUiState),
    };
  } catch (error) {
    return fallback;
  }
}

function deriveInitialRuntimeSequences(runtime) {
  producedRobotaxiSequence = deriveSequence(runtime.operationalData?.robotaxis || [], "robotaxi_id", "RTX-");
}

function clearRobotaxiRuntimeStorage() {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(runtimeStorageKeyPrefix))
    .forEach((key) => window.localStorage.removeItem(key));
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
  const demandProfiles = normalizeDemandProfiles ? normalizeDemandProfiles(operationalData) : (operationalData.demandProfiles || []);
  const planningDefaults = operatingPlanningService?.initializeOperatingPlanningData?.() || {};
  const legacyDemandProfileGroups = splitDemandProfilesByTarget ? splitDemandProfilesByTarget(demandProfiles) : {
    placeDemandProfiles: operationalData.placeDemandProfiles || [],
    serviceAreaDemandProfiles: operationalData.serviceAreaDemandProfiles || [],
    zoneDemandProfiles: operationalData.zoneDemandProfiles || [],
  };
  return {
    ...operationalData,
    routes: normalizeRouteStrategyReferences(operationalData.routes || []),
    shortTermDemandForecastStrategies: mergeDefaultConfiguredRecords(
      operationalData.shortTermDemandForecastStrategies,
      planningDefaults.shortTermDemandForecastStrategies,
      "short_term_forecast_strategy_id",
    ),
    deploymentDecisionStrategies: mergeDefaultConfiguredRecords(
      operationalData.deploymentDecisionStrategies,
      planningDefaults.deploymentDecisionStrategies,
      "deployment_decision_strategy_id",
    ),
    demandProfiles,
    ...legacyDemandProfileGroups,
  };
}

function mergeDefaultConfiguredRecords(records = [], defaults = [], idField) {
  const current = Array.isArray(records) && records.length ? records : defaults;
  const defaultById = new Map((defaults || []).map((item) => [item[idField], item]));
  return (current || []).map((item) => ({ ...(defaultById.get(item[idField]) || {}), ...item }));
}

function normalizeServiceOrders(orders) {
  return orders.map((order) => ({
    ...order,
    order_status: order.order_status || deriveServiceOrderStatus(order),
  }));
}

function deriveServiceOrderStatus(order) {
  if (order.trip_id || order.matched_robotaxi_id) return "ON_THE_WAY_PICKUP";
  if (order.estimated_pricing_decision_id || order.estimated_price || order.quoted_price) return "WAITING_ROBOTAXI_CALL";
  return "WAITING_PRICE_ESTIMATE";
}

function normalizeRouteStrategyReferences(items) {
  return items.map((item) => ({
    ...item,
    route_strategy_id: normalizeRouteStrategyId(item.route_strategy_id),
    route_history: Array.isArray(item.route_history)
      ? normalizeRouteStrategyReferences(item.route_history)
      : item.route_history,
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
    fleetOperationTaskSequence,
    fleetOperationPolicyRunSequence,
    fleetOperationPolicyResultSequence,
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
    taskDispatchRunSequence,
    taskDispatchResultSequence,
    taskPlanningRunSequence,
    taskPlanningResultSequence,
    fleetOperationPolicies: snapshot.fleetOperationPolicies || [],
    fleetOperationPolicyRuns: snapshot.fleetOperationPolicyRuns || [],
    fleetOperationPolicyResults: snapshot.fleetOperationPolicyResults || [],
    fleetOperationDispatchStrategies: snapshot.fleetOperationDispatchStrategies || [],
    fleetOperationDispatchRuns: snapshot.fleetOperationDispatchRuns || [],
    taskPriorityConfigs: snapshot.taskPriorityConfigs || [],
    fleetOperationDispatchDecisions: snapshot.fleetOperationDispatchDecisions || [],
    taskDispatchStrategies: snapshot.taskDispatchStrategies || [],
    robotaxiTaskPlanningStrategies: snapshot.robotaxiTaskPlanningStrategies || [],
    robotaxiTaskPlanningRuns: snapshot.robotaxiTaskPlanningRuns || [],
    robotaxiTaskPlanningResults: snapshot.robotaxiTaskPlanningResults || [],
    taskDispatchRuns: snapshot.taskDispatchRuns || [],
    taskDispatchResults: snapshot.taskDispatchResults || [],
    simulationPolicies: snapshot.simulationPolicies || [],
    workflowTimingProfiles: snapshot.workflowTimingProfiles || [],
    businessTimingCalculationRuns: snapshot.businessTimingCalculationRuns || [],
    costModelProfiles: snapshot.costModelProfiles || [],
    costCalculationRuns: snapshot.costCalculationRuns || [],
    costRecords: snapshot.costRecords || [],
    revenueCalculationRuns: snapshot.revenueCalculationRuns || [],
    revenueRecords: snapshot.revenueRecords || [],
    metricDefinitions: snapshot.metricDefinitions || [],
    metricCalculationRuns: snapshot.metricCalculationRuns || [],
    metricObservations: snapshot.metricObservations || [],
    metricPeriodType: snapshot.metricPeriodType || "ALL",
    simulationRuns: snapshot.simulationRuns || [],
    simulationEvents: [],
    timedOperations: snapshot.timedOperations || [],
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
      fleetOperationDispatchStrategies: [],
      fleetOperationDispatchRuns: [],
      fleetOperationDispatchDecisions: [],
      taskDispatchStrategies: [],
      robotaxiTaskPlanningRuns: [],
      robotaxiTaskPlanningResults: [],
      taskDispatchRuns: [],
      taskDispatchResults: [],
      simulationPolicies: [],
      simulationRuns: [],
      simulationEvents: [],
      timedOperations: [],
      costModelProfiles: [],
      costCalculationRuns: [],
      costRecords: [],
      revenueCalculationRuns: [],
      revenueRecords: [],
      metricDefinitions: [],
      metricCalculationRuns: [],
      metricObservations: [],
      metricPeriodType: snapshot.metricPeriodType || "ALL",
    }));
  } catch (error) {
    // Local persistence is a convenience for this prototype; runtime should continue if storage is unavailable.
  }
}

function getRuntimePersistenceDebounceMs(simulationPolicies = []) {
  const activePolicy = (simulationPolicies || []).find((item) => item.policy_status === "ACTIVE") || simulationPolicies?.[0] || null;
  const value = Number(activePolicy?.simulation_performance_config?.persistence_debounce_ms);
  return Number.isFinite(value) && value >= 0 ? Math.min(Math.floor(value), 5000) : 800;
}

async function loadPersistedRuntimeSnapshot() {
  if (typeof indexedDB === "undefined") return null;
  try {
    const database = await openRuntimeSnapshotDatabase();
    return await runRuntimeStoreRequest(database, "readonly", (store) => store.get(runtimeStorageKey));
  } catch (error) {
    return null;
  }
}

async function persistRuntimeSnapshot(snapshot) {
  if (typeof indexedDB === "undefined") return;
  try {
    const database = await openRuntimeSnapshotDatabase();
    await runRuntimeStoreRequest(database, "readwrite", (store) => store.put(snapshot, runtimeStorageKey));
  } catch (error) {
    // Runtime continues in memory when persistent snapshot storage is unavailable.
  }
}

async function clearPersistedRuntimeSnapshot() {
  if (typeof indexedDB === "undefined") return;
  try {
    const database = await openRuntimeSnapshotDatabase();
    await runRuntimeStoreRequest(database, "readwrite", (store) => store.clear());
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
  [...current, ...persisted].forEach((event) => {
    const id = `${event.simulation_run_id || "run"}:${event.simulation_event_id || event.created_at}`;
    if (!byId.has(id)) byId.set(id, event);
  });
  return [...byId.values()].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

async function loadPersistedSimulationEvents() {
  if (typeof indexedDB === "undefined") return [];
  try {
    const database = await openSimulationEventDatabase();
    const records = await runEventStoreRequest(database, "readonly", (store) => store.getAll());
    const events = records.map((record) => record.event).filter(Boolean);
    events.forEach((event) => persistedSimulationEventIds.add(getSimulationEventStorageId(event)));
    return events;
  } catch (error) {
    return [];
  }
}

async function persistSimulationEvents(events) {
  if (typeof indexedDB === "undefined" || !events.length) return;
  const pendingEvents = events.filter((event) => !persistedSimulationEventIds.has(getSimulationEventStorageId(event)));
  if (!pendingEvents.length) return;
  try {
    const database = await openSimulationEventDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(simulationEventStoreName, "readwrite");
      const store = transaction.objectStore(simulationEventStoreName);
      pendingEvents.forEach((event) => store.put({ storage_id: getSimulationEventStorageId(event), event }));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    pendingEvents.forEach((event) => persistedSimulationEventIds.add(getSimulationEventStorageId(event)));
  } catch (error) {
    // Runtime continues in memory when persistent event storage is unavailable.
  }
}

async function clearPersistedSimulationEvents() {
  persistedSimulationEventIds.clear();
  if (typeof indexedDB === "undefined") return;
  try {
    const database = await openSimulationEventDatabase();
    await runEventStoreRequest(database, "readwrite", (store) => store.clear());
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
        database.createObjectStore(simulationEventStoreName, { keyPath: "storage_id" });
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
  fleetOperationTaskSequence = Math.max(
    deriveSequence(snapshot.cleaningTasks || [], "task_id", "TASK-CLN-"),
    deriveSequence(snapshot.chargingTasks || [], "task_id", "TASK-CHG-"),
    deriveSequence(snapshot.maintenanceTasks || [], "task_id", "TASK-MNT-"),
    deriveSequence(snapshot.failureHandlingTasks || [], "task_id", "TASK-FHL-"),
    deriveSequence(snapshot.retirementTasks || [], "task_id", "TASK-RET-"),
  );
  fleetOperationPolicyRunSequence = deriveSequence(snapshot.fleetOperationPolicyRuns || [], "fleet_operation_policy_run_id", "FOP-RUN-");
  fleetOperationPolicyResultSequence = deriveSequence(snapshot.fleetOperationPolicyResults || [], "fleet_operation_policy_result_id", "FOP-RESULT-");
  fleetOperationDispatchRunSequence = deriveSequence(snapshot.fleetOperationDispatchRuns || [], "fleet_operation_dispatch_run_id", "FODR-");
  fleetOperationDispatchDecisionSequence = deriveSequence(snapshot.fleetOperationDispatchDecisions || [], "fleet_operation_dispatch_decision_id", "FODD-");
  taskDispatchRunSequence = deriveSequence(snapshot.taskDispatchRuns || [], "task_dispatch_run_id", "TDR-");
  taskDispatchResultSequence = deriveSequence(snapshot.taskDispatchResults || [], "task_dispatch_result_id", "TDRS-");
  taskPlanningRunSequence = deriveSequence(snapshot.robotaxiTaskPlanningRuns || [], "robotaxi_task_planning_run_id", "TPR-");
  taskPlanningResultSequence = deriveSequence(snapshot.robotaxiTaskPlanningResults || [], "robotaxi_task_planning_result_id", "TPRS-");
  const operationalData = snapshot.operationalData || {};
  longTermDemandForecastRunSequence = deriveSequence(operationalData.longTermDemandForecastRuns || [], "forecast_run_id", "LDF-RUN-");
  longTermDemandForecastResultSequence = deriveSequence(operationalData.longTermDemandForecasts || [], "forecast_result_id", "LDF-RES-");
  supplyDecisionRunSequence = deriveSequence(operationalData.supplyDecisionRuns || [], "supply_decision_run_id", "SD-RUN-");
  shortTermDemandForecastRunSequence = deriveSequence(operationalData.shortTermDemandForecastRuns || [], "short_term_forecast_run_id", "STF-RUN-");
  shortTermDemandForecastResultSequence = deriveSequence(operationalData.shortTermDemandForecastResults || [], "short_term_forecast_result_id", "STF-RES-");
  deploymentDecisionRunSequence = deriveSequence(operationalData.deploymentDecisionRuns || [], "deployment_decision_run_id", "DD-RUN-");
  deploymentPlanSequence = deriveSequence(operationalData.deploymentPlans || [], "deployment_plan_id", "DPL-");
  supplyPlanSequence = deriveSequence(operationalData.supplyPlans || [], "supply_plan_id", "FPP-");
  productionBatchSequence = deriveSequence(operationalData.productionBatches || [], "production_batch_id", "PB-");
  fleetAllocationRunSequence = deriveSequence(operationalData.fleetAllocationRuns || [], "fleet_allocation_run_id", "FAR-");
  fleetAllocationResultSequence = deriveSequence(operationalData.fleetAllocationResults || [], "fleet_allocation_result_id", "FAR-RES-");
  supplyDemandBalanceRunSequence = deriveSequence(operationalData.supplyDemandBalanceRuns || [], "supply_demand_balance_run_id", "SDB-RUN-");
  supplyDemandBalanceResultSequence = deriveSequence(operationalData.supplyDemandBalanceResults || [], "supply_demand_balance_result_id", "SDB-RES-");
  robotaxiDeliveryOrderSequence = deriveSequence(operationalData.robotaxiDeliveryOrders || [], "delivery_order_id", "RDO-");
  producedRobotaxiSequence = deriveSequence(operationalData.robotaxis || [], "robotaxi_id", "RTX-");
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
  return rows.filter((row) => {
    const keywordMatched = !keyword || columns.some((key) => String(row[key] || "").toLowerCase().includes(keyword));
    const statusMatched = !statusField || !filters.statusValue || row[statusField] === filters.statusValue;
    const triggerMatched = !filters.triggerType || row.trigger_type === filters.triggerType;
    const objectTypeMatched = !filters.objectType || row.object_type === filters.objectType;
    return keywordMatched && statusMatched && triggerMatched && objectTypeMatched;
  });
}

function isFinanceCalculationTerminal(status) {
  return ["SUCCEEDED", "PARTIALLY_SUCCEEDED", "FAILED"].includes(status);
}

function formatOperatingDataPoolState(metricCalculationRuns = [], periodType = "ALL") {
  const latestRun = operatingDataPoolService.getLatestCalculationRun(metricCalculationRuns, periodType);
  if (!latestRun) return "数据池尚未更新";
  return `${latestRun.metric_calculation_run_id} · ${getDisplayValue(latestRun.calculation_status, "calculation_status")}`;
}

function createMetricInsightGroup({ title, description, primary, secondary = [] }) {
  const primaryPresentation = createMetricPresentation(primary);
  const secondaryPresentations = (secondary || []).map(createMetricPresentation).filter((item) => item.hasData);
  return {
    title,
    description,
    primary: primaryPresentation,
    primaryText: primaryPresentation.text,
    secondaryText: secondaryPresentations.length
      ? secondaryPresentations.map((item) => item.text).join(" / ")
      : "等待周期计算结果",
  };
}

function createMetricPresentation(row) {
  if (!row) return { hasData: false, row: null, label: "指标", valueText: "暂无数据", text: "暂无数据" };
  const label = getMetricDisplayName(row);
  const valueText = formatMetricDisplayValue(row);
  return {
    hasData: Boolean(row.metric_definition_id),
    row,
    label,
    valueText,
    text: `${label} ${valueText}`,
  };
}

function getMetricDisplayName(row) {
  const name = row?.metric_name_cn;
  if (name && name !== "undefined" && name !== row?.metric_definition_id) return name;
  return "指标定义缺失";
}

function formatMetricDisplayValue(row) {
  if (!row || row.metric_value === null || row.metric_value === undefined) return "无数据";
  const value = Number(row.metric_value);
  if (row.metric_unit === "currency") return `¥${value.toFixed(2)}`;
  if (row.metric_unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (row.metric_unit === "km") return `${value.toFixed(2)} km`;
  if (row.metric_unit === "second") return `${Math.round(value)} 秒`;
  if (row.metric_unit === "minute") return `${value.toFixed(1)} 分钟`;
  return Number.isFinite(value) ? String(value) : String(row.metric_value);
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
  const values = orderedValues.length > 0
    ? orderedValues
    : rows.map((row) => row[statusField]).filter(Boolean);
  return [...new Set(values)].map((value) => ({
    value,
    label: getStatusDisplayValue(statusField, value, rows.find((row) => row[statusField] === value) || { status_context: statusContext }),
    count: rows.filter((row) => row[statusField] === value).length,
  })).filter((item) => item.count > 0 || orderedValues.includes(item.value));
}

function getOpenKeysForPage(pageKey) {
  if (pageKey === "console") return [];
  return navigationRegistry?.getNavigationOpenKeys(pageKey) || [];
}

function getRootMenuKey(key) {
  return navigationRegistry?.getNavigationRootKey(key) || key;
}
