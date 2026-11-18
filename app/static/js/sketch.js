(() => {
  'use strict';

  const plugin = document.getElementById('sketch-plugin');
  const header = document.getElementById('sketch-header');
  const container = document.getElementById('sketch-canvas-container');
  const canvas = document.getElementById('sketch-canvas');
  const ctx = canvas.getContext('2d');
  const modeBadge = document.getElementById('sketch-mode');
  const penOnlyCheckbox = document.getElementById('sketch-pen-only');
  
  // 工具列元素
  const colorBtns = document.querySelectorAll('.sketch-color');
  const sizeSlider = document.getElementById('sketch-size');
  const eraserBtn = document.getElementById('sketch-eraser');
  const clearBtn = document.getElementById('sketch-clear');

  let currentColor = '#1c1c1e';
  let baseSize = 3;
  let isEraser = false;

  // ==========================================
  // 1. 拖曳功能 (移動外掛位置)
  // ==========================================
  let isDragging = false;
  let dragStartX, dragStartY, initialLeft, initialTop;

  header.addEventListener('pointerdown', (e) => {
    // 如果點擊的是按鈕，直接 return，不觸發拖曳
    if (e.target.closest('.sketch-header-btn')) {
      return;
    }
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = plugin.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    header.setPointerCapture(e.pointerId);
  });

  header.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    plugin.style.left = `${initialLeft + dx}px`;
    plugin.style.top = `${initialTop + dy}px`;
  });

  header.addEventListener('pointerup', () => isDragging = false);
  header.addEventListener('pointercancel', () => isDragging = false);

  // ==========================================
  // 2. 畫布縮放適應 (使用 ResizeObserver)
  // ==========================================
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    // 避免錯誤
    if (rect.width === 0 || rect.height === 0) return;
    
    // 暫存目前畫面
    const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 填滿白底
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // 還原畫面
    if (tempImage.width > 0) ctx.putImageData(tempImage, 0, 0);
  }

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(container);

  // ==========================================
  // 3. 繪圖與模式偵測 (Pencil vs Touch)
  // ==========================================
  let isDrawing = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    // 更新模式狀態顯示
    if (e.pointerType === 'pen') {
      modeBadge.textContent = '✏️ Pencil';
      modeBadge.style.background = '#d1e5ff';
    } else if (e.pointerType === 'touch') {
      modeBadge.textContent = '👆 Touch';
      modeBadge.style.background = '#ffe5d1';
    } else {
      modeBadge.textContent = '🖱️ Mouse';
      modeBadge.style.background = '#e0e0e0';
    }

    // 防誤觸：如果開啟「僅 Pencil」，但當前是手指觸控，則不允許畫圖
    if (penOnlyCheckbox.checked && e.pointerType === 'touch') return;

    isDrawing = true;
    canvas.setPointerCapture(e.pointerId);
    lastX = e.offsetX;
    lastY = e.offsetY;
    draw(e);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDrawing) return;
    draw(e);
  });

  const stopDrawing = () => isDrawing = false;
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);

  function draw(e) {
    let pressure = e.pressure;
    if (e.pointerType !== 'pen' || pressure === 0) pressure = 0.5;

    const currentSize = isEraser ? baseSize * 4 : baseSize * (pressure * 2);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY); // 使用 offsetX/Y 相對畫布座標
    ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
    ctx.lineWidth = Math.max(1, currentSize);
    ctx.stroke();

    lastX = e.offsetX;
    lastY = e.offsetY;
  }

  // ==========================================
  // 4. 工具列互動
  // ==========================================
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      isEraser = false;
      eraserBtn.classList.remove('active');
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
    });
  });

  sizeSlider.addEventListener('input', (e) => baseSize = parseInt(e.target.value, 10));

  eraserBtn.addEventListener('click', () => {
    isEraser = !isEraser;
    eraserBtn.classList.toggle('active', isEraser);
  });

  clearBtn.addEventListener('click', () => {
    const rect = container.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  });

  // 顯示開關
  let toggle = false;
  function toggleSketch() {
    if (!toggle) {
      plugin.style.display = 'flex';
      toggle = true;
    } else {
      plugin.style.display = 'none';
      toggle = false;
    }
  }
  const toggleBtn = document.getElementById("toggle-sketch");
  const closeBtn = document.getElementById("sketch-close");
  toggleBtn.addEventListener('click', toggleSketch);
  closeBtn.addEventListener('click', toggleSketch);

  // 上傳圖像
  const submitBtn = document.getElementById("sketch-submit");
  submitBtn.addEventListener('click', async () => {
    if (plugin.dataset.ocrEnabled !== 'true') {
      alert('OCR is disabled.');
      return;
    }

    submitBtn.disabled = true;
    try {
      const response = await fetch(plugin.dataset.ocrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: canvas.toDataURL('image/png') })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'OCR failed.');

      const event = new CustomEvent('sketch:insert-latex', {
        detail: data.result,
        cancelable: true
      });
      if (document.getElementById('editor').dispatchEvent(event)) {
        alert('Could not insert the OCR result into the editor.');
      }
    } catch (error) {
      console.error('OCR request failed:', error);
      alert(error instanceof SyntaxError ? 'OCR failed.' : error.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
  
})();
