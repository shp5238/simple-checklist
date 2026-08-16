# Simple Checklist

Simple Checklist is a lightweight, local-first task manager built with HTML,
CSS, and vanilla JavaScript. It supports parent tasks, descriptions, deeply
nested subtasks, keyboard editing, and hierarchy-aware reordering without an
account, backend, framework, or runtime dependency.

Task data stays in the current browser unless the user explicitly exports a
JSON backup.

## Project status

Version 1 is functional and its core feature set is complete. The remaining
Version 1 work focuses on recovery, security hardening, touch controls,
accessibility review, and deployment verification.

### Core task management

- [x] Create parent tasks with text-only titles.
- [x] Add an optional multiline description to a task.
- [x] Add recursively nested subtasks, up to 12 levels deep.
- [x] Edit task titles and descriptions inline.
- [x] Delete a task and its descendants after confirmation.
- [x] Clear the complete list after confirmation.
- [x] Mark a task and its entire subtree complete together.
- [x] Reopen completed ancestors when one of their subtasks is reopened.
- [x] Collapse and expand task descriptions and subtasks.
- [x] Keep due dates, priority levels, and progress indicators out of Version 1.

### Finding and organizing tasks

- [x] Switch between All, Active, and Completed views.
- [x] Search titles, descriptions, and nested subtasks.
- [x] Reorder sibling tasks with labeled move buttons.
- [x] Drag tasks before, after, or inside another task.
- [x] Move a task together with its complete nested subtree.
- [x] Move subtasks into a different parent.
- [x] Promote a subtask to a top-level parent by dragging it to a root position.
- [x] Reject drops into the dragged task's own descendants.
- [x] Reject drops that would exceed the supported nesting depth.

### Task composer

- [x] Keep a compact task composer at the bottom of the viewport.
- [x] Reveal the optional description field only when requested.
- [x] Keep focus in the composer for quick repeated entry.
- [x] Scroll the newly created task into view.
- [x] Adjust a restrictive view or search so a new task remains visible.
- [x] Move the composer into the document flow while editing on small screens.

### Persistence and backups

- [x] Save every change automatically to browser `localStorage`.
- [x] Restore the task tree after refreshing or reopening the page.
- [x] Export the complete task tree as a readable JSON backup.
- [x] Import a JSON backup after confirmation.
- [x] Reject malformed, oversized, or structurally invalid imports.
- [x] Limit stored data to 1,000 tasks, 12 nesting levels, 240 characters per
  title, and 4,000 characters per description.

### Keyboard and accessibility support

- [x] Use semantic task and subtask lists.
- [x] Provide visible focus states and descriptive accessible button labels.
- [x] Announce important operations through an ARIA live status region.
- [x] Click or focus a task title to edit it.
- [x] Use `Tab` and `Shift+Tab` while editing to move through visible parent
  tasks and subtasks in document order.
- [x] Use `Enter` and `Shift+Enter` while editing to save and move focus to the
  next or previous task title.
- [x] Use `Escape` to cancel a title or description edit.
- [x] Use `Ctrl+Enter` or `Command+Enter` to save a description.
- [x] Use `Alt+N` or `Option+N` to return to the new-task field.
- [x] Keep the pointer-only drag handle out of the keyboard tab order while
  retaining labeled move buttons as its keyboard alternative.

### Security and privacy

- [x] Render user-controlled text with native DOM nodes and `textContent`.
- [x] Avoid `innerHTML`, `insertAdjacentHTML`, and `document.write` in the app.
- [x] Validate and bound imported and persisted task data before rendering it.
- [x] Limit imported backup files to 2 MB.
- [x] Use generated UUIDs for tasks created in the app.
- [x] Run a CI guard that rejects unsafe HTML-rendering APIs in `src/`.
- [x] Use no third-party runtime scripts or external application dependencies.

## Remaining Version 1 work

- [ ] Add a brief undo notification after deleting a task.
- [ ] Add keyboard and touch-friendly indent and outdent controls.
- [ ] Perform a manual mobile usability and accessibility pass.
- [ ] Add drag autoscrolling for long lists.
- [ ] Preserve unreadable `localStorage` data under a recovery key before
  starting with an empty list.
- [ ] Add a restrictive Content Security Policy.
- [ ] Replace or reject task IDs supplied by imported backups so imported data
  cannot create duplicate or attacker-controlled identifiers.
- [ ] Add automated accessibility checks to complement the existing interaction
  tests.
- [ ] Upgrade GitHub Actions that still emit Node.js 20 deprecation warnings.
- [ ] Enable GitHub Pages in the repository settings and verify the production
  deployment from `main`.

## Privacy limitations

This is a local-first application, not encrypted storage:

- Anyone with access to the same browser profile and site origin may be able to
  read the list.
- JSON exports contain task content as readable plain text.
- Clearing browser data, using private browsing, or opening the app under a
  different origin can remove or separate the saved list.
- Version 1 has no account, cloud synchronization, shared link, or remote
  collaboration support.

Export a JSON backup for any list that would be difficult to recreate.

## Architecture

- `src/index.html` — semantic application structure
- `src/styles.css` — black-and-white responsive presentation
- `src/script.js` — task state, rendering, interaction, persistence, and backup
  logic
- `localStorage` — browser-local persistence
- Playwright — development-only cross-browser end-to-end testing

The app has no framework, bundler, server-side database, or runtime package
dependency.

## Run locally

Requirements:

- Python 3 for the local static server
- Node.js 20 or newer and npm for development and testing

Install the development dependencies:

```bash
npm ci
```

Start the app:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). Stop the server by pressing
`Ctrl+C` in the terminal where it is running.

To find an unknown local server on macOS:

```bash
lsof -nP -iTCP -sTCP:LISTEN
```

Stop a selected process with `kill <PID>`. Use `kill -9 <PID>` only if a normal
stop does not work.

## Testing

Install Playwright's browser binaries once:

```bash
npx playwright install
```

Run the complete suite:

```bash
npm test
```

- [x] 42 end-to-end scenarios
- [x] Chromium, Firefox, and WebKit projects
- [x] 126 browser-specific test runs in the complete suite
- [x] Coverage of creation, nesting, editing, deletion, completion propagation,
  views, search, persistence, backups, safe rendering, keyboard flows,
  collapsing, drag-and-drop, and responsive composer behavior
- [x] Playwright HTML report and retry traces in CI

Inspect the most recent local HTML report with:

```bash
npx playwright show-report
```

## Continuous integration and deployment

- [x] Validate the expected `src/` application files on relevant pushes and pull
  requests.
- [x] Reject unsafe rendering APIs during validation.
- [x] Run the complete Playwright suite for relevant pull requests.
- [x] Require the Playwright job to pass before the Pages deployment job starts.
- [x] Package `src/` as the GitHub Pages artifact on relevant pushes to `main`.
- [ ] Complete deployment by selecting **GitHub Actions** under **Settings →
  Pages → Build and deployment**.

## Possible Version 2 features

- [ ] Shared lists that anyone with an edit link can update.
- [ ] Hosted storage and cross-device synchronization.
- [ ] Authentication or revocable edit tokens.
- [ ] Conflict handling for simultaneous edits.
- [ ] Optional completed-task archiving.

Shared-link editing requires hosting, shared storage, authorization, abuse
controls, and conflict resolution. Those concerns are intentionally outside the
local-only Version 1 scope.

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE) for the complete
license text.
