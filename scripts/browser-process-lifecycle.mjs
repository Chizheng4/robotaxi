import fs from "node:fs";

export const DEFAULT_CDP_TIMEOUT_MS = 8000;

export function createBoundedCdpSender(socket, pending, getNextId, timeoutMs = DEFAULT_CDP_TIMEOUT_MS) {
  return (method, params = {}) => new Promise((resolve, reject) => {
    const id = getNextId();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chrome DevTools 调用超时：${method}`));
    }, timeoutMs);
    pending.set(id, (message) => {
      clearTimeout(timer);
      resolve(message);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

export async function closeManagedBrowser({ browser, socket, profileDir, timeoutMs = 2000 } = {}) {
  try {
    if (socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) socket.close();
  } catch {
    // Continue with process cleanup even when the debugging socket is already broken.
  }

  if (browser && browser.exitCode === null && !browser.killed) {
    browser.kill("SIGTERM");
    const exited = await waitForExit(browser, timeoutMs);
    if (!exited && browser.exitCode === null) {
      browser.kill("SIGKILL");
      await waitForExit(browser, 1000);
    }
  }

  if (profileDir) fs.rmSync(profileDir, { recursive: true, force: true });
}

function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("exit", onExit);
      resolve(value);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once("exit", onExit);
  });
}
