import { isAuthenticatedAtom } from "@/stores/auth";
import { useAtomValue } from "jotai";
import { useEffect, type PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";

function ProtectedRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  // It's recommended to avoid using this component in favor of useNavigate
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
