const MIN_CLOCKS = 2;
const MAX_CLOCKS = 4;
const WAKING_START_HOUR = 8;
const WAKING_END_HOUR = 22;
const MEETING_SEARCH_HOURS = 24 * 14;

const CITY_OPTIONS = [
  ["Albuquerque", "United States", "America/Denver"],
  ["Anchorage", "United States", "America/Anchorage"],
  ["Atlanta", "United States", "America/New_York"],
  ["Bogota", "Colombia", "America/Bogota"],
  ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires"],
  ["Berlin", "Germany", "Europe/Berlin"],
  ["Cairo", "Egypt", "Africa/Cairo"],
  ["Chicago", "United States", "America/Chicago"],
  ["Denver", "United States", "America/Denver"],
  ["Dubai", "United Arab Emirates", "Asia/Dubai"],
  ["Dublin", "Ireland", "Europe/Dublin"],
  ["Frankfurt", "Germany", "Europe/Berlin"],
  ["Honolulu", "United States", "Pacific/Honolulu"],
  ["Hong Kong", "Hong Kong", "Asia/Hong_Kong"],
  ["Istanbul", "Turkey", "Europe/Istanbul"],
  ["Jakarta", "Indonesia", "Asia/Jakarta"],
  ["Johannesburg", "South Africa", "Africa/Johannesburg"],
  ["Karachi", "Pakistan", "Asia/Karachi"],
  ["Lagos", "Nigeria", "Africa/Lagos"],
  ["Lima", "Peru", "America/Lima"],
  ["Lisbon", "Portugal", "Europe/Lisbon"],
  ["London", "United Kingdom", "Europe/London"],
  ["Los Angeles", "United States", "America/Los_Angeles"],
  ["Madrid", "Spain", "Europe/Madrid"],
  ["Manila", "Philippines", "Asia/Manila"],
  ["Melbourne", "Australia", "Australia/Melbourne"],
  ["Mexico City", "Mexico", "America/Mexico_City"],
  ["Miami", "United States", "America/New_York"],
  ["Montreal", "Canada", "America/Toronto"],
  ["Moscow", "Russia", "Europe/Moscow"],
  ["Mumbai", "India", "Asia/Kolkata"],
  ["Nairobi", "Kenya", "Africa/Nairobi"],
  ["New Delhi", "India", "Asia/Kolkata"],
  ["New York", "United States", "America/New_York"],
  ["Paris", "France", "Europe/Paris"],
  ["Phoenix", "United States", "America/Phoenix"],
  ["Rio de Janeiro", "Brazil", "America/Sao_Paulo"],
  ["Rome", "Italy", "Europe/Rome"],
  ["San Francisco", "United States", "America/Los_Angeles"],
  ["Santiago", "Chile", "America/Santiago"],
  ["Sao Paulo", "Brazil", "America/Sao_Paulo"],
  ["Seattle", "United States", "America/Los_Angeles"],
  ["Seoul", "South Korea", "Asia/Seoul"],
  ["Shanghai", "China", "Asia/Shanghai"],
  ["Singapore", "Singapore", "Asia/Singapore"],
  ["Sydney", "Australia", "Australia/Sydney"],
  ["Tokyo", "Japan", "Asia/Tokyo"],
  ["Toronto", "Canada", "America/Toronto"],
  ["Vancouver", "Canada", "America/Vancouver"],
  ["Washington, DC", "United States", "America/New_York"],
].map(([name, region, timeZone]) => ({
  id: `${name}, ${region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  name,
  region,
  timeZone,
  label: `${name}, ${region}`,
}));

const defaultCityIds = [
  "albuquerque-united-states",
  "berlin-germany",
  "tokyo-japan",
  "new-york-united-states",
];

const cityById = new Map(CITY_OPTIONS.map((city) => [city.id, city]));
const cityByLabel = new Map(CITY_OPTIONS.map((city) => [normalize(city.label), city]));

const cityClocks = document.querySelector("#cityClocks");
const digitalClocks = document.querySelector("#digitalClocks");
const cityOptions = document.querySelector("#cityOptions");
const matchStamp = document.querySelector("#matchStamp");
const currentButton = document.querySelector("#useCurrentTime");
const addClockButton = document.querySelector("#addClock");
const findMeetingButton = document.querySelector("#findMeetingTime");
const meetingMessage = document.querySelector("#meetingMessage");

let selectedInstant = new Date();
let nextClockId = 1;
let clocks = [
  createClock("albuquerque-united-states"),
  createClock("berlin-germany"),
];

function createClock(selectedCityId) {
  const id = `clock-${nextClockId}`;
  nextClockId += 1;
  return { id, selectedCityId };
}

function normalize(value) {
  return value.trim().toLowerCase();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function angleFor(progress) {
  return progress * 360 - 90;
}

function pointAt(angleDegrees, radius) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: 100 + Math.cos(radians) * radius,
    y: 100 + Math.sin(radians) * radius,
  };
}

function getSelectedCity(clock) {
  return cityById.get(clock.selectedCityId) || CITY_OPTIONS[0];
}

function findClock(clockId) {
  return clocks.find((clock) => clock.id === clockId);
}

function nextDefaultCityId() {
  const used = new Set(clocks.map((clock) => clock.selectedCityId));
  return defaultCityIds.find((cityId) => !used.has(cityId)) || CITY_OPTIONS[0].id;
}

function clearMeetingMessage() {
  meetingMessage.textContent = "";
  meetingMessage.className = "meeting-status";
}

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zonedPartsToDateTimeLocal(parts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function formatCityTime(parts) {
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

function formatCityDate(parts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function totalMinutes(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) / 60000;
}

function instantFromZonedInput(value, timeZone) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const target = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: 0,
  };

  let instant = new Date(Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute));
  for (let i = 0; i < 4; i += 1) {
    const actual = getZonedParts(instant, timeZone);
    const deltaMinutes = totalMinutes(target) - totalMinutes(actual);
    if (deltaMinutes === 0) return instant;
    instant = new Date(instant.getTime() + deltaMinutes * 60000);
  }

  return instant;
}

function nextWholeHourAfter(date) {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  if (next <= date) {
    next.setTime(next.getTime() + 3600000);
  }
  return next;
}

function isWakingTime(date, timeZone) {
  const { hour } = getZonedParts(date, timeZone);
  return hour >= WAKING_START_HOUR && hour < WAKING_END_HOUR;
}

function findNextMeetingInstant() {
  let candidate = nextWholeHourAfter(selectedInstant);

  for (let i = 0; i < MEETING_SEARCH_HOURS; i += 1) {
    const allWaking = clocks.every((clock) =>
      isWakingTime(candidate, getSelectedCity(clock).timeZone)
    );
    if (allWaking) return candidate;
    candidate = new Date(candidate.getTime() + 3600000);
  }

  return null;
}

function tickElements() {
  const parts = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const angle = angleFor(hour / 24);
    const major = hour % 2 === 0;
    const outer = pointAt(angle, 88);
    const inner = pointAt(angle, major ? 76 : 82);
    parts.push(
      `<line class="${major ? "tick-major" : "tick-minor"}" x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}"></line>`
    );
    if (major) {
      const label = pointAt(angle, 66);
      parts.push(
        `<text class="tick-label" x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}">${hour}</text>`
      );
    }
  }

  for (let minute = 0; minute < 60; minute += 1) {
    const angle = angleFor(minute / 60);
    const outer = pointAt(angle, 48);
    const inner = pointAt(angle, minute % 15 === 0 ? 39 : 43);
    parts.push(
      `<line class="${minute % 15 === 0 ? "ring-tick" : "ring-subtick"}" x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}"></line>`
    );
    if (minute % 15 === 0) {
      const label = pointAt(angle, 33);
      parts.push(
        `<text class="ring-label" x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}">${pad(minute)}</text>`
      );
    }
  }
  return parts.join("");
}

