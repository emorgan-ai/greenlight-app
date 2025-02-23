import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BookDetails {
  title: string;
  author: string;
  imprint: string;
  publication_date: string;
  nyt_bestseller: boolean;
  copies_sold: string;
  marketing_strategy: string;
  reason?: string;
}

interface AnalysisResults {
  genre: string;
  tropes: string[];
  themes: string[];
  comparable_titles: BookDetails[];
  recent_titles: BookDetails[];
}

async function analyzeManuscript(text: string): Promise<AnalysisResults> {
  console.log('Starting manuscript analysis');
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are a literary agent's assistant analyzing manuscripts. Provide a detailed analysis in JSON format with the following structure:
        {
          "genre": "Primary genre of the manuscript",
          "tropes": ["List of literary tropes used"],
          "themes": ["List of major themes"],
          "comparable_titles": [
            {
              "title": "Book title",
              "author": "Author name",
              "imprint": "Publishing imprint",
              "publication_date": "YYYY-MM-DD",
              "nyt_bestseller": boolean,
              "copies_sold": "Approximate number",
              "marketing_strategy": "Brief marketing approach",
              "reason": "Why this book is comparable"
            }
          ],
          "recent_titles": [
            {
              "title": "Book title",
              "author": "Author name",
              "imprint": "Publishing imprint",
              "publication_date": "YYYY-MM-DD (must be within last 2 years)",
              "nyt_bestseller": boolean,
              "copies_sold": "Approximate number",
              "marketing_strategy": "Brief marketing approach",
              "reason": "Why this book is comparable"
            }
          ]
        }
        
        For comparable_titles, include 2-3 classic or well-established books that share similar themes, style, or appeal.
        For recent_titles, include 2-3 books published within the last 2 years that would appeal to the same audience.
        `
      },
      {
        role: "user",
        content: `Analyze this manuscript excerpt and provide a detailed analysis: ${text}`
      }
    ],
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  const analysis = JSON.parse(content) as AnalysisResults;
  console.log('Analysis completed:', analysis);
  return analysis;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid submission ID' });
  }

  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid submission ID format' });
    }

    const { db } = await connectToDatabase();
    const submission = await db.collection('submissions').findOne({ _id: new ObjectId(id) });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Update status to processing
    await db.collection('submissions').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'processing' } }
    );

    try {
      const analysis = await analyzeManuscript(submission.text);

      // Update submission with analysis results
      await db.collection('submissions').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'completed',
            analysis: analysis,
            updated_at: new Date()
          }
        }
      );

      return res.status(200).json({ message: 'Analysis completed', analysis });
    } catch (error) {
      console.error('Error during analysis:', error);
      
      // Update status to error
      await db.collection('submissions').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date()
          }
        }
      );

      return res.status(500).json({ message: 'Error during analysis' });
    }
  } catch (error) {
    console.error('Error processing submission:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
