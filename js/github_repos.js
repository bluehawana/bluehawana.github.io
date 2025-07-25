/**
 * Generate smart descriptions based on repository name and language
 */
function generateSmartDescription(repoName, language, originalDescription) {
    const name = repoName.toLowerCase();
    
    // Project-specific descriptions based on actual GitHub repository names (lowercase)
    const projectDescriptions = {
        // Actual GitHub repo names converted to lowercase
        'bluehawana.github.io': 'Personal portfolio website showcasing full-stack development and DevOps expertise',
        'epub-ttsreader-androidauto': 'EPUB text-to-speech reader application for Android Auto integration with voice navigation support',
        'jobhunter-python-typescript-gmailrestapi': 'Automated job hunting workflow with Python, TypeScript, and Gmail REST API integration for resume generation',
        'carbot-js-ai': 'Customized AI car assistant with enhanced functionalities for Android Auto, superior to Google Assistant',
        'carplayer-kotlin-androidauto': 'Android Auto car player application built with Kotlin for in-vehicle entertainment systems',
        'gothenburgtaxipooling-java-reacnative': 'Intelligent taxi carpooling platform for Gothenburg using Java backend and React Native mobile app',
        'newapp': 'Latest application development project with modern architecture and cross-platform compatibility',
        'smrtmart': 'E-commerce platform with Spring Boot backend and React frontend for online retail solutions',
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
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const response = await fetch('https://api.github.com/users/bluehawana/repos?sort=updated&per_page=5', {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'bluehawana-portfolio'
            }
        });
        const repos = await response.json();
        
        if (!response.ok) {
            console.warn(`GitHub API rate limited (${response.status}). Using fallback data.`);
            // Fallback to cached/static data when rate limited
            displayFallbackRepos(containerId);
            return;
        }
        
        const repoContainer = document.getElementById(containerId);
        if (!repoContainer) return;
        
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
        
    } catch (error) {
        console.error('Error fetching GitHub repos:', error);
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
            updated_at: '2025-01-24',
            html_url: 'https://github.com/bluehawana/bluehawana.github.io'
        },
        {
            name: 'epub-ttsreader-androidauto',
            description: null,
            language: 'Python',
            stargazers_count: 0,
            updated_at: '2025-01-23',
            html_url: 'https://github.com/bluehawana/epub-ttsreader-androidauto'
        },
        {
            name: 'JobHunter-Python-TypeScript-GmailRestAPI',
            description: 'An automatically working flow integrated with python, typescript, gmail RestApi and etc, for seting up workflows by searching jobs in gmail, websites, and customized resumes by job descriptions, and generate resume and cover letter and send to me for applying jobs.',
            language: 'Python',
            stargazers_count: 0,
            updated_at: '2025-01-21',
            html_url: 'https://github.com/bluehawana/JobHunter-Python-TypeScript-GmailRestAPI'
        },
        {
            name: 'carbot-js-ai',
            description: 'A customized carbot with better funtionalities than Google Assitant from Android Auto.',
            language: 'JavaScript',
            stargazers_count: 0,
            updated_at: '2025-01-21',
            html_url: 'https://github.com/bluehawana/carbot-js-ai'
        },
        {
            name: 'carplayer-kotlin-androidauto',
            description: null,
            language: 'HTML',
            stargazers_count: 0,
            updated_at: '2025-01-21',
            html_url: 'https://github.com/bluehawana/carplayer-kotlin-androidauto'
        },
        {
            name: 'GothenburgTaxiPooling-Java-ReacNative',
            description: null,
            language: 'JavaScript',
            stargazers_count: 0,
            updated_at: '2025-01-18',
            html_url: 'https://github.com/bluehawana/GothenburgTaxiPooling-Java-ReacNative'
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
document.addEventListener('DOMContentLoaded', fetchLatestRepos);