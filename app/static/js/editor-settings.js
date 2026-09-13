(() => {
  'use strict';

  const settingsBtn = document.getElementById('settings-svg');
  const panelContainer = document.getElementById('setting-panel-container');
  let panelStatus = 'off';

  const closeBtn = document.getElementById('panel-close-btn');
  const panel = document.getElementById('setting-panel');

  function switchOnPanel() {
    if (panelStatus !== 'off') return;
    // 1. 顯示容器
    panelContainer.style.display = 'flex';
    
    // 2. 延遲一點點時間執行滑入，確保 display: flex 已經生效
    setTimeout(() => {
      panel.style.transform = 'translateY(0)';
    }, 10);
    
    panelStatus = 'on';
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

})();