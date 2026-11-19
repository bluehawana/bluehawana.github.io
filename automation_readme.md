# Website Automation

This website automatically updates content from your GitHub and LinkedIn profiles.

## Features

### 🔄 Automated GitHub Repositories
- **Location**: Homepage "Latest GitHub Repositories" section
- **Updates**: Real-time via GitHub API
- **Shows**: Latest 5 non-fork repositories
- **Data**: Repository name, description, language, stars, last updated

### 📝 LinkedIn Posts Management
- **Location**: Blog page sidebar "From My LinkedIn" section
- **Updates**: Via GitHub Actions workflow
- **Shows**: Latest 5 posts
- **File**: `data/linkedin-posts.json`

## How to Update Content

### GitHub Repositories (Automatic)
- ✅ **No action needed** - Updates automatically when visitors load the page
- Fetches from: `https://api.github.com/users/bluehawana/repos`

### LinkedIn Posts (Manual/Workflow)

#### Option 1: Manual File Update
1. Edit `data/linkedin-posts.json`
2. Follow the JSON format:
```json
{
  "content": "Your LinkedIn post content",
  "date": "2025-07-19",
  "url": "https://linkedin.com/in/hzl"
}
```
3. Commit and push changes

#### Option 2: GitHub Actions Workflow
1. Go to "Actions" tab in your GitHub repository
2. Run "Update Website Content" workflow
3. Provide LinkedIn posts in JSON format as input

### Automation Schedule
- **GitHub Repos**: Updates on every page load
- **LinkedIn Posts**: Workflow runs daily at 8 AM UTC (can be triggered manually)

## Files Structure
```
├── js/
│   ├── github-repos.js       # GitHub API integration
│   └── linkedin-posts.js     # LinkedIn posts loader
├── data/
│   └── linkedin-posts.json   # LinkedIn posts data
├── .github/workflows/
│   └── update-content.yml    # Automation workflow
└── css/blog.css              # Styling for dynamic content
```

## Benefits
- 🚀 **Always up-to-date**: Latest GitHub work automatically displayed
- 📱 **Professional content**: Curated LinkedIn posts showcase your thoughts
- 🔧 **Low maintenance**: Minimal manual updates required
- ⚡ **Fast loading**: Client-side API calls for GitHub, cached JSON for LinkedIn