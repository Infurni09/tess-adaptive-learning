import { Settings, Sparkles, Clipboard, BarChart, Eye, FileText, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

const menuItems = [
  {
    title: "Diagnostic Engine",
    url: "/diagnostic-test",
    icon: Settings,
  },
  {
    title: "Adaptive Practice Generator",
    url: "/adaptive-practice",
    icon: Sparkles,
  },
  {
    title: "Test Session Interface",
    url: "/practice",
    icon: Clipboard,
  },
  {
    title: "Reports and Analytics Dashboard",
    url: "/dashboard",
    icon: BarChart,
  },
  {
    title: "Proficiency Tracker",
    url: "/analytics",
    icon: Eye,
  },
  {
    title: "Full Report Module",
    url: "/reports",
    icon: FileText,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await queryClient.clear();
    window.location.href = "/api/logout";
  };

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-6 border-b">
          <h1 className="text-4xl font-bold text-primary" data-testid="text-logo">tess</h1>
          {user && (
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-username">
              {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.email || 'User'}
            </p>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent className="pt-4">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    data-active={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <SidebarFooter className="p-4 border-t">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full gap-2"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
