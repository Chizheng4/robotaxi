export function createRobotaxiMapProjections(robotaxis = []) {
  const vehiclesByCell = new Map();

  for (const vehicle of robotaxis) {
    if (!vehicle?.current_cell_id) continue;
    const cellVehicles = vehiclesByCell.get(vehicle.current_cell_id) || [];
    cellVehicles.push(vehicle);
    vehiclesByCell.set(vehicle.current_cell_id, cellVehicles);
  }

  return [...vehiclesByCell.entries()].flatMap(([cellId, vehicles]) => {
    const columnCount = Math.ceil(Math.sqrt(vehicles.length));
    const rowCount = Math.ceil(vehicles.length / columnCount);

    return vehicles.map((vehicle, index) => {
      const rowIndex = Math.floor(index / columnCount);
      const rowVehicleCount = Math.min(columnCount, vehicles.length - rowIndex * columnCount);
      const columnIndex = index % columnCount;
      return {
        vehicle,
        cellId,
        offsetX: (columnIndex - (rowVehicleCount - 1) / 2) * 0.24,
        offsetY: (rowIndex - (rowCount - 1) / 2) * 0.28,
      };
    });
  });
}
