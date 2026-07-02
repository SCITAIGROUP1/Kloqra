"use client";

const logos = [
  "ACME Corp",
  "Globex",
  "Soylent",
  "Initech",
  "Umbrella Corp",
  "Stark Ind",
  "Wayne Ent",
  "Cyberdyne",
  "Massive Dynamic"
];

export function SocialMarquee() {
  return (
    <div className="py-10 overflow-hidden bg-background border-b border-border">
      <div className="container mx-auto px-4 mb-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Trusted by 800+ forward-thinking teams
        </p>
      </div>
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
        <div className="flex w-full overflow-hidden">
          <div className="flex w-max animate-marquee-ltr items-center gap-16 px-8">
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <div
                key={i}
                className="flex items-center justify-center w-32 h-12 grayscale opacity-40 hover:opacity-100 transition-opacity font-bold text-xl tracking-tighter"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>

        {/* Gradients for smooth fade out on edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background to-transparent" />
      </div>
    </div>
  );
}
