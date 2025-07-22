/**
 * LinkedIn URL Finder and Activity ID Extractor
 * Smart system to find LinkedIn posts and extract activity IDs
 */

// Known mappings for posts without activity IDs
const LINKEDIN_POST_MAPPINGS = {
    // Key: first few words of post content
    // Value: activity ID or search keywords
    "Undoubtedly, this is the finest beach": {
        keywords: ["Sweden", "beach", "midsummer", "Louise Nordin", "380 km"],
        activityId: null, // To be found
        searchHint: "Swedish beach midsummer recommendation"
    },
    "Unleash your inner racer": {
        keywords: ["Bluehawana", "racing", "track", "conquer", "win"],
        activityId: null, // To be found
        searchHint: "Bluehawana racing go-kart"
    },
    "I've been following Sander Van Vugt": {
        keywords: ["CKA", "tutorial", "Calico", "MacSilicon", "VMware Fusion"],
        activityId: null, // To be found
        searchHint: "CKA tutorial Calico MacSilicon debugging"
    },
    "Experience the power of Linux containers": {
        keywords: ["Container CLI", "macOS", "Apple", "Swift", "Linux"],
        activityId: null, // To be found
        searchHint: "Apple Container CLI Linux containers macOS"
    }
};

/**
 * Enhanced LinkedIn URL converter with smart fallback
 */
function smartLinkedInURLConverter(url, postContent = '') {
    // Try the existing conversion first
    const activityMatch = url.match(/activity-(\d+)-/);
    if (activityMatch) {
        const activityId = activityMatch[1];
        return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
    }
    
    // Check if we have a mapping for this post
    const postStart = postContent.substring(0, 50);
    for (const [key, mapping] of Object.entries(LINKEDIN_POST_MAPPINGS)) {
        if (postStart.includes(key)) {
            if (mapping.activityId) {
                return `https://www.linkedin.com/feed/update/urn:li:activity:${mapping.activityId}/`;
            } else {
                // Return a search URL for now, but log that we need the activity ID
                console.warn(`Missing activity ID for post: ${mapping.searchHint}`);
                return `https://www.linkedin.com/in/hzl/recent-activity/all/?search=${encodeURIComponent(mapping.searchHint)}`;
            }
        }
    }
    
    // If no mapping found, return the original URL
    return url;
}

/**
 * LinkedIn Activity ID Updater
 * Call this function when you find the correct activity IDs
 */
function updateLinkedInActivityIds(updates) {
    /*
    Usage example:
    updateLinkedInActivityIds({
        "Undoubtedly, this is the finest beach": "7234567890123456789",
        "Unleash your inner racer": "7345678901234567890",
        "I've been following Sander Van Vugt": "7456789012345678901",
        "Experience the power of Linux containers": "7567890123456789012"
    });
    */
    
    for (const [postStart, activityId] of Object.entries(updates)) {
        if (LINKEDIN_POST_MAPPINGS[postStart]) {
            LINKEDIN_POST_MAPPINGS[postStart].activityId = activityId;
            console.log(`Updated activity ID for: ${postStart}`);
        }
    }
    
    // Generate updated JSON for the data file
    console.log('Updated LinkedIn mappings:', LINKEDIN_POST_MAPPINGS);
}

/**
 * LinkedIn Search Helper
 * Generates search URLs to help find posts manually
 */
function generateSearchURLs() {
    const searches = [];
    
    for (const [postStart, mapping] of Object.entries(LINKEDIN_POST_MAPPINGS)) {
        if (!mapping.activityId) {
            const searchURL = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(mapping.searchHint)}&origin=GLOBAL_SEARCH_HEADER&sid=XYZ`;
            searches.push({
                post: postStart,
                hint: mapping.searchHint,
                searchURL: searchURL,
                keywords: mapping.keywords
            });
        }
    }
    
    return searches;
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        smartLinkedInURLConverter,
        updateLinkedInActivityIds,
        generateSearchURLs,
        LINKEDIN_POST_MAPPINGS
    };
}