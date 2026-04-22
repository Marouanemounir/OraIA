export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold tracking-tight">
              <span className="text-[#1B2A4A]">ora</span>
              <span className="text-[#2E75B6]">.IA</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Plateforme d&apos;examen oral IA
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
