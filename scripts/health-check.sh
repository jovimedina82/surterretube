#!/bin/bash
#
# SurterreTube Health Check Script
# Checks all critical services and endpoints
#

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for failures
FAILURES=0

# Function to check service status
check_service() {
    local service_name="$1"
    local description="$2"

    echo -n "Checking $description... "

    if systemctl is-active --quiet "$service_name"; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not Running${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to check Docker container
check_docker_container() {
    local container_name="$1"
    local description="$2"

    echo -n "Checking $description... "

    if sudo docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        local status=$(sudo docker inspect --format='{{.State.Status}}' "$container_name")
        if [ "$status" == "running" ]; then
            echo -e "${GREEN}✓ Running${NC}"
            return 0
        else
            echo -e "${RED}✗ Status: $status${NC}"
            FAILURES=$((FAILURES + 1))
            return 1
        fi
    else
        echo -e "${RED}✗ Container not found${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url="$1"
    local description="$2"
    local expected_code="${3:-200}"

    echo -n "Checking $description... "

    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$http_code" == "$expected_code" ]; then
        echo -e "${GREEN}✓ HTTP $http_code${NC}"
        return 0
    else
        echo -e "${RED}✗ HTTP $http_code (expected $expected_code)${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to check port listening
check_port() {
    local port="$1"
    local description="$2"

    echo -n "Checking $description (port $port)... "

    if sudo ss -tlnp | grep -q ":${port} "; then
        echo -e "${GREEN}✓ Listening${NC}"
        return 0
    else
        echo -e "${RED}✗ Not Listening${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local path="$1"
    local threshold="${2:-90}"

    echo -n "Checking disk space at $path... "

    usage=$(df -h "$path" | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✓ ${usage}% used${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ ${usage}% used (threshold: ${threshold}%)${NC}"
        return 0  # Warning, not failure
    fi
}

echo "=========================================="
echo "  SurterreTube Health Check"
echo "  $(date)"
echo "=========================================="
echo ""

echo "=== System Services ==="
check_service "nginx" "Nginx Web Server"
check_service "stunnel4" "Stunnel (RTMPS)"
check_service "surterretube-frontend" "Frontend (Next.js)"
check_service "surterretube-chat" "Chat Server"
echo ""

echo "=== Docker Containers ==="
check_docker_container "srs" "SRS RTMP Server"
check_docker_container "postgres_db" "PostgreSQL Database"
echo ""

echo "=== Network Ports ==="
check_port "80" "HTTP"
check_port "443" "HTTPS"
check_port "1935" "RTMP"
check_port "4443" "RTMPS"
check_port "3000" "Frontend"
check_port "3001" "Chat Server"
check_port "5432" "PostgreSQL"
check_port "8080" "SRS HTTP"
echo ""

echo "=== HTTP Endpoints ==="
check_http_endpoint "http://127.0.0.1:3000" "Frontend Root"
check_http_endpoint "http://127.0.0.1:3001/healthz" "Chat Server Health"
check_http_endpoint "https://surterretube.com/healthz" "Public HTTPS Health" "200"
echo ""

echo "=== Disk Space ==="
check_disk_space "/" 90
check_disk_space "/mnt/media" 85
echo ""

echo "=== Stream Status ==="
stream_status=$(curl -s http://127.0.0.1:3001/stats 2>/dev/null || echo '{"error":"unavailable"}')
live=$(echo "$stream_status" | grep -o '"live":[^,}]*' | cut -d: -f2 | tr -d ' ')

echo -n "Stream Status... "
if [ "$live" == "true" ]; then
    echo -e "${GREEN}✓ LIVE${NC}"
else
    echo -e "${YELLOW}○ Offline${NC}"
fi
echo ""

# Summary
echo "=========================================="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}All checks passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}$FAILURES check(s) failed! ✗${NC}"
    exit 1
fi
