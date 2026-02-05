#!/bin/bash

echo "🚀 Starting Illinois Estate Law Backend Server..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python $PYTHON_VERSION detected"

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in project root"
    echo "Please ensure .env file exists with Supabase configuration"
    exit 1
fi

cd backend

# Check if requirements are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import fastapi, supabase, uvicorn" 2>/dev/null; then
    echo "📦 Installing backend dependencies (this may take a minute)..."
    pip3 install --break-system-packages -r requirements.txt -q
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        echo "Try running: pip3 install -r backend/requirements.txt"
        exit 1
    fi
fi

# Verify critical imports
echo "🔍 Verifying backend setup..."
python3 -c "
import sys
try:
    import fastapi
    import supabase
    import uvicorn
    import bcrypt
    import jwt
    print('✅ All critical dependencies available')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Backend setup incomplete"
    exit 1
fi

# Start the backend server
echo ""
echo "✅ Backend ready to start"
echo "🌐 Starting backend server on http://localhost:8000"
echo "📖 API Documentation: http://localhost:8000/docs"
echo ""
echo "⚠️  Keep this terminal window open"
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

python3 -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
