'use server';

/**
 * @fileOverview An AI flow for suggesting professional-looking layouts for slides, applying team branding, and ensuring smart spacing and color harmony.
 *
 * - suggestDesignLayout - A function that handles the slide design layout suggestion process.
 * - SuggestDesignLayoutInput - The input type for the suggestDesignLayout function.
 * - SuggestDesignLayoutOutput - The return type for the suggestDesignLayout function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDesignLayoutInputSchema = z.object({
  slideContent: z
    .string()
    .describe('The text content of the slide to analyze for design suggestions.'),
  teamBrandColors: z
    .string()
    .describe('The team brand colors, as a comma-separated list of hex codes.'),
  teamBrandFonts: z
    .string()
    .describe('The team brand fonts, as a comma-separated list of font names.'),
});
export type SuggestDesignLayoutInput = z.infer<typeof SuggestDesignLayoutInputSchema>;

const SuggestDesignLayoutOutputSchema = z.object({
  layoutSuggestions: z
    .array(z.string())
    .describe('An array of suggested slide layouts based on the content.'),
  colorSchemeSuggestions: z
    .array(z.string())
    .describe('An array of suggested color schemes to use for the slide.'),
  spacingRecommendations: z
    .string()
    .describe('Recommendations for spacing and alignment of elements on the slide.'),
});
export type SuggestDesignLayoutOutput = z.infer<typeof SuggestDesignLayoutOutputSchema>;

export async function suggestDesignLayout(input: SuggestDesignLayoutInput): Promise<SuggestDesignLayoutOutput> {
  return suggestDesignLayoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDesignLayoutPrompt',
  input: {schema: SuggestDesignLayoutInputSchema},
  output: {schema: SuggestDesignLayoutOutputSchema},
  prompt: `You are an AI design assistant that helps users create visually appealing slides.

You will analyze the content of the slide and suggest professional-looking layouts, automatically applying the team's branding (colors, fonts) and ensuring smart spacing and color harmony.

Slide Content: {{{slideContent}}}
Team Brand Colors: {{{teamBrandColors}}}
Team Brand Fonts: {{{teamBrandFonts}}}

Based on the above information, provide layout suggestions, color scheme suggestions and spacing recommendations for the slide.

Ensure that the layout suggestions are suitable for presentation slides, that the suggested color schemes complement the team branding and the content, and that the spacing recommendations promote readability and visual appeal.

Please provide the output in JSON format.`,
});

const suggestDesignLayoutFlow = ai.defineFlow(
  {
    name: 'suggestDesignLayoutFlow',
    inputSchema: SuggestDesignLayoutInputSchema,
    outputSchema: SuggestDesignLayoutOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
