import type { NextApiRequest, NextApiResponse } from 'next';
import { getSubmission, updateSubmission } from '../../../lib/mongodb';
import { analyzeManuscript } from '../../../lib/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid submission ID' });
  }

  console.log(`[Process API] Processing submission ${id}`);

  try {
    // Get the submission from the database
    const submission = await getSubmission(id);

    if (!submission) {
      console.error(`[Process API] Submission ${id} not found`);
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.status === 'completed') {
      console.log(`[Process API] Submission ${id} already processed`);
      return res.status(200).json({ message: 'Already processed' });
    }

    // Update status to processing
    console.log(`[Process API] Updating status to processing for ${id}`);
    await updateSubmission(id, { status: 'processing' });

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
      });

      console.log(`[Process API] Successfully processed submission ${id}`);
      return res.status(200).json({ message: 'Processing complete' });
    } catch (error) {
      console.error(`[Process API] Analysis error for ${id}:`, error);
      
      // Update submission status to error
      await updateSubmission(id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during analysis',
      });

      throw error; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error(`[Process API] Process error for ${id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
