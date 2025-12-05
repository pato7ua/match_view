import { RadioTower, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/icons';

type DashboardHeaderProps = {
  matchStatus: 'Live' | 'Paused' | 'Ended';
  simulationTime: number;
  children?: React.ReactNode;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function DashboardHeader({ matchStatus, simulationTime, children }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
      <div className="flex items-center gap-3">
        {children}
        <Logo className="h-8 w-8 text-primary" />
        <h1 className="text-lg font-semibold sm:text-xl md:text-2xl tracking-tight">
          Racing Orihuela Playas
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <Badge 
          variant={matchStatus === 'Live' ? 'default' : 'secondary'} 
          className="transition-all duration-300"
        >
          {matchStatus === 'Live' && <RadioTower className="mr-2 h-4 w-4 animate-pulse" />}
          {matchStatus === 'Ended' && <CheckCircle2 className="mr-2 h-4 w-4" />}
          {matchStatus}
        </Badge>
        <div className="font-mono text-xl md:text-2xl font-bold text-foreground/80 tabular-nums">
          {formatTime(simulationTime)}
        </div>
      </div>
    </header>
  );
}
