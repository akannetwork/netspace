export default function SuspendedPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center border-l-4 border-yellow-500">
                <h1 className="text-4xl text-yellow-600 mb-4">⚠️</h1>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Account Suspended</h2>
                <p className="text-gray-600 mb-6">
                    This tenant account has been suspended due to payment or policy issues.
                </p>
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-500">
                    If you are the owner, please contact support immediately to resolve this issue.
                </div>
                <div className="mt-6 text-xs text-gray-400">
                    Error Code: TENANT_SUSPENDED
                </div>
            </div>
        </div>
    );
}
