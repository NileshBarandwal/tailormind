interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-500" />
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
