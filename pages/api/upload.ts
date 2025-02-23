import { NextApiRequest, NextApiResponse } from 'next';
import { insertSubmission, updateSubmission } from '../../lib/mongodb';
import { validatePDF, extractTextFromPDF } from '../../lib/pdf';
import { analyzeManuscript } from '../../lib/openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from 'formidable';
import { createReadStream } from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[Upload API] POST /api/upload - Start');

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    console.log('[Upload API] Form data received:', {
      fields: Object.keys(fields),
      files: Object.keys(files),
    });

    const synopsis = fields.synopsis?.[0];
    const file = files.file?.[0];

    if (!synopsis || !file) {
      console.log('[Upload API] Missing required fields:', { synopsis: !!synopsis, file: !!file });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Read file buffer
    console.log('[Upload API] Reading file buffer');
    const fileStream = createReadStream(file.filepath);
    const chunks: Buffer[] = [];
    
    for await (const chunk of fileStream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);

    // Validate PDF
    console.log('[Upload API] Validating PDF');
    try {
      await validatePDF(buffer);
    } catch (error) {
      console.error('[Upload API] PDF validation error:', error);
      return res.status(400).json({ error: 'Invalid PDF file' });
    }

    // Extract text from PDF
    console.log('[Upload API] Extracting text from PDF');
    const text = await extractTextFromPDF(buffer);

    if (!text) {
      console.error('[Upload API] No text extracted from PDF');
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    console.log('[Upload API] Text extracted, length:', text.length);

    // Insert submission into database
    console.log('[Upload API] Inserting submission into database');
    const submission = await insertSubmission({
      synopsis,
      text,
      file_name: file.originalFilename || 'unnamed.pdf',
      file_size: file.size,
      status: 'processing', // Start in processing state
      created_at: new Date(),
    });

    if (!submission.insertedId) {
      throw new Error('Failed to insert submission');
    }

    // Start analysis immediately
    console.log('[Upload API] Starting analysis');
    try {
      const analysis = await analyzeManuscript(text);
      console.log('[Upload API] Analysis completed successfully');
      
      // Update with analysis results
      await updateSubmission(submission.insertedId.toString(), {
        ...analysis,
        status: 'completed',
        completed_at: new Date(),
      });
    } catch (error) {
      console.error('[Upload API] Analysis error:', error);
      
      // Update status to error
      await updateSubmission(submission.insertedId.toString(), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error during analysis',
      });
    }

    console.log('[Upload API] Upload and initial processing complete');
    return res.status(200).json({ submissionId: submission.insertedId });
  } catch (error) {
    console.error('[Upload API] Upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
