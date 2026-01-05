import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import { getAdminAccess } from "./lib/adminAuth";
import { isJwtValid } from "./lib/api";

// USER PAGES
import Home from "./pages/Home";
import Handbook from "./pages/Handbook";
import NotFound from "./pages/NotFound";
import MyProjects from "./pages/MyProjects";
import Courses from "./pages/Courses";
import CoursesWatch from "./pages/CoursesWatch";
import MyProducts from "./pages/MyProducts";
import PostDetail from "./pages/PostDetail";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";
import AccountSettings from "./pages/AccountSettings";

// ADMIN PAGES
import AdminLogin from "./admin/pages/AdminLogin";
import AdminLayout from "./admin/components/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import Account from "./admin/pages/Account";
import Messages from "./admin/pages/Messages";
import MessageDetail from "./admin/pages/MessageDetail";
import Posts from "./admin/pages/Posts";
import PostEditor from "./admin/pages/PostEditor";
import Gallery from "./admin/pages/Gallery";
import SettingCourses from "./admin/pages/SettingCourses";
import AdminNotFound from "./admin/pages/AdminNotFound";

// scroll animation
import useRevealOnScroll from "./hooks/useRevealOnScroll";

function getAdminAccessToken(): string | null {
  const token = getAdminAccess();
  return token && isJwtValid(token) ? token : null;
}

function RequireAdminAuth() {
  const token = getAdminAccessToken();
  if (!token) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

function App() {
  useRevealOnScroll();
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <Routes>
            {/* public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/handbook" element={<Handbook />} />
            <Route path="/my-projects" element={<MyProjects />} />
            {/* <Route path="/courses" element={<Courses />} /> */}
            {/* <Route path="/courses/watch/:id" element={<CoursesWatch />} /> */}
            <Route path="/my-products" element={<MyProducts />} />
            <Route path="/post/:slug" element={<PostDetail />} />

            {/* user auth */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            {/* user account (şimdilik açık; user-auth'ı sonra ayrı bağlayacağız) */}
            <Route path="/account" element={<AccountSettings />} />

            {/* admin login */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* admin protected */}
            <Route path="/admin" element={<RequireAdminAuth />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="account" element={<Account />} />
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:id" element={<MessageDetail />} />
                <Route path="posts" element={<Posts />} />
                <Route path="posts/new" element={<PostEditor />} />
                <Route path="posts/:id" element={<PostEditor />} />
                <Route path="courses" element={<SettingCourses />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="*" element={<AdminNotFound />} />
              </Route>
            </Route>

            {/* global 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
