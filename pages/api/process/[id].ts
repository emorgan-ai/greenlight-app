import type { NextApiRequest, NextApiResponse } from 'next';
import { getSubmission, updateSubmission } from '../../../lib/mongodb';
import { analyzeManuscript } from '../../../lib/openai';

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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid submission ID format' });
    }

    console.log(`[Process API] Processing submission ${id}`);

    try {
      // Get the submission from the database
      const submission = await getSubmission(id);

      if (!submission) {
        console.error(`[Process API] Submission ${id} not found`);
        return res.status(404).json({ error: 'Submission not found' });
      }

      console.log('[Process API] Found submission:', {
        id: submission._id,
        fileName: submission.file_name,
        textLength: submission.text?.length,
        status: submission.status
      });

      if (submission.status === 'completed') {
        console.log(`[Process API] Submission ${id} already processed`);
        return res.status(200).json({ message: 'Already processed' });
      }

      // Update status to processing
      console.log(`[Process API] Updating status to processing for ${id}`);
      await updateSubmission(id, { 
        status: 'processing',
        updated_at: new Date()
      });

      // Analyze the manuscript
      console.log(`[Process API] Starting analysis for ${id}`);
      try {
        const analysis = await analyzeManuscript(submission.text);
        console.log(`[Process API] Analysis completed for ${id}`, analysis);

        // Update the submission with the analysis results
        await updateSubmission(id, {
          ...analysis,
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date(),
        });

        console.log(`[Process API] Successfully processed submission ${id}`);
        return res.status(200).json({ message: 'Analysis completed', analysis });
      } catch (error) {
        console.error(`[Process API] Analysis error for ${id}:`, error);
        
        // Update submission status to error
        await updateSubmission(id, { 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error during analysis',
          updated_at: new Date()
        });

        return res.status(500).json({ 
          error: 'Error during analysis', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    } catch (error) {
      console.error(`[Process API] Process error for ${id}:`, error);
      return res.status(500).json({ 
        error: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error(`[Process API] Process error for ${id}:`, error);
    return res.status(500).json({ 
      error: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
