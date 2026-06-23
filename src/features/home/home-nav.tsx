"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

export function HomeNav() {
  const { isSignedIn } = useAuth();
  return (
    <header className="home-nav">
      <Link href="/" className="home-nav-brand">
        <strong>LocalWall</strong>
        <small>your local bulletin board</small>
      </Link>
      <nav className="home-nav-right">
        <Link href="/us" className="home-nav-link">Browse ads</Link>
        {isSignedIn ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <button className="primary home-nav-signin">Sign in</button>
          </SignInButton>
        )}
      </nav>
    </header>
  );
}
