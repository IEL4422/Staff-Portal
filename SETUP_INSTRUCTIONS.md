# Illinois Estate Law Staff Portal - Setup Instructions

## Login Credentials

You can now login to the staff portal with these credentials:

- **Email:** `contact@illinoisestatelaw.com`
- **Password:** `admin123`

This is an admin account with full access to all features.

## Running the Application

### 1. Start the Backend Server

The backend is a FastAPI server that needs to be running for authentication and API requests.

```bash
cd backend
uvicorn server:app --reload --port 8000
```

The backend will be available at: `http://localhost:8000`

### 2. Start the Frontend Development Server

The frontend is a React application.

```bash
cd frontend
npm start
```

The frontend will be available at: `http://localhost:3000`

Alternatively, you can serve the production build:

```bash
cd frontend
npm install -g serve
serve -s build -p 3000
```

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

### Cannot Login

1. Make sure the backend server is running on port 8000
2. Check that the frontend has been built with the correct `REACT_APP_BACKEND_URL`
3. Verify the Supabase connection in the `.env` file
4. Check browser console for any CORS or network errors

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
