/**
 * Generate smart descriptions based on repository name and language
 */
function generateSmartDescription(repoName, language, originalDescription) {
    const name = repoName.toLowerCase();
    
    // Project-specific descriptions based on actual GitHub repository names (lowercase)
    const projectDescriptions = {
        // Actual GitHub repo names converted to lowercase
        'bluehawana.github.io': 'Personal portfolio website showcasing full-stack development and DevOps expertise',
        'smartmart-next-frontend': 'Next.js frontend for SmartMart e-commerce platform with modern React components and TypeScript',
        'smrtmart-backend-go-racknerd': 'Go backend for SmartMart deployed on RackNerd VPS with microservices architecture',
        'python-tushareapi-tv-stockselector': 'Stock selector and analyzer using Python, Tushare API, and TradingView integration for financial analysis',
        'ai-codex-starter': 'AI-powered code generation starter kit with modern development tools and LLM integration',
        'weatheranywhere-springboot-mysql-vps-racknerd': 'Weather application built with Spring Boot and MySQL deployed on RackNerd VPS',
        'carbot-kotlin-androidauto': 'Kotlin-based intelligent car bot for Android Auto with AI capabilities and voice control',
        'android15-aosp-tesing-graid-nvme': 'Android 15 AOSP testing project for performance comparison between NVMe and GRAID storage configurations',
        'epub-ttsreader-androidauto': 'An Android Auto EPUB text-to-speech reader application that can read your favorite books while driving using Python and text-to-speech technology',
        'epub_ttsreader_androidauto': 'An Android Auto EPUB text-to-speech reader application that can read your favorite books while driving using Python and text-to-speech technology',
        'jobhunter-python-typescript-gmailrestapi': 'An automatically working flow integrated with python, typescript, gmail RestApi and etc, for seting up workflows by searching jobs in gmail, websites, and customized resumes by job descriptions, and generate resume and cover letter and send to me for applying jobs.',
        'carbot-js-ai': 'A customized carbot with better funtionalities than Google Assitant from Android Auto.',
        'carplayer-kotlin-androidauto': 'A customized car player built with Kotlin for Android Auto, featuring better functionality than Google car player or Spotify car player, with enhanced audio controls and user interface',
        'gothenburgtaxipooling-java-reacnative': 'A comprehensive taxi pooling platform for Gothenburg built with Java backend and React Native frontend, helping people share taxis and reduce costs through smart route optimization',
        'gothenburgtaxipooling_java_reacnative': 'A comprehensive taxi pooling platform for Gothenburg built with Java backend and React Native frontend, helping people share taxis and reduce costs through smart route optimization',
        'newapp': 'A new application under development with modern architecture and cross-platform compatibility',
        'newapp.exe': 'A new application under development with modern architecture and cross-platform compatibility',
        'smrtmart': 'A smart e-commerce platform with Spring Boot and React',
        // Additional variations and legacy names
        'gothenburgtaxipooling-java-reactnative': 'Intelligent taxi carpooling platform for Gothenburg using Java backend and React Native mobile app',
        'epub_ttsreader_androidauto': 'EPUB text-to-speech reader application for Android Auto integration with voice navigation support',
        'carplayer_kotlin_androidauto': 'Android Auto car player application built with Kotlin for in-vehicle entertainment systems'
    };
    
    // Check for exact matches first (prioritize our curated descriptions)
    if (projectDescriptions[name]) {
        return projectDescriptions[name];
    }
    
    // If we have a good original description and no custom one, use it
    if (originalDescription && originalDescription.trim() !== '' && originalDescription.length > 50) {
        return originalDescription;
    }
    
    // Generate descriptions based on patterns and language
    if (name.includes('job') && name.includes('hunter')) {
        return `Automated job hunting workflow with ${language || 'Python'} and REST API integration for resume generation`;
    }
    
    if (name.includes('carbot') || name.includes('ai')) {
        return `AI-powered car assistant with enhanced functionalities using ${language || 'JavaScript'} for Android Auto`;
    }
    
    if (name.includes('taxi') || name.includes('pool')) {
        return `Transportation and carpooling solution built with ${language || 'modern technologies'}`;
    }
    
    if (name.includes('android') || name.includes('auto')) {
        return `Android application for automotive integration and mobile development with ${language || 'native technologies'}`;
    }
    
    if (name.includes('reader') || name.includes('epub') || name.includes('tts')) {
        return `Digital reading application with text-to-speech capabilities using ${language || 'mobile technologies'}`;
    }
    
    if (name.includes('car') && name.includes('player')) {
        return `Automotive media player application developed with ${language || 'modern frameworks'}`;
    }
    
    if (name.includes('web') || name.includes('site') || name.includes('.io')) {
        return `Web application and portfolio showcase featuring ${language || 'full-stack'} development`;
    }
    
    if (name.includes('mart') || name.includes('shop') || name.includes('commerce')) {
        return `E-commerce platform and online retail solution using ${language || 'enterprise technologies'}`;
    }
    
    // Language-based fallbacks
    const languageDescriptions = {
        'Python': 'Python application with automation and data processing capabilities',
        'Java': 'Enterprise Java application with Spring Boot and microservices architecture',
        'JavaScript': 'Modern JavaScript application with React/Node.js full-stack implementation',
        'Kotlin': 'Android application built with Kotlin for mobile and automotive platforms',
        'HTML': 'Web application with responsive design and modern frontend technologies',
        'TypeScript': 'TypeScript application with type-safe development and modern frameworks',
        'C#': '.NET application with cloud integration and enterprise solutions'
    };
    
    if (language && languageDescriptions[language]) {
        return languageDescriptions[language];
    }
    
    return `Software project showcasing modern development practices and technical expertise`;
}

