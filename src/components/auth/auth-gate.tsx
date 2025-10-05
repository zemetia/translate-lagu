"use client";

import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "./login-form";
import { CompleteRegistrationForm } from "./complete-registration-form";
import { LoaderCircle, Music4, Sparkles } from "lucide-react";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, loading, isRegistrationComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-bg">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <Music4 className="text-primary h-16 w-16 animate-float" />
            <Sparkles className="absolute -top-2 -right-2 text-accent h-8 w-8" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground font-medium">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-bg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md px-4">
          <div className="text-center mb-8 animate-slide-down">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Music4 className="text-primary animate-float" size={48} />
                <Sparkles className="absolute -top-1 -right-1 text-accent" size={20} />
              </div>
              <h1 className="text-5xl font-headline font-bold gradient-text">
                Translate Lagu
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              AI-powered lyric translation
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    );
  }

  // User is authenticated but hasn't completed registration
  if (!isRegistrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-bg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md px-4">
          <div className="text-center mb-8 animate-slide-down">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Music4 className="text-primary animate-float" size={48} />
                <Sparkles className="absolute -top-1 -right-1 text-accent" size={20} />
              </div>
              <h1 className="text-5xl font-headline font-bold gradient-text">
                Translate Lagu
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              AI-powered lyric translation
            </p>
          </div>

          <CompleteRegistrationForm />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
