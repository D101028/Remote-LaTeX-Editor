(() => {
  'use strict';

  // window.addEventListener('resize', () => {
  //   // Reload all CSS files
  //   document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
  //     const href = link.getAttribute('href').split('?')[0];
  //     link.setAttribute('href', `${href}?reload=${Date.now()}`);
  //   });
  //   // Reload this JS file
  //   if (script) {
  //     const script = document.getElementById('resize-script');
  //     const src = script.getAttribute('src').split('?')[0];
  //     const newScript = document.createElement('script');
  //     newScript.id = 'resize-script';
  //     newScript.src = `${src}?reload=${Date.now()}`;
  //     document.body.appendChild(newScript);
  //     script.remove();
  //     window.removeEventListener('resize', arguments.callee);
  //   }
  // });
  
  if (document.body.offsetWidth / document.body.offsetHeight >= 0.9) return;

  const divider = document.getElementById('divider');
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');

  divider.style.pointerEvents = 'none';
  editor.style.width = "100%";
  preview.style.width = "0%";

  const rightArrow = document.getElementById('divider-right-arrow');
  const leftArrow = document.getElementById('divider-left-arrow');

  rightArrow.style.top = `${document.body.offsetHeight * 0.6}px`;
  leftArrow.style.top = `${document.body.offsetHeight * 0.7}px`;
})();