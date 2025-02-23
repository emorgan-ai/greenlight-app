import type { NextApiRequest, NextApiResponse } from 'next';
import { getSubmission } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid submission ID' });
  }

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid submission ID format' });
    }

    const submission = await getSubmission(id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    return res.status(200).json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
