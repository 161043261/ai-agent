import { useLogin } from "@/hooks/queries";
import SettingsBar from "@/components/settings-bar";
import { setTokenAtom } from "@/stores/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSetAtom } from "jotai";
import { MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import z from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "auth.username_required"),
  password: z.string().min(6, "auth.password_required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useSetAtom(setTokenAtom);
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(
      { username: data.username, password: data.password },
      {
        onSuccess: ({ code, token, message }) => {
          if (code === 1000 && token) {
            setToken(token);
            toast.success(t("auth.login_success"));
            navigate("/menu");
          } else {
            toast.error(message || t("auth.login_failed"));
          }
        },
        onError: (err) => {
          if (import.meta.env.DEV) console.error(err);
          toast.error(t("auth.login_failed"));
        },
      },
    );
  };

  return (
    <div className="bg-base-100 flex min-h-screen flex-col">
      {/* Settings Bar - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <SettingsBar />
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="card border-base-200 bg-base-100 w-105 rounded-lg border shadow-none">
          <div className="pt-10 pb-2 text-center">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
                <MessageSquare className="text-primary h-8 w-8" />
              </div>
            </div>
            <h2 className="text-base-content text-2xl font-normal">
              {t("auth.login")}
            </h2>
            <p className="text-base-content/70 mt-2 text-sm">
              {t("auth.continue_with")}
            </p>
          </div>
          <div className="card-body px-10 pb-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="label-text text-base-content/70 text-xs font-medium"
                >
                  {t("auth.username")}
                </label>
                <input
                  id="username"
                  placeholder={t("auth.username_required")}
                  {...register("username")}
                  className="input input-bordered border-base-200 bg-base-100 focus:border-primary h-12 w-full rounded-md transition-colors focus:outline-none"
                />
                {errors.username && (
                  <p className="text-sm text-red-500">
                    {t(errors.username.message || "")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="label-text text-base-content/70 text-xs font-medium"
                >
                  {t("auth.password")}
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder={t("auth.password_required")}
                  {...register("password")}
                  className="input input-bordered border-base-200 bg-base-100 focus:border-primary h-12 w-full rounded-md transition-colors focus:outline-none"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {t(errors.password.message || "")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Link
                  to="/register"
                  className="text-primary text-sm font-medium hover:brightness-90"
                >
                  {t("auth.no_account")}
                </Link>
                <button
                  type="submit"
                  className="btn bg-primary h-10 min-h-10 rounded-md border-none px-6 font-medium text-white transition-colors hover:brightness-90"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending
                    ? t("auth.signing_in")
                    : t("common.next")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
