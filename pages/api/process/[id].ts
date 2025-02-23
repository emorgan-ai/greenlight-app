import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ManuscriptAnalysis {
  overallImpression: string;
  plotAnalysis: {
    strength: string;
    weaknesses: string[];
    pacing: string;
    structure: string;
  };
  characterAnalysis: {
    mainCharacter: {
      name: string;
      development: string;
      strengths: string[];
      weaknesses: string[];
    };
    supportingCharacters: {
      strengths: string;
      weaknesses: string;
    };
  };
  marketability: {
    targetAudience: string;
    genre: string;
    comparableTitles: string[];
    uniqueSellingPoints: string[];
    marketPotential: string;
  };
  writingStyle: {
    strengths: string[];
    weaknesses: string[];
    voiceAndTone: string;
  };
  recommendations: {
    immediateActions: string[];
    longTermSuggestions: string[];
  };
}

async function analyzeManuscript(text: string): Promise<ManuscriptAnalysis> {
  console.log('Starting manuscript analysis');
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a literary agent's assistant analyzing manuscript submissions. Provide detailed analysis in JSON format."
      },
      {
        role: "user",
        content: `Analyze this manuscript excerpt and provide a detailed analysis in JSON format. Include plot analysis, character development, marketability, writing style, and specific recommendations.\n\nText: ${text}`
      }
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  
  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
  const analysis = JSON.parse(jsonStr) as ManuscriptAnalysis;
  
  return analysis;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  try {
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid submission ID format' });
    }

    const submission = await db.collection('submissions').findOne({
      _id: new ObjectId(id)
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (!submission.text) {
      return res.status(400).json({ message: 'No text content found in submission' });
    }

    console.log('Processing submission:', id);

    try {
      const analysis = await analyzeManuscript(submission.text);

      // Update the submission with the analysis
      await db.collection('submissions').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            analysis,
            status: 'completed',
            completedAt: new Date()
          }
        }
      );

      return res.status(200).json(analysis);
    } catch (analysisError) {
      console.error('Error analyzing manuscript:', analysisError);
      return res.status(500).json({ message: 'Failed to analyze manuscript' });
    }

  } catch (error) {
    console.error('Error processing submission:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
