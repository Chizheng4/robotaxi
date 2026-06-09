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
let validateOperationsCenter;
let createCellContext;
let getDetailTitle;
let getDisplayValue;
let getFieldLabel;
let validateReadinessCheckTasks;
let validateDeploymentTasks;
let taskTypes;
let taskSequence = 0;
let deploymentTaskSequence = 0;
let routeExecutionSequence = 0;
let deploymentRouteSequence = 0;
let routePlanningRunSequence = 0;
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
      label: "策略执行管理"
    }]
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
    key: "routes",
    label: "Route 管理"
  }, {
    key: "routeExecutionManagement",
    label: "行驶记录管理",
    children: [{
      key: "routeExecutions",
      label: "运营行驶记录"
    }, {
      key: "serviceFulfillmentRecords",
      label: "服务履约记录"
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
}];
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
    title: "Route 管理",
    description: "Route 是路径规划策略执行后生成的路径结果，供运营行驶记录引用。",
    columns: ["route_id", "route_version", "route_strategy_id", "route_planning_run_id", "task_id", "route_execution_id", "robotaxi_id", "origin_cell_id", "target_cell_id", "road_segment_sequence", "route_step_count", "route_status", "failure_reason"]
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
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "worker_id", "check_result", "issue_type", "created_at"]
  },
  deploymentTasks: {
    title: "运营投放任务",
    description: "用于将可运营 Robotaxi 投放到指定服务区或待命位置。",
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "origin_cell_id", "planned_target_cell_id", "target_cell_id", "actual_target_cell_id", "arrival_behavior", "blocked_handling_policy", "arrival_execution_result", "planned_target_service_area_id", "target_service_area_id", "actual_target_service_area_id", "route_id", "route_strategy_id", "route_summary", "created_at"]
  },
  routeExecutions: {
    title: "运营行驶记录",
    description: "记录 Robotaxi 执行任务时的模拟行驶过程。",
    columns: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id", "route_id", "route_strategy_id", "planned_target_cell_id", "target_cell_id", "actual_target_cell_id", "planned_target_service_area_id", "current_target_service_area_id", "actual_target_service_area_id", "arrival_execution_result", "route_summary", "current_cell_id", "current_location_summary", "current_step_index", "total_step_count", "distance_traveled_km", "distance_remaining_km"]
  },
  taskEventLogs: {
    title: "任务事件日志",
    description: "记录运营准入任务的创建、分配、检查和状态反馈事件。",
    columns: ["event_id", "event_type", "event_result", "task_id", "robotaxi_id", "worker_id", "route_execution_id", "message", "created_at"]
  },
  routePlanningStrategies: {
    title: "路径规划策略",
    description: "用于管理路径规划策略对象，定义不同场景下如何生成路径。",
    columns: ["route_strategy_id", "strategy_name", "strategy_type", "planning_algorithm", "trigger_task_status", "origin_rule", "target_rule", "service_area_scope_rule", "route_generation_rule", "route_update_rule", "strategy_status", "strategy_usage_count", "route_planning_run_count"]
  },
  routePlanningRuns: {
    title: "策略执行管理",
    description: "记录每次路径规划策略执行过程。",
    columns: ["route_planning_run_id", "planning_result", "route_strategy_id", "planning_algorithm", "task_id", "route_execution_id", "robotaxi_id", "origin_cell_id", "target_cell_id", "result_route_id", "failure_reason", "created_at"]
  },
  serviceFulfillmentRecords: {
    title: "服务履约记录",
    description: "预留给未来 ServiceOrder / Trip 履约过程记录；当前阶段不实现业务数据。",
    columns: ["placeholder"]
  },
  robotaxis: {
    title: "Robotaxi 管理",
    description: "Robotaxi 是等待运维检查后进入运营闭环的自动驾驶车辆资产。",
    columns: ["robotaxi_id", "fleet_id", "battery_percent", "estimated_range_km", "availability_status", "motion_status", "current_cell_id", "location_summary", "current_task_id", "current_task_type", "current_task_status", "current_route_id", "current_route_execution_id", "unavailable_reason"]
  },
  validations: {
    title: "初始化校验",
    description: "根据初始化规则检查生成后的运营空间数据。",
    columns: ["rule_id", "rule_name", "result", "detail"]
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
  opsCenters: "opsCenter",
  workers: "worker",
  readinessTasks: "readinessTask",
  deploymentTasks: "deploymentTask",
  routeExecutions: "routeExecution",
  taskEventLogs: "taskEventLog",
  routePlanningStrategies: "routePlanningStrategy",
  routePlanningRuns: "routePlanningRun",
  serviceFulfillmentRecords: "serviceFulfillmentRecord",
  robotaxis: "robotaxi",
  validations: "validation"
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
  opsCenter: "ops_center_id",
  worker: "worker_id",
  readinessTask: "task_id",
  deploymentTask: "task_id",
  routeExecution: "route_execution_id",
  taskEventLog: "event_id",
  routePlanningStrategy: "route_strategy_id",
  routePlanningRun: "route_planning_run_id",
  serviceFulfillmentRecord: "placeholder",
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
  robotaxis: "availability_status",
  validations: "result"
};
const cellClass = {
  EMPTY: "cell-empty",
  ROAD: "cell-road",
  PLACE: "cell-place",
  BLOCKED: "cell-blocked"
};
const legendItems = [["cell-empty", "空白网格"], ["cell-road", "道路网格"], ["place-residential-swatch", "住宅地点"], ["place-office-swatch", "办公地点"], ["place-commercial-swatch", "商业地点"], ["place-hospital-swatch", "医院学校"], ["place-metro-station-swatch", "地铁接驳"], ["place-ops-center-swatch", "运营中心地点"], ["service-area-swatch", "服务区域"], ["ops-center-swatch", "运营中心覆盖"], ["route-swatch", "选中路径"], ["road-node-swatch", "道路节点"]];
const readinessStatusOptions = ["WAITING_ASSIGNMENT", "WAITING_CHECK", "CHECKING", "COMPLETED", "CANCELLED", "FAILED"];
const deploymentStatusOptions = ["WAITING_ROUTE", "WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL", "COMPLETED", "CANCELLED", "FAILED"];
const routeExecutionStatusOptions = ["WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"];
const routePlanningResultOptions = ["SUCCESS", "FAILED"];
const triggerTypeOptions = ["AUTO", "MANUAL"];
const runtimeStorageKey = "robotaxi.runtime.v018-bfs-route-planning";
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
    ...initializeOperationsCenter()
  }), []);
  const initialRuntime = useMemo(() => loadRuntimeSnapshot(initialData), [initialData]);
  const [operationalData, setOperationalData] = useState(initialRuntime.operationalData);
  const [readinessTasks, setReadinessTasks] = useState(initialRuntime.readinessTasks);
  const [deploymentTasks, setDeploymentTasks] = useState(initialRuntime.deploymentTasks);
  const [routeExecutions, setRouteExecutions] = useState(initialRuntime.routeExecutions);
  const [routePlanningRuns, setRoutePlanningRuns] = useState(initialRuntime.routePlanningRuns);
  const [taskEventLogs, setTaskEventLogs] = useState(initialRuntime.taskEventLogs);
  const initialValidations = useMemo(() => [...validateMapSpace(initialData), ...validateOperationsCenter(initialData)], [initialData]);
  const data = useMemo(() => ({
    ...operationalData,
    readinessCheckTasks: readinessTasks,
    deploymentTasks,
    routeExecutions,
    routePlanningRuns,
    taskEventLogs
  }), [deploymentTasks, operationalData, readinessTasks, routeExecutions, routePlanningRuns, taskEventLogs]);
  const validations = useMemo(() => [...initialValidations, ...validateReadinessCheckTasks(data), ...validateDeploymentTasks(data)], [data, initialValidations]);
  const [activePage, setActivePage] = useState(initialRuntime.activePage);
  const [selected, setSelected] = useState(initialRuntime.pageSelections[initialRuntime.activePage] || getDefaultSelection(initialRuntime.activePage, data));
  const [collapsed, setCollapsed] = useState(false);
  const [openMenuKeys, setOpenMenuKeys] = useState(getOpenKeysForPage(initialRuntime.activePage));
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [pageSelections, setPageSelections] = useState(initialRuntime.pageSelections);
  const [pageUiState, setPageUiState] = useState(initialRuntime.pageUiState);
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
    opsCenters: data.opsCenters,
    workers: data.workers.map(worker => enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks)),
    readinessTasks,
    deploymentTasks: deploymentTasks.map(task => enrichDeploymentTaskForDisplay(task, data)),
    routeExecutions: routeExecutions.map(execution => enrichRouteExecutionForDisplay(execution, data)),
    taskEventLogs,
    routePlanningStrategies: createRoutePlanningStrategyRows(data, routePlanningRuns),
    routePlanningRuns,
    serviceFulfillmentRecords: [],
    robotaxis: data.robotaxis.map(robotaxi => enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions)),
    validations
  }), [data, deploymentTasks, readinessTasks, routeExecutions, routePlanningRuns, taskEventLogs, validations]);
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
      return task ? enrichDeploymentTaskForDisplay(task, data) : null;
    }
    if (selected.type === "routeExecution") {
      const execution = routeExecutions.find(item => item.route_execution_id === selected.id);
      return execution ? enrichRouteExecutionForDisplay(execution, data) : null;
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
      routePlanningStrategy: rowsByPage.routePlanningStrategies,
      routePlanningRun: rowsByPage.routePlanningRuns,
      serviceFulfillmentRecord: rowsByPage.serviceFulfillmentRecords,
      opsCenter: data.opsCenters,
      worker: data.workers,
      readinessTask: readinessTasks,
      taskEventLog: taskEventLogs,
      validation: validations
    };
    return collections[selected.type]?.find(item => item[idFieldByType[selected.type]] === selected.id) || null;
  }, [data, rowsByPage, selected, validations]);
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
      }))
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
  useEffect(() => {
    saveRuntimeSnapshot({
      operationalData,
      readinessTasks,
      deploymentTasks,
      routeExecutions,
      routePlanningRuns,
      taskEventLogs,
      activePage,
      pageSelections,
      pageUiState
    });
  }, [activePage, deploymentTasks, operationalData, pageSelections, pageUiState, readinessTasks, routeExecutions, routePlanningRuns, taskEventLogs]);
  return /*#__PURE__*/React.createElement(Layout, {
    className: "ops-shell"
  }, /*#__PURE__*/React.createElement(Sider, {
    className: "ops-sider",
    width: 216,
    collapsedWidth: 58,
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
  }, "\u91CD\u7F6E\u6A21\u62DF\u6570\u636E"))), /*#__PURE__*/React.createElement(Layout, {
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
      planDeploymentRoute,
      viewRecordDetail,
      viewGeneratedRoute,
      viewRouteExecutionForDeployment,
      startRouteExecution,
      advanceRouteExecution,
      submitNormalArrival,
      submitAbnormalArrival,
      data,
      taskEventLogs,
      routePlanningRuns: rowsByPage.routePlanningRuns
    }
  })), /*#__PURE__*/React.createElement("aside", {
    className: "detail-rail"
  }, detailCollapsed ? /*#__PURE__*/React.createElement(Button, {
    className: "detail-toggle-button",
    size: "small",
    title: "\u5C55\u5F00\u8BE6\u60C5",
    onClick: () => setDetailCollapsed(false)
  }, "\u2039") : /*#__PURE__*/React.createElement(DetailPanel, {
    selectedObject: detailSelectedObject,
    selectedType: detailSelectedType,
    onCollapse: () => setDetailCollapsed(true)
  })))));
  function handleMenuClick(key) {
    setActivePage(key);
    setOpenMenuKeys(getOpenKeysForPage(key));
    setSelected(pageSelections[key] || getDefaultSelection(key, data));
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
    setActivePage("console");
    setOpenMenuKeys([]);
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
    routePlanningRunSequence = 0;
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
    setTaskEventLogs([]);
    setActivePage("console");
    setOpenMenuKeys([]);
    setSelected(nextSelection);
    setPageSelections({
      console: nextSelection
    });
    setPageUiState({});
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(runtimeStorageKey);
      } catch (error) {
        // Ignore storage cleanup failures; in-memory reset is already complete.
      }
    }
  }
  function selectForPage(page, type, id) {
    const nextSelection = {
      type,
      id
    };
    setSelected(nextSelection);
    setPageSelections(current => ({
      ...current,
      [page]: nextSelection
    }));
  }
  function viewRecordDetail(page, type, id) {
    selectForPage(page, type, id);
    setDetailCollapsed(false);
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
    setActivePage("routeExecutions");
    setOpenMenuKeys(getOpenKeysForPage("routeExecutions"));
    setSelected(nextSelection);
    setDetailCollapsed(false);
    setPageSelections(current => ({
      ...current,
      routeExecutions: nextSelection
    }));
    setPageUiState(current => ({
      ...current,
      routeExecutions: {
        filters: nextFilters,
        appliedFilters: nextFilters
      }
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
    setActivePage("routes");
    setOpenMenuKeys(getOpenKeysForPage("routes"));
    setSelected(nextSelection);
    setDetailCollapsed(false);
    setPageSelections(current => ({
      ...current,
      routes: nextSelection
    }));
    setPageUiState(current => ({
      ...current,
      routes: {
        filters: {
          keyword: routePlanningRun.result_route_id,
          statusValue: null,
          triggerType: null
        },
        appliedFilters: {
          keyword: routePlanningRun.result_route_id,
          statusValue: null,
          triggerType: null
        }
      }
    }));
  }
  function updatePageUiState(page, nextState) {
    setPageUiState(current => ({
      ...current,
      [page]: nextState
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
    const target = getDefaultDeploymentTarget(data);
    const triggerLog = createEventLog({
      event_type: taskTypes.TaskEventType.DEPLOYMENT_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: "手动触发运营投放任务生成"
    });
    if (!target || candidates.length === 0) {
      setTaskEventLogs(logs => [createEventLog({
        event_type: taskTypes.TaskEventType.DEPLOYMENT_FAILED,
        event_result: taskTypes.TaskEventResult.SKIPPED,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: target ? "当前没有可运营投放的 Robotaxi" : "当前没有有效投放目标"
      }), triggerLog, ...logs]);
      return;
    }
    const newTasks = candidates.map(robotaxi => createDeploymentTask(robotaxi, target));
    setDeploymentTasks(tasks => [...newTasks, ...tasks]);
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
      message: `已创建 ${task.robotaxi_id} 的运营投放任务`
    })), triggerLog, ...logs]);
    selectForPage("deploymentTasks", "deploymentTask", newTasks[0].task_id);
  }
  function planDeploymentRoute(taskId) {
    const task = deploymentTasks.find(item => item.task_id === taskId);
    if (!task) return;
    if (task.task_status === taskTypes.DeploymentTaskStatus.ARRIVAL_ABNORMAL) {
      planAbnormalArrivalRoute(task);
      return;
    }
    if (task.task_status !== taskTypes.DeploymentTaskStatus.WAITING_ROUTE) return;
    const routeExecutionId = nextRouteExecutionId();
    const routePlanningRunId = nextRoutePlanningRunId();
    const route = createDeploymentRoute(task, data, {
      originCellId: task.origin_cell_id,
      targetCellId: task.planned_target_cell_id || task.target_cell_id,
      targetServiceAreaId: task.planned_target_service_area_id || task.target_service_area_id,
      strategyId: taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT,
      routeExecutionId,
      routePlanningRunId
    });
    if (route.route_steps.length === 0) {
      setRoutePlanningRuns(items => [createRoutePlanningRun({
        routePlanningRunId,
        routeStrategyId: route.route_strategy_id,
        planningAlgorithm: route.planning_algorithm,
        taskId: task.task_id,
        routeExecutionId: null,
        robotaxiId: task.robotaxi_id,
        originCellId: task.origin_cell_id,
        targetCellId: task.planned_target_cell_id || task.target_cell_id,
        resultRouteId: null,
        planningResult: taskTypes.RoutePlanningResult.FAILED,
        failureReason: route.failure_reason
      }), ...items]);
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
    const routeCells = getRouteExecutionCells(route, data.roadSegments, task.origin_cell_id, task.planned_target_cell_id || task.target_cell_id);
    const execution = taskTypes.createRouteExecution({
      route_execution_id: routeExecutionId,
      task_id: task.task_id,
      task_type: task.task_type,
      robotaxi_id: task.robotaxi_id,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      execution_status: taskTypes.RouteExecutionStatus.WAITING_START,
      origin_cell_id: task.origin_cell_id,
      planned_target_zone_id: task.planned_target_zone_id || task.target_zone_id,
      planned_target_service_area_id: task.planned_target_service_area_id || task.target_service_area_id,
      planned_target_cell_id: task.planned_target_cell_id || task.target_cell_id,
      target_cell_id: task.planned_target_cell_id || task.target_cell_id,
      target_service_area_id: task.planned_target_service_area_id || task.target_service_area_id,
      actual_target_service_area_id: null,
      actual_target_cell_id: null,
      current_cell_id: routeCells[0] || task.origin_cell_id,
      current_step_index: 0,
      total_step_count: Math.max(0, routeCells.length - 1),
      route_cell_ids: routeCells,
      same_service_area_retry_allowed: true,
      current_target_service_area_id: task.planned_target_service_area_id || task.target_service_area_id,
      route_history: [createRouteHistoryEntry(route, taskTypes.RouteChangeReason.INITIAL_PLANNING, null)],
      distance_traveled_km: 0,
      distance_remaining_km: route.total_distance_m / 1000,
      time_elapsed: "0",
      battery_consumed_percent: 0,
      started_at: null,
      completed_at: null,
      failure_reason: null
    });
    setOperationalData(current => ({
      ...current,
      routes: [route, ...current.routes],
      robotaxis: current.robotaxis.map(robotaxi => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        current_task_id: task.task_id,
        current_route_id: route.route_id,
        motion_status: "PARKED"
      } : robotaxi)
    }));
    setRouteExecutions(items => [execution, ...items]);
    setRoutePlanningRuns(items => [createRoutePlanningRun({
      routePlanningRunId,
      routeStrategyId: route.route_strategy_id,
      planningAlgorithm: route.planning_algorithm,
      taskId: task.task_id,
      routeExecutionId: execution.route_execution_id,
      robotaxiId: task.robotaxi_id,
      originCellId: task.origin_cell_id,
      targetCellId: task.planned_target_cell_id || task.target_cell_id,
      resultRouteId: route.route_id,
      planningResult: taskTypes.RoutePlanningResult.SUCCESS,
      failureReason: taskTypes.RoutePlanningFailureReason.NONE
    }), ...items]);
    setDeploymentTasks(tasks => tasks.map(item => item.task_id === execution.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.WAITING_START,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      route_id: route.route_id,
      route_strategy_id: route.route_strategy_id,
      message: `${task.task_id} 已生成模拟路径 ${route.route_id} 和行驶记录 ${execution.route_execution_id}`
    });
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }
  function planAbnormalArrivalRoute(task) {
    const execution = routeExecutions.find(item => item.task_id === task.task_id);
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
    setRouteExecutions(items => items.map(item => item.route_execution_id === execution.route_execution_id ? {
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
      distance_traveled_km: 0,
      distance_remaining_km: route.total_distance_m / 1000,
      time_elapsed: "0",
      completed_at: null,
      failure_reason: null
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
      resultRouteId: route.route_id,
      planningResult: taskTypes.RoutePlanningResult.SUCCESS,
      failureReason: taskTypes.RoutePlanningFailureReason.NONE
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
    const distancePerStepKm = execution.total_step_count > 0 ? route.total_distance_m / 1000 / execution.total_step_count : 0;
    const distanceTraveledKm = Number((distancePerStepKm * nextStepIndex).toFixed(2));
    const distanceDeltaKm = Number(Math.max(0, distanceTraveledKm - Number(execution.distance_traveled_km || 0)).toFixed(2));
    const distanceRemainingKm = Number(Math.max(0, route.total_distance_m / 1000 - distanceTraveledKm).toFixed(2));
    const robotaxi = data.robotaxis.find(item => item.robotaxi_id === execution.robotaxi_id);
    const batteryDeltaPercent = robotaxi?.max_range_km ? Number((distanceDeltaKm / robotaxi.max_range_km * 100).toFixed(2)) : 0;
    const batteryConsumedPercent = Number((Number(execution.battery_consumed_percent || 0) + batteryDeltaPercent).toFixed(2));
    setRouteExecutions(items => items.map(item => item.route_execution_id === routeExecutionId ? {
      ...item,
      execution_status: completed ? taskTypes.RouteExecutionStatus.ARRIVED : taskTypes.RouteExecutionStatus.MOVING,
      current_cell_id: nextCellId,
      current_step_index: nextStepIndex,
      distance_traveled_km: distanceTraveledKm,
      distance_remaining_km: distanceRemainingKm,
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
      return;
    }
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_STEP_ADVANCED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: execution.task_id,
      robotaxi_id: execution.robotaxi_id,
      message: `${execution.robotaxi_id} 继续行驶至 ${nextCellId}`
    });
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
      task_status: taskTypes.DeploymentTaskStatus.WAITING_ROUTE,
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
  function createEventLog(event) {
    return taskTypes.createTaskEventLog({
      event_id: nextEventId(),
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
  const isTaskOperationPage = isReadinessPage || isDeploymentPage || isRouteExecutionPage;
  const hasEventPanel = isTaskOperationPage || isRoutePlanningPage;
  const config = tableConfig[page];
  const objectType = pageObjectType[page];
  const idField = idFieldByType[objectType];
  const statusField = statusFieldByPage[page];
  const [eventPanelHeight, setEventPanelHeight] = useState(112);
  const [abnormalTask, setAbnormalTask] = useState(null);
  const [abnormalIssueType, setAbnormalIssueType] = useState(taskTypes?.IssueType?.LOW_BATTERY || "LOW_BATTERY");
  const [abnormalArrivalExecution, setAbnormalArrivalExecution] = useState(null);
  const [abnormalArrivalType, setAbnormalArrivalType] = useState(taskTypes?.ArrivalExecutionResult?.ARRIVED_WITH_TARGET_OCCUPIED || "ARRIVED_WITH_TARGET_OCCUPIED");
  const filters = uiState.filters;
  const appliedFilters = uiState.appliedFilters;
  const displayRows = useMemo(() => {
    return filterRecordRows(rows, config.columns, statusField, appliedFilters);
  }, [appliedFilters, config.columns, rows, statusField]);
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
  const eventRows = isRoutePlanningPage ? actions.routePlanningRuns : actions.taskEventLogs;
  const eventColumns = isRoutePlanningPage ? tableConfig.routePlanningRuns.columns : tableConfig.taskEventLogs.columns;
  const eventRowKey = isRoutePlanningPage ? "route_planning_run_id" : "event_id";
  const tableScrollY = hasEventPanel ? `calc(100vh - ${eventPanelHeight + 238}px)` : "calc(100vh - 96px)";
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
    onClick: () => applyFilters(filters)
  }, "\u67E5\u8BE2"), /*#__PURE__*/React.createElement(Button, {
    size: "small",
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
  }, "\u751F\u6210\u6295\u653E\u4EFB\u52A1")), /*#__PURE__*/React.createElement(Table, {
    size: "small",
    rowKey: idField,
    columns: finalColumns,
    dataSource: displayRows,
    pagination: {
      pageSize: 14,
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
    })
  }), hasEventPanel && /*#__PURE__*/React.createElement("div", {
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
  }, isRoutePlanningPage ? "路径规划执行记录" : "最近任务事件"), /*#__PURE__*/React.createElement(Table, {
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
    dataSource: eventRows,
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
        render: (_, row) => renderReadinessActions(row, {
          ...actions,
          openAbnormalModal: openAbnormalModal,
          page,
          objectType,
          idField
        })
      };
    }
    if (isDeploymentPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderDeploymentActions(row, {
          ...actions,
          page,
          objectType,
          idField
        })
      };
    }
    if (isRouteExecutionPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderRouteExecutionActions(row, {
          ...actions,
          openAbnormalArrivalModal,
          page,
          objectType,
          idField
        })
      };
    }
    if (isRoutePlanningRunPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 180,
        render: (_, row) => renderRoutePlanningRunActions(row, {
          ...actions,
          page,
          objectType,
          idField
        })
      };
    }
    return null;
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
    onUiStateChange({
      filters: nextFilters,
      appliedFilters: nextFilters
    });
  }
  function resetFilters() {
    const resetValue = {
      keyword: "",
      statusValue: null,
      triggerType: null
    };
    onUiStateChange({
      filters: resetValue,
      appliedFilters: resetValue
    });
  }
  function updateFilters(nextFilters) {
    onUiStateChange({
      ...uiState,
      filters: nextFilters
    });
  }
  function applyFilters(nextFilters) {
    onUiStateChange({
      filters: nextFilters,
      appliedFilters: nextFilters
    });
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
  if (["readinessTasks", "deploymentTasks", "routeExecutions", "routePlanningStrategies", "routePlanningRuns"].includes(page)) {
    return /*#__PURE__*/React.createElement("div", {
      className: "module-footer"
    }, /*#__PURE__*/React.createElement("span", null, "\u5F53\u524D\u663E\u793A ", displayCount, " / \u5168\u90E8 ", totalCount), eventCount !== null && /*#__PURE__*/React.createElement("span", null, "\u4E8B\u4EF6 ", eventCount), /*#__PURE__*/React.createElement("span", null, hasFilter ? "已应用筛选条件" : "未应用筛选"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "module-footer"
  }, /*#__PURE__*/React.createElement("span", null, "\u8BB0\u5F55 ", totalCount), /*#__PURE__*/React.createElement("span", null, "\u70B9\u51FB\u8868\u683C\u884C\u53EF\u5728\u53F3\u4FA7\u67E5\u770B\u8BE6\u60C5"));
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
      title: "\u9690\u85CF\u8BE6\u60C5",
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
    title: "\u9690\u85CF\u8BE6\u60C5",
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
  return ["robotaxi", "worker", "route", "deploymentTask", "routeExecution"].includes(selectedType);
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
      children: /*#__PURE__*/React.createElement(Descriptions, {
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
      keys: ["current_task_id", "current_task_type", "current_task_status", "current_route_id"]
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
      keys: ["route_id", "route_version", "route_status", "failure_reason", "route_strategy_id", "route_planning_run_id"]
    }, {
      key: "relation",
      label: "业务关联",
      keys: ["task_id", "route_execution_id", "robotaxi_id"]
    }, {
      key: "location",
      label: "起终点",
      keys: ["origin_cell_id", "target_cell_id", "start_cell_id", "end_cell_id"]
    }, {
      key: "steps",
      label: "路径步骤",
      keys: ["road_segment_sequence", "route_step_count", "route_steps"]
    }, {
      key: "metrics",
      label: "路径指标",
      keys: ["total_distance_m", "estimated_time_s", "related_service_area_ids"]
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
      label: "时间",
      keys: ["created_at", "started_at", "completed_at", "failure_reason"]
    }];
  }
  if (selectedType === "routeExecution") {
    return [{
      key: "basic",
      label: "执行信息",
      keys: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id", "arrival_execution_result"]
    }, {
      key: "route",
      label: "路径信息",
      keys: ["route_id", "route_strategy_id", "current_target_service_area_id", "route_summary", "route_detail", "route_history"]
    }, {
      key: "location",
      label: "目标位置",
      keys: ["origin_cell_id", "origin_location_summary", "origin_location_detail", "planned_target_cell_id", "planned_target_service_area_id", "target_cell_id", "target_location_summary", "target_location_detail", "target_service_area_id", "actual_target_cell_id", "actual_target_service_area_id", "current_cell_id", "current_location_summary", "current_location_detail"]
    }, {
      key: "progress",
      label: "执行进度",
      keys: ["current_step_index", "total_step_count", "distance_traveled_km", "distance_remaining_km", "time_elapsed", "battery_consumed_percent", "started_at", "completed_at", "failure_reason"]
    }];
  }
  return [];
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
  if (key === "route_step_count") return row.route_steps?.length ?? row.total_step_count ?? 0;
  if (key === "result") {
    const passed = row[key] === "PASS";
    return /*#__PURE__*/React.createElement(Tag, {
      color: passed ? "success" : "error"
    }, getDisplayValue(row[key]));
  }
  if (Array.isArray(row[key])) return row[key].join(" / ");
  if (typeof row[key] === "boolean") return row[key] ? "是" : "否";
  if (typeof row[key] === "object" && row[key] !== null) return summarizeObject(row[key]);
  return getFieldDisplayValue(key, row[key] ?? "", row);
}
function RowActionButton({
  children,
  onClick,
  type = "primary",
  danger = false
}) {
  return /*#__PURE__*/React.createElement(Button, {
    size: "small",
    type: type,
    danger: danger,
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
  if (["WAITING_ROUTE", "ARRIVAL_ABNORMAL"].includes(row.task_status)) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.planDeploymentRoute(row.task_id)
    }, "\u8DEF\u5F84\u89C4\u5212");
  }
  if (["WAITING_START", "MOVING", "ARRIVED"].includes(row.task_status)) {
    return /*#__PURE__*/React.createElement(RowActionButton, {
      onClick: () => actions.viewRouteExecutionForDeployment(row)
    }, "\u67E5\u770B\u884C\u9A76\u8BB0\u5F55");
  }
  return renderViewDetailAction(row, actions);
}
function renderRouteExecutionActions(row, actions) {
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
  if (row.execution_status === "ARRIVAL_ABNORMAL") {
    return renderViewDetailAction(row, actions);
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
  return /*#__PURE__*/React.createElement("div", {
    className: "compact-location-detail"
  }, /*#__PURE__*/React.createElement("span", null, "\u5171 ", routeSteps.length, " \u6B65\uFF1A", firstCellId, " \u2192 ", lastCellId), /*#__PURE__*/React.createElement("details", null, /*#__PURE__*/React.createElement("summary", null, "\u67E5\u770B\u5B8C\u6574\u8DEF\u5F84\u6B65\u9AA4"), /*#__PURE__*/React.createElement("div", {
    className: "route-step-list"
  }, routeSteps.map(step => /*#__PURE__*/React.createElement("div", {
    key: `${step.step_index}-${step.cell_id}`
  }, step.step_index, " \u2192 ", step.cell_id, " \u2192 ", step.road_segment_id || "无道路片段", " \u2192 ", getDisplayValue(step.direction) || "未知方向", " \u2192 ", step.distance_km ?? 0, " km")))));
}
function summarizeObject(value) {
  const enabled = Object.entries(value).filter(([, itemValue]) => itemValue === true).map(([key]) => getFieldLabel(key));
  return enabled.length > 0 ? enabled.join(", ") : "无";
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
  return getDisplayValue(value);
}
function summarizeRouteDetail(routeDetail) {
  if (!routeDetail) return "无";
  const routeId = routeDetail.route_id || "未生成";
  const startCellId = routeDetail.start_cell_id || "未知起点";
  const endCellId = routeDetail.end_cell_id || "未知终点";
  const stepCount = routeDetail.route_step_count || routeDetail.route_steps?.length || 0;
  const strategyId = routeDetail.route_strategy_id ? `，策略 ${routeDetail.route_strategy_id}` : "";
  return `${routeId}：${startCellId} 到 ${endCellId}，共 ${stepCount} 步${strategyId}`;
}
function summarizeRouteSteps(routeSteps) {
  if (!routeSteps || routeSteps.length === 0) return "无路径步骤";
  const firstCellId = routeSteps[0]?.cell_id || "未知起点";
  const lastCellId = routeSteps[routeSteps.length - 1]?.cell_id || "未知终点";
  return `共 ${routeSteps.length} 步：${firstCellId} → ${lastCellId}`;
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
  return ["task_status", "execution_status", "current_task_status", "current_execution_status", "availability_status", "motion_status", "worker_status", "route_status", "ops_center_status", "zone_status", "road_status", "node_status", "segment_status", "service_area_status", "place_status", "strategy_status", "status", "result", "planning_result"].includes(key);
}
function getStatusDisplayValue(key, value, row = null) {
  if (!value) return "无";
  if (value === "WAITING_START" && (key === "execution_status" || key === "current_execution_status" || row?.status_context === "routeExecution")) return "等待行驶";
  if (value === "WAITING_START" && isDeploymentLike(row)) return "等待行驶";
  if (value === "MOVING" && (key === "execution_status" || key === "current_execution_status" || row?.status_context === "routeExecution" || isDeploymentLike(row))) return "行驶中";
  return getDisplayValue(value);
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
  const [mapInitialization, mapValidation, operationsCenterInitialization, operationsCenterValidation, cellContext, fieldDictionary, readinessTaskValidation, deploymentTaskValidation, taskTypeModule] = await Promise.all([import("./data/mapInitialization.js?v=20260608-v018-bfs-route-planning"), import("./data/mapValidation.js?v=20260608-v018-bfs-route-planning"), import("./data/operationsCenterInitialization.js?v=20260608-v018-bfs-route-planning"), import("./data/operationsCenterValidation.js?v=20260608-v018-bfs-route-planning"), import("./data/cellContext.js?v=20260608-v018-bfs-route-planning"), import("./domain/fieldDictionary.js?v=20260608-v018-bfs-route-planning"), import("./data/readinessCheckTaskValidation.js?v=20260608-v018-bfs-route-planning"), import("./data/deploymentTaskValidation.js?v=20260608-v018-bfs-route-planning"), import("./domain/taskTypes.js?v=20260608-v018-bfs-route-planning")]);
  initializeMapSpace = mapInitialization.initializeMapSpace;
  validateMapSpace = mapValidation.validateMapSpace;
  initializeOperationsCenter = operationsCenterInitialization.initializeOperationsCenter;
  validateOperationsCenter = operationsCenterValidation.validateOperationsCenter;
  createCellContext = cellContext.createCellContext;
  getDetailTitle = fieldDictionary.getDetailTitle;
  getDisplayValue = fieldDictionary.getDisplayValue;
  getFieldLabel = fieldDictionary.getFieldLabel;
  validateReadinessCheckTasks = readinessTaskValidation.validateReadinessCheckTasks;
  validateDeploymentTasks = deploymentTaskValidation.validateDeploymentTasks;
  taskTypes = taskTypeModule;
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
  return robotaxi.availability_status === "AVAILABLE" && !deploymentTasks.some(task => task.robotaxi_id === robotaxi.robotaxi_id && unfinishedDeploymentStatuses.has(task.task_status));
}
function getDefaultDeploymentTarget(data) {
  const serviceArea = data.serviceAreas.find(area => area.service_area_id === "SA-006") || data.serviceAreas.find(area => area.vehicle_capabilities?.can_stage || area.vehicle_capabilities?.can_short_wait);
  if (!serviceArea) return null;
  return {
    target_cell_id: getCandidateServiceAreaCellIds(serviceArea)[0],
    target_service_area_id: serviceArea.service_area_id,
    target_zone_id: data.zones.find(zone => zone.service_area_ids?.includes(serviceArea.service_area_id))?.zone_id || null
  };
}
function createDeploymentRoute(task, data, options = {}) {
  const targetServiceAreaId = options.targetServiceAreaId || task.planned_target_service_area_id || task.target_service_area_id;
  const originCellId = options.originCellId || task.origin_cell_id;
  const targetCellId = options.targetCellId || task.planned_target_cell_id || task.target_cell_id;
  const strategyId = options.strategyId || taskTypes.RoutePlanningStrategy.INITIAL_DEPLOYMENT;
  const planningAlgorithm = taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH;
  const routePlan = createBfsRoutePlan(data, originCellId, targetCellId);
  const routeSteps = routePlan.route_steps;
  const totalDistance = Math.max(0, routeSteps.length - 1) * (data.maps[0]?.cell_size_m || 50);
  return {
    route_id: nextDeploymentRouteId(),
    route_version: 1,
    route_name: `${task.robotaxi_id} 投放到 ${targetServiceAreaId}`,
    map_id: data.maps[0].map_id,
    start_cell_id: originCellId,
    end_cell_id: targetCellId,
    origin_cell_id: originCellId,
    target_cell_id: targetCellId,
    task_id: task.task_id,
    route_execution_id: options.routeExecutionId || null,
    route_planning_run_id: options.routePlanningRunId || null,
    robotaxi_id: task.robotaxi_id,
    route_strategy_id: strategyId,
    planning_algorithm: planningAlgorithm,
    road_segment_sequence: routePlan.road_segment_sequence,
    route_steps: routeSteps,
    total_step_count: routeSteps.length,
    related_service_area_ids: targetServiceAreaId ? [targetServiceAreaId] : [],
    total_distance_m: totalDistance,
    estimated_time_s: Math.max(1, Math.round(totalDistance / (40 * 1000 / 3600))),
    route_status: routeSteps.length > 0 ? "Active" : "Failed",
    failure_reason: routeSteps.length > 0 ? null : taskTypes.RoutePlanningFailureReason.NO_CONNECTED_ROAD_SEGMENT
  };
}
function createRouteHistoryEntry(route, routeChangeReason, arrivalExecutionResult) {
  return {
    route_id: route.route_id,
    route_strategy_id: route.route_strategy_id,
    origin_cell_id: route.start_cell_id,
    target_cell_id: route.end_cell_id,
    started_at: now(),
    ended_at: null,
    route_change_reason: routeChangeReason,
    arrival_execution_result: arrivalExecutionResult || null,
    trigger_type: taskTypes.TriggerType.MANUAL
  };
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
  return [{
    route_strategy_id: "RPS-001",
    strategy_name: "初始运营投放路径规划策略",
    strategy_type: "INITIAL_DEPLOYMENT_ROUTE",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_task_status: "WAITING_ROUTE",
    origin_rule: "使用运营投放任务起点位置",
    target_rule: "使用任务当前计划目标位置",
    service_area_scope_rule: "不改变任务目标服务区",
    route_generation_rule: "基于道路片段有序网格、道路节点连接和 BFS 网格图搜索生成可执行路径步骤",
    route_update_rule: "创建初始路径，并创建 / 绑定行驶记录",
    strategy_status: "Active"
  }, {
    route_strategy_id: "RPS-002",
    strategy_name: "异常到达同服务区替代路径规划策略",
    strategy_type: "ABNORMAL_ARRIVAL_SAME_SERVICE_AREA_REPLAN",
    planning_algorithm: taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    trigger_task_status: "ARRIVAL_ABNORMAL",
    origin_rule: "使用 Robotaxi 当前异常到达位置",
    target_rule: "选择同服务区内其他目标位置，并排除当前异常点和当前目标点",
    service_area_scope_rule: "限制在当前任务目标服务区内",
    route_generation_rule: "基于当前异常位置、同服务区替代目标和 BFS 网格图搜索重新生成可执行路径步骤",
    route_update_rule: "更新同一个行驶记录的当前路径，不创建新行驶记录",
    strategy_status: "Active"
  }].map(strategy => ({
    ...strategy,
    strategy_usage_count: Math.max(routeByStrategyId.get(strategy.route_strategy_id) || 0, runCountByStrategyId.get(strategy.route_strategy_id) || 0),
    route_planning_run_count: runCountByStrategyId.get(strategy.route_strategy_id) || 0
  }));
}
function createRoutePlanningRun(options) {
  return taskTypes.createRoutePlanningRun({
    route_planning_run_id: options.routePlanningRunId || nextRoutePlanningRunId(),
    route_strategy_id: options.routeStrategyId,
    planning_algorithm: options.planningAlgorithm || taskTypes.RoutePlanningAlgorithm.BFS_CELL_GRAPH,
    task_id: options.taskId,
    route_execution_id: options.routeExecutionId,
    robotaxi_id: options.robotaxiId,
    origin_cell_id: options.originCellId,
    target_cell_id: options.targetCellId,
    result_route_id: options.resultRouteId,
    planning_result: options.planningResult,
    failure_reason: options.failureReason,
    created_at: now()
  });
}
function getRouteExecutionCells(route, roadSegments, originCellId, targetCellId) {
  const cells = route.route_steps?.map(step => step.cell_id) || routeCellIds(route, roadSegments);
  return [...new Set([originCellId, ...cells, targetCellId].filter(Boolean))];
}
function enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks) {
  const currentTask = findCurrentTask(worker.current_task_id, readinessTasks, deploymentTasks);
  return {
    ...worker,
    current_task_type: currentTask?.task_type || null,
    current_task_status: currentTask?.task_status || null
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
  return {
    ...execution,
    route_strategy_id: route?.route_strategy_id || execution.route_strategy_id || null,
    route_summary: summarizeRoute(route),
    route_detail: route ? getRouteDetail(route) : null,
    origin_location_summary: originLocation.summary,
    target_location_summary: targetLocation.summary,
    current_location_summary: currentLocation.summary,
    origin_location_detail: originLocation.detail,
    target_location_detail: targetLocation.detail,
    current_location_detail: currentLocation.detail
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
    route_step_count: route.route_steps?.length || route.total_step_count || 0
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
  return routeExecutions.find(execution => execution.robotaxi_id === robotaxi.robotaxi_id && ["WAITING_START", "MOVING", "ARRIVED", "ARRIVAL_ABNORMAL", "PAUSED"].includes(execution.execution_status));
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
    route_execution_id: route.route_execution_id,
    robotaxi_id: route.robotaxi_id,
    road_segment_sequence: route.road_segment_sequence,
    route_step_count: route.route_steps?.length || route.total_step_count || 0,
    route_steps: route.route_steps,
    related_service_area_ids: route.related_service_area_ids,
    total_distance_m: route.total_distance_m,
    estimated_time_s: route.estimated_time_s,
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
function nextRoutePlanningRunId() {
  routePlanningRunSequence += 1;
  return `RPR-${String(routePlanningRunSequence).padStart(3, "0")}`;
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
    }
  };
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
function loadRuntimeSnapshot(initialData) {
  const fallback = {
    operationalData: initialData,
    readinessTasks: [],
    deploymentTasks: [],
    routeExecutions: [],
    routePlanningRuns: [],
    taskEventLogs: [],
    activePage: "console",
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
    const rawValue = window.localStorage.getItem(runtimeStorageKey);
    if (!rawValue) return fallback;
    const snapshot = JSON.parse(rawValue);
    const readinessTasks = Array.isArray(snapshot.readinessTasks) ? snapshot.readinessTasks : [];
    const deploymentTasks = normalizeRouteStrategyReferences(Array.isArray(snapshot.deploymentTasks) ? snapshot.deploymentTasks : []);
    const routeExecutions = normalizeRouteStrategyReferences(Array.isArray(snapshot.routeExecutions) ? snapshot.routeExecutions : []);
    const routePlanningRuns = normalizeRouteStrategyReferences(Array.isArray(snapshot.routePlanningRuns) ? snapshot.routePlanningRuns : []);
    const taskEventLogs = normalizeRouteStrategyReferences(Array.isArray(snapshot.taskEventLogs) ? snapshot.taskEventLogs : []);
    const operationalData = normalizeOperationalRouteStrategies(snapshot.operationalData || initialData);
    taskSequence = deriveSequence(readinessTasks, "task_id", "TASK-RC-");
    deploymentTaskSequence = deriveSequence(deploymentTasks, "task_id", "TASK-DP-");
    routeExecutionSequence = deriveSequence(routeExecutions, "route_execution_id", "REX-");
    routePlanningRunSequence = deriveSequence(routePlanningRuns, "route_planning_run_id", "RPR-");
    deploymentRouteSequence = deriveSequence(operationalData.routes || [], "route_id", "DRT-");
    eventSequence = deriveSequence(taskEventLogs, "event_id", "EVT-");
    return {
      operationalData,
      readinessTasks,
      deploymentTasks,
      routeExecutions,
      routePlanningRuns,
      taskEventLogs,
      activePage: snapshot.activePage || "console",
      pageSelections: {
        console: {
          type: "map",
          id: initialData.maps[0].map_id
        },
        ...(snapshot.pageSelections || {})
      },
      pageUiState: snapshot.pageUiState || {}
    };
  } catch (error) {
    return fallback;
  }
}
function normalizeOperationalRouteStrategies(operationalData) {
  return {
    ...operationalData,
    routes: normalizeRouteStrategyReferences(operationalData.routes || [])
  };
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
  try {
    window.localStorage.setItem(runtimeStorageKey, JSON.stringify({
      ...snapshot,
      taskSequence,
      routePlanningRunSequence,
      eventSequence
    }));
  } catch (error) {
    // Local persistence is a convenience for this prototype; runtime should continue if storage is unavailable.
  }
}
function deriveSequence(items, field, prefix) {
  return items.reduce((maxValue, item) => {
    const value = String(item[field] || "");
    if (!value.startsWith(prefix)) return maxValue;
    const numberValue = Number(value.slice(prefix.length));
    return Number.isFinite(numberValue) ? Math.max(maxValue, numberValue) : maxValue;
  }, 0);
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
  if (page === "readinessTasks") return readinessStatusOptions;
  if (page === "deploymentTasks") return deploymentStatusOptions;
  if (page === "routeExecutions") return routeExecutionStatusOptions;
  if (page === "routePlanningRuns") return routePlanningResultOptions;
  return [];
}
function createStatusOptions(rows, statusField, orderedValues = [], statusContext = null) {
  if (!statusField) return [];
  const values = [...orderedValues, ...rows.map(row => row[statusField]).filter(Boolean)];
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
