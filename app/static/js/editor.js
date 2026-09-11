(() => {
  'use strict';
  
  require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@latest/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    // 註冊 latex 語言
    monaco.languages.register({ id: 'latex' });

    // 定義 latex 語法高亮
    monaco.languages.setMonarchTokensProvider('latex', {
      tokenizer: {
        root: [
          [/\\[a-zA-Z]+/, "keyword"],        // 指令，如 \frac
          [/%.*$/, "comment"],               // 註解
          [/\$[^$]*\$/, "string"],           // $...$
          [/\\\[/, { token: "string", next: "@mathEnv" }], // \[...\]
          [/{|}/, "delimiter.bracket"],      // 大括號
        ],
        mathEnv: [
          [/\\\]/, { token: "string", next: "@pop" }],
          [/./, "string"]
        ]
      }
    });

    // 建立 Monaco 編輯器（使用暗色主題）
    const texContents = JSON.parse(document.getElementById('init-tex-contents').textContent)
    const monacoEditor = monaco.editor.create(document.getElementById('editor'), {
      value: texContents,
      language: 'latex',
      theme: 'vs-dark',
      fontSize: 16,
      automaticLayout: true
    });

    // Mobile Device
    if (document.body.offsetWidth / document.body.offsetHeight <= 0.9) {
      monacoEditor.updateOptions({ fontSize: 16 });
    }
  });

  const saveAndCompileBtn = document.getElementById("save-and-compile-btn");
  const loadingSvg = document.getElementById("loading-svg");

  function switchToLoading() {
    saveAndCompileBtn.style.display = 'none';
    loadingSvg.style.display = 'block';
  }

  function switchBackFromLoading() {
    loadingSvg.style.display = 'none';
    saveAndCompileBtn.style.display = 'flex';
  }

  function reloadPDFIframe() {
    const iframe = document.getElementById('pdf-iframe');
    const pdfApp = iframe.contentWindow.PDFViewerApplication;

    // 1. 備份當前的「頁碼」與「滾動容器的 scrollTop 百分比（防止縮放誤差）」
    const savedPage = pdfApp.page; 
    const container = pdfApp.pdfViewer.container; // 這是實際在滾動的 HTML Div
    const savedScrollTop = container.scrollTop;
    const currentPdfUrl = pdfApp.baseUrl;

    // 2. 註冊一次性監聽器：等到新 PDF「所有頁面都載入並計算好尺寸」時
    const onPagesLoaded = () => {
      // 核心捷徑：利用內建屬性直接指派頁碼，PDF.js 會自動滾動到該頁
      pdfApp.page = savedPage;
      
      // 如果需要像素級的精準度，再用 setTimeout 微調回當初的精準滾動點
      setTimeout(() => {
        container.scrollTop = savedScrollTop;
      }, 50);
      
      // 自動收起側欄
      if (pdfApp.pdfSidebar) {
        pdfApp.pdfSidebar.close();
      }

      pdfApp.eventBus.off("pagesloaded", onPagesLoaded);
    };

    // 3. 綁定新版事件巴士
    pdfApp.eventBus.on("pagesloaded", onPagesLoaded);

    // 4. 重新載入（加入時間戳記強迫刷新快取）
    pdfApp.open({
      url: currentPdfUrl.split('?')[0] + '?t=' + Date.now()
    });
  }

  function saveAndCompile() {
    switchToLoading();
    const latexContent = monaco.editor.getModels()[0].getValue();
    fetch('/save_and_compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: latexContent })
    })
    .then(response => { return response.json(); })
    .then(data => {
      // Reload iframe
      if (data.status === 200) {
        reloadPDFIframe();
        switchBackFromLoading();
      } else {
        alert(`Compile Failed: ${data.content}`);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  }

  // Ctrl + S to save and compile data
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveAndCompile();
    }
  });
  
  // save-and-compile-btn onclick
  saveAndCompileBtn.addEventListener('click', () => {
    saveAndCompile();
  });
})();