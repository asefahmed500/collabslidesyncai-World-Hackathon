'use server';
/**
 * @fileOverview AI flow for generating content like bullet points or rewriting existing content.
 *
 * - generateContent - A function that generates new content based on input.
 * - GenerateContentInput - The input type for the generateContent function.
 * - GenerateContentOutput - The return type for the generateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContentInputSchema = z.object({
  currentContent: z.string().optional().describe('Existing content to base generation on (e.g., for rewriting or summarizing into bullets).'),
  generationType: z
    .enum(['bullet_points_from_content', 'bullet_points_from_topic', 'rewrite_content', 'summarize_content'])
    .describe('The type of content to generate.'),
  topic: z.string().optional().describe('A specific topic to generate bullet points for, if generationType is "bullet_points_from_topic".'),
  instructions: z.string().optional().describe('Any specific instructions for the generation (e.g., number of bullet points, style of rewrite).'),
});
export type GenerateContentInput = z.infer<typeof GenerateContentInputSchema>;

const GenerateContentOutputSchema = z.object({
  generatedContent: z.string().describe('The newly generated content (can be a list of bullet points formatted as a string, or rewritten text).'),
  contentType: z.enum(['text', 'bullet_list_string']).describe('The nature of the generated content.'),
});
export type GenerateContentOutput = z.infer<typeof GenerateContentOutputSchema>;

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentOutput> {
  return generateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContentPrompt',
  input: {schema: GenerateContentInputSchema},
  output: {schema: GenerateContentOutputSchema},
  prompt: `You are an AI content generation assistant.
Your task is to generate content based on the following request:

Generation Type: {{{generationType}}}

{{#if currentContent}}
Current Content:
{{{currentContent}}}
{{/if}}

{{#if topic}}
Topic: {{{topic}}}
{{/if}}

{{#if instructions}}
Specific Instructions: {{{instructions}}}
{{/if}}

Based on the generation type:
- If 'bullet_points_from_content': Generate a concise list of bullet points summarizing the key information from the 'currentContent'. Return as a single string with each bullet point on a new line starting with '- '. Set contentType to 'bullet_list_string'.
- If 'bullet_points_from_topic': Generate a list of relevant bullet points about the given 'topic'. Return as a single string with each bullet point on a new line starting with '- '. Set contentType to 'bullet_list_string'.
- If 'rewrite_content': Rewrite the 'currentContent' to be different, potentially with a different angle or improved style, based on any 'instructions'. Return as text. Set contentType to 'text'.
- If 'summarize_content': Provide a concise summary of the 'currentContent'. Return as text. Set contentType to 'text'.

Ensure the output is in JSON format.`,
});

const generateContentFlow = ai.defineFlow(
  {
    name: 'generateContentFlow',
    inputSchema: GenerateContentInputSchema,
    outputSchema: GenerateContentOutputSchema,
  },
  async (input: GenerateContentInput) => {
    if (input.generationType === 'bullet_points_from_topic' && !input.topic) {
      throw new Error('Topic is required for generating bullet points from topic.');
    }
    if ((input.generationType === 'bullet_points_from_content' || input.generationType === 'rewrite_content' || input.generationType === 'summarize_content') && !input.currentContent) {
      throw new Error('Current content is required for this generation type.');
    }
    const {output} = await prompt(input);
    return output!;
  }
);
