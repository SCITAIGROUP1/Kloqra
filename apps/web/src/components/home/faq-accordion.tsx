"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type FAQItem = {
  question: string;
  answer: string;
};

const defaultFaqs: FAQItem[] = [
  {
    question: "Do you offer a free tier?",
    answer: "We offer a fully-featured 14-day free trial so you can test Kloqra with your team. After that, we only offer paid plans because we don't sell your data to make up the difference."
  },
  {
    question: "Can members see what other members are working on?",
    answer: "No. Privacy is a core design principle. Members can only see their own timesheets and data unless they are granted Project Manager or Workspace Admin roles."
  },
  {
    question: "How does the offline tracking work?",
    answer: "The Kloqra timer runs locally in your browser. If you lose connection, your time continues to track perfectly. When your connection is restored, the time is silently synced to our servers."
  },
  {
    question: "Can we export our data if we decide to leave?",
    answer: "Yes, absolutely. We offer a 1-click GDPR compliant export that will download all of your workspaces, users, projects, and time entries in CSV format."
  }
];

export function FAQAccordion({ faqs = defaultFaqs }: { faqs?: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-card/20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know about Kloqra.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 border ${isOpen ? 'border-primary/50 shadow-md shadow-primary/5' : 'border-border/50'}`}
              >
                <button 
                  className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-semibold text-lg">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>
                
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
