'use client';

import { useEffect, useState } from 'react';
import ResultsDisplay from '@/components/ResultsDisplay';
import EmailSignup from '@/components/EmailSignup';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ResultsPage({ params }: PageProps) {
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      console.log('Fetching results for ID:', params.id);
      const response = await fetch(`/api/results/${params.id}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Error fetching results: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Results data:', data);
      setResults(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading results...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  }

  if (!results) {
    return <div className="text-center p-4">No results found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ResultsDisplay results={results} />
      <EmailSignup submissionId={params.id} />
    </div>
  );
}
