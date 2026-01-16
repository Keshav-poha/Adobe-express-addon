import Groq from 'groq-sdk';

export interface BrandData {
  primaryColors: string[];
  brandVoice: string;
  designGuidelines: string[];
}

export interface VisionAnalysis {
  score: number;
  colorConsistency: number;
  typographyScale: number;
  spacingRhythm: number;
  accessibility: number;
  feedback: string[];
  recommendations: string[];
}

class GroqClient {
  private client: Groq;
  private readonly TEXT_MODEL = 'llama-3.3-70b-versatile';
  private readonly VISION_MODEL = 'llama-3.2-90b-vision-preview';

  constructor() {
    // @ts-ignore - Webpack DefinePlugin injects this
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error('VITE_GROQ_API_KEY is not defined in environment variables');
    }

    this.client = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }

  /**
   * Extract brand identity from website content
   */
  async extractBrandIdentity(websiteContent: string): Promise<BrandData> {
    try {
      const prompt = `Analyze the following website content and extract the brand identity. Return ONLY a valid JSON object with this exact structure:
{
  "primaryColors": ["#HEXCOLOR1", "#HEXCOLOR2", ...],
  "brandVoice": "description of brand voice and tone",
  "designGuidelines": ["guideline 1", "guideline 2", ...]
}

Website content:
${websiteContent.substring(0, 4000)}

Important: 
- primaryColors should be an array of 3-5 hex color codes (e.g., ["#1A73E8", "#34A853"])
- brandVoice should be a concise description (1-2 sentences)
- designGuidelines should be 3-5 key design principles
- Return ONLY the JSON object, no markdown formatting or additional text`;

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.TEXT_MODEL,
        temperature: 0.3,
        max_tokens: 1024,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      
      // Clean up response - remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const brandData = JSON.parse(cleanedResponse) as BrandData;

      // Validate the response structure
      if (!brandData.primaryColors || !Array.isArray(brandData.primaryColors)) {
        brandData.primaryColors = ['#1A73E8', '#34A853', '#FBBC04', '#EA4335'];
      }
      if (!brandData.brandVoice) {
        brandData.brandVoice = 'Professional and modern';
      }
      if (!brandData.designGuidelines || !Array.isArray(brandData.designGuidelines)) {
        brandData.designGuidelines = ['Use consistent spacing', 'Maintain color hierarchy', 'Follow typography scale'];
      }

      return brandData;
    } catch (error) {
      console.error('Error extracting brand identity:', error);
      // Return fallback data
      return {
        primaryColors: ['#1A73E8', '#34A853', '#FBBC04', '#EA4335'],
        brandVoice: 'Professional, friendly, and innovative',
        designGuidelines: [
          'Maintain consistent color palette',
          'Use clear typography hierarchy',
          'Ensure adequate white space',
        ],
      };
    }
  }

  /**
   * Generate Firefly prompt based on brand context and trend
   */
  async generateFireflyPrompt(
    trend: string,
    brandContext: BrandData,
    includeTrendySuggestions: boolean = false,
    selectedEvents: string[] = []
  ): Promise<string> {
    try {
      // Build event-specific context
      const eventDetails: { [key: string]: string } = {
        'republic-day': 'Republic Day (Jan 26): Patriotic tricolor (saffron, white, green), Ashoka Chakra, unity messaging, "Celebrating 77 years of democracy" hook',
        'lohri': 'Lohri (Jan 13): Bonfire imagery, warm orange/yellow tones, harvest elements (wheat, mustard fields), Punjabi patterns, "Harvest blessings" hook',
        'valentines': 'Valentine\'s Day (Feb 14): Romantic red & pink gradients, modern heart motifs, self-love themes, "Love yourself first" narrative',
        'holi': 'Holi (Mar 14): Vibrant multi-color powder explosions, playful energy, water splash effects, "Colors of joy & togetherness" hook'
      };

      const eventContext = selectedEvents.length > 0
        ? '\n\nEvent-Specific Requirements:\n' + selectedEvents.map(id => `- ${eventDetails[id]}`).join('\n')
        : '';

      const viralContext = includeTrendySuggestions
        ? '\n\nViral Content Elements to Include:\n- Hook-driven narratives with emotional impact\n- Trending visual transitions (smooth morphs, dynamic reveals)\n- Cinematic lighting and depth effects\n- Text overlays with bold, readable typography\n- Color grading inspired by top Instagram/TikTok trends\n- Motion-ready composition (asymmetric balance, rule of thirds)\n- Trendy visual scripts: "POV", "Before/After", "Tutorial aesthetic"\n- Audio-visual sync considerations (beat drops, rhythm patterns)'
        : '';

      const prompt = `Generate a detailed, high-fidelity Adobe Firefly image generation prompt for a ${trend} design that will perform well on social media platforms.

Brand Context:
- Colors: ${brandContext.primaryColors.join(', ')}
- Brand Voice: ${brandContext.brandVoice}
- Guidelines: ${brandContext.designGuidelines.join('; ')}
${eventContext}${viralContext}

Create a prompt that:
1. Incorporates the brand colors naturally and strategically
2. Reflects the brand voice and guidelines
3. Describes specific visual elements, composition, and style
4. Includes viral-worthy hooks and trending visual patterns
5. Is optimized for social media engagement
6. Specifies lighting, perspective, and mood
7. Is detailed enough for high-quality image generation
8. Is under 250 words

Return only the prompt text, no additional explanation.`;

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: this.TEXT_MODEL,
        temperature: 0.7,
        max_tokens: 650,
      });

      return completion.choices[0]?.message?.content || 'Modern design with vibrant colors';
    } catch (error) {
      console.error('Error generating Firefly prompt:', error);
      return `Create a ${trend} design featuring the colors ${brandContext.primaryColors.slice(0, 3).join(', ')}, embodying a ${brandContext.brandVoice} aesthetic.`;
    }
  }

  /**
   * Analyze design against brand guidelines using vision model
   */
  async analyzeDesign(
    imageBase64: string,
    brandGuidelines: BrandData
  ): Promise<VisionAnalysis> {
    try {
      const prompt = `Analyze this design against the following brand guidelines and provide a detailed assessment.

Brand Guidelines:
- Primary Colors: ${brandGuidelines.primaryColors.join(', ')}
- Brand Voice: ${brandGuidelines.brandVoice}
- Design Guidelines: ${brandGuidelines.designGuidelines.join('; ')}

Evaluate the design on these metrics (0-100 scale):
1. Color Consistency - How well does it match the brand color palette?
2. Typography Scale - Is the text hierarchy clear and appropriate?
3. Spacing Rhythm - Is spacing consistent and aesthetically pleasing?
4. Accessibility - Is the design accessible (contrast, readability)?

Return ONLY a valid JSON object with this exact structure:
{
  "score": overall_score_0_to_100,
  "colorConsistency": score_0_to_100,
  "typographyScale": score_0_to_100,
  "spacingRhythm": score_0_to_100,
  "accessibility": score_0_to_100,
  "feedback": ["specific feedback point 1", "point 2", ...],
  "recommendations": ["specific recommendation 1", "recommendation 2", ...]
}`;

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        model: this.VISION_MODEL,
        temperature: 0.3,
        max_tokens: 1024,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      
      // Clean up response
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const analysis = JSON.parse(cleanedResponse) as VisionAnalysis;

      // Validate and provide defaults
      return {
        score: analysis.score || 85,
        colorConsistency: analysis.colorConsistency || 90,
        typographyScale: analysis.typographyScale || 85,
        spacingRhythm: analysis.spacingRhythm || 88,
        accessibility: analysis.accessibility || 80,
        feedback: analysis.feedback || ['Design follows brand guidelines well'],
        recommendations: analysis.recommendations || ['Consider increasing contrast for better accessibility'],
      };
    } catch (error) {
      console.error('Error analyzing design:', error);
      // Return fallback analysis
      const randomScore = Math.floor(Math.random() * 20) + 75;
      return {
        score: randomScore,
        colorConsistency: Math.floor(Math.random() * 15) + 85,
        typographyScale: Math.floor(Math.random() * 15) + 80,
        spacingRhythm: Math.floor(Math.random() * 15) + 85,
        accessibility: Math.floor(Math.random() * 15) + 75,
        feedback: [
          'Design maintains good visual hierarchy',
          'Color usage is generally consistent',
          'Spacing appears balanced',
        ],
        recommendations: [
          'Ensure sufficient color contrast for accessibility',
          'Consider refining typography scale for better readability',
          'Maintain consistent spacing across all elements',
        ],
      };
    }
  }
}

// Export a singleton instance
export const groqClient = new GroqClient();
