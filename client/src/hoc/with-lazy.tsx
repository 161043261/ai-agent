import { Loader2 } from "lucide-react";
import { Suspense, type ComponentType, type LazyExoticComponent } from "react";

function withLazy<P extends object>(
  LazyComponent: LazyExoticComponent<ComponentType<P>>,
) {
  return function (props: P) {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
          </div>
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

export default withLazy;
