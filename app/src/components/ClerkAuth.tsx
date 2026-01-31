"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { FileText, Shield } from "lucide-react";

const ADMIN_USERNAMES = ["stirman"];

export function ClerkAuth() {
  const { user } = useUser();
  const isAdmin = user?.username && ADMIN_USERNAMES.includes(user.username.toLowerCase());

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
            {isAdmin && (
              <UserButton.Link
                label="Admin"
                labelIcon={<Shield className="w-4 h-4" />}
                href="/admin"
              />
            )}
            <UserButton.Action label="manageAccount" />
          </UserButton.MenuItems>
        </UserButton>
      </SignedIn>
    </>
  );
}
