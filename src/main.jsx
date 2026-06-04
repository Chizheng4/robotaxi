const { useEffect, useMemo, useRef, useState } = React;
const { Button, Descriptions, Empty, Input, Layout, Menu, Modal, Select, Space, Table, Tabs, Tag, Typography } = antd;
const { Sider, Content } = Layout;
const { Text } = Typography;

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
let eventSequence = 0;

const unfinishedTaskStatuses = new Set([
  "WAITING_ASSIGNMENT",
  "WAITING_CHECK",
  "CHECKING",
]);

const unfinishedDeploymentStatuses = new Set([
  "WAITING_ROUTE",
  "WAITING_START",
  "MOVING",
]);

const pageGroups = [
  { key: "console", label: "运营中控台", children: [{ key: "console", label: "运营中控台" }] },
  {
    key: "opsCenter",
    label: "运营中心管理",
    children: [
      {
        key: "taskManagement",
        label: "任务单管理",
        children: [
          { key: "readinessTasks", label: "运营准入" },
          { key: "deploymentTasks", label: "运营投放" },
        ],
      },
      { key: "opsCenters", label: "运营中心列表" },
      { key: "workers", label: "作业人员列表" },
    ],
  },
  {
    key: "robotaxi",
    label: "Robotaxi 管理",
    children: [
      { key: "robotaxis", label: "Robotaxi 列表" },
      { key: "routeExecutions", label: "行驶记录" },
    ],
  },
  {
    key: "space",
    label: "地图空间管理",
    children: [
      { key: "maps", label: "地图管理" },
      { key: "cells", label: "网格单元管理" },
      { key: "roads", label: "道路管理" },
      { key: "roadNodes", label: "道路节点管理" },
      { key: "roadSegments", label: "道路片段管理" },
      { key: "places", label: "地点管理" },
      { key: "serviceAreas", label: "服务区管理" },
      { key: "zones", label: "Zone 管理" },
      { key: "routes", label: "Route 管理" },
    ],
  },
];

const tableConfig = {
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
    columns: ["road_segment_id", "road_id", "start_node_id", "end_node_id", "distance_m", "direction", "speed_limit_kmh", "service_area_ids"],
  },
  places: {
    title: "地点管理",
    description: "地点表示会产生出行需求的建筑或土地使用区域。",
    columns: ["place_id", "place_name", "place_type", "demand_weight", "peak_pattern", "nearby_service_area_ids", "cell_count"],
  },
  serviceAreas: {
    title: "服务区管理",
    description: "服务区是道路片段上的人车服务接口空间。",
    columns: ["service_area_id", "name", "segment_ids", "customer_capabilities", "vehicle_capabilities", "max_vehicle_capacity", "covered_cell_count"],
  },
  zones: {
    title: "运营区域管理",
    description: "运营区域用于经营统计和管理。",
    columns: ["zone_id", "parent_zone_id", "zone_name", "zone_level", "zone_type", "zone_status", "cell_count", "place_ids", "service_area_ids"],
  },
  routes: {
    title: "路径方案管理",
    description: "路径方案是基于道路片段序列生成的车辆移动路径结果。",
    columns: ["route_id", "route_name", "start_cell_id", "end_cell_id", "road_segment_sequence", "related_service_area_ids", "total_distance_m", "estimated_time_s", "route_status"],
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
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "worker_id", "check_result", "issue_type", "created_at"],
  },
  deploymentTasks: {
    title: "运营投放任务",
    description: "用于将可运营 Robotaxi 投放到指定服务区或待命位置。",
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "origin_cell_id", "origin_location_summary", "target_cell_id", "target_location_summary", "target_service_area_id", "route_id", "route_summary", "created_at"],
  },
  routeExecutions: {
    title: "行驶记录",
    description: "记录 Robotaxi 执行任务时的模拟行驶过程。",
    columns: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id", "route_id", "route_summary", "origin_location_summary", "target_location_summary", "current_cell_id", "current_location_summary", "current_step_index", "total_step_count", "distance_traveled_km", "distance_remaining_km"],
  },
  taskEventLogs: {
    title: "任务事件日志",
    description: "记录运营准入任务的创建、分配、检查和状态反馈事件。",
    columns: ["event_id", "event_type", "event_result", "task_id", "robotaxi_id", "worker_id", "route_execution_id", "message", "created_at"],
  },
  robotaxis: {
    title: "Robotaxi 管理",
    description: "Robotaxi 是等待运维检查后进入运营闭环的自动驾驶车辆资产。",
    columns: ["robotaxi_id", "fleet_id", "battery_percent", "estimated_range_km", "availability_status", "motion_status", "current_cell_id", "location_summary", "current_task_id", "current_task_type", "current_task_status", "current_route_id", "current_route_execution_id", "unavailable_reason"],
  },
  validations: {
    title: "初始化校验",
    description: "根据初始化规则检查生成后的运营空间数据。",
    columns: ["rule_id", "rule_name", "result", "detail"],
  },
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
  robotaxis: "robotaxi",
  validations: "validation",
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
  robotaxi: "robotaxi_id",
  validation: "rule_id",
};

