import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { connectToDatabase, updateSubmission } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import logger from '../../../lib/logger';

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
  logger.info('[Process API] Starting manuscript analysis');
  
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
              "title": "Book title published in last 3 years",
              "author": "Author name",
              "imprint": "Publishing imprint",
              "publication_date": "YYYY-MM-DD",
              "nyt_bestseller": boolean,
              "copies_sold": "Approximate number",
              "marketing_strategy": "Brief marketing approach",
              "reason": "Why this recent book is comparable"
            }
          ]
        }`
      },
      {
        role: "user",
        content: `Analyze this manuscript excerpt: ${text}`
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: "json_object" }
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  const analysis = JSON.parse(content) as AnalysisResults;
  logger.info('[Process API] Analysis completed:', analysis);
  return analysis;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  logger.info('[Process API] Received request:', {
    method: req.method,
    id: req.query.id,
    headers: req.headers
  });

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
    logger.info('[Process API] Fetching submission:', id);
    const submission = await db.collection('submissions').findOne({ _id: new ObjectId(id) });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Update status to processing
    logger.info('[Process API] Setting status to processing');
    await updateSubmission(id, { 
      status: 'processing',
      updated_at: new Date()
    });

    try {
      logger.info('[Process API] Starting analysis');
      const analysis = await analyzeManuscript(submission.text);

      // Update submission with analysis results
      logger.info('[Process API] Setting status to completed');
      await updateSubmission(id, { 
        status: 'completed',
        analysis: analysis,
        updated_at: new Date()
      });

      return res.status(200).json({ message: 'Analysis completed', analysis });
    } catch (error) {
      logger.error('[Process API] Error during analysis:', error);
      
      // Update status to error
      logger.info('[Process API] Setting status to error');
      await updateSubmission(id, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date()
      });

      return res.status(500).json({ message: 'Error during analysis' });
    }
  } catch (error) {
    logger.error('[Process API] Error processing submission:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
