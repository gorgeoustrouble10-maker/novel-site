(function () {
  "use strict";

  var BOOK = window.BOOK || { title: "小说", chapters: [] };
  var chapters = BOOK.chapters || [];
  var CRYPTO = BOOK.crypto || null;
  var PRICE = BOOK.price || "";
  var FREE = BOOK.freeChapters || 0;
  var READ_SPEED = 400; // 字/分钟，用于估算剩余阅读时间

  var app = document.getElementById("app");
  var headerTitle = document.getElementById("header-title");
  var footerMeta = document.getElementById("footer-meta");
  var searchInput = document.getElementById("search-input");
  var progressBar = document.getElementById("progress-bar");
  var toTopBtn = document.getElementById("to-top");

  headerTitle.textContent = BOOK.title;
  document.title = BOOK.title;
  footerMeta.textContent =
    "共 " + (BOOK.totalChapters || chapters.length) + " 章 · 约 " +
    (BOOK.totalChars || 0).toLocaleString() + " 字 · 纯静态阅读站";

  var BOOK_BLURB =
    "末世降临前三十天，苏荣又一次从噩梦中醒来。前三十五次轮回里，她嘶吼、囤货、逼妈妈相信末日将至，把最亲的人越推越远。" +
    "这一次，她不再喊「信我」——凌晨四点走进晏记早餐店，系上围裙，用从未有过的耐心陪在妈妈身边。" +
    "病毒爆发，城市沦陷，苏晏觉醒了水系异能，从讨好型弱者成长为能谈条件、能控场、能并肩作战的人。" +
    "而苏荣终于明白：她要做的不是把妈妈护在身后，而是和她一起，好好活着。" +
    "这是一部关于重生、末世与母女和解的故事。当世界崩塌，真正能让人走下去的，从来不是绝对的掌控，而是并肩同行的底气。";

  /* ============================================================
     本地存储：阅读偏好 / 进度 / 书签笔记 / 解锁
     ============================================================ */
  var PREFS_KEY = "novel_prefs_v1";
  var PROG_KEY = "novel_progress_v1";
  var MARKS_KEY = "novel_marks_v1";
  var UNLOCK_KEY = "novel_unlock_v1";

  function readJSON(key, fallback) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* -------------------- 阅读进度 -------------------- */
  var progress = readJSON(PROG_KEY, { last: null, ch: {} });
  function saveProgress() { writeJSON(PROG_KEY, progress); }
  function setChapterPos(id, p, done) {
    var cur = progress.ch[id] || { p: 0, done: false };
    cur.p = p;
    if (done) cur.done = true;
    progress.ch[id] = cur;
    progress.last = { id: id, p: p };
    saveProgress();
  }

  /* -------------------- 书签 / 笔记 -------------------- */
  var marks = readJSON(MARKS_KEY, { bm: [], notes: [] });
  if (!marks.bm) marks.bm = [];
  if (!marks.notes) marks.notes = [];
  function saveMarks() { writeJSON(MARKS_KEY, marks); }
  function snip(text, n) { n = n || 80; return text.length > n ? text.slice(0, n) + "…" : text; }

  function findBm(ch, i) {
    for (var k = 0; k < marks.bm.length; k++) if (marks.bm[k].ch === ch && marks.bm[k].i === i) return k;
    return -1;
  }
  function isBookmarked(ch, i) { return findBm(ch, i) !== -1; }
  function toggleBookmark(ch, i, text) {
    var k = findBm(ch, i);
    if (k !== -1) { marks.bm.splice(k, 1); saveMarks(); return false; }
    marks.bm.push({ ch: ch, i: i, text: snip(text), t: Date.now() });
    saveMarks(); return true;
  }
  function findNote(ch, i) {
    for (var k = 0; k < marks.notes.length; k++) if (marks.notes[k].ch === ch && marks.notes[k].i === i) return k;
    return -1;
  }
  function getNote(ch, i) { var k = findNote(ch, i); return k === -1 ? null : marks.notes[k]; }
  function setNote(ch, i, text, note) {
    var k = findNote(ch, i);
    if (!note) { if (k !== -1) { marks.notes.splice(k, 1); saveMarks(); } return; }
    if (k === -1) marks.notes.push({ ch: ch, i: i, text: snip(text), note: note, t: Date.now() });
    else { marks.notes[k].note = note; marks.notes[k].t = Date.now(); }
    saveMarks();
  }

  /* ============================================================
     阅读偏好（主题 / 字体 / 排版）
     ============================================================ */
  var THEMES = {
    ink: { name: "纯黑", glyph: "黑", vars: { "--bg": "#000000", "--bg-elev": "#111114", "--fg": "#cfcfd2", "--fg-strong": "#f2f2f4", "--muted": "#7d7d83", "--line": "rgba(255,255,255,0.10)", "--card": "rgba(255,255,255,0.035)", "--card-hover": "rgba(255,255,255,0.07)", "--accent": "#e8e8e8", "--mark-bg": "#ffd76a", "--mark-fg": "#1a1a1a" } },
    midnight: { name: "深邃", glyph: "夜", vars: { "--bg": "#15171c", "--bg-elev": "#1d2027", "--fg": "#c4c9d2", "--fg-strong": "#eef1f6", "--muted": "#7e8593", "--line": "rgba(255,255,255,0.09)", "--card": "rgba(255,255,255,0.04)", "--card-hover": "rgba(255,255,255,0.08)", "--accent": "#8ab4ff", "--mark-bg": "#ffe08a", "--mark-fg": "#1a1a1a" } },
    forest: { name: "墨绿", glyph: "林", vars: { "--bg": "#10211a", "--bg-elev": "#16291f", "--fg": "#bcd0c2", "--fg-strong": "#e7f3ea", "--muted": "#7a9384", "--line": "rgba(255,255,255,0.08)", "--card": "rgba(255,255,255,0.04)", "--card-hover": "rgba(255,255,255,0.08)", "--accent": "#7fd6a3", "--mark-bg": "#ffe08a", "--mark-fg": "#1a1a1a" } },
    sepia: { name: "羊皮纸", glyph: "卷", vars: { "--bg": "#ece0c8", "--bg-elev": "#f3ead6", "--fg": "#5a4d38", "--fg-strong": "#3a3122", "--muted": "#8c7d62", "--line": "rgba(90,70,40,0.16)", "--card": "rgba(120,95,55,0.06)", "--card-hover": "rgba(120,95,55,0.12)", "--accent": "#9c6b3f", "--mark-bg": "#e3a857", "--mark-fg": "#2a2012" } },
    eye: { name: "护眼", glyph: "眼", vars: { "--bg": "#cfe3cf", "--bg-elev": "#d8ead8", "--fg": "#33453a", "--fg-strong": "#1f2e26", "--muted": "#5f7765", "--line": "rgba(40,70,50,0.16)", "--card": "rgba(40,80,55,0.06)", "--card-hover": "rgba(40,80,55,0.12)", "--accent": "#3f8f5e", "--mark-bg": "#f4c95d", "--mark-fg": "#22301f" } },
    paper: { name: "纸白", glyph: "白", vars: { "--bg": "#fbfbf9", "--bg-elev": "#ffffff", "--fg": "#2f3033", "--fg-strong": "#101113", "--muted": "#8a8c92", "--line": "rgba(0,0,0,0.10)", "--card": "rgba(0,0,0,0.025)", "--card-hover": "rgba(0,0,0,0.05)", "--accent": "#2f6df0", "--mark-bg": "#ffe08a", "--mark-fg": "#1a1a1a" } },
  };
  var FONTS = {
    system: { name: "默认", stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", system-ui, sans-serif' },
    hei: { name: "黑体", stack: '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Heiti SC", sans-serif' },
    song: { name: "宋体", stack: '"Songti SC", "SimSun", "STSong", "Noto Serif SC", serif' },
    kai: { name: "楷体", stack: '"Kaiti SC", "STKaiti", "KaiTi", "楷体", serif' },
  };
  var RANGES = { fontSize: [15, 28, 1, 19], lineHeight: [1.5, 2.8, 0.05, 1.95], paraGap: [0.2, 2.4, 0.1, 1.1], width: [560, 1040, 40, 760] };
  var DEFAULTS = { theme: "midnight", font: "system", fontSize: 19, lineHeight: 1.95, paraGap: 1.1, width: 760, indent: true };

  var prefs = (function () {
    var p = readJSON(PREFS_KEY, {}), out = {};
    for (var k in DEFAULTS) out[k] = p[k] != null ? p[k] : DEFAULTS[k];
    if (out.theme !== "auto" && !THEMES[out.theme]) out.theme = DEFAULTS.theme;
    if (!FONTS[out.font]) out.font = DEFAULTS.font;
    return out;
  })();
  function savePrefs() { writeJSON(PREFS_KEY, prefs); }

  var darkMq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function resolveTheme() {
    if (prefs.theme === "auto") return darkMq && darkMq.matches ? "midnight" : "paper";
    return prefs.theme;
  }
  function applyPrefs() {
    var root = document.documentElement, theme = THEMES[resolveTheme()] || THEMES.midnight;
    for (var v in theme.vars) root.style.setProperty(v, theme.vars[v]);
    root.style.setProperty("--reader-font", FONTS[prefs.font].stack);
    root.style.setProperty("--reader-font-size", prefs.fontSize + "px");
    root.style.setProperty("--reader-line-height", String(prefs.lineHeight));
    root.style.setProperty("--reader-para-gap", prefs.paraGap + "em");
    root.style.setProperty("--reader-indent", prefs.indent ? "2em" : "0");
    root.style.setProperty("--content-width", prefs.width + "px");
  }
  if (darkMq) {
    var mqHandler = function () { if (prefs.theme === "auto") applyPrefs(); };
    if (darkMq.addEventListener) darkMq.addEventListener("change", mqHandler);
    else if (darkMq.addListener) darkMq.addListener(mqHandler);
  }

  /* ============================================================
     付费解锁
     ============================================================ */
  var decCache = {}, keyPromise = null;
  function getStoredCode() { try { return localStorage.getItem(UNLOCK_KEY) || ""; } catch (e) { return ""; } }
  function setStoredCode(code) { try { localStorage.setItem(UNLOCK_KEY, code); } catch (e) {} }
  function clearStoredCode() { try { localStorage.removeItem(UNLOCK_KEY); } catch (e) {} keyPromise = null; decCache = {}; }
  function isUnlocked() { return !!getStoredCode(); }
  function cryptoAvailable() { return !!(window.crypto && window.crypto.subtle && CRYPTO); }
  function b64ToBytes(b64) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function deriveKey(code) {
    var salt = b64ToBytes(CRYPTO.salt);
    return crypto.subtle.importKey("raw", new TextEncoder().encode(code), { name: "PBKDF2" }, false, ["deriveKey"])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: CRYPTO.iter, hash: "SHA-256" },
          base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      });
  }
  function decryptChapter(key, c) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(c.enc.iv) }, key, b64ToBytes(c.enc.data))
      .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
  }
  function tryUnlock(code) {
    if (!cryptoAvailable()) return Promise.resolve(false);
    var first = null;
    for (var i = 0; i < chapters.length; i++) if (chapters[i].locked) { first = chapters[i]; break; }
    if (!first) return Promise.resolve(true);
    return deriveKey(code).then(function (key) { return decryptChapter(key, first); })
      .then(function (arr) { if (Array.isArray(arr)) { setStoredCode(code); keyPromise = null; decCache = {}; return true; } return false; })
      .catch(function () { return false; });
  }
  function getParagraphs(c) {
    if (!c.locked) return Promise.resolve(c.paragraphs);
    if (decCache[c.id]) return Promise.resolve(decCache[c.id]);
    var code = getStoredCode();
    if (!code || !cryptoAvailable()) return Promise.reject("locked");
    if (!keyPromise) keyPromise = deriveKey(code);
    return keyPromise.then(function (key) { return decryptChapter(key, c); })
      .then(function (arr) { decCache[c.id] = arr; return arr; });
  }

  /* ============================================================
     工具
     ============================================================ */
  function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function highlight(text, query) {
    var safe = escapeHtml(text);
    if (!query) return safe;
    return safe.split(escapeHtml(query)).join("<mark>" + escapeHtml(query) + "</mark>");
  }
  var headerEl = document.querySelector(".site-header");
  function headerOffset() { return (headerEl ? headerEl.offsetHeight : 56) + 10; }

  // 文末自愿打赏卡片（复用微信/支付宝收款码，非购买、不与解锁绑定）
  function qrBlock(src, label, ph) {
    return '<div class="qr"><img src="' + src + '" alt="' + label + '收款码" ' +
      'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
      '<div class="qr-ph" style="display:none">' + ph + '</div>' +
      '<div class="qr-label">' + label + '</div></div>';
  }
  function tipCardHtml() {
    return '<div class="tip-card">' +
      '<div class="tip-title">喜欢这个故事？请作者喝杯奶茶 ☕</div>' +
      '<div class="tip-sub">自愿打赏 · 非购买 · 本作品全文免费</div>' +
      '<div class="tip-qrs">' +
        qrBlock("assets/pay-wechat.png", "微信", "把微信收款码<br>存为<br>assets/pay-wechat.png") +
        qrBlock("assets/pay-alipay.png", "支付宝", "把支付宝收款码<br>存为<br>assets/pay-alipay.png") +
      "</div></div>";
  }

  /* ============================================================
     路由
     ============================================================ */
  function parseHash() {
    var h = location.hash.replace(/^#/, "");
    if (!h || h === "/") return { view: "home" };
    var m = h.match(/^\/c\/(\d+)(?:\?(.*))?$/);
    if (m) {
      var params = {};
      if (m[2]) m[2].split("&").forEach(function (kv) {
        var pair = kv.split("="); params[pair[0]] = decodeURIComponent(pair[1] || "");
      });
      return { view: "chapter", id: parseInt(m[1], 10), q: params.q || "", p: params.p != null ? parseInt(params.p, 10) : null };
    }
    return { view: "home" };
  }
  function findChapter(id) { for (var i = 0; i < chapters.length; i++) if (chapters[i].id === id) return i; return -1; }

  /* ============================================================
     目录页
     ============================================================ */
  function chapterPercent(c) {
    var pr = progress.ch[c.id];
    if (!pr) return 0;
    if (pr.done) return 100;
    return Math.min(99, Math.round((pr.p / Math.max(1, totalParasOf(c))) * 100));
  }
  // 估算章节段落数（免费章节用真实数；加密章节用字数粗估）
  function totalParasOf(c) {
    if (c.paragraphs) return c.paragraphs.length;
    return Math.max(1, Math.round(c.length / 60));
  }

  function renderHome() {
    closeResume();
    var q = searchInput.value.trim();
    if (q) return renderSearch(q);
    var unlocked = isUnlocked();

    var html = "";
    html += '<div class="book-hero">';
    html += '<h1 class="book-title">' + escapeHtml(BOOK.title) + "</h1>";
    html += '<div class="book-meta"><span>共 ' + chapters.length + " 章</span>" +
      '<span class="dot">约 ' + (BOOK.totalChars || 0).toLocaleString() + " 字</span>";
    if (FREE >= chapters.length) html += '<span class="dot">全文免费</span>';
    else if (FREE > 0 && !unlocked) html += '<span class="dot">前 ' + FREE + " 章免费试读</span>";
    if (FREE < chapters.length && unlocked) html += '<span class="dot">已解锁全本</span>';
    html += "</div>";
    html += '<div class="book-blurb">' + escapeHtml(BOOK_BLURB) + "</div>";
    html += "</div>";

    // 续读卡片
    if (progress.last && findChapter(progress.last.id) !== -1) {
      var lc = chapters[findChapter(progress.last.id)];
      var pct = chapterPercent(lc);
      html += '<a class="continue-card" href="#/c/' + lc.id + "?p=" + progress.last.p + '">' +
        '<span class="cc-ico">📖</span><span class="cc-main">' +
        '<span class="cc-title">继续阅读 · ' + escapeHtml(lc.title) + "</span>" +
        '<span class="cc-sub">上次读到约 ' + pct + "%</span></span>" +
        '<span class="cc-arrow">→</span></a>';
    }

    html += '<div class="section-cap">目录</div>';
    html += '<ul class="toc">';
    chapters.forEach(function (c) {
      var showLock = c.locked && !unlocked;
      var pr = progress.ch[c.id];
      var badge = "";
      if (pr && pr.done) badge = '<span class="badge done">已读完</span>';
      else if (pr && pr.p > 2) badge = '<span class="badge reading">' + chapterPercent(c) + "%</span>";
      html += '<li><a href="#/c/' + c.id + '">' +
        '<span class="idx">' + String(c.id).padStart(2, "0") + "</span>" +
        '<span class="name">' + escapeHtml(c.title) +
        (showLock ? ' <span class="lock-tag">🔒</span>' : "") + "</span>" +
        '<span class="status">' + badge + '<span class="words">' + c.length.toLocaleString() + " 字</span></span>" +
        "</a></li>";
    });
    html += "</ul>";
    app.innerHTML = html;
    setProgress(false);
    window.scrollTo(0, 0);
  }

  /* ============================================================
     搜索
     ============================================================ */
  function snippetAround(plain, query) {
    var idx = plain.indexOf(query);
    if (idx < 0) return "";
    var start = Math.max(0, idx - 22), end = Math.min(plain.length, idx + query.length + 34);
    var pre = (start > 0 ? "…" : "") + plain.slice(start, idx);
    var hit = plain.slice(idx, idx + query.length);
    var post = plain.slice(idx + query.length, end) + (end < plain.length ? "…" : "");
    return escapeHtml(pre) + "<mark>" + escapeHtml(hit) + "</mark>" + escapeHtml(post);
  }
  function countOccurrences(text, query) { if (!query) return 0; var n = 0, i = 0; while ((i = text.indexOf(query, i)) !== -1) { n++; i += query.length; } return n; }
  function renderSearch(q) {
    closeResume();
    var results = [], lockedHidden = false;
    chapters.forEach(function (c) {
      var inTitle = c.title.indexOf(q) !== -1, hits = c.plain ? countOccurrences(c.plain, q) : 0;
      if (inTitle || hits > 0) results.push({ c: c, hits: hits });
      else if (c.locked) lockedHidden = true;
    });
    var html = '<div class="search-summary">关于 “' + escapeHtml(q) + '” 的结果：' + results.length + " 章命中" +
      (lockedHidden ? "（未解锁章节仅按标题检索）" : "") + "</div>";
    if (results.length === 0) html += '<div class="empty">没有找到匹配的内容。</div>';
    else results.forEach(function (r) {
      var href = "#/c/" + r.c.id + "?q=" + encodeURIComponent(q);
      var sn = r.hits > 0 ? snippetAround(r.c.plain, q) : (r.c.locked && !isUnlocked() ? "（标题匹配 · 该章需解锁）" : "（标题匹配）");
      html += '<a class="result" href="' + href + '"><div class="r-title">' + highlight(r.c.title, q) + "</div>" +
        '<div class="r-snippet">' + sn + "</div>" + (r.hits > 0 ? '<div class="r-count">正文匹配 ' + r.hits + " 处</div>" : "") + "</a>";
    });
    app.innerHTML = html;
    setProgress(false);
    window.scrollTo(0, 0);
  }

  /* ============================================================
     付费墙
     ============================================================ */
  function renderPaywall(c, errorMsg) {
    closeResume(); setProgress(false);
    var noCrypto = !cryptoAvailable();
    var html = '<div class="reader-top"><span class="crumb">' + escapeHtml(BOOK.title) + "</span><span>" +
      String(c.id).padStart(2, "0") + " / " + String(chapters.length).padStart(2, "0") + "</span></div>";
    html += '<h1 class="chapter-title">' + escapeHtml(c.title) + ' <span class="lock-tag">🔒</span></h1>';
    html += '<div class="paywall">';
    html += '<div class="pw-lead">前 ' + FREE + ' 章免费试读到此结束。<br>解锁全本（共 ' + chapters.length +
      ' 章 · 约 ' + (BOOK.totalChars || 0).toLocaleString() + ' 字），畅读到大结局。</div>';
    html += '<div class="pw-price"><span class="pw-amount">¥' + escapeHtml(PRICE) + '</span><span class="pw-unit">解锁全本</span></div>';
    html += '<div class="pw-qrs">';
    html += '<div class="qr"><img src="assets/pay-wechat.png" alt="微信收款码" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="qr-ph" style="display:none">把微信收款码<br>存为<br>assets/pay-wechat.png</div><div class="qr-label">微信扫码</div></div>';
    html += '<div class="qr"><img src="assets/pay-alipay.png" alt="支付宝收款码" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="qr-ph" style="display:none">把支付宝收款码<br>存为<br>assets/pay-alipay.png</div><div class="qr-label">支付宝扫码</div></div>';
    html += "</div>";
    html += '<div class="pw-steps">扫码付款后，把付款备注/截图发给作者，获取「解锁码」，在下方输入即可永久解锁本设备。</div>';
    html += '<div class="pw-unlock"><input id="unlock-input" type="text" placeholder="输入解锁码" autocomplete="off" spellcheck="false" ' +
      (noCrypto ? "disabled" : "") + '><button id="unlock-btn" ' + (noCrypto ? "disabled" : "") + ">解锁</button></div>";
    html += '<div id="unlock-msg" class="pw-msg">' + (errorMsg ? escapeHtml(errorMsg) : "") + "</div>";
    if (noCrypto) html += '<div class="pw-msg">当前环境不支持解密（需通过 https 或 localhost，或用 Chrome 打开本地文件）。</div>';
    html += '<div class="pw-back"><a href="#/c/' + Math.min(c.id, FREE) + '">← 回到试读</a> · <a href="#/">返回目录</a></div></div>';
    app.innerHTML = html;
    window.scrollTo(0, 0);

    var input = document.getElementById("unlock-input"), btn = document.getElementById("unlock-btn"), msg = document.getElementById("unlock-msg");
    if (btn && input) {
      var doUnlock = function () {
        var code = input.value.trim();
        if (!code) { msg.textContent = "请输入解锁码"; return; }
        btn.disabled = true; msg.textContent = "正在校验…";
        tryUnlock(code).then(function (ok) {
          btn.disabled = false;
          if (ok) { msg.textContent = "解锁成功！正在打开…"; route(); }
          else msg.textContent = "解锁码不正确，请重试。";
        });
      };
      btn.addEventListener("click", doUnlock);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") doUnlock(); });
      input.focus();
    }
  }

  /* ============================================================
     阅读页
     ============================================================ */
  var curId = null, curParas = [], curCum = [], curTotal = 0, paraEls = null;

  function renderChapterShell(c, params, paragraphs) {
    curId = c.id; curParas = paragraphs;
    curCum = new Array(paragraphs.length); curTotal = 0;
    for (var n = 0; n < paragraphs.length; n++) { curCum[n] = curTotal; curTotal += paragraphs[n].length; }

    var i = findChapter(c.id), prev = chapters[i - 1], next = chapters[i + 1];
    var q = params.q || "";

    var html = '<div class="reader-top"><span class="crumb">' + escapeHtml(BOOK.title) + "</span><span>" +
      String(c.id).padStart(2, "0") + " / " + String(chapters.length).padStart(2, "0") + "</span></div>";
    html += '<h1 class="chapter-title">' + highlight(c.title, q) + "</h1>";
    html += '<div class="reader-stats" id="reader-stats"></div>';
    html += '<div class="chapter-body" id="chapter-body">';
    paragraphs.forEach(function (p, idx) {
      var bm = isBookmarked(c.id, idx), note = getNote(c.id, idx);
      html += '<p class="para' + (bm ? " bm" : "") + '" data-i="' + idx + '">' + highlight(p, q) + "</p>";
      if (note) html += '<div class="para-note" data-i="' + idx + '">' + escapeHtml(note.note) + "</div>";
    });
    html += "</div>";
    html += tipCardHtml();
    html += '<nav class="chapter-nav">';
    html += prev ? '<a href="#/c/' + prev.id + '">← 上一章</a>' : '<span class="disabled">← 上一章</span>';
    html += '<a class="to-toc" href="#/">目录</a>';
    html += next ? '<a href="#/c/' + next.id + '">下一章 →</a>' : '<span class="disabled">下一章 →</span>';
    html += "</nav>";
    app.innerHTML = html;

    paraEls = app.querySelectorAll("p.para");
    setProgress(true);
    bindParagraphTaps();

    // 定位：搜索高亮 > 指定段落(p) > 续读浮条 > 顶部
    var firstMark = app.querySelector("mark");
    if (q && firstMark) { firstMark.scrollIntoView({ block: "center" }); }
    else if (params.p != null) { scrollToPara(params.p); }
    else {
      window.scrollTo(0, 0);
      var pr = progress.ch[c.id];
      if (pr && pr.p > 2 && !pr.done) showResume(pr.p);
    }
    updateReaderUI();
  }

  function renderChapter(id, params) {
    var i = findChapter(id);
    if (i < 0) { app.innerHTML = '<div class="empty">章节不存在。<a href="#/">返回目录</a></div>'; setProgress(false); return; }
    var c = chapters[i];
    if (c.locked && !isUnlocked()) { renderPaywall(c, null); return; }
    if (!c.locked) { renderChapterShell(c, params, c.paragraphs); return; }
    app.innerHTML = '<div class="empty">正在解密本章…</div>';
    getParagraphs(c).then(function (paras) { renderChapterShell(c, params, paras); })
      .catch(function () { clearStoredCode(); renderPaywall(c, "解锁码已失效，请重新输入。"); });
  }

  function scrollToPara(idx) {
    var el = app.querySelector('p.para[data-i="' + idx + '"]');
    if (!el) { window.scrollTo(0, 0); return; }
    var y = el.getBoundingClientRect().top + window.pageYOffset - headerOffset() - 6;
    window.scrollTo(0, Math.max(0, y));
  }

  // 当前视口顶部对应的段落序号
  function topParaIndex() {
    if (!paraEls || !paraEls.length) return 0;
    var off = headerOffset() + 4;
    for (var k = 0; k < paraEls.length; k++) {
      if (paraEls[k].getBoundingClientRect().bottom > off) return parseInt(paraEls[k].dataset.i, 10);
    }
    return parseInt(paraEls[paraEls.length - 1].dataset.i, 10);
  }

  function updateReaderUI() {
    if (curId == null) return;
    var idx = topParaIndex();
    var readChars = curCum[idx] || 0;
    var atBottom = (window.innerHeight + window.pageYOffset) >= (document.documentElement.scrollHeight - 4);
    var pct = atBottom ? 100 : (curTotal ? Math.round(readChars / curTotal * 100) : 0);
    var remain = Math.max(0, curTotal - readChars);
    var mins = atBottom ? 0 : Math.max(1, Math.ceil(remain / READ_SPEED));
    var stats = document.getElementById("reader-stats");
    if (stats) stats.textContent = atBottom ? "已读完本章 · 共 " + curTotal.toLocaleString() + " 字"
      : "已读 " + pct + "% · 约剩 " + mins + " 分钟";
    setChapterPos(curId, idx, atBottom || pct >= 97);
  }

  /* ============================================================
     段落操作（书签 / 笔记 / 复制）
     ============================================================ */
  var pop = document.getElementById("para-pop");
  var popTarget = null;
  function bindParagraphTaps() {
    var body = document.getElementById("chapter-body");
    if (!body) return;
    body.addEventListener("click", function (e) {
      var noteDiv = e.target.closest(".para-note");
      if (noteDiv) { openNote(curId, parseInt(noteDiv.dataset.i, 10)); return; }
      var p = e.target.closest("p.para");
      if (!p) return;
      var sel = window.getSelection();
      if (sel && !sel.isCollapsed) return; // 正在选中文字，不打扰
      openPop(p, e);
    });
  }
  function openPop(p, e) {
    popTarget = parseInt(p.dataset.i, 10);
    var on = pop.querySelector('[data-act="bookmark"]');
    on.classList.toggle("on", isBookmarked(curId, popTarget));
    on.querySelector(".pp-txt").textContent = isBookmarked(curId, popTarget) ? "取消书签" : "书签";
    pop.querySelector('[data-act="note"]').querySelector(".pp-txt").textContent = getNote(curId, popTarget) ? "编辑笔记" : "笔记";
    pop.hidden = false;
    var px = (e.clientX || (e.touches && e.touches[0].clientX) || window.innerWidth / 2);
    var py = (e.clientY || (e.touches && e.touches[0].clientY) || window.innerHeight / 2);
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(8, px - w / 2), window.innerWidth - w - 8);
    var top = py - h - 12; if (top < headerOffset()) top = py + 16;
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  function closePop() { pop.hidden = true; popTarget = null; }
  pop.addEventListener("click", function (e) {
    var btn = e.target.closest("button"); if (!btn || popTarget == null) return;
    var act = btn.dataset.act, idx = popTarget, text = curParas[idx] || "";
    if (act === "bookmark") {
      var added = toggleBookmark(curId, idx, text);
      var pEl = app.querySelector('p.para[data-i="' + idx + '"]');
      if (pEl) pEl.classList.toggle("bm", added);
      closePop();
    } else if (act === "note") {
      closePop(); openNote(curId, idx);
    } else if (act === "copy") {
      copyText(text);
      btn.querySelector(".pp-txt").textContent = "已复制";
      setTimeout(closePop, 600);
    }
  });
  document.addEventListener("click", function (e) {
    if (!pop.hidden && !e.target.closest("#para-pop") && !e.target.closest("p.para")) closePop();
  });
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).catch(fallbackCopy.bind(null, t)); }
    else fallbackCopy(t);
  }
  function fallbackCopy(t) {
    var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta);
  }

  /* ============================================================
     笔记弹窗
     ============================================================ */
  var noteModal = document.getElementById("note-modal"), noteOverlay = document.getElementById("note-overlay");
  var noteText = document.getElementById("note-text"), noteQuote = document.getElementById("note-quote");
  var noteEditing = null; // {ch, i}
  function openNote(ch, i) {
    noteEditing = { ch: ch, i: i };
    var existing = getNote(ch, i);
    noteQuote.textContent = snip(curParas[i] || (existing ? existing.text : ""), 120);
    noteText.value = existing ? existing.note : "";
    document.getElementById("note-delete").style.display = existing ? "" : "none";
    noteModal.hidden = false; noteOverlay.hidden = false;
    setTimeout(function () { noteText.focus(); }, 30);
  }
  function closeNote() { noteModal.hidden = true; noteOverlay.hidden = true; noteEditing = null; }
  function applyNoteDom(ch, i) {
    if (ch !== curId) return;
    var pEl = app.querySelector('p.para[data-i="' + i + '"]');
    if (!pEl) return;
    var note = getNote(ch, i);
    var existingDiv = pEl.nextElementSibling && pEl.nextElementSibling.classList.contains("para-note") ? pEl.nextElementSibling : null;
    if (note) {
      if (existingDiv) existingDiv.textContent = note.note;
      else { var d = document.createElement("div"); d.className = "para-note"; d.dataset.i = i; d.textContent = note.note; pEl.parentNode.insertBefore(d, pEl.nextSibling); }
    } else if (existingDiv) { existingDiv.remove(); }
  }
  document.getElementById("note-save").addEventListener("click", function () {
    if (!noteEditing) return;
    var t = noteText.value.trim();
    setNote(noteEditing.ch, noteEditing.i, curParas[noteEditing.i] || "", t);
    applyNoteDom(noteEditing.ch, noteEditing.i);
    closeNote();
  });
  document.getElementById("note-delete").addEventListener("click", function () {
    if (!noteEditing) return;
    setNote(noteEditing.ch, noteEditing.i, "", "");
    applyNoteDom(noteEditing.ch, noteEditing.i);
    closeNote();
  });
  document.getElementById("note-cancel").addEventListener("click", closeNote);
  noteOverlay.addEventListener("click", closeNote);

  /* ============================================================
     续读浮条
     ============================================================ */
  var resumePill = null;
  function showResume(p) {
    closeResume();
    resumePill = document.createElement("div");
    resumePill.className = "resume-pill";
    resumePill.innerHTML = '<span>↩ 上次读到这里，点击继续</span><button class="rp-close" aria-label="关闭">×</button>';
    document.body.appendChild(resumePill);
    requestAnimationFrame(function () { resumePill.classList.add("show"); });
    resumePill.addEventListener("click", function (e) {
      if (e.target.closest(".rp-close")) { closeResume(); return; }
      scrollToPara(p); closeResume();
    });
    setTimeout(closeResume, 6000);
  }
  function closeResume() { if (resumePill) { resumePill.remove(); resumePill = null; } }

  /* ============================================================
     进度条 / 回顶
     ============================================================ */
  var progressEnabled = false;
  function setProgress(on) { progressEnabled = on; progressBar.classList.toggle("show", on); if (!on) progressBar.style.width = "0"; }
  function onScroll() {
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    if (progressEnabled) progressBar.style.width = Math.min(100, Math.max(0, max > 0 ? h.scrollTop / max * 100 : 0)) + "%";
    toTopBtn.classList.toggle("show", h.scrollTop > 600);
    toTopBtn.hidden = h.scrollTop <= 600 && parseHash().view !== "chapter";
    if (progressEnabled) scheduleReaderUpdate();
  }
  var ruTimer = null;
  function scheduleReaderUpdate() { if (ruTimer) return; ruTimer = setTimeout(function () { ruTimer = null; updateReaderUI(); }, 250); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  toTopBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* ============================================================
     键盘翻章
     ============================================================ */
  document.addEventListener("keydown", function (e) {
    if (/input|textarea/i.test((e.target.tagName || ""))) return;
    var r = parseHash(); if (r.view !== "chapter") return;
    var i = findChapter(r.id); if (i < 0) return;
    if (e.key === "ArrowLeft" && chapters[i - 1]) location.hash = "#/c/" + chapters[i - 1].id;
    else if (e.key === "ArrowRight" && chapters[i + 1]) location.hash = "#/c/" + chapters[i + 1].id;
  });

  /* ============================================================
     抽屉（设置 / 书签笔记）
     ============================================================ */
  var sPanel = document.getElementById("settings-panel"), sOverlay = document.getElementById("settings-overlay");
  var mPanel = document.getElementById("marks-panel"), mOverlay = document.getElementById("marks-overlay");
  function openDrawer(panel, overlay) {
    panel.hidden = false; overlay.hidden = false;
    requestAnimationFrame(function () { panel.classList.add("show"); overlay.classList.add("show"); });
  }
  function closeDrawer(panel, overlay) {
    panel.classList.remove("show"); overlay.classList.remove("show");
    setTimeout(function () { panel.hidden = true; overlay.hidden = true; }, 280);
  }
  document.getElementById("settings-btn").addEventListener("click", function () { openDrawer(sPanel, sOverlay); });
  document.getElementById("settings-close").addEventListener("click", function () { closeDrawer(sPanel, sOverlay); });
  sOverlay.addEventListener("click", function () { closeDrawer(sPanel, sOverlay); });
  document.getElementById("marks-btn").addEventListener("click", function () { buildMarksPanel(); openDrawer(mPanel, mOverlay); });
  document.getElementById("marks-close").addEventListener("click", function () { closeDrawer(mPanel, mOverlay); });
  mOverlay.addEventListener("click", function () { closeDrawer(mPanel, mOverlay); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!sPanel.hidden) closeDrawer(sPanel, sOverlay);
      if (!mPanel.hidden) closeDrawer(mPanel, mOverlay);
      if (!noteModal.hidden) closeNote();
      if (!pop.hidden) closePop();
    }
  });

  /* -------- 书签 / 笔记面板内容 -------- */
  var marksBody = document.getElementById("marks-body");
  var marksTab = "bookmarks";
  Array.prototype.forEach.call(document.querySelectorAll(".marks-tabs .tab"), function (t) {
    t.addEventListener("click", function () {
      marksTab = t.dataset.tab;
      document.querySelectorAll(".marks-tabs .tab").forEach(function (x) { x.classList.toggle("active", x === t); });
      buildMarksPanel();
    });
  });
  function chapterTitle(ch) { var i = findChapter(ch); return i === -1 ? "第" + ch + "章" : chapters[i].title; }

  function updateMarksCount() {
    var el = document.getElementById("marks-count");
    if (el) el.textContent = "书签 " + marks.bm.length + " · 笔记 " + marks.notes.length;
    var exp = document.getElementById("marks-export");
    if (exp) exp.textContent = marksTab === "bookmarks" ? "⬇ 导出书签" : "⬇ 导出笔记";
  }

  function byChapter(list) {
    var sorted = list.slice().sort(function (a, b) { return a.ch - b.ch || a.i - b.i; });
    var lastCh = null, out = [];
    sorted.forEach(function (m) {
      if (m.ch !== lastCh) { out.push("— " + chapterTitle(m.ch) + " —"); lastCh = m.ch; }
      out.push(m);
    });
    return out;
  }
  function downloadTxt(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // 按当前标签分别导出（书签 或 笔记）为 .txt
  function exportCurrent() {
    var isBm = marksTab === "bookmarks";
    var list = isBm ? marks.bm : marks.notes;
    if (!list.length) { alert("当前没有可导出的" + (isBm ? "书签" : "笔记") + "。"); return; }
    var lines = [];
    lines.push("《" + BOOK.title + "》 — 我的" + (isBm ? "书签" : "笔记"));
    lines.push("导出时间：" + new Date().toLocaleString());
    lines.push("共 " + list.length + " 条");
    lines.push("");
    byChapter(list).forEach(function (x) {
      if (typeof x === "string") { lines.push(""); lines.push(x); }
      else if (isBm) lines.push("· " + x.text);
      else { lines.push("· 原文：" + x.text); lines.push("  笔记：" + x.note); }
    });
    downloadTxt(BOOK.title + " - " + (isBm ? "书签" : "笔记") + ".txt", lines.join("\r\n"));
  }
  var exportBtn = document.getElementById("marks-export");
  if (exportBtn) exportBtn.addEventListener("click", exportCurrent);

  // 一键清空全部书签与笔记
  function clearAllMarks() {
    if (!marks.bm.length && !marks.notes.length) { alert("没有可清空的书签或笔记。"); return; }
    if (!confirm("确定清空全部书签和笔记吗？此操作不可恢复。\n（建议先「导出」备份）")) return;
    marks = { bm: [], notes: [] };
    saveMarks();
    buildMarksPanel();
    // 同步清除当前章节里的标记
    if (curId != null) {
      Array.prototype.forEach.call(app.querySelectorAll("p.para.bm"), function (p) { p.classList.remove("bm"); });
      Array.prototype.forEach.call(app.querySelectorAll(".para-note"), function (n) { n.remove(); });
    }
  }
  var clearBtn = document.getElementById("marks-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearAllMarks);

  function buildMarksPanel() {
    updateMarksCount();
    var list = marksTab === "bookmarks" ? marks.bm : marks.notes;
    if (!list.length) {
      marksBody.innerHTML = '<div class="marks-empty">还没有' + (marksTab === "bookmarks" ? "书签" : "笔记") +
        '。<br>阅读时点一下段落即可添加。</div>';
      return;
    }
    var sorted = list.slice().sort(function (a, b) { return a.ch - b.ch || a.i - b.i; });
    var html = "", lastCh = null;
    sorted.forEach(function (m) {
      if (m.ch !== lastCh) { html += '<div class="mark-group-cap">' + escapeHtml(chapterTitle(m.ch)) + "</div>"; lastCh = m.ch; }
      html += '<a class="mark-item" href="#/c/' + m.ch + "?p=" + m.i + '" data-ch="' + m.ch + '" data-i="' + m.i + '" data-type="' + marksTab + '">' +
        '<div class="mi-text">' + escapeHtml(m.text) + "</div>" +
        (marksTab === "notes" ? '<div class="mi-note">' + escapeHtml(m.note) + "</div>" : "") +
        '<button class="mi-del" title="删除">×</button></a>';
    });
    marksBody.innerHTML = html;
    Array.prototype.forEach.call(marksBody.querySelectorAll(".mark-item"), function (a) {
      a.addEventListener("click", function (e) {
        if (e.target.closest(".mi-del")) {
          e.preventDefault();
          var ch = parseInt(a.dataset.ch, 10), i = parseInt(a.dataset.i, 10);
          if (a.dataset.type === "bookmarks") { var k = findBm(ch, i); if (k !== -1) marks.bm.splice(k, 1); }
          else { var n = findNote(ch, i); if (n !== -1) marks.notes.splice(n, 1); }
          saveMarks(); buildMarksPanel();
          if (ch === curId) { applyNoteDom(ch, i); var pe = app.querySelector('p.para[data-i="' + i + '"]'); if (pe && a.dataset.type === "bookmarks") pe.classList.remove("bm"); }
          return;
        }
        closeDrawer(mPanel, mOverlay);
      });
    });
  }

  /* ============================================================
     设置面板控件
     ============================================================ */
  var swatchWrap = document.getElementById("theme-swatches");
  function buildSwatches() {
    swatchWrap.innerHTML = "";
    var entries = Object.keys(THEMES); entries.push("auto");
    entries.forEach(function (key) {
      var btn = document.createElement("button");
      btn.className = "swatch" + (prefs.theme === key ? " active" : "");
      btn.dataset.theme = key;
      if (key === "auto") btn.innerHTML = '<div class="chip" style="background:linear-gradient(135deg,#15171c 0 50%,#fbfbf9 50% 100%);color:#888">◐</div><span class="chip-name">跟随系统</span>';
      else { var t = THEMES[key]; btn.innerHTML = '<div class="chip" style="background:' + t.vars["--bg"] + ";color:" + t.vars["--fg-strong"] + '">' + t.glyph + '</div><span class="chip-name">' + t.name + "</span>"; }
      btn.addEventListener("click", function () {
        prefs.theme = key; applyPrefs(); savePrefs();
        swatchWrap.querySelectorAll(".swatch").forEach(function (s) { s.classList.toggle("active", s.dataset.theme === key); });
      });
      swatchWrap.appendChild(btn);
    });
  }
  var fontWrap = document.getElementById("font-options");
  function buildFonts() {
    fontWrap.innerHTML = "";
    Object.keys(FONTS).forEach(function (key) {
      var btn = document.createElement("button");
      btn.className = "seg-btn" + (prefs.font === key ? " active" : "");
      btn.dataset.font = key; btn.textContent = FONTS[key].name; btn.style.fontFamily = FONTS[key].stack;
      btn.addEventListener("click", function () {
        prefs.font = key; applyPrefs(); savePrefs();
        fontWrap.querySelectorAll(".seg-btn").forEach(function (s) { s.classList.toggle("active", s.dataset.font === key); });
      });
      fontWrap.appendChild(btn);
    });
  }
  function fmt(key) { var v = prefs[key]; if (key === "fontSize" || key === "width") return v + "px"; if (key === "lineHeight") return v.toFixed(2); if (key === "paraGap") return v.toFixed(1) + "em"; return String(v); }
  var valEls = { fontSize: document.getElementById("val-fontSize"), lineHeight: document.getElementById("val-lineHeight"), paraGap: document.getElementById("val-paraGap"), width: document.getElementById("val-width") };
  function refreshVal(key) {
    if (valEls[key]) valEls[key].textContent = fmt(key);
    var stepper = document.querySelector('.stepper[data-key="' + key + '"]');
    if (stepper) { var r = RANGES[key], fill = stepper.querySelector(".bar-fill"); if (fill) fill.style.width = ((prefs[key] - r[0]) / (r[1] - r[0]) * 100) + "%"; }
  }
  function buildSteppers() {
    document.querySelectorAll(".stepper").forEach(function (stepper) {
      var key = stepper.dataset.key, r = RANGES[key];
      stepper.innerHTML = '<button data-dir="-1">−</button><div class="bar"><div class="bar-fill"></div></div><button data-dir="1">+</button>';
      stepper.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          var next = +(prefs[key] + parseInt(b.dataset.dir, 10) * r[2]).toFixed(2);
          prefs[key] = Math.min(r[1], Math.max(r[0], next));
          applyPrefs(); savePrefs(); refreshVal(key); updateReaderUI();
        });
      });
      refreshVal(key);
    });
  }
  var indentToggle = document.getElementById("indent-toggle");
  indentToggle.checked = !!prefs.indent;
  indentToggle.addEventListener("change", function () { prefs.indent = indentToggle.checked; applyPrefs(); savePrefs(); });
  document.getElementById("settings-reset").addEventListener("click", function () {
    prefs = JSON.parse(JSON.stringify(DEFAULTS));
    applyPrefs(); savePrefs(); buildSwatches(); buildFonts();
    ["fontSize", "lineHeight", "paraGap", "width"].forEach(refreshVal);
    indentToggle.checked = prefs.indent;
  });

  /* ============================================================
     搜索框
     ============================================================ */
  var searchTimer = null;
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { if (parseHash().view === "home") renderHome(); }, 120);
  });
  searchInput.addEventListener("keydown", function (e) { if (e.key === "Enter" && parseHash().view !== "home") location.hash = "#/"; });

  /* ============================================================
     调度
     ============================================================ */
  function route() {
    closePop(); closeResume();
    var r = parseHash();
    if (r.view === "chapter") renderChapter(r.id, { q: r.q, p: r.p });
    else { curId = null; renderHome(); }
  }
  window.addEventListener("hashchange", route);

  applyPrefs(); buildSwatches(); buildFonts(); buildSteppers(); route();
})();
