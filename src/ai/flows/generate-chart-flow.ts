
'use server';
/**
 * @fileOverview An AI flow for suggesting chart configurations based on textual data or descriptions.
 *
 * - suggestChart - A function that suggests a chart type and data mapping.
 * - SuggestChartInput - The input type for the suggestChart function.
 * - SuggestChartOutput - The return type for the suggestChart function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SuggestChartInputSchema = z.object({
  dataDescription: z.string().describe('A textual description of the data, or the data itself (e.g., as a simple CSV string or key-value pairs). Example: "Categories: A, B, C. Values: 10, 20, 15 for sales."'),
  goal: z.string().optional().describe('What the chart should represent or highlight (e.g., "compare sales across categories", "show trend over time").'),
});
export type SuggestChartInput = z.infer<typeof SuggestChartInputSchema>;

export const SuggestedChartConfigSchema = z.object({
  chartType: z.enum(['bar', 'line', 'pie', 'scatter', 'area']).describe('The suggested type of chart.'),
  dataMapping: z.string().describe("A natural language description of how to map the provided data to the chart's axes or segments (e.g., 'Use categories for X-axis and values for Y-axis', 'Each item name as a pie slice, with its count as the value')."),
  titleSuggestion: z.string().optional().describe('A suggested title for the chart.'),
  additionalNotes: z.string().optional().describe('Any other relevant notes or considerations for creating this chart.'),
});
export type SuggestedChartConfig = z.infer<typeof SuggestedChartConfigSchema>;

export const SuggestChartOutputSchema = z.object({
  suggestions: z.array(SuggestedChartConfigSchema).describe('An array of 1-2 chart suggestions.'),
  interpretation: z.string().optional().describe('How the AI interpreted the input data or description.'),
});
export type SuggestChartOutput = z.infer<typeof SuggestChartOutputSchema>;

export async function suggestChart(input: SuggestChartInput): Promise<SuggestChartOutput> {
  return suggestChartFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestChartPrompt',
  input: {schema: SuggestChartInputSchema},
  output: {schema: SuggestChartOutputSchema},
  prompt: `You are an expert data visualization assistant.
Your task is to analyze the provided data description and goal, then suggest suitable chart configurations.
Focus on common chart types like bar, line, pie, scatter, and area charts.

Data Description:
{{{dataDescription}}}

{{#if goal}}
Goal for the Chart: {{{goal}}}
{{/if}}

Based on the input:
1.  Briefly state your interpretation of the data if it's ambiguous.
2.  Suggest 1 or 2 appropriate chart types.
3.  For each chart type, describe the data mapping:
    *   For bar/line/scatter/area charts: Specify what data fields should be used for X-axis, Y-axis, and any series/grouping.
    *   For pie charts: Specify what data field represents categories (slices) and what field represents their values.
4.  Suggest a concise title for each chart.
5.  Add any brief additional notes if necessary (e.g., "A line chart is suitable if the X-axis represents time progression").

The output should be in JSON format according to the SuggestChartOutputSchema.
Ensure dataMapping clearly explains how to use the input data for the chart.
Example dataMapping for a bar chart: "Use 'productName' for the X-axis (categories) and 'unitsSold' for the Y-axis (values)."
Example dataMapping for a pie chart: "Each 'department' as a pie slice, with 'budgetAllocation' as the value for each slice."
`,
});

const suggestChartFlow = ai.defineFlow(
  {
    name: 'suggestChartFlow',
    inputSchema: SuggestChartInputSchema,
    outputSchema: SuggestChartOutputSchema,
  },
  async (input: SuggestChartInput) => {
    if (!input.dataDescription.trim()) {
      return { suggestions: [], interpretation: "Data description cannot be empty." };
    }

    const {output} = await prompt(input);
    if (!output || !output.suggestions) {
        return { suggestions: [], interpretation: "AI failed to provide chart suggestions."};
    }
    return output;
  }
);
