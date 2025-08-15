// Mt.MATH - Application Boot (Dashboard-grade UX)
(function(){
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  // Reading progress (article)
  function initReadingProgress(){
    const bar = document.querySelector('.progress-bar');
    if (!bar) return;
    const update = () => {
      const el = document.getElementById('article-content-html') || document.body;
      const rect = el.getBoundingClientRect();
      const total = (el.scrollHeight - window.innerHeight);
      const scrolled = Math.min(total, window.scrollY);
      bar.style.width = Math.max(0, (scrolled/Math.max(1,total))*100)+'%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // Table of contents (article)
  function initTOC(){
    const toc = document.querySelector('.toc');
    const content = document.getElementById('article-content-html');
    if (!toc || !content) return;
    const headings = $$('h2, h3', content);
    toc.innerHTML = '<h4>目次</h4>' + headings.map(h => `<a href="#${h.id || (h.id = 'h_'+Math.random().toString(36).slice(2))}">${h.textContent}</a>`).join('');
    const links = $$('a', toc);
    const obs = new IntersectionObserver((entries)=>{
      const top = entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if (!top) return;
      links.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+top.target.id));
    }, { rootMargin: '0px 0px -70% 0px', threshold: [0, 1] });
    headings.forEach(h=>obs.observe(h));
  }

  // Remove dummy sparkline (not enterprise-grade)
  function initSparklines(){}

  // Command palette
  function initCmdK(){
    const overlay = document.createElement('div');
    overlay.className = 'cmdk-overlay';
    overlay.innerHTML = `
      <div class="cmdk">
        <div class="cmdk-header"><input id="cmdk-input" placeholder="コマンドを入力（検索 / 移動 / Conway）"/></div>
        <div class="cmdk-list" id="cmdk-list"></div>
      </div>`;
    document.body.appendChild(overlay);

    function open(){ overlay.style.display = 'flex'; $('#cmdk-input').focus(); render(''); }
    function close(){ overlay.style.display = 'none'; }

    function render(q){
      const list = $('#cmdk-list');
      const entries = [
        { label:'ホームへ移動', action:()=>location.href='index.html' },
        { label:'記事（一覧）へ移動', action:()=>document.querySelector('#articles')?.scrollIntoView({behavior:'smooth'}) },
        { label:"Conway's Game of Life を開く", action:()=>location.href='conways.html' },
        { label:'法務情報を開く', action:()=>location.href='legal.html' },
        { label:'プライバシーポリシーを開く', action:()=>location.href='privacy.html' },
      ].filter(it=> !q || it.label.toLowerCase().includes(q.toLowerCase()));
      list.innerHTML = entries.map(it=> `<div class="cmdk-item"><div class="muted">›</div><div>${it.label}</div></div>`).join('');
      Array.from(list.children).forEach((row, i)=> row.onclick = entries[i].action);
    }

    document.addEventListener('keydown', (e)=>{
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); open(); }
      if (e.key==='Escape') close();
    });
    overlay.addEventListener('click', (e)=>{ if (e.target===overlay) close(); });
    overlay.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });
    overlay.addEventListener('input', (e)=>{ if (e.target.id==='cmdk-input') render(e.target.value); });
  }

  // Sidebar active link
  function markActive(){
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sb-link').forEach(a=>{
      const href = a.getAttribute('href');
      a.classList.toggle('active', href===path || (href.indexOf('#')>-1 && path==='index.html'));
    });
  }

  // App Init for pages using new shell
  function initAppShell(){
    if (!document.querySelector('.app-shell')) return;
    initSparklines();
    initCmdK();
    markActive();
  }

  // Article enhancements
  function initArticle(){
    initReadingProgress();
    initTOC();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initAppShell();
    initArticle();
  });
})();


