const { useMemo, useRef, useState } = React;
const { Button, Descriptions, Empty, Input, Layout, Menu, Select, Space, Table, Tag, Typography } = antd;
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
let taskTypes;
let taskSequence = 0;
let eventSequence = 0;

const unfinishedTaskStatuses = new Set([
  "WAITING_ASSIGNMENT",
  "WAITING_CHECK",
  "CHECKING",
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
        ],
      },
      { key: "opsCenters", label: "运营中心列表" },
      { key: "workers", label: "作业人员列表" },
    ],
  },
  { key: "robotaxi", label: "Robotaxi 管理", children: [{ key: "robotaxis", label: "Robotaxi 列表" }] },
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
    columns: ["worker_id", "ops_center_id", "worker_name", "worker_role", "worker_status", "time_per_robotaxi", "max_robotaxi_per_day", "current_task_id"],
  },
  readinessTasks: {
    title: "运营准入任务",
    description: "用于将待检查 Robotaxi 转化为可运营车辆的准入任务单。",
    columns: ["task_id", "task_status", "trigger_type", "robotaxi_id", "worker_id", "check_result", "issue_type", "created_at"],
  },
  taskEventLogs: {
    title: "任务事件日志",
    description: "记录运营准入任务的创建、分配、检查和状态反馈事件。",
    columns: ["event_id", "event_type", "event_result", "task_id", "robotaxi_id", "worker_id", "message", "created_at"],
  },
  robotaxis: {
    title: "Robotaxi 管理",
    description: "Robotaxi 是等待运维检查后进入运营闭环的自动驾驶车辆资产。",
    columns: ["robotaxi_id", "fleet_id", "model_name", "automation_level", "battery_percent", "estimated_range_km", "availability_status", "motion_status", "current_cell_id"],
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
  taskEventLog: "event_id",
  robotaxi: "robotaxi_id",
  validation: "rule_id",
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

const triggerTypeOptions = ["AUTO", "MANUAL"];

function App() {
  const initialData = useMemo(() => ({
    ...initializeMapSpace(),
    ...initializeOperationsCenter(),
  }), []);
  const [operationalData, setOperationalData] = useState(initialData);
  const [readinessTasks, setReadinessTasks] = useState([]);
  const [taskEventLogs, setTaskEventLogs] = useState([]);
  const initialValidations = useMemo(() => [
    ...validateMapSpace(initialData),
    ...validateOperationsCenter(initialData),
  ], [initialData]);
  const data = useMemo(() => ({
    ...operationalData,
    readinessCheckTasks: readinessTasks,
    taskEventLogs,
  }), [operationalData, readinessTasks, taskEventLogs]);
  const validations = useMemo(() => [
    ...initialValidations,
    ...validateReadinessCheckTasks(data),
  ], [data, initialValidations]);
  const [activePage, setActivePage] = useState("console");
  const [selected, setSelected] = useState({ type: "map", id: data.maps[0].map_id });
  const [collapsed, setCollapsed] = useState(false);
  const [openMenuKeys, setOpenMenuKeys] = useState([]);
  const [detailCollapsed, setDetailCollapsed] = useState(false);

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
    workers: data.workers,
    readinessTasks,
    taskEventLogs,
    robotaxis: data.robotaxis,
    validations,
  }), [data, validations]);

  const selectedObject = useMemo(() => {
    if (selected.type === "cell") {
      const cell = data.cells.find((item) => item.cell_id === selected.id);
      return cell ? createCellContext(cell, data) : null;
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
      robotaxi: data.robotaxis,
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

  return (
    <Layout className="ops-shell">
      <Sider className="ops-sider" width={216} collapsedWidth={58} collapsed={collapsed} trigger={null}>
        <div className="brand-bar">
          <div className="brand-title">{collapsed ? "RT" : "Robotaxi 运营平台"}</div>
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
          </div>
        </div>

        <Layout className={detailCollapsed ? "workbench detail-collapsed" : "workbench"}>
          <Content className="work-content">
            {activePage === "console" ? (
              <MapCanvas data={data} selected={selected} onSelect={(type, id) => setSelected({ type, id })} />
            ) : (
              <RecordTable
                page={activePage}
                rows={rowsByPage[activePage] || []}
                selected={selected}
                onSelect={(type, id) => setSelected({ type, id })}
                actions={{
                  createManualTask,
                  runAutoReadinessCheck,
                  assignWorker,
                  startCheck,
                  submitCheckResult,
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
    if (key === "console") {
      setSelected({ type: "map", id: data.maps[0].map_id });
      return;
    }
    const nextType = pageObjectType[key];
    setSelected(nextType ? { type: nextType, id: null } : { type: null, id: null });
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

  function createManualTask() {
    const candidate = findNextCandidate(data.robotaxis, readinessTasks);
    const nextLogs = [createEventLog({
      event_type: taskTypes.TaskEventType.MANUAL_TRIGGER_STARTED,
      event_result: taskTypes.TaskEventResult.SUCCESS,
      trigger_type: taskTypes.TriggerType.MANUAL,
      message: "手动触发运营准入任务生成",
    })];

    if (!candidate) {
      setTaskEventLogs((logs) => [...nextLogs, ...logs]);
      addLog({
        event_type: taskTypes.TaskEventType.NO_CANDIDATE_ROBOTAXI,
        event_result: taskTypes.TaskEventResult.SKIPPED,
        trigger_type: taskTypes.TriggerType.MANUAL,
        message: "当前没有可生成准入任务的 Robotaxi",
      });
      return;
    }

    const task = createTask(candidate, taskTypes.TriggerType.MANUAL);
    setReadinessTasks((tasks) => [task, ...tasks]);
    setOperationalData((current) => ({
      ...current,
      robotaxis: current.robotaxis.map((robotaxi) => robotaxi.robotaxi_id === candidate.robotaxi_id ? {
        ...robotaxi,
        current_task_id: task.task_id,
      } : robotaxi),
    }));
    setTaskEventLogs((logs) => [
      createEventLog({
        event_type: taskTypes.TaskEventType.TASK_CREATED,
        event_result: taskTypes.TaskEventResult.SUCCESS,
        task_id: task.task_id,
        robotaxi_id: task.robotaxi_id,
        trigger_type: task.trigger_type,
        message: `已创建 ${task.robotaxi_id} 的运营准入任务`,
      }),
      ...nextLogs,
      ...logs,
    ]);
    setSelected({ type: "readinessTask", id: task.task_id });
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

  function createEventLog(event) {
    return taskTypes.createTaskEventLog({
      event_id: nextEventId(),
      task_id: event.task_id || null,
      robotaxi_id: event.robotaxi_id || null,
      worker_id: event.worker_id || null,
      trigger_type: event.trigger_type || null,
      event_type: event.event_type,
      event_result: event.event_result,
      message: event.message,
      created_at: now(),
    });
  }
}

function RecordTable({ page, rows, selected, onSelect, actions }) {
  const isReadinessPage = page === "readinessTasks";
  const config = tableConfig[page];
  const objectType = pageObjectType[page];
  const idField = idFieldByType[objectType];
  const [filters, setFilters] = useState({
    keyword: "",
    taskStatus: null,
    triggerType: null,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const displayRows = useMemo(() => {
    if (!isReadinessPage) return rows;
    return filterReadinessRows(rows, appliedFilters);
  }, [appliedFilters, isReadinessPage, rows]);
  const columns = config.columns.map((key) => ({
    key,
    title: getFieldLabel(key),
    dataIndex: key,
    ellipsis: true,
    width: getColumnWidth(key),
    render: (_, row) => renderCellValue(key, row),
  }));
  const finalColumns = isReadinessPage ? [
    ...columns,
    {
      key: "actions",
      title: "操作",
      fixed: "right",
      width: 240,
      render: (_, row) => renderReadinessActions(row, actions),
    },
  ] : columns;

  return (
    <section className={isReadinessPage ? "record-page-new readiness-page" : "record-page-new"}>
      {isReadinessPage && (
        <>
          <div className="list-filter-bar">
            <div className="filter-field keyword-field">
              <span>关键词</span>
              <Input
                size="small"
                placeholder="任务编号 / Robotaxi / Worker"
                value={filters.keyword}
                onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
              />
            </div>
            <div className="filter-field">
              <span>任务状态</span>
              <Select
                size="small"
                placeholder="全部状态"
                allowClear
                value={filters.taskStatus}
                onChange={(value) => setFilters((current) => ({ ...current, taskStatus: value || null }))}
                options={readinessStatusOptions.map((value) => ({ value, label: getDisplayValue(value) }))}
              />
            </div>
            <div className="filter-field">
              <span>触发方式</span>
              <Select
                size="small"
                placeholder="全部方式"
                allowClear
                value={filters.triggerType}
                onChange={(value) => setFilters((current) => ({ ...current, triggerType: value || null }))}
                options={triggerTypeOptions.map((value) => ({ value, label: getDisplayValue(value) }))}
              />
            </div>
            <Button size="small" type="primary" onClick={() => setAppliedFilters(filters)}>查询任务</Button>
            <Button size="small" onClick={() => {
              const resetFilters = { keyword: "", taskStatus: null, triggerType: null };
              setFilters(resetFilters);
              setAppliedFilters(resetFilters);
            }}>重置条件</Button>
          </div>
          <div className="list-action-bar">
            <Button size="small" type="primary" onClick={actions.createManualTask}>生成准入检查任务</Button>
            <Button size="small" onClick={actions.runAutoReadinessCheck}>启动自动准入检查</Button>
          </div>
        </>
      )}
      <Table
        size="small"
        rowKey={idField}
        columns={finalColumns}
        dataSource={displayRows}
        pagination={{ pageSize: 14, size: "small", showSizeChanger: false }}
        scroll={{ x: "max-content", y: isReadinessPage ? "calc(100vh - 384px)" : "calc(100vh - 96px)" }}
        rowClassName={(row) => selected?.type === objectType && selected?.id === row[idField] ? "active-table-row" : ""}
        onRow={(row) => ({ onClick: () => onSelect(objectType, row[idField]) })}
      />
      {isReadinessPage && (
        <div className="event-log-section">
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
            scroll={{ x: "max-content", y: 160 }}
          />
        </div>
      )}
      <ModuleFooter
        page={page}
        totalCount={rows.length}
        displayCount={displayRows.length}
        eventCount={actions.taskEventLogs?.length || 0}
        appliedFilters={isReadinessPage ? appliedFilters : null}
      />
    </section>
  );
}

function ModuleFooter({ page, totalCount, displayCount, eventCount, appliedFilters }) {
  const hasFilter = appliedFilters && (
    appliedFilters.keyword ||
    appliedFilters.taskStatus ||
    appliedFilters.triggerType
  );
  if (page === "readinessTasks") {
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
      <Descriptions
        className="compact-descriptions"
        column={1}
        size="small"
        colon={false}
        items={Object.entries(selectedObject).map(([key, value]) => ({
          key,
          label: getFieldLabel(key),
          children: renderDetailValue(key, value),
        }))}
      />
    </section>
  );
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
  return getFieldDisplayValue(key, row[key] ?? "");
}

function renderReadinessActions(row, actions) {
  if (row.task_status === "WAITING_ASSIGNMENT") {
    return <Button size="small" onClick={() => actions.assignWorker(row.task_id)}>分配 Worker</Button>;
  }
  if (row.task_status === "WAITING_CHECK") {
    return <Button size="small" type="primary" onClick={() => actions.startCheck(row.task_id)}>开始检查</Button>;
  }
  if (row.task_status === "CHECKING") {
    return (
      <Space size={4}>
        <Button size="small" type="primary" onClick={() => actions.submitCheckResult(row.task_id, taskTypes.CheckResult.PASSED)}>检查通过</Button>
        <Button size="small" danger onClick={() => actions.submitCheckResult(row.task_id, taskTypes.CheckResult.FAILED, taskTypes.IssueType.LOW_BATTERY)}>不通过-电量不足</Button>
      </Space>
    );
  }
  return <Text type="secondary">查看详情</Text>;
}

function renderDetailValue(key, value) {
  if (key === "result") {
    const passed = value === "PASS";
    return <Tag color={passed ? "success" : "error"}>{getDisplayValue(value)}</Tag>;
  }
  return <Text className="detail-value">{formatDetailValue(value, key) || "无"}</Text>;
}

function summarizeObject(value) {
  const enabled = Object.entries(value)
    .filter(([, itemValue]) => itemValue === true)
    .map(([key]) => getFieldLabel(key));
  return enabled.length > 0 ? enabled.join(", ") : "无";
}

function formatDetailValue(value, key) {
  if (Array.isArray(value)) return value.map((item) => formatDetailValue(item, key)).join(", ");
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([itemKey, itemValue]) => `${getFieldLabel(itemKey)}: ${formatDetailValue(itemValue, itemKey)}`)
      .join("; ");
  }
  return String(getFieldDisplayValue(key, value ?? ""));
}

function getFieldDisplayValue(key, value) {
  if (key === "check_result" && value === "FAILED") return "检查不通过";
  if (key === "event_result" && value === "FAILED") return "失败";
  return getDisplayValue(value);
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
    taskTypeModule,
  ] = await Promise.all([
    import("./data/mapInitialization.js?v=20260603-v006"),
    import("./data/mapValidation.js?v=20260603-v006"),
    import("./data/operationsCenterInitialization.js?v=20260603-v006"),
    import("./data/operationsCenterValidation.js?v=20260603-v006"),
    import("./data/cellContext.js?v=20260603-v006"),
    import("./domain/fieldDictionary.js?v=20260603-v006"),
    import("./data/readinessCheckTaskValidation.js"),
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

function now() {
  return new Date().toISOString();
}

function nextTaskId() {
  taskSequence += 1;
  return `TASK-RC-${String(taskSequence).padStart(3, "0")}`;
}

function nextEventId() {
  eventSequence += 1;
  return `EVT-${String(eventSequence).padStart(3, "0")}`;
}

function filterReadinessRows(rows, filters) {
  const keyword = filters.keyword.trim().toLowerCase();
  return rows.filter((row) => {
    const keywordMatched = !keyword || [
      row.task_id,
      row.robotaxi_id,
      row.worker_id,
    ].some((value) => String(value || "").toLowerCase().includes(keyword));
    const statusMatched = !filters.taskStatus || row.task_status === filters.taskStatus;
    const triggerMatched = !filters.triggerType || row.trigger_type === filters.triggerType;
    return keywordMatched && statusMatched && triggerMatched;
  });
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
