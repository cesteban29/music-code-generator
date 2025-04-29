#!/usr/bin/env bash

# Hardcoded directory containing the spider log
LOG_DIR="/Users/carlosesteban/.sonic-pi/log"
LOG_FILE="spider.log"

# Change to the log directory
if ! cd "$LOG_DIR"; then
  echo "Error: Cannot change to directory $LOG_DIR" >&2
  exit 1
fi

# Verify the log file exists in the current directory
if [[ ! -f "$LOG_FILE" ]]; then
  echo "Error: Log file '$LOG_FILE' not found in $LOG_DIR" >&2
  exit 1
fi

# Extract the server port (number following :server_port=>)
SERVER_PORT=$(grep -o ':server_port=>[0-9]\+' "$LOG_FILE" | grep -o '[0-9]\+')

# Extract the token (number following "Token:", including a leading minus if present)
TOKEN=$(grep 'Token:' "$LOG_FILE" | sed -E 's/.*Token: (-?[0-9]+).*/\1/')

# Print the extracted values
echo "Server Port: $SERVER_PORT"
echo "Token: $TOKEN"