import { BatteryFull, BatteryMedium, BatteryLow, BatteryWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

type BatteryIndicatorProps = {
  level: number;
};

export default function BatteryIndicator({ level }: BatteryIndicatorProps) {
  if (level > 75) {
    return <BatteryFull className="w-6 h-6 text-green-500" />;
  }
  if (level > 40) {
    return <BatteryMedium className="w-6 h-6 text-yellow-500" />;
  }
  if (level > 10) {
    return <BatteryLow className="w-6 h-6 text-orange-500" />;
  }
  return <BatteryWarning className="w-6 h-6 text-destructive" />;
}
