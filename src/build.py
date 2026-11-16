#!/usr/bin/env python3
"""Assembles app/bar.html from the pieces in src/, plus the shared art kit
(fonts, colour script, sky, clouds, paint texture) lifted from Friday Night Video
so both places are drawn with the same brush."""
import re, sys, pathlib

here = pathlib.Path(__file__).resolve().parent
root = here.parent
fnv = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")


def between(start, end, include_end=False):
    i = fnv.index(start)
    j = fnv.index(end, i + len(start))
    return fnv[i:(j + len(end)) if include_end else j]


fonts = between('<style id="fnv-fonts">', "</style>", True).replace('id="fnv-fonts"', 'id="snk-fonts"')

kit = "\n".join([
    between("  function rand(seed)", "\n"),
    between("  function hx(c)", "  // sun: what faces the light"),
    between("  var LIGHT = {", "  // ---- the sky: airbrushed gradient"),
    between("  function skySVG(P)", "  // ---- the background painting ----"),
    between("  var OB = {", "  var SPINES"),
    between("  function smear(cx, y0, w, len, col, a, r)", "  function signPosts(P)"),
    between("  var INK = ", "  function backCels(P)"),
    between("  var texTile = null;", "  var outKey = "),
    between("  function dropTile(", "  function snowTile("),
    between("  var grainURL = ", "  // ---- the film: now and then"),
])

def read(n): return (here / n).read_text(encoding="utf-8")
vendor_bar = "<script>\n/* tweetnacl-js (public domain) and qrcode-generator (MIT, Kazuhiko Arase) */\n" + read("vendor-nacl.js") + "\n" + read("vendor-qrcode.js") + "\n</script>\n"
html = ("<!doctype html>\n<html lang=\"en\">\n<meta charset=\"utf-8\">\n<title>Saturday Night Karaoke</title>\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        + fonts + "\n<style>\n" + read("font-pix.css") + read("style.css") + "\n</style>\n<body>\n" + read("body.html") + "\n" + vendor_bar
        + "<script>\n(function () {\n\"use strict\";\n// ===== shared art kit (from Friday Night Video) =====\n" + kit
        + "\n// ===== the bar's own art =====\n" + read("art.js") + "\n// ===== the songbook =====\n" + read("book.js")
        + "\n" + read("relay.js") + "\n" + read("pixly.js") + "\n// ===== the bar =====\n" + read("app.js")
        + "\n})();\n</script>\n</body>\n</html>\n")
(root / "app" / "bar.html").write_text(html, encoding="utf-8")
print("bar.html", len(html), "bytes; kit", len(kit))
# the phone songbook lives at the top of the repository, where GitHub Pages serves it
phone = (read("phone.html") + "<script>\n/* tweetnacl-js (public domain) */\n" + read("vendor-nacl.js") + "\n</script>\n<script>\n(function () {\n\"use strict\";\n"
         + read("book.js") + "\n" + read("relay.js") + "\n" + read("phone.js") + "\n})();\n</script>\n</body>\n</html>\n")
(root / "index.html").write_text(phone, encoding="utf-8")
print("index.html (phone)", len(phone), "bytes")
(root / "player.html").write_text(read("player.html"), encoding="utf-8")
print("player.html (jukebox)")
