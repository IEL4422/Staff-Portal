# Illinois Estate Law - Quick Start Guide

## ⚡ TL;DR - Start the App in 2 Steps

### Step 1: Start Backend (Terminal 1)
```bash
./start_backend.sh
```

### Step 2: Start Frontend (Terminal 2)
```bash
./start_frontend.sh
```

### Step 3: Login
Open `http://localhost:3000` and login with:
- **Email:** contact@illinoisestatelaw.com
- **Password:** admin123

---

## 🔧 Prerequisites

- **Python 3.8+** - For the backend API server
- **Node.js 14+** - For the frontend React app
- **Internet Connection** - For Supabase database

---

## 📋 Detailed Instructions

### First Time Setup

1. **Clone/Download this project**

2. **Verify Prerequisites**
   ```bash
   python3 --version  # Should be 3.8 or higher
   node --version     # Should be 14 or higher
   npm --version      # Should be installed with Node
   ```

3. **Install Backend Dependencies** (automatic on first run)
   ```bash
   cd backend
   pip3 install -r requirements.txt
   cd ..
   ```

4. **Install Frontend Dependencies** (automatic on first run)
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

You need **TWO terminal windows** running simultaneously:

#### Terminal 1 - Backend Server

```bash
./start_backend.sh
```

**Expected Output:**
```
✅ Python 3.x detected
📦 Checking dependencies...
✅ All critical dependencies available
✅ Backend ready to start
🌐 Starting backend server on http://localhost:8000
📖 API Documentation: http://localhost:8000/docs

⚠️  Keep this terminal window open
Press Ctrl+C to stop the server
================================

INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using WatchFiles
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify Backend is Running:**
- Open `http://localhost:8000/docs` in your browser
- You should see the FastAPI documentation page

#### Terminal 2 - Frontend Server

```bash
./start_frontend.sh
```

**Expected Output:**
```
✅ Node and npm detected
📦 Installing frontend dependencies...
✅ Frontend dependencies ready
🌐 Starting frontend server on http://localhost:3000

Press Ctrl+C to stop the server
================================

Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
```

The frontend will automatically open in your browser at `http://localhost:3000`.

### Login Credentials

Once both servers are running:

1. Go to `http://localhost:3000`
2. Login with:
   - **Email:** contact@illinoisestatelaw.com
   - **Password:** admin123

---

## ❌ Troubleshooting

### "Sign In button doesn't work" or "Nothing happens when I login"

**This means the backend is not running!**

1. Make sure you started the backend server in Terminal 1
2. Check that you see "Uvicorn running on http://0.0.0.0:8000"
3. Visit `http://localhost:8000/docs` - you should see API documentation
4. Check the backend terminal for any error messages
5. Try restarting the backend: `./start_backend.sh`

### Backend Won't Start

**Error: "No module named 'fastapi'"**
```bash
cd backend
pip3 install -r requirements.txt
```

**Error: "Port 8000 is already in use"**
```bash
# Find and kill the process using port 8000
lsof -ti:8000 | xargs kill -9
# Then restart the backend
./start_backend.sh
```

**Error: ".env file not found"**
- Make sure you're in the project root directory
- The `.env` file should exist with Supabase credentials

### Frontend Won't Start

**Error: "npm: command not found"**
- Install Node.js from https://nodejs.org/

**Error: "Port 3000 is already in use"**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
# Then restart the frontend
./start_frontend.sh
```

**Error: "node_modules not found"**
```bash
cd frontend
npm install
cd ..
./start_frontend.sh
```

### Login Issues

**"Invalid credentials" error**
- Make sure you're using the correct email: `contact@illinoisestatelaw.com`
- Password is: `admin123`
- Check browser console (F12) for detailed error messages

**"Network error" or "Failed to fetch"**
- Backend is not running - go to Terminal 1 and check
- Backend is running on wrong port - should be port 8000
- CORS issue - check backend terminal for errors

---

## 🧪 Testing Your Setup

Run the diagnostic test to verify everything is configured correctly:

```bash
python3 test_backend.py
```

This will check:
- Python dependencies
- Environment variables
- Supabase connection
- Backend server module

You should see:
```
✅ PASS: Imports
✅ PASS: Environment
✅ PASS: Supabase Connection
✅ PASS: Server Module

✅ ALL TESTS PASSED
```

---

## 🚀 Deployment

For production deployment, see the full documentation in `SETUP_INSTRUCTIONS.md`.

---

## 📚 Additional Resources

- **API Documentation:** http://localhost:8000/docs (when backend is running)
- **Full Setup Guide:** See `SETUP_INSTRUCTIONS.md`
- **README:** See `README.md` for project overview

---

## 🆘 Still Having Issues?

1. **Check both terminal windows** - Both must be running without errors
2. **Run the diagnostic test:** `python3 test_backend.py`
3. **Check browser console:** Press F12 in browser, look for errors
4. **Restart everything:**
   - Stop both servers (Ctrl+C in both terminals)
   - Close both terminals
   - Open new terminals and start again

---

**Remember:** You need BOTH servers running for the app to work!
- Terminal 1: Backend (port 8000)
- Terminal 2: Frontend (port 3000)