function handElement(progress, length, className, tail = 8) {
  const angle = angleFor(progress);
  const end = pointAt(angle, length);
  const back = pointAt(angle + 180, tail);
  return `<line class="hand ${className}" x1="${back.x.toFixed(2)}" y1="${back.y.toFixed(2)}" x2="${end.x.toFixed(2)}" y2="${end.y.toFixed(2)}"></line>`;
}

function renderFace(parts, label) {
  const secondsToday = parts.hour * 3600 + parts.minute * 60 + parts.second;
  const dayProgress = secondsToday / 86400;
  const minuteProgress = (parts.minute + parts.second / 60) / 60;

  return `
    <svg class="clock-face" viewBox="0 0 200 200" role="img" aria-label="${escapeHtml(label)}: ${formatCityTime(parts)}">
      <circle class="dial-outer" cx="100" cy="100" r="92"></circle>
      <circle class="dial-inner" cx="100" cy="100" r="72"></circle>
      <circle class="ring-guide" cx="100" cy="100" r="45"></circle>
      ${tickElements()}
      ${handElement(dayProgress, 48, "hand-coarse", 7)}
      ${handElement(minuteProgress, 78, "hand-mid", 9)}
      <circle class="hub" cx="100" cy="100" r="5"></circle>
    </svg>
    <div class="legend">
      <span class="legend-item"><span class="swatch"></span>24-hour</span>
      <span class="legend-item"><span class="swatch mid"></span>Minute</span>
    </div>
  `;
}

