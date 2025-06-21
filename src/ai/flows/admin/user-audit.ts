'use server';
/**
 * @fileOverview An AI agent that audits user behavior for potential risks.
 *
 * - auditUserBehavior - A function that analyzes user activity and returns a risk assessment.
 * - UserAuditInput - The input type for the auditUserBehavior function.
 * - UserAuditOutput - The return type for the auditUserBehavior function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const UserAuditInputSchema = z.object({
  userName: z.string().describe("The user's name."),
  userRole: z.enum(['viewer', 'editor', 'admin']).describe("The user's role."),
  totalXP: z.number().describe('The total experience points the user has accumulated.'),
  campaignCount: z.number().describe('The total number of campaigns created by the user.'),
  daysSinceJoined: z.number().describe('The number of days since the user registered.'),
});
export type UserAuditInput = z.infer<typeof UserAuditInputSchema>;

export const UserAuditOutputSchema = z.object({
  riskScore: z.number().min(0).max(100).describe('A risk score from 0 (no risk) to 100 (high risk).'),
  justification: z.string().describe('A detailed explanation for the assigned risk score, referencing the input data.'),
  recommendation: z.enum(['No action needed', 'Monitor user activity', 'Recommend role review', 'Flag for immediate review']).describe('A recommended course of action for the administrator.'),
});
export type UserAuditOutput = z.infer<typeof UserAuditOutputSchema>;

export async function auditUserBehavior(input: UserAuditInput): Promise<UserAuditOutput> {
  return userAuditFlow(input);
}

const prompt = ai.definePrompt({
  name: 'userAuditPrompt',
  input: {schema: UserAuditInputSchema},
  output: {schema: UserAuditOutputSchema},
  prompt: `You are a sophisticated User Behavior Auditor for an AI content platform. Your job is to assess a user's activity for suspicious patterns and provide a risk score and recommendation.

**User Data to Audit:**
- User Name: {{{userName}}}
- Role: {{{userRole}}}
- Days Since Joined: {{{daysSinceJoined}}}
- Total Campaigns Created: {{{campaignCount}}}
- Total XP Gained: {{{totalXP}}}

**Auditing Logic & Risk Scoring:**
- **Low Risk (0-30):** Normal activity. User is exploring the platform, creating a reasonable number of campaigns relative to their tenure. For example, a user who joined 30 days ago with 10-15 campaigns is normal. XP gain is consistent with campaign creation (approx. 50-100 XP per campaign action).
- **Moderate Risk (31-70):** Some unusual patterns. This could include a very high number of campaigns created in a short time (e.g., 20+ campaigns in a single day, suggesting spam or automated activity), or unusually high XP gain that doesn't match campaign activity (e.g., 2000 XP with only 1 campaign, suggesting potential gaming of the system).
- **High Risk (71-100):** Clear red flags. For example, a user who joined today has created 50 campaigns, or has gained thousands of XP with zero campaigns. A user with the 'viewer' role who has created campaigns is also a high-risk anomaly. Admins should be alerted immediately for high-risk cases.

**Your Task:**
1.  Calculate a **riskScore** based on the provided logic. Be analytical.
2.  Write a clear **justification** explaining your score. Connect the data points logically (e.g., "The user joined {{daysSinceJoined}} days ago and has already created {{campaignCount}} campaigns. This rate of creation is unusually high and suggests potential automated activity, warranting a moderate risk score.").
3.  Provide a single, actionable **recommendation** from the allowed enum values based on the risk level.

Your output must be a valid JSON object matching the defined schema.
`,
});

const userAuditFlow = ai.defineFlow(
  {
    name: 'userAuditFlow',
    inputSchema: UserAuditInputSchema,
    outputSchema: UserAuditOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
