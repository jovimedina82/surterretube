#!/bin/bash
#
# OBS Configuration Helper
# Generates optimal OBS settings for SurterreTube
#

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear
echo -e "${CYAN}=========================================="
echo -e "  OBS Studio Configuration Helper"
echo -e "  for SurterreTube"
echo -e "==========================================${NC}"
echo ""

# Get stream key from database or use default
STREAM_KEY="3b6255b241e904335b9fe7756de6ae17"
SERVER_URL="surterretube.com"

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           WORKING OBS CONFIGURATION                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}━━━ Connection Settings ━━━${NC}"
echo -e "Server URL (RTMPS): ${YELLOW}rtmps://${SERVER_URL}:4443/live${NC}"
echo -e "Server URL (RTMP):  ${YELLOW}rtmp://${SERVER_URL}:1935/live${NC}"
echo -e "Stream Key:         ${YELLOW}${STREAM_KEY}${NC}"
echo ""

echo -e "${CYAN}━━━ Settings → Stream ━━━${NC}"
echo -e "Service:            ${YELLOW}Custom${NC}"
echo -e "Server:             ${YELLOW}rtmps://${SERVER_URL}:4443/live${NC}"
echo -e "Stream Key:         ${YELLOW}${STREAM_KEY}${NC}"
echo ""

echo -e "${CYAN}━━━ Settings → Output → Streaming ━━━${NC}"
echo -e "Output Mode:        ${YELLOW}Advanced${NC}"
echo -e "Encoder:            ${GREEN}x264 ⭐ (REQUIRED - do NOT use NVENC/QSV/AMF)${NC}"
echo -e "Rate Control:       ${YELLOW}CBR${NC}"
echo -e "Bitrate:            ${YELLOW}2500-4000 Kbps${NC}"
echo -e "Keyframe Interval:  ${GREEN}2 ⭐ (CRITICAL)${NC}"
echo -e "CPU Preset:         ${YELLOW}veryfast or faster${NC}"
echo -e "Profile:            ${GREEN}baseline ⭐ (CRITICAL - NOT main or high)${NC}"
echo -e "Tune:               ${YELLOW}(none)${NC}"
echo ""

echo -e "${CYAN}━━━ Settings → Video ━━━${NC}"
echo -e "Base Resolution:    ${YELLOW}1920x1080 or 1280x720${NC}"
echo -e "Output Resolution:  ${YELLOW}1280x720${NC}"
echo -e "FPS:                ${YELLOW}30${NC}"
echo ""

echo -e "${CYAN}━━━ Settings → Audio ━━━${NC}"
echo -e "Sample Rate:        ${YELLOW}48 kHz${NC}"
echo -e "Channels:           ${YELLOW}Stereo${NC}"
echo -e "Audio Bitrate:      ${YELLOW}128-160 kbps${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              STEP-BY-STEP SETUP                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Step 1: Settings → Stream${NC}"
echo "  1. Service: Select 'Custom'"
echo "  2. Server: rtmps://${SERVER_URL}:4443/live"
echo "  3. Stream Key: ${STREAM_KEY}"
echo "  4. Click 'Apply'"
echo ""

echo -e "${YELLOW}Step 2: Settings → Output${NC}"
echo "  1. Output Mode: Change to 'Advanced'"
echo "  2. Go to 'Streaming' tab"
echo "  3. Audio Track: 1"
echo "  4. Encoder: Select 'x264' (Software)"
echo "  5. Click 'Apply'"
echo ""

echo -e "${YELLOW}Step 3: Encoder Settings (x264)${NC}"
echo "  1. Rate Control: CBR"
echo "  2. Bitrate: 3000"
echo "  3. Keyframe Interval: 2"
echo "  4. CPU Usage Preset: veryfast"
echo "  5. Profile: baseline"
echo "  6. Tune: (none)"
echo "  7. Click 'Apply'"
echo ""

echo -e "${YELLOW}Step 4: Settings → Video${NC}"
echo "  1. Base Resolution: 1920x1080"
echo "  2. Output Resolution: 1280x720"
echo "  3. Downscale Filter: Bicubic"
echo "  4. FPS: 30"
echo "  5. Click 'Apply' and 'OK'"
echo ""

echo -e "${YELLOW}Step 5: Test Stream${NC}"
echo "  1. Click 'Start Streaming'"
echo "  2. Run monitoring script: sudo /opt/surterretube/scripts/stream-diagnostics.sh"
echo "  3. Check for errors in the output"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            TROUBLESHOOTING                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${MAGENTA}Problem: Stream connects but drops immediately${NC}"
echo -e "Solution: ${GREEN}Change Profile from 'high' to 'baseline'${NC}"
echo ""

echo -e "${MAGENTA}Problem: 'Failed to connect to server'${NC}"
echo -e "Solution: Try RTMP instead of RTMPS:"
echo -e "  Server: ${YELLOW}rtmp://${SERVER_URL}:1935/live${NC}"
echo ""

echo -e "${MAGENTA}Problem: High CPU usage${NC}"
echo -e "Solution: Change CPU Preset to 'ultrafast'"
echo ""

echo -e "${MAGENTA}Problem: Poor quality${NC}"
echo -e "Solution: Increase bitrate to 4000-5000 Kbps"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Ready to test? Run the diagnostic monitor:${NC}"
echo -e "${YELLOW}sudo /opt/surterretube/scripts/stream-diagnostics.sh${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
