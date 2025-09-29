"use strict";
(() => {
  // dist/translate_message_tempalte-chunk.js
  var m = Object.defineProperty;
  var f = (n, t, s) => t in n ? m(n, t, { enumerable: true, configurable: true, writable: true, value: s }) : n[t] = s;
  var l = (n, t, s) => f(n, typeof t != "symbol" ? t + "" : t, s);
  function g(n) {
    if (!n) return false;
    const t = n instanceof Headers ? n.get("content-type") : n["content-type"] ?? n["Content-Type"];
    return !!t && t.includes("application/json");
  }
  var k = class {
    constructor(t, s, e = {}) {
      l(this, "url");
      l(this, "opts");
      l(this, "callbacks");
      l(this, "controller", null);
      l(this, "running", false);
      l(this, "attempts", 0);
      this.url = t, this.opts = { model: s.model, method: "POST", stream: s.stream, reconnect: { maxAttempts: 5, delayMs: 1e3, backoff: true }, headers: { Authorization: "Bearer sk-oasjdyyyitxddeyxxjwt", "Content-Type": "application/json" }, body: { messages: s.messages } }, this.callbacks = e;
    }
    async wait(t) {
      return new Promise((s) => setTimeout(s, t));
    }
    isRunning() {
      return this.running;
    }
    stop() {
      var t;
      (t = this.controller) == null || t.abort(), this.running = false;
    }
    async start() {
      var s, e, o, c;
      if (this.running) throw new Error("SSEPost already running");
      this.running = true, this.attempts = 0;
      const t = this.opts.reconnect;
      for (; this.running; ) try {
        this.attempts++, await this.openOnce();
        break;
      } catch (i) {
        if ((e = (s = this.callbacks).onError) == null || e.call(s, i), !this.running) break;
        if (this.attempts >= (t.maxAttempts ?? 0)) {
          this.running = false;
          break;
        }
        const h = t.delayMs ?? 1e3, r = t.backoff ? h * Math.pow(2, this.attempts - 1) : h;
        await this.wait(r);
      }
      (c = (o = this.callbacks).onClose) == null || c.call(o), this.running = false;
    }
    async openOnce() {
      var c, i, h, r;
      this.controller = new AbortController();
      const t = this.opts.signal;
      t && (t.aborted ? this.controller.abort() : t.addEventListener("abort", () => {
        var a;
        return (a = this.controller) == null ? void 0 : a.abort();
      }, { once: true }));
      const s = new Headers(this.opts.headers);
      let e;
      if (this.opts.body != null) {
        if (typeof this.opts.body == "object" && !(this.opts.body instanceof FormData)) {
          if (this.opts.model) this.opts.body.model = this.opts.model;
          else throw new Error("Request failed: no model specified. Please provide a valid 'model' parameter before making a request.");
          this.opts.body.stream === void 0 ? this.opts.body = { ...this.opts.body, stream: this.opts.stream ?? true } : this.opts.body.stream = this.opts.stream ?? true;
        }
        g(this.opts.headers) ? e = JSON.stringify(this.opts.body) : typeof this.opts.body == "string" || this.opts.body instanceof FormData ? e = this.opts.body : (s.set("Content-Type", "application/json"), e = JSON.stringify(this.opts.body));
      }
      console.log("bodyToSend: ", e);
      const o = await fetch(this.url, { method: this.opts.method, headers: s, body: e, signal: this.controller.signal });
      if (!o.ok) {
        const a = await y(o);
        throw new Error(`SSE POST failed: ${o.status} ${o.statusText} - ${a}`);
      }
      if ((i = (c = this.callbacks).onOpen) == null || i.call(c, o), !this.opts.stream) {
        const a = await o.text();
        (r = (h = this.callbacks).onEvent) == null || r.call(h, { data: a });
        return;
      }
      o.body && await this.readStream(o.body.getReader());
    }
    async readStream(t) {
      const s = new TextDecoder("utf-8");
      let e = "";
      const o = this.opts.chunkDelimiter ?? `

`, c = (i) => {
        var r, a;
        const h = i.split(o);
        for (let p of h) {
          if (p = p.trim(), !p) continue;
          const u = this.parseEvent(p);
          u && ((a = (r = this.callbacks).onEvent) == null || a.call(r, u));
        }
      };
      try {
        for (; ; ) {
          const { value: i, done: h } = await t.read();
          if (h) break;
          e += s.decode(i, { stream: true });
          const r = e.split(o);
          for (let a = 0; a < r.length - 1; a++) {
            const p = r[a];
            c(p + o);
          }
          e = r[r.length - 1];
        }
        e.trim() && c(e);
      } catch (i) {
        if (i.name === "AbortError") return;
        throw i;
      }
    }
    parseEvent(t) {
      const s = t.split(/\r?\n/);
      let e = [], o;
      console.log("lines: ", s);
      for (const i of s) i.startsWith("id:") ? o = i.slice(3).trim() : i.startsWith("data:") && e.push(i.slice(5).replace(/^\s?/, ""));
      if (e.length === 0) return null;
      const c = e.join(`
`);
      return { id: o, data: c };
    }
  };
  async function y(n) {
    try {
      return await n.text();
    } catch {
      return "<no body>";
    }
  }
  var x = class {
    constructor(t, s, e) {
      l(this, "model");
      l(this, "template");
      l(this, "stream");
      this.model = t, this.template = s, this.stream = e;
    }
    getPrompt(t) {
      return { model: this.model, temperature: 0, messages: this.template.getMessages(t), stream: this.stream };
    }
  };
  function b(n, t) {
    const s = [d.identity, "RULES:", ...d.instructions.map((e) => (e = e.replace("${target_language}", n), e = e.replace("${single_word_output_template}", JSON.stringify(S, null, 2)), e = e.replace("${sentence_or_phrase_output_template}", JSON.stringify(T, null, 2)), e))];
    return t && (s.push("CONTEXT:"), s.push(t)), s.join(` 
`);
  }
  function w(n) {
    return JSON.stringify({ "\u3010Content to Translate\u3011": n }, null, 2);
  }
  var E = class {
    constructor(t) {
      l(this, "targetLanguage");
      this.targetLanguage = t;
    }
    getMessages(t, s) {
      return [{ role: "system", content: b(this.targetLanguage, s) }, { role: "user", content: w(t) }];
    }
  };
  var d = { identity: "You are a professional multilingual translation engine.", instructions: ["For single words: provide translation, phonetics, definitions grouped by part of speech, and example sentences.", "For sentences/phrases: provide translation only.", "All responses must be in ${target_language}.", "For English, Use American phonetics for phonetic symbols.", "For Chinese, Use standard Pinyin for phonetic symbols (with tone marks)", "For other languages, use their native phonetic systems for phonetic symbols", "Do not output languages other than those requested", "Consider context when analyzing words.", "Output raw JSON without markdown code blocks.", "SINGLE WORD OUTPUT:", "${single_word_output_template}", "SENTENCE/PHRASE OUTPUT:", "${sentence_or_phrase_output_template}"] };
  var S = { translation: "translation in Simplified Chinese", phonetic: "/h\u0259\u02C8l\u0259\u028A/", definitions: [{ pos: "excl.", meaning: "Simplified Chinese translation for current pos", example: { source: "Hello, how are you today?", target: "Simplified Chinese example" } }], contextual_analysis: "contextual analysis use Simplified Chinese language" };
  var T = { translation: "translation in Simplified Chinese" };

  // dist/background.js
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ id: "addToEasyNote", title: "Add to EasyNote", contexts: ["selection"] });
  });
  chrome.contextMenus.onClicked.addListener((o, l2) => {
    if (o.menuItemId === "addToEasyNote" && o.selectionText) {
      console.log("Selected text:", o.selectionText);
      const t = new x("THUDM/glm-4-9b-chat", new E("Traditional Chinese (Taiwan) (\u7E41\u9AD4\u4E2D\u6587-\u53F0\u6E7E)"), false);
      console.log("prompt: ", t.getPrompt("Hello world!")), new k("https://api.siliconflow.cn/v1/chat/completions", t.getPrompt(o.selectionText), { onOpen: (e) => console.log("opened, status", e.status), onEvent: (e) => {
        console.log("SSE event:", e, "data:", e.data);
      }, onError: (e) => console.error("SSE error:", e), onClose: () => console.log("SSE closed") }).start().catch((e) => console.error("start failed:", e));
    }
  });
})();
