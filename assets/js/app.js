/**
 * Mt.MATH - Core Application JavaScript
 * Next-Generation Mathematical Platform
 */

class MtMathApp {
  constructor() {
    this.state = {
      theme: 'light',
      sidebarOpen: true,
      searchQuery: '',
      currentView: 'dashboard',
      articles: [],
      currentCategory: 'all',
      notifications: [],
      user: null
    };
    
    this.init();
  }

  async init() {
    // Initialize theme
    this.initTheme();
    
    // Initialize UI components
    this.initSidebar();
    this.initSearch();
    this.initKeyboardShortcuts();
    this.initScrollProgress();
    
    // Load data
    await this.loadArticles();
    
    // Initialize animations
    this.initAnimations();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('🚀 Mt.MATH Application initialized');
  }

  // Theme Management
  initTheme() {
    // Initialize theme - check system preference if no saved theme
    let savedTheme = localStorage.getItem('mt.theme');
    if (!savedTheme) {
      // Check device preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }
    this.setTheme(savedTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't explicitly set a preference
      if (!localStorage.getItem('mt.theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const newTheme = this.state.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
      });
    }
  }

  setTheme(theme) {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mt.theme', theme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  // Sidebar Management
  initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }
    
    // Handle sidebar links
    document.querySelectorAll('.sb-link').forEach(link => {
      link.addEventListener('click', (e) => {
        if (link.getAttribute('href') === '#') {
          e.preventDefault();
        }
        
        // Update active state
        document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Handle navigation
        const view = link.dataset.view;
        if (view) {
          this.navigateTo(view);
        }
      });
    });
    
    // Mobile sidebar handling
    if (window.innerWidth <= 1024) {
      this.state.sidebarOpen = false;
      sidebar?.classList.add('collapsed');
    }
  }

  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    this.state.sidebarOpen = !this.state.sidebarOpen;
    
