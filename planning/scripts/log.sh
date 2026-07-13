#!/bin/zsh
# Usage: planning/scripts/log.sh "journal line"  — appends timestamped line to loop journal.
echo "$(date '+%H:%M') $1" >> "$(dirname "$0")/../loop/journal.md"
