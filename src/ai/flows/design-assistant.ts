
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
    .describe('A textual representation of the slide content (e.g., "Title: Quarterly Review\n- Bullet 1: Sales up\n[IMAGE: Growth Chart]").'),
  teamBrandColors: z
    .string()
    .optional()
    .describe('The team brand colors, as a comma-separated list of hex codes (e.g., "#FF0000,#00FF00").'),
  teamBrandFonts: z
    .string()
    .optional()
    .describe('The team brand fonts, as a comma-separated list of font names (e.g., "Arial,Space Grotesk").'),
});
export type SuggestDesignLayoutInput = z.infer<typeof SuggestDesignLayoutInputSchema>;

const SuggestDesignLayoutOutputSchema = z.object({
  layoutSuggestions: z
    .array(z.string())
    .describe('An array of 2-3 distinct layout suggestions, described textually (e.g., "Classic title and content layout", "Two-column layout with image on left, text on right").'),
  colorSchemeSuggestions: z
    .array(z.string())
    .describe('An array of 2-3 color palette suggestions (e.g., "Primary: #003366, Accent: #FF9900, Background: #F0F0F0"). These should harmonize with team brand colors if provided.'),
  spacingRecommendations: z
    .string()
    .describe('General recommendations for spacing, alignment, and visual hierarchy to improve readability and appeal, considering the slide content.'),
  fontRecommendations: z
    .string()
    .optional()
    .describe('Suggestions for font usage (e.g., headings, body text) that align with team brand fonts if provided, and improve legibility.')
});
export type SuggestDesignLayoutOutput = z.infer<typeof SuggestDesignLayoutOutputSchema>;

export async function suggestDesignLayout(input: SuggestDesignLayoutInput): Promise<SuggestDesignLayoutOutput> {
  return suggestDesignLayoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDesignLayoutPrompt',
  input: {schema: SuggestDesignLayoutInputSchema},
  output: {schema: SuggestDesignLayoutOutputSchema},
  prompt: `You are an expert AI Design Assistant for presentations. Your goal is to help users create professional, visually appealing, and effective slides.

Analyze the provided slide content and team branding information to offer actionable design suggestions.

Slide Content:
{{{slideContent}}}

{{#if teamBrandColors}}
Team Brand Colors (to consider for harmony): {{{teamBrandColors}}}
{{/if}}

{{#if teamBrandFonts}}
Team Brand Fonts (to consider for usage): {{{teamBrandFonts}}}
{{/if}}

Based on the above:
1.  **Layout Suggestions:** Provide 2-3 distinct layout ideas suitable for the given slide content. Describe them clearly (e.g., "Header with two content columns below", "Full-bleed image with text overlay").
2.  **Color Scheme Suggestions:** Offer 2-3 harmonious color palettes. If team brand colors are provided, suggest schemes that complement or correctly utilize them. Specify colors for primary elements, accents, and backgrounds (e.g., "Palette 1: Main Text: #333, Accent: {{{teamBrandColors}}}, Background: #FFF").
3.  **Spacing & Alignment Recommendations:** Give general advice on how to arrange elements for better visual flow, balance, and readability. Consider concepts like proximity, white space, and alignment.
4.  **Font Recommendations:** If team brand fonts are provided, suggest how to use them for different text elements (headings, body, captions). Otherwise, suggest standard professional font pairings.

Focus on clarity, modern design principles, and ensuring the suggestions are practical for a presentation slide context.
Please provide the output strictly in the specified JSON format.`,
});

const suggestDesignLayoutFlow = ai.defineFlow(
  {
    name: 'suggestDesignLayoutFlow',
    inputSchema: SuggestDesignLayoutInputSchema,
    outputSchema: SuggestDesignLayoutOutputSchema,
  },
  async input => {
    // Basic validation, more can be added
    if (!input.slideContent.trim()) {
      return {
        layoutSuggestions: ["Content is empty. Cannot provide specific layout suggestions without content."],
        colorSchemeSuggestions: [],
        spacingRecommendations: "Ensure content is added to the slide for design analysis.",
        fontRecommendations: "Specify fonts if you have branding guidelines."
      };
    }
    const {output} = await prompt(input);
    return output!;
  }
);

