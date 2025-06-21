import { config } from 'dotenv';
config();

import '@/ai/flows/brand-learning.ts';
import '@/ai/flows/agent-debate.ts';
import '@/ai/flows/content-generation.ts';
import '@/ai/flows/revise-content-flow.ts';
import '@/ai/flows/translate-content-flow.ts';
import '@/ai/flows/campaign-memory-flow.ts';
import '@/ai/flows/brand-audit-flow.ts';
import '@/ai/flows/content-strategy-flow.ts';
import '@/ai/flows/optimize-content-flow.ts';

// Admin Flows
import '@/ai/flows/admin/platform-insights.ts';
import '@/ai/flows/admin/user-audit.ts';
