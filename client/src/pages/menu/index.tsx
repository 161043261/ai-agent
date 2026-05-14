import SettingsBar from "@/components/settings-bar";
import { setTokenAtom } from "@/stores/auth";
import { useSetAtom } from "jotai";
import { LogOut, MessageSquare, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function Menu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useSetAtom(setTokenAtom);

  const handleLogout = () => {
    setToken(null);
    toast.success(t("auth.logout_success"));
    navigate("/login");
  };

  return (
    <div className="bg-base-100 flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-base-200 bg-base-100 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <Sparkles className="text-primary h-5 w-5" />
            </div>
            <h1 className="text-base-content text-xl font-normal">
              {t("menu.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <SettingsBar />
            <div className="bg-base-300 mx-2 h-6 w-px" />
            <button
              className="btn btn-ghost text-base-content/70 hover:bg-base-200 gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {t("auth.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Welcome Section */}
          <div className="mb-12 text-center">
            <h2 className="text-base-content mb-4 text-4xl font-normal">
              {t("menu.welcome")}
            </h2>
            <p className="text-base-content/70 text-lg">
              {t("menu.select_app")}
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* AI Chat Card */}
            <div
              className="card group border-base-200 bg-base-100 cursor-pointer border transition-all duration-200 hover:border-green-500 hover:shadow-lg"
              onClick={() => navigate("/ai-chat")}
            >
              <div className="card-body p-8">
                <div className="flex items-start gap-5">
                  <div className="bg-primary/10 group-hover:bg-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors">
                    <MessageSquare className="text-primary h-7 w-7 transition-colors group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="text-base-content group-hover:text-primary mb-2 text-lg font-medium transition-colors">
                      {t("menu.ai_chat")}
                    </h3>
                    <p className="text-base-content/70 text-sm leading-relaxed">
                      {t("menu.ai_chat_desc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon Card */}
            <div className="card border-base-200 bg-base-100 border opacity-60">
              <div className="card-body p-8">
                <div className="flex items-start gap-5">
                  <div className="bg-base-200 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl">
                    <span className="text-base-content/70 text-2xl">+</span>
                  </div>
                  <div>
                    <h3 className="text-base-content/70 mb-2 text-lg font-medium">
                      {t("menu.more_features")}
                    </h3>
                    <p className="text-base-content/70 text-sm leading-relaxed">
                      {t("menu.coming_soon")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-base-200 bg-base-100 border-t py-4">
        <div className="text-base-content/70 mx-auto flex max-w-7xl items-center justify-between px-6 text-sm">
          <span>
            © {new Date().getFullYear()} {t("menu.title")}
          </span>
          <div className="flex gap-6">
            <span className="hover:text-base-content cursor-pointer">
              {t("menu.privacy_policy")}
            </span>
            <span className="hover:text-base-content cursor-pointer">
              {t("menu.terms_of_service")}
            </span>
            <span className="hover:text-base-content cursor-pointer">
              {t("menu.help")}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Menu;
