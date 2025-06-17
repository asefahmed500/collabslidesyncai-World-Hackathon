'use server';
/**
 * @fileOverview AI flow for improving text based on various criteria like grammar, clarity, or professionalism.
 *
 * - improveText - A function that suggests improvements for a given text.
 * - ImproveTextInput - The input type for the improveText function.
 * - ImproveTextOutput - The return type for the improveText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ImproveTextInputSchema = z.object({
  textToImprove: z.string().describe('The text content to be improved.'),
  improvementType: z
    .enum(['grammar', 'clarity', 'professionalism', 'conciseness'])
    .describe('The type of improvement to apply: grammar, clarity, professionalism, or conciseness.'),
});
export type ImproveTextInput = z.infer<typeof ImproveTextInputSchema>;

export const ImproveTextOutputSchema = z.object({
  improvedText: z.string().describe('The suggested improved version of the text.'),
  explanation: z.string().optional().describe('An optional explanation of the changes made.'),
});
export type ImproveTextOutput = z.infer<typeof ImproveTextOutputSchema>;

export async function improveText(input: ImproveTextInput): Promise<ImproveTextOutput> {
  return improveTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'improveTextPrompt',
  input: {schema: ImproveTextInputSchema},
  output: {schema: ImproveTextOutputSchema},
  prompt: `You are an AI assistant specialized in text enhancement.
Review the following text and improve it based on the specified improvement type: {{{improvementType}}}.

Original Text:
{{{textToImprove}}}

Your task is to provide an improved version of the text.
If the improvement type is 'grammar', focus on correcting grammatical errors, punctuation, and spelling.
If the improvement type is 'clarity', focus on making the text easier to understand and more direct.
If the improvement type is 'professionalism', focus on making the text sound more formal and suitable for a business context.
If the improvement type is 'conciseness', focus on making the text shorter and more to the point without losing essential meaning.

Provide the improved text. Optionally, you can provide a brief explanation of the key changes.
Output the result in JSON format.`,
});

const improveTextFlow = ai.defineFlow(
  {
    name: 'improveTextFlow',
    inputSchema: ImproveTextInputSchema,
    outputSchema: ImproveTextOutputSchema,
  },
  async (input: ImproveTextInput) => {
    const {output} = await prompt(input);
    return output!;
  }
);