/**
 * Format repository names for better display
 */
function formatRepoName(repoName) {
    return repoName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\.(io|com|net)$/i, '')
        .replace(/\b(js|py|html|exe)\b/gi, match => match.toUpperCase());
}

/**
 * Fetch latest GitHub repositories for bluehawana
 */
async function fetchLatestRepos(containerId = 'github-repos') {
    try {
        console.log(`[GitHub Repos] Starting fetch for container: ${containerId}`);

        // Check if container exists first
        const repoContainer = document.getElementById(containerId);
        if (!repoContainer) {
            console.error(`[GitHub Repos] Container #${containerId} not found!`);
            return;
        }

        console.log(`[GitHub Repos] Container found, fetching from API...`);

        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await fetch('https://api.github.com/users/bluehawana/repos?sort=updated&per_page=10', {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'bluehawana-portfolio'
            }
        });
        const repos = await response.json();

        console.log(`[GitHub Repos] API response: ${response.status}, repos count: ${repos.length}`);

        if (!response.ok) {
            console.warn(`GitHub API rate limited (${response.status}). Using fallback data.`);
            // Fallback to cached/static data when rate limited
            displayFallbackRepos(containerId);
            return;
        }
        
        repoContainer.innerHTML = '';
        
        repos.forEach(repo => {
            const repoElement = document.createElement('div');
            repoElement.className = 'repo-item';
            
            // Skip forked repos and focus on original work
            if (repo.fork) return;
            
            // Generate smart descriptions based on repo name and language
            const smartDescription = generateSmartDescription(repo.name, repo.language, repo.description);
            
            repoElement.innerHTML = `
                <div class="repo-card">
                    <h4><a href="${repo.html_url}" target="_blank">${formatRepoName(repo.name)}</a></h4>
                    <p class="repo-description">${smartDescription}</p>
                    <div class="repo-meta">
                        <span class="language">${repo.language || 'Mixed'}</span>
                        <span class="stars">⭐ ${repo.stargazers_count}</span>
                        <span class="updated">Updated: ${new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
            
            repoContainer.appendChild(repoElement);
        });

        console.log(`[GitHub Repos] Successfully rendered ${repos.length} repositories`);

    } catch (error) {
        console.error('[GitHub Repos] Error fetching:', error);
        const repoContainer = document.getElementById(containerId);
        if (repoContainer) {
            repoContainer.innerHTML = '<p>Unable to load repositories at this time.</p>';
        }
    }
}

/**
 * Display fallback repository data when GitHub API is rate-limited
 */
function displayFallbackRepos(containerId) {
    const fallbackRepos = [
        {
            name: 'bluehawana.github.io',
            description: null,
            language: 'HTML',
            stargazers_count: 0,
            updated_at: '2025-11-24',
            html_url: 'https://github.com/bluehawana/bluehawana.github.io'
        },
        {
            name: 'smartmart-next-frontend',
            description: 'Next.js frontend for SmartMart e-commerce platform with modern React components',
            language: 'TypeScript',
            stargazers_count: 0,
            updated_at: '2025-11-20',
            html_url: 'https://github.com/bluehawana/smartmart-next-frontend'
        },
        {
            name: 'JobHunter-Python-TypeScript-GmailRestAPI',
            description: 'An automatically working flow integrated with python, typescript, gmail RestApi and etc, for seting up workflows by searching jobs in gmail, websites, and customized resumes by job descriptions, and generate resume and cover letter and send to me for applying jobs.',
            language: 'Python',
            stargazers_count: 0,
            updated_at: '2025-11-20',
            html_url: 'https://github.com/bluehawana/JobHunter-Python-TypeScript-GmailRestAPI'
        },
        {
            name: 'Python-TushareApi-TV-StockSelector',
            description: 'Stock selector and analyzer using Python, Tushare API, and TradingView integration',
            language: 'Python',
            stargazers_count: 0,
            updated_at: '2025-11-17',
            html_url: 'https://github.com/bluehawana/Python-TushareApi-TV-StockSelector'
        },
        {
            name: 'smrtmart-backend-go-racknerd',
            description: 'Go backend for SmartMart deployed on RackNerd VPS with microservices architecture',
            language: 'Go',
            stargazers_count: 0,
            updated_at: '2025-11-17',
            html_url: 'https://github.com/bluehawana/smrtmart-backend-go-racknerd'
        },
        {
            name: 'ai-codex-starter',
            description: 'AI-powered code generation starter kit with modern development tools',
            language: 'JavaScript',
            stargazers_count: 0,
            updated_at: '2025-11-14',
            html_url: 'https://github.com/bluehawana/ai-codex-starter'
        },
        {
            name: 'weatheranywhere-springboot-mysql-vps-racknerd',
            description: 'Weather application built with Spring Boot and MySQL deployed on RackNerd VPS',
            language: 'Java',
            stargazers_count: 0,
            updated_at: '2025-10-27',
            html_url: 'https://github.com/bluehawana/weatheranywhere-springboot-mysql-vps-racknerd'
        },
        {
            name: 'epub-ttsreader-androidauto',
            description: null,
            language: 'Python',
            stargazers_count: 0,
            updated_at: '2025-09-23',
            html_url: 'https://github.com/bluehawana/epub-ttsreader-androidauto'
        },
        {
            name: 'carbot-kotlin-androidauto',
            description: 'Kotlin-based car bot for Android Auto with AI capabilities',
            language: 'Kotlin',
            stargazers_count: 0,
            updated_at: '2025-09-16',
            html_url: 'https://github.com/bluehawana/carbot-kotlin-androidauto'
        },
        {
            name: 'android15-aosp-tesing-graid-nvme',
            description: 'The goal for this project is to sync the code of aosp 15 and lunch and build locally to test the performance of on preem server with the normal Nvme, and Graid card with different comibations in order to find out the best combin',
            language: 'Shell',
            stargazers_count: 0,
            updated_at: '2025-09-12',
            html_url: 'https://github.com/bluehawana/android15-aosp-tesing-graid-nvme'
        }
    ];

    const repoContainer = document.getElementById(containerId);
    if (!repoContainer) return;
    
    repoContainer.innerHTML = '';
    
    fallbackRepos.forEach(repo => {
        const repoElement = document.createElement('div');
        repoElement.className = 'repo-item';
        
        const smartDescription = generateSmartDescription(repo.name, repo.language, repo.description);
        
        repoElement.innerHTML = `
            <div class="repo-card">
                <h4><a href="${repo.html_url}" target="_blank">${formatRepoName(repo.name)}</a></h4>
                <p class="repo-description">${smartDescription}</p>
                <div class="repo-meta">
                    <span class="language">${repo.language || 'Mixed'}</span>
                    <span class="stars">⭐ ${repo.stargazers_count}</span>
                    <span class="updated">Updated: ${new Date(repo.updated_at).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        
        repoContainer.appendChild(repoElement);
    });
}

// Auto-load when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('[GitHub Repos] DOMContentLoaded fired, calling fetchLatestRepos...');
    fetchLatestRepos();
});