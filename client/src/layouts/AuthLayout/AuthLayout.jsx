function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#fde9f0] px-4 py-6 sm:px-8 lg:px-12">
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;