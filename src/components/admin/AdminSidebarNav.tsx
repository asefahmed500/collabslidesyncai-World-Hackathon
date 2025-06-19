
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Shield, CreditCard, BarChart, Activity, FileText, ShieldAlertIcon, MessageSquareWarning } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/teams", label: "Teams", icon: Users },
  { href: "/admin/presentations", label: "Presentations", icon: FileText },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlertIcon },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareWarning },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/security", label: "Security", icon: Shield },
  { href: "/admin/stats", label: "Statistics", icon: BarChart },
  { href: "/admin/activities", label: "Activities", icon: Activity },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-2 w-64 border-r pr-4">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} passHref legacyBehavior>
          <Button
            variant={pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== "/admin") ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              (pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== "/admin")) && "font-semibold"
            )}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}
    
