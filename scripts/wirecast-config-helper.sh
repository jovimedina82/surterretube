#!/bin/bash
#
# Wirecast Configuration Helper
# Generates optimal Wirecast settings for SurterreTube
#

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}=========================================="
echo -e "  Wirecast Configuration Helper"
echo -e "  for SurterreTube"
echo -e "==========================================${NC}"
echo ""

# Get stream key from database or use default
STREAM_KEY="3b6255b241e904335b9fe7756de6ae17"
SERVER_URL="surterretube.com"

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           WORKING WIRECAST CONFIGURATION             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}━━━ Connection Settings ━━━${NC}"
echo -e "Destination:        ${YELLOW}RTMP Server${NC}"
echo -e "Address (RTMPS):    ${YELLOW}rtmps://${SERVER_URL}:4443/live${NC}"
echo -e "Address (RTMP):     ${YELLOW}rtmp://${SERVER_URL}:1935/live${NC}"
echo -e "Stream:             ${YELLOW}${STREAM_KEY}${NC}"
echo -e "Username:           ${YELLOW}(leave empty)${NC}"
echo -e "Password:           ${YELLOW}(leave empty)${NC}"
echo ""

echo -e "${CYAN}━━━ Video Encoder Settings ━━━${NC}"
echo -e "Encoder:            ${GREEN}x264 ⭐ (REQUIRED - NOT Apple H.264/MainConcept)${NC}"
echo -e "Preset:             ${YELLOW}Medium or Fast${NC}"
echo -e "Profile:            ${GREEN}Baseline or Main ⭐ (NOT High!)${NC}"
echo -e "Level:              ${YELLOW}3.1 or Auto${NC}"
echo -e "Bitrate Mode:       ${YELLOW}CBR (Constant Bitrate)${NC}"
echo -e "Video Bitrate:      ${YELLOW}2500-4000 Kbps${NC}"
echo -e "GOP Size:           ${GREEN}60 frames ⭐ (2 sec @ 30fps)${NC}"
echo -e "B-frames:           ${GREEN}0 (Disabled) ⭐ CRITICAL${NC}"
echo -e "Frame Rate:         ${YELLOW}30 fps${NC}"
echo -e "Resolution:         ${YELLOW}1280x720${NC}"
echo ""

echo -e "${CYAN}━━━ Audio Encoder Settings ━━━${NC}"
echo -e "Codec:              ${YELLOW}AAC${NC}"
echo -e "Sample Rate:        ${YELLOW}48000 Hz${NC}"
echo -e "Bitrate:            ${YELLOW}128-160 Kbps${NC}"
echo -e "Channels:           ${YELLOW}Stereo${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              STEP-BY-STEP SETUP                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Step 1: Output Settings${NC}"
echo "  1. Click 'Output' button at the top"
echo "  2. Click 'Output Settings' (gear icon)"
echo "  3. In the Destination dropdown, select 'RTMP Server'"
echo "  4. Click 'OK'"
echo ""

echo -e "${YELLOW}Step 2: Configure RTMP Server${NC}"
echo "  1. In Output panel, click the settings gear next to 'RTMP Server'"
echo "  2. Address: rtmps://${SERVER_URL}:4443/live"
echo "  3. Stream: ${STREAM_KEY}"
echo "  4. Leave Username and Password empty"
echo "  5. Encoding: Select your encoder preset (see Step 3)"
echo "  6. Click 'OK'"
echo ""

echo -e "${YELLOW}Step 3: Configure Video Encoder${NC}"
echo "  1. In Output Settings, go to 'Encoding' section"
echo "  2. Click '+' to create new encoding preset"
echo "  3. Name it 'SurterreTube'"
echo ""
echo "  ${CYAN}Video Settings:${NC}"
echo "    • Encoder: x264"
echo "    • Width: 1280, Height: 720"
echo "    • Frame Rate: 30"
echo "    • Video Bitrate: 3000 Kbps"
echo "    • Bitrate Mode: CBR"
echo ""
echo "  ${CYAN}Advanced H.264 Settings (Click 'Advanced'):${NC}"
echo "    • Profile: ${GREEN}Baseline${NC} or ${GREEN}Main${NC} (${RED}NOT High!${NC})"
echo "    • Level: 3.1"
echo "    • GOP Size: 60 (for 30fps = 2 seconds)"
echo "    • B-frames: ${GREEN}0 (zero - CRITICAL!)${NC}"
echo "    • Preset: Medium or Fast"
echo "    • Tune: (none)"
echo ""

echo -e "${YELLOW}Step 4: Configure Audio Encoder${NC}"
echo "  1. In the same encoding preset"
echo "  2. Audio Format: AAC"
echo "  3. Sample Rate: 48000 Hz"
echo "  4. Bitrate: 128 Kbps"
echo "  5. Channels: Stereo"
echo "  6. Click 'OK' to save preset"
echo ""

