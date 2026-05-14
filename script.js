const STORAGE_KEY = "clocks.birthdate";
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const shortMonthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const calendarEl = document.querySelector("#calendarClocks");
const personalEl = document.querySelector("#personalClocks");
const nowStamp = document.querySelector("#nowStamp");
const birthYear = document.querySelector("#birthYear");
const birthMonth = document.querySelector("#birthMonth");
const birthDay = document.querySelector("#birthDay");
const birthdayMessage = document.querySelector("#birthdayMessage");

let selectedBirthday = null;

function pad(value) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function startOfYear(year) {
  return new Date(year, 0, 1);
}

function endOfYear(year) {
  return new Date(year + 1, 0, 1);
}

function progressBetween(now, start, end) {
  return clamp((now - start) / (end - start), 0, 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function formatPercent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function birthdayAge(now, birthday) {
  let age = now.getFullYear() - birthday.getFullYear();
  const birthdayThisYear = new Date(
    now.getFullYear(),
    birthday.getMonth(),
    birthday.getDate()
  );
  if (now < birthdayThisYear) age -= 1;
  return age;
}

function isBirthdayAllowed(now, birthday) {
  return birthday <= now && birthday >= addYears(now, -100);
}

function populateBirthdayControls(now) {
  const minYear = now.getFullYear() - 100;
  const maxYear = now.getFullYear();

  birthYear.innerHTML = "";
  for (let year = maxYear; year >= minYear; year -= 1) {
    birthYear.append(new Option(String(year), String(year)));
  }

  birthMonth.innerHTML = "";
  monthNames.forEach((month, index) => {
    birthMonth.append(new Option(month, String(index + 1)));
  });

  const saved = parseDateKey(localStorage.getItem(STORAGE_KEY));
  selectedBirthday = saved && isBirthdayAllowed(now, saved) ? saved : new Date(1990, 0, 1);
  if (!isBirthdayAllowed(now, selectedBirthday)) {
    selectedBirthday = new Date(maxYear - 30, 0, 1);
  }

  birthYear.value = String(selectedBirthday.getFullYear());
  birthMonth.value = String(selectedBirthday.getMonth() + 1);
  populateDayOptions(selectedBirthday.getDate());
  saveBirthdayFromControls();
}

function populateDayOptions(preferredDay) {
  const year = Number(birthYear.value);
  const monthIndex = Number(birthMonth.value) - 1;
  const maxDay = daysInMonth(year, monthIndex);
  const day = Math.min(preferredDay || Number(birthDay.value) || 1, maxDay);

  birthDay.innerHTML = "";
  for (let i = 1; i <= maxDay; i += 1) {
    birthDay.append(new Option(String(i), String(i)));
  }
  birthDay.value = String(day);
}

function saveBirthdayFromControls() {
  const now = new Date();
  const birthday = new Date(
    Number(birthYear.value),
    Number(birthMonth.value) - 1,
    Number(birthDay.value)
  );

  if (!isBirthdayAllowed(now, birthday)) {
    birthdayMessage.textContent = "Choose a birthday within the last 100 years.";
    return;
  }

  selectedBirthday = birthday;
  localStorage.setItem(STORAGE_KEY, dateKey(birthday));
  birthdayMessage.textContent = `Birthday saved: ${monthNames[birthday.getMonth()]} ${birthday.getDate()}, ${birthday.getFullYear()}.`;
  render();
}

function createTickElements(count, labelEvery, labels = []) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const progress = i / count;
    const angle = angleFor(progress);
    const major = i % labelEvery === 0;
    const outer = pointAt(angle, 88);
    const inner = pointAt(angle, major ? 76 : 82);
    parts.push(
      `<line class="${major ? "tick-major" : "tick-minor"}" x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}"></line>`
    );

    if (major) {
      const label = labels[i] ?? String(i);
      const labelPoint = pointAt(angle, 66);
      parts.push(
        `<text class="tick-label" x="${labelPoint.x.toFixed(2)}" y="${labelPoint.y.toFixed(2)}">${label}</text>`
      );
    }
  }
  return parts.join("");
}

function createInnerRing(ring) {
  const labels = ring.labels || {};
  const parts = [
    `<circle class="ring-guide" cx="100" cy="100" r="${ring.radius}"></circle>`,
  ];

  for (let i = 0; i < ring.count; i += 1) {
    const angle = angleFor(i / ring.count);
    const showLabel = i % ring.labelEvery === 0 || labels[i] !== undefined;
    const outer = pointAt(angle, ring.radius + 3);
    const inner = pointAt(angle, ring.radius - 3);
    parts.push(
      `<line class="ring-tick" x1="${inner.x.toFixed(2)}" y1="${inner.y.toFixed(2)}" x2="${outer.x.toFixed(2)}" y2="${outer.y.toFixed(2)}"></line>`
    );

    if (showLabel) {
      const labelPoint = pointAt(angle, ring.labelRadius || ring.radius - 11);
      const label = labels[i] ?? String(i);
      parts.push(
        `<text class="ring-label ${ring.symbols ? "symbol" : ""}" x="${labelPoint.x.toFixed(2)}" y="${labelPoint.y.toFixed(2)}">${label}</text>`
      );
    }
  }

  return parts.join("");
}

