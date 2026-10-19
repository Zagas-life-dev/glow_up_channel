#!/bin/sh
# usage: shoot.sh name  -> frames/name.html -> name.png
D="$(cd "$(dirname "$0")" && pwd -W)"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=1080,1920 --virtual-time-budget=1500 --screenshot="$D/$1.png" "file:///$D/frames/$1.html" 2>/dev/null
