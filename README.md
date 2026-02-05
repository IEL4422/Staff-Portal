# Illinois Estate Law Staff Portal

A comprehensive case management system for Illinois Estate Law.

## 🚀 Quick Start

**Want to get started immediately?** See [QUICKSTART.md](QUICKSTART.md)

### In 3 Steps:

1. **Start Backend:** `./start_backend.sh` (Terminal 1)
2. **Start Frontend:** `./start_frontend.sh` (Terminal 2)
3. **Login at** `http://localhost:3000`
   - Email: contact@illinoisestatelaw.com
   - Password: admin123

---

## 💡 What is This?

This is a full-stack web application for managing:
- 📋 Probate cases and estate planning
- 👥 Client and lead management
- 📅 Calendar and deadlines
- 📄 Document generation
- 💰 Invoices and payments
- ⚖️ Judge information database
- 📊 Task tracking and case updates

## ⚠️ Important: Two Servers Required

This application has:
- **Backend API** (FastAPI/Python) on port 8000
- **Frontend Web App** (React) on port 3000

**Both must be running** for the app to work!

## 🧪 Test Your Setup

Before starting, verify your environment:

```bash
python3 test_backend.py
```

This will check:
- Python dependencies
- Environment configuration
- Supabase connection
- Backend server module

## ❌ Troubleshooting

### "Sign In doesn't work" or "Backend not responding"

The backend is not running! Start it with:

```bash
./start_backend.sh
```

Then verify it's working by opening `http://localhost:8000/docs` in your browser.

### "Dependencies not installed"

Backend:
```bash
cd backend
pip3 install -r requirements.txt
```

Frontend:
```bash
cd frontend
npm install
```

### Common Port Issues

If ports are in use:
```bash
# Backend (port 8000)
lsof -ti:8000 | xargs kill -9

# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 2 minutes
- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- **API Docs** - http://localhost:8000/docs (when backend is running)

## 🛠 Tech Stack

- **Frontend:** React, TailwindCSS, Radix UI
- **Backend:** FastAPI, Python 3.8+
- **Database:** Supabase (PostgreSQL)
- **External Services:** Airtable integration

## 📁 Project Structure

```
.
├── backend/           # FastAPI backend server
│   ├── server.py      # Main server file
│   ├── routers/       # API route handlers
│   └── utils/         # Helper functions
├── frontend/          # React frontend app
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# Reusable components
│   │   ├── context/   # React context (auth, data)
│   │   └── services/  # API client services
│   └── public/
├── .env               # Environment variables
├── start_backend.sh   # Backend startup script
└── start_frontend.sh  # Frontend startup script
```

## 🎯 Features

### Dashboard
- Active cases overview
- Recent activities
- Quick actions

### Case Management
- Probate cases with detailed tracking
- Assets and debts management
- Contact information
- Document association

### Calendar & Tasks
- Deadlines and court dates
- Task assignments
- Event tracking

### Document Generation
- Template-based document creation
- Batch generation support
- PDF output

### Client Portal
- Lead tracking
- Client information management
- Communication history

### Admin Features
- User management
- System settings
- Review management
- Judge database

---

## 🆘 Need Help?

1. Read [QUICKSTART.md](QUICKSTART.md) - Most issues are covered there
2. Run `python3 test_backend.py` to diagnose backend issues
3. Check both terminal windows for error messages
4. Verify both servers are running on correct ports

---

**Remember: Both backend AND frontend must be running!**
