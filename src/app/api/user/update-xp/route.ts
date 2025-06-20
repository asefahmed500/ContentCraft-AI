
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import clientPromise from '@/lib/mongodb';
import { ObjectId, type MongoClient, type Db } from 'mongodb';
import type { User as NextAuthUser } from 'next-auth';

interface SessionUser extends NextAuthUser {
  id?: string;
  _id?: ObjectId | string; // id from token is string, _id from DB is ObjectId
  role?: string;
  totalXP?: number;
  level?: number;
  badges?: string[];
}

// Basic level calculation: 100 XP per level.
const calculateLevel = (xp: number): { level: number; xpForNextLevel: number; xpInCurrentLevel: number } => {
  if (xp < 0) xp = 0;
  const level = Math.floor(xp / 100) + 1;
  const xpForThisLevel = (level -1) * 100;
  const xpForNext = level * 100;
  const xpInCurrent = xp - xpForThisLevel;
  return { level, xpForNextLevel: xpForNext, xpInCurrentLevel: xpInCurrent };
};

// Mock badges for level ups - in a real system, these would be more defined
const levelBadges: Record<number, string> = {
  2: "Novice Creator",
  3: "Content Crafter",
  5: "Strategy Ace",
  7: "Idea Veteran",
  10: "ContentCraft Master",
};


export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id as string;

    const body = await request.json();
    const { xpGained } = body;

    if (typeof xpGained !== 'number' || xpGained <= 0) {
      return NextResponse.json({ error: 'Invalid xpGained value.' }, { status: 400 });
    }

    const client: MongoClient = await clientPromise;
    const db: Db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const usersCollection = db.collection<SessionUser>('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const oldLevel = user.level || 1;
    const currentTotalXP = (user.totalXP || 0) + xpGained;
    const { level: newLevel } = calculateLevel(currentTotalXP);
    
    const updatedBadges = user.badges || [];
    let leveledUp = false;

    if (newLevel > oldLevel) {
      leveledUp = true;
      // Add new badges if applicable
      for (let i = oldLevel + 1; i <= newLevel; i++) {
        if (levelBadges[i] && !updatedBadges.includes(levelBadges[i])) {
          updatedBadges.push(levelBadges[i]);
        }
      }
    }
    
    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          totalXP: currentTotalXP, 
          level: newLevel,
          badges: updatedBadges,
          updatedAt: new Date(),
        } 
      }
    );

    if (updateResult.modifiedCount === 0) {
      // This might happen if values didn't actually change, or concurrent update.
      // For XP, it should always modify if XP is gained.
      console.warn(`XP update for user ${userId} resulted in no modification. XP Gained: ${xpGained}`);
    }

    const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!updatedUser) {
         return NextResponse.json({ error: 'Failed to retrieve updated user profile.' }, { status: 500 });
    }


    return NextResponse.json({ 
      message: 'XP updated successfully.',
      totalXP: updatedUser.totalXP,
      level: updatedUser.level,
      badges: updatedUser.badges,
      leveledUp: leveledUp,
      gainedBadges: leveledUp ? updatedBadges.filter(b => !(user.badges || []).includes(b)) : []
    }, { status: 200 });

  } catch (error) {
    console.error("Update XP API Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to update XP.', details: errorMessage }, { status: 500 });
  }
}
