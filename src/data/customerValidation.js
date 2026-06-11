import {
  CustomerStatus,
  CustomerType,
  DefaultOrderChannel,
} from "../domain/customerTypes.js?v=20260611-v019-1-customer";

export function validateCustomers(data) {
  const customers = data.customers || [];
  const customerIds = customers.map((customer) => customer.customer_id);

  return [
    check("CUSTOMER_COUNT", "Customer 数量必须为 54", customers.length === 54, `当前 ${customers.length} 个 Customer`),
    check("CUSTOMER_ID_UNIQUE", "每个 Customer 必须有唯一客户编号", new Set(customerIds).size === customerIds.length),
    check("CUSTOMER_ID_SEQUENCE", "客户编号必须为 CU-001 至 CU-054", customers.every((customer, index) => customer.customer_id === `CU-${String(index + 1).padStart(3, "0")}`)),
    check("CUSTOMER_NAME_PRESENT", "每个 Customer 必须有客户名称", customers.every((customer) => Boolean(customer.customer_name))),
    check(
      "CUSTOMER_TYPE_ALLOWED",
      "客户类型必须属于当前定义范围",
      customers.every((customer) => Object.values(CustomerType).includes(customer.customer_type)),
    ),
    check(
      "CUSTOMER_CHANNEL_ALLOWED",
      "默认下单渠道必须属于当前定义范围",
      customers.every((customer) => Object.values(DefaultOrderChannel).includes(customer.default_order_channel)),
    ),
    check(
      "CUSTOMER_STATUS_ALLOWED",
      "客户状态必须属于当前定义范围",
      customers.every((customer) => Object.values(CustomerStatus).includes(customer.customer_status)),
    ),
    check("CUSTOMER_ACTIVE_COUNT", "可参与需求模拟的 ACTIVE Customer 必须为 50 个", customers.filter((customer) => customer.customer_status === CustomerStatus.ACTIVE).length === 50),
    check("CUSTOMER_TEST_ONLY_COUNT", "TEST_ONLY Customer 必须为 4 个", customers.filter((customer) => customer.customer_status === CustomerStatus.TEST_ONLY).length === 4),
    check("CUSTOMER_NO_LOCATION_FIELD", "Customer 初始化不得包含实时位置字段", customers.every((customer) =>
      !("current_cell_id" in customer) &&
      !("customer_origin_cell_id" in customer) &&
      !("pickup_cell_id" in customer) &&
      !("dropoff_cell_id" in customer)
    )),
  ];
}

function check(rule_id, rule_name, passed, detail = "") {
  return {
    rule_id,
    rule_name,
    result: passed ? "PASS" : "FAIL",
    detail,
  };
}
