# Design Document

## Overview

The LinkedIn Auto-Sync system will be a fully automated solution that detects new LinkedIn posts using OAuth authentication and syncs them to the website. The system will leverage LinkedIn's official API endpoints with intelligent fallback mechanisms, run on GitHub Actions schedule, and maintain complete post history with duplicate detection.

## Architecture

```mermaid
graph TB
    A[GitHub Actions Scheduler] --> B[LinkedIn API Client]
    B --> C[OAuth Authentication]
    B --> D[Multi-Endpoint Post Fetcher]
    D --> E[Post Parser & Validator]
    E --> F[Duplicate Detection Engine]
    F --> G[Blog Post Generator]
    G --> H[File System Manager]
    H --> I[Git Commit Handler]
    
    J[LinkedIn API] --> D
    K[Local Data Store] --> F
    L[Jekyll Blog] --> G
    
    subgraph "API Endpoints Priority"
        D1[/v2/posts]
        D2[/v2/ugcPosts]
        D3[/v2/shares]
        D4[/v2/activities]
    end
    
    D --> D1
    D1 --> D2
    D2 --> D3
    D3 --> D4
```

## Components and Interfaces

### 1. LinkedIn API Client (`LinkedInAPIClient`)

**Purpose:** Handles all LinkedIn API communication with OAuth authentication

**Key Methods:**
- `authenticate()` - Validates OAuth token
- `fetchPosts(options)` - Retrieves posts using multiple endpoints
- `getProfile()` - Gets user profile information
- `makeRequest(endpoint, params)` - Generic API request handler

**Configuration:**
```javascript
{
  accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
  apiVersion: '202505',
  baseUrl: 'https://api.linkedin.com',
  endpoints: ['/v2/posts', '/v2/ugcPosts', '/v2/shares', '/v2/activities'],
  retryConfig: { maxRetries: 3, backoffMs: 1000 }
}
```

### 2. Multi-Endpoint Post Fetcher (`PostFetcher`)

**Purpose:** Tries multiple LinkedIn API endpoints in priority order to maximize post retrieval success

**Endpoint Priority:**
1. `/v2/posts?q=author&author=urn:li:person:{personId}` - Community Management API
2. `/v2/ugcPosts?q=authors&authors=urn:li:person:{personId}` - User Generated Content
3. `/v2/shares?q=owners&owners=urn:li:person:{personId}` - Legacy Shares API
4. `/v2/activities?q=actor&actor=urn:li:person:{personId}` - Activities API

**Fallback Logic:**
- Try each endpoint sequentially
- Parse different response formats
- Combine results from multiple endpoints
- Handle API-specific errors gracefully

### 3. Post Parser & Validator (`PostParser`)

**Purpose:** Normalizes different LinkedIn API response formats into consistent post objects

**Input Formats:**
- UGC Posts format (`com.linkedin.ugc.ShareContent`)
- Shares format (`text.text`)
- Community Posts format (`commentary`)
- Activities format (various activity types)

**Output Format:**
```javascript
{
  id: 'unique-post-identifier',
  content: 'post text content',
  date: '2025-01-08',
  timestamp: 1704672000000,
  url: 'https://www.linkedin.com/feed/update/...',
  tags: ['hashtag1', 'hashtag2'],
  media: [{ type: 'image', url: '...' }],
  engagement: { likes: 0, comments: 0, shares: 0 },
  source: 'linkedin_api_posts',
  rawData: { /* original API response */ }
}
```

### 4. Duplicate Detection Engine (`DuplicateDetector`)

**Purpose:** Prevents duplicate posts using multiple identification strategies

**Detection Methods:**
1. **Primary:** LinkedIn post ID matching
2. **Secondary:** Content hash comparison (first 100 characters)
3. **Tertiary:** Timestamp + author matching
4. **Fallback:** URL pattern matching

**Storage:**
- `data/linkedin-posts.json` - Complete post history
- `data/linkedin-sync-log.json` - Sync metadata and statistics

### 5. Blog Post Generator (`BlogGenerator`)

**Purpose:** Creates Jekyll-compatible blog posts from LinkedIn post data

