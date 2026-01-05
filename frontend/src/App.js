import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Layout
import Layout from "./components/Layout";

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import PaymentsPage from "./pages/PaymentsPage";
import ActiveCasesPage from "./pages/ActiveCasesPage";
import ClientsPage from "./pages/ClientsPage";
import LeadsPage from "./pages/LeadsPage";
import JudgeInformationPage from "./pages/JudgeInformationPage";
import TasksPage from "./pages/TasksPage";

// Case Detail Pages
import ProbateCaseDetail from "./pages/ProbateCaseDetail";
import EstatePlanningDetail from "./pages/EstatePlanningDetail";
import DeedDetail from "./pages/DeedDetail";
import LeadDetail from "./pages/LeadDetail";

// Action Pages
import PhoneIntakePage from "./pages/actions/PhoneIntakePage";
import CaseUpdatePage from "./pages/actions/CaseUpdatePage";
import SendMailPage from "./pages/actions/SendMailPage";
import SendInvoicePage from "./pages/actions/SendInvoicePage";
import AddTaskPage from "./pages/actions/AddTaskPage";
import AddDeadlinePage from "./pages/actions/AddDeadlinePage";
import UploadFilePage from "./pages/actions/UploadFilePage";
import AddContactPage from "./pages/actions/AddContactPage";
import AddLeadPage from "./pages/actions/AddLeadPage";
import AddClientPage from "./pages/actions/AddClientPage";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#2E7DA1]/30 border-t-[#2E7DA1] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#2E7DA1]/30 border-t-[#2E7DA1] rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Active Cases List */}
        <Route path="/active-cases" element={<ActiveCasesPage />} />

        {/* Clients List */}
        <Route path="/clients" element={<ClientsPage />} />

        {/* Leads List */}
        <Route path="/leads" element={<LeadsPage />} />

        {/* Judge Information */}
        <Route path="/judge-information" element={<JudgeInformationPage />} />

        {/* Payments */}
        <Route path="/payments" element={<PaymentsPage />} />

        {/* Case Detail Pages */}
        <Route path="/case/probate/:id" element={<ProbateCaseDetail />} />
        <Route path="/case/estate-planning/:id" element={<EstatePlanningDetail />} />
        <Route path="/case/deed/:id" element={<DeedDetail />} />
        <Route path="/case/lead/:id" element={<LeadDetail />} />

        {/* Action Pages */}
        <Route path="/actions/phone-intake" element={<PhoneIntakePage />} />
        <Route path="/actions/case-update" element={<CaseUpdatePage />} />
        <Route path="/actions/send-mail" element={<SendMailPage />} />
        <Route path="/actions/send-invoice" element={<SendInvoicePage />} />
        <Route path="/actions/add-task" element={<AddTaskPage />} />
        <Route path="/actions/add-deadline" element={<AddDeadlinePage />} />
        <Route path="/actions/upload-file" element={<UploadFilePage />} />
        <Route path="/actions/add-contact" element={<AddContactPage />} />
        <Route path="/actions/add-lead" element={<AddLeadPage />} />
        <Route path="/actions/add-client" element={<AddClientPage />} />
      </Route>

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
