export default function Loading(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-vw-primary-blue flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-vw-secondary-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Loading VW Control Tower...</p>
      </div>
    </div>
  );
}
