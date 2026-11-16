  var NEON = { pink: "#ff5fa2", teal: "#62e8de", amber: "#ffc857", violet: "#b48cff", red: "#ff5a4d" };
  var SPINES = ["#c4313d", "#1e3d93", "#f2efe6", "#1b1b22", "#e2b33c", "#2f7a52", "#6b3f8c", "#d96b2b", "#3b8bc4", "#e7e2d2", "#8f2a52", "#0f2c5c"];
  function svgWrap(body, w, h) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (w || 1920) + '" height="' + (h || 1080) + '" viewBox="0 0 1920 1080">' + body + "</svg>"; }
  // "Saturday Night Karaoke" -> ["Saturday Night", "Karaoke"]: the last word gets the big letters
  function splitName(name) {
    var w = String(name || "").replace(/\s+/g, " ").trim().split(" ");
    if (w.length < 2) return ["", w[0] || ""];
    var last = w.pop(); return [w.join(" "), last];
  }
  function fitSize(txt, maxW, maxSize, k) { return Math.max(16, Math.min(maxSize, Math.floor(maxW / (Math.max(1, txt.length) * k)))); }
  // a neon tube the cel way: two flat rings of glow, then the hot tube
  function neonText(x, y, size, txt, col, fam, ex) {
    var a = ' font-family="' + (fam || YT) + '" font-size="' + size + '" text-anchor="middle" x="' + x + '" y="' + y + '"' + (ex || ""), t = esc(txt);
    return "<text" + a + ' fill="none" stroke="' + col + '" stroke-width="' + n1(size * .34) + '" stroke-opacity=".14" stroke-linejoin="round">' + t + "</text>" +
      "<text" + a + ' fill="none" stroke="' + col + '" stroke-width="' + n1(size * .16) + '" stroke-opacity=".3" stroke-linejoin="round">' + t + "</text>" +
      "<text" + a + ' fill="' + cmix(col, "#ffffff", .78) + '" stroke="' + col + '" stroke-width="' + n1(Math.max(1.5, size * .045)) + '">' + t + "</text>";
  }
  function neonNote(x, y, s, col) {
    var d = "M" + x + "," + y + " l0," + (-52 * s) + " l" + (26 * s) + "," + (10 * s) + " l0," + (14 * s);
    var head = '<ellipse cx="' + n1(x - 9 * s) + '" cy="' + y + '" rx="' + n1(10 * s) + '" ry="' + n1(7.5 * s) + '" transform="rotate(-18 ' + n1(x - 9 * s) + " " + y + ')"';
    function lay(w, a, c) { return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-opacity="' + a + '" stroke-linecap="round" stroke-linejoin="round"/>' + head + ' fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-opacity="' + a + '"/>'; }
    return lay(16 * s, .14, col) + lay(9 * s, .3, col) + lay(3.4 * s, 1, cmix(col, "#ffffff", .7));
  }

  // =================== outside: the footpath in front of the bar, the video store's sign next door ===================
  function outLookNow() {
    var h = new Date().getHours(), P = outLook(h >= 6 && h < 19 ? "sunset" : "night", "cloudy");
    P.wet = true;   // it has always just rained on this street
    return P;
  }
  function farCity(P) {
    var r = rand(23), o = "", x = -20, w, h, wx, wy;
    var c1 = Hz(P, Sc(P, "#5a5878"), .5), c2 = Hz(P, Sc(P, "#4a4868"), .22);
    while (x < 1940) {
      w = 50 + r() * 90; h = 170 + r() * 210;
      o += R(x, 760 - h, w, h, c1);
      if (r() < .3) o += R(x + w * .4, 760 - h - 34, 4, 34, c1);
      for (wy = 760 - h + 10; wy < 700; wy += 16) for (wx = x + 6; wx < x + w - 8; wx += 12) if (r() < .2) o += R(wx, wy, 5, 7, r() < .75 ? "#ffd98c" : "#9fe0ff", op(".7"));
      x += w + 2 + r() * 14;
    }
    x = -30;
    while (x < 1940) {
      w = 90 + r() * 140; h = 60 + r() * 130;
      o += R(x, 760 - h, w, h, c2);
      for (wy = 760 - h + 10; wy < 740; wy += 20) for (wx = x + 8; wx < x + w - 12; wx += 18) if (r() < .3) o += R(wx, wy, 8, 10, r() < .8 ? "#ffcf7a" : "#bfe9ff", op(".85"));
      x += w + r() * 30;
    }
    return o;
  }
  // the end of Friday Night Video's building: same mansard, same stucco, tapes in the window
  function videoNeighbour(P) {
    var o = "", r = rand(19), x, y, X1 = 430;
    o += R(-10, 418, X1 + 18, 10, Tc(P, OB.cap));
    var mL = Mc(P, OB.mansard), mD = Sc(P, OB.mansard);
    o += R(-10, 428, X1 + 14, 92, mL);
    for (y = 436; y < 518; y += 10) { o += R(-10, y - 1, X1 + 14, 3, mD, op(".7")); for (x = -6 + ((y / 10) % 2 ? 0 : 14); x < X1; x += 26 + r() * 10) o += R(x, y + 2, 1.2, 8, mD, op(".35")); }
    o += R(-10, 520, X1 + 18, 11, Lc(P, OB.trim)) + R(-10, 531, X1 + 10, 16, Sc(P, OB.soffit));
    o += R(-10, 547, X1 + 10, 213, cmix(Wc(P, OB.stucco, .5), Sc(P, OB.stucco), .35));
    o += R(40, 590, 330, 140, Sc(P, OB.bronze)) + R(48, 598, 314, 124, "#f3d489");
    for (y = 602; y < 716; y += 30) { o += R(48, y + 24, 314, 4, "#8a6a3c"); for (x = 54; x < 356; x += 9 + r() * 3) o += R(x, y + 2, 7, 22, SPINES[Math.floor(r() * SPINES.length)], op(".9")); }
    o += R(202, 598, 6, 124, Sc(P, OB.bronze)) + Pg([48, 598, 150, 598, 48, 690], "#ffffff", op(".12"));
    o += R(X1 - 16, 540, 24, 222, Lc(P, OB.column)) + R(X1 - 16, 540, 8, 222, Sc(P, OB.column));
    return o;
  }
  function alley(P) {
    var o = R(436, 470, 130, 290, Hz(P, Sc(P, "#3a3648"), .15)), x;
    for (x = 440; x < 562; x += 14) o += R(x, 640, 12, 120, Sc(P, OB.fence)) + R(x, 640, 3, 120, Lc(P, OB.fence), op(".5"));
    o += R(470, 704, 54, 58, Sc(P, "#3f6a4a")) + R(466, 698, 62, 8, Lc(P, "#557f52"));
    return o;
  }
  function sideShop(P) {
    var o = "", y;
    o += R(1500, 400, 430, 12, Tc(P, OB.cap)) + R(1500, 412, 430, 348, cmix(Wc(P, OB.siding, .3), Sc(P, OB.siding), .5));
    o += R(1540, 440, 340, 70, Sc(P, "#2c2832"));
    o += R(1560, 560, 300, 200, Sc(P, "#8e96a4"));
    for (y = 566; y < 760; y += 9) o += R(1560, y, 300, 1.8, Sc(P, "#5c6474"));
    return o;
  }
  function barBuilding(P) {
    var o = "", r = rand(71), x, y, X0 = 560, X1 = 1500;
    var bL = cmix(Wc(P, OB.brick, .35), Sc(P, OB.brick), .5), bD = Sc(P, "#7c4636"), bH = Lc(P, "#b8705a");
    o += R(X0, 250, X1 - X0, 510, bL);
    for (y = 258; y < 760; y += 14) {
      o += R(X0, y, X1 - X0, 1.6, bD, op(".5"));
      for (x = X0 + ((y / 14) % 2 ? 0 : 20); x < X1; x += 40) {
        o += R(x, y, 1.6, 14, bD, op(".4"));
        var q = r(); if (q < .1) o += R(x + 2, y + 2, 36, 11, bH, op(".35")); else if (q < .18) o += R(x + 2, y + 2, 36, 11, bD, op(".3"));
      }
    }
    o += R(X0 - 10, 232, X1 - X0 + 20, 20, Tc(P, OB.cap)) + R(X0 - 10, 250, X1 - X0 + 20, 5, Sc(P, OB.cap)) + R(X0 - 4, 255, X1 - X0 + 8, 8, Sc(P, "#5a3a30"));
    // upstairs: one flat with the lamp still on
    [[690, false], [890, true], [1090, false], [1290, false]].forEach(function (w) {
      var wx = w[0], lit = w[1];
      o += R(wx - 8, 292, 96, 128, Lc(P, OB.trim)) + R(wx, 300, 80, 112, lit ? "#f2c56b" : Sc(P, "#2e3448"));
      if (lit) o += Pg([wx, 300, wx + 34, 300, wx + 22, 412, wx, 412], "#b9475a", op(".85")) + Pg([wx + 80, 300, wx + 50, 300, wx + 60, 412, wx + 80, 412], "#b9475a", op(".85"));
      else o += Pg([wx, 300, wx + 50, 300, wx, 360], "#55607c", op(".5"));
      o += R(wx, 354, 80, 4, Lc(P, OB.trim)) + R(wx + 38, 300, 4, 112, Lc(P, OB.trim)) + R(wx - 12, 420, 104, 8, Tc(P, OB.cap)) + R(wx - 12, 428, 104, 3, Sc(P, OB.cap));
    });
    // the board the neon is bolted to
    o += '<rect x="620" y="446" width="820" height="136" rx="8" fill="' + Sc(P, "#2a2230") + '"/>' + R(624, 446, 812, 6, Tc(P, "#55505e"));
    // striped awning with a scalloped edge
    for (x = 600; x < 1460; x += 43) {
      var c = Math.round((x - 600) / 43) % 2 ? cmix(Mc(P, "#efe3c8"), "#e8d6b4", .6) : cmix(Mc(P, "#a8323e"), "#a8323e", .6);
      o += Pg([x + 8, 596, x + 51, 596, x + 43, 640, x, 640], c) + El(x + 21.5, 640, 21.5, 9, c);
    }
    o += R(596, 592, 868, 6, Sc(P, "#5a3a30")) + R(606, 650, 848, 12, "#1a0c12", op(".28"));
    // the front window: warm room, a few heads
    o += R(632, 664, 416, 88, Sc(P, "#3a2a22")) + R(640, 672, 400, 72, "#f0b860") + R(640, 672, 400, 72, "#7a2f3a", op(".5"));
    [[694, 1], [756, .88], [884, 1.05], [958, .9]].forEach(function (h) {
      o += Ci(h[0], 716, 13 * h[1], "#2a1622") + Pt("M" + (h[0] - 24 * h[1]) + ",746 Q" + h[0] + "," + (722 * 1) + " " + (h[0] + 24 * h[1]) + ",746 Z", "#2a1622");
    });
    o += R(838, 672, 5, 72, Sc(P, "#3a2a22")) + Pg([640, 672, 740, 672, 640, 730], "#ffffff", op(".1"));
    // the doorway (the door itself is a cel so it can swing)
    o += R(1100, 628, 124, 132, Sc(P, "#3a2a22")) + R(1108, 636, 108, 124, "#f2b25c") + R(1108, 636, 108, 124, "#7a2f3a", op(".35"));
    // tonight's poster case
    o += R(1270, 652, 150, 100, Sc(P, "#3a2a22")) + R(1277, 659, 136, 86, "#f7e9c8");
    // the chalk board on the footpath
    o += Pg([1436, 792, 1450, 690, 1500, 690, 1514, 792], Sc(P, "#3a2a22")) + Pg([1446, 780, 1456, 700, 1494, 700, 1504, 780], "#23312c");
    return o;
  }
  function outGround(P) {
    var o = "", r = rand(41), x;
    o += R(-10, 760, 1940, 44, wetC(P, Mc(P, OB.concrete))) + R(-10, 800, 1940, 10, Sc(P, OB.concrete));
    for (x = 40; x < 1920; x += 120) o += R(x, 760, 2, 40, Sc(P, OB.concrete), op(".6"));
    o += '<defs><linearGradient id="rd" x1="0" y1="810" x2="0" y2="1080" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + wetC(P, Mc(P, OB.road)) + '"/><stop offset="1" stop-color="' + wetC(P, Mc(P, "#3e3e48")) + '"/></linearGradient></defs>';
    o += R(-10, 810, 1940, 280, "url(#rd)");
    [200, 520, 840, 1160, 1480, 1800].forEach(function (px) { var x2 = 960 + (px - 960) * 1.5; o += Pg([px, 812, px + 8, 812, x2 + 14, 1080, x2, 1080], Mc(P, OB.stripe), op(".5")); });
    var sky = cmix(P.sky[P.sky.length - 1][1], "#ffffff", .1);
    [[300, 850, 150], [760, 930, 190], [1300, 1010, 220], [1650, 880, 130], [1040, 840, 120]].forEach(function (p) { o += Pt(blobD(p[0], p[1], p[2], p[2] * .09, r, 10, .35), sky, op(".3")); });
    // the lights lying in the wet: neon pink and teal under the sign, shop light under the windows
    o += smear(900, 814, 420, 250, NEON.pink, .3, r) + smear(1160, 814, 380, 230, NEON.teal, .22, r) + smear(840, 814, 300, 150, "#ffd38c", .3, r) +
      smear(1162, 814, 90, 190, "#ffd38c", .34, r) + smear(1580, 814, 130, 200, "#ffe9b8", .3, r) + smear(270, 814, 240, 230, "#fff0c8", .28, r) + smear(200, 814, 200, 110, "#ffd38c", .22, r);
    return o;
  }
  function poleSign(P) {
    var o = "", post = "#5d606c", fr = "#2c2832";
    [186, 334].forEach(function (x) { o += R(x, 330, 20, 462, Sc(P, post)) + R(x, 330, 7, 462, Lc(P, post)); });
    o += '<rect x="98" y="138" width="344" height="196" rx="12" fill="' + Sc(P, fr) + '"/>' + R(122, 344, 296, 94, Sc(P, fr));
    return o;
  }
  function streetLamp(P) {
    var c = Sc(P, "#4a4c56");
    return R(1668, 250, 12, 520, c) + R(1668, 250, 4, 520, Lc(P, "#6a6c78")) + Pt("M1680,258 Q1680,212 1620,208 L1556,208 L1556,220 L1618,220 Q1664,224 1668,258 Z", c) +
      Pt("M1536,204 L1604,204 L1594,226 L1546,226 Z", Sc(P, "#3a3c46")) + R(1660, 760, 28, 12, c);
  }
  function outPlateSVG(P) {
    clipN = 0;
    return svgWrap(farCity(P) + videoNeighbour(P) + alley(P) + sideShop(P) + barBuilding(P) + outGround(P) + poleSign(P) + streetLamp(P));
  }
  function outCelsSVG(P, barName, fnvName) {
    var o = "", r = rand(149), i;
    // --- the video store's pole sign, lit ---
    var fn = splitName(fnvName);
    o += halo(270, 236, 250, 150, "#fff0c8", .5);
    o += '<rect x="112" y="152" width="316" height="168" rx="8" fill="#fff3cf"' + ink(3) + "/>";
    if (fn[0]) o += Tx(270, 208, fitSize(fn[0], 290, 40, .56), esc(fn[0]), "#1e3d93");
    o += Tx(270, fn[0] ? 292 : 266, fitSize(fn[1], 290, fn[0] ? 84 : 96, .7), esc(fn[1].toUpperCase()), "#d2263a", ' stroke="#2a1c18" stroke-width="2"');
    o += '<rect x="132" y="352" width="276" height="78" fill="#f4ead2"' + ink(2.5) + "/>";
    o += Tx(270, 384, 25, "KARAOKE NEXT DOOR", "#1b1b22", ' font-weight="600" letter-spacing="3"', OSW) + Tx(270, 418, 25, "SING · THEN REWIND", "#1b1b22", ' font-weight="600" letter-spacing="3"', OSW);
    // --- the bar's neon ---
    var bn = splitName(barName);
    o += '<g class="n-buzz">' + neonNote(668, 548, 1.05, NEON.amber) + "</g>" + neonNote(1410, 548, 1.05, NEON.amber);
    if (bn[0]) {
      o += '<g class="n-buzz">' + neonText(1030, 502, fitSize(bn[0], 640, 60, .54), bn[0], NEON.pink) + "</g>";
      var up = bn[1].toUpperCase();
      o += '<g class="n-flick">' + neonText(1030, 566, fitSize(up, 600, 62, .78), up, NEON.teal, OSW, ' font-weight="600" letter-spacing="10"') + "</g>";
    } else o += '<g class="n-flick">' + neonText(1030, 548, fitSize(bn[1], 640, 100, .58), bn[1], NEON.pink) + "</g>";
    // --- the room behind the glass: the mirror ball going round ---
    o += '<rect class="disco" x="640" y="672" width="400" height="72"/>';
    o += '<g class="n-flick">' + neonText(985, 712, 26, "OPEN", NEON.red, OSW, ' font-weight="600" letter-spacing="3"') + "</g>";
    // --- the door, a lamp over it ---
    o += halo(1162, 610, 90, 44, "#ffe2a6", .7) + '<rect x="1140" y="604" width="44" height="14" rx="5" fill="#fff3cf"' + ink(2) + "/>";
    o += '<g id="oDoor"><rect x="1108" y="636" width="108" height="124" fill="#1f5a5c"' + ink(3) + "/>" + Ci(1162, 682, 23, "#ffcf7a", ink(3)) + R(1120, 706, 8, 26, "#d9a441", ink(1.5)) + R(1114, 742, 96, 12, "#17474a") + "</g>";
    // --- poster case and chalk board ---
    o += Tx(1345, 690, 25, "TONIGHT", "#a8323e") + Tx(1345, 714, 21, "OPEN MIC", "#1b1b22", ' font-weight="600" letter-spacing="2"', OSW) + Tx(1345, 735, 13, "ALL VOICES WELCOME", "#5f5a4e", ' font-weight="500" letter-spacing=".5"', OSW);
    o += Tx(1475, 728, 19, "SING", "#f4ead2") + Tx(1475, 750, 15, "TONITE", "#ffc857", ' font-weight="600" letter-spacing="1"', OSW) + Tx(1475, 772, 16, "←", "#f4ead2", "", OSW);
    // --- the streetlight ---
    o += halo(1570, 232, 150, 90, "#ffe2a6", .5 * P.warm) + Pg([1546, 228, 1594, 228, 1700, 800, 1440, 800], "#ffe2a6", op((.07 * P.warm).toFixed(3))) + El(1570, 227, 24, 6, "#fff3cf");
    // --- rain landing on the blacktop ---
    for (i = 0; i < 18; i++) {
      var x = 40 + r() * 1840, y = 840 + r() * 220, sc = .7 + (y - 840) / 260;
      o += '<g transform="translate(' + n1(x) + "," + n1(y) + ") scale(" + n1(sc) + ')"><g class="o-rip" style="animation-delay:-' + (r() * 1.2).toFixed(2) + 's">' +
        '<path d="M-7,0 L-9,-6 M-3,-1 L-3,-9 M3,-1 L4,-9 M7,0 L9,-6" stroke="#dfe7ff" stroke-width="1.4" stroke-linecap="round" fill="none"/>' + El(0, 0, 9, 2.4, "none", ' stroke="#dfe7ff" stroke-width="1.2"') + "</g></g>";
    }
    return o;
  }

  // =================== the city through the window (the stage's backdrop, and a small one behind the stage) ===================
  function cityView() {
    var r = rand(77), o = "", x, y;
    o += '<defs><linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090c2a"/><stop offset=".45" stop-color="#1b1f55"/><stop offset=".78" stop-color="#4a2d63"/><stop offset="1" stop-color="#8a466a"/></linearGradient>' +
      '<radialGradient id="cg"><stop offset="0" stop-color="#ff9f7a" stop-opacity=".5"/><stop offset="1" stop-color="#ff9f7a" stop-opacity="0"/></radialGradient></defs>';
    o += R(0, 0, 1920, 1080, "url(#cs)") + El(960, 900, 1300, 330, "url(#cg)");
    [[200, 150, 620, 26], [1100, 90, 700, 22], [760, 280, 520, 18]].forEach(function (b) { o += streak(b[0], b[1], b[2], b[3], r, ["#0f132e", "#181e47", "#252d5e", "#444f88"], .25, -1); });
    var ranks = [{ base: 860, hmin: 260, hmax: 560, c: "#2a2f66", win: .16, a: .55, step: 70 }, { base: 900, hmin: 180, hmax: 470, c: "#1a1f4c", win: .24, a: .8, step: 96 }, { base: 960, hmin: 120, hmax: 360, c: "#0d1132", win: .3, a: 1, step: 130 }];
    ranks.forEach(function (k, ki) {
      x = -40 - r() * 60;
      while (x < 1960) {
        var w = k.step * (.7 + r() * .9), h = k.hmin + r() * (k.hmax - k.hmin), top = k.base - h;
        o += R(x, top, w, 1080 - top, k.c);
        if (r() < .35) o += R(x + w * .2, top - 14, w * .6, 14, k.c);
        if (r() < .2) o += R(x + w * .5 - 2, top - 60, 4, 60, k.c);
        if (r() < .18) o += R(x + w * .25, top - 30, w * .3, 30, k.c) + Pg([x + w * .25 - 3, top - 30, x + w * .4, top - 46, x + w * .55 + 3, top - 30], k.c);
        var cw = 9 + ki * 3, ch = 12 + ki * 4, gx = cw * 2.1, gy = ch * 1.9;
        for (y = top + 16; y < k.base + 40; y += gy) for (var wx = x + 9; wx < x + w - cw - 5; wx += gx) {
          if (r() < k.win) o += R(wx, y, cw, ch, r() < .7 ? "#ffd58a" : r() < .6 ? "#aee6ff" : "#ff9fb8", op((k.a * (.6 + r() * .4)).toFixed(2)));
        }
        x += w + 2 + r() * 10;
      }
      if (ki === 1) {
        // the elevated line runs between the middle and the near blocks
        o += R(0, 792, 1920, 12, "#0a0d26") + R(0, 788, 1920, 4, "#343b7a");
        for (var px = 60; px < 1920; px += 240) o += R(px, 804, 16, 200, "#0a0d26");
      }
    });
    // signs: boxes of coloured light, too far off to read
    [[330, 470, 46, 190, NEON.pink], [1420, 430, 52, 210, NEON.teal], [800, 590, 150, 50, NEON.amber], [1690, 610, 40, 150, NEON.violet], [1090, 660, 34, 110, NEON.red]].forEach(function (s) {
      o += rhalo(s[0], s[1], s[2], s[3], 12, s[4], 1.6) + R(s[0] - 5, s[1] - 5, s[2] + 10, s[3] + 10, "#0a0d26") + R(s[0], s[1], s[2], s[3], cmix(s[4], "#ffffff", .25));
      for (var k = 0; k < 4; k++) o += R(s[0] + 5, s[1] + 8 + k * (s[3] - 16) / 4, s[2] - 10, Math.max(4, s[3] / 12), "#0a0d26", op(".55"));
    });
    o += R(0, 990, 1920, 90, "#090b22");
    // lights gone soft through the wet glass
    for (var i = 0; i < 36; i++) o += Ci(r() * 1920, 420 + r() * 560, 14 + r() * 42, [NEON.amber, "#ffd58a", NEON.pink, NEON.teal, "#aee6ff"][Math.floor(r() * 5)], op((.07 + r() * .12).toFixed(2)));
    return o;
  }
  function windowPlateSVG() {
    var r = rand(303), o = cityView(), i, wd = "#2a170f", wl = "#5a3520";
    o += R(0, 0, 1920, 1080, "#7f9bd8", op(".06"));
    for (i = 0; i < 150; i++) { var x = r() * 1920, y = r() * 1000, s = 2.5 + r() * 6; o += El(x, y, s, s * 1.25, "#cfe0ff", op(".16")) + El(x - s * .3, y - s * .4, s * .3, s * .4, "#ffffff", op(".5")); }
    for (i = 0; i < 16; i++) {
      var rx = r() * 1920, ry = r() * 500, len = 200 + r() * 420;
      o += '<path d="M' + n1(rx) + "," + n1(ry) + " q" + n1((r() - .5) * 24) + "," + n1(len * .5) + " " + n1((r() - .5) * 18) + "," + n1(len) + '" fill="none" stroke="#cfe0ff" stroke-opacity=".13" stroke-width="' + n1(2 + r() * 3) + '" stroke-linecap="round"/>';
    }
    o += R(0, 0, 1920, 34, wd) + R(0, 34, 1920, 6, wl) + R(0, 0, 34, 1080, wd) + R(34, 0, 6, 1080, wl) + R(1886, 0, 34, 1080, wd) + R(1880, 0, 6, 1080, wl);
    o += R(634, 0, 16, 1010, wd) + R(650, 0, 4, 1010, wl, op(".6")) + R(1270, 0, 16, 1010, wd) + R(1286, 0, 4, 1010, wl, op(".6")) + R(0, 300, 1920, 14, wd) + R(0, 314, 1920, 4, wl, op(".6"));
    o += R(0, 1004, 1920, 76, "#3a2014") + R(0, 1000, 1920, 10, "#6b4226") + R(0, 1000, 1920, 3, "#a8743e");
    return svgWrap(o);
  }
  function fairyLights(x0, y0, x1, y1, sag, n, seed) {
    var r = rand(seed), o = '<path d="M' + x0 + "," + y0 + " Q" + (x0 + x1) / 2 + "," + ((y0 + y1) / 2 + sag * 2) + " " + x1 + "," + y1 + '" fill="none" stroke="#1a0c12" stroke-width="3"/>';
    var cols = [NEON.amber, NEON.pink, NEON.teal, "#fff3cf", NEON.violet];
    for (var i = 1; i < n; i++) {
      var t = i / n, x = x0 + (x1 - x0) * t, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + sag * 2) + t * t * y1, c = cols[i % cols.length];
      o += '<g class="twk" style="animation-delay:-' + (r() * 3.2).toFixed(2) + 's">' + Ci(x, y + 9, 15, c, op(".22")) + Ci(x, y + 9, 7, cmix(c, "#ffffff", .45), ink(2, "#1a0c12")) + "</g>";
    }
    return o;
  }
  function candle(x, y) {
    return halo(x, y - 20, 70, 50, "#ffcf7a", .5) + R(x - 13, y - 26, 26, 28, "#c9553a", ink(2.5) + ' fill-opacity=".85"') + '<path class="flame" d="M' + x + "," + (y - 46) + " q7,12 0,18 q-7,-6 0,-18 Z" + '" fill="#ffe08a"' + ink(1.5) + "/>";
  }
  function windowCelsSVG(barName) {
    var o = "", word = (splitName(barName)[1] || "Karaoke").toUpperCase();
    // the bar's own neon, hanging in the window and read from behind
    o += '<g class="n-flick" transform="translate(340,200) scale(-1,1)">' + neonText(0, 0, fitSize(word, 520, 96, .78), word, NEON.teal, OSW, ' font-weight="600" letter-spacing="10"') + "</g>";
    o += '<g class="n-buzz">' + neonNote(1600, 220, 1.5, NEON.pink) + "</g>";
    // a mast with its warning light, and the last train
    o += R(1128, 236, 4, 150, "#0d1132") + '<g class="beacon">' + Ci(1130, 232, 16, NEON.red, op(".3")) + Ci(1130, 232, 6, "#ffd0c8") + "</g>";
    o += '<g class="train">' + R(0, 764, 560, 26, "#141a44");
    for (var i = 0; i < 12; i++) o += R(14 + i * 45, 770, 30, 12, "#ffe7a8", op(".95"));
    o += "</g>";
    o += fairyLights(40, 56, 1880, 56, 22, 26, 12);
    o += candle(1730, 1004) + candle(240, 1004);
    // a pot plant on the sill
    o += Pt("M1466,1004 l8,-52 l52,0 l8,52 Z", "#a8553a", ink(3)) + Pt(blobD(1500, 920, 52, 44, rand(8), 9, .4), "#2f6a4a", ink(3)) + Pt(blobD(1488, 906, 22, 16, rand(3), 7, .3), "#4e8f5e");
    return o;
  }

  // =================== inside the bar ===================
  function curtain(x0, x1, y0, y1) {
    var o = "", cols = ["#6d1524", "#8e1f2e", "#b12c3c", "#8e1f2e"], n = Math.round((x1 - x0) / 20), w = (x1 - x0) / n;
    for (var i = 0; i < n; i++) o += R(x0 + i * w, y0, w + .5, y1 - y0, cols[i % 4]) + El(x0 + i * w + w / 2, y1, w / 2, 7, cols[i % 4]);
    return o;
  }
  function barPlateSVG() {
    var o = "", r = rand(5), x, y, i;
    o += '<defs><radialGradient id="wl"><stop offset="0" stop-color="#ffd896" stop-opacity=".5"/><stop offset="1" stop-color="#ffd896" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10060c" stop-opacity=".5"/><stop offset=".3" stop-color="#10060c" stop-opacity="0"/><stop offset=".8" stop-color="#10060c" stop-opacity="0"/><stop offset="1" stop-color="#10060c" stop-opacity=".4"/></linearGradient>' +
      '<linearGradient id="sd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#10060c" stop-opacity=".5"/><stop offset=".22" stop-color="#10060c" stop-opacity="0"/><stop offset=".8" stop-color="#10060c" stop-opacity="0"/><stop offset="1" stop-color="#10060c" stop-opacity=".45"/></linearGradient></defs>';
    // wallpaper, picture rail, panelling
    o += R(0, 0, 1920, 430, "#5b2433");
    for (y = 30; y < 420; y += 60) for (x = 30; x < 1920; x += 60) { var dx = x + ((y / 60) % 2 < 1 ? 0 : 30); o += Pg([dx, y - 11, dx + 8, y, dx, y + 11, dx - 8, y], "#6e2e3e"); }
    o += R(0, 418, 1920, 14, "#3d2418") + R(0, 418, 1920, 3, "#a8743e");
    o += R(0, 432, 1920, 272, "#7a4a2c");
    for (x = 0; x < 1920; x += 64) o += R(x, 432, 3, 272, "#5a3420") + R(x + 3, 432, 2, 272, "#94603a", op(".5")) + R(x + 12 + r() * 30, 450 + r() * 200, 2, 30 + r() * 40, "#5a3420", op(".3"));
    o += R(0, 690, 1920, 16, "#4a2b1a") + R(0, 690, 1920, 3, "#94603a", op(".6"));
    // carpet
    o += R(0, 706, 1920, 374, "#40203c");
    for (y = 730; y < 900; y += 44) for (x = 20; x < 1920; x += 88) { var cx = x + ((y - 730) / 44 % 2 < 1 ? 0 : 44); o += Pg([cx, y - 12, cx + 22, y, cx, y + 12, cx - 22, y], "#56284a") + Ci(cx, y, 4, "#8a3a56"); }
    // the way out
    o += R(14, 300, 104, 406, "#2a170f") + R(24, 310, 84, 396, "#1f5a5c") + Ci(66, 420, 20, "#243a66") + R(92, 510, 8, 26, "#d9a441");
    // the regulars' wall: a few frames to start it off (the polaroids go on top)
    o += R(150, 150, 300, 250, "#4e1e2b", op(".5"));
    // a table by the wall
    o += R(262, 640, 12, 110, "#2a170f") + El(268, 752, 60, 10, "#2a170f") + El(268, 636, 120, 20, "#4a2b1a") + El(268, 630, 120, 20, "#6b4226") + El(250, 626, 90, 10, "#94603a", op(".35"));
    [150, 390].forEach(function (sx) { o += R(sx - 5, 690, 10, 90, "#2a170f") + El(sx, 782, 34, 7, "#2a170f") + El(sx, 688, 40, 11, "#8e1f2e") + El(sx, 684, 40, 10, "#b12c3c"); });
    // ---- the stage ----
    o += R(624, 134, 572, 442, "#2a170f");
    o += '<svg x="640" y="150" width="540" height="410" viewBox="0 120 1920 900" preserveAspectRatio="xMidYMid slice">' + cityView() + "</svg>";
    o += R(640, 150, 540, 410, "#7f9bd8", op(".08")) + R(905, 150, 10, 410, "#2a170f") + R(640, 348, 540, 10, "#2a170f") + Pg([640, 150, 800, 150, 640, 330], "#ffffff", op(".05"));
    o += curtain(510, 640, 110, 650) + curtain(1180, 1310, 110, 650);
    o += R(496, 92, 828, 60, "#7d1a29");
    for (x = 496; x < 1324; x += 46) o += El(x + 23, 152, 23, 14, "#7d1a29") + Ci(x + 23, 168, 5, "#d9a441");
    o += R(496, 92, 828, 8, "#d9a441");
    o += Pg([500, 650, 1320, 650, 1352, 676, 468, 676], "#94603a") + R(468, 676, 884, 46, "#5e3a22") + R(468, 676, 884, 4, "#b98a55");
    for (x = 490; x < 1340; x += 44) o += Ci(x, 700, 7, "#ffe08a") + Ci(x, 700, 12, "#ffe08a", op(".25"));
    // speaker stack, wedge, mic stand
    o += R(404, 470, 96, 200, "#1a1218") + Ci(452, 520, 28, "#2e2630") + Ci(452, 520, 12, "#1a1218") + Ci(452, 610, 36, "#2e2630") + Ci(452, 610, 15, "#1a1218") + R(404, 470, 96, 6, "#3a3040");
    o += Pg([1080, 652, 1190, 652, 1176, 606, 1100, 618], "#1a1218") + Pg([1104, 646, 1170, 646, 1162, 618, 1110, 626], "#2e2630");
    o += El(910, 654, 46, 8, "#1a1218") + R(907, 430, 6, 224, "#3a3040") + R(905, 430, 2, 224, "#8d93a0") + Pg([896, 408, 924, 396, 930, 414, 902, 428], "#1a1218") + Ci(894, 414, 13, "#8d93a0") + Ci(894, 414, 13, "#1a1218", op(".35"));
    // the spot on the stage
    o += Pg([880, 0, 940, 0, 1150, 660, 670, 660], "#ffe2a6", op(".07")) + El(910, 660, 240, 20, "#ffe2a6", op(".16"));
    // ---- the host's booth ----
    o += R(1484, 136, 392, 214, "#3d2418") + R(1496, 148, 368, 190, "#b98a55");
    for (i = 0; i < 160; i++) o += Ci(1498 + r() * 364, 150 + r() * 186, 1 + r() * 1.6, r() < .5 ? "#8a6238" : "#d4a873", op(".7"));
    o += R(1436, 444, 132, 104, "#cfc6b0") + R(1436, 444, 132, 8, "#e9e2d0") + R(1448, 454, 104, 76, "#0c2a1a") + R(1464, 548, 76, 12, "#a39a86");
    o += R(1760, 500, 8, 60, "#2a170f") + Pg([1730, 500, 1798, 500, 1784, 456, 1744, 456], "#d9a441") + El(1764, 556, 150, 30, "url(#wl)");
    o += Pg([1380, 556, 1850, 556, 1870, 580, 1360, 580], "#6b4226") + R(1360, 580, 510, 140, "#4f2f1d") + R(1360, 580, 510, 5, "#94603a");
    o += R(1420, 610, 390, 80, "#2a170f") + R(1426, 616, 378, 68, "#f4ead2");
    o += R(1590, 524, 110, 34, "#1a1218") + R(1596, 530, 98, 6, "#3a3040");
    for (i = 0; i < 6; i++) o += R(1600 + i * 16, 540, 6, 14, "#8d93a0");
    // ---- the counter along the front ----
    o += '<g transform="translate(0,-36)">' + R(0, 896, 1920, 16, "#6b4226") + R(0, 896, 1920, 4, "#b98a55") + R(0, 912, 1920, 210, "#3a2014");
    for (x = 0; x < 1920; x += 150) o += R(x + r() * 60, 930 + r() * 120, 120 + r() * 160, 3, "#4a2b1a", op(".7"));
    o += "</g>" + R(0, 1034, 1920, 46, "#1a0c12", op(".55"));
    // warm pools, dark corners
    o += El(910, 300, 560, 380, "url(#wl)", ' opacity=".5"') + El(1764, 420, 300, 260, "url(#wl)", ' opacity=".5"') + El(268, 560, 280, 200, "url(#wl)", ' opacity=".55"') + El(960, 960, 700, 150, "url(#wl)", ' opacity=".35"');
    o += R(0, 0, 1920, 1080, "url(#dk)") + R(0, 0, 1920, 1080, "url(#sd)");
    return svgWrap(o);
  }
  function rhonda() {
    var o = '<g id="rhonda" transform="translate(1660,470)"><g class="rh-nod">';
    o += Pt("M-78,112 Q-72,50 -22,42 L22,42 Q72,50 78,112 Z", "#2f8f8a", ink(3)) + Pt("M-22,42 L0,70 L22,42 L10,36 L-10,36 Z", "#f4ead2", ink(2.5));
    o += R(-11, 22, 22, 24, "#e2a57e", ink(2.5));
    o += Pt(blobD(0, -20, 64, 62, rand(9), 12, .2), "#b5482f", ink(3));
    o += Pt("M-30,-22 Q-32,30 0,36 Q32,30 30,-22 Q28,-48 0,-48 Q-28,-48 -30,-22 Z", "#f0b891", ink(3));
    o += Pt(blobD(2, -46, 38, 17, rand(4), 8, .28), "#c9553a", ink(2.5));
    o += '<g class="rh-eyes">' + Ci(-13, -8, 3.4, "#2a1c18") + Ci(13, -8, 3.4, "#2a1c18") + "</g>";
    o += '<path class="rh-blink" d="M-18,-8 L-8,-8 M8,-8 L18,-8" stroke="#2a1c18" stroke-width="2.6" stroke-linecap="round" fill="none"/>';
    o += Ci(-13, -8, 11, "none", ink(2.5, "#7d1a29")) + Ci(13, -8, 11, "none", ink(2.5, "#7d1a29")) + '<path d="M-2,-8 L2,-8" stroke="#7d1a29" stroke-width="2.5"/>';
    o += '<path d="M-10,14 Q0,23 11,13" fill="none"' + ink(2.6) + "/>" + Ci(-22, 6, 5, "#f08f8f", op(".5")) + Ci(22, 6, 5, "#f08f8f", op(".5"));
    o += '<path d="M-40,-14 Q-44,-74 0,-76 Q44,-74 40,-14" fill="none"' + ink(8) + '/><path d="M-40,-14 Q-44,-74 0,-76 Q44,-74 40,-14" fill="none" stroke="#55505e" stroke-width="4" stroke-linecap="round"/>';
    o += '<rect x="-52" y="-24" width="18" height="34" rx="7" fill="#3a3040"' + ink(2.5) + '/><rect x="34" y="-24" width="18" height="34" rx="7" fill="#3a3040"' + ink(2.5) + "/>";
    return o + "</g></g>";
  }
  function barCelsSVG(S) {
    var o = "", r = rand(61), i;
    // the mirror ball and what it throws round the room
    o += R(909, 0, 3, 40, "#1a0c12") + Ci(910, 84, 46, "#b9c2d8", ink(3));
    for (i = 0; i < 26; i++) { var a = r() * 6.28, d = Math.sqrt(r()) * 40; o += R(910 + Math.cos(a) * d - 5, 84 + Math.sin(a) * d - 5, 9, 9, r() < .5 ? "#ffffff" : "#7f8cae", op((.5 + r() * .5).toFixed(2))); }
    o += Ci(910, 84, 46, "none", ink(3));
    for (i = 0; i < 22; i++) o += '<rect class="ball-dot' + (i % 2 ? " rev" : "") + '" style="animation-delay:-' + (r() * 12).toFixed(1) + 's" x="' + n1(60 + r() * 1800) + '" y="' + n1(110 + r() * 720) + '" width="13" height="10" rx="3" fill="' + [NEON.amber, "#ffffff", NEON.pink, NEON.teal][i % 4] + '" fill-opacity=".34" transform="skewX(-14)"/>';
    o += fairyLights(-10, 60, 500, 108, 18, 9, 31) + fairyLights(1320, 108, 1930, 60, 18, 10, 47);
    // EXIT, and the regulars' wall
    o += R(30, 250, 72, 34, "#1a0c12", ink(2.5)) + '<g class="n-flick">' + neonText(66, 276, 24, "EXIT", NEON.red, OSW, ' font-weight="600" letter-spacing="2"') + "</g>";
    o += Pt("M150,104 L450,104 L430,128 L450,152 L150,152 L170,128 Z", "#d9a441", ink(3)) + Tx(300, 140, 32, "THE REGULARS", "#2a1c18");
    var wall = S.wall.slice(0, 6);
    for (i = 0; i < 6; i++) {
      var px = 168 + (i % 3) * 96, py = 176 + Math.floor(i / 3) * 112, rot = (r() - .5) * 12, w = wall[i];
      o += '<g transform="rotate(' + n1(rot) + " " + (px + 38) + " " + (py + 46) + ')">' + R(px, py, 76, 92, w ? "#ffffff" : "#e9dfc8", ink(2.5) + (w ? "" : ' fill-opacity=".35"')) +
        R(px + 7, py + 7, 62, 56, w ? POL_BG[w.s % POL_BG.length] : "#6e2e3e", w ? ink(1.5) : ' fill-opacity=".5"') +
        (w ? Ci(px + 38, py + 30, 10, "#f0b891", ink(1.5)) + Pt("M" + (px + 20) + "," + (py + 63) + " Q" + (px + 38) + "," + (py + 36) + " " + (px + 56) + "," + (py + 63) + " Z", "#2a1c18") + Tx(px + 38, py + 82, 12, esc(clip(w.who, 9)), "#2a1c18", ' font-weight="600"', OSW) : "") + "</g>";
    }
    o += candle(268, 622);
    // the window behind the stage keeps a light or two blinking
    o += '<g class="beacon">' + Ci(1010, 232, 5, NEON.red) + "</g>" + '<g class="n-flick">' + R(742, 330, 14, 54, NEON.pink, op(".8")) + "</g>" + '<g class="n-buzz">' + R(1090, 300, 16, 60, NEON.teal, op(".7")) + "</g>";
    // the request board
    o += Pt("M1560,84 L1800,84 L1784,106 L1800,128 L1560,128 L1576,106 Z", "#f4ead2", ink(3)) + Tx(1680, 118, 28, "UP NEXT", "#7d1a29");
    if (!S.queue.length) o += Tx(1680, 250, 24, "Nobody on the list yet", "#5a3a22", ' font-style="italic" font-weight="500"', OSW);
    S.queue.slice(0, 6).forEach(function (q, k) {
      var sx = 1512 + (k % 3) * 118, sy = 162 + Math.floor(k / 3) * 86, rot = ((k * 37) % 9) - 4;
      o += '<g transform="rotate(' + rot + " " + (sx + 52) + " " + (sy + 34) + ')">' + R(sx, sy, 104, 68, "#fff6c9", ink(2.5)) + Ci(sx + 52, sy + 6, 5, "#e2364a", ink(1.5)) +
        Tx(sx + 52, sy + 34, 19, esc(clip(q.singer, 9)), "#2a1c18", ' font-weight="600"', OSW) + Tx(sx + 52, sy + 54, 13, esc(clip(q.song.t, 15)), "#6a5d4e", ' font-weight="500"', OSW) + "</g>";
    });
    // the booth: Rhonda, her monitor, the sign on the desk
    o += rhonda();
    var lines = S.queue.length ? ["NEXT UP", clip(S.queue[0].singer, 9).toUpperCase(), S.queue.length + " WAITING"] : ["OPEN MIC", "NO QUEUE", "PICK ONE"];
    lines.forEach(function (t, k) { o += '<text class="crt-line" x="1456" y="' + (476 + k * 21) + '" font-family="VT323, monospace" font-size="21" fill="#7dffb0">' + esc(t) + "</text>"; });
    o += Tx(1615, 646, 27, "REQUESTS", "#7d1a29") + Tx(1615, 672, 17, "SLIPS TO " + esc(HOST.toUpperCase()), "#2a1c18", ' font-weight="600" letter-spacing="2"', OSW);
    // ---- on the counter ----
    o += '<g transform="translate(0,-36)">';
    o += R(540, 934, 60, 96, "#8ecae6", ink(3) + ' fill-opacity=".55"') + '<path d="M552,940 L540,880 M570,938 L574,872 M588,940 L604,884" stroke="#d9a441" stroke-width="7" stroke-linecap="round"/><path d="M552,940 L540,880 M570,938 L574,872 M588,940 L604,884" stroke="#2a1c18" stroke-width="2" fill="none"/>';
    o += Pg([626, 1000, 716, 990, 730, 1046, 636, 1058], "#fff6c9", ink(3)) + '<path d="M642,1014 L712,1006 M645,1028 L716,1020 M648,1042 L700,1036" stroke="#9db0c8" stroke-width="2"/>';
    o += Pg([742, 1066, 772, 944, 1166, 944, 1196, 1066], "#f4ead2", ink(3)) + Pg([732, 1052, 764, 930, 1158, 930, 1190, 1052], "#7d1a29", ink(4)) + Pg([800, 1030, 818, 952, 1104, 952, 1122, 1030], "#fbf7ea", ink(3));
    o += Tx(961, 1008, 46, "SONGBOOK", "#7d1a29") + Ci(772, 968, 7, "#cfd3da", ink(2)) + Ci(762, 1010, 7, "#cfd3da", ink(2));
    o += El(1320, 1040, 62, 12, "#2a170f") + Pt("M1266,1036 Q1266,972 1320,970 Q1374,972 1374,1036 Z", "#d9a441", ink(3.5)) + Pt("M1284,1020 Q1288,988 1312,982", "none", ' stroke="#fff3cf" stroke-width="5" stroke-linecap="round"') + Ci(1320, 964, 9, "#d9a441", ink(3)) + R(1258, 1034, 124, 12, "#8a6238", ink(3));
    o += Pg([1500, 1056, 1560, 936, 1660, 936, 1720, 1056], "#f4ead2", ink(3)) + Tx(1610, 984, 23, "PHONE", "#7d1a29") + Tx(1610, 1010, 23, "REQUESTS", "#7d1a29") + Tx(1610, 1036, 16, "SCAN THE CODE", "#6a5d4e", ' font-weight="600" letter-spacing="2"', OSW);
    o += candle(1820, 1040) + candle(180, 1040) + "</g>";
    return o;
  }
  var POL_BG = ["#ffd166", "#ff9fb8", "#8ecae6", "#b9e769", "#c8a8ff", "#ffb38a"];
