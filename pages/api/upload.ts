import { NextApiRequest, NextApiResponse } from 'next';
import { insertSubmission } from '../../lib/mongodb';
import { validatePDF, extractTextFromPDF } from '../../lib/pdf';

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

  console.log('[API] POST /api/upload - Start');

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    console.log('[API] Form data received:', {
      fields: Object.keys(fields),
      files: Object.keys(files),
    });

    const synopsis = fields.synopsis?.[0];
    const file = files.file?.[0];

    if (!synopsis || !file) {
      console.log('[API] Missing required fields:', { synopsis: !!synopsis, file: !!file });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Read file buffer
    console.log('[API] Reading file buffer');
    const fileStream = createReadStream(file.filepath);
    const chunks: Buffer[] = [];
    
    for await (const chunk of fileStream) {
      chunks.push(Buffer.from(chunk));
    }
    
    const buffer = Buffer.concat(chunks);

    // Validate PDF
    console.log('[API] Validating PDF');
    try {
      await validatePDF(buffer);
    } catch (error) {
      console.error('[API] PDF validation failed:', error);
      return res.status(400).json({ error: 'Invalid PDF file' });
    }

    // Extract text from PDF
    console.log('[API] Extracting text from PDF');
    let text;
    try {
      text = await extractTextFromPDF(buffer);
    } catch (error) {
      console.error('[API] Text extraction failed:', error);
      return res.status(400).json({ error: 'Failed to extract text from PDF' });
    }

    // Insert submission into database
    console.log('[API] Inserting submission into database');
    const submissionData = {
      synopsis,
      text,
      file_name: file.originalFilename || 'unnamed.pdf',
      file_size: file.size,
      status: 'pending',
      created_at: new Date(),
    };

    const result = await insertSubmission(submissionData);
    
    if (!result.insertedId) {
      throw new Error('Failed to insert submission');
    }

    // Start analysis process
    console.log('[API] Starting analysis process');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/process/${result.insertedId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        console.error('[API] Failed to start analysis:', await response.text());
      }
    } catch (error) {
      console.error('[API] Error starting analysis:', error);
    }

    return res.status(200).json({ success: true, submissionId: result.insertedId });
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
