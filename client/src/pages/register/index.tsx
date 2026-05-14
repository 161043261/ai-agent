import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useSetAtom } from "jotai";
import { setTokenAtom } from "@/stores/auth";
import { useRegister } from "@/hooks/queries";
import { toast } from "sonner";
import SettingsBar from "@/components/settings-bar";
import { UserPlus } from "lucide-react";

const registerSchema = z
  .object({
    email: z.string().email("auth.email_invalid"),
    password: z.string().min(6, "auth.password_required"),
    confirmPassword: z.string().min(1, "auth.confirm_password_required"),
  })
  // refine 自定义校验逻辑
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.password_mismatch",
    // path 绑定到 confirmPassword 字段
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useSetAtom(setTokenAtom);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(
      { email: data.email, password: data.password },
      {
        onSuccess: ({ code, token, message }) => {
          if (code === 1000 && token) {
            setToken(token);
            toast.success(t("auth.register_success"));
            navigate("/menu");
          } else {
            toast.error(message || t("auth.register_failed"));
          }
        },
        onError: (err) => {
          if (import.meta.env.DEV) console.error(err);
          toast.error(t("auth.register_failed"));
        },
      },
    );
  };

  return (
    <div className="bg-base-100 flex min-h-screen flex-col">
      <div className="absolute top-4 right-4 z-10">
        <SettingsBar />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="card border-base-200 bg-base-100 w-105 rounded-lg border shadow-none">
          <div className="pt-10 pb-2 text-center">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
                <UserPlus className="text-primary h-8 w-8" />
              </div>
            </div>
            <h2 className="text-base-content text-2xl font-normal">
              {t("auth.register")}
            </h2>
            <p className="text-base-content/70 mt-2 text-sm">
              {t("auth.register_for")}
            </p>
          </div>
          <div className="card-body px-10 pb-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="label-text text-base-content/70 text-xs font-medium"
                >
                  {t("auth.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder={t("auth.email_required")}
                  {...register("email")}
                  className="input input-bordered border-base-200 bg-base-100 focus:border-primary h-12 w-full rounded-md focus:outline-none"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">
                    {t(errors.email.message ?? "")}
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
                  className="input input-bordered border-base-200 bg-base-100 focus:border-primary h-12 w-full rounded-md focus:outline-none"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {t(errors.password.message ?? "")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="label-text text-base-content/70 text-xs font-medium"
                >
                  {t("auth.confirm_password")}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("auth.password_mismatch")}
                  {...register("confirmPassword")}
                  className="input input-bordered border-base-200 bg-base-100 focus:border-primary h-12 w-full rounded-md focus:outline-none"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {t(errors.confirmPassword.message ?? "")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Link
                  to="/login"
                  className="text-primary text-sm font-medium hover:brightness-90"
                >
                  {t("auth.has_account")}
                </Link>
                <button
                  type="submit"
                  className="btn bg-primary h-10 min-h-10 rounded-md border-none px-6 font-medium text-white hover:brightness-90"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending
                    ? t("auth.signing_up")
                    : t("auth.register")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
