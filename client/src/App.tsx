// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Handbook from "./pages/Handbook";
import NotFound from "./pages/NotFound";
import MyProjects from "./pages/MyProjects";
import Courses from "./pages/Courses";
import MyProducts from "./pages/MyProducts";

import FirstGate from "./admin/FirstGate";
import SetupTempAccount from "./admin/SetupTempAccount";
import AdminLogin from "./admin/Login";
import AdminLayout from "./admin/Layout";
import ProtectedRoute from "./admin/ProtectedRoute";

import useRevealOnScroll from "./hooks/useRevealOnScroll";

function App() {
  useRevealOnScroll();
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/handbook" element={<Handbook />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/my-products" element={<MyProducts />} />

            <Route path="/admin/gate" element={<FirstGate />} />
            <Route path="/admin/setup" element={<SetupTempAccount />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
