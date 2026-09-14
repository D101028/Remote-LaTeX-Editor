(() => {
  'use strict';

  const settingsBtn = document.getElementById('settings-svg');
  const panelContainer = document.getElementById('setting-panel-container');
  let panelStatus = 'off';

  const closeBtn = document.getElementById('panel-close-btn');
  const applyBtn = document.getElementById('panel-apply-btn');
  const panel = document.getElementById('setting-panel');
  const workspaceSelect = document.getElementById('workspace-select');
  const currentWorkspaceForm = document.getElementById('current-workspace-form');
  const newWorkspaceForm = document.getElementById('new-workspace-form');
  const createWorkspaceBtn = document.getElementById('create-workspace-btn');
  const workspaceStatus = document.getElementById('workspace-status');
  const currentWorkspaceToggle = document.getElementById('current-workspace-title');
  const currentWorkspaceContent = document.getElementById('current-workspace-content');
  const newWorkspaceToggle = document.getElementById('new-workspace-title');
  const workspacesById = new Map();

  function setStatus(message, isError = false) {
    workspaceStatus.textContent = message;
    workspaceStatus.classList.toggle('is-error', isError);
  }

  function addWorkspaceOption(workspace) {
    workspacesById.set(workspace.workspace_id, workspace);
    const option = document.createElement('option');
    option.value = workspace.workspace_id;
    option.textContent = workspace.workspace_id;
    workspaceSelect.append(option);
  }

  function formValues(form) {
    return Object.fromEntries(
      [...new FormData(form).entries()].map(([name, value]) => [
        name,
        typeof value === 'string' ? value.trim() : value,
      ]),
    );
  }

  function populateCurrentWorkspace() {
    const workspace = workspacesById.get(workspaceSelect.value);
    if (!workspace) return;

    for (const field of ['working_dir', 'tex_filename', 'compile_cmd']) {
      currentWorkspaceForm.elements[field].value = workspace[field] || '';
    }
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Unable to update the workspace.');
    }
    return data;
  }

  async function loadWorkspaces() {
    workspaceSelect.disabled = true;
    applyBtn.disabled = true;
    workspaceSelect.replaceChildren(new Option('Loading workspaces…', ''));

    try {
      const data = await requestJson('/api/workspaces');
      workspaceSelect.replaceChildren();
      workspacesById.clear();
      data.workspaces.forEach(addWorkspaceOption);
      workspaceSelect.value = data.current_workspace_id;
      populateCurrentWorkspace();
      workspaceSelect.disabled = false;
      applyBtn.disabled = false;
      setStatus('');
    } catch (error) {
      workspaceSelect.replaceChildren(new Option('Unable to load workspaces', ''));
      setStatus(error.message, true);
    }
  }

  function switchOnPanel() {
    if (panelStatus !== 'off') return;
    // 1. 顯示容器
    panelContainer.style.display = 'flex';
    
    // 2. 延遲一點點時間執行滑入，確保 display: flex 已經生效
    setTimeout(() => {
      panel.style.transform = 'translateY(0)';
    }, 10);
    
    panelStatus = 'on';
    loadWorkspaces();
  }
  function switchOffPanel() {
    if (panelStatus !== 'on') return;
    
    // 讓 panel 滑出螢幕下方
    panel.style.transform = 'translateY(100%)';
    panelContainer.style.display = 'none';
    
    panelStatus = 'off';
  }

  // Switcher
  settingsBtn.addEventListener('click', switchOnPanel);
  closeBtn.addEventListener('click', switchOffPanel);
  workspaceSelect.addEventListener('change', populateCurrentWorkspace);
  currentWorkspaceToggle.addEventListener('click', () => {
    const isExpanded = currentWorkspaceToggle.getAttribute('aria-expanded') === 'true';
    currentWorkspaceToggle.setAttribute('aria-expanded', String(!isExpanded));
    currentWorkspaceContent.hidden = isExpanded;
  });
  newWorkspaceToggle.addEventListener('click', () => {
    const isExpanded = newWorkspaceToggle.getAttribute('aria-expanded') === 'true';
    newWorkspaceToggle.setAttribute('aria-expanded', String(!isExpanded));
    newWorkspaceForm.hidden = isExpanded;
  });
  currentWorkspaceForm.addEventListener('submit', (event) => event.preventDefault());

  newWorkspaceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const workspace = formValues(newWorkspaceForm);
    const workspaceId = workspace.workspace_id;
    if (!workspaceId) return;

    createWorkspaceBtn.disabled = true;
    setStatus('Creating workspace…');
    try {
      const data = await requestJson('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(workspace),
      });
      addWorkspaceOption(data.workspace);
      workspaceSelect.value = data.workspace.workspace_id;
      populateCurrentWorkspace();
      newWorkspaceForm.reset();
      setStatus(`Created “${data.workspace.workspace_id}”. Press Apply to switch to it.`);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      createWorkspaceBtn.disabled = false;
    }
  });

  applyBtn.addEventListener('click', async () => {
    const workspaceId = workspaceSelect.value;
    if (!workspaceId) return;
    if (!currentWorkspaceForm.reportValidity()) return;

    applyBtn.disabled = true;
    setStatus('Saving workspace…');
    try {
      const workspace = await requestJson(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
        method: 'PUT',
        body: JSON.stringify(formValues(currentWorkspaceForm)),
      });
      workspacesById.set(workspaceId, workspace.workspace);
      setStatus('Switching workspace…');
      await requestJson(`/api/workspaces/${encodeURIComponent(workspaceId)}/switch`, {
        method: 'POST',
      });
      window.location.reload();
    } catch (error) {
      setStatus(error.message, true);
      applyBtn.disabled = false;
    }
  });

})();
