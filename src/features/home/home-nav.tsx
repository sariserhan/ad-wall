"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { CreditCard, LayoutDashboard, Moon, Sun, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/use-theme";
import { clerkUserButtonAppearance, clerkUserProfileAppearance } from "@/lib/clerk-appearance";
import { openDashboard } from "@/lib/dashboard-signal";
import { HomePostButton } from "./home-post-button";

export function HomeNav() {
  const { isSignedIn } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isTrending = pathname === "/trending";

  return (
    <header className="home-nav">
      <Link href="/" className="home-nav-brand">
        <strong>LocalWall</strong>
        <small>your local bulletin board</small>
      </Link>
      <nav className="home-nav-right">
        {!isTrending && (
          <Link href="/trending" className="home-nav-trending">
            <TrendingUp size={12} />
            Trending
          </Link>
        )}        
        <HomePostButton />
        {isSignedIn ? (
          <UserButton appearance={clerkUserButtonAppearance} userProfileProps={{ appearance: clerkUserProfileAppearance }}>
            <UserButton.MenuItems>
              <UserButton.Action
                label="My board"
                labelIcon={<LayoutDashboard size={16} />}
                onClick={() => openDashboard()}
              />
              <UserButton.Action
                label="Trending"
                labelIcon={<TrendingUp size={16} />}
                onClick={() => router.push("/trending")}
              />
              <UserButton.Action
                label="Manage billing"
                labelIcon={<CreditCard size={16} />}
                onClick={() => router.push("/billing")}
              />
              <UserButton.Action label="manageAccount" />
              <UserButton.Action
                label={isDark ? "Light mode" : "Dark mode"}
                labelIcon={isDark ? <Sun size={16} /> : <Moon size={16} />}
                onClick={toggleTheme}
              />
              <UserButton.Action label="signOut" />
            </UserButton.MenuItems>
          </UserButton>
        ) : (
          <SignInButton mode="modal">
            <button className="primary home-nav-signin">Sign in</button>
          </SignInButton>
        )}
      </nav>
    </header>
  );
}
