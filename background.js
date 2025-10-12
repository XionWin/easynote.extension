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
    constructor(t, s, e, o = {}) {
      l(this, "url");
      l(this, "opts");
      l(this, "callbacks");
      l(this, "controller", null);
      l(this, "running", false);
      l(this, "attempts", 0);
      this.url = t, this.opts = { model: e.model, method: "POST", stream: e.stream, reconnect: { maxAttempts: 5, delayMs: 1e3, backoff: true }, headers: { Authorization: s, "Content-Type": "application/json" }, body: { messages: e.messages } }, this.callbacks = o;
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
      } catch (a) {
        if ((e = (s = this.callbacks).onError) == null || e.call(s, a), !this.running) break;
        if (this.attempts >= (t.maxAttempts ?? 0)) {
          this.running = false;
          break;
        }
        const p = t.delayMs ?? 1e3, i = t.backoff ? p * Math.pow(2, this.attempts - 1) : p;
        await this.wait(i);
      }
      (c = (o = this.callbacks).onClose) == null || c.call(o), this.running = false;
    }
    async openOnce() {
      var c, a, p, i;
      this.controller = new AbortController();
      const t = this.opts.signal;
      t && (t.aborted ? this.controller.abort() : t.addEventListener("abort", () => {
        var r2;
        return (r2 = this.controller) == null ? void 0 : r2.abort();
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
      const o = await fetch(this.url, { method: this.opts.method, headers: s, body: e, signal: this.controller.signal });
      if (!o.ok) {
        const r2 = await y(o);
        throw new Error(`SSE POST failed: ${o.status} ${o.statusText} - ${r2}`);
      }
      if ((a = (c = this.callbacks).onOpen) == null || a.call(c, o), !this.opts.stream) {
        const r2 = await o.text();
        (i = (p = this.callbacks).onEvent) == null || i.call(p, { data: r2 });
        return;
      }
      o.body && await this.readStream(o.body.getReader());
    }
    async readStream(t) {
      const s = new TextDecoder("utf-8");
      let e = "";
      const o = this.opts.chunkDelimiter ?? `

`, c = (a) => {
        var i, r2;
        const p = a.split(o);
        for (let h of p) {
          if (h = h.trim(), !h) continue;
          const u = this.parseEvent(h);
          u && ((r2 = (i = this.callbacks).onEvent) == null || r2.call(i, u));
        }
      };
      try {
        for (; ; ) {
          const { value: a, done: p } = await t.read();
          if (p) break;
          e += s.decode(a, { stream: true });
          const i = e.split(o);
          for (let r2 = 0; r2 < i.length - 1; r2++) {
            const h = i[r2];
            c(h + o);
          }
          e = i[i.length - 1];
        }
        e.trim() && c(e);
      } catch (a) {
        if (a.name === "AbortError") return;
        throw a;
      }
    }
    parseEvent(t) {
      const s = t.split(/\r?\n/);
      let e = [], o;
      for (const a of s) a.startsWith("id:") ? o = a.slice(3).trim() : a.startsWith("data:") && e.push(a.slice(5).replace(/^\s?/, ""));
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
  var E = class {
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
    return C.replace("${content_to_translate}", n);
  }
  var O = class {
    constructor(t) {
      l(this, "targetLanguage");
      this.targetLanguage = t;
    }
    getMessages(t, s) {
      return [{ role: "system", content: b(this.targetLanguage, s) }, { role: "user", content: w(t) }];
    }
  };
  var d = { identity: "You are a professional multilingual translation engine.", instructions: ["1. For single words: provide translation, phonetics, definitions grouped by part of speech, and example sentences.", "2. For sentences/phrases: provide translation only.", "3. All responses must be in ${target_language}.", "4. For English, Use American phonetics for phonetic symbols.", "5. For Chinese, Use standard Pinyin for phonetic symbols (with tone marks)", "6. For other languages, use their native phonetic systems for phonetic symbols", "7. Do not output languages other than those requested", "8. Consider context when analyzing words.", "9. Output raw JSON without markdown code blocks.", "SINGLE WORD OUTPUT:", "${single_word_output_template}", "SENTENCE/PHRASE OUTPUT:", "${sentence_or_phrase_output_template}"] };
  var S = { detected_language: "en-US", translation: "translation in Simplified Chinese", phonetic: "/h\u0259\u02C8l\u0259\u028A/", definitions: [{ pos: "excl.", meaning: "Simplified Chinese translation for current pos", example: { source: "Hello, how are you today?", target: "Simplified Chinese example" } }], contextual_analysis: "contextual analysis use Simplified Chinese language" };
  var T = { detected_language: "en-US", translation: "translation in Simplified Chinese" };
  var C = '\u3010Content to Translate\u3011: "${content_to_translate}"';

  // dist/background.js
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ id: "addToEasyNote", title: "Add to EasyNote", contexts: ["selection"] });
  });
  var r = "Simplified Chinese (\u7B80\u4F53\u4E2D\u6587)";
  chrome.contextMenus.onClicked.addListener((t, l2) => {
    if (t.menuItemId === "addToEasyNote" && t.selectionText) {
      const o = new E("glm-4-flash-250414", new O(r), false);
      new k("https://open.bigmodel.cn/api/paas/v4/chat/completions", "Bearer f1987d86479f430491bb5210379b814f.Jh99XCkw0kS7tLiN", o.getPrompt(t.selectionText), { onOpen: (e) => console.log("opened, status", e.status), onEvent: (e) => {
        console.log("SSE event:", e, "data:", e.data);
      }, onError: (e) => console.error("SSE error:", e), onClose: () => console.log("SSE closed") }).start().catch((e) => console.error("start failed:", e));
    }
  });
})();
