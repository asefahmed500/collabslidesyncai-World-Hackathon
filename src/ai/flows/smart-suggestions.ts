'use server';

/**
 * @fileOverview Smart Suggestions AI flow for improving presentations.
 *
 * - getSmartSuggestions - A function that provides proactive tips to enhance presentations.
 * - SmartSuggestionsInput - The input type for the getSmartSuggestions function.
 * - SmartSuggestionsOutput - The return type for the getSmartSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartSuggestionsInputSchema = z.object({
  presentationContent: z
    .string()
    .describe('The content of the presentation, including slide text and structure.'),
  teamBrandGuidelines: z
    .string()
    .optional()
    .describe('Optional team branding guidelines for the presentation.'),
});
export type SmartSuggestionsInput = z.infer<typeof SmartSuggestionsInputSchema>;

const SmartSuggestionsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of smart suggestions to improve the presentation.'),
});
export type SmartSuggestionsOutput = z.infer<typeof SmartSuggestionsOutputSchema>;

export async function getSmartSuggestions(input: SmartSuggestionsInput): Promise<SmartSuggestionsOutput> {
  return smartSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartSuggestionsPrompt',
  input: {schema: SmartSuggestionsInputSchema},
  output: {schema: SmartSuggestionsOutputSchema},
  prompt: `You are an AI assistant that provides smart suggestions to improve presentations.

  Analyze the provided presentation content and suggest specific improvements in areas such as:
  - Strengthening the introduction
  - Reordering slides for better flow
  - Addressing potential accessibility issues
  - Identifying content gaps

  Consider the team's branding guidelines, if provided, when making suggestions.

  Presentation Content: {{{presentationContent}}}

  {{#if teamBrandGuidelines}}
  Team Branding Guidelines: {{{teamBrandGuidelines}}}
  {{/if}}

  Provide your suggestions in a concise, actionable format.
  `,
});

const smartSuggestionsFlow = ai.defineFlow(
  {
    name: 'smartSuggestionsFlow',
    inputSchema: SmartSuggestionsInputSchema,
    outputSchema: SmartSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