const statusFieldByPage = {
  roads: "road_status",
  roadNodes: "node_status",
  roadSegments: "segment_status",
  places: "place_status",
  serviceAreas: "status",
  zones: "zone_status",
  routes: "route_status",
  opsCenters: "ops_center_status",
  workers: "worker_status",
  readinessTasks: "task_status",
  deploymentTasks: "task_status",
  routeExecutions: "execution_status",
  robotaxis: "availability_status",
  validations: "result",
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

const readinessStatusOptions = [
  "WAITING_ASSIGNMENT",
  "WAITING_CHECK",
  "CHECKING",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

const deploymentStatusOptions = [
  "WAITING_ROUTE",
  "WAITING_START",
  "MOVING",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

const routeExecutionStatusOptions = [
  "WAITING_START",
  "MOVING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];

const triggerTypeOptions = ["AUTO", "MANUAL"];
const runtimeStorageKey = "robotaxi.runtime.v013";
const defaultPageFilters = { keyword: "", statusValue: null, triggerType: null };

function App() {
  const initialData = useMemo(() => ({
    ...initializeMapSpace(),
    ...initializeOperationsCenter(),
  }), []);
  const initialRuntime = useMemo(() => loadRuntimeSnapshot(initialData), [initialData]);
  const [operationalData, setOperationalData] = useState(initialRuntime.operationalData);
  const [readinessTasks, setReadinessTasks] = useState(initialRuntime.readinessTasks);
  const [deploymentTasks, setDeploymentTasks] = useState(initialRuntime.deploymentTasks);
  const [routeExecutions, setRouteExecutions] = useState(initialRuntime.routeExecutions);
  const [taskEventLogs, setTaskEventLogs] = useState(initialRuntime.taskEventLogs);
  const initialValidations = useMemo(() => [
    ...validateMapSpace(initialData),
    ...validateOperationsCenter(initialData),
  ], [initialData]);
  const data = useMemo(() => ({
    ...operationalData,
    readinessCheckTasks: readinessTasks,
    deploymentTasks,
    routeExecutions,
    taskEventLogs,
  }), [deploymentTasks, operationalData, readinessTasks, routeExecutions, taskEventLogs]);
  const validations = useMemo(() => [
    ...initialValidations,
    ...validateReadinessCheckTasks(data),
    ...validateDeploymentTasks(data),
  ], [data, initialValidations]);
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
    routes: data.routes,
    opsCenters: data.opsCenters,
    workers: data.workers.map((worker) => enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks)),
    readinessTasks,
    deploymentTasks: deploymentTasks.map((task) => enrichDeploymentTaskForDisplay(task, data)),
    routeExecutions: routeExecutions.map((execution) => enrichRouteExecutionForDisplay(execution, data)),
    taskEventLogs,
    robotaxis: data.robotaxis.map((robotaxi) => enrichRobotaxiForDisplay(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions)),
    validations,
  }), [data, deploymentTasks, readinessTasks, routeExecutions, validations]);

  const selectedObject = useMemo(() => {
    if (selected.type === "cell") {
      const cell = data.cells.find((item) => item.cell_id === selected.id);
      return cell ? createCellContext(cell, data) : null;
    }

    if (selected.type === "robotaxi") {
      const robotaxi = data.robotaxis.find((item) => item.robotaxi_id === selected.id);
      return robotaxi ? enrichRobotaxiForDetail(robotaxi, data, readinessTasks, deploymentTasks, routeExecutions) : null;
    }

    if (selected.type === "worker") {
      const worker = data.workers.find((item) => item.worker_id === selected.id);
      return worker ? enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks) : null;
    }

    if (selected.type === "deploymentTask") {
      const task = deploymentTasks.find((item) => item.task_id === selected.id);
      return task ? enrichDeploymentTaskForDisplay(task, data) : null;
    }

    if (selected.type === "routeExecution") {
      const execution = routeExecutions.find((item) => item.route_execution_id === selected.id);
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
      route: data.routes,
      opsCenter: data.opsCenters,
      worker: data.workers,
      readinessTask: readinessTasks,
      taskEventLog: taskEventLogs,
      validation: validations,
    };

    return collections[selected.type]?.find((item) => item[idFieldByType[selected.type]] === selected.id) || null;
  }, [data, selected, validations]);

  const menuItems = pageGroups.map((group) => {
    if (group.key === "console") return { key: "console", label: "运营中控台" };
    return {
      key: group.key,
      label: group.label,
      children: group.children.map((item) => ({
        key: item.key,
        label: item.label,
        children: item.children?.map((child) => ({ key: child.key, label: child.label })),
      })),
    };
  });
  const failedCount = validations.filter((item) => item.result !== "PASS").length;
  const activeConfig = tableConfig[activePage];
  const activeObjectType = pageObjectType[activePage];
  const detailSelectedObject = activePage === "console"
    ? selectedObject
    : selected.type === activeObjectType ? selectedObject : null;
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
      taskEventLogs,
      activePage,
      pageSelections,
      pageUiState,
    });
  }, [activePage, deploymentTasks, operationalData, pageSelections, pageUiState, readinessTasks, routeExecutions, taskEventLogs]);

  return (
    <Layout className="ops-shell">
      <Sider className="ops-sider" width={216} collapsedWidth={58} collapsed={collapsed} trigger={null}>
        <div className="brand-bar">
          <Button className="brand-title-button" type="text" onClick={goToConsole}>{collapsed ? "RT" : "Robotaxi 运营平台"}</Button>
          <Button type="text" size="small" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? "≡" : "‹"}
          </Button>
        </div>
        <Menu
          mode="inline"
          className="ops-menu"
          selectedKeys={[activePage]}
          openKeys={openMenuKeys}
          items={menuItems}
          onOpenChange={handleMenuOpenChange}
          onClick={({ key }) => handleMenuClick(key)}
        />
      </Sider>

      <Layout className="ops-main-layout">
        <div className="top-strip">
          <div className="top-strip-title">
            <Text strong>{topTitle}</Text>
            {topDescription && <Text type="secondary">{topDescription}</Text>}
          </div>
          <div className="top-strip-metrics">
            {showConsoleSummary ? (
              <>
                <Tag bordered={false}>{data.maps[0].grid_cols} x {data.maps[0].grid_rows} / {data.maps[0].cell_size_m}m</Tag>
                <Tag bordered={false}>地图 {data.maps.length}</Tag>
                <Tag bordered={false}>网格 {data.cells.length}</Tag>
                <Tag bordered={false}>Robotaxi {data.robotaxis.length}</Tag>
                <Tag bordered={false}>Worker {data.workers.length}</Tag>
                <Tag bordered={false} color={failedCount === 0 ? "success" : "error"}>
                  校验 {failedCount === 0 ? "全部通过" : `${failedCount} 项异常`}
                </Tag>
              </>
            ) : (
              <Tag bordered={false}>记录 {activeRows.length}</Tag>
            )}
            <Button size="small" onClick={resetRuntime}>重置模拟数据</Button>
          </div>
        </div>

        <Layout className={detailCollapsed ? "workbench detail-collapsed" : "workbench"}>
          <Content className="work-content">
            {activePage === "console" ? (
              <MapCanvas data={data} selected={selected} onSelect={(type, id) => selectForPage("console", type, id)} />
            ) : (
              <RecordTable
                key={activePage}
                page={activePage}
                rows={rowsByPage[activePage] || []}
                selected={selected}
                uiState={pageUiState[activePage] || createDefaultPageUiState()}
                onUiStateChange={(nextState) => updatePageUiState(activePage, nextState)}
                onSelect={(type, id) => selectForPage(activePage, type, id)}
                actions={{
                  createManualTask,
                  runAutoReadinessCheck,
                  assignWorker,
                  startCheck,
                  submitCheckResult,
                  createDeploymentTasks,
                  planDeploymentRoute,
                  viewRecordDetail,
                  viewRouteExecutionForDeployment,
                  startRouteExecution,
                  advanceRouteExecution,
                  taskEventLogs,
                }}
              />
            )}
          </Content>
          <aside className="detail-rail">
            {detailCollapsed ? (
              <Button className="detail-toggle-button" size="small" title="展开详情" onClick={() => setDetailCollapsed(false)}>‹</Button>
            ) : (
              <DetailPanel
                selectedObject={detailSelectedObject}
                selectedType={detailSelectedType}
                onCollapse={() => setDetailCollapsed(true)}
              />
            )}
          </aside>
        </Layout>
      </Layout>
    </Layout>
  );

  function handleMenuClick(key) {
    setActivePage(key);
    setOpenMenuKeys(getOpenKeysForPage(key));
    setSelected(pageSelections[key] || getDefaultSelection(key, data));
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
    setActivePage("console");
    setOpenMenuKeys([]);
    const consoleSelection = pageSelections.console || { type: "map", id: data.maps[0].map_id };
    setSelected(consoleSelection);
  }

  function resetRuntime() {
    taskSequence = 0;
    deploymentTaskSequence = 0;
    routeExecutionSequence = 0;
    deploymentRouteSequence = 0;
    eventSequence = 0;
    const nextSelection = { type: "map", id: initialData.maps[0].map_id };
    setOperationalData(initialData);
    setReadinessTasks([]);
    setDeploymentTasks([]);
    setRouteExecutions([]);
    setTaskEventLogs([]);
    setActivePage("console");
    setOpenMenuKeys([]);
    setSelected(nextSelection);
    setPageSelections({ console: nextSelection });
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
    const nextSelection = { type, id };
    setSelected(nextSelection);
    setPageSelections((current) => ({ ...current, [page]: nextSelection }));
  }

  function viewRecordDetail(page, type, id) {
    selectForPage(page, type, id);
    setDetailCollapsed(false);
  }

  function viewRouteExecutionForDeployment(task) {
    const execution = routeExecutions.find((item) =>
      item.task_id === task.task_id &&
      item.robotaxi_id === task.robotaxi_id
    );
    if (!execution) {
      viewRecordDetail("deploymentTasks", "deploymentTask", task.task_id);
      return;
    }
    const nextFilters = { keyword: task.task_id, statusValue: null, triggerType: null };
    const nextSelection = { type: "routeExecution", id: execution.route_execution_id };
    setActivePage("routeExecutions");
    setOpenMenuKeys(getOpenKeysForPage("routeExecutions"));
    setSelected(nextSelection);
    setDetailCollapsed(false);
    setPageSelections((current) => ({ ...current, routeExecutions: nextSelection }));
    setPageUiState((current) => ({
      ...current,
      routeExecutions: { filters: nextFilters, appliedFilters: nextFilters },
    }));
  }

  function updatePageUiState(page, nextState) {
    setPageUiState((current) => ({ ...current, [page]: nextState }));
  }

  function createManualTask() {
    const candidates = data.robotaxis.filter((robotaxi) => isCandidateRobotaxi(robotaxi, readinessTasks));
    const nextLogs = [createEventLog({
      event_type: taskTypes.TaskEventType.MANUAL_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: "手动触发运营准入任务生成",
    })];

    if (candidates.length === 0) {
      setTaskEventLogs((logs) => [...nextLogs, ...logs]);
      addLog({
        event_type: taskTypes.TaskEventType.NO_CANDIDATE_ROBOTAXI,
        event_result: taskTypes.TaskEventResult.SKIPPED,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: "当前没有可生成准入任务的 Robotaxi",
      });
      return;
    }

    const newTasks = candidates.map((robotaxi) => createTask(robotaxi, taskTypes.TriggerType.MANUAL));
    setReadinessTasks((tasks) => [...newTasks, ...tasks]);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((robotaxi) => {
        const task = newTasks.find((item) => item.robotaxi_id === robotaxi.robotaxi_id);
        return task ? { ...robotaxi, current_task_id: task.task_id } : robotaxi;
      }),
    }));
    setTaskEventLogs((logs) => [
      ...newTasks.map((task) => createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        trigger_type: task.trigger_type,
        message: `已创建 ${task.robotaxi_id} 的运营准入任务`,
      })),
      ...nextLogs,
      ...logs,
    ]);
    selectForPage("readinessTasks", "readinessTask", newTasks[0].task_id);
  }

  function runAutoReadinessCheck() {
    const candidates = data.robotaxis.filter((robotaxi) => isCandidateRobotaxi(robotaxi, readinessTasks));
    const triggerLog = createEventLog({
      event_type: taskTypes.TaskEventType.AUTO_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.AUTO,
      message: "启动自动准入检查",
    });

    if (candidates.length === 0) {
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

    const newTasks = candidates.map((robotaxi) => createTask(robotaxi, taskTypes.TriggerType.AUTO));
    setReadinessTasks((tasks) => [...newTasks, ...tasks]);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((robotaxi) => {
        const task = newTasks.find((item) => item.robotaxi_id === robotaxi.robotaxi_id);
        return task ? { ...robotaxi, current_task_id: task.task_id } : robotaxi;
      }),
    }));
    setTaskEventLogs((logs) => [
      ...newTasks.map((task) => createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        trigger_type: task.trigger_type,
        message: `自动创建 ${task.robotaxi_id} 的运营准入任务`,
      })),
      triggerLog,
      ...logs,
    ]);
  }

  function assignWorker(taskId) {
    const task = readinessTasks.find((item) => item.task_id === taskId);
    if (!task || task.task_status !== taskTypes.ReadinessTaskStatus.WAITING_ASSIGNMENT) return;
    const worker = data.workers.find((item) => item.ops_center_id === task.ops_center_id && item.worker_status === "IDLE" && item.current_task_id === null);

    if (!worker) {
      addLog({
        event_type: taskTypes.TaskEventType.NO_IDLE_WORKER,
        event_result: taskTypes.TaskEventResult.FAILED,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        message: "没有可分配的空闲 Worker",
      });
      return;
    }

    setReadinessTasks((tasks) => tasks.map((item) => item.task_id === taskId ? {
      ...item,
      worker_id: worker.worker_id,
      task_status: taskTypes.ReadinessTaskStatus.WAITING_CHECK,
      assigned_at: now(),
    } : item));
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        availability_status: "IN_INSPECTION",
        current_task_id: taskId,
      } : robotaxi),
      workers: current.workers.map((item) => item.worker_id === worker.worker_id ? {
        ...item,
        worker_status: "BUSY",
        current_task_id: taskId,
      } : item),
    }));
    addLog({
      event_type: taskTypes.TaskEventType.WORKER_ASSIGNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      worker_id: worker.worker_id,
      message: `${worker.worker_id} 已分配到 ${task.task_id}`,
    });
  }

  function startCheck(taskId) {
    const task = readinessTasks.find((item) => item.task_id === taskId);
    if (!task || task.task_status !== taskTypes.ReadinessTaskStatus.WAITING_CHECK) return;
    setReadinessTasks((tasks) => tasks.map((item) => item.task_id === taskId ? {
      ...item,
      task_status: taskTypes.ReadinessTaskStatus.CHECKING,
      started_at: now(),
    } : item));
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
    if (!task || task.task_status !== taskTypes.ReadinessTaskStatus.CHECKING) return;
    const passed = checkResult === taskTypes.CheckResult.PASSED;

    setReadinessTasks((tasks) => tasks.map((item) => item.task_id === taskId ? {
      ...item,
      task_status: taskTypes.ReadinessTaskStatus.COMPLETED,
      check_result: checkResult,
      issue_type: passed ? taskTypes.IssueType.NONE : issueType,
      completed_at: now(),
    } : item));
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === task.robotaxi_id ? {
        ...robotaxi,
        availability_status: passed ? "AVAILABLE" : "UNAVAILABLE",
        unavailable_reason: passed ? null : issueType,
        current_task_id: null,
      } : robotaxi),
      workers: current.workers.map((worker) => worker.worker_id === task.worker_id ? {
        ...worker,
        worker_status: "IDLE",
        current_task_id: null,
      } : worker),
    }));
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
    const candidates = data.robotaxis.filter((robotaxi) => isDeploymentCandidateRobotaxi(robotaxi, deploymentTasks));
    const target = getDefaultDeploymentTarget(data);
    const triggerLog = createEventLog({
      event_type: taskTypes.TaskEventType.DEPLOYMENT_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: "手动触发运营投放任务生成",
    });

    if (!target || candidates.length === 0) {
      setTaskEventLogs((logs) => [
        createEventLog({
          event_type: taskTypes.TaskEventType.DEPLOYMENT_FAILED,
          event_result: taskTypes.TaskEventResult.SKIPPED,
          trigger_type: taskTypes.TriggerType.MANUAL,
          message: target ? "当前没有可运营投放的 Robotaxi" : "当前没有有效投放目标",
        }),
        triggerLog,
        ...logs,
      ]);
      return;
    }

    const newTasks = candidates.map((robotaxi) => createDeploymentTask(robotaxi, target));
    setDeploymentTasks((tasks) => [...newTasks, ...tasks]);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((robotaxi) => {
        const task = newTasks.find((item) => item.robotaxi_id === robotaxi.robotaxi_id);
        return task ? { ...robotaxi, current_task_id: task.task_id } : robotaxi;
      }),
    }));
    setTaskEventLogs((logs) => [
      ...newTasks.map((task) => createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        trigger_type: task.trigger_type,
        message: `已创建 ${task.robotaxi_id} 的运营投放任务`,
      })),
      triggerLog,
      ...logs,
    ]);
    selectForPage("deploymentTasks", "deploymentTask", newTasks[0].task_id);
  }

  function planDeploymentRoute(taskId) {
    const task = deploymentTasks.find((item) => item.task_id === taskId);
    if (!task || task.task_status !== taskTypes.DeploymentTaskStatus.WAITING_ROUTE) return;

    const route = createDeploymentRoute(task, data);
    const routeCells = getRouteExecutionCells(route, data.roadSegments, task.origin_cell_id, task.target_cell_id);
    const execution = taskTypes.createRouteExecution({
      route_execution_id: nextRouteExecutionId(),
      task_id: task.task_id,
      task_type: task.task_type,
      robotaxi_id: task.robotaxi_id,
      route_id: route.route_id,
      execution_status: taskTypes.RouteExecutionStatus.WAITING_START,
      origin_cell_id: task.origin_cell_id,
      target_cell_id: task.target_cell_id,
      current_cell_id: routeCells[0] || task.origin_cell_id,
      current_step_index: 0,
      total_step_count: Math.max(0, routeCells.length - 1),
      route_cell_ids: routeCells,
      distance_traveled_km: 0,
      distance_remaining_km: route.total_distance_m / 1000,
      time_elapsed: "0",
      battery_consumed_percent: 0,
      started_at: null,
      completed_at: null,
      failure_reason: null,
    });
    setOperationalData((current) => ({
      ...current,
      routes: [route, ...current.routes],
    }));
    setRouteExecutions((items) => [execution, ...items]);
    setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === execution.task_id ? {
      ...item,
      task_status: taskTypes.DeploymentTaskStatus.WAITING_START,
      route_id: route.route_id,
    } : item));
    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_PLANNED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: task.task_id,
      robotaxi_id: task.robotaxi_id,
      route_execution_id: execution.route_execution_id,
      message: `${task.task_id} 已生成模拟路径 ${route.route_id} 和行驶记录 ${execution.route_execution_id}`,
    });
    selectForPage("routeExecutions", "routeExecution", execution.route_execution_id);
  }

  function startRouteExecution(routeExecutionId) {
    const execution = routeExecutions.find((item) => item.route_execution_id === routeExecutionId);
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
    const task = deploymentTasks.find((item) => item.task_id === execution.task_id);
    const route = data.routes.find((item) => item.route_id === execution.route_id);
    if (!task || !route) return;

    const nextStepIndex = Math.min(execution.current_step_index + 1, execution.total_step_count);
    const nextCellId = execution.route_cell_ids[nextStepIndex] || execution.target_cell_id;
    const completed = nextStepIndex >= execution.total_step_count;
    const distancePerStepKm = execution.total_step_count > 0 ? route.total_distance_m / 1000 / execution.total_step_count : 0;
    const distanceTraveledKm = Number((distancePerStepKm * nextStepIndex).toFixed(2));
    const distanceDeltaKm = Number(Math.max(0, distanceTraveledKm - Number(execution.distance_traveled_km || 0)).toFixed(2));
    const distanceRemainingKm = Number(Math.max(0, route.total_distance_m / 1000 - distanceTraveledKm).toFixed(2));
    const robotaxi = data.robotaxis.find((item) => item.robotaxi_id === execution.robotaxi_id);
    const batteryDeltaPercent = robotaxi?.max_range_km
      ? Number((distanceDeltaKm / robotaxi.max_range_km * 100).toFixed(2))
      : 0;
    const batteryConsumedPercent = Number((Number(execution.battery_consumed_percent || 0) + batteryDeltaPercent).toFixed(2));

    setRouteExecutions((items) => items.map((item) => item.route_execution_id === routeExecutionId ? {
      ...item,
      execution_status: completed ? taskTypes.RouteExecutionStatus.COMPLETED : taskTypes.RouteExecutionStatus.MOVING,
      current_cell_id: nextCellId,
      current_step_index: nextStepIndex,
      distance_traveled_km: distanceTraveledKm,
      distance_remaining_km: distanceRemainingKm,
      time_elapsed: `${nextStepIndex}`,
      battery_consumed_percent: batteryConsumedPercent,
      completed_at: completed ? now() : null,
    } : item));
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((item) => item.robotaxi_id === execution.robotaxi_id ? {
        ...item,
        current_cell_id: nextCellId,
        current_route_id: completed ? null : execution.route_id,
        current_task_id: completed ? null : execution.task_id,
        motion_status: completed ? "PARKED" : "MOVING",
        battery_percent: Number(Math.max(0, item.battery_percent - batteryDeltaPercent).toFixed(2)),
        estimated_range_km: Number(Math.max(0, item.estimated_range_km - distanceDeltaKm).toFixed(2)),
      } : item),
    }));

    if (completed) {
      setDeploymentTasks((tasks) => tasks.map((item) => item.task_id === execution.task_id ? {
        ...item,
        task_status: taskTypes.DeploymentTaskStatus.COMPLETED,
        completed_at: now(),
      } : item));
      addLog({
        event_type: taskTypes.TaskEventType.DEPLOYMENT_COMPLETED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: execution.task_id,
        robotaxi_id: execution.robotaxi_id,
        message: `${execution.robotaxi_id} 已到达投放目标`,
      });
      return;
    }

    addLog({
      event_type: taskTypes.TaskEventType.ROUTE_STEP_ADVANCED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      task_id: execution.task_id,
      robotaxi_id: execution.robotaxi_id,
      message: `${execution.robotaxi_id} 继续行驶至 ${nextCellId}`,
    });
  }

  function addLog(log) {
    setTaskEventLogs((logs) => [createEventLog(log), ...logs]);
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
      completed_at: null,
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
      target_cell_id: target.target_cell_id,
      target_zone_id: target.target_zone_id,
      target_service_area_id: target.target_service_area_id,
      route_id: null,
      interruptible: true,
      created_at: now(),
      started_at: null,
      completed_at: null,
      failure_reason: null,
    });
  }

  function createEventLog(event) {
    return taskTypes.createTaskEventLog({
      event_id: nextEventId(),
      task_id: event.task_id || null,
      robotaxi_id: event.robotaxi_id || null,
      worker_id: event.worker_id || null,
      route_execution_id: event.route_execution_id || null,
      trigger_type: event.trigger_type || null,
      event_type: event.event_type,
      event_result: event.event_result,
      message: event.message,
      created_at: now(),
    });
  }
}

