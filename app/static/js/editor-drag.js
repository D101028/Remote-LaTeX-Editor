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
      let iframeWidth = doc.documentElement.offsetWidth - e.clientX;
      let iframePercent = (iframeWidth / totalWidth) * 100;

      // 限制最小與最大百分比
      if (iframePercent < 10) {
        iframePercent = 0;
      } else if ( iframePercent > 90) {
        iframePercent = 100;
      } else if (iframePercent < 20) {
        iframePercent = 20;
      } else if (iframePercent > 80) {
        iframePercent = 80;
      }

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

  const leftArrowRect = document.getElementById("class-bg-rect-left");
  const rightArrowRect = document.getElementById("class-bg-rect-right");

  leftArrowRect.addEventListener('click', () => {
    const previewWidth = preview.offsetWidth;
    const docWidth = document.documentElement.offsetWidth;
    const percent = previewWidth / docWidth * 100;
    if (percent <= 30) {
      editor.style.width = `50%`;
      preview.style.width = `50%`;
    } else {
      editor.style.width = `0%`;
      preview.style.width = `100%`;
    }
  });
  rightArrowRect.addEventListener('click', () => {
    const previewWidth = preview.offsetWidth;
    const docWidth = document.documentElement.offsetWidth;
    const percent = previewWidth / docWidth * 100;
    if (percent >= 70) {
      editor.style.width = `50%`;
      preview.style.width = `50%`;
    } else {
      editor.style.width = `100%`;
      preview.style.width = `0%`;
    }
  });
})();