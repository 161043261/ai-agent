import { isAuthenticatedAtom } from "@/stores/auth";
import { useAtomValue } from "jotai";
import { useEffect, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";

function withAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  return function (props: P) {
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

    return <WrappedComponent {...props} />;
  };
}

export default withAuth;
