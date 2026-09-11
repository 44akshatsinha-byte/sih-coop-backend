import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import AppShell from "./layouts/AppShell.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import CustomerHome from "./pages/CustomerHome.jsx";
import MatchesPage from "./pages/MatchesPage.jsx";
import GigDetailPage from "./pages/GigDetailPage.jsx";
import WorkerJobs from "./pages/WorkerJobs.jsx";
import WorkerProfile from "./pages/WorkerProfile.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import AdminForecast from "./pages/AdminForecast.jsx";
import AdminQueue from "./pages/AdminQueue.jsx";
import AdminFlags from "./pages/AdminFlags.jsx";

function Guard({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="p-6 text-teal-ink">…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (user?.role === "worker") return <WorkerJobs />;
  if (user?.role === "admin") return <AdminForecast />;
  return <CustomerHome />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/gigs/:id" element={<GigDetailPage />} />
        <Route path="/jobs" element={<WorkerJobs />} />
        <Route path="/profile" element={<WorkerProfile />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/admin/forecast" element={<Guard roles={["admin"]}><AdminForecast /></Guard>} />
        <Route path="/admin/queue" element={<Guard roles={["admin"]}><AdminQueue /></Guard>} />
        <Route path="/admin/flags" element={<Guard roles={["admin"]}><AdminFlags /></Guard>} />
      </Route>
    </Routes>
  );
}
