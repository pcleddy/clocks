import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

class FakeOption {
  constructor(text, value) {
    this.text = text;
    this.value = value;
  }
}

class FakeElement {
  constructor(selector) {
    this.selector = selector;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this._innerHTML = "";
    this._textContent = "";
    this.value = "";
    this.dateTime = "";
    this.dataset = {};
    this.disabled = false;
  }

  append(child) {
    this.children.push(child);
    if (!this.value && child?.value) {
      this.value = child.value;
    }
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.({ target: this, ...event });
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (value === "") {
      this.children = [];
      this.value = "";
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  get textContent() {
    return this._textContent;
  }
}

function createHarness() {
  const elements = new Map();
  const localStorage = new Map();
  const selectors = [
    "#calendarClocks",
    "#personalClocks",
    "#decimalClocks",
    "#nowStamp",
    "#birthYear",
    "#birthMonth",
    "#birthDay",
    "#birthdayMessage",
  ];

  selectors.forEach((selector) => {
    elements.set(selector, new FakeElement(selector));
  });

  return {
    context: {
      console,
      Date,
      Math,
      Number,
      Object,
      String,
      Array,
      Option: FakeOption,
      document: {
        querySelector(selector) {
          const element = elements.get(selector);
          assert.ok(element, `unexpected selector: ${selector}`);
          return element;
        },
      },
      localStorage: {
        getItem(key) {
          return localStorage.has(key) ? localStorage.get(key) : null;
        },
        setItem(key, value) {
          localStorage.set(key, String(value));
        },
      },
      setInterval() {
        return 1;
      },
    },
    elements,
    localStorage,
  };
}

function createTimezoneHarness() {
  const elements = new Map();
  const selectors = [
    "#cityClocks",
    "#digitalClocks",
    "#cityOptions",
    "#matchStamp",
    "#useCurrentTime",
    "#addClock",
    "#findMeetingTime",
    "#meetingMessage",
  ];

  selectors.forEach((selector) => {
    elements.set(selector, new FakeElement(selector));
  });

  return {
    context: {
      console,
      Date,
      Intl,
      Math,
      Number,
      Object,
      String,
      Array,
      document: {
        querySelector(selector) {
          const element = elements.get(selector);
          assert.ok(element, `unexpected selector: ${selector}`);
          return element;
        },
      },
    },
    elements,
  };
}

function clockIds(html) {
  return [...new Set([...html.matchAll(/data-clock-id="([^"]+)"/g)].map((match) => match[1]))];
}

function cityCard(html, cityName) {
  const index = html.indexOf(`<h3 class="clock-title">${cityName}</h3>`);
  assert.notEqual(index, -1, `${cityName} card should render`);
  const next = html.indexOf("</article>", index);
  return html.slice(index, next);
}

function clockValue(html, cityName) {
  const card = cityCard(html, cityName);
  const match = card.match(/<p class="clock-value">(\d{2}:\d{2})<\/p>/);
  assert.ok(match, `${cityName} should have a clock value`);
  return match[1];
}

function digitalValue(html, cityName) {
  const index = html.indexOf(`<span class="digital-city">${cityName}</span>`);
  assert.notEqual(index, -1, `${cityName} digital clock should render`);
  const next = html.indexOf("</article>", index);
  const card = html.slice(index, next);
  const match = card.match(/<span class="digital-time">(\d{2}:\d{2})<\/span>/);
  assert.ok(match, `${cityName} should have a digital time`);
  return match[1];
}

async function smokeStaticFiles() {
  const html = await readFile(join(root, "index.html"), "utf8");
  const timezoneHtml = await readFile(join(root, "timezone.html"), "utf8");
  const css = await readFile(join(root, "styles.css"), "utf8");
  const js = await readFile(join(root, "script.js"), "utf8");
  const timezoneJs = await readFile(join(root, "timezone.js"), "utf8");

  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script src="script\.js"><\/script>/);
  assert.match(html, /href="timezone\.html"/);
  assert.match(timezoneHtml, /href="index\.html"/);
  assert.match(timezoneHtml, /<script src="timezone\.js"><\/script>/);
  assert.match(timezoneHtml, /id="cityClocks"/);
  assert.match(timezoneHtml, /id="digitalClocks"/);
  assert.match(timezoneHtml, /id="addClock"/);
  assert.match(timezoneHtml, /Find shared waking time/);
  assert.match(css, /\.clock-face/);
  assert.match(css, /\.site-nav/);
  assert.match(css, /\.hand-coarse/);
  assert.match(js, /setInterval\(render, 1000\)/);
  assert.match(timezoneJs, /America\/Denver/);
  assert.match(timezoneJs, /Europe\/Berlin/);
}

async function smokeRenderHarness() {
  const script = await readFile(join(root, "script.js"), "utf8");
  const harness = createHarness();
  vm.createContext(harness.context);
  vm.runInContext(script, harness.context, { filename: "script.js" });

  const calendar = harness.elements.get("#calendarClocks");
  const personal = harness.elements.get("#personalClocks");
  const decimal = harness.elements.get("#decimalClocks");
  const nowStamp = harness.elements.get("#nowStamp");
  const year = harness.elements.get("#birthYear");
  const month = harness.elements.get("#birthMonth");
  const day = harness.elements.get("#birthDay");
  const message = harness.elements.get("#birthdayMessage");

  assert.equal((calendar.innerHTML.match(/class="clock-card"/g) || []).length, 5);
  assert.equal((personal.innerHTML.match(/class="clock-card"/g) || []).length, 2);
  assert.equal((decimal.innerHTML.match(/class="clock-card"/g) || []).length, 3);
  assert.equal((calendar.innerHTML.match(/<svg class="clock-face"/g) || []).length, 5);
  assert.equal((personal.innerHTML.match(/<svg class="clock-face"/g) || []).length, 2);
  assert.equal((decimal.innerHTML.match(/<svg class="clock-face"/g) || []).length, 3);
  assert.match(calendar.innerHTML, /Day/);
  assert.match(calendar.innerHTML, /Decimal Day/);
  assert.match(calendar.innerHTML, /Second/);
  assert.match(personal.innerHTML, /Lifetime Century/);
  assert.match(personal.innerHTML, /Personal Year/);
  assert.match(decimal.innerHTML, /Decimal Century/);
  assert.match(decimal.innerHTML, /Decimal Decade/);
  assert.match(decimal.innerHTML, /Decimal Year/);
  assert.match(nowStamp.textContent, /\d/);
  assert.ok(nowStamp.dateTime);
  assert.ok(year.children.length >= 100);
  assert.equal(month.children.length, 12);
  assert.ok(day.children.length >= 28);
  assert.match(message.textContent, /Birthday saved:/);
  assert.match(harness.localStorage.get("clocks.birthdate"), /^\d{4}-\d{2}-\d{2}$/);
}

async function smokeTimezoneHarness() {
  const script = await readFile(join(root, "timezone.js"), "utf8");
  const harness = createTimezoneHarness();
  vm.createContext(harness.context);
  vm.runInContext(script, harness.context, { filename: "timezone.js" });

  const cityClocks = harness.elements.get("#cityClocks");
  const digitalClocks = harness.elements.get("#digitalClocks");
  const cityOptions = harness.elements.get("#cityOptions");
  const addClock = harness.elements.get("#addClock");
  const findMeetingTime = harness.elements.get("#findMeetingTime");
  const meetingMessage = harness.elements.get("#meetingMessage");

  assert.equal((cityClocks.innerHTML.match(/class="clock-card city-clock"/g) || []).length, 2);
  assert.match(cityClocks.innerHTML, /Albuquerque/);
  assert.match(cityClocks.innerHTML, /Berlin/);
  assert.match(cityClocks.innerHTML, /<svg class="clock-face"/);
  assert.equal((digitalClocks.innerHTML.match(/class="digital-clock"/g) || []).length, 2);
  assert.match(cityClocks.innerHTML, /Search 50 major cities/);
  assert.equal((cityOptions.innerHTML.match(/<option /g) || []).length, 50);
  assert.equal(addClock.disabled, false);

  let [firstId, secondId] = clockIds(cityClocks.innerHTML);

  cityClocks.dispatch("change", {
    target: {
      value: "2026-05-17T12:00",
      dataset: { action: "time", clockId: firstId },
    },
  });
  assert.equal(clockValue(cityClocks.innerHTML, "Albuquerque"), "12:00");
  assert.equal(clockValue(cityClocks.innerHTML, "Berlin"), "20:00");
  assert.equal(digitalValue(digitalClocks.innerHTML, "Albuquerque"), "12:00");
  assert.equal(digitalValue(digitalClocks.innerHTML, "Berlin"), "20:00");

  cityClocks.dispatch("change", {
    target: {
      value: "2026-05-17T09:30",
      dataset: { action: "time", clockId: secondId },
    },
  });
  assert.equal(clockValue(cityClocks.innerHTML, "Berlin"), "09:30");
  assert.equal(clockValue(cityClocks.innerHTML, "Albuquerque"), "01:30");

  cityClocks.dispatch("click", {
    target: {
      dataset: { action: "step", clockId: secondId, stepHours: "1" },
    },
  });
  assert.equal(clockValue(cityClocks.innerHTML, "Berlin"), "10:30");
  assert.equal(clockValue(cityClocks.innerHTML, "Albuquerque"), "02:30");

  cityClocks.dispatch("change", {
    target: {
      value: "Tokyo, Japan",
      dataset: { action: "city", clockId: firstId },
    },
  });
  assert.match(cityClocks.innerHTML, /Tokyo/);
  assert.equal(clockValue(cityClocks.innerHTML, "Tokyo"), "17:30");
  assert.equal(clockValue(cityClocks.innerHTML, "Berlin"), "10:30");

  cityClocks.dispatch("click", {
    target: {
      dataset: { action: "zero", clockId: firstId },
    },
  });
  assert.equal(clockValue(cityClocks.innerHTML, "Tokyo"), "17:00");
  assert.equal(clockValue(cityClocks.innerHTML, "Berlin"), "10:00");
  assert.equal(digitalValue(digitalClocks.innerHTML, "Tokyo"), "17:00");

  findMeetingTime.dispatch("click");
  assert.equal(clockValue(cityClocks.innerHTML, "Tokyo"), "18:00");
  assert.equal(clockValue(cityClocks.innerHTML, "Berlin"), "11:00");
  assert.match(meetingMessage.textContent, /Found the next hour/);
  assert.equal(meetingMessage.className, "meeting-status success");

  findMeetingTime.dispatch("click");
  assert.equal(clockValue(cityClocks.innerHTML, "Tokyo"), "19:00");
  assert.equal(clockValue(cityClocks.innerHTML, "Berlin"), "12:00");

  addClock.dispatch("click");
  assert.equal((cityClocks.innerHTML.match(/class="clock-card city-clock"/g) || []).length, 3);
  assert.equal((digitalClocks.innerHTML.match(/class="digital-clock"/g) || []).length, 3);
  assert.match(cityClocks.innerHTML, /Remove clock/);
  assert.equal(addClock.disabled, false);

  findMeetingTime.dispatch("click");
  assert.equal(meetingMessage.textContent, "No shared waking overlap for these cities.");
  assert.equal(meetingMessage.className, "meeting-status error");

  addClock.dispatch("click");
  assert.equal((cityClocks.innerHTML.match(/class="clock-card city-clock"/g) || []).length, 4);
  assert.equal(addClock.disabled, true);

  addClock.dispatch("click");
  assert.equal((cityClocks.innerHTML.match(/class="clock-card city-clock"/g) || []).length, 4);

  const thirdId = clockIds(cityClocks.innerHTML)[2];
  cityClocks.dispatch("click", {
    target: {
      dataset: { action: "remove", clockId: thirdId },
    },
  });
  assert.equal((cityClocks.innerHTML.match(/class="clock-card city-clock"/g) || []).length, 3);
  assert.equal(addClock.disabled, false);
}

function contentType(pathname) {
  switch (extname(pathname)) {
    case ".css":
      return "text/css";
    case ".js":
      return "text/javascript";
    case ".html":
    default:
      return "text/html";
  }
}

async function smokeHttpServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const name = basename(url.pathname === "/" ? "index.html" : url.pathname);
    const allowed = new Set(["index.html", "timezone.html", "styles.css", "script.js", "timezone.js"]);

    if (!allowed.has(name)) {
      response.writeHead(404);
      response.end("not found");
      return;
    }

    const body = await readFile(join(root, name));
    response.writeHead(200, { "content-type": contentType(name) });
    response.end(body);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    for (const path of ["/", "/timezone.html", "/styles.css", "/script.js", "/timezone.js"]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(response.status, 200, `${path} should load`);
      const text = await response.text();
      assert.ok(text.length > 100, `${path} should not be empty`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

await smokeStaticFiles();
await smokeRenderHarness();
await smokeTimezoneHarness();
await smokeHttpServer();

console.log("smoke: ok");