function handElement(hand) {
  const angle = angleFor(hand.progress);
  const end = pointAt(angle, hand.length);
  const tail = pointAt(angle + 180, hand.tail || 8);
  return `<line class="hand ${hand.className}" x1="${tail.x.toFixed(2)}" y1="${tail.y.toFixed(2)}" x2="${end.x.toFixed(2)}" y2="${end.y.toFixed(2)}"></line>`;
}

function renderClock(clock) {
  const labels = {};
  if (Array.isArray(clock.labels)) {
    clock.labels.forEach((label, index) => {
      labels[index] = label;
    });
  } else if (clock.labels) {
    Object.assign(labels, clock.labels);
  }

  return `
    <article class="clock-card">
      <div class="clock-top">
        <div>
          <h3 class="clock-title">${clock.title}</h3>
          <p class="clock-subtitle">${clock.subtitle}</p>
        </div>
        <p class="clock-value">${clock.value}</p>
      </div>
      <div class="clock-face-wrap">
        <svg class="clock-face" viewBox="0 0 200 200" role="img" aria-label="${clock.title}: ${clock.value}">
          <circle class="dial-outer" cx="100" cy="100" r="92"></circle>
          <circle class="dial-inner" cx="100" cy="100" r="72"></circle>
          ${createTickElements(clock.tickCount, clock.labelEvery, labels)}
          ${(clock.innerRings || []).map(createInnerRing).join("")}
          ${clock.hands.map(handElement).join("")}
          <circle class="hub" cx="100" cy="100" r="5"></circle>
        </svg>
      </div>
      <div class="legend">
        ${clock.hands
          .map(
            (hand) => `
              <span class="legend-item">
                <span class="swatch ${hand.swatch || ""}"></span>
                ${hand.label}
              </span>`
          )
          .join("")}
      </div>
    </article>
  `;
}

function yearProgress(now) {
  return progressBetween(now, startOfYear(now.getFullYear()), endOfYear(now.getFullYear()));
}

function calendarClocks(now) {
  const year = now.getFullYear();
  const centuryStart = Math.floor(year / 100) * 100;
  const decadeStart = Math.floor(year / 10) * 10;
  const yearFraction = yearProgress(now);
  const yearsIntoCentury = year - centuryStart + yearFraction;
  const yearsIntoDecade = year - decadeStart + yearFraction;
  const monthProgress =
    (now.getDate() - 1 + now.getHours() / 24 + now.getMinutes() / 1440) /
    daysInMonth(year, now.getMonth());
  const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const dayProgress = secondsToday / 86400;

  return [
    {
      title: "Century",
      subtitle: `${centuryStart}-${centuryStart + 99}`,
      value: formatPercent(yearsIntoCentury / 100),
      tickCount: 100,
      labelEvery: 10,
      labels: Array.from({ length: 100 }, (_, i) =>
        i % 10 === 0 ? String(centuryStart + i).slice(2) : ""
      ),
      innerRings: [
        {
          count: 10,
          labelEvery: 1,
          radius: 44,
          labels: Array.from({ length: 10 }, (_, i) => `${i * 10}`),
        },
      ],
      hands: [
        {
          progress: Math.floor(yearsIntoCentury / 10) / 10,
          length: 48,
          className: "hand-coarse",
          label: "Decade",
        },
        {
          progress: (yearsIntoCentury % 10) / 10,
          length: 78,
          className: "hand-fine",
          swatch: "fine",
          label: "Year in decade",
        },
      ],
    },
    {
      title: "Decade",
      subtitle: `${decadeStart}-${decadeStart + 9}`,
      value: formatPercent(yearsIntoDecade / 10),
      tickCount: 10,
      labelEvery: 1,
      labels: Array.from({ length: 10 }, (_, i) => String(decadeStart + i)),
      innerRings: [
        {
          count: 12,
          labelEvery: 1,
          radius: 44,
          labels: shortMonthNames,
        },
      ],
      hands: [
        {
          progress: yearsIntoDecade / 10,
          length: 54,
          className: "hand-coarse",
          label: "Year",
        },
        {
          progress: (now.getMonth() + monthProgress) / 12,
          length: 80,
          className: "hand-mid",
          swatch: "mid",
          label: "Month",
        },
      ],
    },
    {
      title: "Year",
      subtitle: String(year),
      value: formatPercent(yearFraction),
      tickCount: 52,
      labelEvery: 13,
      labels: { 0: "W1", 13: "W14", 26: "W27", 39: "W40" },
      innerRings: [
        {
          count: 12,
          labelEvery: 1,
          radius: 44,
          labels: shortMonthNames,
        },
      ],
      hands: [
        {
          progress: (now.getMonth() + monthProgress) / 12,
          length: 52,
          className: "hand-coarse",
          label: "Month",
        },
        {
          progress: yearFraction,
          length: 82,
          className: "hand-fine",
          swatch: "fine",
          label: "Week",
        },
      ],
    },
    {
      title: "24-Hour Day",
      subtitle: now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      value: now.toLocaleTimeString(),
      tickCount: 60,
      labelEvery: 15,
      labels: { 0: "00", 15: "15", 30: "30", 45: "45" },
      innerRings: [
        {
          count: 24,
          labelEvery: 2,
          radius: 45,
          labelRadius: 35,
          labels: Array.from({ length: 24 }, (_, i) => String(i)),
        },
      ],
      hands: [
        {
          progress: dayProgress,
          length: 46,
          className: "hand-coarse",
          label: "24-hour",
        },
        {
          progress: (now.getMinutes() + now.getSeconds() / 60) / 60,
          length: 70,
          className: "hand-mid",
          swatch: "mid",
          label: "Minute",
        },
        {
          progress: now.getSeconds() / 60,
          length: 84,
          className: "hand-second",
          swatch: "second",
          label: "Second",
        },
      ],
    },
  ];
}

