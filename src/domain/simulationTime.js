export const SECONDS_PER_DAY = 24 * 60 * 60;

export function resolveTickSeconds({ tickSeconds, tickMinutes } = {}) {
  const seconds = Number(tickSeconds) || Number(tickMinutes) * 60;
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 10 * 60;
}

export function formatSimulationTimestamp(totalSeconds = 0) {
  const position = getSimulationPosition(totalSeconds);
  return `Day ${position.day} ${position.clockTime}`;
}

export function getSimulationPosition(totalSeconds = 0, tickSeconds = 10 * 60) {
  const normalized = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const secondsOfDay = normalized % SECONDS_PER_DAY;
  const day = Math.floor(normalized / SECONDS_PER_DAY) + 1;
  const hours = Math.floor(secondsOfDay / 3600);
  const minutes = Math.floor((secondsOfDay % 3600) / 60);
  const seconds = secondsOfDay % 60;
  const clockTime = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return {
    simulationSeconds: normalized,
    day,
    clockTime,
    displayTime: `Day ${day} ${clockTime}`,
    dayTick: Math.floor(secondsOfDay / resolveTickSeconds({ tickSeconds })),
  };
}

export function clockTimeToSeconds(time) {
  const clock = String(time || "00:00:00").trim().split(/\s+/).pop();
  const [hours, minutes, seconds] = clock.split(":").map(Number);
  return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
}

function pad(value) {
  return String(value).padStart(2, "0");
}
