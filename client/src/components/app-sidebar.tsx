import { Settings, Sparkles, Clipboard, BarChart, Eye, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-6 border-b">
          <h1 className="text-4xl font-bold text-primary" data-testid="text-logo">tess</h1>
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
    </Sidebar>
  );
}
