"use client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GoogleButton } from "@/components/modules/auth/GoogleButton";
import { GithubButton } from "@/components/modules/auth/GithubButton";

import Image from "next/image";
import { signInWithGoogle, signInWithGithub } from "@/lib/actions/auth-actions";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export default function LoginPage() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsGithubLoading(true);
    try {
      await signInWithGithub();
    } catch (error) {
      console.error("GitHub sign-in failed:", error);
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Left Side - Illustration */}
      <div className="relative hidden md:block md:w-1/2 lg:w-2/3">
        <Image
          src="/login-page-farabi.jpg"
          alt="Illustration of a person analyzing charts on a screen"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 0vw, (max-width: 1024px) 50vw, 75vw"
        />
      </div>
      {/* Right Side - Login Form */}
      <div className="flex w-full h-full items-center justify-center bg-background p-8 md:w-1/2 lg:w-1/3">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardContent className="px-0 space-y-8">
            {/* Header Text */}
            <div className="space-y-4">
              <h1
                className={cn(
                  "text-4xl font-extrabold leading-[1.2] text-foreground"
                )}
              >
                The engine for <span className="text-green-400">creators</span>{" "}
                who value <span className="text-blue-400">depth</span>. Filter
                noise, find facts, and craft{" "}
                <span className="text-red-400">intelligent content</span>{" "}
                faster.
              </h1>
            </div>

            {/* Sign in Buttons */}
            <div className="space-y-4 pt-4">
              <GoogleButton
                isLoading={isGoogleLoading}
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isGithubLoading}
                className="w-full h-14 bg-background border-2 border-border text-foreground hover:bg-accent hover:border-primary transition-all duration-200 text-base font-medium"
              />
              <GithubButton
                isLoading={isGithubLoading}
                onClick={handleGithubSignIn}
                disabled={isGoogleLoading || isGithubLoading}
                className="w-full h-14 border-2 border-border text-foreground hover:bg-accent hover:border-primary transition-all duration-200 text-base font-medium"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
