
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Shield, CreditCard, BarChart, Activity, FileText, ShieldAlertIcon, MessageSquareWarning, Zap, SettingsIcon } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/teams", label: "Teams", icon: Users }, 
  { href: "/admin/presentations", label: "Presentations", icon: FileText },
  { href: "/admin/moderation", label: "Moderation Queue", icon: ShieldAlertIcon },
  { href: "/admin/feedback", label: "User Feedback", icon: MessageSquareWarning },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/security", label: "Security Logs", icon: Shield },
  { href: "/admin/stats", label: "AI Analytics", icon: Zap },
  { href: "/admin/activities", label: "Global Activity", icon: Activity },
  { href: "/admin/settings", label: "Platform Settings", icon: SettingsIcon },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1 w-64 border-r pr-3 py-2 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} passHref legacyBehavior>
          <Button
            variant={pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== "/admin") ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start text-sm h-9",
              (pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== "/admin")) && "font-semibold text-primary"
            )}
          >
            <item.icon className="mr-2.5 h-4 w-4" />
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}
    
