"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps): React.JSX.Element {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-vw-primary-blue flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 shadow-2xl text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="bg-vw-secondary-blue text-white px-6 py-2 rounded-lg font-semibold"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
