import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Demo from './pages/Demo.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Impact from './pages/Impact.jsx';
import SignUp from './pages/SignUp.jsx';
import Login from './pages/Login.jsx';
import ReportIssue from './pages/ReportIssue.jsx';
import MyReports from './pages/MyReports.jsx';
import AdminOrgAccounts from './pages/AdminOrgAccounts.jsx';
import OrgDashboard from './pages/OrgDashboard.jsx';
import OrgSignUp from './pages/OrgSignUp.jsx';
import PendingVerification from './pages/PendingVerification.jsx';
import IssueFeed from './pages/IssueFeed.jsx';

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup/university" element={<OrgSignUp />} />
          <Route path="/signup/industry" element={<OrgSignUp />} />
          <Route path="/signup/organization" element={<OrgSignUp />} />
          <Route path="/pending-verification" element={<PendingVerification />} />
          <Route path="/feed" element={<IssueFeed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route path="/org-dashboard" element={<OrgDashboard />} />
          <Route path="/admin/org-accounts" element={<AdminOrgAccounts />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}

export default App;
