export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
