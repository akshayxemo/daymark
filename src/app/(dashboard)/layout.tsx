import Dashboard from '@/components/dashboard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Dashboard />
      {children}
    </>
  );
}
