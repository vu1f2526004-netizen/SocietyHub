import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { AuthContext } from '../context/AuthContext';

import Login from '../pages/Login';
import Signup from '../pages/Signup';
import RegisterSociety from '../pages/RegisterSociety';
import JoinSociety from '../pages/JoinSociety';
import Unauthorized from '../pages/Unauthorized';
import Notifications from '../pages/Notifications';

import ResidentLayout from '../layouts/ResidentLayout';
import ResidentDashboard from '../pages/ResidentDashboard';
import MyComplaints from '../pages/Resident/MyComplaints';
import CreateComplaint from '../pages/Resident/CreateComplaint';
import ResidentDocuments from '../pages/Resident/ResidentDocuments';
import CommunityIssues from '../pages/Resident/CommunityIssues';
import Visitors from '../pages/Resident/Visitors';
import MaintenanceBills from '../pages/Resident/MaintenanceBills';
import PaymentHistory from '../pages/Resident/PaymentHistory';
import FinanceSummary from '../pages/Resident/FinanceSummary';
import Events from '../pages/Resident/Events';
import Voting from '../pages/Resident/Voting';
import ResidentProfile from '../pages/Resident/ResidentProfile';

import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../pages/AdminDashboard';
import ComplaintsManagement from '../pages/Admin/ComplaintsManagement';
import DocumentsManagement from '../pages/Admin/DocumentsManagement';
import IssuesManagement from '../pages/Admin/IssuesManagement';
import RepairsManagement from '../pages/Admin/RepairsManagement';
import AdminReports from '../pages/Admin/AdminReports';
import VisitorManagement from '../pages/Admin/VisitorManagement';
import MaintenanceManagement from '../pages/Admin/MaintenanceManagement';
import FinanceDashboard from '../pages/Admin/FinanceDashboard';
import EventsManagement from '../pages/Admin/EventsManagement';
import VotingManagement from '../pages/Admin/VotingManagement';
import AdminProfile from '../pages/Admin/AdminProfile';
import ResidentsManagement from '../pages/Admin/ResidentsManagement';
import RegistrationRequests from '../pages/Admin/RegistrationRequests';
import StaffManagement from '../pages/Admin/StaffManagement';
import AdminPayments from '../pages/Admin/AdminPayments';

import StaffLayout from '../layouts/StaffLayout';
import StaffDashboard from '../pages/StaffDashboard';
import GateVisitors from '../pages/Staff/GateVisitors';
import AssignedTasks from '../pages/Staff/AssignedTasks';
import IncidentReports from '../pages/Staff/IncidentReports';
import ParkingObservations from '../pages/Staff/ParkingObservations';
import StaffProfile from '../pages/Staff/StaffProfile';

// Smart root redirect based on authenticated role
const RootRedirect = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'SecurityStaff') return <Navigate to="/staff" replace />;
  return <Navigate to="/resident" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/join-society" element={<JoinSociety />} />
      <Route path="/register-society" element={<RegisterSociety />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      <Route path="/" element={<RootRedirect />} />

      {/* Resident Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Resident']} />}>
        <Route path="/resident" element={<ResidentLayout />}>
          <Route index element={<ResidentDashboard />} />
          <Route path="complaints" element={<MyComplaints />} />
          <Route path="complaints/new" element={<CreateComplaint />} />
          <Route path="documents" element={<ResidentDocuments />} />
          <Route path="issues" element={<CommunityIssues />} />
          <Route path="visitors" element={<Visitors />} />
          <Route path="bills" element={<MaintenanceBills />} />
          <Route path="payments" element={<PaymentHistory />} />
          <Route path="finance-summary" element={<FinanceSummary />} />
          <Route path="accounts" element={<FinanceSummary />} />
          <Route path="transparency" element={<FinanceSummary />} />
          <Route path="events" element={<Events />} />
          <Route path="voting" element={<Voting />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<ResidentProfile />} />
        </Route>
      </Route>

      {/* Admin / Secretary Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="complaints" element={<ComplaintsManagement />} />
          <Route path="documents" element={<DocumentsManagement />} />
          <Route path="issues" element={<IssuesManagement />} />
          <Route path="repairs" element={<RepairsManagement />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="visitors" element={<VisitorManagement />} />
          <Route path="bills" element={<MaintenanceManagement />} />
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="events" element={<EventsManagement />} />
          <Route path="voting" element={<VotingManagement />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="residents" element={<ResidentsManagement />} />
          <Route path="registration-requests" element={<RegistrationRequests />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="payments" element={<AdminPayments />} />
        </Route>
      </Route>

      {/* Security / Staff Portal Routes */}
      <Route element={<ProtectedRoute allowedRoles={['SecurityStaff']} />}>
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<StaffDashboard />} />
          <Route path="visitors" element={<GateVisitors />} />
          <Route path="tasks" element={<AssignedTasks />} />
          <Route path="incidents" element={<IncidentReports />} />
          <Route path="parking" element={<ParkingObservations />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<StaffProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

export default AppRoutes;
