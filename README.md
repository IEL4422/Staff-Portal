# Illinois Estate Law Staff Portal

A comprehensive case management system for Illinois Estate Law.

## ⚠️ IMPORTANT: You Need to Start BOTH Servers

The application requires **two separate servers** to run:
1. **Backend** (FastAPI server on port 8000)
2. **Frontend** (React app on port 3000)

## 🚀 How to Start the Application

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
./start_backend.sh
```

Or manually:

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

Keep this terminal window open. You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Start the Frontend Server

Open a **NEW** terminal window and run:

```bash
./start_frontend.sh
```

Or manually:

```bash
cd frontend
npm install
npm start
```

The frontend will open automatically at `http://localhost:3000`

## 🔐 Login Credentials

- **Email:** contact@illinoisestatelaw.com
- **Password:** admin123

## ❌ Troubleshooting: "Sign In button doesn't work"

If clicking Sign In does nothing:

1. ✅ The **backend is not running** - Start it using `./start_backend.sh`
2. ✅ Open `http://localhost:8000/docs` in your browser to verify the backend is running
3. ✅ Check the backend terminal for error messages
4. ✅ Make sure you see "Uvicorn running on http://127.0.0.1:8000"

## 📚 Full Documentation

See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) for detailed setup information and troubleshooting.

## 🛠 Tech Stack

- **Frontend:** React, TailwindCSS, Radix UI
- **Backend:** FastAPI, Python
- **Database:** Supabase (PostgreSQL)
- **External:** Airtable integration for case management
