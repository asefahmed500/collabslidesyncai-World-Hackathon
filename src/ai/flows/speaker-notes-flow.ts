'use server';
/**
 * @fileOverview AI flow for generating speaker notes based on the content of a presentation slide.
 *
 * - generateSpeakerNotes - A function that creates speaker notes for a slide.
 * - GenerateSpeakerNotesInput - The input type for the generateSpeakerNotes function.
 * - GenerateSpeakerNotesOutput - The return type for the generateSpeakerNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSpeakerNotesInputSchema = z.object({
  slideContent: z.string().describe('The combined text content from all elements on the slide.'),
  presentationContext: z.string().optional().describe('Optional broader context about the presentation (e.g., audience, overall topic) to help tailor notes.'),
});
export type GenerateSpeakerNotesInput = z.infer<typeof GenerateSpeakerNotesInputSchema>;

const GenerateSpeakerNotesOutputSchema = z.object({
  speakerNotes: z.string().describe('The generated speaker notes for the slide, formatted as a single string. Bullet points should start with "- ".'),
});
export type GenerateSpeakerNotesOutput = z.infer<typeof GenerateSpeakerNotesOutputSchema>;

export async function generateSpeakerNotes(input: GenerateSpeakerNotesInput): Promise<GenerateSpeakerNotesOutput> {
  return generateSpeakerNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSpeakerNotesPrompt',
  input: {schema: GenerateSpeakerNotesInputSchema},
  output: {schema: GenerateSpeakerNotesOutputSchema},
  prompt: `You are an AI assistant that excels at creating concise and helpful speaker notes for presentation slides.
Based on the following slide content, generate speaker notes. The notes should highlight key talking points, provide additional details not explicitly on the slide, or suggest how to engage the audience.

Slide Content:
{{{slideContent}}}

{{#if presentationContext}}
Presentation Context:
{{{presentationContext}}}
{{/if}}

Generate speaker notes that are clear, actionable, and directly relevant to the slide content. If appropriate, use bullet points (starting with "- ") for structure.
Output the result in JSON format.`,
});

const generateSpeakerNotesFlow = ai.defineFlow(
  {
    name: 'generateSpeakerNotesFlow',
    inputSchema: GenerateSpeakerNotesInputSchema,
    outputSchema: GenerateSpeakerNotesOutputSchema,
  },
  async (input: GenerateSpeakerNotesInput) => {
    if (!input.slideContent.trim()) {
        return { speakerNotes: "Slide content is empty. Cannot generate speaker notes." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
