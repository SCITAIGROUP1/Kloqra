"use client";

import { useState } from "react";

export function ROICalculator() {
  const [teamSize, setTeamSize] = useState(25);
  const [hourlyRate, setHourlyRate] = useState(150);

  // Assumptions: 
  // - Kloqra recovers 2 hours of billable time per employee per week
  // - 48 working weeks a year
  const recoveredHoursPerWeek = 2;
  const recoveredWeekly = teamSize * recoveredHoursPerWeek * hourlyRate;
  const recoveredYearly = recoveredWeekly * 48;

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Calculate your ROI</h2>
          <p className="text-muted-foreground">See how much revenue you're leaking through manual timesheets.</p>
        </div>

        <div className="glass-card p-8 md:p-12 rounded-3xl border border-primary/20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <label className="flex justify-between text-sm font-medium mb-4">
                  <span>Team Size</span>
                  <span className="text-primary font-bold">{teamSize} members</span>
                </label>
                <input 
                  type="range" 
                  min="5" 
                  max="100" 
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div>
                <label className="flex justify-between text-sm font-medium mb-4">
                  <span>Average Hourly Rate</span>
                  <span className="text-primary font-bold">${hourlyRate}/hr</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="400" 
                  step="10"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground italic">
                *Calculation assumes Kloqra recovers just 2 hours of untracked billable time per team member, per week.
              </p>
            </div>

            <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10 text-center flex flex-col justify-center min-h-[250px]">
              <div className="text-sm font-medium text-muted-foreground mb-2">Potential Recovered Revenue</div>
              <div className="text-5xl font-extrabold text-foreground mb-4">
                ${recoveredYearly.toLocaleString()}
              </div>
              <div className="text-primary text-sm font-bold">Per Year</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
