# TO-DO List

TO-DO List is a lightweight, local-first/private checklist for organizing parent tasks,
descriptions, and nested subtasks. It runs entirely in the browser and keeps task
data on the current device—no account, backend, build step, or runtime dependency
is required.

## Project status

Version 1 is functional and under active development. Core task management,
local persistence, JSON backups, keyboard interaction, hierarchy-aware
drag-and-drop, and cross-browser end-to-end tests are implemented.

The app is suitable for local use. Deployment automation and release metadata
still need to be finalized before treating it as a production release.

## Features

- Create parent tasks with an optional multiline description.
- Add subtasks recursively, up to the validated hierarchy limit.
- Edit task titles and descriptions inline.
- Complete a task and its full subtree together.
- Reopen a subtask and automatically reopen its completed ancestors.
- Collapse or expand task descriptions and nested subtasks.
- Filter the list using All, Active, and Completed views.
- Search task titles, descriptions, and nested subtasks.
- Reorder sibling tasks with accessible move buttons.
- Drag tasks before, after, or inside another task to change their hierarchy.
- Move an entire nested subtree without losing its descendants.
- Promote any subtask back to the top level by dragging it to a root position.
- Automatically save changes to browser `localStorage`.
- Export and import the complete task tree as a JSON backup.

## Keyboard and accessibility support

- Semantic task and subtask lists.
- Visible focus styles and descriptive labels for interactive controls.
- Live status announcements for operations such as moving and deleting tasks.
- Click a task title to edit it inline.
- Press `Tab` or `Shift+Tab` while editing a title to save it and open the next
  or previous visible task for editing.
- Press `Enter` or `Shift+Enter` while editing a title to save it and move focus
  to the next or previous task title.
- Press `Escape` to cancel a title or description edit.
- Press `Ctrl+Enter` or `Command+Enter` to save a description.
- Use the labeled up and down buttons when drag-and-drop is unavailable or
  inappropriate.

The drag handle is intentionally pointer-only and excluded from the Tab order;
the move buttons provide the keyboard-accessible equivalent.

## Drag-and-drop behavior

The drop position determines the task's new hierarchy:

- Drop near the top of a task to insert before it at the same level.
- Drop near the bottom to insert after it at the same level.
- Drop near the middle to make it a child of that task.

The app prevents a task from being moved into itself or one of its descendants
and rejects moves that would exceed the maximum supported nesting depth.

## Privacy and security

Task content is rendered with native DOM elements and `textContent`; the app does
not inject task text with `innerHTML`. Imported and stored data is validated and
bounded by task count, nesting depth, title length, and description length before
it is rendered.

Important limitations:

- `localStorage` is persistent, but it is not encrypted storage.
- Anyone with access to the same browser profile and site origin may be able to
  view the list.
- JSON exports contain task content as readable plain text and should be stored accordingly.
- Clearing browser data, using a private browsing session, or changing origins
  can remove or separate the saved list.
- There is no account, cloud synchronization, link sharing, or remote collaboration in version 1.

Export a JSON backup for any list that would be difficult to recreate.

## Architecture

The application is a static site built with:

- HTML5 in `src/index.html`
- CSS in `src/styles.css`
- Vanilla JavaScript in `src/script.js`
- Browser `localStorage` for persistence
- Playwright as a development-only end-to-end testing dependency

There is no application framework, bundler, server-side database, or runtime
package dependency.

## Run locally

Requirements:

- Python 3 for the local static server
- Node.js and npm only when installing or running tests

Install the development dependencies:

```bash
npm ci
```

Start the app:

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000). Stop the server with
`Ctrl+C` in the terminal where it is running.

## Testing

Install Playwright's browser binaries once:

```bash
npx playwright install
```

Run the complete suite:

```bash
npm test
```

The current suite contains 36 end-to-end scenarios, executed in Chromium,
Firefox, and WebKit for 108 browser-specific test runs. Coverage includes task
creation, nested subtasks, editing, deletion, completion propagation, filtering,
search, persistence, JSON import/export, safe text rendering, keyboard flows,
collapsing, and hierarchy-aware drag-and-drop.

To inspect the most recent HTML report:

```bash
npx playwright show-report
```

## Continuous integration and deployment

A Playwright GitHub Actions workflow is present and runs the browser suite for
pushes and pull requests targeting `main` or `master`.

Additional validation and GitHub Pages workflows have been drafted, but their
paths currently refer to an older repository layout. They must be updated to use
the `src/` application directory before those workflows can be considered ready.

## Next steps

1. Correct and verify the validation and GitHub Pages workflow paths.
2. Add undo support for deletion and drag/reorder operations.
3. Improve long-list entry with a compact composer that remains conveniently
   available without obscuring task content.
4. Add drag autoscrolling and evaluate touch-friendly hierarchy controls.
5. Preserve a recoverable copy when stored data is corrupt instead of only
   falling back safely.
6. Add optional completed-task archiving without cluttering the active list.
7. Add restrained completion animation with `prefers-reduced-motion` support.
8. Expand testing to mobile viewports and automated accessibility checks.
9. Update `package.json` and add a standalone license file matching Apache 2.0.

Shared-link collaboration remains a possible version 2 feature. It would require
hosting, shared storage, authentication or edit-token design, and conflict
handling; none of those concerns are part of the local-only version 1 scope.

## License

This project is licensed under the
[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
