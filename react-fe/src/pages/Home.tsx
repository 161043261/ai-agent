import { useNavigate } from 'react-router-dom';
import { Code, Bot, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppFooter } from '@/components/AppFooter';

export function Home() {
  const navigate = useNavigate();

  const apps = [
    {
      id: 'code-pill',
      title: 'AI 编程魔丸',
      description: '智能编程助手，帮你解答代码问题，提供最佳实践',
      icon: Code,
      path: '/code-pill',
      gradient: 'from-emerald-400 to-teal-500',
      hoverGradient: 'group-hover:from-emerald-500 group-hover:to-teal-600',
    },
    {
      id: 'super-agent',
      title: 'AI 超级智能体',
      description: '全能型 AI 助手，解决各类专业问题',
      icon: Bot,
      path: '/super-agent',
      gradient: 'from-blue-400 to-indigo-500',
      hoverGradient: 'group-hover:from-blue-500 group-hover:to-indigo-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 to-white flex flex-col">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
      </div>

      {/* 主内容 */}
      <main className="flex-1 relative z-10">
        {/* Header */}
        <header className="pt-16 pb-12 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/80 rounded-full text-emerald-700 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI 智能应用平台</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            AI 超级智能体
          </h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            探索 AI 的无限可能，让智能助手为你服务
          </p>
          <div className="mt-6 h-1 w-24 mx-auto bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" />
        </header>

        {/* 应用卡片 */}
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-2 gap-6">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <Card
                  key={app.id}
                  className="group cursor-pointer border-0 shadow-lg shadow-emerald-100/50 hover:shadow-xl hover:shadow-emerald-200/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                  onClick={() => navigate(app.path)}
                >
                  <CardContent className="p-0">
                    <div className="p-6">
                      {/* 图标 */}
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.gradient} ${app.hoverGradient} flex items-center justify-center mb-5 transition-all duration-300 shadow-lg`}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>

                      {/* 标题和描述 */}
                      <h2 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors">
                        {app.title}
                      </h2>
                      <p className="text-gray-500 text-sm leading-relaxed mb-6">
                        {app.description}
                      </p>

                      {/* 按钮 */}
                      <Button
                        variant="ghost"
                        className="px-0 text-emerald-600 hover:text-emerald-700 hover:bg-transparent group/btn"
                      >
                        <span>立即体验</span>
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </div>

                    {/* 底部装饰线 */}
                    <div
                      className={`h-1 w-full bg-gradient-to-r ${app.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
