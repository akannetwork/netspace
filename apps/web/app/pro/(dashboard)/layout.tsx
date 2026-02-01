export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-white min-h-[calc(100vh-60px)] p-6">
            {children}
        </div>
    );
}
