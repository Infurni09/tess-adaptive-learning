import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  isAuthenticated?: boolean;
  userName?: string;
  onLogout?: () => void;
}

export default function Header({ isAuthenticated = false, userName, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 hover-elevate active-elevate-2 px-3 py-2 rounded-lg -ml-3" data-testid="link-home">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">TESS</span>
          </Link>

          {isAuthenticated ? (
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium hover-elevate active-elevate-2 px-3 py-2 rounded-lg" data-testid="link-dashboard">
                Dashboard
              </Link>
              <Link href="/practice" className="text-sm font-medium hover-elevate active-elevate-2 px-3 py-2 rounded-lg" data-testid="link-practice">
                Practice
              </Link>
              <Link href="/analytics" className="text-sm font-medium hover-elevate active-elevate-2 px-3 py-2 rounded-lg" data-testid="link-analytics">
                Analytics
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">
                        {userName?.slice(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" data-testid="button-login">Login</Button>
              </Link>
              <Link href="/register">
                <Button data-testid="button-register">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
