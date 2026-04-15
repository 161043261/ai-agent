import withAuth from "@/hoc/with-auth";
import withLazy from "@/hoc/with-lazy";
import { lazy } from "react";
import { createBrowserRouter, redirect } from "react-router-dom";

const Login = withLazy(lazy(() => import("@/pages/login")));
const Register = withLazy(lazy(() => import("@/pages/register")));
const Menu = withAuth(withLazy(lazy(() => import("@/pages/menu"))));
const AiChat = withAuth(withLazy(lazy(() => import("@/pages/ai-chat"))));

const router = createBrowserRouter([
  {
    path: "/",
    loader: () => redirect("/login"),
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/menu",
    Component: Menu,
  },
  {
    path: "/ai-chat",
    Component: AiChat,
  },
]);

export default router;
