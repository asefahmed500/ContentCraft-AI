import type { Agent, AgentRole } from '@/types/agent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, FileText, Smile, BarChartBig, Image as ImageIcon, Search, ShieldCheck, GitFork, HelpCircle } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface AgentAvatarProps {
  agent: Partial<Pick<Agent, 'name' | 'avatar'>> & { role: AgentRole | string }; // Allow string for flexibility
  size?: 'sm' | 'md' | 'lg';
}

const roleIcons: Record<AgentRole, React.ComponentType<LucideProps>> = {
  'Creative Director': Briefcase,
  'Content Writer': FileText,
  'Brand Persona': Smile,
  'Brand Specialist': Smile,
  'Analytics Strategist': BarChartBig,
  'Visual Content': ImageIcon,
  'SEO Expert': Search,
  'QA Advisor': ShieldCheck,
  'Orchestrator': GitFork,
};

export function AgentAvatar({ agent, size = 'md' }: AgentAvatarProps) {
  const IconComponent = roleIcons[agent.role as AgentRole] || HelpCircle;
  
  const avatarSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };
  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <div className="flex items-center space-x-3">
      <Avatar className={avatarSizeClasses[size]}>
        {agent.avatar ? (
          <AvatarImage src={agent.avatar} alt={agent.name || agent.role} data-ai-hint="robot avatar" />
        ) : null}
        <AvatarFallback className="bg-secondary">
          <IconComponent className={`${iconSizeClasses[size]} text-secondary-foreground`} />
        </AvatarFallback>
      </Avatar>
      {size !== 'sm' && (
        <div>
          <p className={`font-medium ${size === 'lg' ? 'text-base' : 'text-sm'}`}>{agent.name || agent.role}</p>
          <p className={`text-xs text-muted-foreground ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>{agent.role}</p>
        </div>
      )}
    </div>
  );
}
