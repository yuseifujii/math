// Mt.MATH - 共通サイトスクリプト（ナビ、モバイルメニュー、テーマ切替）
(() => {
  function initNav() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
      });
      navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
          navMenu.classList.remove('active');
          navToggle.classList.remove('active');
        });
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('mt.theme', theme); } catch (_) {}
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function initTheme() {
    let theme = 'light';
    try { theme = localStorage.getItem('mt.theme') || 'light'; } catch (_) {}
    applyTheme(theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        theme = (document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark';
        applyTheme(theme);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTheme();
  });
})();


