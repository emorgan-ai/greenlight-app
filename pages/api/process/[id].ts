import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase, updateSubmission, analyzeManuscript } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[Process API] Received request:', {
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
    console.log('[Process API] Fetching submission:', id);
    const submission = await db.collection('submissions').findOne({ _id: new ObjectId(id) });

    if (!submission) {
      console.error('[Process API] Submission not found:', id);
      return res.status(404).json({ message: 'Submission not found' });
    }

    console.log('[Process API] Found submission:', {
      id: submission._id,
      fileName: submission.file_name,
      textLength: submission.text?.length,
      status: submission.status
    });

    // Update status to processing
    console.log('[Process API] Setting status to processing');
    await updateSubmission(id, { 
      status: 'processing',
      updated_at: new Date()
    });

    try {
      console.log('[Process API] Starting analysis');
      const analysis = await analyzeManuscript(submission.text);

      // Update submission with analysis results
      console.log('[Process API] Setting status to completed');
      await updateSubmission(id, { 
        status: 'completed',
        analysis: analysis,
        updated_at: new Date()
      });

      return res.status(200).json({ message: 'Analysis completed', analysis });
    } catch (error) {
      console.error('[Process API] Error during analysis:', error);
      
      // Update status to error
      console.log('[Process API] Setting status to error');
      await updateSubmission(id, { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date()
      });

      return res.status(500).json({ 
        message: 'Error during analysis', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } catch (error) {
    console.error('[Process API] Error processing submission:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
