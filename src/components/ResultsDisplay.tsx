import { useState } from 'react';

interface BookDetails {
  title: string;
  author: string;
  imprint: string;
  publication_date: string;
  nyt_bestseller: boolean;
  copies_sold: string;
  marketing_strategy: string;
  reason?: string;
}

interface AnalysisResults {
  genre: string;
  tropes: string[];
  themes: string[];
  comparable_titles: BookDetails[];
  recent_titles?: BookDetails[];
}

interface Submission {
  _id: string;
  synopsis: string;
  text: string;
  file_name: string;
  file_size: number;
  status: string;
  created_at: string;
  analysis?: AnalysisResults;
}

interface ResultsDisplayProps {
  results: Submission;
}

function BookCard({ book }: { book: BookDetails }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div>
        <h4 className="text-lg font-medium text-gray-900">{book.title}</h4>
        <p className="text-gray-600">by {book.author}</p>
      </div>
      {book.reason && (
        <p className="mt-2 text-gray-600">{book.reason}</p>
      )}
      <div className="mt-4 space-y-3">
        <div>
          <h5 className="text-sm font-medium text-gray-500">Imprint</h5>
          <p className="text-gray-900">{book.imprint}</p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-500">Publication Date</h5>
          <p className="text-gray-900">{book.publication_date}</p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-500">NYT Bestseller</h5>
          <p className="text-gray-900">{book.nyt_bestseller ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-500">Copies Sold</h5>
          <p className="text-gray-900">{book.copies_sold}</p>
        </div>
        <div>
          <h5 className="text-sm font-medium text-gray-500">Marketing Strategy</h5>
          <p className="text-gray-900">{book.marketing_strategy}</p>
        </div>
      </div>
    </div>
  );
}

export default function ResultsDisplay({ results }: ResultsDisplayProps) {
  if (!results.analysis) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Status</h2>
        <p className="text-gray-700">
          {results.status === 'pending' 
            ? 'Your manuscript is being analyzed. Please check back in a few minutes.'
            : results.status === 'error'
            ? 'There was an error analyzing your manuscript. Please try uploading it again.'
            : 'Analysis status unknown. Please try uploading your manuscript again.'}
        </p>
      </div>
    );
  }

  const analysis = results.analysis;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Primary Analysis */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Genre</h3>
          <p className="text-gray-700">{analysis.genre}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Themes</h3>
          <ul className="list-disc list-inside text-gray-700">
            {analysis.themes.map((theme, index) => (
              <li key={index}>{theme}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tropes */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Literary Tropes</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.tropes.map((trope, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
            >
              {trope}
            </span>
          ))}
        </div>
      </div>

      {/* Best Comparable Titles */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Best Comparable Titles</h3>
        <div className="grid gap-6">
          {analysis.comparable_titles.map((book, index) => (
            <BookCard key={index} book={book} />
          ))}
        </div>
      </div>

      {/* Recent Comparable Titles */}
      {analysis.recent_titles && analysis.recent_titles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">Recent Comparable Titles</h3>
          <div className="grid gap-6">
            {analysis.recent_titles.map((book, index) => (
              <BookCard key={index} book={book} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
