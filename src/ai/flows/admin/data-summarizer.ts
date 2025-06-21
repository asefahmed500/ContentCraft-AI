'use server';
/**
 * @fileOverview An AI agent that summarizes datasets for export.
 *
 * - summarizeDataForExport - A function that creates a natural language summary of dataset statistics.
 * - DataSummaryInput - The input type for the summarizeDataForExport function.
 * - DataSummaryOutput - The return type for the summarizeDataForExport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const DataSummaryInputSchema = z.object({
  dataType: z.enum(['Users', 'Campaigns', 'Feedback Logs']).describe('The type of data being exported.'),
  totalRecords: z.number().int().describe('The total number of records in the dataset.'),
  dateRange: z.object({
    from: z.string().describe('The start date of the data range in ISO format.'),
    to: z.string().describe('The end date of the data range in ISO format.'),
  }).optional().describe('The date range of the records, if applicable.'),
  additionalStats: z.record(z.string(), z.any()).optional().describe('A key-value map of additional relevant statistics about the dataset. E.g., {"Admin Users": 10, "Published Campaigns": 50}.'),
});
export type DataSummaryInput = z.infer<typeof DataSummaryInputSchema>;

export const DataSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, one-paragraph natural language summary of the dataset to be exported. It should be suitable for including in a file header or report cover page.'),
});
export type DataSummaryOutput = z.infer<typeof DataSummaryOutputSchema>;

export async function summarizeDataForExport(input: DataSummaryInput): Promise<DataSummaryOutput> {
  return dataSummarizerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dataSummarizerPrompt',
  input: {schema: DataSummaryInputSchema},
  output: {schema: DataSummaryOutputSchema},
  prompt: `You are a Data Analyst AI. Your task is to write a concise, human-readable summary for a data export.

**Dataset Details:**
- Data Type: {{{dataType}}}
- Total Records: {{{totalRecords}}}
{{#if dateRange}}
- Date Range: From {{{dateRange.from}}} to {{{dateRange.to}}}
{{/if}}
{{#if additionalStats}}
- Additional Statistics:
  {{#each additionalStats}}
  - {{@key}}: {{{this}}}
  {{/each}}
{{/if}}

**Your Task:**
Write a single-paragraph **summary** that describes this dataset. The tone should be professional and informative. Start by stating the data type and total record count. Then, incorporate any additional stats or date ranges naturally into the text.

**Example for Campaigns:**
"This data export contains a total of 152 campaigns. The data includes records for campaigns with a status of 'Published' (50), 'Archived' (30), and 'Draft' (72). This information can be used for analyzing campaign creation trends and completion rates."

**Example for Users:**
"This data export contains a total of 850 user records. The dataset includes 12 users with the 'admin' role and 838 with the 'editor' role. The data is useful for understanding the overall user base composition."

Your output must be a valid JSON object matching the defined schema.
`,
});

const dataSummarizerFlow = ai.defineFlow(
  {
    name: 'dataSummarizerFlow',
    inputSchema: DataSummaryInputSchema,
    outputSchema: DataSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
