const accessSessionStorageKey = "robotaxi.platform.access.v1";
const demoUserName = "金星";
const sessionDurationMs = 12 * 60 * 60 * 1000;

export function getDemoUserName() {
  return demoUserName;
}

export function readAccessSession(storage = resolveStorage(), currentTime = Date.now()) {
  if (!storage) return null;
  try {
    const session = JSON.parse(storage.getItem(accessSessionStorageKey));
    if (
      session?.user_name !== demoUserName
      || !Number.isFinite(session?.expires_at)
      || session.expires_at <= currentTime
    ) {
      storage.removeItem(accessSessionStorageKey);
      return null;
    }
    return session;
  } catch {
    storage.removeItem(accessSessionStorageKey);
    return null;
  }
}

export function createAccessSession(userName, storage = resolveStorage(), currentTime = Date.now()) {
  if (String(userName || "").trim() !== demoUserName) {
    return { succeeded: false, reason: `请输入：${demoUserName}` };
  }
  const session = {
    user_name: demoUserName,
    role_name: demoUserName,
    authenticated_at: currentTime,
    expires_at: currentTime + sessionDurationMs,
  };
  try {
    storage?.setItem(accessSessionStorageKey, JSON.stringify(session));
  } catch {
    return { succeeded: false, reason: "当前浏览器无法保存登录状态" };
  }
  return { succeeded: true, session };
}

export function clearAccessSession(storage = resolveStorage()) {
  try {
    storage?.removeItem(accessSessionStorageKey);
  } catch {
    // Storage failure must still allow the current UI session to exit.
  }
}

export function getAccessSessionStorageKey() {
  return accessSessionStorageKey;
}

function resolveStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
