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
          document.getElementById('pdf-iframe').contentWindow.location.reload();
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