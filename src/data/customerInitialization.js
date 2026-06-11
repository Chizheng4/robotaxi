import {
  CustomerStatus,
  CustomerType,
  DefaultOrderChannel,
  createCustomer,
} from "../domain/customerTypes.js?v=20260611-v019-1-customer";

const CUSTOMER_COUNT = 54;
const CREATED_AT = "2026-01-01T09:00:00";

export function initializeCustomers() {
  return {
    customers: Array.from({ length: CUSTOMER_COUNT }, (_, index) => createCustomer({
      customer_id: `CU-${String(index + 1).padStart(3, "0")}`,
      customer_name: `模拟客户${String(index + 1).padStart(3, "0")}`,
      customer_type: index < 48 ? CustomerType.INDIVIDUAL : CustomerType.TEST_CUSTOMER,
      default_order_channel: getDefaultOrderChannel(index),
      customer_status: index < 50 ? CustomerStatus.ACTIVE : CustomerStatus.TEST_ONLY,
      created_at: CREATED_AT,
    })),
  };
}

function getDefaultOrderChannel(index) {
  if (index < 36) return DefaultOrderChannel.OWN_APP;
  if (index < 50) return DefaultOrderChannel.PARTNER_APP;
  return DefaultOrderChannel.MANUAL_TEST;
}
