"use client";

import { Button } from "@kloqra/ui";
import { Menu, X, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/features", label: "Features" },
  { href: "/for-members", label: "For Members" },
  { href: "/for-admins", label: "For Admins" },
  { href: "/roles", label: "Roles" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" }
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-panel py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-premium flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <span className="text-white font-bold text-lg">K</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Kloqra</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 md:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {item.label}
              {(pathname === item.href || pathname.startsWith(item.href + "/")) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link
            href="http://localhost:3000/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log In
          </Link>
          <Button
            asChild
            className="bg-white text-black hover:bg-white/90 relative overflow-hidden group"
          >
            <Link href="http://localhost:3000/register">
              <span className="relative z-10 font-semibold">Start Free Trial</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shimmer" />
            </Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div
        className={`md:hidden fixed inset-x-0 top-[60px] bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-2xl transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? "max-h-[calc(100vh-60px)] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between p-3 rounded-lg text-lg font-medium transition-colors ${
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
              <ChevronRight className="h-4 w-4 opacity-50" />
            </Link>
          ))}
          <div className="h-px bg-border my-2" />
          <div className="flex flex-col gap-3">
            <Button variant="outline" asChild className="w-full justify-center text-base py-6">
              <Link href="http://localhost:3000/login">Log In</Link>
            </Button>
            <Button asChild className="w-full justify-center text-base py-6 bg-white text-black">
              <Link href="http://localhost:3000/register">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
