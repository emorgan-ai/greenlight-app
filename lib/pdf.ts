import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';

export async function validatePDF(buffer: Buffer) {
  try {
    // Check if it's a valid PDF
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Get text content
    const data = await pdfParse(buffer);
    const textContent = data.text;
    
    return {
      isValid: true,
      pageCount,
      textContent
    };
  } catch (error) {
    console.error('Error validating PDF:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid PDF file'
    };
  }
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
