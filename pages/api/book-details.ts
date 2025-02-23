import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BookDetails {
  title: string;
  genre: string;
  targetAudience: string;
  comparableTitles: string[];
  marketPotential: string;
  uniqueSellingPoints: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Text content is required' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a literary agent's assistant analyzing book manuscripts. Extract key details in JSON format."
        },
        {
          role: "user",
          content: `Analyze this manuscript excerpt and provide key details in JSON format with the following fields: title, genre, targetAudience, comparableTitles (array), marketPotential, uniqueSellingPoints (array).\n\nText: ${text}`
        }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    
    try {
      const bookDetails = JSON.parse(jsonStr) as BookDetails;
      return res.status(200).json(bookDetails);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return res.status(500).json({ message: 'Failed to parse book details' });
    }

  } catch (error) {
    console.error('Error processing book details:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
