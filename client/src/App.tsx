import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

// USER PAGES
import Home from "./pages/Home";
import Handbook from "./pages/Handbook";
import NotFound from "./pages/NotFound";
import MyProjects from "./pages/MyProjects";
import Courses from "./pages/Courses";
import CoursesWatch from "./pages/CoursesWatch";
import MyProducts from "./pages/MyProducts";
import PostDetail from "./pages/PostDetail";
// import Register from "./pages/auth/Register.tsx";
// import Login from "./pages/auth/Login.tsx";
// import AccountSettings from "./pages/AccountSettings";

// ADMIN PAGES
import AdminLogin from "./admin/pages/AdminLogin";
import AdminLayout from "./admin/components/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import Account from "./admin/pages/Account";
import Messages from "./admin/pages/Messages";
import MessageDetail from "./admin/pages/MessageDetail.tsx";
import Posts from "./admin/pages/Posts";
import PostEditor from "./admin/pages/PostEditor";
import Gallery from "./admin/pages/Gallery.tsx";
import SettingCourses from "./admin/pages/SettingCourses.tsx";
import AdminNotFound from "./admin/pages/AdminNotFound";

// scroll animation
import useRevealOnScroll from "./hooks/useRevealOnScroll";

// ortak auth helper
import { getAccess, isJwtValid } from "./lib/api";

// token okuma + JWT geçerlilik kontrolü
function getAccessToken(): string | null {
  const token = getAccess();
  return token && isJwtValid(token) ? token : null;
}

// korumalı rota
function RequireAuth() {
  const token = getAccessToken();
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
            {/* public routers */}
            <Route path="/" element={<Home />} />
            <Route path="/handbook" element={<Handbook />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/watch/:id" element={<CoursesWatch />} />
            <Route path="/my-products" element={<MyProducts />} />
            <Route path="/post/:slug" element={<PostDetail />} />

            {/* user auth (şimdilik kapalıysa yorumda bırak) */}
            {/*
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route element={<RequireUser />}>
              <Route path="/account" element={<AccountSettings />} />
            </Route>
            */}

            {/* admin login (korumasız) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* admin protected routes */}
            <Route path="/admin" element={<RequireAuth />}>
              <Route element={<AdminLayout />}>
                {/* /admin */}
                <Route index element={<Dashboard />} />
                {/* /admin/account */}
                <Route path="account" element={<Account />} />
                {/* /admin/messages */}
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:id" element={<MessageDetail />} />
                {/* /admin/posts */}
                <Route path="posts" element={<Posts />} />
                <Route path="posts/new" element={<PostEditor />} />
                <Route path="posts/:id" element={<PostEditor />} />
                {/* /admin/courses */}
                <Route path="courses" element={<SettingCourses />} />
                {/* /admin/gallery */}
                <Route path="gallery" element={<Gallery />} />
                {/* admin özel 404 */}
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