'use client';

import { useEffect, useState } from 'react';
import ResultsDisplay from '../../../components/ResultsDisplay';

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

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [results, setResults] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      console.log('Fetching results for ID:', params.id);
      const response = await fetch(`/api/submissions/${params.id}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      console.log('Results data:', data);
      setResults(data);
      
      // If status is pending or processing, continue polling
      if (data.status === 'pending' || data.status === 'processing') {
        setTimeout(fetchResults, 5000); // Poll every 5 seconds
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [params.id]);

  if (loading && !results) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-3 mt-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>No results found. Please try uploading your manuscript again.</p>
        </div>
      </div>
    );
  }

  return <ResultsDisplay results={results} />;
}
