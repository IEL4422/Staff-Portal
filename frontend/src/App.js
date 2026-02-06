import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataCacheProvider } from "./context/DataCacheContext";
import { ActionModalsProvider } from "./context/ActionModalsContext";

import Layout from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Dashboard from "./pages/Dashboard";
import PaymentsPage from "./pages/PaymentsPage";
import ReviewsPage from "./pages/ReviewsPage";
import ActiveCasesPage from "./pages/ActiveCasesPage";
import ClientsPage from "./pages/ClientsPage";
import LeadsPage from "./pages/LeadsPage";
import JudgeInformationPage from "./pages/JudgeInformationPage";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import AssetsDebtsListPage from "./pages/AssetsDebtsListPage";
import CaseContactsListPage from "./pages/CaseContactsListPage";
import SettingsPage from "./pages/SettingsPage";
import InvoicesPage from "./pages/InvoicesPage";
import UserManagementPage from "./pages/UserManagementPage";
import AuthHealthPage from "./pages/AuthHealthPage";

import ProbateCaseDetail from "./pages/ProbateCaseDetail";
import EstatePlanningDetail from "./pages/EstatePlanningDetail";
import DeedDetail from "./pages/DeedDetail";
import LeadDetail from "./pages/LeadDetail";

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
import AddAssetDebtPage from "./pages/actions/AddAssetDebtPage";
import AdminDashboard from "./pages/AdminDashboard";
import QuitClaimDeedPage from "./pages/actions/QuitClaimDeedPage";
import CourtOrderPage from "./pages/actions/CourtOrderPage";
import LegalLetterPage from "./pages/actions/LegalLetterPage";
import DocumentsPage from "./pages/DocumentsPage";
import GenerateDocumentsPage from "./pages/GenerateDocumentsPage";
import DocumentApprovalPage from "./pages/DocumentApprovalPage";
import TemplateMappingPage from "./pages/TemplateMappingPage";
import DocumentReviewPage from "./pages/DocumentReviewPage";
import PricingPage from "./pages/intake/PricingPage";
import PracticeAreasPage from "./pages/intake/PracticeAreasPage";
import PhoneCallIntakePage from "./pages/intake/PhoneCallIntakePage";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2E7DA1] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2E7DA1] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2E7DA1] rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUpPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/active-cases" element={<ActiveCasesPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/judge-information" element={<JudgeInformationPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/assets-debts" element={<AssetsDebtsListPage />} />
        <Route path="/case-contacts" element={<CaseContactsListPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/mapping/:templateId" element={<TemplateMappingPage />} />
        <Route path="/documents/review" element={<DocumentReviewPage />} />
        <Route path="/generate-documents" element={<GenerateDocumentsPage />} />
        <Route path="/document-approval/:approvalId" element={<DocumentApprovalPage />} />
        <Route path="/case/probate/:id" element={<ProbateCaseDetail />} />
        <Route path="/case/estate-planning/:id" element={<EstatePlanningDetail />} />
        <Route path="/case/deed/:id" element={<DeedDetail />} />
        <Route path="/case/lead/:id" element={<LeadDetail />} />
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
        <Route path="/actions/add-asset-debt" element={<AddAssetDebtPage />} />
        <Route path="/intake/pricing" element={<PricingPage />} />
        <Route path="/intake/practice-areas" element={<PracticeAreasPage />} />
        <Route path="/intake/phone-call" element={<PhoneCallIntakePage />} />
        <Route path="/actions/generate-documents/quit-claim-deed" element={<QuitClaimDeedPage />} />
        <Route path="/actions/generate-documents/court-order" element={<CourtOrderPage />} />
        <Route path="/actions/generate-documents/legal-letter" element={<LegalLetterPage />} />

        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/health/auth" element={<AuthHealthPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <DataCacheProvider>
            <ActionModalsProvider>
              <AppRoutes />
            </ActionModalsProvider>
          </DataCacheProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
