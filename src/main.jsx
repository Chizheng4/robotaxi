const { useMemo, useRef, useState } = React;
const { Button, Descriptions, Empty, Layout, Menu, Table, Tag, Typography } = antd;
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

const pageGroups = [
  { key: "console", label: "运营中控台", children: [{ key: "console", label: "运营中控台" }] },
  {
    key: "opsCenter",
    label: "运营中心管理",
    children: [
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

function App() {
  const data = useMemo(() => ({
    ...initializeMapSpace(),
    ...initializeOperationsCenter(),
  }), []);
  const validations = useMemo(() => [
    ...validateMapSpace(data),
    ...validateOperationsCenter(data),
  ], [data]);
  const [activePage, setActivePage] = useState("console");
  const [selected, setSelected] = useState({ type: "map", id: data.maps[0].map_id });
  const [collapsed, setCollapsed] = useState(false);

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
      children: group.children.map((item) => ({ key: item.key, label: item.label })),
    };
  });
  const failedCount = validations.filter((item) => item.result !== "PASS").length;

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
          items={menuItems}
          onClick={({ key }) => setActivePage(key)}
        />
      </Sider>

      <Layout className="ops-main-layout">
        <div className="top-strip">
          <Text strong>最小运营空间</Text>
          <div className="top-strip-metrics">
            <Tag bordered={false}>地图 {data.maps.length}</Tag>
            <Tag bordered={false}>网格 {data.cells.length}</Tag>
            <Tag bordered={false}>Robotaxi {data.robotaxis.length}</Tag>
            <Tag bordered={false}>Worker {data.workers.length}</Tag>
            <Tag bordered={false} color={failedCount === 0 ? "success" : "error"}>
              校验 {failedCount === 0 ? "全部通过" : `${failedCount} 项异常`}
            </Tag>
          </div>
        </div>

        <Layout className="workbench">
          <Content className="work-content">
            {activePage === "console" ? (
              <MapCanvas data={data} selected={selected} onSelect={(type, id) => setSelected({ type, id })} />
            ) : (
              <RecordTable
                page={activePage}
                rows={rowsByPage[activePage] || []}
                selected={selected}
                onSelect={(type, id) => setSelected({ type, id })}
              />
            )}
          </Content>
          <aside className="detail-rail">
            <DetailPanel selectedObject={selectedObject} selectedType={selected.type} />
          </aside>
        </Layout>
      </Layout>
    </Layout>
  );
}

function RecordTable({ page, rows, selected, onSelect }) {
  const config = tableConfig[page];
  const objectType = pageObjectType[page];
  const idField = idFieldByType[objectType];
  const columns = config.columns.map((key) => ({
    key,
    title: getFieldLabel(key),
    dataIndex: key,
    ellipsis: true,
    width: getColumnWidth(key),
    render: (_, row) => renderCellValue(key, row),
  }));

  return (
    <section className="record-page-new">
      <div className="page-toolbar">
        <div>
          <h1>{config.title}</h1>
          <Text type="secondary">{config.description}</Text>
        </div>
        <Tag bordered={false}>记录 {rows.length}</Tag>
      </div>
      <Table
        size="small"
        rowKey={idField}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 14, size: "small", showSizeChanger: false }}
        scroll={{ x: "max-content", y: "calc(100vh - 198px)" }}
        rowClassName={(row) => selected?.type === objectType && selected?.id === row[idField] ? "active-table-row" : ""}
        onRow={(row) => ({ onClick: () => onSelect(objectType, row[idField]) })}
      />
    </section>
  );
}

function DetailPanel({ selectedObject, selectedType }) {
  if (!selectedObject) {
    return (
      <section className="detail-panel-new">
        <div className="panel-title">对象详情</div>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择对象查看详情" />
      </section>
    );
  }

  return (
    <section className="detail-panel-new">
      <div className="panel-title">{getDetailTitle(selectedType)}</div>
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
      <div className="page-toolbar compact-map-toolbar">
        <div>
          <h1>{map.map_name}</h1>
          <Text type="secondary">模拟网格空间 / 道路 / 地点 / 服务区 / 运营中心</Text>
        </div>
        <div className="map-toolbar-actions">
          <Tag bordered={false}>{map.grid_cols} x {map.grid_rows} / {map.cell_size_m}m</Tag>
          <Button size="small" onClick={() => changeZoom(viewport.zoom + 0.2)}>放大</Button>
          <Button size="small" onClick={() => changeZoom(viewport.zoom - 0.2)}>缩小</Button>
          <Button size="small" onClick={resetViewport}>复位</Button>
        </div>
      </div>

      <div className="map-stage">
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
  return getDisplayValue(row[key] ?? "");
}

function renderDetailValue(key, value) {
  if (key === "result") {
    const passed = value === "PASS";
    return <Tag color={passed ? "success" : "error"}>{getDisplayValue(value)}</Tag>;
  }
  return <Text className="detail-value">{formatDetailValue(value) || "无"}</Text>;
}

function summarizeObject(value) {
  const enabled = Object.entries(value)
    .filter(([, itemValue]) => itemValue === true)
    .map(([key]) => getFieldLabel(key));
  return enabled.length > 0 ? enabled.join(", ") : "无";
}

function formatDetailValue(value) {
  if (Array.isArray(value)) return value.map(formatDetailValue).join(", ");
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object" && value !== null) {
    return Object.entries(value)
      .map(([key, itemValue]) => `${getFieldLabel(key)}: ${formatDetailValue(itemValue)}`)
      .join("; ");
  }
  return String(getDisplayValue(value ?? ""));
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
  ] = await Promise.all([
    import("./data/mapInitialization.js?v=20260603-v006"),
    import("./data/mapValidation.js?v=20260603-v006"),
    import("./data/operationsCenterInitialization.js?v=20260603-v006"),
    import("./data/operationsCenterValidation.js?v=20260603-v006"),
    import("./data/cellContext.js?v=20260603-v006"),
    import("./domain/fieldDictionary.js?v=20260603-v006"),
  ]);

  initializeMapSpace = mapInitialization.initializeMapSpace;
  validateMapSpace = mapValidation.validateMapSpace;
  initializeOperationsCenter = operationsCenterInitialization.initializeOperationsCenter;
  validateOperationsCenter = operationsCenterValidation.validateOperationsCenter;
  createCellContext = cellContext.createCellContext;
  getDetailTitle = fieldDictionary.getDetailTitle;
  getDisplayValue = fieldDictionary.getDisplayValue;
  getFieldLabel = fieldDictionary.getFieldLabel;

  ReactDOM.createRoot(document.querySelector("#app")).render(<App />);
}

bootstrap();
