  var APP_VERSION = "0.5.0", APP_DATE = "16 Nov 2026";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clip(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function enc(s) { return encodeURIComponent(s); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mmss(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  // everything this bar remembers on the TV starts with "snk-" (TizenBrew apps share one cupboard)
  var prefs = store.get("snk-prefs", {});
  if (typeof prefs.barName !== "string" || !prefs.barName.trim()) prefs.barName = "Saturday Night Karaoke";
  if (typeof prefs.sound !== "boolean") prefs.sound = true;
  if (!Array.isArray(prefs.singers)) prefs.singers = [];
  if (typeof prefs.ytKey !== "string") prefs.ytKey = "";
  if (typeof prefs.phone !== "boolean") prefs.phone = true;
  // the lights: a dimmer over the whole screen, for evenings when the TV is the brightest thing in the room
  var LIGHTS = {
    evening: { n: "Dim from 8pm to 6am", next: "dim", lvl: function () { var h = new Date().getHours(); return h >= 20 || h < 6 ? 0.3 : 0; } },
    dim: { n: "Dim", next: "dimmer", lvl: function () { return 0.3; } },
    dimmer: { n: "Dimmer", next: "full", lvl: function () { return 0.48; } },
    full: { n: "Bright", next: "evening", lvl: function () { return 0; } }
  };
  if (!LIGHTS[prefs.lights]) prefs.lights = "evening";
  if (typeof prefs.fair !== "boolean") prefs.fair = true;
  // how long the sound takes to come out of the speakers after the picture (a soundbar adds a little)
  if (typeof prefs.lag !== "number" || !(Math.abs(prefs.lag) < 2)) prefs.lag = 0;
  if (prefs.screen !== "classic") prefs.screen = "window";
  function applyLights() { var el = document.getElementById("dimmer"); if (el) el.style.opacity = String(LIGHTS[prefs.lights].lvl()); }
  function savePrefs() { store.set("snk-prefs", prefs); }
  function fnvName() { var p = store.get("fnv-prefs", null); return p && typeof p.storeName === "string" && p.storeName.trim() ? p.storeName.trim().slice(0, 40) : "Friday Night Video"; }
  var wall = store.get("snk-wall", []), songMemo = store.get("snk-songs", {}), slipNo = store.get("snk-slipno", 141);
  var queue = [], SC = "out", S = null;   // S: the song on stage


  // ---------- sound ----------
  var ac = null, noiseBuf = null, ambNode = null;
  function audioReady() {
    if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; try { ac = new AC(); } catch (e) { return false; } }
    if (ac.state === "suspended") { try { ac.resume(); } catch (e) {} }
    return true;
  }
  function noise(ctx) {
    if (ctx === ac && noiseBuf) return noiseBuf;
    var b = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (ctx === ac) noiseBuf = b;
    return b;
  }
  function tone(freq, start, dur, vol, type) {
    var o = ac.createOscillator(), g = ac.createGain(); o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime + start); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
    o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + start); o.stop(ac.currentTime + start + dur + 0.05);
  }
  function burst(dur, type, freq, vol, delay) {
    var t0 = ac.currentTime + (delay || 0), s = ac.createBufferSource(); s.buffer = noise(ac);
    var f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    var g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t0, Math.random() * 3); s.stop(t0 + dur + 0.05);
    return f;
  }
  function sfx(kind) {
    if (!prefs.sound || !ac || ac.state !== "running") return;
    if (kind === "tick") burst(0.03, "bandpass", 2600, 0.2);
    else if (kind === "tap") { burst(0.025, "bandpass", 3200, 0.14); tone(1800, 0, 0.05, 0.025); }
    else if (kind === "flip") { var f = burst(0.3, "bandpass", 600, 0.2); f.frequency.linearRampToValueAtTime(2400, ac.currentTime + 0.28); }
    else if (kind === "slide") { var sl = burst(0.4, "bandpass", 300, 0.16); sl.frequency.linearRampToValueAtTime(900, ac.currentTime + 0.36); }
    else if (kind === "bell") { tone(2210, 0, 1.1, 0.05); tone(5480, 0, 0.45, 0.014); tone(3310, 0.002, 0.7, 0.016); }
    else if (kind === "door") { tone(1318, 0, 0.9, 0.06); tone(1046, 0.28, 1.2, 0.06); }
    else if (kind === "stamp") { burst(0.07, "lowpass", 900, 0.6); tone(150, 0, 0.12, 0.15, "triangle"); }
    else if (kind === "close") burst(0.05, "bandpass", 800, 0.16);
    else if (kind === "score") { tone(880, 0, 0.08, 0.05, "square"); }
    else if (kind === "pip") { tone(1320, 0, 0.14, 0.06, "square"); }
    else if (kind === "ta-da") { [523, 659, 784, 1047].forEach(function (n, i) { tone(n, i * 0.09, 0.5, 0.05, "triangle"); }); }
    else if (kind === "applause") {
      var s = ac.createBufferSource(); s.buffer = noise(ac); s.loop = true;
      var bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = 0.6;
      var g = ac.createGain(), t = ac.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.5); g.gain.setValueAtTime(0.16, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
      s.connect(bp); bp.connect(g); g.connect(ac.destination); s.start(); s.stop(t + 5.1);
      for (var i = 0; i < 44; i++) burst(0.03, "bandpass", 1500 + Math.random() * 1800, 0.12 * (1 - i / 60), 0.15 + Math.random() * 3.8);
      [1400, 1900].forEach(function (fq, k) { var o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(fq, t + 0.9 + k * 1.3); o.frequency.linearRampToValueAtTime(fq * 1.5, t + 1.2 + k * 1.3); og.gain.setValueAtTime(0.0001, t); og.gain.setValueAtTime(0.02, t + 0.9 + k * 1.3); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.4 + k * 1.3); o.connect(og); og.connect(ac.destination); o.start(t + 0.9 + k * 1.3); o.stop(t + 1.5 + k * 1.3); });
    }
  }
  // rain: loud on the footpath, muffled through the window
  function ambience(where) {
    if (ambNode) { var old = ambNode; ambNode = null; try { old.g.gain.setTargetAtTime(0, ac.currentTime, 0.2); } catch (e) {} setTimeout(function () { try { old.s.stop(); } catch (e) {} }, 900); }
    if (!where || !prefs.sound || !ac || ac.state !== "running") return;
    var s = ac.createBufferSource(); s.buffer = noise(ac); s.loop = true;
    var f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = where === "out" ? 3800 : 520;
    var g = ac.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(where === "out" ? 0.05 : 0.035, ac.currentTime, 0.5);
    s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
    ambNode = { s: s, g: g };
  }

  // ---------- the frame ----------
  function fit() {
    var w = window.innerWidth || 1920, h = window.innerHeight || 1080, s = Math.min(w / 1920, h / 1080);
    $("stage").style.transform = "translate(" + ((w - 1920 * s) / 2).toFixed(1) + "px," + ((h - 1080 * s) / 2).toFixed(1) + "px) scale(" + s.toFixed(5) + ")";
  }
  function go(sc) { SC = sc; $("stage").setAttribute("data-sc", sc); }
  function fadeThen(fn, ms) { $("fade").classList.add("on"); setTimeout(function () { fn(); requestAnimationFrame(function () { requestAnimationFrame(function () { $("fade").classList.remove("on"); }); }); }, ms || 480); }
  function yes() { return true; }
  var sayT = null;
  function say(text, who, ms) {
    var el = $("say"); el.innerHTML = "<small>" + esc(who || HOST) + "</small>" + esc(text); el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    clearTimeout(sayT); sayT = setTimeout(function () { el.hidden = true; }, ms || 4200);
  }
  function hint(id, parts) {
    $(id).innerHTML = parts.map(function (p) { return p[0] ? '<b class="' + p[0] + '"></b>' + esc(p[1]) : "<span>" + esc(p[1]) + "</span>"; }).join("");
  }

  // ---------- focus: one way of moving round every screen ----------
  function scope() {
    if (!$("osk").hidden) return $("oskKeys");
    if (!$("modal").hidden) return $("modal");
    return $({ bar: "scBar", book: "scBook" }[SC] || "scOut");
  }
  function cur() { return scope().querySelector(".f.on"); }
  function setFocus(el, quiet) {
    var c = cur(); if (c === el) return;
    if (c) c.classList.remove("on");
    if (!el) return;
    el.classList.add("on"); if (!quiet) sfx("tick");
    if (el.classList.contains("tab")) pickTab(+el.getAttribute("data-i"));
    if (el.classList.contains("spot")) spotDots();
  }
  // inside the bar the things you can walk up to have fixed neighbours, so the remote never surprises you
  var BAR_NAV = { wall: { r: "stage", d: "exit" }, stage: { l: "wall", r: "board", d: "book" }, board: { l: "stage", d: "bell" }, exit: { u: "wall", r: "book", d: "book" }, book: { u: "stage", l: "exit", r: "bell" }, bell: { l: "book", u: "board", r: "phone" }, phone: { l: "bell", u: "board" } };
  function move(dx, dy) {
    if (SC === "bar" && $("modal").hidden && $("osk").hidden) {
      var b0 = cur(), to = b0 && BAR_NAV[b0.getAttribute("data-id")][dx < 0 ? "l" : dx > 0 ? "r" : dy < 0 ? "u" : "d"];
      if (to) setFocus($("bSpots").querySelector('[data-id="' + to + '"]'));
      return !!to;
    }
    var c = cur(), list = Array.prototype.slice.call(scope().querySelectorAll(".f"));
    if (!list.length) return false;
    if (!c) { setFocus(list[0]); return true; }
    var a = c.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, best = null, bs = 1e9;
    // first look straight ahead; if nothing is there, take the nearest thing in that general direction
    [true, false].forEach(function (strict) {
      if (best) return;
      list.forEach(function (el) {
        if (el === c) return;
        var b = el.getBoundingClientRect(), ex = b.left + b.width / 2 - ax, ey = b.top + b.height / 2 - ay, along = ex * dx + ey * dy;
        // anything that lines up with where you are counts as dead ahead; of those, the first (left-most or top-most) wins
        var across = dy ? Math.max(0, b.left - a.right, a.left - b.right) : Math.max(0, b.top - a.bottom, a.top - b.bottom);
        if (along < 6 || (strict && across > along * 3 + 40)) return;
        var sc = along + across * 2.2 + (dy ? b.left : b.top) * 0.002; if (sc < bs) { bs = sc; best = el; }
      });
    });
    if (best) { setFocus(best); return true; }
    return false;
  }
  var ACT = {};
  function activate(el) { if (!el) return; var a = el.getAttribute("data-act"); if (a && ACT[a]) ACT[a](el); }
  var modalBack = null;
  function openModal(html, onBack, cls) {
    var m = $("modal"); m.innerHTML = '<div class="card ' + (cls || "") + '">' + html + "</div>"; m.hidden = false; modalBack = onBack || null;
    var f = m.querySelector(".f.first") || m.querySelector(".f"); if (f) setFocus(f, true);
    sfx("slide");
  }
  function closeModal() { $("modal").hidden = true; $("modal").innerHTML = ""; modalBack = null; }
  ACT.close = function () { sfx("close"); var b = modalBack; closeModal(); if (b) b(); };

  // ---------- the letter board ----------
  var osk = null;
  var LAYERS = { abc: ["qwertyuiop", "asdfghjkl'", "zxcvbnm,.-"], ABC: ["QWERTYUIOP", "ASDFGHJKL'", "ZXCVBNM,.-"], sym: ["1234567890", "!?&@#_-+=/", ":;()\"%$*.,"] };
  function openBoard(o) { osk = { o: o, v: o.value || "", layer: o.caps === false ? "abc" : "ABC", auto: o.caps !== false }; $("osk").hidden = false; $("oskLabel").textContent = o.label || ""; drawBoard(); setFocus($("oskKeys").querySelector(".f"), true); showBoard(); }
  function drawBoard(keep) {
    var i = keep ? Array.prototype.indexOf.call($("oskKeys").querySelectorAll(".f"), cur()) : -1;
    var h = LAYERS[osk.layer].map(function (row) { return '<div class="ok-row">' + row.split("").map(function (k) { return '<span class="ok-key f" data-act="key" data-k="' + esc(k) + '">' + esc(k) + "</span>"; }).join("") + "</div>"; }).join("");
    h += '<div class="ok-row"><span class="ok-key wide f" data-act="key" data-s="shift">' + (osk.layer === "ABC" ? "abc" : "ABC") + '</span><span class="ok-key wide f" data-act="key" data-s="sym">' + (osk.layer === "sym" ? "letters" : "123 #") +
      '</span><span class="ok-key wide f" data-act="key" data-s="space">space</span><span class="ok-key wide f" data-act="key" data-s="bksp">⌫ rub out</span><span class="ok-key wide f" data-act="key" data-s="real">TV keyboard</span><span class="ok-key wide go f" data-act="key" data-s="done">Done</span></div>';
    $("oskKeys").innerHTML = h;
    if (i >= 0) { var l = $("oskKeys").querySelectorAll(".f"); if (l[i]) l[i].classList.add("on"); }
  }
  function showBoard() { $("oskText").textContent = osk.o.secret && osk.v.length > 8 ? osk.v.slice(0, 4) + "•••" + osk.v.slice(-4) + "  (" + osk.v.length + ")" : osk.v; }
  function boardType(ch) {
    if (osk.v.length >= (osk.o.max || 60)) return;
    osk.v += ch; showBoard(); sfx("tap");
    if (osk.auto && osk.layer === "ABC") { osk.layer = "abc"; drawBoard(true); }
  }
  function boardDone() { var o = osk.o, v = osk.v.replace(/\s+/g, " ").trim(); $("osk").hidden = true; osk = null; try { $("oskReal").blur(); } catch (e) {} sfx("stamp"); if (o.done) o.done(v); }
  function boardCancel() { var o = osk.o; $("osk").hidden = true; osk = null; try { $("oskReal").blur(); } catch (e) {} sfx("close"); if (o.cancel) o.cancel(); }
  ACT.key = function (el) {
    var k = el.getAttribute("data-k"), s = el.getAttribute("data-s");
    if (k != null) return boardType(k);
    if (s === "space") { boardType(" "); if (osk.auto) { osk.layer = "ABC"; drawBoard(true); } }
    else if (s === "bksp") { osk.v = osk.v.slice(0, -1); showBoard(); sfx("tap"); }
    else if (s === "shift") { osk.layer = osk.layer === "ABC" ? "abc" : "ABC"; drawBoard(true); sfx("tap"); }
    else if (s === "sym") { osk.layer = osk.layer === "sym" ? "abc" : "sym"; drawBoard(true); sfx("tap"); }
    else if (s === "real") { var r = $("oskReal"); r.value = osk.v; try { r.focus(); } catch (e) {} }
    else if (s === "done") boardDone();
  };
  $("oskReal").addEventListener("input", function () { if (osk) { osk.v = $("oskReal").value.slice(0, osk.o.max || 60); showBoard(); } });
  document.addEventListener("paste", function (e) { if (!osk) return; var t = ""; try { t = (e.clipboardData || window.clipboardData).getData("text"); } catch (x) {} if (t) { osk.v = (osk.v + t.replace(/\s+/g, " ")).slice(0, osk.o.max || 60); showBoard(); e.preventDefault(); } });

  // ---------- outside ----------
  var entering = false, outPainted = 0;
  function paintOutside() {
    var P = outLookNow();
    outPainted = Date.now();
    svgToCanvas(skySVG(P), $("oSky"), yes, function () { texturize($("oSky"), .3, false); });
    svgToCanvas(cloudsSVG(P), $("oCloudA"), yes, function () { texturize($("oCloudA"), .45, true); try { var g = $("oCloudB").getContext("2d"); g.clearRect(0, 0, 1920, 640); g.drawImage($("oCloudA"), 0, 0); } catch (e) {} });
    svgToCanvas(outPlateSVG(P), $("oPlate"), yes, function () { texturize($("oPlate"), .42, true, true); });
    $("oCels").innerHTML = outCelsSVG(P, prefs.barName, fnvName());
  }
  function clockText() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()] + " · " + ((h + 11) % 12 + 1) + ":" + (m < 10 ? "0" : "") + m + (h < 12 ? " am" : " pm");
  }
  function showOutside(first) {
    if (Date.now() - outPainted > 20 * 60000) paintOutside();
    entering = false;
    var el = $("scOut"); el.classList.remove("entering", "door-open", "cam-in", "cam-done");
    $("oClock").textContent = clockText();
    go("out");
    if (first) { void el.offsetWidth; el.classList.add("cam-in"); setTimeout(function () { el.classList.add("cam-done"); }, 3300); }
    ambience("out");
  }
  function enterBar() {
    if (entering) return; entering = true;
    audioReady(); sfx("door");
    var el = $("scOut"); el.classList.add("door-open");
    setTimeout(function () { el.classList.add("entering"); }, 380);
    setTimeout(function () { fadeThen(function () { showBar(); if (!store.get("snk-met", false)) { store.set("snk-met", true); setTimeout(function () { say("Evening, love. Songbook's on the counter. Slips come to me.", HOST, 6000); }, 900); } }, 420); }, 900);
  }

  // ---------- inside ----------
  var SPOTS = [
    { id: "book", x: 961, y: 882, t: "The songbook", s: function () { return "Pick a song"; } },
    { id: "stage", x: 910, y: 396, t: "The stage", s: function () { return queue.length ? queue[0].singer + " is up — take the stage" : "Nobody's up yet"; } },
    { id: "board", x: 1680, y: 134, t: "Up next", s: function () { return queue.length ? queue.length + (queue.length === 1 ? " slip" : " slips") + " on the board" : "The request board"; } },
    { id: "bell", x: 1320, y: 914, t: "Ring the bell", s: function () { return "Bar name, sounds and set-up"; } },
    { id: "phone", x: 1610, y: 884, t: "Phone requests", s: function () { var n = phoneCount(); return !prefs.phone ? "Switched off" : n ? n + (n === 1 ? " phone" : " phones") + " on the line" : "Scan the code to send slips"; } },
    { id: "wall", x: 300, y: 96, t: "The regulars", s: function () { return wall.length ? wall.length + (wall.length === 1 ? " song" : " songs") + " sung here" : "Nobody's sung yet"; } },
    { id: "exit", x: 150, y: 250, t: "Step outside", s: function () { return "Back to the street"; } }
  ];
  var barPainted = false;
  function paintBar() {
    if (!barPainted) { barPainted = true; svgToCanvas(barPlateSVG(), $("bPlate"), yes, function () { texturize($("bPlate"), .36, false); }); }
    $("bCels").innerHTML = barCelsSVG({ queue: queue, wall: wall });
    var on = (cur() && SC === "bar" && cur().getAttribute("data-id")) || (queue.length ? "stage" : "book");
    $("bSpots").innerHTML = SPOTS.map(function (s) {
      return '<div class="spot-dot" data-for="' + s.id + '" style="left:' + s.x + "px;top:" + (s.y + 16) + 'px"></div><div class="spot f' + (s.id === on ? " on" : "") + '" data-act="spot" data-id="' + s.id + '" style="left:' + s.x + "px;top:" + (s.y - 14) + 'px">' + esc(s.t) + "<small>" + esc(s.s()) + "</small></div>";
    }).join("");
    spotDots();
    hint("bHint", [["", "◄ ► ▲ ▼  look around"], ["", "OK  choose"], ["y", "Up next"], ["b", "Sounds " + (prefs.sound ? "on" : "off")]]);
    var h = new Date().getHours(); $("scBar").classList.toggle("dim", h >= 22 || h < 6);
  }
  function spotDots() { var c = $("bSpots").querySelector(".spot.on"), id = c && c.getAttribute("data-id"); Array.prototype.forEach.call($("bSpots").querySelectorAll(".spot-dot"), function (d) { d.classList.toggle("on", d.getAttribute("data-for") === id); }); }
  function showBar() { go("bar"); paintBar(); ambience("in"); lastCall(); }
  ACT.spot = function (el) {
    var id = el.getAttribute("data-id");
    if (id === "book") { sfx("flip"); showBook(); }
    else if (id === "stage") { if (queue.length) startNext(); else say("Nobody's on the list, love. Pick something from the songbook first."); }
    else if (id === "board") openBoardList();
    else if (id === "bell") { sfx("bell"); setTimeout(openDesk, 250); }
    else if (id === "phone") openPhoneCard();
    else if (id === "wall") openWall();
    else if (id === "exit") fadeThen(function () { showOutside(false); });
  };
  var lastCallDay = "";
  function lastCall() {
    var d = new Date(), key = d.toDateString();
    if (d.getHours() === 23 && d.getMinutes() >= 45 && lastCallDay !== key && SC !== "sing" && SC !== "out") { lastCallDay = key; sfx("bell"); say("Last songs, folks. Get your slips in — and thanks for singing with us tonight.", HOST + " · last call", 9000); }
  }

  // ---------- the songbook ----------
  var bk = { tab: 0, page: 0, list: [], ask: { q: "", state: "", res: [] } }, PER = 8;
  function showBook() {
    go("book");
    $("bkTabs").innerHTML = TABS.map(function (t, i) { return '<span class="tab f" data-act="tab" data-i="' + i + '" style="background:' + t.c + '">' + esc(t.n) + "</span>"; }).join("");
    hint("bkHint", [["", "▲ ▼  songs"], ["", "◄ ►  turn the page"], ["", "OK  fill in a slip"], ["y", "Up next"], ["", "BACK  close the book"]]);
    renderBook(0);
  }
  function lineHTML(s, i) {
    return '<div class="ln f" data-act="pick" data-i="' + i + '"><span class="code">' + (s.code || "····") + '</span><span class="t">' + esc(s.t) + '</span><span class="a">' + esc(s.a) + (s.y ? " · " + s.y : "") + "</span>" + (s.note ? '<span class="star">' + esc(s.note) + "</span>" : "") + "</div>";
  }
  function renderBook(focusIdx, turn) {
    var T = TABS[bk.tab], ask = T.id === "ask";
    bk.list = ask ? bk.ask.res : tabSongs(T.id);
    var slots = PER * 2 - (ask ? 1 : 0), pages = Math.max(1, Math.ceil(bk.list.length / slots));
    bk.page = Math.max(0, Math.min(pages - 1, bk.page));
    var from = bk.page * slots, items = bk.list.slice(from, from + slots), L = "", Rr = "", nL = PER - (ask ? 1 : 0);
    if (ask) L += '<div class="ln ask f" data-act="ask"><span class="code">?</span><span class="t">' + (bk.ask.q ? "“" + esc(bk.ask.q) + "”" : "Do you have…?") + '</span><span class="a">Press OK and spell out a song or a singer</span></div>';
    items.forEach(function (s, i) { if (i < nL) L += lineHTML(s, from + i); else Rr += lineHTML(s, from + i); });
    if (ask && !items.length) Rr = '<div class="note">' + esc(bk.ask.state || HOST + " knows a lot more songs than fit in the book. Ask for anything: if she can find the words, you can sing it.") + "</div>";
    $("bkL").innerHTML = "<h2>" + esc(T.h) + (pages > 1 ? "<small>" + (bk.page + 1) + " of " + pages + "</small>" : "") + "</h2>" + L + '<div class="pgno">' + (bk.page * 2 + 1) + "</div>";
    $("bkR").innerHTML = '<h2><small style="margin:0">' + (ask ? "What " + esc(HOST) + " found" : bk.list.length + " songs") + "</small></h2>" + Rr + '<div class="pgno">' + (bk.page * 2 + 2) + "</div>";
    Array.prototype.forEach.call($("bkTabs").children, function (t, i) { t.classList.toggle("cur", i === bk.tab); });
    if (turn) { [$("bkL"), $("bkR")].forEach(function (p) { p.classList.remove("turn"); void p.offsetWidth; p.classList.add("turn"); }); sfx("flip"); }
    if (focusIdx != null) {
      var lines = $("binder").querySelectorAll(".ln"), c = cur(); if (c) c.classList.remove("on");
      var el = lines[Math.max(0, Math.min(lines.length - 1, focusIdx))] || $("bkTabs").children[bk.tab];
      el.classList.add("on");
    }
  }
  function pickTab(i) { if (i === bk.tab) return; bk.tab = i; bk.page = 0; renderBook(null, true); }
  ACT.tab = function () { bookMove(0, 1); };
  // the book has its own way of moving: up and down the page, across the spread, and up to the tabs
  function bookMove(dx, dy) {
    var c = cur(); if (!c) return;
    var tabs = $("bkTabs").children, Ls = $("bkL").querySelectorAll(".ln"), Rs = $("bkR").querySelectorAll(".ln");
    if (c.classList.contains("tab")) {
      var ti = +c.getAttribute("data-i");
      if (dx) { var nt = tabs[ti + dx]; if (nt) setFocus(nt); }
      else if (dy > 0) setFocus(Ls[0] || Rs[0] || c);
      return;
    }
    var inL = c.parentNode === $("bkL"), mine = inL ? Ls : Rs, i = Array.prototype.indexOf.call(mine, c);
    if (dy < 0) setFocus(i > 0 ? mine[i - 1] : tabs[bk.tab]);
    else if (dy > 0) { if (mine[i + 1]) setFocus(mine[i + 1]); }
    else if (dx > 0) { if (inL && Rs.length) setFocus(Rs[Math.min(i, Rs.length - 1)]); else if (!inL) flip(1); }
    else if (dx < 0) { if (!inL) setFocus(Ls[Math.min(i, Ls.length - 1)] || c); else flip(-1); }
  }
  function flip(d) {
    var ask = TABS[bk.tab].id === "ask", slots = PER * 2 - (ask ? 1 : 0), pages = Math.max(1, Math.ceil(bk.list.length / slots));
    if (bk.page + d < 0 || bk.page + d >= pages) return false;
    var c = cur(), row = c ? Math.max(0, Array.prototype.indexOf.call(c.parentNode.querySelectorAll(".ln"), c)) : 0;
    bk.page += d; renderBook(null, true);
    var side = (d > 0 ? $("bkL") : $("bkR")).querySelectorAll(".ln"); if (!side.length) side = $("bkL").querySelectorAll(".ln");
    if (c) c.classList.remove("on"); var old = cur(); if (old) old.classList.remove("on");
    side[Math.min(row, side.length - 1)].classList.add("on");
    return true;
  }
  ACT.pick = function (el) { var s = bk.list[+el.getAttribute("data-i")]; if (s) openSlip(s); };
  ACT.ask = function () { openBoard({ label: "Ask " + HOST + ": do you have…?", value: "", max: 50, done: doAsk }); };
  function doAsk(q) {
    if (!q) return;
    bk.ask = { q: q, state: HOST + " is flicking through her folders…", res: [] }; bk.page = 0; renderBook(0);
    getJSON("https://lrclib.net/api/search?q=" + enc(q)).then(function (list) {
      var seen = {}, out = [];
      (list || []).forEach(function (x) {
        if (x.instrumental || !(x.syncedLyrics || x.plainLyrics) || !x.trackName || !x.artistName) return;
        var k = norm(x.artistName) + "|" + norm(x.trackName), have = seen[k];
        if (have) { if (x.syncedLyrics) have.note = ""; return; }
        out.push(seen[k] = { t: x.trackName, a: x.artistName, y: 0, f: "", note: x.syncedLyrics ? "" : "words only" });
      });
      bk.ask.res = out.slice(0, 50);
      bk.ask.state = out.length ? "" : "“Sorry love, I can't find the words for that one.” Try the song title and the singer together.";
      if (SC === "book" && TABS[bk.tab].id === "ask") renderBook(out.length ? 1 : 0);
    }, function () {
      bk.ask.state = "“The line's dead, love.” " + HOST + " couldn't reach her lyrics folder. Check the TV's internet connection and ask again.";
      if (SC === "book" && TABS[bk.tab].id === "ask") renderBook(0);
    });
  }

  // ---------- request slips and the queue ----------
  function who(q) { return q.singer2 ? q.singer + " & " + q.singer2 : q.singer; }
  function slipNames(x) { return [x.singer, x.singer2].filter(function (n) { return n && n !== "Guest"; }).map(function (n) { return n.toLowerCase(); }); }
  // fair turns: a new slip goes in after everyone else's slip of the same round, so nobody sings twice before
  // everyone waiting has had a go. Whoever is on stage now counts as having had this round.
  function addToQueue(q) {
    var mine = slipNames(q), at = queue.length;
    if (prefs.fair && mine.length) {
      var seen = {};
      if (S && S.q) slipNames(S.q).forEach(function (n) { seen[n] = 1; });
      var rounds = queue.map(function (x) { var r = 0, ns = slipNames(x); ns.forEach(function (n) { r = Math.max(r, seen[n] || 0); }); ns.forEach(function (n) { seen[n] = (seen[n] || 0) + 1; }); return r; });
      var myRound = 0; mine.forEach(function (n) { myRound = Math.max(myRound, seen[n] || 0); });
      for (var i = INT ? 1 : 0; i < queue.length; i++) if (rounds[i] > myRound) { at = i; break; }
    }
    queue.splice(at, 0, q);
    prefetchSoon();
    return at + 1;
  }
  // no waiting between singers: the next song's words and music are found while the current one plays
  var prep = {}, prefT = null;
  function prepKey(q) { return songKey(q.song) + "|" + q.mode; }
  function prepare(q) {
    if (q.song.house) return Promise.resolve({ lyr: houseLyrics() });
    var k = prepKey(q), c = prep[k];
    if (c && Date.now() - c.t < 3 * 3600000) return c.p;
    var pr = findLyrics(q.song).then(function (lyr) {
      if (!lyr) { var e = new Error("nolyrics"); e.kind = "nolyrics"; throw e; }
      return findVideo(q.song, q.mode, lyr.dur).then(function (v) { if (!v.length) { var e2 = new Error("novideo"); e2.kind = "novideo"; throw e2; } return { lyr: lyr, vids: v }; });
    });
    prep[k] = { t: Date.now(), p: pr };
    pr.catch(function () { if (prep[k] && prep[k].p === pr) delete prep[k]; });
    return pr;
  }
  function prefetchSoon() { clearTimeout(prefT); prefT = setTimeout(function () { var q = queue[0]; if (q && !q.song.house && prefs.ytKey) prepare(q).catch(function () {}); }, 1500); }
  var draft = null;
  function openSlip(song) {
    var s1 = draft && draft.singer || prefs.singers[0] || "Guest";
    draft = { song: song, singer: s1, mode: prefs.mode || "back", duet: /d/.test(song.f || ""), singer2: prefs.singers.filter(function (n) { return n !== s1; })[0] || "Guest" };
    slipNo++; store.set("snk-slipno", slipNo);
    drawSlip("hand");
  }
  function drawSlip(focus) {
    var names = prefs.singers.slice(0, 7); if (names.indexOf("Guest") === -1) names.push("Guest");
    var h = '<span class="no">No. ' + ("0000" + slipNo).slice(-4) + '</span><div class="k">Request slip</div><div class="song">' + esc(draft.song.t) + '</div><div class="art">' + esc(draft.song.a) + (draft.song.y ? " · " + draft.song.y : "") + "</div>";
    h += '<div class="row"><label>Who’s singing</label>' + names.map(function (n) { return '<span class="chip f' + (n === draft.singer ? " sel" : "") + '" data-act="singer" data-n="' + esc(n) + '">' + esc(n) + "</span>"; }).join("") + '<span class="chip f" data-act="newsinger">+ New name</span></div>';
    h += '<div class="row"><label>Solo or duet</label><span class="chip f' + (!draft.duet ? " sel" : "") + '" data-act="duet" data-d="0">Solo</span><span class="chip f' + (draft.duet ? " sel" : "") + '" data-act="duet" data-d="1">Duet<small>two singers, two colours</small></span></div>';
    if (draft.duet) h += '<div class="row"><label>Singing with</label>' + names.filter(function (n) { return n !== draft.singer || n === "Guest"; }).map(function (n) { return '<span class="chip f' + (n === draft.singer2 ? " sel" : "") + '" data-act="partner" data-n="' + esc(n) + '">' + esc(n) + "</span>"; }).join("") + '<span class="chip f" data-act="newpartner">+ New name</span></div>';
    if (!draft.song.house) h += '<div class="row"><label>The music</label><span class="chip f' + (draft.mode === "back" ? " sel" : "") + '" data-act="mode" data-m="back">Backing track<small>just the music</small></span><span class="chip f' + (draft.mode === "band" ? " sel" : "") + '" data-act="mode" data-m="band">With the band<small>the record, vocals and all</small></span></div>';
    h += '<div class="btns"><span class="btn f" data-act="hand" data-k="hand">Hand it to ' + esc(HOST) + '</span><span class="btn plain f" data-act="close">Never mind</span></div>';
    openModal(h, null, "slip");
    var f = focus === "hand" ? $("modal").querySelector('[data-k="hand"]') : focus; if (typeof f === "string") f = $("modal").querySelector(f);
    if (f) { var c = cur(); if (c) c.classList.remove("on"); f.classList.add("on"); }
  }
  ACT.duet = function (el) { draft.duet = el.getAttribute("data-d") === "1"; drawSlip('[data-act="duet"][data-d="' + (draft.duet ? 1 : 0) + '"]'); };
  ACT.partner = function (el) { draft.singer2 = el.getAttribute("data-n"); drawSlip('[data-act="partner"][data-n="' + draft.singer2.replace(/"/g, '\\"') + '"]'); };
  ACT.newpartner = function () { openBoard({ label: "Who are they singing with?", max: 18, done: function (v) { var n = addSinger(v); if (n) draft.singer2 = n; drawSlip("hand"); } }); };
  ACT.singer = function (el) { draft.singer = el.getAttribute("data-n"); drawSlip('[data-n="' + draft.singer.replace(/"/g, '\\"') + '"]'); };
  ACT.mode = function (el) { draft.mode = el.getAttribute("data-m"); prefs.mode = draft.mode; savePrefs(); drawSlip('[data-m="' + draft.mode + '"]'); };
  function addSinger(n) { n = n.slice(0, 18); if (!n) return ""; prefs.singers = [n].concat(prefs.singers.filter(function (x) { return x.toLowerCase() !== n.toLowerCase(); })).slice(0, 12); savePrefs(); return n; }
  ACT.newsinger = function () { openBoard({ label: "Name for the slip", max: 18, done: function (v) { var n = addSinger(v); if (n) draft.singer = n; drawSlip("hand"); } }); };
  ACT.hand = function () {
    var q = { song: draft.song, singer: draft.singer, mode: draft.song.house ? "house" : draft.mode };
    if (draft.duet) q.singer2 = draft.singer2 && (draft.singer2 !== draft.singer || draft.singer2 === "Guest") ? draft.singer2 : "Guest";
    if (draft.singer !== "Guest") addSinger(draft.singer);
    var pos = addToQueue(q); closeModal(); sfx("stamp");
    if (queue.length === 1 && !S && !INT) {
      openModal('<div class="k">' + esc(HOST) + ' reads the slip</div><h3>“' + esc(who(q)) + ', you’re up!”</h3><p>' + esc(q.song.t) + " — " + esc(q.song.a) + '</p><div class="btns"><span class="btn f" data-act="takestage">Take the stage</span><span class="btn plain f" data-act="close">Pick another first</span></div>', refresh);
    } else { say("Got it, " + who(q) + ". You're number " + pos + " on the list." + (pos < queue.length && prefs.fair ? " Fair's fair." : "")); refresh(); }
  };
  ACT.takestage = function () { closeModal(); startNext(); };
  function refresh() { if (SC === "bar") paintBar(); }
  function openBoardList(focusI) {
    var h = '<div class="k">The request board</div><h3>Up next</h3>';
    if (!queue.length) h += "<p>Nobody's on the list. Open the songbook, pick a song and hand " + esc(HOST) + " the slip.</p>";
    queue.forEach(function (q, i) { h += '<div class="qrow f" data-act="qrow" data-i="' + i + '"><b>' + (i + 1) + "</b>" + esc(who(q)) + "<small>" + esc(q.song.t) + " — " + esc(q.song.a) + "</small></div>"; });
    h += '<div class="btns">' + (queue.length ? '<span class="btn f" data-act="takestage">Start with ' + esc(clip(who(queue[0]), 18)) + "</span>" : "") + '<span class="btn plain f" data-act="close">Back</span></div>' + (queue.length ? '<p class="sm">OK on a slip takes it off the board.</p>' : "");
    openModal(h, refresh);
    if (focusI != null) { var rows = $("modal").querySelectorAll(".qrow"), el = rows[Math.min(focusI, rows.length - 1)]; if (el) { var c = cur(); if (c) c.classList.remove("on"); el.classList.add("on"); } }
  }
  ACT.qrow = function (el) { var i = +el.getAttribute("data-i"); queue.splice(i, 1); sfx("flip"); openBoardList(i); };


  // ---------- phone requests ----------
  var REPO = "timmydouglas98-netizen/saturday-night-karaoke";
  function phoneBase() { return store.get("snk-phone-url", "") || "https://" + REPO.split("/")[0] + ".github.io/" + REPO.split("/")[1] + "/"; }
  var line = null, lineUp = false, phones = {}, seenReq = {}, lastState = "", pkeyBytes = null, helloT = null;
  function canPhone() { return typeof nacl !== "undefined" && typeof qrcode !== "undefined" && !!window.EventSource && !!window.fetch; }
  function pairing() {
    if (!/^[a-z0-9]{16}$/.test(prefs.room || "") || !/^[A-Za-z0-9_\-]{43}$/.test(prefs.pkey || "")) { prefs.room = randomId(16); prefs.pkey = b64(nacl.randomBytes(32)); savePrefs(); }
    pkeyBytes = unb64(prefs.pkey);
  }
  function phoneLink() { pairing(); return phoneBase() + "#" + prefs.room + "." + prefs.pkey; }
  function topicTV() { return "snk" + prefs.room + "t"; }
  function topicPh() { return "snk" + prefs.room + "p"; }
  function lineStop() { if (line) line.close(); line = null; lineUp = false; }
  function lineStart() {
    lineStop(); if (!prefs.phone || !canPhone()) return;
    pairing();
    line = relayListen(topicTV(), pkeyBytes, onPhone, function (up) { lineUp = up; var el = $("lineState"); if (el) el.textContent = lineText(); });
  }
  function lineText() { return !canPhone() ? "This TV can't open the line." : !prefs.phone ? "Phone requests are switched off." : lineUp ? "The line is open." : "Reaching the relay… if this stays, check the TV's internet connection."; }
  function phoneCount() { var n = 0, now = Date.now(); for (var k in phones) if (now - phones[k] < 4 * 3600000) n++; return n; }
  function toPhones(obj) { if (line) relaySend(topicPh(), obj, pkeyBytes).catch(function () {}); }
  function stateObj() {
    return { t: "state", bar: prefs.barName, now: S && !S.loading ? { s: who(S.q), t: S.q.song.t, a: S.q.song.a } : null,
      q: queue.slice(0, 8).map(function (q) { return { s: who(q), t: clip(q.song.t, 60), a: clip(q.song.a, 40) }; }), n: queue.length, key: !!prefs.ytKey };
  }
  // phones hear about the queue only when it changes, and only if a phone has said hello tonight
  function sendState(force) {
    if (!line || !phoneCount()) return;
    var o = stateObj(), sig = JSON.stringify(o); if (!force && sig === lastState) return;
    lastState = sig; toPhones(o);
  }
  setInterval(function () { sendState(false); }, 4000);
  function str(v, n) { return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : ""; }
  function onPhone(m) {
    var from = str(m.from, 24); if (!from) return;
    phones[from] = Date.now();
    if (m.t === "hello") { clearTimeout(helloT); helloT = setTimeout(function () { sendState(true); }, 800); }
    else if (m.t === "req") {
      var id = str(m.id, 24); if (!id || seenReq[id]) return; seenReq[id] = 1;
      var sg = m.song && typeof m.song === "object" ? m.song : {}, t = str(sg.t, 120), a = str(sg.a, 120), singer = str(m.singer, 18) || "Guest";
      if (!t || queue.length >= 40) { toPhones({ t: "ack", id: id, ok: false, why: t ? "full" : "bad" }); return; }
      var song = sg.house === true ? HOUSE_SONG : { t: t, a: a || "Unknown", y: +sg.y > 1900 && +sg.y < 2100 ? Math.floor(+sg.y) : 0, f: sg.d === true ? "d" : "", code: +sg.code > 999 && +sg.code < 10000 ? Math.floor(+sg.code) : 0 };
      var pq = { song: song, singer: singer, mode: song.house ? "house" : m.mode === "band" ? "band" : "back", phone: true }, s2 = str(m.singer2, 18);
      if (s2) { pq.singer2 = s2; singer = who(pq); }
      var ppos = addToQueue(pq);
      toPhones({ t: "ack", id: id, ok: true, pos: ppos });
      sfx("bell");
      if (SC === "sing" && S) flashOsd("NEW SLIP: " + singer.toUpperCase() + " — " + clip(song.t, 28).toUpperCase(), 5000);
      else say(singer + " sent a slip from their phone: " + song.t + ".", HOST, 5000);
      refresh(); sendState(true);
    }
    else if (m.t === "key") {
      var id2 = str(m.id, 24), k = str(m.key, 80), open = !$("modal").hidden && !!$("modal").querySelector("[data-keywin]");
      if (!id2) return;
      if (!open || !/^[A-Za-z0-9_\-]{20,60}$/.test(k)) { toPhones({ t: "ack", id: id2, ok: false, why: open ? "bad" : "closed" }); return; }
      prefs.ytKey = k; savePrefs(); toPhones({ t: "ack", id: id2, ok: true }); sfx("stamp");
      openDesk("d-key"); say("Lovely. The jukebox key came through from the phone."); sendState(true);
    }
  }
  function qrSVG(text, px) {
    var q = qrcode(0, "M"); q.addData(text); q.make();
    var n = q.getModuleCount(), d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      if (!q.isDark(r, c)) continue;
      var c0 = c; while (c + 1 < n && q.isDark(r, c + 1)) c++;
      d += "M" + (c0 + 4) + "," + (r + 4) + "h" + (c - c0 + 1) + "v1h-" + (c - c0 + 1) + "z";
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 8) + " " + (n + 8) + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges" role="img" aria-label="Code to scan with a phone"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#1b1b22"/></svg>';
  }
  function refocus(act) { var el = $("modal").querySelector('[data-act="' + act + '"]'); if (el) { var c = cur(); if (c) c.classList.remove("on"); el.classList.add("on"); } }
  function openPhoneCard(focus) {
    var on = prefs.phone && canPhone(), n = phoneCount();
    var h = '<div class="k">On the table tent</div><h3>Phone requests</h3><div class="qrwrap"><div class="qr">' + (on ? qrSVG(phoneLink(), 430) : '<div class="qroff">Switched off</div>') + '</div><div class="qrside">' +
      "<p>1. Point a phone's camera at the code.<br>2. The songbook opens on the phone.<br>3. Pick a song and send the slip. It lands on " + esc(HOST) + "'s board.</p>" +
      '<p class="sm" id="lineState">' + esc(lineText()) + "</p>" + (n ? '<p class="sm">Phones on the line tonight: ' + n + ".</p>" : "") +
      '<p class="sm">Slips travel scrambled through ntfy.sh, a free relay. Only phones that scanned this code can read them.</p>' +
      '<div class="opt f" data-act="p-toggle">Phone requests<span>' + (prefs.phone ? "On" : "Off") + '</span></div><div class="opt f" data-act="p-new">Make a new code<span>Phones must scan again</span></div>' +
      '<div class="btns" style="margin-top:14px"><span class="btn plain f first" data-act="close">Back</span></div></div></div>';
    openModal(h, refresh, "wide");
    if (focus) refocus(focus);
  }
  ACT["p-toggle"] = function () { prefs.phone = !prefs.phone; savePrefs(); if (prefs.phone) lineStart(); else lineStop(); openPhoneCard("p-toggle"); };
  ACT["p-new"] = function () { if (!canPhone()) return; prefs.room = ""; prefs.pkey = ""; phones = {}; lastState = ""; pairing(); lineStart(); openPhoneCard("p-new"); say("New code. Phones need to scan it again."); };

  // ---------- the regulars' wall ----------
  function polaroid(w) {
    return '<div class="pol"><div class="ph" style="background:' + POL_BG[w.s % POL_BG.length] + '"><svg viewBox="0 0 200 150">' + Ci(100, 62, 26, "#f0b891", ink(4)) + Pt("M40,150 Q100,70 160,150 Z", "#2a1c18") + R(128, 58, 9, 60, "#55505e", ink(3)) + Ci(132, 54, 12, "#8d93a0", ink(3)) +
      '<path d="M90,70 Q100,80 112,69" fill="none"' + ink(4) + "/></svg></div><div class=\"who\">" + esc(w.who) + '</div><div class="what">' + esc(w.t) + " · " + w.s + "</div></div>";
  }
  function openWall() {
    var h = '<div class="k">Pinned up behind the table</div><h3>The regulars</h3>';
    h += wall.length ? '<div class="pols">' + wall.slice(0, 10).map(polaroid).join("") + "</div>" : "<p>Nobody's sung here yet. Finish a song and " + esc(HOST) + " pins your polaroid up.</p>";
    openModal(h + '<div class="btns"><span class="btn plain f" data-act="close">Back</span></div>', null, "wide");
  }

  // ---------- behind the bar: settings ----------
  function openDesk(focus) {
    var h = '<div class="k">' + esc(HOST) + " leans over</div><h3>What can I get you?</h3>";
    h += '<div class="opt f" data-act="d-name">The name on the sign<span>' + esc(prefs.barName) + "</span></div>";
    h += '<div class="opt f" data-act="d-sound">Bar sounds<span>' + (prefs.sound ? "On" : "Off") + "</span></div>";
    h += '<div class="opt f" data-act="d-lights">Lights<span>' + LIGHTS[prefs.lights].n + "</span></div>";
    h += '<div class="opt f" data-act="d-screen">Stage screen<span>' + (prefs.screen === "classic" ? "Classic blue" : "Rainy window") + "</span></div>";
    h += '<div class="opt f" data-act="d-big">Words on the stage screen<span>' + (prefs.big ? "Extra big" : "Big") + "</span></div>";
    h += '<div class="opt f" data-act="d-fair">Turns<span>' + (prefs.fair ? "Fair: everyone gets a go first" : "In the order slips arrive") + "</span></div>";
    h += '<div class="opt f" data-act="d-check">Sound check<span>' + lagText() + "</span></div>";
    h += '<div class="opt f" data-act="d-key">Jukebox key<span>' + (prefs.ytKey ? "Set (ends " + esc(prefs.ytKey.slice(-4)) + ")" : "Not set — only the house song plays") + "</span></div>";
    h += '<div class="opt f" data-act="d-house">Try the house song<span>No set-up needed</span></div>';
    h += '<div class="opt f" data-act="d-names">Singers’ names<span>' + (prefs.singers.length ? esc(prefs.singers.join(", ")) : "None saved") + "</span></div>";
    h += '<div class="btns"><span class="btn plain f" data-act="close">Back</span></div><p class="sm">Version ' + APP_VERSION + " · " + APP_DATE + "</p>";
    openModal(h, refresh, "desk");
    if (focus) refocus(focus);
  }
  ACT["d-name"] = function () { openBoard({ label: "The name on the sign", value: prefs.barName, max: 32, done: function (v) { if (v) { prefs.barName = v; savePrefs(); outPainted = 0; } openDesk("d-name"); }, cancel: function () { openDesk("d-name"); } }); };
  ACT["d-sound"] = function () { toggleSound(); openDesk("d-sound"); };
  ACT["d-screen"] = function () { prefs.screen = prefs.screen === "classic" ? "window" : "classic"; savePrefs(); sfx("tick"); openDesk("d-screen"); };
  ACT["d-check"] = function () { closeModal(); startCheck(); };
  ACT["d-fair"] = function () { prefs.fair = !prefs.fair; savePrefs(); sfx("tick"); openDesk("d-fair"); };
  ACT["d-lights"] = function () { prefs.lights = LIGHTS[prefs.lights].next; savePrefs(); applyLights(); sfx("tick"); openDesk("d-lights"); };
  ACT["d-big"] = function () { prefs.big = !prefs.big; savePrefs(); $("stage").classList.toggle("bigly", !!prefs.big); openDesk("d-big"); };
  ACT["d-key"] = function () {
    openModal('<div class="k">The jukebox</div><h3>The jukebox key</h3><p>The words come from LRCLIB, a free lyrics library. The music plays from YouTube, and YouTube asks every app that searches it for a free key from Google.</p><p>The set-up guide that came with the bar (README, “The jukebox key”) walks through getting one. It takes about ten minutes, once. The key is kept on this TV only.</p>' +
      (prefs.phone && canPhone() ? '<p data-keywin="1"><b>Easiest: send it from a phone.</b> On the phone songbook, tap the cog, paste the key and send it. Keep this card open on the TV while you do.</p>' : "") +
      '<div class="btns"><span class="btn f" data-act="d-keyin">Type the key in</span>' + (prefs.ytKey ? '<span class="btn plain f" data-act="d-keyclear">Forget the key</span>' : "") + '<span class="btn plain f" data-act="d-back">Back</span></div><p class="sm">Typing it instead? “TV keyboard” on the letter board lets you type or paste from the SmartThings app.</p>', function () { openDesk("d-key"); });
  };
  ACT["d-back"] = function () { openDesk("d-key"); };
  ACT["d-keyin"] = function () { openBoard({ label: "Jukebox key (from Google)", value: prefs.ytKey, max: 60, caps: false, secret: true, done: function (v) { prefs.ytKey = v.replace(/\s/g, ""); savePrefs(); openDesk("d-key"); if (prefs.ytKey) say("Lovely. The jukebox is plugged in."); }, cancel: function () { openDesk("d-key"); } }); };
  ACT["d-keyclear"] = function () { prefs.ytKey = ""; savePrefs(); openDesk("d-key"); };
  ACT["d-house"] = function () { closeModal(); openSlip(HOUSE_SONG); };
  ACT["d-names"] = function () {
    var h = '<div class="k">Rubber-banded by the till</div><h3>Singers’ names</h3>' + (prefs.singers.length ? "" : "<p>No names saved yet. Add one when you fill in a slip.</p>");
    prefs.singers.forEach(function (n, i) { h += '<div class="opt f" data-act="d-rmname" data-i="' + i + '">' + esc(n) + "<span>OK to remove</span></div>"; });
    openModal(h + '<div class="btns"><span class="btn plain f" data-act="d-back2">Back</span></div>', function () { openDesk("d-names"); });
  };
  ACT["d-rmname"] = function (el) { prefs.singers.splice(+el.getAttribute("data-i"), 1); savePrefs(); ACT["d-names"](); };
  ACT["d-back2"] = function () { openDesk("d-names"); };
  function toggleSound() { prefs.sound = !prefs.sound; savePrefs(); if (prefs.sound) { audioReady(); sfx("bell"); ambience(SC === "out" ? "out" : SC === "sing" ? null : "in"); } else ambience(null); }

  // ---------- fetching: the words (LRCLIB) and the music (YouTube) ----------
  function getJSON(url, ms) {
    return new Promise(function (res, rej) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; rej(new Error("timeout")); } }, ms || 14000);
      fetch(url).then(function (r) { if (!r.ok) { var e = new Error("http " + r.status); e.status = r.status; throw e; } return r.json(); })
        .then(function (j) { if (!done) { done = true; clearTimeout(t); res(j); } }, function (e) { if (!done) { done = true; clearTimeout(t); rej(e); } });
    });
  }
  function firstArtist(a) { return String(a).split(/\s+(?:&|feat\.?|ft\.?|with|and)\s+|,\s*/i)[0]; }
  function cleanTitle(t) { return String(t).replace(/\s*\((?!I've).*?\)\s*/g, " ").replace(/^\.+/, "").trim() || t; }
  function parseLRC(txt) {
    var out = [];
    String(txt).split(/\r?\n/).forEach(function (row) {
      var re = /\[(\d+):(\d+(?:[.:]\d+)?)\]/g, m, times = [], last = 0;
      while ((m = re.exec(row))) { times.push(+m[1] * 60 + parseFloat(m[2].replace(":", "."))); last = re.lastIndex; }
      var rest = row.slice(last), text = rest.replace(/<\d+:\d+(?:[.:]\d+)?>/g, "").replace(/\s+/g, " ").trim(), wt = wordTimes(rest);
      times.forEach(function (t) { out.push({ t: t, text: text, wt: times.length === 1 ? wt : null }); });
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  // some lyrics carry a time for every word (or syllable): <mm:ss.xx> before it. Turn those into one start time per word.
  function wordTimes(rest) {
    var re = /<(\d+):(\d+(?:[.:]\d+)?)>/g, m, marks = [];
    while ((m = re.exec(rest))) marks.push({ t: +m[1] * 60 + parseFloat(m[2].replace(":", ".")), at: m.index, after: re.lastIndex });
    if (marks.length < 2) return null;
    // walk the text letter by letter, knowing which mark each letter falls under
    var words = [], cur = null, mi = -1, endT = null;
    for (var i = 0; i < rest.length; i++) {
      if (mi + 1 < marks.length && i === marks[mi + 1].at) { mi++; i = marks[mi].after - 1; continue; }
      var ch = rest.charAt(i);
      if (/\s/.test(ch)) { cur = null; continue; }
      if (!cur) { cur = { w: "", a: mi >= 0 ? marks[mi].t : null }; words.push(cur); }
      cur.w += ch;
    }
    // a mark sitting after the last word is when that word ends
    if (marks.length && marks[marks.length - 1].after >= rest.replace(/\s+$/, "").length) endT = marks[marks.length - 1].t;
    if (!words.length || words.some(function (w) { return w.a == null; })) return null;
    return { words: words, end: endT };
  }
  // from timed rows to lines with a start, an end, and a share of the time for each word
  function buildLines(raw, dur) {
    var out = [];
    raw.forEach(function (row, i) {
      if (!row.text || /^[♪\s]*$/.test(row.text)) return;
      var words = row.text.split(/\s+/), next = raw[i + 1] ? raw[i + 1].t : Math.min((dur || row.t + 6), row.t + 8);
      // real word times, when the lyrics have them
      if (row.wt && row.wt.words.length === words.length) {
        var W = row.wt.words, lastEnd = row.wt.end || Math.min(next - 0.05, W[W.length - 1].a + Math.max(0.35, 0.12 * W[W.length - 1].w.length));
        out.push({ t: Math.min(row.t, W[0].a), end: Math.max(lastEnd, W[W.length - 1].a + 0.2), text: row.text, exact: true, words: W.map(function (x, k) {
          var b = k + 1 < W.length ? W[k + 1].a : lastEnd; return { w: x.w, a: x.a, b: Math.max(x.a + 0.05, b) };
        }) });
        return;
      }
      var est = 0.9 + words.length * 0.38 + row.text.length * 0.045, end = next - row.t <= est * 1.7 ? next - 0.05 : row.t + est;
      end = Math.max(row.t + 0.6, end);
      var total = 0, w = words.map(function (x) { var k = x.replace(/[^A-Za-z0-9À-ɏ]/g, "").length + 2; total += k; return k; }), acc = 0;
      out.push({ t: row.t, end: end, text: row.text, words: words.map(function (x, k) { var a = row.t + (end - row.t) * acc / total; acc += w[k]; return { w: x, a: a, b: row.t + (end - row.t) * acc / total }; }) });
    });
    return out;
  }
  function plainRows(txt, dur) {
    var rows = String(txt).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^\[.*\]$/.test(x); });
    var a = dur * 0.07, b = dur * 0.95;
    return rows.map(function (x, i) { return { t: a + (b - a) * i / rows.length, text: x }; });
  }
  function pickLyrics(list, song) {
    var nt = norm(cleanTitle(song.t)), na = norm(firstArtist(song.a));
    function has(x) { return x && !x.instrumental && (x.syncedLyrics || x.plainLyrics) && x.duration > 30; }
    var ok = list.filter(function (x) { var t = norm(x.trackName), a = norm(x.artistName); return has(x) && (t === nt || t.indexOf(nt) === 0 || nt.indexOf(t) === 0) && (a.indexOf(na) !== -1 || na.indexOf(a) !== -1); });
    if (!ok.length) ok = list.filter(function (x) { return has(x) && norm(x.trackName).indexOf(nt) !== -1; });
    if (!ok.length) return null;
    var live = /\b(live|demo|remix|acoustic|karaoke|instrumental|version|edit)\b/;
    var studio = ok.filter(function (x) { return !live.test(norm(x.trackName).replace(nt, "")) && !/\blive\b/.test(String(x.albumName || "").toLowerCase()); });
    if (studio.length) ok = studio;
    var synced = ok.filter(function (x) { return x.syncedLyrics; }), pool = synced.length ? synced : ok, best = null, bestN = -1;
    // the length most people have filed it under is the record everyone knows
    pool.forEach(function (x) { var n = 0; ok.forEach(function (y) { if (Math.abs(y.duration - x.duration) <= 2) n++; }); if (n > bestN) { bestN = n; best = x; } });
    // among those, one that times every word beats one that only times the lines
    var exact = pool.filter(function (x) { return x.syncedLyrics && /<\d+:\d+(?:[.:]\d+)?>/.test(x.syncedLyrics) && Math.abs(x.duration - best.duration) <= 2; });
    if (exact.length) best = exact[0];
    var lines = buildLines(best.syncedLyrics ? parseLRC(best.syncedLyrics) : plainRows(best.plainLyrics, best.duration), best.duration);
    return lines.length ? { dur: best.duration, synced: !!best.syncedLyrics, exact: lines.some(function (l) { return l.exact; }), lines: lines } : null;
  }
  function findLyrics(song) {
    var base = "https://lrclib.net/api/search?", T = cleanTitle(song.t), A = firstArtist(song.a);
    return getJSON(base + "track_name=" + enc(T) + "&artist_name=" + enc(A)).then(function (l) {
      var got = pickLyrics(l || [], song); if (got) return got;
      return getJSON(base + "q=" + enc(T + " " + A)).then(function (l2) { return pickLyrics(l2 || [], song); });
    });
  }
  function isoDur(s) { var m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || ""); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; }
  function ytSearch(q) {
    var api = "https://www.googleapis.com/youtube/v3/", key = "&key=" + enc(prefs.ytKey);
    return getJSON(api + "search?part=snippet&type=video&videoEmbeddable=true&maxResults=10&q=" + enc(q) + key).then(function (j) {
      var ids = (j.items || []).map(function (i) { return i.id && i.id.videoId; }).filter(Boolean);
      if (!ids.length) return [];
      return getJSON(api + "videos?part=contentDetails,snippet&id=" + ids.join(",") + key).then(function (k) {
        return (k.items || []).map(function (v, i) { var sn = v.snippet || {}; return { id: v.id, title: String(sn.title || ""), ch: String(sn.channelTitle || ""), desc: String(sn.description || "").slice(0, 400), dur: isoDur(v.contentDetails && v.contentDetails.duration), rank: i }; });
      });
    });
  }
  function rankVideos(list, song, mode, dur) {
    var nt = norm(song.t), bad = mode === "back" ? /\b(cover|live|remix|reaction|tutorial|lesson|piano|guitar|slowed|sped|8d|nightcore|lower key|higher key|drum|bass only)\b/ : /\b(cover|live|remix|reaction|tutorial|lesson|karaoke|instrumental|slowed|sped|8d|nightcore|lyrics?)\b/;
    var want = /\b(instrumental|karaoke|backing|minus one|no vocals)\b/;
    function low(x) { return String(x).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
    var art = low(firstArtist(song.a)), seen = {};
    return list.filter(function (v) { if (seen[v.id]) return false; seen[v.id] = 1; return true; }).map(function (v) {
      var full = low(v.title), t = full.replace(low(cleanTitle(song.t)), " "), d = Math.abs(v.dur - dur), sc = d * 1.5 + v.rank * 0.4;
      var ch = low(v.ch), official = / topic$/.test(ch) || /provided to youtube by/i.test(v.desc) || (art && ch.indexOf(art) !== -1) || /\bvevo\b/.test(ch);
      if (bad.test(t)) sc += 40;
      if (mode === "back" && !want.test(t)) sc += 60;
      if (full.indexOf(low(cleanTitle(song.t))) === -1 && full.indexOf(nt) === -1) sc += 30;
      // the record company's own upload is the actual record (minus the vocals, for an instrumental),
      // so the lyric timings line up exactly. Re-recorded karaoke versions come next.
      if (official) sc -= mode === "back" ? (/instrumental/.test(t) ? 14 : 0) : 10;
      if (mode === "back" && /official instrumental/.test(t)) sc -= 6;
      if (mode === "back" && /\bkaraoke\b/.test(t) && !official) sc += 3;
      return { id: v.id, d: d, sc: sc, official: official };
    }).sort(function (a, b) { return a.sc - b.sc; });
  }
  function findVideo(song, mode, dur) {
    var memo = songMemo[songKey(song) + "|" + mode];
    if (memo && memo.v && (memo.rv === 2 || memo.off)) return Promise.resolve([{ id: memo.v, d: memo.d || 0, memo: true }]);
    if (!prefs.ytKey) { var e = new Error("nokey"); e.kind = "nokey"; return Promise.reject(e); }
    var A = firstArtist(song.a), T = cleanTitle(song.t);
    function fail(e) { if (e && (e.status === 400 || e.status === 403)) e.kind = "badkey"; throw e; }
    if (mode === "band") return ytSearch(A + " " + T + " official audio").then(function (l) { return rankVideos(l, song, mode, dur).slice(0, 4); }, fail);
    return ytSearch(A + " " + T + " instrumental").then(function (l) {
      var r = rankVideos(l, song, mode, dur);
      if (r.length && r[0].sc < 8) return r.slice(0, 4);
      return ytSearch(A + " " + T + " karaoke").then(function (l2) { return rankVideos(l.concat(l2), song, mode, dur).slice(0, 5); }, function () { return r.slice(0, 4); });
    }, fail);
  }

  // ---------- players ----------
  // YouTube, heard and not seen: the picture sits behind the painted window.
  // The player normally reports back (playing, paused, the time). Some TVs never pass those reports on, so if the
  // player stays silent the bar keeps time on its own clock instead of giving up on a tape that is playing fine.
  // YouTube refuses to play embedded videos for a page that doesn't say which website it's on, and apps on a
  // Samsung TV don't say. So the tape plays inside the jukebox page on the bar's website (player.html), which does.
  // If that page can't be reached, the bar falls back to playing YouTube directly.
  function jukeboxURL() { return store.get("snk-player-url", "") || phoneBase().replace(/index\.html$/, "") + "player.html"; }
  function urlOrigin(u) { var m = /^(https?:\/\/[^\/]+)/.exec(u); return m ? m[1] : ""; }
  function ytPlayer(id, h, songDur) {
    var p = { kind: "yt", t0: 0, at: 0, state: -1, dur: 0, dead: false, got: false, blind: false, paused: false, wrapped: true, wrapOK: false };
    var org = /^https?:\/\//.test(location.origin || "") ? "&origin=" + enc(location.origin) : "";
    var direct = "https://www.youtube-nocookie.com/embed/" + enc(id) + "?autoplay=1&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&enablejsapi=1" + org;
    var wrapURL = jukeboxURL(), wrapOrigin = urlOrigin(wrapURL), useWrap = !!wrapOrigin && !store.get("snk-nowrap", false);
    p.wrapped = useWrap;
    $("ytBox").innerHTML = '<iframe id="ytF" tabindex="-1" title="Music" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" src="' + esc(useWrap ? wrapURL + "#v=" + id : direct) + '"></iframe>';
    var fr = $("ytF"), made = performance.now(), loadedAt = 0, endT = null;
    // the jukebox page says hello as soon as it loads; if it hasn't in 7 seconds, play YouTube directly instead
    var wrapT = useWrap ? setTimeout(function () {
      if (p.dead || p.wrapOK || p.got) return;
      p.wrapped = false; loadedAt = 0; fr.src = direct;
      clearTimeout(blindT); clearTimeout(dog); blindT = setTimeout(goBlind, 9000); dog = setTimeout(function () { if (!p.dead && !p.everPlayed) h.error("stall"); }, 25000);
    }, 7000) : null;
    function post(m) { try { fr.contentWindow.postMessage(JSON.stringify(m), "*"); } catch (e) {} }
    function cmd(f, a) { post({ event: "command", func: f, args: a || [] }); }
    var hello = setInterval(function () { if (p.dead || p.got) return clearInterval(hello); post({ event: "listening", id: 1, channel: "widget" }); }, 400);
    fr.addEventListener("load", function () { loadedAt = performance.now(); post({ event: "listening", id: 1, channel: "widget" }); setTimeout(function () { if (!p.dead) cmd("playVideo"); }, 1200); });
    // silent for 8 seconds after the page loaded: play blind. Talking but never playing for 25 seconds: try the next tape.
    var blindT = setTimeout(goBlind, 9000), dog = setTimeout(function () { if (!p.dead && !p.everPlayed) h.error("stall"); }, 25000);
    function goBlind() {
      if (p.dead || p.got || p.everPlayed) { if (!p.dead && !p.got && !loadedAt) blindT = setTimeout(goBlind, 3000); return; }
      if (!loadedAt) { blindT = setTimeout(goBlind, 3000); return; }
      p.blind = true; p.everPlayed = true; clearTimeout(dog);
      // the tape usually starts a second or two after its page appears
      p.t0 = Math.max(0, (performance.now() - loadedAt) / 1000 - 2); p.at = performance.now(); p.state = 1;
      schedEnd(); h.playing();
    }
    function schedEnd() { clearTimeout(endT); if (!p.blind || p.paused) return; var left = (songDur || 240) + 2 - p.time(); endT = setTimeout(function () { if (!p.dead) h.ended(); }, Math.max(1, left) * 1000); }
    function onMsg(e) {
      if (p.dead || e.source !== fr.contentWindow) return;
      var from = String(e.origin);
      if (!(/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(from) || (p.wrapped && from === wrapOrigin))) return;
      var d = e.data; try { d = typeof d === "string" ? JSON.parse(d) : d; } catch (x) { return; }
      if (!d) return;
      if (d.event === "snk-wrap-ready") { p.wrapOK = true; clearTimeout(wrapT); return; }
      if (!p.got) { p.got = true; if (p.blind) { p.blind = false; clearTimeout(endT); } }
      if (d.event === "onError") { clearTimeout(dog); clearTimeout(blindT); return h.error(d.info); }
      if (d.event === "onReady" || d.event === "initialDelivery") cmd("playVideo");
      var info = d.info && typeof d.info === "object" ? d.info : null;
      if (info) {
        if (typeof info.duration === "number" && info.duration) p.dur = info.duration;
        if (typeof info.currentTime === "number") { p.t0 = info.currentTime; p.at = performance.now(); }
        if (typeof info.playerState === "number") setState(info.playerState);
      }
      if (d.event === "onStateChange" && typeof d.info === "number") setState(d.info);
    }
    function setState(st) {
      if (st === p.state) return;
      if (p.state === 1) { p.t0 = p.time(); p.at = performance.now(); }
      p.state = st; if (st === 1) p.at = performance.now();
      if (st === 1 && !p.everPlayed) { p.everPlayed = true; clearTimeout(dog); clearTimeout(blindT); cmd("unloadModule", ["captions"]); cmd("setVolume", [100]); h.playing(); }
      if (st === 0) h.ended();
    }
    window.addEventListener("message", onMsg);
    p.time = function () { return p.state === 1 ? p.t0 + (performance.now() - p.at) / 1000 : p.t0; };
    p.playing = function () { return p.state === 1; };
    p.pause = function () { cmd("pauseVideo"); if (p.blind) { p.t0 = p.time(); p.state = 2; p.paused = true; clearTimeout(endT); } };
    p.resume = function () { cmd("playVideo"); if (p.blind) { p.at = performance.now(); p.state = 1; p.paused = false; schedEnd(); } };
    p.seek = function (d) { var t = Math.max(0, p.time() + d); p.t0 = t; p.at = performance.now(); cmd("seekTo", [t, true]); schedEnd(); };
    p.stop = function () { p.dead = true; clearTimeout(wrapT); clearInterval(hello); clearTimeout(dog); clearTimeout(blindT); clearTimeout(endT); window.removeEventListener("message", onMsg); $("ytBox").innerHTML = ""; };
    return p;
  }
  // the house song: written for the bar, played by a little synth so it needs no internet and no key
  var HOUSE_LINES = ["Neon humming, rain on the glass", "Pull up a stool, let the long week pass", HOST + "'s got your name on a slip", "Clear your throat and loosen your grip", "It's Saturday night, so sing it loud", "Off-key heroes, we're your crowd", "One more song before we go", "Saturday night, don't take it slow"];
  var BAR_S = 2.4, HOUSE_DUR = 20 * BAR_S;
  function houseLyrics() { return { dur: HOUSE_DUR, synced: true, lines: buildLines(HOUSE_LINES.map(function (x, i) { return { t: 2 * BAR_S + i * 2 * BAR_S, text: x }; }).concat([{ t: 18 * BAR_S - 0.6, text: "" }]), HOUSE_DUR) }; }
  function housePlayer(h) {
    var AC = window.AudioContext || window.webkitAudioContext, ctx = new AC(), p = { kind: "house", dur: HOUSE_DUR, dead: false }, t0 = ctx.currentTime + 0.15;
    var out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
    function note(f, at, len, vol, type) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len); o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + len + 0.05); }
    var nb = noise(ctx);
    function hit(at, len, vol, type, fq) { var s = ctx.createBufferSource(); s.buffer = nb; var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = fq; var g = ctx.createGain(); g.gain.setValueAtTime(vol, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len); s.connect(f); f.connect(g); g.connect(out); s.start(t0 + at, Math.random() * 2); s.stop(t0 + at + len + 0.05); }
    function kick(at) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t0 + at); o.frequency.exponentialRampToValueAtTime(45, t0 + at + 0.16); g.gain.setValueAtTime(0.5, t0 + at); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.22); o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + 0.25); }
    var CH = [[130.81, 261.63, 329.63, 392], [110, 261.63, 329.63, 440], [87.31, 261.63, 349.23, 440], [98, 246.94, 293.66, 392]], beat = BAR_S / 4;
    var MEL = [[392, 392, 440, 392, 329.63, 329.63, 293.66, 261.63], [440, 440, 523.25, 440, 392, 329.63, 392, 392], [349.23, 349.23, 440, 523.25, 440, 392, 349.23, 329.63], [392, 493.88, 587.33, 493.88, 440, 392, 329.63, 293.66]];
    for (var b = 0; b < 20; b++) {
      var c = CH[b % 4], at = b * BAR_S, last = b >= 18;
      note(c[0], at, beat * 1.8, 0.2, "triangle"); note(c[0], at + beat * 2, beat * 1.6, 0.16, "triangle");
      for (var k = 1; k < 4; k++) note(c[k], at, BAR_S * 0.96, 0.035, "sine");
      if (!last) { kick(at); kick(at + beat * 2); hit(at + beat, 0.12, 0.12, "bandpass", 1800); hit(at + beat * 3, 0.12, 0.12, "bandpass", 1800); for (var e = 0; e < 8; e++) hit(at + e * beat / 2, 0.03, 0.04, "highpass", 7000); }
      if (b >= 2 && b < 18 && b % 2 === 0) { var m = MEL[(b / 2 - 1) % 4]; for (var n = 0; n < 8; n++) note(m[n], at + n * 0.45, 0.4, 0.05, "square"); }
    }
    var endT = setTimeout(function () { if (!p.dead) h.ended(); }, (HOUSE_DUR + 0.4) * 1000), paused = false;
    setTimeout(function () { if (!p.dead) h.playing(); }, 200);
    p.time = function () { return ctx.currentTime - t0; };
    p.playing = function () { return !paused; };
    p.pause = function () { paused = true; clearTimeout(endT); ctx.suspend(); };
    p.resume = function () { paused = false; ctx.resume(); endT = setTimeout(function () { if (!p.dead) h.ended(); }, Math.max(0, HOUSE_DUR + 0.4 - p.time()) * 1000); };
    p.seek = function () {};
    p.stop = function () { p.dead = true; clearTimeout(endT); try { ctx.close(); } catch (e) {} };
    return p;
  }

  // ---------- on stage ----------
  var winPainted = false, tickT = null, osdT = null;
  function paintWindow() {
    $("scSing").classList.toggle("classic", prefs.screen === "classic");
    if (!winPainted) { winPainted = true; svgToCanvas(windowPlateSVG(), $("wPlate"), yes, function () { texturize($("wPlate"), .3, false); }); }
    $("wCels").innerHTML = windowCelsSVG(prefs.barName);
  }
  function cue(k, t, s) { if (k != null) $("cueK").textContent = k; if (t != null) $("cueT").textContent = t; $("cueS").textContent = s || ""; }
  function startNext() {
    var q = queue.shift(); if (!q) return;
    ambience(null);
    fadeThen(function () {
      go("sing"); paintWindow();
      ["lyNow", "lyNext", "lyDots", "osd", "osdR"].forEach(function (id) { $(id).innerHTML = ""; }); $("lyCard").hidden = true; $("lyBreak").hidden = true;
      var c = $("cue"); c.hidden = false; c.classList.remove("open");
      cue(who(q) + " — you're up", q.song.t, HOST + " is finding the words…");
      hint("sgHint", [["", "OK  pause"], ["", "◄ ►  words earlier / later"], ["r", "Stop the song"]]);
      S = { q: q, lines: [], ni: -2, off: 0, vids: [], vi: 0, loading: true, id: Date.now() };
      var mine = S.id, load = prepare(q);
      load.then(function (d) { if (S && S.id === mine) beginSong(d); }, function (e) { if (S && S.id === mine) songFailed(e && e.kind || "net"); });
    });
  }
  function beginSong(d) {
    S.lines = d.lyr.lines; S.synced = d.lyr.synced; S.exact = !!d.lyr.exact; S.dur = d.lyr.dur; S.vids = d.vids || [];
    S.duet = !!S.q.singer2; if (S.duet) assignParts(S.lines);
    S.why = []; S.wrapNote = "";
    var h = { playing: onPlaying, ended: function () { finishSong(true); }, error: function (code) { if (!S) return; if (!S.loading) return finishSong(false); S.why.push(code + (S.player && S.player.kind === "yt" ? (S.player.wrapped ? (S.player.wrapOK ? "" : "?") : "!") : "")); if (S.player) S.player.stop(); S.vi++; tryVideo(); } };
    S.h = h;
    if (S.q.song.house) S.player = housePlayer(h); else tryVideo();
  }
  function memoKey() { return songKey(S.q.song) + "|" + S.q.mode; }
  function tryVideo() {
    var v = S.vids[S.vi];
    if (!v) { if (S.vids[0] && S.vids[0].memo) { delete songMemo[memoKey()]; store.set("snk-songs", songMemo); } return songFailed("novideo"); }
    var memo = songMemo[memoKey()]; S.off = memo && memo.v === v.id ? memo.off || 0 : 0; S.drift = v.d;
    cue(null, null, HOST + " is cueing up tape " + (S.vi + 1) + " of " + S.vids.length + "…");
    S.player = ytPlayer(v.id, S.h, S.dur);
  }
  // duets: any line that comes round more than once (the chorus) is sung together; the lines in between take turns,
  // the first stretch to the first singer, the next to the second, and so on (four lines at most per turn)
  function assignParts(L) {
    var cnt = {}, turn = 1, run = 0;
    L.forEach(function (l) { var k = norm(l.text); cnt[k] = (cnt[k] || 0) + 1; });
    L.forEach(function (l, i) {
      var shared = cnt[norm(l.text)] > 1 && norm(l.text).length > 3, gap = i && l.t - L[i - 1].end >= 2.2;
      if (shared) { l.part = 3; if (run) { turn = turn === 1 ? 2 : 1; run = 0; } return; }
      if (run && (run >= 4 || gap)) { turn = turn === 1 ? 2 : 1; run = 0; }
      l.part = turn; run++;
    });
  }
  function partLabel(l) {
    if (!S || !S.duet || !l) return null;
    var pt = l.part || 3;
    return { text: (pt === 1 ? S.q.singer : pt === 2 ? S.q.singer2 : S.q.singer + " & " + S.q.singer2).toUpperCase(), col: pt === 1 ? PIXCOL.p1 : pt === 2 ? PIXCOL.p2 : PIXCOL.both };
  }
  function onPlaying() {
    if (!S || !S.loading) return;
    S.loading = false; prefetchSoon();
    if (S.player.kind === "yt") { var v = S.vids[S.vi]; songMemo[memoKey()] = { v: v.id, d: v.d, off: S.off, rv: 2 }; store.set("snk-songs", songMemo); }
    var c = $("cue"); c.classList.add("open"); setTimeout(function () { c.hidden = true; }, 820);
    $("osdR").innerHTML = esc(who(S.q).toUpperCase()) + "<br>♪ " + (S.q.mode === "band" ? "WITH THE BAND" : S.q.mode === "house" ? "HOUSE BAND" : "BACKING TRACK");
    if (S.player.blind) flashOsd("PLAYING BY EAR — ◄ ► TO LINE THE WORDS UP", 9000);
    else if (S.exact) flashOsd("TIMED WORD BY WORD", 5000);
    else if (!S.synced) flashOsd("WORDS ONLY — ◄ ► TO KEEP THEM IN STEP", 7000); else if (S.drift > 6) flashOsd("TIMING MAY WANDER — ◄ ► TO NUDGE", 7000);
    clearInterval(tickT); tickT = setInterval(tick, 42);
  }
  function whyText(code) {
    var c = String(code), how = /[!?]$/.test(c) ? c.slice(-1) : ""; c = how ? c.slice(0, -1) : c;
    return whyText1(c) + (how === "!" ? ", played directly" : how === "?" ? ", jukebox page didn't answer" : "");
  }
  function whyText1(c) {
    if (c === "101" || c === "150") return "YouTube wouldn't play it here (" + c + ")";
    if (c === "152" || c === "153") return "YouTube couldn't tell where it was playing (" + c + ")";
    if (c === "100") return "it's been taken down";
    if (c === "5") return "the TV couldn't play it (error 5)";
    if (c === "2") return "YouTube didn't like the request (error 2)";
    if (c === "stall") return "it never started";
    return "error " + c;
  }
  function songFailed(kind) {
    var q = S && S.q, why = S && S.why || [], tried = S && S.vids ? S.vids.length : 0; stopSong();
    var detail = kind === "novideo" ? (tried ? "What happened: " + why.map(function (w, i) { return "tape " + (i + 1) + ": " + whyText(w); }).join(" · ") : "What happened: YouTube found no tapes for it.") : "";
    try { store.set("snk-lastfail", { t: Date.now(), kind: kind, song: q ? q.song.t + " — " + q.song.a : "", mode: q ? q.mode : "", why: why, tried: tried, origin: location.origin }); } catch (e) {}
    lastFailed = q;
    var msg = {
      nokey: ["The jukebox isn't plugged in", "“I've got the words, love, but no music.” The jukebox needs its key before it can play anything but the house song. Ring the bell on the counter and choose Jukebox key."],
      badkey: ["The jukebox won't take the key", "Google turned the jukebox key down. It may be mistyped, or it has used up today's searches (Google allows about a hundred a day; songs you have sung before don't use any). Ring the bell and check Jukebox key."],
      nolyrics: ["No words for that one", "“Sorry love, I can't find the words for that one.” Try another version from Ask " + HOST + "."],
      novideo: ["No music for that one", "“I've got the words but I can't find a tape that'll play.” Try it the other way: " + (q && q.mode === "band" ? "with a backing track." : "with the band, which plays the record itself.")],
      net: ["The line's dead", HOST + " couldn't reach the lyrics library or the jukebox. Check the TV's internet connection and try again."]
    }[kind] || ["That didn't work", "Something went wrong cueing that song."];
    fadeThen(function () {
      showBar();
      openModal('<div class="k">' + esc(HOST) + " taps the mic</div><h3>" + esc(msg[0]) + "</h3><p>" + esc(msg[1]) + "</p>" + (q ? '<p class="sm">' + esc(q.song.t) + " — " + esc(q.song.a) + "</p>" : "") + (detail ? '<p class="sm">' + esc(detail) + "</p>" : "") +
        '<div class="btns">' + (kind === "nokey" || kind === "badkey" ? '<span class="btn f" data-act="d-key">Jukebox key</span><span class="btn plain f" data-act="d-house">Sing the house song</span>' : "") +
        (kind === "novideo" && q && !q.song.house ? '<span class="btn f" data-act="otherway">' + (q.mode === "band" ? "Try a backing track" : "Try it with the band") + "</span>" : "") + '<span class="btn plain f" data-act="close">Back to the bar</span></div>', refresh);
    });
  }
  var lastFailed = null;
  ACT.otherway = function () { var q = lastFailed; closeModal(); if (!q) return; queue.unshift({ song: q.song, singer: q.singer, mode: q.mode === "band" ? "back" : "band" }); startNext(); };
  var pix = null;
  function stopSong() { clearInterval(tickT); tickT = null; if (pix) pix.setPage(null); if (S && S.player) S.player.stop(); S = null; }
  function flashOsd(t, ms) { S && (S.flash = t); clearTimeout(osdT); osdT = setTimeout(function () { if (S) S.flash = ""; }, ms || 2200); }
  function nudge(d) {
    if (!S || S.loading) return;
    S.off = Math.round((S.off + d) * 100) / 100;
    flashOsd("WORDS " + (S.off > 0 ? "+" : "") + S.off.toFixed(2) + "s " + (S.off > 0 ? "LATER" : S.off < 0 ? "EARLIER" : ""));
    if (S.player.kind === "yt") { var m = songMemo[memoKey()]; if (m) { m.off = S.off; store.set("snk-songs", songMemo); } }
  }
  function lineHTMLSing(l) { return l.words.map(function (w) { var t = esc(w.w); return '<span class="w">' + t + "<i>" + t + "</i></span>"; }).join(" "); }
  function tick() {
    if (!S || S.loading) return;
    var p = S.player, t = p.time(), tl = t - S.off - prefs.lag, L = S.lines, n = L.length, ni = S.ni < 0 ? 0 : S.ni;
    while (ni < n && L[ni].end <= tl) ni++;
    while (ni > 0 && L[ni - 1].end > tl) ni--;
    var now = L[ni];
    if (ni !== S.ni) { S.ni = ni; var lab = partLabel(now); pix.setPage(now, L[ni + 1], !!prefs.big, lab, lab ? lab.col : null); }
    var wait = now ? now.t - tl : 0, card = $("lyCard");
    // the title card over the intro
    var showCard = ni === 0 && now && wait > 4.5 && t < 30;
    if (showCard !== !card.hidden) { card.hidden = !showCard; if (showCard) card.innerHTML = '<div class="k">Now singing · ' + esc(who(S.q)) + '</div><div class="t">' + esc(S.q.song.t) + '</div><div class="s">' + esc(S.q.song.a) + "</div>"; }
    // the count-in: four lamps, one goes out each second
    var lit = now && wait > 0 && wait <= 4 && (ni === 0 || now.t - L[ni - 1].end >= 4) ? Math.ceil(wait) : -1;
    var brk = !!(now && ni > 0 && wait > 4 && now.t - L[ni - 1].end >= 9) || (!now && n > 0 && S.dur - tl > 6);
    if (brk !== !$("lyBreak").hidden) $("lyBreak").hidden = !brk;
    pix.draw(tl, lit, !!now && wait <= 4.5);
    var osd = (S.flash ? S.flash + "\n" : "") + (p.playing() ? "▶ PLAY   " : "❚❚ PAUSE  ") + mmss(t) + (S.dur ? " / " + mmss(p.dur || S.dur) : "");
    if (S.osd !== osd) { S.osd = osd; $("osd").textContent = osd; }
  }
  var VERDICTS = [[98, "A star is born."], [96, "The whole bar felt that."], [94, "Rhonda wiped away a tear."], [91, "Somebody get this one an agent."], [89, "Loud, proud and nearly in key."], [87, "The mirror ball approves."], [85, "Full marks for commitment."], [83, "You meant every word."]];
  function finishSong(natural) {
    if (!S) return;
    var q = S.q, sung = S.player ? S.player.time() : 0, enough = natural || sung > 45 || (S.dur && sung > S.dur * 0.5);
    stopSong(); pix.setPage(null); $("lyNow").innerHTML = ""; $("lyNext").textContent = ""; $("lyDots").innerHTML = ""; $("lyBreak").hidden = true; $("lyCard").hidden = true; $("osd").textContent = "";
    if (!enough) { fadeThen(function () { showBar(); say("No shame in it, " + who(q) + ". Come back up whenever you like."); }); return; }
    var v = pick(VERDICTS), score = v[0] + Math.floor(Math.random() * 2);
    wall.unshift({ who: who(q), t: q.song.t, a: q.song.a, s: score, d: Date.now() }); wall = wall.slice(0, 40); store.set("snk-wall", wall);
    audioReady(); sfx("applause");
    var nx = queue[0];
    openModal('<div class="k">The machine has spoken · ' + esc(who(q)) + '</div><div class="score" id="scoreN">00</div><div class="verdict">' + esc(v[1].replace("Rhonda", HOST)) + '</div><p class="sm" style="text-align:center">' + esc(q.song.t) + " — " + esc(q.song.a) + " · your polaroid's going on the wall</p>" +
      '<div class="btns" style="text-align:center">' + (nx ? '<span class="btn f" data-act="nextup">Next: ' + esc(clip(who(nx), 16)) + " — " + esc(clip(nx.song.t, 20)) + "</span>" : "") + '<span class="btn ' + (nx ? "plain " : "") + 'f" data-act="tobar">Back to the bar</span><span class="btn plain f" data-act="again">Sing it again</span></div>', function () { ACT.tobar(); }, "receipt");
    lastSung = q;
    var n = 0, el = $("scoreN"), iv = setInterval(function () {
      n += Math.ceil((score - n) / 6) || 1;
      if (n >= score) {
        n = score; clearInterval(iv); sfx("ta-da");
        // with someone waiting, the countdown to the next singer starts on its own after a moment
        clearTimeout(autoNext); if (queue.length) autoNext = setTimeout(function () { if ($("scoreN") && !$("modal").hidden) { closeModal(); startIntermission(); } }, 7000);
      } else sfx("score");
      if (el) el.textContent = n;
    }, 83);
  }
  var lastSung = null;
  var autoNext = null;
  ACT.nextup = function () { clearTimeout(autoNext); closeModal(); startIntermission(); };
  ACT.tobar = function () { clearTimeout(autoNext); closeModal(); fadeThen(showBar); };
  ACT.again = function () { clearTimeout(autoNext); closeModal(); if (lastSung) { queue.unshift(lastSung); startNext(); } };

  // ---------- the sound check: line the flash up with the click, and the words line up with the music ----------
  // A soundbar takes a moment to play what the TV sends it. A click plays on a steady beat and a lamp flashes with
  // it; you move the flash until it lands on the click you hear. That gap is how long the words should wait.
  var CHK = null;
  function lagFmt(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + " s"; }
  function lagText() { return !prefs.lagSet ? "Not done yet" : Math.abs(prefs.lag) < 0.005 ? "No delay" : prefs.lag > 0 ? "Words wait " + prefs.lag.toFixed(2) + " s for the sound" : "Words go " + (-prefs.lag).toFixed(2) + " s early"; }
  function startCheck() {
    if (!audioReady()) { say("This TV can't play the clicks, love."); return; }
    ambience(null);
    go("sing"); paintWindow(); clearScreen();
    ["osd", "osdR"].forEach(function (id) { $(id).innerHTML = ""; }); $("lyCard").hidden = true; $("lyBreak").hidden = true; $("cue").hidden = true;
    hint("sgHint", [["", "◄ ►  move the flash"], ["", "OK  keep it"], ["", "BACK  leave it as it was"]]);
    CHK = { lag: prefs.lag, next: ac.currentTime + 0.5, flashes: [], timer: null, raf: null };
    drawCheck(); $("chkLamp").hidden = false;
    CHK.timer = setInterval(checkSchedule, 80); checkSchedule();
    CHK.raf = requestAnimationFrame(checkFrame);
  }
  function drawCheck() {
    var rows = pixCard($("lyCv"), [
      { t: "SOUND CHECK", size: 14, col: PIXCOL.dim },
      { t: "Press LEFT or RIGHT until the flash", size: 13, col: PIXCOL.cur, gap: 50 },
      { t: "lands right on the click you hear", size: 13, col: PIXCOL.cur },
      { t: lagFmt(CHK.lag), size: 26, col: PIXCOL.sung, gap: 8 }
    ]);
    var top = rows[0].y + rows[0].h, bottom = rows[1].y;
    $("chkLamp").style.top = Math.round((top + bottom) / 2 - 95) + "px";
  }
  function checkClick(at) {
    var o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.value = 1760;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.22, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + 0.07);
  }
  function checkSchedule() {
    if (!CHK) return;
    while (CHK.next < ac.currentTime + 0.25) {
      var at = CHK.next; checkClick(at);
      CHK.flashes.push(performance.now() + (at - ac.currentTime) * 1000);
      CHK.next += 0.8;
    }
    var old = performance.now() - 3000; CHK.flashes = CHK.flashes.filter(function (f) { return f > old; });
  }
  function checkFrame() {
    if (!CHK) return;
    var now = performance.now(), on = false;
    for (var i = 0; i < CHK.flashes.length; i++) { var st = CHK.flashes[i] + CHK.lag * 1000; if (now >= st && now < st + 110) { on = true; break; } }
    var l = $("chkLamp"); if (l.classList.contains("on") !== on) l.classList.toggle("on", on);
    CHK.raf = requestAnimationFrame(checkFrame);
  }
  function endCheck(keep) {
    if (!CHK) return;
    clearInterval(CHK.timer); cancelAnimationFrame(CHK.raf);
    var lag = CHK.lag; CHK = null; $("chkLamp").hidden = true; $("chkLamp").classList.remove("on"); clearScreen();
    if (keep) { prefs.lag = Math.round(lag * 100) / 100; prefs.lagSet = true; savePrefs(); }
    fadeThen(function () { showBar(); if (keep) say(Math.abs(prefs.lag) < 0.005 ? "Sound check done. No delay to make up." : "Sound check done. The words will wait " + prefs.lag.toFixed(2) + " s for your speakers.", HOST, 5000); });
  }

  // ---------- between singers: the old machine's countdown, fifteen seconds, skippable ----------
  var INT = null;
  function clearScreen() { var c = $("lyCv"); c.getContext("2d").clearRect(0, 0, c.width, c.height); if (pix) pix.setPage(null); }
  function startIntermission() {
    if (!queue.length) { fadeThen(showBar); return; }
    if (INT) clearInterval(INT.t);
    go("sing"); paintWindow(); clearScreen();
    ["osd", "osdR"].forEach(function (id) { $(id).innerHTML = ""; }); $("lyCard").hidden = true; $("lyBreak").hidden = true; $("cue").hidden = true;
    hint("sgHint", [["", "OK  start now"], ["r", "Skip this slip"], ["", "BACK  to the bar"]]);
    INT = { left: 15, t: setInterval(intTick, 1000) };
    drawInt(); prefetchSoon(); sendState(true);
  }
  function drawInt() {
    var q = queue[0]; if (!INT || !q) return;
    pixCard($("lyCv"), [
      { t: "NEXT UP", size: 12, col: PIXCOL.dim },
      { t: who(q).toUpperCase(), size: 25, col: q.singer2 ? PIXCOL.p2 : PIXCOL.sung, gap: 2 },
      { t: (q.song.code ? q.song.code + "  " : "") + q.song.t, size: 17, col: PIXCOL.cur, gap: 6 },
      { t: q.song.a, size: 12, col: PIXCOL.next },
      { t: String(INT.left), size: 30, col: PIXCOL.cur, gap: 26 }
    ], { left: INT.left, of: 15 });
  }
  function intTick() {
    if (!INT) return;
    INT.left--;
    if (INT.left <= 0) { sfx("bell"); endIntermission(true); return; }
    sfx(INT.left <= 3 ? "pip" : "tick"); drawInt();
  }
  function endIntermission(start) { if (!INT) return; clearInterval(INT.t); INT = null; clearScreen(); if (start) startNext(); }

  // ---------- the remote ----------
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 10009, ESC: 27, BKSP: 8, RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406, PLAY: 415, PAUSE: 19, PP: 10252, STOP: 413, RW: 412, FF: 417, IME_DONE: 65376, IME_CANCEL: 65385 };
  ["ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue", "MediaPlayPause", "MediaPlay", "MediaPause", "MediaStop", "MediaRewind", "MediaFastForward"].forEach(function (k) { try { tizen.tvinputdevice.registerKey(k); } catch (e) {} });
  function onKey(e) {
    var k = e.keyCode, typing = document.activeElement === $("oskReal");
    audioReady();
    if (typing) { if (k === KEY.OK || k === KEY.IME_DONE || k === KEY.IME_CANCEL || k === KEY.BACK || k === KEY.ESC) { e.preventDefault(); $("oskReal").blur(); } return; }
    // a desk keyboard stands in for the coloured buttons when you try the bar on a computer
    if (!osk && e.key && e.key.length === 1) { var m = { r: KEY.RED, g: KEY.GREEN, y: KEY.YELLOW, b: KEY.BLUE }[e.key.toLowerCase()]; if (m) k = m; }
    var dir = k === KEY.LEFT ? [-1, 0] : k === KEY.RIGHT ? [1, 0] : k === KEY.UP ? [0, -1] : k === KEY.DOWN ? [0, 1] : null;
    if (dir || k === KEY.OK || k === KEY.BACK || k === KEY.ESC || k === KEY.BKSP || (k >= 403 && k <= 406)) e.preventDefault();
    if (osk) {
      if (dir) move(dir[0], dir[1]);
      else if (k === KEY.OK) activate(cur());
      else if (k === KEY.BACK || k === KEY.ESC) boardCancel();
      else if (k === KEY.BKSP || k === KEY.RED) { osk.v = osk.v.slice(0, -1); showBoard(); sfx("tap"); }
      else if (k === KEY.BLUE) boardDone();
      else if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) { boardType(e.key); e.preventDefault(); }
      return;
    }
    if (!$("modal").hidden) {
      if (dir) move(dir[0], dir[1]);
      else if (k === KEY.OK) { sfx("tap"); activate(cur()); }
      else if (k === KEY.BACK || k === KEY.ESC) ACT.close();
      return;
    }
    if (k === KEY.BLUE) { toggleSound(); if (SC === "bar") paintBar(); else say(prefs.sound ? "Sounds on." : "Sounds off.", "The bar", 1600); return; }
    if (SC === "out") {
      if (entering) return;
      if (k === KEY.OK) enterBar();
      else if (k === KEY.BACK || k === KEY.ESC) { try { tizen.application.getCurrentApplication().exit(); } catch (x) {} }
    } else if (SC === "bar") {
      if (dir) move(dir[0], dir[1]);
      else if (k === KEY.OK) { sfx("tap"); activate(cur()); }
      else if (k === KEY.YELLOW) openBoardList();
      else if (k === KEY.GREEN) say("Rewind Night's coming. I'm still digging out the old songbooks.");
      else if (k === KEY.BACK || k === KEY.ESC) fadeThen(function () { showOutside(false); });
    } else if (SC === "book") {
      if (dir) bookMove(dir[0], dir[1]);
      else if (k === KEY.OK) { sfx("tap"); activate(cur()); }
      else if (k === KEY.YELLOW) openBoardList();
      else if (k === KEY.BACK || k === KEY.ESC) { sfx("close"); showBar(); }
    } else if (SC === "sing" && CHK) {
      if (k === KEY.LEFT) { CHK.lag = Math.max(-0.3, Math.round((CHK.lag - 0.02) * 100) / 100); drawCheck(); }
      else if (k === KEY.RIGHT) { CHK.lag = Math.min(1, Math.round((CHK.lag + 0.02) * 100) / 100); drawCheck(); }
      else if (k === KEY.OK) endCheck(true);
      else if (k === KEY.BACK || k === KEY.ESC) endCheck(false);
    } else if (SC === "sing" && INT) {
      if (k === KEY.OK || k === KEY.PLAY || k === KEY.PP) { sfx("bell"); endIntermission(true); }
      else if (k === KEY.BACK || k === KEY.ESC || k === KEY.STOP) { endIntermission(false); fadeThen(showBar); }
      else if (k === KEY.RED) {
        var gone = queue.shift(); sfx("flip");
        if (queue.length) { INT.left = 15; drawInt(); flashSay(gone); }
        else { endIntermission(false); fadeThen(function () { showBar(); say("That's the list done. Who's next?"); }); }
      }
    } else if (SC === "sing") {
      if (!S) return;
      if (k === KEY.RED || k === KEY.STOP || k === KEY.BACK || k === KEY.ESC) { if (S.loading) { stopSong(); fadeThen(showBar); } else finishSong(false); }
      else if (S.loading) return;
      else if (k === KEY.OK || k === KEY.PP || k === KEY.PLAY || k === KEY.PAUSE) { if (S.player.playing()) S.player.pause(); else S.player.resume(); }
      else if (k === KEY.LEFT) nudge(-0.25);
      else if (k === KEY.RIGHT) nudge(0.25);
      else if (k === KEY.RW) S.player.seek(-10);
      else if (k === KEY.FF) S.player.seek(10);
    }
  }
  function flashSay(q) { if (q) say(who(q) + "'s slip is off the board.", HOST, 2500); }
  document.addEventListener("keydown", onKey);
  // a mouse or a finger works too, for trying it on a computer or a phone
  document.addEventListener("click", function (e) {
    audioReady();
    var el = e.target.closest ? e.target.closest(".f") : null;
    if (el && scope().contains(el)) { var was = cur() === el; setFocus(el, true); if (was || !el.classList.contains("tab")) activate(el); return; }
    if (osk || !$("modal").hidden) return;
    if (SC === "out" && !entering) enterBar();
    else if (SC === "sing" && CHK) endCheck(true);
    else if (SC === "sing" && INT) endIntermission(true);
    else if (SC === "sing" && S && !S.loading) { if (S.player.playing()) S.player.pause(); else S.player.resume(); }
  });
  window.addEventListener("resize", fit);
  pix = new PixLyrics($("lyCv"));
  applyLights(); setInterval(applyLights, 60000);
  try { lineStart(); } catch (e) {}

  // ---------- open up ----------
  fit();
  $("stage").classList.toggle("bigly", !!prefs.big);
  $("grain").style.backgroundImage = "url(" + grainTexture() + ")";
  Array.prototype.forEach.call(document.querySelectorAll(".rain.near i"), function (i) { i.style.backgroundImage = dropTile(320, 22, 26, 52, 2.2, .3, .6, 31); });
  Array.prototype.forEach.call(document.querySelectorAll(".rain.far i"), function (i) { i.style.backgroundImage = dropTile(220, 40, 12, 26, 1.4, .22, .5, 57); });
  function open() { showOutside(true); setTimeout(function () { $("fade").classList.remove("on"); }, 350); }
  try { if (document.fonts && document.fonts.load) { var opened = false, o1 = function () { if (!opened) { opened = true; open(); } }; Promise.all([document.fonts.load("40px Caprasimo"), document.fonts.load("600 20px Oswald"), document.fonts.load("20px VT323"), document.fonts.load("bold 19px SNKPix")]).then(o1, o1); setTimeout(o1, 2500); } else open(); } catch (e) { open(); }
  setInterval(function () { if (SC === "out") { $("oClock").textContent = clockText(); if (Date.now() - outPainted > 20 * 60000 && !entering) paintOutside(); } else if (SC === "bar" || SC === "book") lastCall(); }, 30000);
  // tell the loader this release opened properly, so it becomes the saved copy on this TV
  setTimeout(function () {
    try {
      var pend = localStorage.getItem("snk-boot-pending"); if (!pend) return;
      var html = null; try { html = sessionStorage.getItem("snk-next-html"); } catch (e) {}
      if (html) localStorage.setItem("snk-bar-cache", html);
      localStorage.setItem("snk-good", JSON.stringify({ ref: pend, version: APP_VERSION, t: Date.now() }));
      localStorage.removeItem("snk-boot-pending"); localStorage.removeItem("snk-boot-fails");
      try { sessionStorage.removeItem("snk-next-html"); } catch (e) {}
    } catch (e) {}
  }, 5000);
  window.__snk = { add: function (o) { return addToQueue(o); }, lines: function () { return S ? S.lines.slice(0, 3) : null; }, state: function () { return { sc: SC, int: INT ? INT.left : null, lag: prefs.lag, chk: CHK ? CHK.lag : null, prep: Object.keys(prep), queue: queue.length, q: queue.map(function (q) { return who(q) + ":" + q.song.t + ":" + q.mode; }), key: prefs.ytKey ? "set" : "", line: lineUp, link: canPhone() ? phoneLink() : "", song: S ? { loading: S.loading, ni: S.ni, lines: S.lines.length } : null }; } };
