import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPipeline from "@/pages/DashboardPipeline";
import DigestPage from "@/pages/DigestPage";
import StatsPage from "@/pages/StatsPage";
import TeamtailorPage from "@/pages/TeamtailorPage";
import Sidebar from "@/components/Sidebar";

function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-base flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-coral border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (user === false) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-surface-base">
            <Sidebar />
            <main className="ml-64 p-8 min-h-screen">
                <Outlet />
            </main>
        </div>
    );
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen bg-surface-base flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-coral border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    if (user && user !== false) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<DashboardPipeline />} />
                        <Route path="/dashboard/digest" element={<DigestPage />} />
                        <Route path="/dashboard/stats" element={<StatsPage />} />
                        <Route path="/dashboard/teamtailor" element={<TeamtailorPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
