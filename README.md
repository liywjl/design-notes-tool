# design-notes

Annotate a running web app by clicking on things, then hand the whole batch of feedback to an AI coding agent in one go.

Built for the "this padding is wrong, that font is off, this should be 12px" loop between design review and implementation. Instead of describing each issue in chat one at a time, you Alt+click the element, type what's wrong, and export everything as one JSON file that carries the technical context an agent needs to find and fix each issue — computed styles, the React component chain, and (on dev builds) the exact source file and line.

No build step, no dependencies, no network calls. One vanilla JS file. Notes stay in your browser's localStorage until you export or clear them.

## Demo
<img width="960" height="600" alt="demo" src="https://github.com/user-attachments/assets/97fa1819-e5bf-4acf-92e1-1e32b870ce6a" />

| <img width="2560" height="1600" alt="1-hover-highlight" src="https://github.com/user-attachments/assets/6051d445-5b64-46fc-bf58-a51ef42c41ee" />  | <img width="2560" height="1600" alt="2-note-modal" src="https://github.com/user-attachments/assets/aad8e493-767a-4990-9503-c1011640423b" />  | <img width="2560" height="1600" alt="3-manage-panel" src="https://github.com/user-attachments/assets/e8a0cab7-f264-43bf-b84d-cb009d521d43" />  |
|---|---|---|



## Install

Pick one:

**DevTools snippet (recommended)** — DevTools → Sources → Snippets → New snippet → paste `design-notes.js` → run with Cmd/Ctrl+Enter. Re-run after a full page reload.

**Console** — paste the contents of `design-notes.js` into the DevTools console.

**Bookmarklet** — serve or host `design-notes.js` somewhere you trust, then bookmark:

```
javascript:fetch('https://YOUR-HOST/design-notes.js').then(r=>r.text()).then(eval)
```

## Use

| Action | How |
|---|---|
| Highlight an element | Hold **Alt** and move the mouse |
| Add a note | **Alt+click** the element, type in the box (multi-line), Save or Cmd/Ctrl+Enter |
| Manage notes | Click the **📝 badge** (bottom-left): edit, delete per note |
| Copy all as JSON | Badge → **Copy** |
| Download all | Badge → **Download** (`design-notes.json`) |
| Start over | Badge → **Clear** |

## What each note captures

```json
{
  "note": "the radio should be top aligned, not centered",
  "page": "/registration",
  "viewport": "1440x900",
  "element": {
    "text": "Business",
    "tag": "button",
    "testId": "account-type-option",
    "componentChain": ["button", "StyledRadio", "AccountTypeStep"],
    "source": "src/components/AccountTypeStep/index.tsx:92",
    "box": { "x": 57, "y": 376, "w": 24, "h": 24 },
    "styles": { "fontSize": "16px", "padding": "0px", "border": "1px solid rgb(200,200,199)" }
  }
}
```

`componentChain` and `source` come from React's dev-build internals (fiber `_debugSource`), so they're richest on a local dev server. On production builds you still get the tag, test id, class names, geometry, and computed styles.

Nothing React-specific is required — on non-React apps you simply get the DOM/CSS context.

## The batch workflow

1. Run your app locally, load the tool.
2. Walk the UI against your designs; Alt+click everything that looks off.
3. Export `design-notes.json`.
4. Give the file to your AI coding agent: *"process this design feedback batch"*.

Each note is self-locating, so the agent can map "font style doesn't seem correct" + `fontFamily: "Times"` + `testId: step-indicator` straight to the offending SVG `<text>` without any back-and-forth.

## Privacy

Everything stays local: notes live in `localStorage` under the `design-notes` key for the origin you're annotating. Export is a file download or a clipboard copy. The script makes no network requests.

## License

MIT
