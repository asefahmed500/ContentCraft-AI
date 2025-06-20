
"use client";

import { useSession } from "next-auth/react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star } from "lucide-react";
import type { User as NextAuthUser } from 'next-auth';

interface SessionUser extends NextAuthUser {
  id?: string;
  role?: string;
  totalXP?: number;
  level?: number;
  badges?: string[];
}

const UserXPDisplay = () => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return null;
  }

  const currentLevel = user.level || 1;
  const currentXP = user.totalXP || 0;
  
  const xpForNextLevel = currentLevel * 100; 
  const xpAtStartOfCurrentLevel = (currentLevel - 1) * 100;
  const xpInCurrentLevel = currentXP - xpAtStartOfCurrentLevel;
  
  const progressPercentage = xpForNextLevel > 0 ? Math.min((xpInCurrentLevel / xpForNextLevel) * 100, 100) : 0;

  return (
    <div className="p-2 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">Level: {currentLevel}</span>
        </div>
        <span className="text-muted-foreground">
          XP: {currentXP} / {xpAtStartOfCurrentLevel + xpForNextLevel}
        </span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      {user.badges && user.badges.length > 0 && (
        <div className="mt-2">
          <p className="font-medium text-xs mb-1">Badges:</p>
          <div className="flex flex-wrap gap-1">
            {user.badges.map((badge, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Star className="mr-1 h-3 w-3 text-yellow-400" />
                {badge}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {(!user.badges || user.badges.length === 0) && (
          <p className="text-xs text-muted-foreground italic mt-1">No badges earned yet.</p>
      )}
       <p className="text-xs text-muted-foreground mt-2 text-center">
        Unlock premium features by leveling up! (Coming Soon)
      </p>
    </div>
  );
};

export default UserXPDisplay;
