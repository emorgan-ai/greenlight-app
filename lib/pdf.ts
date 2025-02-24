import pdf from 'pdf-parse';

export async function validatePDF(buffer: Buffer): Promise<void> {
  try {
    // Check file size
    const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');
    const fileSizeMB = buffer.length / (1024 * 1024);
    
    if (fileSizeMB > maxSizeMB) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }

    // Parse PDF to check if it's valid and count pages
    const data = await pdf(buffer);
    const pageCount = data.numpages;
    const maxPages = parseInt(process.env.MAX_PAGES || '10');

    if (pageCount > maxPages) {
      throw new Error(`PDF has ${pageCount} pages, exceeding ${maxPages} page limit`);
    }

    // Basic content validation
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no readable text');
    }

    console.log('[PDF] Validation successful:', {
      sizeInMB: fileSizeMB.toFixed(2),
      pages: pageCount,
      textLength: data.text.length
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PDF validation failed: ${error.message}`);
    }
    throw new Error('PDF validation failed');
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    const text = data.text;

    // Basic text validation
    if (!text || text.trim().length === 0) {
      throw new Error('No text could be extracted from PDF');
    }

    console.log('[PDF] Text extraction successful:', {
      textLength: text.length,
      firstFewWords: text.split(' ').slice(0, 5).join(' ') + '...'
    });

    return text;
  } catch (error) {
    console.error('[PDF] Text extraction failed:', error);
    if (error instanceof Error) {
      throw new Error(`Text extraction failed: ${error.message}`);
    }
    throw new Error('Text extraction failed');
  }
}
