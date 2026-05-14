# Harvad Li - Portfolio Website

[![Live Site](https://img.shields.io/badge/live-bluehawana.com-blue)](https://www.bluehawana.com)
[![GitHub](https://img.shields.io/badge/github-portfolio-green)](https://github.com/bluehawana/bluehawana.github.io)

A modern, responsive portfolio website with automated content synchronization from LinkedIn and GitHub.

## 🚀 Features

- **Responsive Design** - Works perfectly on all devices
- **Dynamic Content** - Real-time GitHub repository integration
- **LinkedIn Integration** - Automated blog post synchronization
- **Performance Optimized** - Fast loading with modern web standards
- **Professional Services** - Integrated booking and contact system

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **APIs**: GitHub API, LinkedIn API
- **Hosting**: Netlify with custom domain
- **Tools**: Git, VS Code, Claude Code

## 📁 Project Structure

```
├── index.html              # Homepage
├── pages/                  # All other pages
│   ├── blog.html          # LinkedIn posts integration
│   ├── resume.html        # Professional resume
│   ├── services.html      # Professional services
│   └── contact.html       # Contact information
├── projects/              # Project showcases
├── css/                   # Stylesheets
├── js/                    # JavaScript functionality
└── data/                  # Content data files
```

## 🔄 Automation

### GitHub Integration
- Automatically displays latest repositories
- Real-time project data via GitHub API
- Language badges and star counts

### LinkedIn Integration
- Synchronized blog posts every 30 minutes
- OAuth 2.0 authentication
- Admin interface for content management

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/bluehawana/bluehawana.github.io.git
   cd bluehawana.github.io
   ```

2. **Local development**
   ```bash
   # Start local server
   python -m http.server 8000
   # or
   npx serve .
   ```

3. **View the site**
   Open `http://localhost:8000` in your browser

## 🔧 Configuration

For LinkedIn API integration, copy the config template:
```bash
cp config_sample.js linkedin_config.js
# Edit linkedin_config.js with your API credentials
```

## 📱 Features Overview

- **Homepage**: Professional introduction with project highlights
- **Blog**: Automated LinkedIn post integration
- **Resume**: Detailed professional experience
- **Projects**: Dynamic GitHub repository showcase
- **Services**: Professional consulting and development services
- **Contact**: Multiple contact methods and social links

## 🎨 Design

Clean, modern design inspired by contemporary web standards:
- Mobile-first responsive approach
- CSS Grid and Flexbox layouts
- Smooth animations and transitions
- Professional color scheme

## 🚢 Deployment

The site is automatically deployed to Netlify when changes are pushed to the main branch.

**Live Site**: [bluehawana.com](https://www.bluehawana.com)

## 📄 License

MIT License - Feel free to use as inspiration for your own portfolio.

## 📞 Contact

**Harvad Li** - Full Stack Developer  
📧 [hongzhili01@gmail.com](mailto:hongzhili01@gmail.com)  
💼 [LinkedIn](https://linkedin.com/in/hzl)  
🐙 [GitHub](https://github.com/bluehawana)  

---

⭐ **Star this repository if you found it helpful!**