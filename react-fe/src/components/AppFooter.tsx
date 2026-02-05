import { Github, Heart } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="w-full py-6 px-4 border-t border-emerald-100 bg-white/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-emerald-600">
          <span className="text-sm">Made with</span>
          <Heart className="w-4 h-4 fill-emerald-500 text-emerald-500" />
          <span className="text-sm">by AI Agent Team</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors text-sm"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </div>
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} AI Agent Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