function renderClock(clock) {
  const city = getSelectedCity(clock);
  const parts = getZonedParts(selectedInstant, city.timeZone);
  const canRemove = clocks.length > MIN_CLOCKS;

  return `
    <article class="clock-card city-clock" data-clock-id="${clock.id}">
      <div class="clock-top">
        <div>
          <h3 class="clock-title">${escapeHtml(city.name)}</h3>
          <p class="clock-subtitle">${escapeHtml(city.region)} &middot; ${escapeHtml(city.timeZone)}</p>
        </div>
        <p class="clock-value">${formatCityTime(parts)}</p>
      </div>
      <label class="city-picker">
        <span>Search city</span>
        <input data-action="city" data-clock-id="${clock.id}" value="${escapeHtml(city.label)}" list="cityOptions" autocomplete="off" spellcheck="false" placeholder="Search 50 major cities">
      </label>
      <label class="time-control">
        <span>Set ${escapeHtml(city.name)} time</span>
        <input data-action="time" data-clock-id="${clock.id}" value="${zonedPartsToDateTimeLocal(parts)}" type="datetime-local" step="60">
      </label>
      ${canRemove ? `<button class="remove-clock" type="button" data-action="remove" data-clock-id="${clock.id}">Remove clock</button>` : ""}
      <div class="clock-face-wrap">${renderFace(parts, city.name)}</div>
      <div class="time-stepper" aria-label="Adjust ${escapeHtml(city.name)} time">
        <button type="button" data-action="step" data-clock-id="${clock.id}" data-step-hours="-1">-1 hr</button>
        <button type="button" data-action="zero" data-clock-id="${clock.id}">:00</button>
        <button type="button" data-action="step" data-clock-id="${clock.id}" data-step-hours="1">+1 hr</button>
      </div>
    </article>
  `;
}

function renderDigitalClock(clock) {
  const city = getSelectedCity(clock);
  const parts = getZonedParts(selectedInstant, city.timeZone);

  return `
    <article class="digital-clock" aria-label="${escapeHtml(city.name)} digital time">
      <span class="digital-city">${escapeHtml(city.name)}</span>
      <span class="digital-time">${formatCityTime(parts)}</span>
      <span class="digital-date">${formatCityDate(parts)}</span>
    </article>
  `;
}

function populateCityOptions() {
  cityOptions.innerHTML = CITY_OPTIONS
    .map((city) => `<option value="${escapeHtml(city.label)}"></option>`)
    .join("");
}

function selectCity(clock, value) {
  const city = cityByLabel.get(normalize(value));
  if (!city) {
    render();
    return;
  }

  clearMeetingMessage();
  clock.selectedCityId = city.id;
  render();
}

function updateFromClock(clock, value) {
  const city = getSelectedCity(clock);
  const instant = instantFromZonedInput(value, city.timeZone);
  if (!instant) return;
  clearMeetingMessage();
  selectedInstant = instant;
  render();
}

function zeroMinutes(clock) {
  const city = getSelectedCity(clock);
  const parts = getZonedParts(selectedInstant, city.timeZone);
  const value = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:00`;
  const instant = instantFromZonedInput(value, city.timeZone);
  if (!instant) return;
  clearMeetingMessage();
  selectedInstant = instant;
  render();
}

function addClock() {
  if (clocks.length >= MAX_CLOCKS) return;
  clearMeetingMessage();
  clocks.push(createClock(nextDefaultCityId()));
  render();
}

function removeClock(clockId) {
  if (clocks.length <= MIN_CLOCKS) return;
  clearMeetingMessage();
  clocks = clocks.filter((clock) => clock.id !== clockId);
  render();
}

function findMeetingTime() {
  const instant = findNextMeetingInstant();
  if (!instant) {
    meetingMessage.textContent = "No shared waking overlap for these cities.";
    meetingMessage.className = "meeting-status error";
    return;
  }

  selectedInstant = instant;
  render();
  meetingMessage.textContent = "Found the next hour when every displayed city is awake.";
  meetingMessage.className = "meeting-status success";
}

function render() {
  matchStamp.dateTime = selectedInstant.toISOString();
  matchStamp.textContent = selectedInstant.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  cityClocks.innerHTML = clocks.map(renderClock).join("");
  digitalClocks.innerHTML = clocks.map(renderDigitalClock).join("");
  addClockButton.disabled = clocks.length >= MAX_CLOCKS;
}

cityClocks.addEventListener("change", (event) => {
  const action = event.target?.dataset?.action;
  const clock = findClock(event.target?.dataset?.clockId);
  if (!clock) return;

  if (action === "city") selectCity(clock, event.target.value);
  if (action === "time") updateFromClock(clock, event.target.value);
});

cityClocks.addEventListener("input", (event) => {
  if (event.target?.dataset?.action !== "city") return;
  const clock = findClock(event.target.dataset.clockId);
  if (!clock) return;
  if (cityByLabel.has(normalize(event.target.value))) {
    selectCity(clock, event.target.value);
  }
});

cityClocks.addEventListener("click", (event) => {
  const action = event.target?.dataset?.action;
  const clockId = event.target?.dataset?.clockId;
  const clock = findClock(clockId);

  if (action === "remove") {
    removeClock(clockId);
    return;
  }

  if (!clock) return;

  if (action === "step") {
    clearMeetingMessage();
    selectedInstant = new Date(
      selectedInstant.getTime() + Number(event.target.dataset.stepHours) * 3600000
    );
    render();
  }

  if (action === "zero") {
    zeroMinutes(clock);
  }
});

currentButton.addEventListener("click", () => {
  clearMeetingMessage();
  selectedInstant = new Date();
  render();
});

addClockButton.addEventListener("click", addClock);
findMeetingButton.addEventListener("click", findMeetingTime);

populateCityOptions();
render();
