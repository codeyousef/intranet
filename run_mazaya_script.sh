#!/bin/bash

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Navigate to the script directory
cd "$SCRIPT_DIR"

# Run the Python script
# Try to use python3 first, fall back to python if not available
if command -v python3 &>/dev/null; then
    python3 "$SCRIPT_DIR/main.py"
elif command -v python &>/dev/null; then
    python "$SCRIPT_DIR/main.py"
else
    echo "Error: Python not found. Please install Python 3."
    exit 1
fi