echo -e "${YELLOW}Step 5: Start Streaming${NC}"
echo "  1. Select your 'SurterreTube' encoding preset in Output panel"
echo "  2. Click 'Stream' button"
echo "  3. Monitor with: sudo /opt/surterretube/scripts/stream-diagnostics.sh"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         WIRECAST VERSION-SPECIFIC NOTES              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${MAGENTA}Wirecast Pro/Studio:${NC}"
echo "  • Full x264 control available"
echo "  • Can set B-frames to 0"
echo "  • Can choose Baseline profile"
echo ""

echo -e "${MAGENTA}Wirecast Standard:${NC}"
echo "  • May have limited encoder options"
echo "  • Try MainConcept encoder if x264 not available"
echo "  • Disable advanced features/B-frames"
echo ""

echo -e "${MAGENTA}Wirecast for Mac:${NC}"
echo "  • ${RED}Avoid Apple H.264 encoder${NC}"
echo "  • Use x264 or VideoToolbox with Baseline profile"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            TROUBLESHOOTING                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${MAGENTA}Problem: Stream connects but drops immediately${NC}"
echo -e "Cause:   ${RED}Using H.264 High profile or B-frames enabled${NC}"
echo -e "Fix:     ${GREEN}Change Profile to 'Baseline' AND set B-frames to 0${NC}"
echo ""

echo -e "${MAGENTA}Problem: 'Failed to connect to server'${NC}"
echo -e "Cause:   SSL/TLS certificate issue"
echo -e "Fix:     Try plain RTMP instead:"
echo -e "         Address: ${YELLOW}rtmp://${SERVER_URL}:1935/live${NC}"
echo ""

echo -e "${MAGENTA}Problem: 'Connection timed out'${NC}"
echo -e "Cause:   Firewall blocking RTMPS (port 4443)"
echo -e "Fix:     Use RTMP (port 1935) or check firewall"
echo ""

echo -e "${MAGENTA}Problem: Error 'not annexb' in server logs${NC}"
echo -e "Cause:   ${RED}Wrong encoder or profile setting${NC}"
echo -e "Fix:     ${GREEN}MUST use x264 with Baseline profile${NC}"
echo -e "         ${GREEN}MUST disable B-frames (set to 0)${NC}"
echo ""

echo -e "${MAGENTA}Problem: High CPU usage${NC}"
echo -e "Fix:     • Change x264 Preset to 'Fast' or 'Very Fast'"
echo -e "         • Lower resolution to 960x540 or 640x360"
echo -e "         • Reduce bitrate to 2000 Kbps"
echo ""

echo -e "${MAGENTA}Problem: Poor video quality${NC}"
echo -e "Fix:     • Increase bitrate to 4000-5000 Kbps"
echo -e "         • Use x264 Preset 'Medium' or 'Slow'"
echo -e "         • Check source camera quality"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           QUICK ENCODER COMPARISON                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}x264 (Software):${NC}"
echo -e "  ✓ Best compatibility"
echo -e "  ✓ Full profile control"
echo -e "  ✓ Can disable B-frames"
echo -e "  ✗ High CPU usage"
echo ""

echo -e "${CYAN}Apple H.264 (macOS):${NC}"
echo -e "  ✗ ${RED}Often uses AVCC format${NC}"
echo -e "  ✗ ${RED}Limited profile control${NC}"
echo -e "  ✗ ${RED}NOT RECOMMENDED${NC}"
echo ""

echo -e "${CYAN}MainConcept H.264:${NC}"
echo -e "  ~ May work with Baseline profile"
echo -e "  ~ Ensure B-frames disabled"
echo -e "  ~ Test with diagnostics"
echo ""

echo -e "${CYAN}VideoToolbox (macOS):${NC}"
echo -e "  ✓ Hardware accelerated"
echo -e "  ~ Works if set to Baseline"
echo -e "  ~ Must disable B-frames"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ALTERNATIVE: USE OBS INSTEAD                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}If Wirecast continues to have issues:${NC}"
echo "  OBS Studio is free and works better with SRS"
echo "  Configuration helper:"
echo -e "  ${CYAN}/opt/surterretube/scripts/obs-config-helper.sh${NC}"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Ready to test? Run the diagnostic monitor:${NC}"
echo -e "${YELLOW}sudo /opt/surterretube/scripts/stream-diagnostics.sh${NC}"
echo ""
echo -e "${GREEN}Then start streaming from Wirecast and watch for errors${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}     MOST CRITICAL SETTINGS (DON'T FORGET!)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${RED}1.${NC} Encoder: ${GREEN}x264${NC} (not Apple H.264)"
echo -e "${RED}2.${NC} Profile: ${GREEN}Baseline or Main${NC} (NOT High)"
echo -e "${RED}3.${NC} B-frames: ${GREEN}0 (zero/disabled)${NC}"
echo -e "${RED}4.${NC} GOP Size: ${GREEN}60 frames${NC} (for 30fps)"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""
