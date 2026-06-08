// Auth pages (login, onboarding) have no nav — just the page content
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
