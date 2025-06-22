(() => {
  'use strict';
  
  const divider = document.getElementById('divider');
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const iframe = document.getElementById('pdf-iframe');
  let isDragging = false;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    document.body.style.cursor = 'col-resize';
  });

  function mouseMove(doc = document) {
    const inner = (e) => {
      if (!isDragging) return;
      const totalWidth = document.querySelector('.inner-container').offsetWidth;
      const iframeWidth = doc.documentElement.offsetWidth - e.clientX;
      const iframePercent = (iframeWidth / totalWidth) * 100;

      // 限制最小與最大百分比
      if (iframePercent < 10 || iframePercent > 90) return;

      editor.style.width = `${100 - iframePercent}%`;
      preview.style.width = `${iframePercent}%`;
    }
    return inner;
  }

  const mouseUp = (e) => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = 'default';
    }
  }

  document.addEventListener('mousemove', mouseMove());

  iframe.onload = () => {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.addEventListener('mousemove', mouseMove(iframeDoc));
    iframeDoc.addEventListener('mouseup', mouseUp);
  }

  document.addEventListener('mouseup', mouseUp);
})();