const cities = {
  albuquerque: {
    label: "Albuquerque",
    timeZone: "America/Denver",
    input: document.querySelector("#albuquerqueInput"),
    value: document.querySelector('[data-value="albuquerque"]'),
    face: document.querySelector('[data-face="albuquerque"]'),
  },
  berlin: {
    label: "Berlin",
    timeZone: "Europe/Berlin",
    input: document.querySelector("#berlinInput"),
    value: document.querySelector('[data-value="berlin"]'),
    face: document.querySelector('[data-face="berlin"]'),
  },
};

const matchStamp = document.querySelector("#matchStamp");
const currentButton = document.querySelector("#useCurrentTime");
const stepButtons = document.querySelectorAll("[data-step-hours]");
let selectedInstant = new Date();

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

  Object.values(cities).forEach((city) => {
    const parts = getZonedParts(selectedInstant, city.timeZone);
    city.input.value = zonedPartsToDateTimeLocal(parts);
    city.value.textContent = formatCityTime(parts);
    city.face.innerHTML = renderFace(parts, city.label);
  });
}

function updateFromCity(city) {
  const instant = instantFromZonedInput(city.input.value, city.timeZone);
  if (!instant) return;
  selectedInstant = instant;
  render();
}

Object.values(cities).forEach((city) => {
  city.input.addEventListener("change", () => updateFromCity(city));
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

render();
