(() => {
  'use strict';

  const STORAGE_KEY = 'plain-list.v1';
  const STORAGE_VERSION = 2;
  const MAX_TASKS = 1000;
  const MAX_DEPTH = 12;
  const MAX_TITLE = 240;
  const MAX_DESCRIPTION = 4000;
  const state = { tasks: [], view: 'all', query: '' };
  let focusRequest = null;
  let draggedId = null;

  const elements = {
    form: document.getElementById('task-form'),
    title: document.getElementById('task-title'),
    description: document.getElementById('task-description'),
    addTask: document.querySelector('#task-form button[type="submit"]'),
    list: document.getElementById('task-list'),
    search: document.getElementById('search'),
    clearSearch: document.getElementById('clear-search'),
    export: document.getElementById('export-button'),
    importInput: document.getElementById('import-input'),
    importButton: document.getElementById('import-button'),
    clear: document.getElementById('clear-button'),
    status: document.getElementById('status'),
    views: Array.from(document.querySelectorAll('.view')),
  };

  const id = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cleanText = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
  const setStatus = message => { elements.status.textContent = message; };

  function setSubtreeCompletion(task, completed) {
    task.completed = completed;
    task.children.forEach(child => setSubtreeCompletion(child, completed));
  }

  function validateTasks(input, depth = 0, counter = { count: 0 }) {
    if (!Array.isArray(input) || depth > MAX_DEPTH) return [];
    return input.reduce((result, raw) => {
      if (counter.count >= MAX_TASKS || !raw || typeof raw !== 'object') return result;
      const title = cleanText(raw.title, MAX_TITLE).trim();
      if (!title) return result;
      counter.count += 1;
      const task = {
        id: typeof raw.id === 'string' && raw.id.length <= 128 ? raw.id : id(),
        title,
        description: cleanText(raw.description, MAX_DESCRIPTION),
        completed: raw.completed === true,
        collapsed: raw.collapsed === true || raw.expanded === false,
        children: validateTasks(raw.children, depth + 1, counter),
      };
      if (task.completed) setSubtreeCompletion(task, true);
      result.push(task);
      return result;
    }, []);
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, exportedAt: new Date().toISOString(), tasks: state.tasks })); }
    catch (_) { setStatus('Your change could not be saved in this browser. Export a backup if possible.'); }
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const payload = JSON.parse(saved);
      state.tasks = validateTasks(payload && payload.tasks);
      if (payload && payload.version !== STORAGE_VERSION) setStatus('A saved list was safely updated.');
    } catch (_) { setStatus('Saved data could not be read. Starting with a new list.'); }
  }

  function findContainer(tasks, taskId) {
    const index = tasks.findIndex(task => task.id === taskId);
    if (index >= 0) return { tasks, index };
    for (const task of tasks) {
      const found = findContainer(task.children, taskId);
      if (found) return found;
    }
    return null;
  }

  function uncompleteAncestors(tasks, taskId) {
    for (const task of tasks) {
      if (task.id === taskId) return true;
      if (uncompleteAncestors(task.children, taskId)) {
        task.completed = false;
        return true;
      }
    }
    return false;
  }

  function matchesQuery(task) {
    const query = state.query.trim().toLocaleLowerCase();
    return !query || `${task.title}\n${task.description}`.toLocaleLowerCase().includes(query) || task.children.some(matchesQuery);
  }

  function matchesView(task) {
    const own = state.view === 'all' || (state.view === 'active' ? !task.completed : task.completed);
    return own || task.children.some(matchesView);
  }

  const shouldShow = task => matchesQuery(task) && matchesView(task);

  function visibleTaskSequence(tasks = state.tasks, result = []) {
    tasks.filter(shouldShow).forEach(task => {
      result.push(task);
      if (!task.collapsed) visibleTaskSequence(task.children, result);
    });
    return result;
  }

  function requestAdjacentEditor(taskId, direction) {
    const sequence = visibleTaskSequence();
    const currentIndex = sequence.findIndex(task => task.id === taskId);
    const destination = sequence[currentIndex + direction];
    focusRequest = destination
      ? { type: 'edit-title', taskId: destination.id }
      : direction > 0 ? { type: 'new-task' } : { type: 'search' };
  }

  function requestAdjacentTitle(taskId, direction) {
    const sequence = visibleTaskSequence();
    const currentIndex = sequence.findIndex(task => task.id === taskId);
    const destination = sequence[currentIndex + direction];
    focusRequest = destination
      ? { type: 'action', taskId: destination.id, action: 'edit-title' }
      : direction > 0 ? { type: 'new-task' } : { type: 'search' };
  }

  function makeButton({ label, text, action, taskId, handler, disabled = false, className = 'icon' }) {
    const button = document.createElement('button');
    button.type = 'button';
    // Safari/WebKit omits native buttons from the Tab order unless tabindex is explicit.
    button.tabIndex = 0;
    button.className = className;
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.dataset.action = action;
    button.dataset.taskId = taskId;
    button.disabled = disabled;
    button.addEventListener('click', handler);
    return button;
  }

  function titleButton(task) {
    return makeButton({
      label: `Edit task title: ${task.title}`,
      text: task.title,
      action: 'edit-title',
      taskId: task.id,
      className: 'task-title',
      handler: event => beginTitleEdit(task, event.currentTarget),
    });
  }

  function beginTitleEdit(task, button) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-title-input';
    input.value = task.title;
    input.maxLength = MAX_TITLE;
    input.setAttribute('aria-label', `Edit title for ${task.title}`);
    let finished = false;

    const finish = ({ saveTitle = true, next = null } = {}) => {
      if (finished) return;
      finished = true;
      const nextTitle = cleanText(input.value, MAX_TITLE).trim();
      if (saveTitle && nextTitle) task.title = nextTitle;
      if (next === 'adjacent-task') requestAdjacentEditor(task.id, 1);
      else if (next === 'previous-task') requestAdjacentEditor(task.id, -1);
      else if (next === 'focus-adjacent') requestAdjacentTitle(task.id, 1);
      else if (next === 'focus-previous') requestAdjacentTitle(task.id, -1);
      else focusRequest = { type: 'action', taskId: task.id, action: 'edit-title' };
      save();
      render();
    };

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); finish({ next: event.shiftKey ? 'focus-previous' : 'focus-adjacent' }); }
      if (event.key === 'Tab') { event.preventDefault(); finish({ next: event.shiftKey ? 'previous-task' : 'adjacent-task' }); }
      if (event.key === 'Escape') { event.preventDefault(); finish({ saveTitle: false }); }
    });
    input.addEventListener('blur', () => finish());
    button.replaceWith(input);
    input.focus();
    input.select();
  }

  function descriptionEditor(task, detailArea) {
    detailArea.replaceChildren();
    const label = document.createElement('label');
    label.className = 'sr-only';
    label.htmlFor = `description-${task.id}`;
    label.textContent = `Description editor for ${task.title}`;
    const textarea = document.createElement('textarea');
    textarea.id = `description-${task.id}`;
    textarea.className = 'task-description-input';
    textarea.value = task.description;
    textarea.maxLength = MAX_DESCRIPTION;
    const controls = document.createElement('div');
    controls.className = 'edit-controls';
    const saveButton = document.createElement('button');
    saveButton.type = 'button'; saveButton.tabIndex = 0; saveButton.textContent = 'Save description';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button'; cancelButton.tabIndex = 0; cancelButton.textContent = 'Cancel';
    const finish = saveDescription => {
      if (saveDescription) task.description = cleanText(textarea.value, MAX_DESCRIPTION);
      focusRequest = { type: 'action', taskId: task.id, action: 'edit-description' };
      save(); render();
    };
    saveButton.addEventListener('click', () => finish(true));
    cancelButton.addEventListener('click', () => finish(false));
    textarea.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
    });
    controls.append(saveButton, cancelButton);
    detailArea.append(label, textarea, controls);
    textarea.focus();
  }

  function moveTask(siblings, index, direction) {
    const destination = index + direction;
    if (destination < 0 || destination >= siblings.length) return;
    const [task] = siblings.splice(index, 1);
    siblings.splice(destination, 0, task);
    focusRequest = { type: 'action', taskId: task.id, action: 'edit-title' };
    save(); render(); setStatus(`Moved “${task.title}” ${direction < 0 ? 'up' : 'down'}.`);
  }

  function subtreeContains(task, taskId) {
    return task.id === taskId || task.children.some(child => subtreeContains(child, taskId));
  }

  function subtreeHeight(task) {
    return task.children.length ? 1 + Math.max(...task.children.map(subtreeHeight)) : 0;
  }

  function taskDepth(tasks, taskId, depth = 0) {
    for (const task of tasks) {
      if (task.id === taskId) return depth;
      const childDepth = taskDepth(task.children, taskId, depth + 1);
      if (childDepth >= 0) return childDepth;
    }
    return -1;
  }

  function dropDestination(sourceId, targetId, intent) {
    if (!sourceId || sourceId === targetId) return null;
    const source = findContainer(state.tasks, sourceId);
    const target = findContainer(state.tasks, targetId);
    if (!source || !target) return null;
    const sourceTask = source.tasks[source.index];
    const targetTask = target.tasks[target.index];
    if (subtreeContains(sourceTask, targetId)) return null;
    const inside = intent === 'inside';
    const destination = inside ? targetTask.children : target.tasks;
    const index = inside ? destination.length : target.index + (intent === 'after' ? 1 : 0);
    const depth = taskDepth(state.tasks, targetId) + (inside ? 1 : 0);
    if (depth + subtreeHeight(sourceTask) > MAX_DEPTH) return null;
    return { source, targetTask, destination, index, depth, intent };
  }

  function dropTask(sourceId, targetId, intent) {
    const move = dropDestination(sourceId, targetId, intent);
    if (!move) return;
    const [task] = move.source.tasks.splice(move.source.index, 1);
    let insertionIndex = move.index;
    if (move.source.tasks === move.destination && move.source.index < insertionIndex) insertionIndex -= 1;
    move.destination.splice(insertionIndex, 0, task);
    if (move.intent === 'inside') {
      move.targetTask.collapsed = false;
      setStatus(`Moved “${task.title}” into “${move.targetTask.title}”.`);
    } else if (move.destination === state.tasks && move.source.tasks !== state.tasks) {
      setStatus(`Moved “${task.title}” to the top level.`);
    } else {
      setStatus(`Moved “${task.title}”.`);
    }
    focusRequest = { type: 'action', taskId: task.id, action: 'edit-title' };
    save(); render();
  }

  function dropIntent(event, item) {
    const bounds = item.getBoundingClientRect();
    const ratio = bounds.height ? (event.clientY - bounds.top) / bounds.height : .5;
    if (ratio < .25) return 'before';
    if (ratio > .75) return 'after';
    return 'inside';
  }

  function dragHandle(task, item) {
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';
    handle.draggable = true;
    handle.title = 'Drag to reorder';
    // Pointer-only affordance: move up/down buttons cover keyboard reordering,
    // so keep this out of the tab order and the accessibility tree.
    handle.tabIndex = -1;
    handle.setAttribute('aria-hidden', 'true');
    handle.addEventListener('dragstart', event => {
      draggedId = task.id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', task.id);
      if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(item, 0, 0);
      item.classList.add('dragging');
    });
    handle.addEventListener('dragend', () => {
      draggedId = null;
      item.classList.remove('dragging');
    });
    return handle;
  }

  function dropZone(task, item) {
    const clear = () => item.classList.remove('drag-before', 'drag-inside', 'drag-after');
    item.addEventListener('dragover', event => {
      // Innermost task wins: nested list items are inside their parent's element.
      event.stopPropagation();
      const intent = dropIntent(event, item);
      if (!dropDestination(draggedId, task.id, intent)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      clear();
      item.classList.add(`drag-${intent}`);
    });
    item.addEventListener('dragleave', event => { event.stopPropagation(); clear(); });
    item.addEventListener('drop', event => {
      event.preventDefault();
      event.stopPropagation();
      const intent = dropIntent(event, item);
      clear();
      const sourceId = draggedId || event.dataTransfer.getData('text/plain');
      draggedId = null;
      if (sourceId) dropTask(sourceId, task.id, intent);
    });
  }

  function deleteTask(task) {
    const location = findContainer(state.tasks, task.id);
    if (!location || !confirm(`Delete “${task.title}” and its subtasks?`)) return;
    const fallback = location.tasks[location.index + 1] || location.tasks[location.index - 1];
    location.tasks.splice(location.index, 1);
    focusRequest = fallback ? { type: 'action', taskId: fallback.id, action: 'edit-title' } : { type: 'new-task' };
    save(); render(); setStatus('Task deleted.');
  }

  function renderTask(task, depth, siblings, index) {
    const item = document.createElement('li');
    item.className = `task${task.completed ? ' completed' : ''}`;
    item.dataset.taskId = task.id;
    const main = document.createElement('div'); main.className = 'task-main';
    const handle = dragHandle(task, item);
    const check = document.createElement('input');
    check.type = 'checkbox'; check.className = 'checkbox'; check.checked = task.completed;
    check.setAttribute('aria-label', `Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`);
    check.addEventListener('change', () => {
      setSubtreeCompletion(task, check.checked);
      if (!check.checked) uncompleteAncestors(state.tasks, task.id);
      save(); render();
    });
    const copy = document.createElement('div'); copy.className = 'task-copy'; copy.append(titleButton(task));
    const actions = document.createElement('div'); actions.className = 'task-actions';
    dropZone(task, item);
    const hasDetails = Boolean(task.description || task.children.length);
    if (hasDetails) {
      const toggle = makeButton({ label: `${task.collapsed ? 'Expand' : 'Collapse'} details for ${task.title}`, text: task.collapsed ? '+' : '−', action: 'toggle-details', taskId: task.id, handler: () => { task.collapsed = !task.collapsed; focusRequest = { type: 'action', taskId: task.id, action: 'toggle-details' }; save(); render(); }, className: 'icon collapse-toggle' });
      toggle.setAttribute('aria-expanded', String(!task.collapsed));
      actions.append(toggle);
    }
    actions.append(makeButton({ label: `${task.description ? 'Edit' : 'Add'} description for ${task.title}`, text: '≡', action: 'edit-description', taskId: task.id, handler: () => { task.collapsed = false; const detail = item.querySelector('.task-details'); if (detail) { detail.hidden = false; descriptionEditor(task, detail); } } }));
    actions.append(makeButton({ label: `Move ${task.title} up`, text: '↑', action: 'move-up', taskId: task.id, disabled: index === 0, handler: () => moveTask(siblings, index, -1) }));
    actions.append(makeButton({ label: `Move ${task.title} down`, text: '↓', action: 'move-down', taskId: task.id, disabled: index === siblings.length - 1, handler: () => moveTask(siblings, index, 1) }));
    actions.append(makeButton({ label: `Delete ${task.title}`, text: '×', action: 'delete', taskId: task.id, handler: () => deleteTask(task) }));
    main.append(handle, check, copy, actions); item.append(main);

    const details = document.createElement('div'); details.className = 'task-details'; details.hidden = task.collapsed;
    if (task.description) { const description = document.createElement('p'); description.className = 'task-description'; description.textContent = task.description; details.append(description); }
    const visibleChildren = task.children.filter(shouldShow);
    if (visibleChildren.length) { const children = document.createElement('ul'); children.className = 'subtasks'; children.setAttribute('aria-label', `Subtasks for ${task.title}`); visibleChildren.forEach(child => children.append(renderTask(child, depth + 1, task.children, task.children.indexOf(child)))); details.append(children); }
    if (depth < MAX_DEPTH) {
      const form = document.createElement('form'); form.className = 'subtask-form';
      const input = document.createElement('input'); input.type = 'text'; input.required = true; input.maxLength = MAX_TITLE; input.autocomplete = 'off'; input.placeholder = 'Add a subtask'; input.className = 'subtask-input'; input.dataset.taskId = task.id; input.setAttribute('aria-label', `Add a subtask to ${task.title}`);
      const add = document.createElement('button'); add.type = 'submit'; add.tabIndex = 0; add.textContent = 'Add'; add.setAttribute('aria-label', `Add subtask to ${task.title}`);
      form.append(input, add);
      form.addEventListener('submit', event => { event.preventDefault(); const title = input.value.trim(); if (!title) return; const child = { id: id(), title: cleanText(title, MAX_TITLE), description: '', completed: false, collapsed: false, children: [] }; task.children.push(child); task.collapsed = false; focusRequest = { type: 'action', taskId: child.id, action: 'edit-title' }; save(); render(); });
      details.append(form);
    }
    item.append(details);
    return item;
  }

  function restoreFocus() {
    if (!focusRequest) return;
    const request = focusRequest; focusRequest = null;
    let target = null;
    if (request.type === 'new-task') target = elements.title;
    if (request.type === 'search') target = elements.search;
    if (request.type === 'action') target = Array.from(document.querySelectorAll('[data-task-id][data-action]')).find(node => node.dataset.taskId === request.taskId && node.dataset.action === request.action);
    if (request.type === 'edit-title') {
      target = Array.from(document.querySelectorAll('[data-action="edit-title"]')).find(node => node.dataset.taskId === request.taskId);
      if (target) { target.click(); return; }
    }
    (target || elements.title).focus();
  }

  function openTitleEditor(taskId) {
    const title = Array.from(document.querySelectorAll('[data-action="edit-title"]')).find(node => node.dataset.taskId === taskId);
    if (title) title.click();
  }

  function render() {
    elements.list.replaceChildren();
    const visible = state.tasks.filter(shouldShow);
    if (!visible.length) { const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = state.tasks.length ? 'No tasks in this view.' : 'Your list is clear. Add the first task above.'; elements.list.append(empty); }
    else visible.forEach(task => elements.list.append(renderTask(task, 0, state.tasks, state.tasks.indexOf(task))));
    elements.views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    elements.clearSearch.hidden = !state.query;
    restoreFocus();
  }

  elements.form.addEventListener('submit', event => {
    event.preventDefault(); const title = elements.title.value.trim(); if (!title) return;
    state.tasks.push({ id: id(), title: cleanText(title, MAX_TITLE), description: cleanText(elements.description.value, MAX_DESCRIPTION), completed: false, collapsed: false, children: [] });
    elements.form.reset(); save(); render(); elements.title.focus();
  });
  elements.addTask.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    elements.search.focus();
  });
  elements.search.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey) { event.preventDefault(); elements.addTask.focus(); return; }
    const firstParent = state.tasks.find(shouldShow);
    if (!firstParent) return;
    event.preventDefault();
    openTitleEditor(firstParent.id);
  });
  elements.views.forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
  elements.search.addEventListener('input', () => { state.query = elements.search.value; render(); });
  elements.clearSearch.addEventListener('click', () => { state.query = ''; elements.search.value = ''; render(); elements.search.focus(); });
  elements.export.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: STORAGE_VERSION, exportedAt: new Date().toISOString(), tasks: state.tasks }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'plain-list-backup.json'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); setStatus('Backup downloaded.');
  });
  elements.importButton.addEventListener('click', () => elements.importInput.click());
  elements.importInput.addEventListener('change', async () => {
    const file = elements.importInput.files[0]; elements.importInput.value = ''; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setStatus('That backup is too large to import.'); return; }
    try { const data = JSON.parse(await file.text()); if (!Array.isArray(data && data.tasks)) throw new Error('invalid'); if (!confirm('Replace the current list with this backup?')) return; state.tasks = validateTasks(data.tasks); save(); render(); setStatus('Backup imported.'); }
    catch (_) { setStatus('That file is not a valid Plain List backup.'); }
  });
  elements.clear.addEventListener('click', () => { if (!state.tasks.length || !confirm('Clear every task from this browser? This cannot be undone.')) return; state.tasks = []; focusRequest = { type: 'new-task' }; save(); render(); setStatus('All tasks cleared.'); });
  load(); render();
})();
