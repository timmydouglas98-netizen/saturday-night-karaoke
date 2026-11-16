# Saturday Night Karaoke

The karaoke bar next door to Friday Night Video, built to run on a Samsung TV through TizenBrew.

You walk in off a wet street, flick through the songbook on the counter, hand Rhonda a request slip, and sing with the words lit up over a rainy city window. The music plays from YouTube (heard, not seen). The words come from LRCLIB, a free lyrics library.

This is version 0.2.0. It adds requests from a phone.

## What's in it

- **Outside:** the bar at dusk or night, in the rain, with the video store's pole sign next door. It shows your video store's own name.
- **The bar:** the stage, Rhonda's booth, the request board, the regulars' wall and the songbook.
- **The songbook:** about 200 songs under tabs (Favourites, decades, Duets, Ballads, Last Call), plus **Ask Rhonda** for anything else.
- **Request slips:** pick who's singing, and whether you want a backing track or to sing along with the record.
- **On stage:** each line fills with colour as it's sung, with a count-in before lines and a card over long breaks.
- **After the song:** a score that means nothing, applause, and a polaroid on the regulars' wall.
- **Phone requests:** scan the code on the table tent and send slips from a phone. See "Phone requests" below.
- **Last call:** Rhonda rings the bell at 11:45pm.

Not built yet: Rewind Night and the idle loop.

## Remote controls

| Button | In the bar | Songbook | On stage |
|---|---|---|---|
| Arrows | Look around | Up/down the page, left/right across and to turn pages, up to the tabs | Left/right: words earlier or later |
| OK | Choose | Fill in a slip | Pause |
| Back | Step outside | Close the book | Stop the song |
| Red | | | Stop the song |
| Yellow | Up next (the queue) | Up next | |
| Blue | Sounds on/off | Sounds on/off | |
| Rewind / Fast-forward | | | Skip 10 seconds |

On a computer: arrow keys, Enter, Esc for Back, and the R, G, Y and B keys for the coloured buttons.

## Putting it on the TV

The files are already in this repository.

1. Switch on the phone page (see "One-time set-up: switch on the phone page" below).
2. On the TV, open TizenBrew, add a GitHub module and type `timmydouglas98-netizen/saturday-night-karaoke`.
3. Launch **Saturday Night Karaoke**.

To check the version, ring the bell on the counter. The bottom line should read **Version 0.2.0**.

### Later updates

Upload the new `app/bar.html` and commit it. Then edit `release.json`: set `ref` to that commit's full id (the long code on the commit's page) and `version` to match. The TV picks it up next time it opens. You don't need to touch TizenBrew again. A release tag such as `v2` works in `ref` too.

## Phone requests

Inside the bar, walk up to the table tent on the counter. It shows a code. Scan it with a phone's camera and the songbook opens on the phone. Pick a song, put a name on the slip and send it. It lands on Rhonda's board on the TV, and the phone shows who's up next.

### One-time set-up: switch on the phone page

The phone songbook is the `index.html` at the top of this repository. GitHub serves it for free once you switch that on.

1. On the repository page, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch **main** and folder **/ (root)**, then **Save**.
4. Wait a minute or two. The page is then live at `https://timmydouglas98-netizen.github.io/saturday-night-karaoke/`.

Opened without scanning, that page only says to scan the code on the TV.

### How it travels, and who can see it

- Slips go from the phone to the TV through **ntfy.sh**, a free public relay that needs no account.
- Every message is scrambled on the phone before it leaves, with a key that exists only inside the code on the TV. The relay carries gibberish it can't read.
- Anyone who scans the code can send slips, so show it to the people in the room. **Make a new code** on the table tent card locks out every phone that scanned the old one.
- The relay keeps messages for about 12 hours, still scrambled. The TV ignores any slip more than ten minutes old.
- The free relay has a daily message allowance shared by everyone on your home internet. A slip uses about three messages, so a normal night is nowhere near it. If it's ever reached, phones say the line is busy.
- **Phone requests** can be switched off on the same card.

### Sending the jukebox key from a phone

On the TV, ring the bell, choose **Jukebox key** and leave that card open. On the phone songbook, tap the cog, paste the key and send it. The TV only accepts a key while that card is open.

## The jukebox key

The house song works straight away. Every other song needs a free key from Google, because YouTube asks every app that searches it for one. It takes about ten minutes, once.

1. Go to `console.cloud.google.com` and sign in with a Google account.
2. Create a project (any name, such as "Karaoke").
3. Open **APIs & Services → Library**, search for **YouTube Data API v3** and press **Enable**.
4. Open **APIs & Services → Credentials → Create credentials → API key**.
5. Edit the key, and under **API restrictions** choose **Restrict key → YouTube Data API v3**. Save.
6. Copy the key. It's about 39 letters and numbers.
7. Send it from a phone (see "Sending the jukebox key from a phone" above). Or type it: ring the bell on the counter, choose **Jukebox key → Type the key in**.

Good to know:

- The key stays on the TV. Don't put it in this repository, which is public.
- Google allows about 100 searches a day. A new song uses one or two. Songs you've sung before are remembered and use none.
- Google may change the names of those menus. The goal is always the same: a project, the YouTube Data API v3 switched on, and an API key.

## When the words and the music don't line up

The lyric timings match the original record. "With the band" plays that record, so it lines up. A backing track is someone's re-recording, so it can sit a little early or late.

- Press left or right while singing to move the words in quarter-second steps. The TV remembers the setting for that song.
- If the top-left of the screen says the timing may wander, the bar couldn't find a backing track the same length as the record. Try "With the band".
- "Words only" means LRCLIB has the lyrics but no timings. The words step through evenly and you keep them in step with left and right.

## Files

- `index.html`: the phone songbook, served by GitHub Pages.
- `app/bar.html`: the whole bar in one file. It opens in any browser.
- `app/index.html`: the loader TizenBrew opens. It shows the sign while it fetches the bar and keeps the last good copy if an update fails.
- `release.json`: which release the TVs run.
- `package.json`: the app name and remote buttons for TizenBrew.
- `src/`: the pieces `bar.html` is built from. `python3 src/build.py path/to/friday-night-video/app/store.html` rebuilds it. The build borrows fonts and painting code from the video store so both places look alike. It also bundles two small libraries: tweetnacl-js (public domain) for scrambling slips and qrcode-generator (MIT) for the code.
