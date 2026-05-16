import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar.js";
import Marketplace from "./pages/Marketplace.js";
import SkillDetail from "./pages/SkillDetail.js";
import Chat from "./pages/Chat.js";
import Studio from "./pages/Studio.js";
import Dashboard from "./pages/Dashboard.js";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/marketplace" replace />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/skills/:id" element={<SkillDetail />} />
          <Route path="/chat/:sessionId" element={<Chat />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}
