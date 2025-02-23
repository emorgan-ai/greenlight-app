'use client';

import { useEffect, useState, useRef } from 'react';
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
  error?: string;
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [results, setResults] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const fetchResults = async () => {
    if (!mountedRef.current) return;

    try {
      console.log('Fetching results for ID:', params.id);
      const response = await fetch(`/api/submissions/${params.id}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      console.log('Results data:', data);
      
      if (!mountedRef.current) return;
      setResults(data);
      
      // Keep polling if the analysis is not complete
      if (data.status === 'pending' || data.status === 'processing') {
        timeoutRef.current = setTimeout(fetchResults, 5000); // Poll every 5 seconds
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load results');
      setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchResults();
    
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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

  // Show loading message while analysis is in progress
  if (results.status === 'pending' || results.status === 'processing') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <h2 className="text-xl font-semibold mb-4">Analysis Status</h2>
          <p>Your manuscript is being analyzed. Please check back in a few minutes.</p>
          <p className="mt-2 text-sm">Current status: {results.status}</p>
        </div>
      </div>
    );
  }

  // Show error message if analysis failed
  if (results.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="text-xl font-semibold mb-4">Analysis Error</h2>
          <p>There was an error analyzing your manuscript. Please try uploading it again.</p>
          {results.error && (
            <p className="mt-2 text-sm">Error details: {results.error}</p>
          )}
        </div>
      </div>
    );
  }

  // Show the results if analysis is complete
  if (results.status === 'completed' && results.analysis) {
    return <ResultsDisplay results={results} />;
  }

  // Fallback message for unknown status
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-yellow-50 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <h2 className="text-xl font-semibold mb-4">Unknown Status</h2>
        <p>The status of your analysis is unknown (status: {results.status}). Please try refreshing the page or uploading your manuscript again.</p>
      </div>
    </div>
  );
}
