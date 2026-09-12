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

  function setPreviewWidth(percent) {
    if (percent < 0 || percent > 100) {
      throw Error(`Unsupported ratio: ${ratio}`);
    }
    editor.style.width = `${100-percent}%`;
    preview.style.width = `${percent}%`;
  }

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

      setPreviewWidth(iframePercent);
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
    const docWidth = document.documentElement.offsetWidth;
    const previewWidth = preview.offsetWidth;

    if (docWidth <= 600) {
      // 手機寬度
      setPreviewWidth(100);
    } else {
      // 寬頻顯示器
      if (previewWidth <= docWidth / 3) {
        setPreviewWidth(50);
      } else {
        setPreviewWidth(100);
      }
    }
  });
  rightArrowRect.addEventListener('click', () => {
    const docWidth = document.documentElement.offsetWidth;
    const editorWidth = editor.offsetWidth;

    if (docWidth <= 600) {
      // 手機寬度
      setPreviewWidth(0);
    } else {
      // 寬頻顯示器
      if (editorWidth <= docWidth / 3) {
        setPreviewWidth(50);
      } else {
        setPreviewWidth(0);
      }
    }
  });
})();