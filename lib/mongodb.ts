import { MongoClient, ObjectId } from 'mongodb';
import OpenAI from 'openai';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Please add your OpenAI API key to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Log OpenAI API key status (safely)
console.log('[MongoDB] OpenAI configuration status:', {
  apiKeyExists: !!process.env.OPENAI_API_KEY,
  apiKeyLength: process.env.OPENAI_API_KEY?.length,
  apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 3),
  orgIdExists: !!process.env.OPENAI_ORG_ID,
  orgIdLength: process.env.OPENAI_ORG_ID?.length,
  orgIdPrefix: process.env.OPENAI_ORG_ID?.substring(0, 3)
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID
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

export async function analyzeManuscript(text: string): Promise<AnalysisResults> {
  console.log('[MongoDB] Starting manuscript analysis');
  
  if (!text || text.trim().length === 0) {
    console.error('[MongoDB] Empty text provided for analysis');
    throw new Error('No text provided for analysis');
  }

  console.log('[MongoDB] Text length:', text.length);
  console.log('[MongoDB] First 100 characters:', text.substring(0, 100));

  try {
    // Validate OpenAI configuration
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    console.log('[MongoDB] Making OpenAI request');
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",  // Changed from gpt-4-turbo-preview to gpt-4
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

      console.log('[MongoDB] OpenAI request completed');
      const content = completion.choices[0]?.message?.content;

      if (!content) {
        console.error('[MongoDB] No content received from OpenAI');
        throw new Error('No content received from OpenAI');
      }

      try {
        console.log('[MongoDB] Parsing OpenAI response');
        const analysis = JSON.parse(content) as AnalysisResults;
        console.log('[MongoDB] Analysis completed successfully');
        return analysis;
      } catch (parseError) {
        console.error('[MongoDB] Error parsing OpenAI response:', parseError, 'Content:', content);
        throw new Error('Failed to parse OpenAI response');
      }
    } catch (openaiError) {
      console.error('[MongoDB] OpenAI API error:', openaiError);
      if (openaiError instanceof Error) {
        // Check for specific OpenAI error types
        if (openaiError.message.includes('401')) {
          throw new Error('OpenAI API key is invalid');
        } else if (openaiError.message.includes('429')) {
          throw new Error('OpenAI rate limit exceeded');
        } else if (openaiError.message.includes('500')) {
          throw new Error('OpenAI service error');
        }
        throw new Error(`OpenAI API error: ${openaiError.message}`);
      }
      throw openaiError;
    }
  } catch (error) {
    console.error('[MongoDB] Analysis error:', error);
    throw error;
  }
}

export async function connectToDatabase() {
  const client = await clientPromise;
  const db = client.db('greenlight');
  return { client, db };
}

export async function insertSubmission(data: {
  synopsis: string;
  text: string;
  file_name: string;
  file_size: number;
  status: string;
  created_at: Date;
}) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('submissions').insertOne(data);
    return result;
  } catch (error) {
    console.error('[MongoDB] Database error:', error);
    throw new Error('Failed to insert submission');
  }
}

export async function getSubmission(id: string) {
  try {
    console.log('[MongoDB] Getting submission:', id);
    const { db } = await connectToDatabase();
    const submission = await db.collection('submissions').findOne({ 
      _id: new ObjectId(id) 
    });
    console.log('[MongoDB] Found submission:', {
      id: submission?._id,
      status: submission?.status,
      hasAnalysis: !!submission?.analysis,
      error: submission?.error
    });
    return submission;
  } catch (error) {
    console.error('[MongoDB] Database error:', error);
    throw new Error('Failed to get submission');
  }
}

export async function updateSubmission(id: string, data: any) {
  try {
    console.log('[MongoDB] Updating submission:', id, data);
    const { db } = await connectToDatabase();
    const result = await db.collection('submissions').updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return result;
  } catch (error) {
    console.error('[MongoDB] Database error:', error);
    throw new Error('Failed to update submission');
  }
}

// Export the clientPromise for use in other files
export { clientPromise };