function previousBirthday(now, birthday) {
  let date = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (date > now) date = addYears(date, -1);
  return date;
}

function nextBirthday(now, birthday) {
  const previous = previousBirthday(now, birthday);
  return addYears(previous, 1);
}

function personalClocks(now) {
  if (!selectedBirthday || !isBirthdayAllowed(now, selectedBirthday)) {
    return [];
  }

  const age = birthdayAge(now, selectedBirthday);
  const hundredth = addYears(selectedBirthday, 100);
  const lifetimeProgress = progressBetween(now, selectedBirthday, hundredth);
  const yearsAlive = age + progressBetween(now, previousBirthday(now, selectedBirthday), nextBirthday(now, selectedBirthday));
  const personalStart = previousBirthday(now, selectedBirthday);
  const personalEnd = nextBirthday(now, selectedBirthday);
  const personalProgress = progressBetween(now, personalStart, personalEnd);

  return [
    {
      title: "Lifetime Century",
      subtitle: `${dateKey(selectedBirthday)} to ${dateKey(hundredth)}`,
      value: `${age} years old`,
      tickCount: 100,
      labelEvery: 10,
      labels: Array.from({ length: 100 }, (_, i) => (i % 10 === 0 ? String(i) : "")),
      innerRings: [
        {
          count: 10,
          labelEvery: 1,
          radius: 44,
          labels: Array.from({ length: 10 }, (_, i) => `${i * 10}`),
        },
      ],
      hands: [
        {
          progress: Math.floor(yearsAlive / 10) / 10,
          length: 48,
          className: "hand-coarse",
          label: "Life decade",
        },
        {
          progress: (yearsAlive % 10) / 10,
          length: 78,
          className: "hand-fine",
          swatch: "fine",
          label: "Year in decade",
        },
      ],
    },
    {
      title: "Personal Year",
      subtitle: `${shortMonthNames[personalStart.getMonth()]} ${personalStart.getDate()} to ${shortMonthNames[personalEnd.getMonth()]} ${personalEnd.getDate()}`,
      value: formatPercent(personalProgress),
      tickCount: 52,
      labelEvery: 13,
      labels: { 0: "W1", 13: "W14", 26: "W27", 39: "W40" },
      innerRings: [
        {
          count: 4,
          labelEvery: 1,
          radius: 44,
          symbols: true,
          labels: ["I", "II", "III", "IV"],
        },
      ],
      hands: [
        {
          progress: Math.floor(personalProgress * 4) / 4,
          length: 52,
          className: "hand-coarse",
          label: "Season",
        },
        {
          progress: personalProgress,
          length: 82,
          className: "hand-fine",
          swatch: "fine",
          label: "Week",
        },
      ],
    },
  ];
}

function render() {
  const now = new Date();
  nowStamp.dateTime = now.toISOString();
  nowStamp.textContent = now.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  calendarEl.innerHTML = calendarClocks(now).map(renderClock).join("");
  personalEl.innerHTML = personalClocks(now).map(renderClock).join("");
}

birthYear.addEventListener("change", () => {
  populateDayOptions(Number(birthDay.value));
  saveBirthdayFromControls();
});
birthMonth.addEventListener("change", () => {
  populateDayOptions(Number(birthDay.value));
  saveBirthdayFromControls();
});
birthDay.addEventListener("change", saveBirthdayFromControls);

populateBirthdayControls(new Date());
render();
setInterval(render, 1000);
