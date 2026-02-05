/**
 * Shared Layout System for bluehawana.github.io
 * Ensures high consistency across all pages like salmanyahya.com
 */

document.addEventListener('DOMContentLoaded', () => {
    initSharedLayout();
});

function initSharedLayout() {
    // 1. Inject common head elements if missing
    ensureGlobalStyles();

    // 2. Wrap main content if needed to ensure layout consistency
    // (Optional: can be handled by HTML structure)

    // 3. Inject shared Navbar
    injectNavbar();

    // 4. Inject shared Footer
    injectFooter();

    // 5. Initialize background if not present
    ensureBackground();
}

function ensureGlobalStyles() {
    const head = document.head;
    const scripts = Array.from(head.querySelectorAll('link[rel="stylesheet"]'));
    const isMainCssPresent = scripts.some(s => s.href.includes('modern-portfolio.css'));

    if (!isMainCssPresent) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // Adjust path based on current page location
        const pathPrefix = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/projects/') ? '../' : '';
        link.href = `${pathPrefix}css/modern-portfolio.css`;
        head.appendChild(link);
    }
}

function injectNavbar() {
    const existingNav = document.querySelector('.nav-modern, #nav-wrap, #page-header');
    const pathPrefix = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/projects/') ? '../' : '';

    // Improved active path detection
    const pathParts = window.location.pathname.split('/');
    const currentFile = pathParts.pop() || 'index.html';
    const isInsideFolder = pathParts.includes('pages') || pathParts.includes('projects');

    const navHtml = `
    <nav class="nav-modern">
        <div class="nav-container">
            <a href="${pathPrefix}index.html" class="nav-logo">
                <div class="nav-logo-icon">HL</div>
                Harvad Li
            </a>
            <ul class="nav-links">
                <li><a href="${pathPrefix}index.html" class="${(!isInsideFolder && (currentFile === 'index.html' || currentFile === '')) ? 'active' : ''}">Home</a></li>
                <li><a href="${pathPrefix}pages/journey.html" class="${currentFile === 'journey.html' ? 'active' : ''}">Journey</a></li>
                <li><a href="${pathPrefix}pages/blog.html" class="${currentFile === 'blog.html' ? 'active' : ''}">Writing</a></li>
                <li><a href="${pathPrefix}pages/resume.html" class="${currentFile === 'resume.html' ? 'active' : ''}">Resume</a></li>
                <li><a href="${pathPrefix}projects/index.html" class="${(isInsideFolder && pathParts.includes('projects')) ? 'active' : ''}">Projects</a></li>
                <li><a href="${pathPrefix}pages/about.html" class="${currentFile === 'about.html' ? 'active' : ''}">About</a></li>
                <li><a href="${pathPrefix}pages/contact.html" class="${currentFile === 'contact.html' ? 'active' : ''}">Connect</a></li>
            </ul>
        </div>
    </nav>`;

    if (existingNav) {
        // To avoid flickering, we only update if content is different
        // But for consistency we replace it once
        existingNav.outerHTML = navHtml;
    } else {
        document.body.insertAdjacentHTML('afterbegin', navHtml);
    }

    // Scroll effect
    const navElement = document.querySelector('.nav-modern');
    if (navElement) {
        const updateNav = () => {
            if (window.scrollY > 20) {
                navElement.classList.add('scrolled');
            } else {
                navElement.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', updateNav);
        updateNav(); // Initial check
    }
}

function injectFooter() {
    const existingFooter = document.querySelector('.footer-modern, footer');
    const pathPrefix = window.location.pathname.includes('/pages/') || window.location.pathname.includes('/projects/') ? '../' : '';

    const footerHtml = `
    <footer class="footer-modern">
      <div class="footer-content">
         <div class="footer-brand">
            <a href="${pathPrefix}index.html" class="nav-logo">
               <div class="nav-logo-icon">HL</div>
               Hongzhi (Harvad) Li
            </a>
            <p>Senior Full Stack Developer focused on solving complex technical challenges with cross-cultural insights.</p>
         </div>

         <div class="footer-links-section">
            <h3 class="footer-section-title">Navigation</h3>
            <ul class="footer-links">
               <li><a href="${pathPrefix}index.html">Home</a></li>
               <li><a href="${pathPrefix}pages/journey.html">Journey</a></li>
               <li><a href="${pathPrefix}pages/resume.html">Resume</a></li>
               <li><a href="${pathPrefix}projects/index.html">Projects</a></li>
            </ul>
         </div>

         <div class="footer-links-section">
            <h3 class="footer-section-title">Writing</h3>
            <ul class="footer-links">
               <li><a href="${pathPrefix}pages/blog.html">Blog Activity</a></li>
               <li><a href="${pathPrefix}pages/about.html">My Story</a></li>
               <li><a href="${pathPrefix}pages/contact.html">Connect</a></li>
            </ul>
         </div>

         <div class="footer-links-section">
            <h3 class="footer-section-title">Social</h3>
            <ul class="footer-links">
               <li><a href="https://github.com/bluehawana" target="_blank">GitHub</a></li>
               <li><a href="https://www.linkedin.com/in/hzl" target="_blank">LinkedIn</a></li>
               <li><a href="https://twitter.com/bluehawana" target="_blank">Twitter</a></li>
            </ul>
         </div>
      </div>

      <div class="footer-bottom">
         <div class="footer-copyright">
            &copy; 2025 Hongzhi (Harvad) Li. All technical content reserved.
         </div>
         <div class="footer-note">
            Building scalable solutions with Swedish precision and global vision.
         </div>
      </div>
    </footer>`;

    if (existingFooter) {
        existingFooter.outerHTML = footerHtml;
    } else {
        document.body.insertAdjacentHTML('beforeend', footerHtml);
    }
}

function ensureBackground() {
    if (!document.querySelector('.gradient-bg')) {
        const bg = document.createElement('div');
        bg.className = 'gradient-bg';
        document.body.prepend(bg);
    }
}
