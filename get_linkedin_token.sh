#!/bin/bash

# LinkedIn OAuth Access Token Generator
# Usage: ./get-linkedin-token.sh [authorization_code]

# Configuration
CLIENT_ID="77duha47hcbh8o"
CLIENT_SECRET="WPL_AP1.KCsCGIG1HHXfY8LV.1OEJWQ=="
REDIRECT_URI="https://oauth.pstmn.io/v1/callback"
SCOPE="r_liteprofile r_emailaddress w_member_social"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to generate state parameter
generate_state() {
    echo $(date +%s)$(shuf -i 1000-9999 -n 1)
}

# Function to generate authorization URL
generate_auth_url() {
    local state=$(generate_state)
    local auth_url="https://www.linkedin.com/oauth/v2/authorization"
    auth_url="${auth_url}?response_type=code"
    auth_url="${auth_url}&client_id=${CLIENT_ID}"
    auth_url="${auth_url}&redirect_uri=${REDIRECT_URI// /%20}"
    auth_url="${auth_url}&scope=${SCOPE// /%20}"
    auth_url="${auth_url}&state=${state}"
    
    echo -e "${CYAN}======================================================="
    echo -e "🔗 LinkedIn OAuth Authorization"
    echo -e "=======================================================${NC}"
    echo -e "${YELLOW}1. Open this URL in your browser:${NC}"
    echo -e "${BLUE}${auth_url}${NC}"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT: If authorization fails in browser/Postman:${NC}"
    echo -e "${RED}   Use LinkedIn Mobile App when you receive authorization email!${NC}"
    echo ""
    echo -e "${YELLOW}2. Authorize the application${NC}"
    echo -e "${YELLOW}3. Copy the 'code' parameter from the callback URL${NC}"
    echo -e "${YELLOW}4. Run this script again with the code:${NC}"
    echo -e "${GREEN}   ./get-linkedin-token.sh YOUR_AUTHORIZATION_CODE${NC}"
    echo ""
}

# Function to exchange code for token
exchange_code_for_token() {
    local auth_code="$1"
    
    echo -e "${CYAN}🔄 Exchanging authorization code for access token...${NC}"
    
    local response=$(curl -s -X POST "https://www.linkedin.com/oauth/v2/accessToken" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=authorization_code" \
        -d "code=${auth_code}" \
        -d "client_id=${CLIENT_ID}" \
        -d "client_secret=${CLIENT_SECRET}" \
        -d "redirect_uri=${REDIRECT_URI}")
    
    # Check if response contains access_token
    if echo "$response" | grep -q "access_token"; then
        echo -e "${GREEN}✅ Success! Access token retrieved${NC}"
        echo -e "${CYAN}======================================================="
        echo -e "Access Token Response:"
        echo -e "=======================================================${NC}"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        echo -e "${CYAN}=======================================================${NC}"
        
        # Extract access token
        local access_token=$(echo "$response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        
        if [ ! -z "$access_token" ]; then
            echo -e "${YELLOW}💾 Access Token: ${access_token}${NC}"
            echo ""
            echo -e "${YELLOW}🧪 Testing access token...${NC}"
            test_access_token "$access_token"
        fi
    else
        echo -e "${RED}❌ Error: Failed to get access token${NC}"
        echo "$response"
    fi
}

# Function to test access token
test_access_token() {
    local access_token="$1"
    
    local test_response=$(curl -s -X GET "https://api.linkedin.com/v2/people/~" \
        -H "Authorization: Bearer ${access_token}" \
        -H "Accept: application/json")
    
    if echo "$test_response" | grep -q "id"; then
        echo -e "${GREEN}✅ Token test successful!${NC}"
        echo -e "${CYAN}======================================================="
        echo -e "Profile Information:"
        echo -e "=======================================================${NC}"
        echo "$test_response" | python3 -m json.tool 2>/dev/null || echo "$test_response"
        echo -e "${CYAN}=======================================================${NC}"
    else
        echo -e "${RED}❌ Token test failed${NC}"
        echo "$test_response"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Token generation complete!${NC}"
    echo -e "${YELLOW}💡 You can now use this access token in your LinkedIn API calls.${NC}"
    echo -e "${YELLOW}📝 Store it securely in your environment variables.${NC}"
}

# Main script logic
main() {
    echo -e "${GREEN}🚀 LinkedIn OAuth Access Token Generator${NC}"
    echo ""
    
    if [ -z "$1" ]; then
        # No authorization code provided, show auth URL
        generate_auth_url
    else
        # Authorization code provided, exchange for token
        local auth_code="$1"
        exchange_code_for_token "$auth_code"
    fi
}

# Check dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ Error: curl is required but not installed.${NC}"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${YELLOW}⚠️  Warning: python3 not found. JSON formatting will be disabled.${NC}"
    fi
}

# Run dependency check and main function
check_dependencies
main "$@"