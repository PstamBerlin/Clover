# Clover

A coupon extension that tries codes at checkout and leaves everyone's referral links alone.

## Which browsers

| Browser | Works | What you do |
| ------- | ----- | ----------- |
| Chrome  | Yes | Load unpacked, see below |
| Edge    | Yes | Same as Chrome |
| Brave, Opera, Vivaldi | Yes | Same as Chrome, they are all Chromium |
| Firefox | Yes | Rename `manifest-firefox.json` first, see below |
| Safari  | Not yet | Needs converting with Xcode on a Mac |

## Load it into Chrome or Edge

1. Open `chrome://extensions` in Chrome, or `edge://extensions` in Edge.
2. Flip on **Developer mode**, top right.
3. Click **Load unpacked**.
4. Pick this `clover` folder.
5. The clover icon appears in your toolbar. Pin it so it stays visible.

Any time you change a file, go back to the extensions page and hit the reload arrow on the Clover card.

## Load it into Firefox

Firefox needs its own manifest because it wants an add-on id.

1. Rename `manifest.json` to `manifest-chrome.json`.
2. Rename `manifest-firefox.json` to `manifest.json`.
3. Open `about:debugging#/runtime/this-firefox`.
4. Click **Load Temporary Add-on**.
5. Pick the `manifest.json` file inside this folder.

Firefox drops temporary add-ons when you close it, so you reload it each session. A permanent install needs the add-on signed by Mozilla, which is free but means submitting it to addons.mozilla.org.

## About Safari

Safari runs extensions too, but they have to be wrapped in a small Mac app first using Xcode and the `safari-web-extension-converter` tool. The code itself does not need changing, so it is worth doing later rather than now.

## Using it

**Toolbar popup** (click the icon)
- **Saved** — the codes Clover will try, with an X to remove any
- **Add** — put in a store, a code, and what it does
- **Always on** — discount programs that stay valid all year

**On a checkout page**
A green orb floats in the bottom right. Click it, then click **Try codes**. Clover types each saved code into the promo box, applies it, watches the total, and keeps whichever one saved the most.

## Adding a store

Open `recipes.js`. The generic recipe already guesses most promo boxes by looking for inputs with "promo", "coupon", or "discount" in the name.

When a store is stubborn, add a block of its own:

```js
{
  id: "mystore",
  name: "My Store",
  matches: ["mystore.com"],
  codeInput: "#promo-input",
  applyButton: "#promo-apply",
  total: ".grand-total"
}
```

To find those selectors: open the store's checkout, right-click the promo box, choose **Inspect**, and read the `id` or `class` off the highlighted line.

## Settings

Right-click the Clover icon and choose **Options**, or open it from the popup footer.

- **Clover is on** — master switch, off means it does nothing anywhere
- **When to show** — checkout pages only, every page, or never
- **Position** — bottom right or bottom left
- **Try codes without asking** — off by default, since it should be your call
- **Pause between codes** — 0.6s to 4s, longer is gentler on the store
- **Never help on these** — one site per line, good for banking or work
- **Only help on these** — fill this in and everything else is ignored
- **Theme** — match system, light, or dark
- **Mascot** — off gives a plain clover with no face
- **Confetti** — off skips the celebration
- **Creator deals** — toggle for that whole feature

Nothing is sent anywhere. Settings live on your device.

## The mascot

The clover has four faces. Idle waits and blinks. Looking darts its eyes while
it works through your codes. Happy grins and throws confetti. Sad slumps when
nothing worked.

Underneath it is a caption showing what it is doing right now, including the
exact code being typed, so you can watch a run without opening the panel.

The confetti is sized to what was actually saved. A small win gets a small
burst. It should never look like more happened than really did.

## Known limits

- Some stores hide the promo field behind a "Have a code?" link. Open it first, then click Clover.
- Some stores block fast repeated code attempts. Clover waits 1.4 seconds between tries to stay polite.
- Public codes go stale fast. A run where nothing works is normal, not a bug.

## What Clover does not do

It does not touch affiliate or referral links. If a creator sent you to a store, they still get credit for it. That is the whole reason this exists.

## Creator deals

Some offers do not come as a code. A creator gets a link, and going through it gives you the deal and gives them the credit. Clover handles these differently from ordinary codes.

When you open the orb on a store that has one, it tells you a creator deal exists and who it is from. It never redirects you and never opens anything on its own. You choose.

It also stays quiet if there is already a referral parameter in the URL, because that means somebody has already sent you here and the credit belongs to them. Overwriting that is the exact thing Honey was sued for.

To add one, open `recipes.js` and add to `CLOVER_CREATOR_DEALS`:

```js
{
  store: "somestore.com",
  creator: "Name of the channel",
  deal: "3 months free",
  kind: "link",              // "link" or "code"
  value: "https://somestore.com/creatorname"
}
```

Use `kind: "code"` when the creator gives out a code instead, and put the code in `value`.

## Firefox on Android

Use `manifest-android.json` as `manifest.json`. It is Manifest V2, which is
what Mozilla still recommends for Android.

Android Firefox cannot install an extension from a file, so it has to go
through a signed collection:

1. Submit the extension at addons.mozilla.org to get it signed (unlisted is
   fine for personal use).
2. Create a collection there and add Clover to it.
3. On the phone: Settings, About Firefox, tap the logo five times to enable
   the debug menu.
4. Settings, Advanced, Custom Add-on collection: enter the user id and
   collection name. Firefox restarts.
5. Settings, Add-ons: Clover is there to install.

The orb and panel are sized for a desktop window, so expect them to be
cramped on a phone until the layout gets a mobile pass.
