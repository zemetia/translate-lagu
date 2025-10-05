"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { validateGeminiApiKey } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, UserPlus, Key, LogOut, Check, X } from "lucide-react";

const completeRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  geminiApiKey: z.string().min(20, "Please enter a valid Google Gemini API key").regex(/^AIza/, "API key must start with 'AIza'"),
});

type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;

export function CompleteRegistrationForm() {
  const { completeRegistration, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    status: "idle" | "valid" | "invalid";
    message?: string;
  }>({ status: "idle" });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CompleteRegistrationFormData>({
    resolver: zodResolver(completeRegistrationSchema),
  });

  const apiKeyValue = watch("geminiApiKey");

  const handleValidateApiKey = async () => {
    const apiKey = apiKeyValue;
    if (!apiKey || apiKey.length < 20) {
      toast({
        variant: "destructive",
        title: "Invalid API Key",
        description: "Please enter a valid API key to validate.",
      });
      return;
    }

    setIsValidating(true);
    setValidationResult({ status: "idle" });

    try {
      const result = await validateGeminiApiKey(apiKey);

      if (result.valid) {
        setValidationResult({ status: "valid", message: "API key is valid!" });
        toast({
          title: "Valid API Key",
          description: "Your Gemini API key is valid.",
        });
      } else {
        setValidationResult({
          status: "invalid",
          message: result.error || "Invalid API key",
        });
        toast({
          variant: "destructive",
          title: "Invalid API Key",
          description: result.error || "The API key is not valid.",
        });
      }
    } catch (error: any) {
      setValidationResult({
        status: "invalid",
        message: error.message || "Failed to validate API key",
      });
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: error.message || "An error occurred during validation.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: CompleteRegistrationFormData) => {
    if (validationResult.status !== "valid") {
      toast({
        variant: "destructive",
        title: "Validation Required",
        description: "Please validate your API key before completing registration.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await completeRegistration(data.fullName, data.geminiApiKey);
      toast({
        title: "Registration completed!",
        description: "Welcome to Translate Lagu",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await signOut();
      toast({
        title: "Registration cancelled",
        description: "Please sign in again to continue",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to cancel registration",
      });
    }
  };

  return (
    <Card className="w-full max-w-md border-2 shadow-2xl card-hover animate-scale-in">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 space-y-2">
        <CardTitle className="text-2xl font-headline flex items-center gap-2">
          <UserPlus className="text-primary h-6 w-6" />
          Complete Registration
        </CardTitle>
        <CardDescription className="text-base">
          Please provide the following information to complete your registration
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              {...register("fullName")}
              disabled={isLoading}
              className="border-2"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="geminiApiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Google Gemini API Key *
            </Label>
            <div className="flex gap-2">
              <Input
                id="geminiApiKey"
                type="password"
                placeholder="AIza..."
                {...register("geminiApiKey", {
                  onChange: () => setValidationResult({ status: "idle" }),
                })}
                disabled={isLoading || isValidating}
                className="border-2 font-mono text-sm"
              />
              <Button
                type="button"
                onClick={handleValidateApiKey}
                disabled={isLoading || isValidating || !apiKeyValue || apiKeyValue.length < 20}
                variant="outline"
                className="flex-shrink-0"
              >
                {isValidating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>

            {errors.geminiApiKey && (
              <p className="text-sm text-destructive">{errors.geminiApiKey.message}</p>
            )}

            {validationResult.status === "valid" && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
                <Check className="h-4 w-4" />
                <span>{validationResult.message}</span>
              </div>
            )}

            {validationResult.status === "invalid" && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                <X className="h-4 w-4" />
                <span>{validationResult.message}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              size="lg"
              disabled={isLoading || isValidating || validationResult.status !== "valid"}
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="animate-spin h-5 w-5" />
                  <span className="ml-2">Completing...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  <span className="ml-2">Complete Registration</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading || isValidating}
              className="border-2"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Both fields are required. You must validate your API key before completing registration. If you cancel, you will be signed out and need to sign in again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
