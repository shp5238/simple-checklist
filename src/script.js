(() => {
      'use strict';
      const STORAGE_KEY = 'plain-list.v1';
      const MAX_TASKS = 1000, MAX_DEPTH = 12, MAX_TITLE = 240, MAX_DESCRIPTION = 4000;
      const state = { tasks: [], view: 'all', query: '' };
      const elements = {
        form: document.getElementById('task-form'), title: document.getElementById('task-title'), description: document.getElementById('task-description'),
        list: document.getElementById('task-list'), search: document.getElementById('search'), clearSearch: document.getElementById('clear-search'),
        export: document.getElementById('export-button'), importInput: document.getElementById('import-input'), importButton: document.getElementById('import-button'), clear: document.getElementById('clear-button'), status: document.getElementById('status'), views: Array.from(document.querySelectorAll('.view'))
      };
      const id = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const cleanText = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
      const setStatus = message => { elements.status.textContent = message; };
      function validateTasks(input, depth = 0, counter = { count: 0 }) {
        if (!Array.isArray(input) || depth > MAX_DEPTH) return [];
        return input.reduce((result, raw) => {
          if (counter.count >= MAX_TASKS || !raw || typeof raw !== 'object') return result;
          const title = cleanText(raw.title, MAX_TITLE).trim();
          if (!title) return result;
          counter.count += 1;
          result.push({ id: typeof raw.id === 'string' && raw.id.length <= 128 ? raw.id : id(), title, description: cleanText(raw.description, MAX_DESCRIPTION), completed: raw.completed === true, expanded: raw.expanded !== false, children: validateTasks(raw.children, depth + 1, counter) });
          return result;
        }, []);
      }
      function load() {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (!saved) return;
          const payload = JSON.parse(saved);
          state.tasks = validateTasks(payload && payload.tasks);
          if (payload && payload.version !== 1) setStatus('A saved list was safely updated.');
        } catch (_) { setStatus('Saved data could not be read. Starting with a new list.'); }
      }
      function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks })); }
        catch (_) { setStatus('Your change could not be saved in this browser. Export a backup if possible.'); }
      }
      function findTask(tasks, taskId) {
        for (const task of tasks) { if (task.id === taskId) return task; const found = findTask(task.children, taskId); if (found) return found; }
        return null;
      }
      function removeTask(tasks, taskId) {
        const index = tasks.findIndex(task => task.id === taskId);
        if (index >= 0) return tasks.splice(index, 1)[0];
        for (const task of tasks) { const removed = removeTask(task.children, taskId); if (removed) return removed; }
        return null;
      }
      function matchesQuery(task) {
        const q = state.query.trim().toLocaleLowerCase();
        if (!q) return true;
        return `${task.title}\n${task.description}`.toLocaleLowerCase().includes(q) || task.children.some(matchesQuery);
      }
      function matchesView(task) {
        const own = state.view === 'all' || (state.view === 'active' ? !task.completed : task.completed);
        return own || task.children.some(matchesView);
      }
      function shouldShow(task) { return matchesQuery(task) && matchesView(task); }
      function icon(label, symbol, handler) { const button = document.createElement('button'); button.type = 'button'; button.className = 'icon'; button.setAttribute('aria-label', label); button.textContent = symbol; button.addEventListener('click', handler); return button; }
      function renderTask(task, depth) {
        const item = document.createElement('li'); item.className = `task${task.completed ? ' completed' : ''}`;
        const main = document.createElement('div'); main.className = 'task-main';
        const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'checkbox'; check.checked = task.completed; check.setAttribute('aria-label', `Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`); check.addEventListener('change', () => { task.completed = check.checked; save(); render(); });
        const copy = document.createElement('div'); copy.className = 'task-copy'; const title = document.createElement('p'); title.className = 'task-title'; title.textContent = task.title; copy.append(title);
        if (task.description) { const description = document.createElement('p'); description.className = 'task-description'; description.textContent = task.description; copy.append(description); }
        const actions = document.createElement('div'); actions.className = 'task-actions';
        if (task.children.length) actions.append(icon(task.expanded ? 'Collapse subtasks' : 'Expand subtasks', task.expanded ? '−' : '+', () => { task.expanded = !task.expanded; save(); render(); }));
        actions.append(icon('Edit task', '✎', () => editTask(task)));
        actions.append(icon('Delete task', '×', () => { if (confirm(`Delete “${task.title}” and its subtasks?`)) { removeTask(state.tasks, task.id); save(); render(); setStatus('Task deleted.'); } }));
        main.append(check, copy, actions); item.append(main);
        if (task.expanded && task.children.length) { const children = document.createElement('ul'); children.className = 'subtasks'; task.children.filter(shouldShow).forEach(child => children.append(renderTask(child, depth + 1))); item.append(children); }
        if (depth < MAX_DEPTH) { const form = document.createElement('form'); form.className = 'subtask-form'; const input = document.createElement('input'); input.maxLength = MAX_TITLE; input.required = true; input.autocomplete = 'off'; input.placeholder = 'Add a subtask'; const add = document.createElement('button'); add.type = 'submit'; add.textContent = 'Add'; form.append(input, add); form.addEventListener('submit', event => { event.preventDefault(); const childTitle = input.value.trim(); if (!childTitle) return; task.children.push({ id: id(), title: childTitle, description: '', completed: false, expanded: true, children: [] }); task.expanded = true; save(); render(); }); item.append(form); }
        return item;
      }
      function render() {
        elements.list.replaceChildren();
        const visible = state.tasks.filter(shouldShow);
        if (!visible.length) { const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = state.tasks.length ? 'No tasks in this view.' : 'Your list is clear. Add the first task above.'; elements.list.append(empty); }
        else visible.forEach(task => elements.list.append(renderTask(task, 0)));
        elements.views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
        elements.clearSearch.hidden = !state.query;
      }
      function editTask(task) {
        const nextTitle = prompt('Task title', task.title); if (nextTitle === null) return;
        const title = cleanText(nextTitle, MAX_TITLE).trim(); if (!title) { setStatus('A task needs a title.'); return; }
        const nextDescription = prompt('Optional description', task.description); if (nextDescription === null) return;
        task.title = title; task.description = cleanText(nextDescription, MAX_DESCRIPTION); save(); render(); setStatus('Task updated.');
      }
      elements.form.addEventListener('submit', event => { event.preventDefault(); const title = elements.title.value.trim(); if (!title) return; state.tasks.push({ id: id(), title: cleanText(title, MAX_TITLE), description: cleanText(elements.description.value, MAX_DESCRIPTION), completed: false, expanded: true, children: [] }); elements.form.reset(); save(); render(); elements.title.focus(); });
      elements.views.forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
      elements.search.addEventListener('input', () => { state.query = elements.search.value; render(); });
      elements.clearSearch.addEventListener('click', () => { state.query = ''; elements.search.value = ''; render(); elements.search.focus(); });
      elements.export.addEventListener('click', () => { const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'plain-list-backup.json'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); setStatus('Backup downloaded.'); });
      elements.importButton.addEventListener('click', () => elements.importInput.click());
      elements.importInput.addEventListener('change', async () => { const file = elements.importInput.files[0]; elements.importInput.value = ''; if (!file) return; if (file.size > 2 * 1024 * 1024) { setStatus('That backup is too large to import.'); return; } try { const data = JSON.parse(await file.text()); const tasks = validateTasks(data && data.tasks); if (!Array.isArray(data && data.tasks)) throw new Error('invalid'); if (!confirm('Replace the current list with this backup?')) return; state.tasks = tasks; save(); render(); setStatus('Backup imported.'); } catch (_) { setStatus('That file is not a valid Plain List backup.'); } });
      elements.clear.addEventListener('click', () => { if (!state.tasks.length || !confirm('Clear every task from this browser? This cannot be undone.')) return; state.tasks = []; save(); render(); setStatus('All tasks cleared.'); });
      load(); render();
    })();