function RecordTable({ page, rows, selected, uiState, onUiStateChange, onSelect, actions }) {
  const isReadinessPage = page === "readinessTasks";
  const isDeploymentPage = page === "deploymentTasks";
  const isRouteExecutionPage = page === "routeExecutions";
  const isTaskOperationPage = isReadinessPage || isDeploymentPage || isRouteExecutionPage;
  const config = tableConfig[page];
  const objectType = pageObjectType[page];
  const idField = idFieldByType[objectType];
  const statusField = statusFieldByPage[page];
  const [eventPanelHeight, setEventPanelHeight] = useState(112);
  const [abnormalTask, setAbnormalTask] = useState(null);
  const [abnormalIssueType, setAbnormalIssueType] = useState(taskTypes?.IssueType?.LOW_BATTERY || "LOW_BATTERY");
  const filters = uiState.filters;
  const appliedFilters = uiState.appliedFilters;
  const displayRows = useMemo(() => {
    return filterRecordRows(rows, config.columns, statusField, appliedFilters);
  }, [appliedFilters, config.columns, rows, statusField]);
  const orderedStatusValues = getOrderedStatusValues(page);
  const statusContext = page === "deploymentTasks" ? "deployment" : page === "routeExecutions" ? "routeExecution" : null;
  const statusOptions = useMemo(() => createStatusOptions(rows, statusField, orderedStatusValues, statusContext), [orderedStatusValues, rows, statusContext, statusField]);
  const columns = config.columns.map((key) => ({
    key,
    title: getFieldLabel(key),
    dataIndex: key,
    ellipsis: true,
    width: getColumnWidth(key),
    render: (_, row) => renderCellValue(key, row),
  }));
  const actionColumn = getActionColumn();
  const finalColumns = actionColumn ? [
    ...columns,
    actionColumn,
  ] : columns;
  const tableScrollY = isTaskOperationPage ? `calc(100vh - ${eventPanelHeight + 238}px)` : "calc(100vh - 96px)";
  const eventTableScrollY = Math.max(80, eventPanelHeight - 44);

  return (
    <section className={isReadinessPage ? "record-page-new readiness-page" : "record-page-new"}>
      {statusOptions.length > 0 && (
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
      <div className="list-filter-bar">
        <div className="filter-field keyword-field">
          <span>关键词</span>
          <Input
            size="small"
            placeholder={isReadinessPage ? "任务编号 / Robotaxi / Worker" : "输入关键词"}
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
        <Button size="small" type="primary" onClick={() => applyFilters(filters)}>查询</Button>
        <Button size="small" onClick={resetFilters}>重置</Button>
      </div>
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
      <Table
        size="small"
        rowKey={idField}
        columns={finalColumns}
        dataSource={displayRows}
        pagination={{ pageSize: 14, size: "small", showSizeChanger: false }}
        scroll={{ x: "max-content", y: tableScrollY }}
        rowClassName={(row) => selected?.type === objectType && selected?.id === row[idField] ? "active-table-row" : ""}
        onRow={(row) => ({ onClick: () => onSelect(objectType, row[idField]) })}
      />
      {isTaskOperationPage && (
        <div className="event-log-section" style={{ height: eventPanelHeight }}>
          <div className="event-log-resizer" onPointerDown={handleEventResizeStart} title="拖动调整事件区高度" />
          <div className="event-log-title">最近任务事件</div>
          <Table
            size="small"
            rowKey="event_id"
            columns={tableConfig.taskEventLogs.columns.map((key) => ({
              key,
              title: getFieldLabel(key),
              dataIndex: key,
              ellipsis: true,
              width: getColumnWidth(key),
              render: (_, row) => renderCellValue(key, row),
            }))}
            dataSource={actions.taskEventLogs}
            pagination={false}
            scroll={{ x: "max-content", y: eventTableScrollY }}
          />
        </div>
      )}
      <ModuleFooter
        page={page}
        totalCount={rows.length}
        displayCount={displayRows.length}
        eventCount={actions.taskEventLogs?.length || 0}
        appliedFilters={isTaskOperationPage ? appliedFilters : null}
      />
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
    </section>
  );

  function getActionColumn() {
    if (isReadinessPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 240,
        render: (_, row) => renderReadinessActions(row, { ...actions, openAbnormalModal: openAbnormalModal, page, objectType, idField }),
      };
    }
    if (isDeploymentPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 220,
        render: (_, row) => renderDeploymentActions(row, { ...actions, page, objectType, idField }),
      };
    }
    if (isRouteExecutionPage) {
      return {
        key: "actions",
        title: "操作",
        fixed: "right",
        width: 160,
        render: (_, row) => renderRouteExecutionActions(row, { ...actions, page, objectType, idField }),
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

  function applyStatusFilter(statusValue) {
    const nextFilters = { ...filters, statusValue };
    onUiStateChange({ filters: nextFilters, appliedFilters: nextFilters });
  }

  function resetFilters() {
    const resetValue = { keyword: "", statusValue: null, triggerType: null };
    onUiStateChange({ filters: resetValue, appliedFilters: resetValue });
  }

  function updateFilters(nextFilters) {
    onUiStateChange({ ...uiState, filters: nextFilters });
  }

  function applyFilters(nextFilters) {
    onUiStateChange({ filters: nextFilters, appliedFilters: nextFilters });
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
  if (["readinessTasks", "deploymentTasks", "routeExecutions"].includes(page)) {
    return (
      <div className="module-footer">
        <span>当前显示 {displayCount} / 全部 {totalCount}</span>
        <span>事件 {eventCount}</span>
        <span>{hasFilter ? "已应用筛选条件" : "未应用筛选"}</span>
      </div>
    );
  }

  return (
    <div className="module-footer">
      <span>记录 {totalCount}</span>
      <span>点击表格行可在右侧查看详情</span>
    </div>
  );
}

function DetailPanel({ selectedObject, selectedType, onCollapse }) {
  if (!selectedObject) {
    return (
      <section className="detail-panel-new">
        <div className="panel-title">
          <span>{getDetailTitle(selectedType)}</span>
          <Button size="small" type="text" title="隐藏详情" onClick={onCollapse}>›</Button>
        </div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择对象查看详情" />
      </section>
    );
  }

  return (
    <section className="detail-panel-new">
      <div className="panel-title">
        <span>{getDetailTitle(selectedType)}</span>
        <Button size="small" type="text" title="隐藏详情" onClick={onCollapse}>›</Button>
      </div>
      {hasTabbedDetail(selectedType) ? (
        <TabbedDetail selectedObject={selectedObject} selectedType={selectedType} />
      ) : (
      <Descriptions
        className="compact-descriptions"
        column={1}
        size="small"
        colon={false}
        items={Object.entries(selectedObject).map(([key, value]) => ({
          key,
          label: getFieldLabel(key),
          children: renderDetailValue(key, value, selectedObject),
        }))}
      />
      )}
    </section>
  );
}

function hasTabbedDetail(selectedType) {
  return ["robotaxi", "worker", "deploymentTask", "routeExecution"].includes(selectedType);
}

function TabbedDetail({ selectedObject, selectedType }) {
  const tabs = getDetailTabs(selectedType, selectedObject);

  return (
    <Tabs
      className="detail-tabs"
      size="small"
      items={tabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        children: (
          <Descriptions
            className="compact-descriptions"
            column={1}
            size="small"
            colon={false}
            items={tab.keys.map((key) => ({
              key,
              label: getFieldLabel(key),
              children: renderDetailValue(key, selectedObject[key], selectedObject),
            }))}
          />
        ),
      }))}
    />
  );
}

function getDetailTabs(selectedType) {
  if (selectedType === "robotaxi") {
    return [
      { key: "basic", label: "基础信息", keys: ["robotaxi_id", "fleet_id", "model_name", "automation_level", "battery_percent", "estimated_range_km", "availability_status", "motion_status", "unavailable_reason"] },
      { key: "task", label: "任务状态", keys: ["current_task_id", "current_task_type", "current_task_status", "current_route_id"] },
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
  if (selectedType === "deploymentTask") {
    return [
      { key: "basic", label: "任务信息", keys: ["task_id", "task_type", "task_status", "task_priority", "trigger_type", "source_type", "robotaxi_id"] },
      { key: "route", label: "路径信息", keys: ["route_id", "route_summary", "route_detail"] },
      { key: "location", label: "起终点", keys: ["origin_cell_id", "origin_location_summary", "origin_location_detail", "target_cell_id", "target_location_summary", "target_location_detail", "target_service_area_id", "target_zone_id"] },
      { key: "time", label: "时间", keys: ["created_at", "started_at", "completed_at", "failure_reason"] },
    ];
  }
  if (selectedType === "routeExecution") {
    return [
      { key: "basic", label: "执行信息", keys: ["route_execution_id", "execution_status", "task_id", "task_type", "robotaxi_id"] },
      { key: "route", label: "路径信息", keys: ["route_id", "route_summary", "route_detail"] },
      { key: "location", label: "位置上下文", keys: ["origin_cell_id", "origin_location_summary", "origin_location_detail", "target_cell_id", "target_location_summary", "target_location_detail", "current_cell_id", "current_location_summary", "current_location_detail"] },
      { key: "progress", label: "执行进度", keys: ["current_step_index", "total_step_count", "distance_traveled_km", "distance_remaining_km", "time_elapsed", "battery_consumed_percent", "started_at", "completed_at", "failure_reason"] },
    ];
  }
  return [];
}

function MapCanvas({ data, selected, onSelect }) {
  const map = data.maps[0];
  const dragRef = useRef(null);
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 });
  const placeTypeByCellId = createPlaceTypeByCellId(data.places);
  const selectedRoute = selected?.type === "route"
    ? data.routes.find((route) => route.route_id === selected.id)
    : null;
  const highlightedCells = new Set(selectedRoute ? routeCellIds(selectedRoute, data.roadSegments) : []);

  function changeZoom(nextZoom) {
    setViewport((current) => ({
      ...current,
      zoom: Math.min(4, Math.max(0.7, nextZoom)),
    }));
  }

  function resetViewport() {
    setViewport({ zoom: 1, panX: 0, panY: 0 });
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
      panY: viewport.panY,
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
      panY: dragRef.current.panY + deltaY,
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <section className="map-page-new">
      <div className="map-stage">
        <div className="map-floating-actions">
          <Button size="small" onClick={() => changeZoom(viewport.zoom + 0.2)}>放大</Button>
          <Button size="small" onClick={() => changeZoom(viewport.zoom - 0.2)}>缩小</Button>
          <Button size="small" onClick={resetViewport}>复位</Button>
        </div>
        <svg
          className="zone-canvas-new"
          viewBox={`0 0 ${map.grid_cols} ${map.grid_rows}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Robotaxi simulation map"
          onWheel={handleWheel}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
        >
          <g transform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`}>
            <g className="map-cells">
              {data.cells.map((cell) => (
                <rect
                  key={cell.cell_id}
                  x={cell.col}
                  y={cell.row}
                  width="1"
                  height="1"
                  className={`map-cell ${getCellClass(cell, placeTypeByCellId)}`}
                  data-active={selected?.type === "cell" && selected?.id === cell.cell_id}
                  data-route={highlightedCells.has(cell.cell_id)}
                  onClick={() => onSelect("cell", cell.cell_id)}
                />
              ))}
            </g>
            <ServiceAreas serviceAreas={data.serviceAreas} selected={selected} />
            <OpsCenters opsCenters={data.opsCenters || []} selected={selected} />
            <RoadNodes roadNodes={data.roadNodes} selected={selected} />
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
      </div>

      <div className="legend-new">
        {legendItems.map(([className, label]) => (
          <span className="legend-item" key={className}>
            <span className={`legend-dot ${className}`} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function ServiceAreas({ serviceAreas, selected }) {
  return (
    <g className="service-area-layer">
      {serviceAreas.flatMap((area) => area.covered_cell_ids.map((cellId) => {
        const { row, col } = parseCellId(cellId);
        return (
          <rect
            key={`${area.service_area_id}-${cellId}`}
            x={col + 0.12}
            y={row + 0.12}
            width="0.76"
            height="0.76"
            className="service-area-cell"
            data-active={selected?.type === "serviceArea" && selected?.id === area.service_area_id}
          />
        );
      }))}
    </g>
  );
}

function OpsCenters({ opsCenters, selected }) {
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

function renderCellValue(key, row) {
  if (key === "cell_count") return row.cell_ids?.length ?? 0;
  if (key === "covered_cell_count") return row.covered_cell_ids?.length ?? 0;
  if (key === "result") {
    const passed = row[key] === "PASS";
    return <Tag color={passed ? "success" : "error"}>{getDisplayValue(row[key])}</Tag>;
  }
  if (Array.isArray(row[key])) return row[key].join(" / ");
  if (typeof row[key] === "boolean") return row[key] ? "是" : "否";
  if (typeof row[key] === "object" && row[key] !== null) return summarizeObject(row[key]);
  return getFieldDisplayValue(key, row[key] ?? "", row);
}

function RowActionButton({ children, onClick, type = "primary", danger = false }) {
  return (
    <Button
      size="small"
      type={type}
      danger={danger}
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
  return <Space size={4} className="row-action-group">{children}</Space>;
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

function renderReadinessActions(row, actions) {
  if (row.task_status === "WAITING_ASSIGNMENT") {
    return <RowActionButton onClick={() => actions.assignWorker(row.task_id)}>分配 Worker</RowActionButton>;
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
  if (row.task_status === "WAITING_ROUTE") {
    return <RowActionButton onClick={() => actions.planDeploymentRoute(row.task_id)}>路径规划</RowActionButton>;
  }
  if (["WAITING_START", "MOVING"].includes(row.task_status)) {
    return <RowActionButton onClick={() => actions.viewRouteExecutionForDeployment(row)}>查看行驶记录</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function renderRouteExecutionActions(row, actions) {
  if (row.execution_status === "WAITING_START") {
    return <RowActionButton onClick={() => actions.startRouteExecution(row.route_execution_id)}>开始行驶</RowActionButton>;
  }
  if (row.execution_status === "MOVING") {
    return <RowActionButton onClick={() => actions.advanceRouteExecution(row.route_execution_id)}>继续行驶</RowActionButton>;
  }
  return renderViewDetailAction(row, actions);
}

function renderDetailValue(key, value, row = null) {
  if (key === "result") {
    const passed = value === "PASS";
    return <Tag color={passed ? "success" : "error"}>{getDisplayValue(value)}</Tag>;
  }
  return <Text className="detail-value">{formatDetailValue(value, key, row) || "无"}</Text>;
}

function summarizeObject(value) {
  const enabled = Object.entries(value)
    .filter(([, itemValue]) => itemValue === true)
    .map(([key]) => getFieldLabel(key));
  return enabled.length > 0 ? enabled.join(", ") : "无";
}

function formatDetailValue(value, key, parentRow = null) {
  if (Array.isArray(value)) return value.map((item) => formatDetailValue(item, key, parentRow)).join(", ");
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([itemKey, itemValue]) => `${getFieldLabel(itemKey)}: ${formatDetailValue(itemValue, itemKey, value)}`)
      .join("; ");
  }
  return String(getFieldDisplayValue(key, value ?? "", parentRow));
}

function getFieldDisplayValue(key, value, row = null) {
  if (key === "check_result" && value === "FAILED") return "检查不通过";
  if (key === "event_result" && value === "FAILED") return "失败";
  if (isStatusField(key)) return getStatusDisplayValue(key, value, row);
  return getDisplayValue(value);
}

function isStatusField(key) {
  return [
    "task_status",
    "execution_status",
    "current_task_status",
    "current_execution_status",
    "availability_status",
    "motion_status",
    "worker_status",
    "route_status",
    "ops_center_status",
    "zone_status",
    "road_status",
    "node_status",
    "segment_status",
    "place_status",
    "status",
    "result",
  ].includes(key);
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
  if (key.endsWith("_ids") || key === "cell_ids" || key === "road_segment_sequence") return 220;
  if (key.includes("name") || key === "rule_name" || key === "description") return 180;
  if (key === "customer_capabilities" || key === "vehicle_capabilities") return 220;
  return 128;
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
  const segmentById = new Map(roadSegments.map((segment) => [segment.road_segment_id, segment]));
  return route.road_segment_sequence.flatMap((segmentId) => segmentById.get(segmentId)?.cell_ids || []);
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
    operationsCenterValidation,
    cellContext,
    fieldDictionary,
    readinessTaskValidation,
    deploymentTaskValidation,
    taskTypeModule,
  ] = await Promise.all([
    import("./data/mapInitialization.js?v=20260603-v006"),
    import("./data/mapValidation.js?v=20260603-v006"),
    import("./data/operationsCenterInitialization.js?v=20260603-v006"),
    import("./data/operationsCenterValidation.js?v=20260603-v006"),
    import("./data/cellContext.js?v=20260603-v006"),
    import("./domain/fieldDictionary.js?v=20260603-v006"),
    import("./data/readinessCheckTaskValidation.js"),
    import("./data/deploymentTaskValidation.js"),
    import("./domain/taskTypes.js"),
  ]);

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

  ReactDOM.createRoot(document.querySelector("#app")).render(<App />);
}

bootstrap();

function findNextCandidate(robotaxis, tasks) {
  return robotaxis.find((robotaxi) => isCandidateRobotaxi(robotaxi, tasks));
}

function isCandidateRobotaxi(robotaxi, tasks) {
  return robotaxi.availability_status === "PENDING_INSPECTION" && !tasks.some((task) =>
    task.robotaxi_id === robotaxi.robotaxi_id && unfinishedTaskStatuses.has(task.task_status)
  );
}

function isDeploymentCandidateRobotaxi(robotaxi, deploymentTasks) {
  return robotaxi.availability_status === "AVAILABLE" &&
    !deploymentTasks.some((task) =>
      task.robotaxi_id === robotaxi.robotaxi_id && unfinishedDeploymentStatuses.has(task.task_status)
    );
}

function getDefaultDeploymentTarget(data) {
  const serviceArea = data.serviceAreas.find((area) => area.service_area_id === "SA-006") ||
    data.serviceAreas.find((area) => area.vehicle_capabilities?.can_stage || area.vehicle_capabilities?.can_short_wait);
  if (!serviceArea) return null;
  return {
    target_cell_id: serviceArea.covered_cell_ids[0],
    target_service_area_id: serviceArea.service_area_id,
    target_zone_id: data.zones.find((zone) => zone.service_area_ids?.includes(serviceArea.service_area_id))?.zone_id || null,
  };
}

function createDeploymentRoute(task, data) {
  const serviceArea = data.serviceAreas.find((area) => area.service_area_id === task.target_service_area_id);
  const segmentId = serviceArea?.segment_ids?.[0] || "RS-014";
  const segment = data.roadSegments.find((item) => item.road_segment_id === segmentId);
  const totalDistance = segment?.distance_m || 50;
  return {
    route_id: nextDeploymentRouteId(),
    route_name: `${task.robotaxi_id} 投放到 ${task.target_service_area_id}`,
    map_id: data.maps[0].map_id,
    start_cell_id: task.origin_cell_id,
    end_cell_id: task.target_cell_id,
    road_segment_sequence: segment ? [segment.road_segment_id] : [],
    related_service_area_ids: task.target_service_area_id ? [task.target_service_area_id] : [],
    total_distance_m: totalDistance,
    estimated_time_s: Math.max(1, Math.round(totalDistance / (40 * 1000 / 3600))),
    route_status: "Active",
  };
}

function getRouteExecutionCells(route, roadSegments, originCellId, targetCellId) {
  const cells = routeCellIds(route, roadSegments);
  return [...new Set([originCellId, ...cells, targetCellId].filter(Boolean))];
}

function enrichWorkerForDisplay(worker, readinessTasks, deploymentTasks) {
  const currentTask = findCurrentTask(worker.current_task_id, readinessTasks, deploymentTasks);
  return {
    ...worker,
    current_task_type: currentTask?.task_type || null,
    current_task_status: currentTask?.task_status || null,
  };
}

function enrichDeploymentTaskForDisplay(task, data) {
  const route = data.routes.find((item) => item.route_id === task.route_id);
  const originLocation = getLocationInfo(task.origin_cell_id, data);
  const targetLocation = getLocationInfo(task.target_cell_id, data);
  return {
    ...task,
    route_summary: summarizeRoute(route),
    origin_location_summary: originLocation.summary,
    target_location_summary: targetLocation.summary,
    origin_location_detail: originLocation.detail,
    target_location_detail: targetLocation.detail,
    route_detail: route ? getRouteDetail(route) : null,
  };
}

function enrichRouteExecutionForDisplay(execution, data) {
  const route = data.routes.find((item) => item.route_id === execution.route_id);
  const originLocation = getLocationInfo(execution.origin_cell_id, data);
  const targetLocation = getLocationInfo(execution.target_cell_id, data);
  const currentLocation = getLocationInfo(execution.current_cell_id, data);
  return {
    ...execution,
    route_summary: summarizeRoute(route),
    route_detail: route ? getRouteDetail(route) : null,
    origin_location_summary: originLocation.summary,
    target_location_summary: targetLocation.summary,
    current_location_summary: currentLocation.summary,
    origin_location_detail: originLocation.detail,
    target_location_detail: targetLocation.detail,
    current_location_detail: currentLocation.detail,
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
    location_summary: location.summary,
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
    current_route_step: currentRouteExecution
      ? `${currentRouteExecution.current_step_index} / ${currentRouteExecution.total_step_count}`
      : null,
    location_context: location.detail,
  };
}

function findCurrentRouteExecution(robotaxi, routeExecutions) {
  return routeExecutions.find((execution) =>
    execution.robotaxi_id === robotaxi.robotaxi_id && ["WAITING_START", "MOVING", "PAUSED"].includes(execution.execution_status)
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
    route_name: route.route_name,
    start_cell_id: route.start_cell_id,
    end_cell_id: route.end_cell_id,
    road_segment_sequence: route.road_segment_sequence,
    related_service_area_ids: route.related_service_area_ids,
    total_distance_m: route.total_distance_m,
    estimated_time_s: route.estimated_time_s,
    route_status: route.route_status,
  };
}

function hasRelation(value) {
  return Boolean(value) && value !== "无关联";
}

function findCurrentTask(taskId, readinessTasks, deploymentTasks) {
  if (!taskId) return null;
  return readinessTasks.find((task) => task.task_id === taskId) ||
    deploymentTasks.find((task) => task.task_id === taskId) ||
    null;
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

function nextEventId() {
  eventSequence += 1;
  return `EVT-${String(eventSequence).padStart(3, "0")}`;
}

function createDefaultPageUiState() {
  return {
    filters: { ...defaultPageFilters },
    appliedFilters: { ...defaultPageFilters },
  };
}

function getDefaultSelection(page, data) {
  if (page === "console") return { type: "map", id: data.maps[0].map_id };
  const type = pageObjectType[page];
  return type ? { type, id: null } : { type: null, id: null };
}

function loadRuntimeSnapshot(initialData) {
  const fallback = {
    operationalData: initialData,
    readinessTasks: [],
    deploymentTasks: [],
    routeExecutions: [],
    taskEventLogs: [],
    activePage: "console",
    pageSelections: { console: { type: "map", id: initialData.maps[0].map_id } },
    pageUiState: {},
  };
  if (typeof window === "undefined") return fallback;
  try {
    const rawValue = window.localStorage.getItem(runtimeStorageKey);
    if (!rawValue) return fallback;
    const snapshot = JSON.parse(rawValue);
    const readinessTasks = Array.isArray(snapshot.readinessTasks) ? snapshot.readinessTasks : [];
    const deploymentTasks = Array.isArray(snapshot.deploymentTasks) ? snapshot.deploymentTasks : [];
    const routeExecutions = Array.isArray(snapshot.routeExecutions) ? snapshot.routeExecutions : [];
    const taskEventLogs = Array.isArray(snapshot.taskEventLogs) ? snapshot.taskEventLogs : [];
    taskSequence = deriveSequence(readinessTasks, "task_id", "TASK-RC-");
    deploymentTaskSequence = deriveSequence(deploymentTasks, "task_id", "TASK-DP-");
    routeExecutionSequence = deriveSequence(routeExecutions, "route_execution_id", "REX-");
    deploymentRouteSequence = deriveSequence(snapshot.operationalData?.routes || [], "route_id", "DRT-");
    eventSequence = deriveSequence(taskEventLogs, "event_id", "EVT-");
    return {
      operationalData: snapshot.operationalData || initialData,
      readinessTasks,
      deploymentTasks,
      routeExecutions,
      taskEventLogs,
      activePage: snapshot.activePage || "console",
      pageSelections: {
        console: { type: "map", id: initialData.maps[0].map_id },
        ...(snapshot.pageSelections || {}),
      },
      pageUiState: snapshot.pageUiState || {},
    };
  } catch (error) {
    return fallback;
  }
}

function saveRuntimeSnapshot(snapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(runtimeStorageKey, JSON.stringify({
      ...snapshot,
      taskSequence,
      eventSequence,
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
  return rows.filter((row) => {
    const keywordMatched = !keyword || columns.some((key) => String(row[key] || "").toLowerCase().includes(keyword));
    const statusMatched = !statusField || !filters.statusValue || row[statusField] === filters.statusValue;
    const triggerMatched = !filters.triggerType || row.trigger_type === filters.triggerType;
    return keywordMatched && statusMatched && triggerMatched;
  });
}

function getOrderedStatusValues(page) {
  if (page === "readinessTasks") return readinessStatusOptions;
  if (page === "deploymentTasks") return deploymentStatusOptions;
  if (page === "routeExecutions") return routeExecutionStatusOptions;
  return [];
}

function createStatusOptions(rows, statusField, orderedValues = [], statusContext = null) {
  if (!statusField) return [];
  const values = [
    ...orderedValues,
    ...rows.map((row) => row[statusField]).filter(Boolean),
  ];
  return [...new Set(values)].map((value) => ({
    value,
    label: getStatusDisplayValue(statusField, value, rows.find((row) => row[statusField] === value) || { status_context: statusContext }),
    count: rows.filter((row) => row[statusField] === value).length,
  })).filter((item) => item.count > 0 || orderedValues.includes(item.value));
}

function getOpenKeysForPage(pageKey) {
  if (pageKey === "console") return [];
  const parentKeys = [];
  pageGroups.forEach((group) => {
    group.children?.forEach((item) => {
      if (item.key === pageKey) parentKeys.push(group.key);
      item.children?.forEach((child) => {
        if (child.key === pageKey) parentKeys.push(group.key, item.key);
      });
    });
  });
  return parentKeys;
}

function getRootMenuKey(key) {
  if (pageGroups.some((group) => group.key === key)) return key;
  const parentKeys = getOpenKeysForPage(key);
  return parentKeys[0] || key;
}
