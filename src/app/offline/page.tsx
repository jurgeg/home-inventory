export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div>
        <p className="text-4xl mb-4">📡</p>
        <h1 className="text-xl font-semibold mb-2">You&apos;re offline</h1>
        <p className="text-gray-500 text-sm">
          This page isn&apos;t available offline. Your saved items are still accessible from the home screen.
        </p>
      </div>
    </div>
  );
}
