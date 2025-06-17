'use server';
/**
 * @fileOverview AI flow for adjusting the tone of a given text (e.g., to formal or casual).
 *
 * - adjustTone - A function that adjusts the tone of text.
 * - AdjustToneInput - The input type for the adjustTone function.
 * - AdjustToneOutput - The return type for the adjustTone function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AdjustToneInputSchema = z.object({
  textToAdjust: z.string().describe('The text whose tone needs to be adjusted.'),
  targetTone: z
    .enum(['formal', 'casual', 'enthusiastic', 'neutral'])
    .describe('The desired tone for the text: formal, casual, enthusiastic, or neutral.'),
});
export type AdjustToneInput = z.infer<typeof AdjustToneInputSchema>;

export const AdjustToneOutputSchema = z.object({
  adjustedText: z.string().describe('The text with the adjusted tone.'),
});
export type AdjustToneOutput = z.infer<typeof AdjustToneOutputSchema>;

export async function adjustTone(input: AdjustToneInput): Promise<AdjustToneOutput> {
  return adjustToneFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustTonePrompt',
  input: {schema: AdjustToneInputSchema},
  output: {schema: AdjustToneOutputSchema},
  prompt: `You are an AI assistant skilled in linguistics and tone adjustment.
Your task is to rewrite the following text to adopt a '{{{targetTone}}}' tone.

Original Text:
{{{textToAdjust}}}

Please provide only the rewritten text with the adjusted tone.
Output the result in JSON format.`,
});

const adjustToneFlow = ai.defineFlow(
  {
    name: 'adjustToneFlow',
    inputSchema: AdjustToneInputSchema,
    outputSchema: AdjustToneOutputSchema,
  },
  async (input: AdjustToneInput) => {
    const {output} = await prompt(input);
    return output!;
  }
);