    if (this.state.sidebarOpen) {
      sidebar?.classList.remove('collapsed');
    } else {
      sidebar?.classList.add('collapsed');
    }
  }

  // Search Functionality
  initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    });
    
    // Search focus shortcut
    searchInput.addEventListener('focus', () => {
      searchInput.select();
    });
  }

  performSearch(query) {
    this.state.searchQuery = query.toLowerCase();
    
    if (!query) {
      this.displayArticles(this.state.articles);
      return;
    }
    
    const filtered = this.state.articles.filter(article => {
      const searchableText = [
        article.title,
        article.summary,
        article.tags?.join(' '),
        article.category
      ].join(' ').toLowerCase();
      
      return searchableText.includes(query);
    });
    
    this.displayArticles(filtered);
    this.updateSearchResults(filtered.length);
  }

  updateSearchResults(count) {
    const resultsEl = document.getElementById('search-results');
    if (resultsEl) {
      resultsEl.textContent = count > 0 
        ? `${count}件の結果` 
        : '結果が見つかりません';
    }
  }

  // Keyboard Shortcuts
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      
      // Ctrl/Cmd + B for sidebar toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
      
      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        this.showHelp();
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  // Scroll Progress Indicator
  initScrollProgress() {
    const progressBar = document.querySelector('.progress-bar');
    if (!progressBar) return;
    
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height);
      
      progressBar.style.transform = `scaleX(${scrolled})`;
    });
  }

  // Article Management
  async loadArticles() {
    try {
      // Wait for Firebase
      await this.waitForFirebase();
      
      const { db, collection, query, where, orderBy, getDocs } = window.firebase;
      
      const articlesQuery = query(
        collection(db, 'articles'),
        where('status', '==', 'published'),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(articlesQuery);
      this.state.articles = [];
      
      querySnapshot.forEach((doc) => {
        this.state.articles.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Loaded ${this.state.articles.length} articles`);
      this.displayArticles(this.state.articles);
      this.updateStats();
      
    } catch (error) {
      console.error('Error loading articles:', error);
      this.showError('記事の読み込みに失敗しました');
    }
  }

  async waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (window.firebase && window.firebase.db) {
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  displayArticles(articles) {
    const container = document.getElementById('articles-grid');
    if (!container) return;
    
    if (articles.length === 0) {
      container.innerHTML = `
        <div class="text-center p-4">
          <p class="muted">記事が見つかりません</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = articles.map(article => this.createArticleCard(article)).join('');
    
    // Add click handlers
    container.querySelectorAll('.article-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        window.location.href = `article.html?slug=${articles[index].id}`;
      });
    });
  }

  createArticleCard(article) {
    const categoryName = this.getCategoryName(article.category);
    const truncatedSummary = this.truncateText(article.summary, 120);
    const tags = (article.tags || []).slice(0, 3);
    
    return `
      <div class="article-card fade-in">
        <div class="article-meta">
          <span class="article-category">${categoryName}</span>
          <div class="article-difficulty">
            <span>難易度 ${article.difficulty_level}/10</span>
            <span>•</span>
            <span>ニッチ度 ${article.niche_score}/10</span>
          </div>
        </div>
        <h3>${article.title}</h3>
        <p>${truncatedSummary}</p>
        <div class="article-tags">
          ${tags.map(tag => `<span class="article-tag">${tag}</span>`).join('')}
        </div>
      </div>
    `;
  }

  getCategoryName(category) {
    const categoryMap = {
      'algebra': '代数学',
      'analysis': '解析学',
      'number_theory': '整数論',
      'probability': '確率論',
      'combinatorics': '組合せ論',
      'logic': '数理論理学',
      'set_theory': '集合論',
      'calculus': '微積分学',
      'linear_algebra': '線形代数',
      'others': 'その他'
    };
    return categoryMap[category] || category;
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Statistics Update
  updateStats() {
    // Update article count
    const articleCount = document.getElementById('article-count');
    if (articleCount) {
      this.animateNumber(articleCount, 0, this.state.articles.length, 1000);
    }
    
    // Update other stats
    const categories = [...new Set(this.state.articles.map(a => a.category))];
    const categoryCount = document.getElementById('category-count');
    if (categoryCount) {
      this.animateNumber(categoryCount, 0, categories.length, 800);
    }
  }

  animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current);
    }, 16);
  }

  // Navigation
  navigateTo(view) {
    this.state.currentView = view;
    
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('view', view);
    window.history.pushState({}, '', url);
    
    // Load view content
    this.loadView(view);
  }

  loadView(view) {
    const content = document.querySelector('.content');
    if (!content) return;
    
    // Add loading state
    content.classList.add('loading');
    
    setTimeout(() => {
      // Load view based on type
      switch(view) {
        case 'dashboard':
          this.loadDashboard();
          break;
        case 'articles':
          this.loadArticlesView();
          break;
        case 'conway':
          window.location.href = 'conways.html';
          break;
        default:
          this.loadDashboard();
      }
      
      content.classList.remove('loading');
    }, 200);
  }

  loadDashboard() {
    // Dashboard view implementation
    console.log('Loading dashboard...');
  }

  loadArticlesView() {
    // Articles view implementation
    console.log('Loading articles view...');
  }

  // Animations
  initAnimations() {
    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe all fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => {
      observer.observe(el);
    });
  }

  // Event Listeners
  setupEventListeners() {
    // Category filters
    document.querySelectorAll('.chip[data-category]').forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterByCategory(chip.dataset.category);
        
        // Update active state
        document.querySelectorAll('.chip[data-category]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
    
    // Load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.loadMoreArticles();
      });
    }
    
    // Window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });
  }

  filterByCategory(category) {
    this.state.currentCategory = category;
    
    if (category === 'all') {
      this.displayArticles(this.state.articles);
    } else {
      const filtered = this.state.articles.filter(a => a.category === category);
      this.displayArticles(filtered);
    }
  }

  loadMoreArticles() {
    // Implementation for pagination
    console.log('Loading more articles...');
  }

  handleResize() {
    // Handle responsive changes
    if (window.innerWidth <= 1024 && this.state.sidebarOpen) {
      this.toggleSidebar();
    }
  }

  // Utility Methods
  showHelp() {
    console.log('Showing help modal...');
  }

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('open');
    });
  }

  showError(message) {
    console.error(message);
    // Implementation for error toast/notification
  }

  showSuccess(message) {
    console.log(message);
    // Implementation for success toast/notification
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mtMathApp = new MtMathApp();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MtMathApp;
}
