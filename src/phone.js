  // ===== the phone songbook =====
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function enc(s) { return encodeURIComponent(s); }
  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ldel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var pair = null, keyBytes = null, me = lget("snk-phone-id"), line = null, lineUp = false, pending = {}, tvState = null, lastHello = 0;
  var tab = 0, asked = null, slip = null, mode = lget("snk-phone-mode") === "band" ? "band" : "back";
  var PTABS = TABS.filter(function (t) { return t.id !== "ask"; });
  if (!me) { me = randomId(12); lset("snk-phone-id", me); }

  // the code from the TV arrives after the # in the address, and is remembered on this phone
  function readPair() {
    var m = /^#?([a-z0-9]{16})\.([A-Za-z0-9_\-]{43})$/.exec(location.hash || "");
    if (m) lset("snk-phone-pair", m[1] + "." + m[2]);
    var saved = /^([a-z0-9]{16})\.([A-Za-z0-9_\-]{43})$/.exec(lget("snk-phone-pair") || "");
    if (!saved) return null;
    try { var kb = unb64(saved[2]); if (kb.length !== 32) return null; keyBytes = kb; } catch (e) { return null; }
    return { room: saved[1] };
  }
  function topicTV() { return "snk" + pair.room + "t"; }
  function topicPh() { return "snk" + pair.room + "p"; }

  var toastT = null;
  function toast(text, who, ms) {
    var el = $("toast"); el.innerHTML = "<small>" + esc(who || HOST) + "</small>" + esc(text); el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, ms || 4500);
  }
  function setLine(up) {
    lineUp = up; var el = $("line");
    el.className = "pill" + (up ? " up" : ""); el.textContent = up ? "On the line to the bar" : "Reaching the bar…";
    if (up && Date.now() - lastHello > 30000) { lastHello = Date.now(); send({ t: "hello" }).catch(function () {}); }
  }
  function send(obj) { obj.from = me; return relaySend(topicTV(), obj, keyBytes); }
  // send something the TV answers (a slip, the jukebox key) and wait for its answer
  function ask(obj, cb) {
    var id = randomId(12); obj.id = id;
    var t = setTimeout(function () { if (pending[id]) { delete pending[id]; cb({ ok: false, why: "silent" }); } }, 12000);
    pending[id] = function (a) { clearTimeout(t); cb(a); };
    send(obj).catch(function (e) { if (pending[id]) { clearTimeout(t); delete pending[id]; cb({ ok: false, why: e && e.status === 429 ? "busy" : "net" }); } });
  }
  function onTV(m) {
    if (m.t === "state") { tvState = m; renderState(); }
    else if (m.t === "ack" && pending[m.id]) { var f = pending[m.id]; delete pending[m.id]; f(m); }
  }
  function renderState() {
    var s = tvState; if (!s) return;
    var parts = String(s.bar || "").replace(/\s+/g, " ").trim().split(" "), last = parts.length > 1 ? parts.pop() : parts[0] || "Karaoke";
    $("bn1").textContent = parts.length && parts[0] !== last ? parts.join(" ") : ""; $("bn2").textContent = last.toUpperCase();
    document.title = (s.bar || "Karaoke") + " · Songbook";
    var h = "";
    if (s.now) h += '<div class="k">Now singing</div><div class="now">' + esc(s.now.s) + "<small>" + esc(s.now.t) + " — " + esc(s.now.a) + "</small></div>";
    if (s.q && s.q.length) {
      h += '<div class="k"' + (s.now ? ' style="margin-top:12px"' : "") + ">Up next</div><ol>" + s.q.map(function (q) { return "<li>" + esc(q.s) + "<small>" + esc(q.t) + " — " + esc(q.a) + "</small></li>"; }).join("") + "</ol>";
      if (s.n > s.q.length) h += '<p class="sm">…and ' + (s.n - s.q.length) + " more.</p>";
    } else if (!s.now) h += '<div class="k">Up next</div><p class="sm" style="margin-bottom:0">Nobody on the list yet. Yours could be first.</p>';
    if (!s.key) h += '<p class="sm" style="margin-bottom:0">The TV’s jukebox key isn’t set yet, so only the house song will play. Tap the cog to send one.</p>';
    $("upnext").innerHTML = h; $("upnext").hidden = false;
  }

  // ---------- the book ----------
  function lineHTML(s, i, from) {
    return '<button type="button" class="ln" data-from="' + from + '" data-i="' + i + '"><span class="code">' + (s.code || "····") + '</span><span class="t">' + esc(s.t) + (s.note ? '<span class="star">' + esc(s.note) + "</span>" : "") + '</span><span class="a">' + esc(s.a) + (s.y ? " · " + s.y : "") + "</span></button>";
  }
  function renderTabs() {
    $("tabs").innerHTML = PTABS.map(function (t, i) { return '<button type="button" class="tab' + (i === tab && !asked ? " cur" : "") + '" data-i="' + i + '" style="background:' + t.c + '">' + esc(t.n) + "</button>"; }).join("");
  }
  var shown = [];
  function renderList() {
    renderTabs();
    var h = "";
    if (asked) {
      h += "<h2>“" + esc(asked.q) + "”</h2>";
      if (asked.state) h += '<div class="note">' + esc(asked.state) + "</div>";
      shown = asked.res; h += shown.map(function (s, i) { return lineHTML(s, i, "ask"); }).join("");
    } else {
      shown = tabSongs(PTABS[tab].id);
      h += "<h2>" + esc(PTABS[tab].h) + "</h2>" + shown.map(function (s, i) { return lineHTML(s, i, "tab"); }).join("");
    }
    $("list").innerHTML = h;
  }
  function doAsk(q) {
    q = q.replace(/\s+/g, " ").trim(); if (!q) { asked = null; renderList(); return; }
    asked = { q: q, state: HOST + " is flicking through her folders…", res: [] }; renderList();
    var mine = asked;
    fetch("https://lrclib.net/api/search?q=" + enc(q)).then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); }).then(function (list) {
      if (asked !== mine) return;
      var seen = {}, out = [];
      (list || []).forEach(function (x) {
        if (x.instrumental || !(x.syncedLyrics || x.plainLyrics) || !x.trackName || !x.artistName) return;
        var k = norm(x.artistName) + "|" + norm(x.trackName), have = seen[k];
        if (have) { if (x.syncedLyrics) have.note = ""; return; }
        out.push(seen[k] = { t: x.trackName, a: x.artistName, y: 0, f: "", note: x.syncedLyrics ? "" : "words only" });
      });
      asked.res = out.slice(0, 40); asked.state = out.length ? "" : "“Sorry love, I can’t find the words for that one.” Try the song title and the singer together.";
      renderList();
    }).catch(function () { if (asked !== mine) return; asked.state = "Couldn’t reach the lyrics library. Check this phone’s connection and ask again."; renderList(); });
  }

  // ---------- the slip ----------
  function openSlip(song) {
    slip = { song: song, sent: false };
    var h = '<div class="slip"><div class="k">Request slip</div><div class="song">' + esc(song.t) + '</div><div class="art">' + esc(song.a) + (song.y ? " · " + song.y : "") + "</div>" +
      '<label for="singer">Who’s singing</label><input class="field" id="singer" maxlength="18" autocomplete="given-name" placeholder="Your name" value="' + esc(lget("snk-phone-name") || "") + '">' +
      '<label for="partner">Duet partner' + (/d/.test(song.f || "") ? "" : " (optional)") + '</label><input class="field" id="partner" maxlength="18" autocomplete="off" placeholder="' + (/d/.test(song.f || "") ? "Who’s singing with you?" : "Leave empty to sing solo") + '">';
    if (!song.house) h += '<label>The music</label><div class="seg"><button type="button" data-m="back"' + (mode === "back" ? ' class="sel"' : "") + '>Backing track<small>just the music</small></button><button type="button" data-m="band"' + (mode === "band" ? ' class="sel"' : "") + ">With the band<small>the record, vocals and all</small></button></div>";
    h += '<button type="button" class="btn" id="sendSlip">Send it to ' + esc(HOST) + '</button><button type="button" class="btn plain" id="closeSheet">Never mind</button><div class="msg" id="slipMsg" role="status"></div></div>';
    $("sheet").innerHTML = h; $("sheet").hidden = false;
  }
  function closeSheet() { $("sheet").hidden = true; $("sheet").innerHTML = ""; slip = null; }
  var WHY = {
    silent: "No answer from the bar. Is the TV on, with the karaoke bar open?",
    net: "Couldn’t reach the relay. Check this phone’s connection and try again.",
    busy: "The line’s busy. Give it a minute and try again.",
    full: "The request board is full. Try again after a few songs.",
    bad: "The bar couldn’t read that one. Try again.",
    closed: "Open “Jukebox key” on the TV first: ring the bell on the counter, choose Jukebox key, and keep that card open."
  };
  function sendSlip() {
    if (!slip || slip.sent) return;
    var name = $("singer").value.replace(/\s+/g, " ").trim().slice(0, 18), btn = $("sendSlip"), msg = $("slipMsg"), s = slip.song;
    var partner = $("partner") ? $("partner").value.replace(/\s+/g, " ").trim().slice(0, 18) : "", both = partner ? name + " & " + partner : name;
    if (!name) { msg.textContent = "Put a name on the slip so " + HOST + " can call you up."; $("singer").focus(); return; }
    lset("snk-phone-name", name); slip.sent = true; btn.disabled = true; btn.textContent = "Handing it over…"; msg.textContent = "";
    var mine = slip;
    ask({ t: "req", singer: name, singer2: partner, mode: mode, song: { t: s.t, a: s.a, y: s.y || 0, house: !!s.house, d: /d/.test(s.f || ""), code: s.code || 0 } }, function (a) {
      if (slip !== mine) { if (a.ok) toast("Got it, " + both + ". You’re number " + a.pos + " on the list."); return; }
      if (!a.ok) { slip.sent = false; btn.disabled = false; btn.textContent = "Send it to " + HOST; msg.textContent = WHY[a.why] || WHY.bad; return; }
      btn.textContent = "On the list";
      var st = document.createElement("div"); st.className = "stamp"; st.innerHTML = "ON THE LIST<br>No. " + (+a.pos || 1); $("sheet").querySelector(".slip").appendChild(st);
      setTimeout(function () { if (slip === mine) closeSheet(); toast("Got it, " + both + ". You’re number " + (+a.pos || 1) + " on the list."); }, 1500);
    });
  }

  // ---------- settings ----------
  function openSettings() {
    slip = null;
    $("sheet").innerHTML = '<div class="slip plain"><div class="k">Behind the bar</div><h2>The jukebox key</h2>' +
      "<p>The TV needs a free key from Google before it can play anything but the house song. Sending it from here saves typing it with the remote.</p>" +
      '<p class="sm">On the TV: ring the bell on the counter, choose <b>Jukebox key</b>, and leave that card open. Then paste the key here and send it.</p>' +
      '<label for="ytkey">Key from Google</label><input class="field" id="ytkey" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…">' +
      '<button type="button" class="btn" id="sendKey">Send the key to the TV</button><div class="msg" id="keyMsg" role="status"></div>' +
      '<h2 style="margin-top:18px">This phone</h2><p class="sm">This phone is joined to one bar. Forgetting it means scanning the code on the TV again.</p>' +
      '<button type="button" class="btn plain" id="forget">Forget this bar</button><button type="button" class="btn plain" id="closeSheet">Close</button></div>';
    $("sheet").hidden = false;
  }
  function sendKey() {
    var k = $("ytkey").value.replace(/\s/g, ""), msg = $("keyMsg"), btn = $("sendKey");
    if (!/^[A-Za-z0-9_\-]{20,60}$/.test(k)) { msg.textContent = "That doesn’t look like a key. It’s about 39 letters and numbers, usually starting with AIza."; return; }
    btn.disabled = true; msg.textContent = "Sending…";
    ask({ t: "key", key: k }, function (a) {
      if (!$("keyMsg")) return;
      btn.disabled = false;
      if (a.ok) { $("ytkey").value = ""; msg.style.color = "#1d7a45"; msg.textContent = "The TV has it. The jukebox is plugged in."; }
      else { msg.style.color = ""; msg.textContent = a.why === "bad" ? "The TV didn’t accept that key. Check it and try again." : WHY[a.why] || WHY.silent; }
    });
  }

  // ---------- taps ----------
  document.addEventListener("click", function (e) {
    var t = e.target, el;
    if ((el = t.closest(".ln"))) { var s = shown[+el.getAttribute("data-i")]; if (s) openSlip(s); }
    else if ((el = t.closest(".tab"))) { tab = +el.getAttribute("data-i"); asked = null; $("ask").value = ""; renderList(); }
    else if ((el = t.closest(".seg button"))) { mode = el.getAttribute("data-m"); lset("snk-phone-mode", mode); Array.prototype.forEach.call(el.parentNode.children, function (b) { b.className = b === el ? "sel" : ""; }); }
    else if (t.id === "sendSlip") sendSlip();
    else if (t.id === "closeSheet" || t === $("sheet")) closeSheet();
    else if (t.id === "cog") { if (pair) openSettings(); }
    else if (t.id === "sendKey") sendKey();
    else if (t.id === "forget") { ldel("snk-phone-pair"); try { history.replaceState(null, "", location.pathname); } catch (x) {} location.reload(); }
  });
  $("askForm").addEventListener("submit", function (e) { e.preventDefault(); $("ask").blur(); doAsk($("ask").value); });
  $("ask").addEventListener("search", function () { if (!$("ask").value) { asked = null; renderList(); } });

  // ---------- open up ----------
  function start() {
    pair = readPair();
    if (!pair) { $("nopair").hidden = false; $("main").hidden = true; $("upnext").hidden = true; $("line").textContent = "Not joined to a bar"; return; }
    $("nopair").hidden = true; $("main").hidden = false;
    renderList();
    if (!window.EventSource) { $("line").textContent = "This browser can’t hold the line open"; return; }
    if (line) line.close();
    line = relayListen(topicPh(), keyBytes, onTV, setLine);
    lastHello = Date.now(); send({ t: "hello" }).catch(function () {});
  }
  window.addEventListener("hashchange", start);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && pair && Date.now() - lastHello > 60000) { lastHello = Date.now(); send({ t: "hello" }).catch(function () {}); } });
  start();
