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

async function smokeStaticFiles() {
  const html = await readFile(join(root, "index.html"), "utf8");
  const css = await readFile(join(root, "styles.css"), "utf8");
  const js = await readFile(join(root, "script.js"), "utf8");

  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script src="script\.js"><\/script>/);
  assert.match(css, /\.clock-face/);
  assert.match(css, /\.hand-coarse/);
  assert.match(js, /setInterval\(render, 1000\)/);
}

async function smokeRenderHarness() {
  const script = await readFile(join(root, "script.js"), "utf8");
  const harness = createHarness();
  vm.createContext(harness.context);
  vm.runInContext(script, harness.context, { filename: "script.js" });

  const calendar = harness.elements.get("#calendarClocks");
  const personal = harness.elements.get("#personalClocks");
  const nowStamp = harness.elements.get("#nowStamp");
  const year = harness.elements.get("#birthYear");
  const month = harness.elements.get("#birthMonth");
  const day = harness.elements.get("#birthDay");
  const message = harness.elements.get("#birthdayMessage");

  assert.equal((calendar.innerHTML.match(/class="clock-card"/g) || []).length, 4);
  assert.equal((personal.innerHTML.match(/class="clock-card"/g) || []).length, 2);
  assert.equal((calendar.innerHTML.match(/<svg class="clock-face"/g) || []).length, 4);
  assert.equal((personal.innerHTML.match(/<svg class="clock-face"/g) || []).length, 2);
  assert.match(calendar.innerHTML, /Day/);
  assert.match(calendar.innerHTML, /Second/);
  assert.match(personal.innerHTML, /Lifetime Century/);
  assert.match(personal.innerHTML, /Personal Year/);
  assert.match(nowStamp.textContent, /\d/);
  assert.ok(nowStamp.dateTime);
  assert.ok(year.children.length >= 100);
  assert.equal(month.children.length, 12);
  assert.ok(day.children.length >= 28);
  assert.match(message.textContent, /Birthday saved:/);
  assert.match(harness.localStorage.get("clocks.birthdate"), /^\d{4}-\d{2}-\d{2}$/);
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
    const allowed = new Set(["index.html", "styles.css", "script.js"]);

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
    for (const path of ["/", "/styles.css", "/script.js"]) {
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
await smokeHttpServer();

console.log("smoke: ok");
