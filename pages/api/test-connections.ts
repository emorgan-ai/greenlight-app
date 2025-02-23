import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { connectToDatabase } from '../../lib/mongodb';

interface ConnectionResult {
  success: boolean;
  error: string | null;
  collections?: string[];
}

interface TestResults {
  mongodb: ConnectionResult;
  openai: ConnectionResult;
  env: {
    hasMongoDB: boolean;
    hasOpenAI: boolean;
    mongoDBLength: number;
    openAILength: number;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResults>
) {
  const results: TestResults = {
    mongodb: {
      success: false,
      error: null
    },
    openai: {
      success: false,
      error: null
    },
    env: {
      hasMongoDB: !!process.env.MONGODB_URI,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      mongoDBLength: process.env.MONGODB_URI?.length || 0,
      openAILength: process.env.OPENAI_API_KEY?.length || 0,
    }
  };

  // Test MongoDB connection
  try {
    const { db } = await connectToDatabase();
    const collections = await db.collections();
    results.mongodb = {
      success: true,
      error: null,
      collections: collections.map(c => c.collectionName)
    };
  } catch (error) {
    results.mongodb = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to MongoDB'
    };
  }

  // Test OpenAI connection
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Test connection" }],
      max_tokens: 5
    });

    results.openai = {
      success: true,
      error: null
    };
  } catch (error) {
    results.openai = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to OpenAI'
    };
  }

  res.status(200).json(results);
}
