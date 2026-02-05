import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Code, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiAvatarProps {
  type?: 'code' | 'super' | 'default';
  className?: string;
}

export function AiAvatar({ type = 'default', className }: AiAvatarProps) {
  const getAvatarConfig = () => {
    switch (type) {
      case 'code':
        return {
          icon: Code,
          bgClass: 'bg-gradient-to-br from-emerald-400 to-teal-500',
        };
      case 'super':
        return {
          icon: Bot,
          bgClass: 'bg-gradient-to-br from-blue-400 to-indigo-500',
        };
      default:
        return {
          icon: Sparkles,
          bgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
        };
    }
  };

  const { icon: Icon, bgClass } = getAvatarConfig();

  return (
    <Avatar className={cn('w-9 h-9', className)}>
      <AvatarFallback className={cn(bgClass, 'text-white')}>
        <Icon className="w-5 h-5" />
      </AvatarFallback>
    </Avatar>
  );
}
