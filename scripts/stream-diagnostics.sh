#!/bin/bash
#
# SurterreTube Stream Diagnostics
# Real-time monitoring of streaming connections and codec information
#

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Clear screen
clear

echo -e "${CYAN}=========================================="
echo -e "  SurterreTube Stream Diagnostics"
echo -e "  $(date)"
echo -e "==========================================${NC}"
echo ""
echo -e "${YELLOW}Waiting for streaming connections...${NC}"
echo -e "${BLUE}Try connecting now from OBS or Wirecast${NC}"
echo -e "${MAGENTA}Press Ctrl+C to stop monitoring${NC}"
echo ""

# Function to parse and display connection info
parse_connection() {
    local line="$1"

    # RTMP client connection
    if echo "$line" | grep -q "RTMP client ip="; then
        ip=$(echo "$line" | grep -oP 'ip=\K[0-9.:]+')
        echo -e "${GREEN}[$(date +%H:%M:%S)] ✓ New connection from: $ip${NC}"
    fi

    # Handshake success
    if echo "$line" | grep -q "handshake success"; then
        echo -e "${GREEN}[$(date +%H:%M:%S)] ✓ Handshake successful${NC}"
    fi

    # Connection info
    if echo "$line" | grep -q "connect app"; then
        tcUrl=$(echo "$line" | grep -oP 'tcUrl=\K[^,]+' | tr -d ',')
        echo -e "${CYAN}[$(date +%H:%M:%S)] ℹ Connection URL: $tcUrl${NC}"
    fi

    # Stream identification
    if echo "$line" | grep -q "client identified"; then
        stream=$(echo "$line" | grep -oP 'stream=\K[^,]+' | tr -d ',')
        type=$(echo "$line" | grep -oP 'type=\K[^,]+' | tr -d ',')
        echo -e "${BLUE}[$(date +%H:%M:%S)] ℹ Stream: $stream${NC}"
        echo -e "${BLUE}[$(date +%H:%M:%S)] ℹ Type: $type${NC}"
    fi

    # Publish accepted
    if echo "$line" | grep -q "on_publish ok"; then
        echo -e "${GREEN}[$(date +%H:%M:%S)] ✓ Publish authorized - Stream starting!${NC}"
    fi

    # Metadata (resolution, etc)
    if echo "$line" | grep -q "got metadata"; then
        width=$(echo "$line" | grep -oP 'width=\K[0-9]+')
        height=$(echo "$line" | grep -oP 'height=\K[0-9]+')
        echo -e "${CYAN}[$(date +%H:%M:%S)] ℹ Resolution: ${width}x${height}${NC}"
    fi

    # Video codec info
    if echo "$line" | grep -q "video sh"; then
        codec=$(echo "$line" | grep -oP 'codec\(\K[^)]+')
        profile=$(echo "$line" | grep -oP 'profile=\K[^,]+' | tr -d ',')
        level=$(echo "$line" | grep -oP 'level=\K[^,]+' | tr -d ',')

        echo -e "${CYAN}[$(date +%H:%M:%S)] ℹ Video Codec: H.264${NC}"
        echo -e "${CYAN}[$(date +%H:%M:%S)] ℹ Profile: $profile${NC}"
        echo -e "${CYAN}[$(date +%H:%M:%S)] ℹ Level: $level${NC}"

        # Check if it's the problematic format
        if [ "$profile" == "High" ] || [ "$profile" == "Main" ]; then
            echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠ Using $profile profile - may cause AVCC format issues${NC}"
        elif [ "$profile" == "Baseline" ]; then
            echo -e "${GREEN}[$(date +%H:%M:%S)] ✓ Using Baseline profile - good choice!${NC}"
        fi
    fi

    # Audio codec info
    if echo "$line" | grep -q "audio sh"; then
        codec=$(echo "$line" | grep -oP 'codec\(\K[^)]+')
        channels=$(echo "$line" | grep -oP '(\d+)channels' | grep -oP '\d+')
        rate=$(echo "$line" | grep -oP '(\d+)HZ' | grep -oP '\d+')

        echo -e "${CYAN}[$(date +%H:%M:%S)] ℹ Audio: AAC, ${channels}ch, ${rate}Hz${NC}"
    fi

    # HLS segment created
    if echo "$line" | grep -q "hls: write" || echo "$line" | grep -q "update m3u8"; then
        echo -e "${GREEN}[$(date +%H:%M:%S)] ✓ HLS segment created successfully${NC}"
    fi

    # Drop segment (error indicator)
    if echo "$line" | grep -q "Drop ts segment"; then
        echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠ Dropped segment - likely codec issue${NC}"
    fi

    # Unpublish
    if echo "$line" | grep -q "on_unpublish ok"; then
        echo -e "${YELLOW}[$(date +%H:%M:%S)] ○ Stream stopped${NC}"
        echo ""
    fi

    # ERRORS
    if echo "$line" | grep -q "ERROR"; then
        echo -e "${RED}[$(date +%H:%M:%S)] ✗ ERROR DETECTED:${NC}"

        # Specific error: AVCC/Annex-B issue
        if echo "$line" | grep -q "not annexb"; then
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${RED}   CODEC FORMAT ERROR${NC}"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${YELLOW}Problem: Video is in AVCC/MP4 format${NC}"
            echo -e "${YELLOW}Expected: Annex-B format${NC}"
            echo ""
            echo -e "${CYAN}Solution for OBS:${NC}"
            echo -e "  1. Settings → Output → Streaming"
            echo -e "  2. Encoder: x264 (not NVENC or other)"
            echo -e "  3. Rate Control: CBR"
            echo -e "  4. Profile: ${GREEN}baseline${NC} (not Main or High)"
            echo -e "  5. Keyframe Interval: 2"
            echo ""
            echo -e "${CYAN}Solution for Wirecast:${NC}"
            echo -e "  1. Use x264 encoder (not Apple H.264)"
            echo -e "  2. Set H.264 Profile to Baseline or Main"
            echo -e "  3. Disable B-frames"
            echo -e "  4. Set GOP/Keyframe interval to 2 seconds"
            echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        fi

        # tcUrl discovery error
        if echo "$line" | grep -q "RtmpTcUrl"; then
            echo -e "${YELLOW}Connection URL format issue - check stream URL${NC}"
        fi
    fi

    # WARNINGS
    if echo "$line" | grep -q "WARN"; then
        if echo "$line" | grep -q "client disconnect"; then
            echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠ Client disconnected${NC}"
        fi
    fi
}

# Monitor SRS logs
echo -e "${BLUE}Monitoring SRS container logs...${NC}"
echo ""

# Tail the Docker logs and parse each line
sudo docker logs -f --tail 0 srs 2>&1 | while IFS= read -r line; do
    parse_connection "$line"
done
