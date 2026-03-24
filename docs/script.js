/* ============================================================
   Language tabs
   ============================================================ */
document.querySelectorAll('.lang-tabs').forEach(tabBar => {
  const tabs = tabBar.querySelectorAll('.lang-tab');
  const codeBlock = tabBar.nextElementSibling; // .tabbed-code

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const lang = tab.dataset.lang;

      // Update active tab
      tabs.forEach(t => delete t.dataset.active);
      tab.dataset.active = '';

      // Show matching pre
      codeBlock.querySelectorAll('pre').forEach(pre => {
        delete pre.dataset.active;
        if (pre.dataset.lang === lang) pre.dataset.active = '';
      });
    });
  });
});

/* ============================================================
   Copy buttons
   ============================================================ */
const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;

function makeCopyBtn() {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.setAttribute('aria-label', 'Copy');
  btn.innerHTML = ICON_COPY;
  return btn;
}

function flashCopied(btn) {
  btn.innerHTML = ICON_CHECK;
  btn.classList.add('copied');
  setTimeout(() => { btn.innerHTML = ICON_COPY; btn.classList.remove('copied'); }, 1800);
}

function addCopyButton(wrap) {
  const btn = makeCopyBtn();
  btn.addEventListener('click', () => {
    const code = wrap.querySelector('pre[data-active], pre') || wrap;
    navigator.clipboard.writeText(code.innerText.trim()).then(() => flashCopied(btn));
  });
  wrap.appendChild(btn);
}

document.querySelectorAll('.code-block-wrap').forEach(addCopyButton);

// Hero install block
const heroInstall = document.querySelector('.hero-install');
if (heroInstall) {
  const btn = makeCopyBtn();
  btn.classList.add('hero-install-copy');
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(heroInstall.querySelector('code').innerText.trim()).then(() => flashCopied(btn));
  });
  heroInstall.appendChild(btn);
}