**Template:**
```markdown
---
layout: post
title: "LinkedIn Post - {date}"
date: {date}
categories: [linkedin, social]
tags: [{tags}]
linkedin_url: {url}
linkedin_id: {id}
auto_synced: true
---

{content}

---

**LinkedIn Integration Details:**
- **Original Post:** [{url}]({url})
- **Sync Date:** {syncDate}
- **Engagement:** {likes} likes, {comments} comments, {shares} shares
```

### 6. File System Manager (`FileManager`)

**Purpose:** Handles all file operations for data storage and blog post creation

**Operations:**
- Create blog post files in `_posts/` directory
- Update `data/linkedin-posts.json` with new posts
- Maintain `data/linkedin-sync-log.json` with sync statistics
- Generate unique filenames with date prefixes

### 7. Git Commit Handler (`GitHandler`)

**Purpose:** Manages Git operations for automated commits

**Workflow:**
1. Check for changes in `data/` and `_posts/` directories
2. Stage changed files
3. Create descriptive commit message with statistics
4. Push changes to GitHub repository

## Data Models

### Post Model
```javascript
class LinkedInPost {
  constructor(data) {
    this.id = data.id;
    this.content = data.content;
    this.date = data.date;
    this.timestamp = data.timestamp;
    this.url = data.url;
    this.tags = data.tags || [];
    this.media = data.media || [];
    this.engagement = data.engagement || {};
    this.source = data.source;
    this.rawData = data.rawData;
  }
  
  generateBlogPost() { /* ... */ }
  getUniqueIdentifiers() { /* ... */ }
  extractHashtags() { /* ... */ }
}
```

### Sync Log Model
```javascript
class SyncLog {
  constructor() {
    this.lastSync = new Date().toISOString();
    this.totalSyncs = 0;
    this.newPostsCount = 0;
    this.lastPostId = null;
    this.apiEndpointsUsed = [];
    this.errors = [];
  }
}
```

## Error Handling

### API Error Handling
- **401 Unauthorized:** Token expired - log error and exit gracefully
- **403 Forbidden:** Insufficient permissions - try alternative endpoints
- **429 Rate Limited:** Implement exponential backoff retry
- **500 Server Error:** Retry with different endpoint
- **Network Errors:** Retry with exponential backoff

### File System Error Handling
- **Permission Errors:** Log error and continue with available operations
- **Disk Space:** Check available space before large operations
- **File Conflicts:** Use atomic file operations with temporary files

### Git Error Handling
- **Merge Conflicts:** Stash changes and retry
- **Authentication:** Use GitHub token from secrets
- **Network Issues:** Retry push operations

## Testing Strategy

### Unit Tests
- `LinkedInAPIClient` - Mock API responses for different endpoints
- `PostParser` - Test parsing of various LinkedIn API response formats
- `DuplicateDetector` - Test duplicate detection with edge cases
- `BlogGenerator` - Verify Jekyll front matter and content formatting

### Integration Tests
- End-to-end workflow with mock LinkedIn API
- GitHub Actions workflow testing with test repository
- File system operations with temporary directories
- Git operations with test commits

### API Testing
- Test all LinkedIn API endpoints with real OAuth token
- Verify response parsing for different post types
- Test error handling for various API failure scenarios
- Validate rate limiting and retry mechanisms

### Automated Testing
- GitHub Actions workflow includes test suite
- Pre-commit hooks for code quality
- Scheduled test runs to verify API compatibility
- Integration with existing test infrastructure

## Performance Considerations

### API Efficiency
- Batch API requests where possible
- Implement intelligent caching for profile data
- Use conditional requests with ETag headers
- Minimize API calls through smart duplicate detection

### File Operations
- Use streaming for large file operations
- Implement atomic file writes to prevent corruption
- Compress historical data files when they grow large
- Use efficient JSON parsing for large datasets

### GitHub Actions Optimization
- Cache Node.js dependencies between runs
- Use parallel processing where possible
- Minimize checkout and setup time
- Implement early exit for no-change scenarios

## Security Considerations

### OAuth Token Management
- Store access token in GitHub Secrets
- Never log or expose token in console output
- Implement token validation before API calls
- Handle token expiration gracefully

### Data Privacy
- Store only public LinkedIn post data
- Implement data retention policies
- Sanitize user data in logs
- Follow LinkedIn API terms of service

### Repository Security
- Use minimal GitHub token permissions
- Validate all file paths to prevent directory traversal
- Sanitize commit messages and file content
- Implement input validation for all external data