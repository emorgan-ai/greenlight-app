import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID || undefined,
});

export async function analyzeManuscript(text: string) {
  try {
    console.log('[OpenAI] Starting manuscript analysis');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a literary analysis expert. Analyze the provided manuscript text and return a JSON object with the following fields:
            - genre: The primary genre of the text
            - themes: Array of main themes in the text
            - tone: The overall tone of the text
            - pacing: Analysis of the story's pacing
            - synopsis: A brief 1-2 sentence synopsis
            - strengths: Array of the manuscript's strengths
            - areas_for_improvement: Array of suggested improvements
            
            Keep all responses concise. Format your entire response as a valid JSON object.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    console.log('[OpenAI] Analysis completed successfully');
    const response = completion.choices[0].message.content;
    
    try {
      return JSON.parse(response || '{}');
    } catch (error) {
      console.error('[OpenAI] Error parsing response as JSON:', error);
      throw new Error('Failed to parse analysis results');
    }
  } catch (error) {
    console.error('[OpenAI] Analysis error:', error);
    throw error;
  }
}
