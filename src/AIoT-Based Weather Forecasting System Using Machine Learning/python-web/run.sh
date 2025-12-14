#!/bin/bash

# AIoT Weather Forecasting System - Web Server Startup Script
# Simple script to run the web application

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the script directory
cd "$SCRIPT_DIR"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║   AIoT Weather Forecasting System                          ║"
echo "║   Web Application Starting...                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✓ Python $(python3 --version | cut -d' ' -f2) found"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo ""
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "✓ Activating virtual environment..."
source venv/bin/activate

# Install requirements if needed
if [ ! -f "venv/INSTALLED" ] || [ requirements.txt -nt venv/INSTALLED ]; then
    echo ""
    echo "📚 Installing requirements..."
    pip install --quiet -r requirements.txt
    touch venv/INSTALLED
    echo "✓ Requirements installed"
fi

echo ""
echo "⚙️  Configuration:"
echo "   Host:     0.0.0.0"
echo "   Port:     3000"
echo "   App:      http://localhost:3000"
echo "   Docs:     http://localhost:3000/docs"
echo "   ReDoc:    http://localhost:3000/redoc"
echo ""
echo "════════════════════════════════════════════════════════════"
echo "🚀 Starting server... (Press Ctrl+C to stop)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Run the application
python3 -m uvicorn main:app --host 0.0.0.0 --port 3000 --reload
