/**
 * @file    UserProfileDropdown.tsx
 * @what    Header profile avatar button + dropdown menu
 * @who     All authenticated users — shown in AppLayout header and Welcome page
 * @where   src/components/auth/UserProfileDropdown.tsx
 * @why     Single consistent profile access point across all 5 panels
 * @how     Radix DropdownMenu + mock user from auth.ts + LogoutConfirmDialog
 * @note    [JWT] Replace getMockUser() with real useProfile hook when backend ready
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { mockLogout } from "@/lib/auth";

// ── Types ──────────────────────────────────────────────────────────────────
interface UserProfileDropdownProps {
  /** dashboard = circular glass button (Welcome page header)
   *  app       = square muted button (AppLayout sidebar/header) */
  variant?: "dashboard" | "app";
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// [JWT] Replace with real useProfile hook
// Returns mock user data from localStorage token
function getMockUser() {
  const token = localStorage.getItem("4ds_token");
  if (!token) return null;
  return {
    name: "Arjun Mehta",
    email: "arjun@smartops.in",
    role: "Administrator",
    company: "SmartOps Industries Pvt Ltd",
    avatar_url: null as string | null,
  };
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

// ── Component ────────────────────────────────────────────────────────────────
export function UserProfileDropdown({
  variant = "dashboard",
}: UserProfileDropdownProps) {
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // [JWT] Replace with real useProfile hook
  const user = getMockUser();

  const handleLogout = async () => {
    await mockLogout();
    setShowLogoutDialog(false);
    navigate("/auth/login", { replace: true });
  };

  const displayName  = user?.name  ?? "User";
  const displayEmail = user?.email ?? "";
  const initials     = getInitials(displayName);

  // ── Loading / unauthenticated state ────────────────────────────────────
  // [JWT] Replace condition with real loading state from useProfile
  if (!user) {
    return (
      <div
        className={
          variant === "dashboard"
            ? "w-10 h-10 rounded-full bg-muted animate-pulse"
            : "w-9 h-9 rounded-md bg-muted animate-pulse"
        }
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="User menu"
            className={
              variant === "dashboard"
                ? "w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-primary/10 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : "h-9 w-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            }
          >
            <Avatar className={variant === "dashboard" ? "w-8 h-8" : "w-7 h-7"}>
              <AvatarImage
                src={user.avatar_url ?? undefined}
                alt={displayName}
              />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 bg-popover">
          {/* User info header */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage
                  src={user.avatar_url ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-0.5 min-w-0">
                <p className="text-sm font-medium leading-none text-foreground truncate">
                  {displayName}
                </p>
                {displayEmail && (
                  <p className="text-xs leading-none text-muted-foreground truncate max-w-[150px]">
                    {displayEmail}
                  </p>
                )}
                <p className="text-[10px] text-primary/70 font-mono mt-0.5">
                  {user.role}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => navigate("/profile")}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => navigate("/profile?tab=settings")}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowLogoutDialog(true)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogout}
      />
    </>
  );
}
