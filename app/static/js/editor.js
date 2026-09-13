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
      fontSize: 20,
      automaticLayout: true, 
      wordWrap: 'on', // 強制開啟自動換行
      // Tab Settings
      tabSize: 2,         // 1. 將一個 Tab 的寬度設定為 2 個空格
      insertSpaces: true, // 2. 按下 Tab 鍵時，自動插入空格（而不是真正的 \t 字元）
      detectIndentation: false // 3. 停用自動偵測（強迫編輯器嚴格執行上面的 2 空格設定）
    });

    // 註冊摺疊規則
    monaco.languages.registerFoldingRangeProvider('latex', {
      provideFoldingRanges: function (model, context, token) {
        var foldingRanges = [];
        var lines = model.getLineCount();
        
        // 用來追蹤 \begin 的堆疊 (Stack)
        var beginStack = [];
        var preambleStart = -1;

        for (var i = 1; i <= lines; i++) {
          var content = model.getLineContent(i).trim();

          // 跳過空行
          if (content === '') continue;

          // 1. 記錄 \documentclass 的行號作為導言區起點
          if (content.indexOf('\\documentclass') === 0) {
            preambleStart = i;
          }

          // 2. 匹配 \begin{...} 和 \end{...}
          var beginMatch = content.match(/\\begin\{([^}]+)\}/);
          var endMatch = content.match(/\\end\{([^}]+)\}/);

          if (beginMatch) {
            var envName = beginMatch[1]; // 取得括號內的大環境名稱（例如 document, equation）

            // 如果碰到了 \begin{document}，且前面有 \documentclass，就建立導言區摺疊
            if (envName === 'document' && preambleStart !== -1 && i > preambleStart) {
              foldingRanges.push({
                start: preambleStart,
                end: i - 1,
                kind: monaco.languages.FoldingRangeKind.Region
              });
            }

            // 將當前環境名稱與行號壓入堆疊
            beginStack.push({ name: envName, line: i });
          } 
          else if (endMatch) {
            var endEnvName = endMatch[1];

            // 尋找堆疊中最近一個名稱相符的 \begin
            for (var j = beginStack.length - 1; j >= 0; j--) {
              if (beginStack[j].name === endEnvName) {
                var lastBegin = beginStack.splice(j, 1)[0]; // 移除並取出該元素
                
                // 摺疊範圍：從 \begin 到 \end 這一行
                if (i > lastBegin.line) {
                  foldingRanges.push({
                    start: lastBegin.line,
                    end: i,
                    kind: monaco.languages.FoldingRangeKind.Region
                  });
                }
                break;
              }
            }
          }
        }

        return foldingRanges;
      }
  
    });

    // 註冊 LaTeX 的自動縮排與換行規則
    monaco.languages.setLanguageConfiguration('latex', {
      onEnterRules: [
        {
          // 當前一行是以 \begin{...} 結尾，且下一行是以 \end{...} 開頭時
          // 按下 Enter 會把 \end 推到下一行，並在中間插入一個帶縮排的空行
          beforeText: /\\begin\{[^}]+\}\s*$/,
          afterText: /\\end\{[^}]+\}/,
          action: {
              indentAction: monaco.languages.IndentAction.IndentOutdent
          }
        },
        {
          // 當前一行僅以 \begin{...} 結尾（下方還沒有 \end）
          // 按下 Enter 後，下一行會自動縮排
          beforeText: /\\begin\{[^}]+\}\s*$/,
          action: {
              indentAction: monaco.languages.IndentAction.Indent
          }
        }
      ]
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