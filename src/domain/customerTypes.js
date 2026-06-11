export const CustomerType = {
  INDIVIDUAL: "INDIVIDUAL",
  BUSINESS: "BUSINESS",
  VISITOR: "VISITOR",
  TEST_CUSTOMER: "TEST_CUSTOMER",
};

export const DefaultOrderChannel = {
  OWN_APP: "OWN_APP",
  PARTNER_APP: "PARTNER_APP",
  MANUAL_TEST: "MANUAL_TEST",
};

export const CustomerStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
  TEST_ONLY: "TEST_ONLY",
};

export function createCustomer(customer) {
  return customer;
}
