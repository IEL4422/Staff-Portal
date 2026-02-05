# Illinois Estate Law Staff Portal - Setup Instructions

## ⚠️ IMPORTANT: Backend Must Be Running

**The login will not work unless the backend server is running!**

## 🚀 Quick Start

### Option 1: Using the Startup Scripts (Recommended)

**Terminal 1 - Start Backend:**
```bash
./start_backend.sh
```

**Terminal 2 - Start Frontend:**
```bash
./start_frontend.sh
```

### Option 2: Manual Start

**Terminal 1 - Start Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm install
npm start
```

## 🔐 Login Credentials

Once both servers are running, visit `http://localhost:3000` and login with:

- **Email:** `contact@illinoisestatelaw.com`
- **Password:** `admin123`

This is an admin account with full access to all features.

## ✅ Verify Servers Are Running

Before trying to login, make sure:

1. ✅ Backend is running at `http://localhost:8000`
   - You should see FastAPI server logs
   - Test: Open `http://localhost:8000/docs` in your browser

2. ✅ Frontend is running at `http://localhost:3000`
   - You should see the login page
   - Check browser console for any errors

## Environment Configuration

The `.env` file contains all necessary configuration:

- **Backend URL:** `http://localhost:8000` (configured in `REACT_APP_BACKEND_URL`)
- **Supabase:** Already configured and connected
- **JWT Secret:** Set for authentication tokens

## Database

The application uses Supabase PostgreSQL database with the following tables:

- **users** - User accounts with authentication
- **task_completion_dates** - Task tracking for cases

RLS (Row Level Security) is enabled on all tables for security.

## Features Available

Once logged in, you'll have access to:

- Dashboard with analytics
- Case Management (Probate, Estate Planning, Deeds)
- Client & Lead Management
- Tasks & Calendar
- Document Generation & Approval
- Invoices & Payments
- Reviews Management
- Judge Information Database
- Settings & Admin Panel

## Troubleshooting

### Sign In Button Doesn't Work / Nothing Happens

**This means the backend is not running!**

1. ✅ **START THE BACKEND FIRST** using `./start_backend.sh`
2. ✅ Verify backend is running by visiting `http://localhost:8000/docs`
3. ✅ Check backend terminal for any errors
4. ✅ Then try logging in again

### Cannot Login / Invalid Credentials

1. Make sure you're using the correct credentials:
   - Email: `contact@illinoisestatelaw.com`
   - Password: `admin123`
2. Check browser console (F12) for error messages
3. Verify Supabase connection in the `.env` file

### Backend Not Starting

1. Install Python dependencies: `pip install -r backend/requirements.txt`
2. Make sure the `.env` file exists in the project root
3. Verify Supabase credentials are correct

### Frontend Not Starting

1. Install dependencies: `cd frontend && npm install`
2. Clear cache: `rm -rf node_modules/.cache`
3. Rebuild: `npm run build`

## Security Notes

- The default password (`admin123`) should be changed after first login
- JWT tokens expire after 30 days
- All database tables have RLS policies enabled
- CORS is configured to allow local development origins

## Next Steps

1. Login with the provided credentials
2. Change your password in Settings
3. Add additional users if needed via Admin Dashboard
4. Configure Airtable integration (optional) by adding API keys to `.env`
5. Configure Dropbox integration (optional) for document storage

---

For any issues, check the browser console and backend logs for error messages.
