import { type ReactNode } from 'react';

interface RTLTextProps {
  children: ReactNode;
  className?: string;
}

export function RTLText({ children, className = '' }: RTLTextProps) {
  return (
    <span className={`dir-rtl text-right ${className}`} dir="rtl">
      {children}
    </span>
  );
}

export function HebrewText({ children, className = '' }: RTLTextProps) {
  return (
    <span className={`dir-rtl text-right font-hebrew ${className}`} dir="rtl" lang="he">
      {children}
    </span>
  );
}
