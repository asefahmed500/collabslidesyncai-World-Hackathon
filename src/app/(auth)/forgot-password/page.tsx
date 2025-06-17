
"use client";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      // If user is already logged in, redirect them from forgot password page
      router.push("/dashboard");
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!loading && currentUser) {
    // Render nothing or a loader while redirecting
    return <div className="flex min-h-screen flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return <ForgotPasswordForm />;
}
