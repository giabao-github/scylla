import { AuthLayout } from "@/modules/auth/ui/layouts/auth-layout";

export const AuthLoadingState = () => (
  <AuthLayout>
    <div className="space-y-4">
      <div className="mx-auto loader"></div>
      <p>Loading data...</p>
    </div>
  </AuthLayout>
);
