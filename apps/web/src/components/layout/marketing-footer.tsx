import { Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features Hub", href: "/features" },
    { label: "Reporting", href: "/features/reporting-and-dashboards" },
    { label: "Calendar", href: "/features/calendar-and-timezones" },
    { label: "Integrations", href: "/integrations" }
  ],
  "For Teams": [
    { label: "For Members", href: "/for-members" },
    { label: "For Admins", href: "/for-admins" },
    { label: "Roles Overview", href: "/roles" },
    { label: "Enterprise", href: "/pricing#enterprise" }
  ],
  Resources: [
    { label: "Help Desk", href: "/support" },
    { label: "Documentation", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Changelog", href: "#" }
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "/support" }
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Subprocessors", href: "/privacy" },
    { label: "Refund Policy", href: "/terms" }
  ]
};

export function MarketingFooter() {
  return (
    <footer className="bg-card border-t border-border mt-20 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-16">
          <div className="col-span-2 md:col-span-3 lg:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 group mb-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-premium flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="font-bold text-xl tracking-tight">Kloqra</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Time tracking that actually saves time. Built for modern engineering teams and
              agencies.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-3">
              <h4 className="font-semibold text-sm">{category}</h4>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Kloqra Inc. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <span className="sr-only">Twitter</span>
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <span className="sr-only">GitHub</span>
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <span className="sr-only">LinkedIn</span>
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
