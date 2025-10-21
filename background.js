"use strict";
(() => {
  // dist/translate_message_tempalte-chunk.js
  var m = Object.defineProperty;
  var f = (n2, t2, s) => t2 in n2 ? m(n2, t2, { enumerable: true, configurable: true, writable: true, value: s }) : n2[t2] = s;
  var l = (n2, t2, s) => f(n2, typeof t2 != "symbol" ? t2 + "" : t2, s);
  function y(n2) {
    if (!n2) return false;
    const t2 = n2 instanceof Headers ? n2.get("content-type") : n2["content-type"] ?? n2["Content-Type"];
    return !!t2 && t2.includes("application/json");
  }
  var k = class {
    constructor(t2, s, e, a2 = {}) {
      l(this, "url");
      l(this, "opts");
      l(this, "callbacks");
      l(this, "controller", null);
      l(this, "running", false);
      l(this, "attempts", 0);
      this.url = t2, this.opts = { model: e.model, method: "POST", stream: e.stream, reconnect: { maxAttempts: 5, delayMs: 1e3, backoff: true }, headers: { Authorization: s, "Content-Type": "application/json" }, body: { messages: e.messages } }, this.callbacks = a2;
    }
    async wait(t2) {
      return new Promise((s) => setTimeout(s, t2));
    }
    isRunning() {
      return this.running;
    }
    stop() {
      var t2;
      (t2 = this.controller) == null || t2.abort(), this.running = false;
    }
    async start() {
      var s, e, a2, c;
      if (this.running) throw new Error("SSEPost already running");
      this.running = true, this.attempts = 0;
      const t2 = this.opts.reconnect;
      for (; this.running; ) try {
        this.attempts++, await this.openOnce();
        break;
      } catch (o2) {
        if ((e = (s = this.callbacks).onError) == null || e.call(s, o2), !this.running) break;
        if (this.attempts >= (t2.maxAttempts ?? 0)) {
          this.running = false;
          break;
        }
        const u = t2.delayMs ?? 1e3, i = t2.backoff ? u * Math.pow(2, this.attempts - 1) : u;
        await this.wait(i);
      }
      (c = (a2 = this.callbacks).onClose) == null || c.call(a2), this.running = false;
    }
    async openOnce() {
      var c, o2, u, i;
      this.controller = new AbortController();
      const t2 = this.opts.signal;
      t2 && (t2.aborted ? this.controller.abort() : t2.addEventListener("abort", () => {
        var r;
        return (r = this.controller) == null ? void 0 : r.abort();
      }, { once: true }));
      const s = new Headers(this.opts.headers);
      let e;
      if (this.opts.body != null) {
        if (typeof this.opts.body == "object" && !(this.opts.body instanceof FormData)) {
          if (this.opts.model) this.opts.body.model = this.opts.model;
          else throw new Error("Request failed: no model specified. Please provide a valid 'model' parameter before making a request.");
          this.opts.body.stream === void 0 ? this.opts.body = { ...this.opts.body, stream: this.opts.stream ?? true } : this.opts.body.stream = this.opts.stream ?? true;
        }
        y(this.opts.headers) ? e = JSON.stringify(this.opts.body) : typeof this.opts.body == "string" || this.opts.body instanceof FormData ? e = this.opts.body : (s.set("Content-Type", "application/json"), e = JSON.stringify(this.opts.body));
      }
      const a2 = await fetch(this.url, { method: this.opts.method, headers: s, body: e, signal: this.controller.signal });
      if (!a2.ok) {
        const r = await b(a2);
        throw new Error(`SSE POST failed: ${a2.status} ${a2.statusText} - ${r}`);
      }
      if ((o2 = (c = this.callbacks).onOpen) == null || o2.call(c, a2), !this.opts.stream) {
        const r = await a2.text();
        (i = (u = this.callbacks).onEvent) == null || i.call(u, { data: r });
        return;
      }
      a2.body && await this.readStream(a2.body.getReader());
    }
    async readStream(t2) {
      const s = new TextDecoder("utf-8");
      let e = "";
      const a2 = this.opts.chunkDelimiter ?? `

`, c = (o2) => {
        var i, r;
        const u = o2.split(a2);
        for (let p of u) {
          if (p = p.trim(), !p) continue;
          const h = this.parseEvent(p);
          h && ((r = (i = this.callbacks).onEvent) == null || r.call(i, h));
        }
      };
      try {
        for (; ; ) {
          const { value: o2, done: u } = await t2.read();
          if (u) break;
          e += s.decode(o2, { stream: true });
          const i = e.split(a2);
          for (let r = 0; r < i.length - 1; r++) {
            const p = i[r];
            c(p + a2);
          }
          e = i[i.length - 1];
        }
        e.trim() && c(e);
      } catch (o2) {
        if (o2.name === "AbortError") return;
        throw o2;
      }
    }
    parseEvent(t2) {
      const s = t2.split(/\r?\n/);
      let e = [], a2;
      for (const o2 of s) o2.startsWith("id:") ? a2 = o2.slice(3).trim() : o2.startsWith("data:") && e.push(o2.slice(5).replace(/^\s?/, ""));
      if (e.length === 0) return null;
      const c = e.join(`
`);
      return { id: a2, data: c };
    }
  };
  async function b(n2) {
    try {
      return await n2.text();
    } catch {
      return "<no body>";
    }
  }
  var C = class {
    constructor(t2, s, e) {
      l(this, "model");
      l(this, "template");
      l(this, "stream");
      this.model = t2, this.template = s, this.stream = e;
    }
    getPrompt(t2) {
      return { model: this.model, temperature: 0, messages: this.template.getMessages(t2), stream: this.stream };
    }
  };
  function d(n2, t2) {
    return JSON.stringify(n2, null, 2).replace(/\$\{target_language\}/g, t2);
  }
  function w(n2, t2) {
    const s = [g.identity, "RULES:", ...g.instructions.map((e) => (e = e.replace("${single_word_output_template}", d(T, n2)), e = e.replace("${sentence_or_phrase_output_template}", d(S, n2)), e = e.replace("${target_language}", n2), e))];
    return t2 && (s.push("CONTEXT:"), s.push(t2)), s.join(` 
`);
  }
  function _(n2) {
    return x.replace("${content_to_translate}", n2);
  }
  var O = class {
    constructor(t2) {
      l(this, "targetLanguage");
      this.targetLanguage = t2;
    }
    getMessages(t2, s) {
      return [{ role: "system", content: w(this.targetLanguage, s) }, { role: "user", content: _(t2) }];
    }
  };
  var g = { identity: "You are a professional multilingual translation engine.", instructions: ["1. For single words: provide translation, phonetics, definitions grouped by part of speech, and example sentences.", "2. For sentences/phrases (i.e., multi-word expressions or sentences containing spaces, punctuation, or more than one word in the detected language): provide translation only.", "3. All responses must be in ${target_language}.", "4. For English source text, use American phonetics for phonetic symbols.", "5. For Chinese source text, use standard Pinyin with tone marks for phonetic symbols.", "6. For other source languages, use their native phonetic systems for phonetic symbols.", "7. Do not output languages other than those requested", "8. Consider context when analyzing words.", "9. Output raw JSON without markdown code blocks.", "10. Ensure all textual content (translations, definitions, examples, etc.) is written strictly in the explicitly specified target language.", "11. For languages such as Chinese, Japanese, Korean, or Thai \u2014 where a single semantic word may consist of multiple characters \u2014 treat any input that represents one semantic unit (i.e., conveys a single idea or concept) as a single word, and follow Rule 1.", "SINGLE WORD OUTPUT:", "${single_word_output_template}", "SENTENCE/PHRASE OUTPUT:", "${sentence_or_phrase_output_template}"] };
  var T = { detected_language: "en-US", translation: "translation in ${target_language}", phonetic: "/h\u0259\u02C8l\u0259\u028A/", definitions: [{ pos: "excl.", meaning: "${target_language} translation for current pos", example: { source: "A natural example sentence written in source language, accurately showing this sense of the word.", target: "The same example translated into ${target_language}." } }], contextual_analysis: "contextual analysis in ${target_language}" };
  var S = { detected_language: "en-US", translation: "translation in ${target_language}" };
  var x = '\u3010Content to Translate\u3011: "${content_to_translate}"';

  // dist/settings-chunk.js
  var a = { auto: { text: "Auto", name: "Auto Detect", code: "auto" }, "zh-CN": { text: "\u7B80\u4F53\u4E2D\u6587", name: "Chinese (Simplified)", code: "zh-CN" }, "zh-TW": { text: "\u7E41\u9AD4\u4E2D\u6587 (\u53F0\u6E7E)", name: "Chinese (Traditional, Taiwan)", code: "zh-TW" }, "zh-HK": { text: "\u7E41\u9AD4\u4E2D\u6587 (\u9999\u6E2F)", name: "Chinese (Traditional, Hong Kong)", code: "zh-HK" }, "en-US": { text: "English (US)", name: "English (US)", code: "en-US" }, "en-GB": { text: "English (UK)", name: "English (UK)", code: "en-GB" }, ja: { text: "\u65E5\u672C\u8A9E", name: "Japanese", code: "ja" }, ko: { text: "\uD55C\uAD6D\uC5B4", name: "Korean", code: "ko" }, es: { text: "Espa\xF1ol", name: "Spanish", code: "es" }, de: { text: "Deutsch", name: "German", code: "de" }, fr: { text: "Fran\xE7ais", name: "French", code: "fr" }, pt: { text: "Portugu\xEAs", name: "Portuguese", code: "pt" }, "pt-BR": { text: "Portugu\xEAs (Brasil)", name: "Portuguese (Brazil)", code: "pt-BR" }, ru: { text: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", name: "Russian", code: "ru" }, yue: { text: "\u7CB5\u8A9E", name: "Cantonese", code: "yue" }, "zh-CN-NE": { text: "\u6771\u5317\u5B98\u8A71", name: "Northeastern Mandarin", code: "zh-CN-NE" }, wyw: { text: "\u6587\u8A00\u6587", name: "Classical Chinese", code: "wyw" }, ar: { text: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", name: "Arabic", code: "ar" }, af: { text: "Afrikaans", name: "Afrikaans", code: "af" }, sq: { text: "Shqip", name: "Albanian", code: "sq" }, am: { text: "\u12A0\u121B\u122D\u129B", name: "Amharic", code: "am" }, hy: { text: "\u0540\u0561\u0575\u0565\u0580\u0565\u0576", name: "Armenian", code: "hy" }, az: { text: "Az\u0259rbaycanca", name: "Azerbaijani", code: "az" }, eu: { text: "Euskara", name: "Basque", code: "eu" }, be: { text: "\u0411\u0435\u043B\u0430\u0440\u0443\u0441\u043A\u0430\u044F", name: "Belarusian", code: "be" }, bn: { text: "\u09AC\u09BE\u0982\u09B2\u09BE", name: "Bengali", code: "bn" }, bs: { text: "Bosanski", name: "Bosnian", code: "bs" }, bg: { text: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438", name: "Bulgarian", code: "bg" }, my: { text: "\u1019\u103C\u1014\u103A\u1019\u102C\u1005\u102C", name: "Burmese", code: "my" }, ca: { text: "Catal\xE0", name: "Catalan", code: "ca" }, ceb: { text: "Binisaya", name: "Cebuano", code: "ceb" }, co: { text: "Corsu", name: "Corsican", code: "co" }, hr: { text: "Hrvatski", name: "Croatian", code: "hr" }, cs: { text: "\u010Ce\u0161tina", name: "Czech", code: "cs" }, da: { text: "Dansk", name: "Danish", code: "da" }, nl: { text: "Nederlands", name: "Dutch", code: "nl" }, eo: { text: "Esperanto", name: "Esperanto", code: "eo" }, et: { text: "Eesti", name: "Estonian", code: "et" }, fj: { text: "Na Vosa Vakaviti", name: "Fijian", code: "fj" }, fil: { text: "Filipino", name: "Filipino", code: "fil" }, fi: { text: "Suomi", name: "Finnish", code: "fi" }, fy: { text: "Frysk", name: "Frisian", code: "fy" }, gl: { text: "Galego", name: "Galician", code: "gl" }, ka: { text: "\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8", name: "Georgian", code: "ka" }, el: { text: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC", name: "Greek", code: "el" }, gu: { text: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", name: "Gujarati", code: "gu" }, ht: { text: "Krey\xF2l Ayisyen", name: "Haitian Creole", code: "ht" }, ha: { text: "Hausa", name: "Hausa", code: "ha" }, haw: { text: "\u02BB\u014Clelo Hawai\u02BBi", name: "Hawaiian", code: "haw" }, he: { text: "\u05E2\u05D1\u05E8\u05D9\u05EA", name: "Hebrew", code: "he" }, hi: { text: "\u0939\u093F\u0928\u094D\u0926\u0940", name: "Hindi", code: "hi" }, hmn: { text: "Hmong", name: "Hmong", code: "hmn" }, hu: { text: "Magyar", name: "Hungarian", code: "hu" }, is: { text: "\xCDslenska", name: "Icelandic", code: "is" }, ig: { text: "As\u1EE5s\u1EE5 Igbo", name: "Igbo", code: "ig" }, id: { text: "Bahasa Indonesia", name: "Indonesian", code: "id" }, ga: { text: "Gaeilge", name: "Irish", code: "ga" }, it: { text: "Italiano", name: "Italian", code: "it" }, jw: { text: "Basa Jawa", name: "Javanese", code: "jw" }, kn: { text: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1", name: "Kannada", code: "kn" }, kk: { text: "\u049A\u0430\u0437\u0430\u049B \u0422\u0456\u043B\u0456", name: "Kazakh", code: "kk" }, km: { text: "\u1797\u17B6\u179F\u17B6\u1781\u17D2\u1798\u17C2\u179A", name: "Khmer", code: "km" }, ku: { text: "Kurd\xEE", name: "Kurdish", code: "ku" }, ky: { text: "\u041A\u044B\u0440\u0433\u044B\u0437\u0447\u0430", name: "Kyrgyz", code: "ky" }, lo: { text: "\u0EA5\u0EB2\u0EA7", name: "Lao", code: "lo" }, la: { text: "Latina", name: "Latin", code: "la" }, lv: { text: "Latvie\u0161u", name: "Latvian", code: "lv" }, lt: { text: "Lietuvi\u0173", name: "Lithuanian", code: "lt" }, lb: { text: "L\xEBtzebuergesch", name: "Luxembourgish", code: "lb" }, mk: { text: "\u041C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438", name: "Macedonian", code: "mk" }, mg: { text: "Malagasy", name: "Malagasy", code: "mg" }, ms: { text: "Bahasa Melayu", name: "Malay", code: "ms" }, ml: { text: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", name: "Malayalam", code: "ml" }, mt: { text: "Malti", name: "Maltese", code: "mt" }, mi: { text: "M\u0101ori", name: "Maori", code: "mi" }, mr: { text: "\u092E\u0930\u093E\u0920\u0940", name: "Marathi", code: "mr" }, mn: { text: "\u041C\u043E\u043D\u0433\u043E\u043B", name: "Mongolian", code: "mn" }, no: { text: "Norsk", name: "Norwegian", code: "no" }, ps: { text: "\u067E\u069A\u062A\u0648", name: "Pashto", code: "ps" }, fa: { text: "\u0641\u0627\u0631\u0633\u06CC", name: "Persian", code: "fa" }, pl: { text: "Polski", name: "Polish", code: "pl" }, pa: { text: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", name: "Punjabi", code: "pa" }, "ur-roman": { text: "Roman Urdu", name: "Roman Urdu", code: "ur-roman" }, ro: { text: "Rom\xE2n\u0103", name: "Romanian", code: "ro" }, sm: { text: "Gagana Samoa", name: "Samoan", code: "sm" }, sa: { text: "\u0938\u0902\u0938\u094D\u0915\u0943\u0924\u092E\u094D", name: "Sanskrit", code: "sa" }, gd: { text: "G\xE0idhlig", name: "Scottish Gaelic", code: "gd" }, sr: { text: "\u0421\u0440\u043F\u0441\u043A\u0438", name: "Serbian", code: "sr" }, "sr-Cyrl": { text: "\u0421\u0440\u043F\u0441\u043A\u0438 (\u040B\u0438\u0440\u0438\u043B\u0438\u0446\u0430)", name: "Serbian (Cyrillic)", code: "sr-Cyrl" }, "sr-Latn": { text: "Srpski (Latinica)", name: "Serbian (Latin)", code: "sr-Latn" }, st: { text: "Sesotho", name: "Sesotho", code: "st" }, sn: { text: "ChiShona", name: "Shona", code: "sn" }, si: { text: "\u0DC3\u0DD2\u0D82\u0DC4\u0DBD", name: "Sinhala", code: "si" }, sk: { text: "Sloven\u010Dina", name: "Slovak", code: "sk" }, sl: { text: "Sloven\u0161\u010Dina", name: "Slovenian", code: "sl" }, so: { text: "Soomaali", name: "Somali", code: "so" }, su: { text: "Basa Sunda", name: "Sundanese", code: "su" }, sw: { text: "Kiswahili", name: "Swahili", code: "sw" }, sv: { text: "Svenska", name: "Swedish", code: "sv" }, tg: { text: "\u0422\u043E\u04B7\u0438\u043A\u04E3", name: "Tajik", code: "tg" }, ta: { text: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", name: "Tamil", code: "ta" }, te: { text: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", name: "Telugu", code: "te" }, th: { text: "\u0E44\u0E17\u0E22", name: "Thai", code: "th" }, bo: { text: "\u0F56\u0F7C\u0F51\u0F0B\u0F61\u0F72\u0F42", name: "Tibetan", code: "bo" }, tr: { text: "T\xFCrk\xE7e", name: "Turkish", code: "tr" }, uk: { text: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", name: "Ukrainian", code: "uk" }, ur: { text: "\u0627\u0631\u062F\u0648", name: "Urdu", code: "ur" }, ug: { text: "\u0626\u06C7\u064A\u063A\u06C7\u0631\u0686\u06D5", name: "Uyghur", code: "ug" }, uz: { text: "O\u02BBzbek", name: "Uzbek", code: "uz" }, vi: { text: "Ti\u1EBFng Vi\u1EC7t", name: "Vietnamese", code: "vi" }, cy: { text: "Cymraeg", name: "Welsh", code: "cy" }, xh: { text: "isiXhosa", name: "Xhosa", code: "xh" }, yi: { text: "\u05D9\u05D9\u05B4\u05D3\u05D9\u05E9", name: "Yiddish", code: "yi" }, yo: { text: "\xC8d\xE8 Yor\xF9b\xE1", name: "Yoruba", code: "yo" }, zu: { text: "isiZulu", name: "Zulu", code: "zu" } };
  var t = ((e) => (e[e.Text = 0] = "Text", e[e.Translation = 1] = "Translation", e[e.Both = 2] = "Both", e))(t || {});
  var n = ((e) => (e[e.BasicTranslation = 0] = "BasicTranslation", e[e.AiTranslation = 1] = "AiTranslation", e))(n || {});
  var o = { defaultTargetLanguage: a["en-GB"], defaultUiLanguage: a["en-GB"], readAloudWhileTranslating: true, readAloudTranslationContent: true };

  // dist/background.js
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ id: "addToEasyNote", title: "Add to EasyNote", contexts: ["selection"] });
  });
  chrome.contextMenus.onClicked.addListener((t2, l2) => {
    if (t2.menuItemId === "addToEasyNote" && t2.selectionText) {
      const o2 = new C("glm-4-flash-250414", new O(o.defaultTargetLanguage.name), false);
      new k("https://open.bigmodel.cn/api/paas/v4/chat/completions", "Bearer f1987d86479f430491bb5210379b814f.Jh99XCkw0kS7tLiN", o2.getPrompt(t2.selectionText), { onOpen: (e) => console.log("opened, status", e.status), onEvent: (e) => {
        console.log("SSE event:", e, "data:", e.data);
      }, onError: (e) => console.error("SSE error:", e), onClose: () => console.log("SSE closed") }).start().catch((e) => console.error("start failed:", e));
    }
  });
})();
