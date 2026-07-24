import assert from "node:assert/strict";
import { navigationGroups, findNavigationPath } from "../src/ui/navigationRegistry.js";
import { getPageArchitecture } from "../src/ui/pageArchitectureRegistry.js";
import { createCitySpatialWorkbench, getCitySpatialObjectActions } from "../src/services/citySpatialWorkbenchService.js";
import { CITY_SPATIAL_CATALOG } from "../src/data/citySpatialCatalog.js";

assert.deepEqual(findNavigationPath("maps").map((item) => item.key), ["space", "gridSpatialManagement", "maps"]);
assert.deepEqual(findNavigationPath("cityMap").map((item) => item.key), ["space", "citySpatialManagement", "cityMap"]);
assert.deepEqual(findNavigationPath("cityZones").map((item) => item.key), ["space", "citySpatialManagement", "cityZones"]);
assert.equal(getPageArchitecture("cityMap").mode, "map");
assert.equal(getPageArchitecture("cityZones").mode, "record");

const space = navigationGroups.find((group) => group.key === "space");
assert.deepEqual(space.children.map((item) => item.label), ["网格仿真", "城市地理"]);

const workbench = createCitySpatialWorkbench(CITY_SPATIAL_CATALOG, []);
assert(Array.isArray(workbench.pages.cityZones));
assert(Array.isArray(workbench.pages.cityPlaces));
assert(Array.isArray(workbench.pages.cityServiceAreas));
for (const rows of Object.values(workbench.pages)) {
  for (const row of rows) {
    assert(row.spatial_object_id);
    assert(row.spatial_object_name);
    assert(row.spatial_object_type);
    assert(row.spatial_object_status);
  }
}
const objectActions = getCitySpatialObjectActions(workbench.pages.cityZones[0] || {});
assert.deepEqual(objectActions.map((action) => action.key), ["VIEW_MAP", "VIEW_DETAIL", "MANAGE_OBJECT"]);
assert(objectActions.every((action) => action.label && typeof action.enabled === "boolean"));

console.log("v049.12 城市地理对象工作台验证通过");
