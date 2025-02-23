declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function parse(dataBuffer: Buffer, options?: {
    pagerender?: (pageData: any) => string;
    max?: number;
    version?: string;
  }): Promise<PDFData>;

  export = parse;
}
