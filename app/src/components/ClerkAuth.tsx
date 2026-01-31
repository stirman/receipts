"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { FileText } from "lucide-react";

export function ClerkAuth() {
  // Check if Clerk is configured
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return null;
  }

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="px-4 py-2 text-sm bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors">
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-9 h-9"
            }
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="My Takes"
              labelIcon={<FileText className="w-4 h-4" />}
              href="/my-takes"
            />
            <UserButton.Action label="manageAccount" />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
    </>
  );
}
