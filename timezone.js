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

const cityById = new Map(CITY_OPTIONS.map((city) => [city.id, city]));
const cityByLabel = new Map(CITY_OPTIONS.map((city) => [normalize(city.label), city]));

const slots = {
  left: {
    selectedCityId: "albuquerque-united-states",
    search: document.querySelector("#leftCitySearch"),
    input: document.querySelector("#leftTimeInput"),
    title: document.querySelector('[data-title="left"]'),
    subtitle: document.querySelector('[data-subtitle="left"]'),
    timeLabel: document.querySelector('[data-time-label="left"]'),
    value: document.querySelector('[data-value="left"]'),
    face: document.querySelector('[data-face="left"]'),
  },
  right: {
    selectedCityId: "berlin-germany",
    search: document.querySelector("#rightCitySearch"),
    input: document.querySelector("#rightTimeInput"),
    title: document.querySelector('[data-title="right"]'),
    subtitle: document.querySelector('[data-subtitle="right"]'),
    timeLabel: document.querySelector('[data-time-label="right"]'),
    value: document.querySelector('[data-value="right"]'),
    face: document.querySelector('[data-face="right"]'),
  },
};

const cityOptions = document.querySelector("#cityOptions");
const matchStamp = document.querySelector("#matchStamp");
const currentButton = document.querySelector("#useCurrentTime");
const stepButtons = document.querySelectorAll("[data-step-hours]");
let selectedInstant = new Date();

function normalize(value) {
  return value.trim().toLowerCase();
}

function pad(value) {
  return String(value).padStart(2, "0");
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

function getSelectedCity(slot) {
  return cityById.get(slot.selectedCityId) || CITY_OPTIONS[0];
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
    <svg class="clock-face" viewBox="0 0 200 200" role="img" aria-label="${label}: ${formatCityTime(parts)}">
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

function populateCityOptions() {
  cityOptions.innerHTML = CITY_OPTIONS
    .map((city) => `<option value="${city.label}"></option>`)
    .join("");
}

function selectCity(slot, value) {
  const city = cityByLabel.get(normalize(value));
  if (!city) {
    slot.search.value = getSelectedCity(slot).label;
    return;
  }

  slot.selectedCityId = city.id;
  render();
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

  Object.values(slots).forEach((slot) => {
    const city = getSelectedCity(slot);
    const parts = getZonedParts(selectedInstant, city.timeZone);
    slot.search.value = city.label;
    slot.title.textContent = city.name;
    slot.subtitle.textContent = `${city.region} · ${city.timeZone}`;
    slot.timeLabel.textContent = `Set ${city.name} time`;
    slot.input.value = zonedPartsToDateTimeLocal(parts);
    slot.value.textContent = formatCityTime(parts);
    slot.face.innerHTML = renderFace(parts, city.name);
  });
}

function updateFromSlot(slot) {
  const city = getSelectedCity(slot);
  const instant = instantFromZonedInput(slot.input.value, city.timeZone);
  if (!instant) return;
  selectedInstant = instant;
  render();
}

Object.values(slots).forEach((slot) => {
  slot.input.addEventListener("change", () => updateFromSlot(slot));
  slot.search.addEventListener("change", () => selectCity(slot, slot.search.value));
  slot.search.addEventListener("input", () => {
    if (cityByLabel.has(normalize(slot.search.value))) {
      selectCity(slot, slot.search.value);
    }
  });
});

currentButton.addEventListener("click", () => {
  selectedInstant = new Date();
  render();
});

stepButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedInstant = new Date(
      selectedInstant.getTime() + Number(button.dataset.stepHours) * 3600000
    );
    render();
  });
});

populateCityOptions();
render();
