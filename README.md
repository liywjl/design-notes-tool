# design-notes

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support%20this%20project-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/willlacf)

Annotate a running web app by clicking on things, then hand the whole batch of feedback to an AI coding agent in one go.

Built for the "this padding is wrong, that font is off, this should be 12px" loop between design review and implementation. Instead of describing each issue in chat one at a time, you Alt+click the element, type what's wrong, and export everything as one JSON file that carries the technical context an agent needs to find and fix each issue — computed styles, the React component chain, and (on dev builds) the exact source file and line.

No build step, no dependencies, no network calls. One vanilla JS file. Notes stay in your browser's localStorage until you export or clear them. If it saves you review cycles, you can [buy me a coffee](https://buymeacoffee.com/willlacf).

![demo](docs/demo.gif)

**[Try it live →](https://liywjl.github.io/design-notes-tool/demo/)** — the demo page (a deliberately ordinary to-do app) has the tool pre-loaded: hold Alt and start clicking.

## Demo
<img width="960" height="600" alt="demo" src="https://github.com/user-attachments/assets/97fa1819-e5bf-4acf-92e1-1e32b870ce6a" />

| <img width="2560" height="1600" alt="1-hover-highlight" src="https://github.com/user-attachments/assets/6051d445-5b64-46fc-bf58-a51ef42c41ee" />  | <img width="2560" height="1600" alt="2-note-modal" src="https://github.com/user-attachments/assets/aad8e493-767a-4990-9503-c1011640423b" />  | <img width="2560" height="1600" alt="3-manage-panel" src="https://github.com/user-attachments/assets/e8a0cab7-f264-43bf-b84d-cb009d521d43" />  |
|---|---|---|



## Install

Pick one:

**DevTools snippet (recommended)** — open DevTools → Sources → Snippets → New snippet → paste `design-notes.js` → run with Cmd/Ctrl+Enter. Re-run after a full page reload. (New to snippets? See the [Chrome DevTools snippets guide](https://developer.chrome.com/docs/devtools/javascript/snippets).)

**Console** — paste the contents of `design-notes.js` into the DevTools console.

**Bookmarklet** — serve or host `design-notes.js` somewhere you trust, then bookmark:

```
javascript:fetch('https://YOUR-HOST/design-notes.js').then(r=>r.text()).then(eval)
```

## Use

**1. Alt+hover** — anything under the cursor gets highlighted:

![hover highlight](docs/1-hover-highlight.png)

**2. Alt+click** — a note box opens on the element; write as much as you need (Cmd/Ctrl+Enter saves):

![note modal](docs/2-note-modal.png)

**3. The badge** (bottom-left) opens the manager — edit or delete individual notes, copy or download the batch:

![manage panel](docs/3-manage-panel.png)

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
  "note": "completed items are too faint — keep the strikethrough but use a darker grey",
  "page": "/",
  "viewport": "1440x900",
  "element": {
    "text": "Book dentist appointment",
    "tag": "label",
    "testId": "todo-item",
    "componentChain": ["label", "TodoItem", "TodoList"],
    "source": "src/components/TodoItem.tsx:18",
    "box": { "x": 214, "y": 313, "w": 342, "h": 21 },
    "styles": { "fontSize": "15px", "color": "rgb(154, 154, 165)", "textDecoration": "line-through" }
  }
}
```

`componentChain` and `source` come from React's dev-build internals (fiber `_debugSource`), so they're richest on a local dev server. On production builds you still get the tag, test id, class names, geometry, and computed styles.

Nothing React-specific is required — on non-React apps you simply get the DOM/CSS context.

## The batch workflow

1. Run your app locally, load the tool. (Or just play with the [live demo](https://liywjl.github.io/design-notes-tool/demo/) — no setup at all.)
2. Walk the UI against your designs; Alt+click everything that looks off.
3. Badge → **Copy** (or **Download** for a `design-notes.json` file).
4. Paste it to your LLM / coding agent with a prompt like:

   > Here is a batch of design feedback captured on the running app. Each note includes the element's
   > computed styles, component chain, and source location. Work through every note and fix them.

   One paste, whole batch — no per-issue back-and-forth.

Each note is self-locating, so the agent can map "this font looks wrong" + `fontFamily: "Times"` + a test id straight to the offending element without any back-and-forth.

## Privacy

Everything stays local: notes live in `localStorage` under the `design-notes` key for the origin you're annotating. Export is a file download or a clipboard copy. The script makes no network requests.

## License

MIT
