'use server';
/**
 * @fileOverview An AI agent that optimizes content based on a performance goal.
 *
 * - optimizeContent - A function that handles the content optimization process.
 * - OptimizeContentInput - The input type for the optimizeContent function.
 * - OptimizeContentOutput - The return type for the optimizeContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const OptimizeContentInputSchema = z.object({
  originalContent: z.string().describe('The original content to be optimized.'),
  contentType: z.string().describe('The type or format of the content (e.g., "blog post", "advertisement copy").'),
  optimizationGoal: z.string().describe('The specific performance goal for optimization (e.g., "Increase click-through rate", "Improve user engagement", "Boost conversion rate").'),
});
export type OptimizeContentInput = z.infer<typeof OptimizeContentInputSchema>;

export const OptimizeContentOutputSchema = z.object({
  predictedPerformance: z.object({
    metric: z.string().describe("The name of the metric being scored, based on the optimization goal."),
    score: z.number().min(0).max(100).describe("The predicted performance score (0-100) of the ORIGINAL content for the given metric."),
    justification: z.string().describe("A brief justification for the predicted score of the original content."),
  }),
  optimizedContent: z.string().describe('The optimized content after applying improvements based on the goal.'),
  explanation: z.string().describe('An explanation of the key changes made to the content and why they are expected to improve performance towards the optimization goal.'),
});
export type OptimizeContentOutput = z.infer<typeof OptimizeContentOutputSchema>;

export async function optimizeContent(input: OptimizeContentInput): Promise<OptimizeContentOutput> {
  return optimizeContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeContentPrompt',
  input: {schema: OptimizeContentInputSchema},
  output: {schema: OptimizeContentOutputSchema},
  prompt: `You are an expert Performance Marketing and Content Optimization agent. Your task is to analyze and then rewrite a piece of content to achieve a specific performance goal.

**Content Details:**
- **Content Type:** {{{contentType}}}
- **Optimization Goal:** {{{optimizationGoal}}}

**Original Content to Analyze and Optimize:**
---
{{{originalContent}}}
---

**Your Task (in two steps):**

**Step 1: Analyze the Original Content**
- First, critically evaluate the **original content** against the specified **optimization goal**.
- Assign a **predictedPerformance.score** from 0 to 100, where 100 means the original content is already perfectly optimized for the goal.
- Provide a brief **predictedPerformance.justification** for this score. For example, if the goal is 'Increase click-through rate' for an ad, you might say "The headline is not compelling and the call-to-action is weak."

**Step 2: Optimize the Content**
- Based on your analysis, rewrite the content to create the **optimizedContent**.
- The optimized content should be a direct, ready-to-use replacement for the original.
- Make targeted changes to improve the predicted performance. For example, if the goal is engagement, you might add a question or use more evocative language. If the goal is CTR, you might create a stronger call-to-action.
- Finally, provide a clear **explanation** of the changes you made and why you believe they will help achieve the optimization goal.

Your output must be a valid JSON object matching the defined schema.
`,
});

const optimizeContentFlow = ai.defineFlow(
  {
    name: 'optimizeContentFlow',
    inputSchema: OptimizeContentInputSchema,
    outputSchema: OptimizeContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
