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
// import Auth from "./pages/Auth";
import Register from "./pages/auth/Register.tsx";
import Login from "./pages/auth/Login.tsx";
import AccountSettings from "./pages/AccountSettings";

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

// scroorl animation
import useRevealOnScroll from "./hooks/useRevealOnScroll";

function getAccessToken(): string | null {
  return localStorage.getItem("access") || sessionStorage.getItem("access");
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
            <Route path="/register" element={<Register />}/>
            <Route path="/login" element={<Login />}/>
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/post/:slug" element={<PostDetail />} />
            {/* admin routers */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<RequireAuth />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/account" element={<Account />} />
                <Route path="/admin/messages" element={<Messages />} />
                <Route path="/admin/messages/:id" element={<MessageDetail />} />
                <Route path="/admin/posts" element={<Posts />} />
                <Route path="/admin/posts/new" element={<PostEditor />} />
                <Route path="/admin/courses" element={<SettingCourses />} />
                <Route path="/admin/posts/:id" element={<PostEditor />} />
                <Route path="/admin/gallery" element={<Gallery />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
            <Route path="/admin/*" element={<AdminNotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
