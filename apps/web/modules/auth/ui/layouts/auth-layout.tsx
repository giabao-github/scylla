export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col justify-center items-center h-full min-h-screen min-w-screen">
      {children}
    </div>
  );
};
