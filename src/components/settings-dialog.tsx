"use client";

import * as React from "react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { validateGeminiApiKey } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle, Key, Check, X } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { userData, updateGeminiApiKey } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    status: "idle" | "valid" | "invalid";
    message?: string;
  }>({ status: "idle" });

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please enter an API key to validate.",
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

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "API Key Required",
        description: "Please enter an API key.",
      });
      return;
    }

    if (validationResult.status !== "valid") {
      toast({
        variant: "destructive",
        title: "Validation Required",
        description: "Please validate your API key before saving.",
      });
      return;
    }

    setIsSaving(true);

    try {
      await updateGeminiApiKey(apiKey);
      toast({
        title: "Settings Updated",
        description: "Your Gemini API key has been updated successfully.",
      });
      onOpenChange(false);
      setApiKey("");
      setValidationResult({ status: "idle" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update API key.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setApiKey("");
    setValidationResult({ status: "idle" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Key className="h-6 w-6 text-primary" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-base">
            Update your Google Gemini API key. The key will be validated before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-key" className="text-sm font-medium">
              Current API Key
            </Label>
            <div className="font-mono text-sm p-3 bg-muted rounded-md border">
              {userData?.geminiApiKey
                ? `${userData.geminiApiKey.substring(0, 8)}...${userData.geminiApiKey.substring(
                    userData.geminiApiKey.length - 4
                  )}`
                : "No API key set"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-key" className="text-sm font-medium">
              New API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="new-key"
                type="password"
                placeholder="Enter your new Gemini API key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationResult({ status: "idle" });
                }}
                disabled={isValidating || isSaving}
                className="font-mono"
              />
              <Button
                onClick={handleValidate}
                disabled={isValidating || isSaving || !apiKey.trim()}
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
                className="text-primary underline hover:text-primary/80"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || validationResult.status !== "valid"}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
