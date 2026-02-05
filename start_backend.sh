#!/bin/bash

echo "🚀 Starting Illinois Estate Law Backend Server..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found"
    exit 1
fi

cd backend

# Check if requirements are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing backend dependencies..."
    pip install --break-system-packages -r requirements.txt -q
fi

# Start the backend server
echo ""
echo "✅ Backend dependencies ready"
echo "🌐 Starting backend server on http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

uvicorn server:app --reload --port 8000
