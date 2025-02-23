import { MongoClient, ObjectId } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
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
    console.error('Database error:', error);
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
      hasAnalysis: !!submission?.analysis
    });
    return submission;
  } catch (error) {
    console.error('Database error:', error);
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
    console.log('[MongoDB] Update result:', result);
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Failed to update submission');
  }
}

export async function insertEmailSignup(email: string, submissionId: string) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('email_signups').insertOne({
      email,
      submissionId: new ObjectId(submissionId),
      created_at: new Date()
    });
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Failed to insert email signup');
  }
}

// Export the clientPromise for use in other files
export { clientPromise };
