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

  dispatch(type) {
    this.listeners.get(type)?.({ target: this });
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
    "#leftCitySearch",
    "#rightCitySearch",
    "#leftTimeInput",
    "#rightTimeInput",
    '[data-title="left"]',
    '[data-title="right"]',
    '[data-subtitle="left"]',
    '[data-subtitle="right"]',
    '[data-time-label="left"]',
    '[data-time-label="right"]',
    '[data-value="left"]',
    '[data-value="right"]',
    '[data-face="left"]',
    '[data-face="right"]',
    "#cityOptions",
    "#matchStamp",
    "#useCurrentTime",
    "[data-step-hours]",
  ];

  selectors.forEach((selector) => {
    elements.set(selector, new FakeElement(selector));
  });

  const stepButtons = [
    new FakeElement('[data-step-slot="left"][data-step-hours="-1"]'),
    new FakeElement('[data-step-slot="left"][data-step-hours="1"]'),
    new FakeElement('[data-step-slot="right"][data-step-hours="-1"]'),
    new FakeElement('[data-step-slot="right"][data-step-hours="1"]'),
  ];
  stepButtons.forEach((button, index) => {
    button.dataset.stepHours = index % 2 === 0 ? "-1" : "1";
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
        querySelectorAll(selector) {
          if (selector === "[data-step-hours]") return stepButtons;
          assert.fail(`unexpected selector: ${selector}`);
        },
      },
    },
    elements,
    stepButtons,
  };
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
  assert.match(timezoneHtml, /list="cityOptions"/);
  assert.match(timezoneHtml, /Search 50 major cities/);
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

  const leftSearch = harness.elements.get("#leftCitySearch");
  const rightSearch = harness.elements.get("#rightCitySearch");
  const leftInput = harness.elements.get("#leftTimeInput");
  const rightInput = harness.elements.get("#rightTimeInput");
  const leftValue = harness.elements.get('[data-value="left"]');
  const rightValue = harness.elements.get('[data-value="right"]');
  const leftTitle = harness.elements.get('[data-title="left"]');
  const rightTitle = harness.elements.get('[data-title="right"]');
  const leftFace = harness.elements.get('[data-face="left"]');
  const rightFace = harness.elements.get('[data-face="right"]');
  const cityOptions = harness.elements.get("#cityOptions");
  const rightPlusHour = harness.stepButtons[3];

  assert.match(leftInput.value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.match(rightInput.value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(leftSearch.value, "Albuquerque, United States");
  assert.equal(rightSearch.value, "Berlin, Germany");
  assert.equal(leftTitle.textContent, "Albuquerque");
  assert.equal(rightTitle.textContent, "Berlin");
  assert.match(leftValue.textContent, /^\d{2}:\d{2}$/);
  assert.match(rightValue.textContent, /^\d{2}:\d{2}$/);
  assert.match(leftFace.innerHTML, /<svg class="clock-face"/);
  assert.match(rightFace.innerHTML, /<svg class="clock-face"/);
  assert.equal((cityOptions.innerHTML.match(/<option /g) || []).length, 50);

  leftInput.value = "2026-05-17T12:00";
  leftInput.dispatch("change");
  assert.equal(leftValue.textContent, "12:00");
  assert.equal(rightValue.textContent, "20:00");

  rightInput.value = "2026-05-17T09:30";
  rightInput.dispatch("change");
  assert.equal(rightValue.textContent, "09:30");
  assert.equal(leftValue.textContent, "01:30");

  rightPlusHour.dispatch("click");
  assert.equal(rightValue.textContent, "10:30");
  assert.equal(leftValue.textContent, "02:30");

  leftSearch.value = "Tokyo, Japan";
  leftSearch.dispatch("change");
  assert.equal(leftTitle.textContent, "Tokyo");
  assert.equal(leftValue.textContent, "17:30");
  assert.equal(rightValue.textContent, "10:30");
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
