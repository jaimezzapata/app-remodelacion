import React from "react";

interface IconProps {
  className?: string;
}

export function IconOverview({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="3" y="3" width="8" height="9" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="13" y="10" width="8" height="11" rx="1" />
      <rect x="3" y="14" width="8" height="7" rx="1" />
    </svg>
  );
}

export function IconList({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="square" />
    </svg>
  );
}

export function IconPie({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9l6.5 6.5" strokeLinecap="square" />
    </svg>
  );
}

export function IconPlus({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 5v14M5 12h14" strokeLinecap="square" />
    </svg>
  );
}

export function IconClose({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
    </svg>
  );
}

export function IconSearch({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="square" />
    </svg>
  );
}

export function IconSliders({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 7h16M4 17h16" strokeLinecap="square" />
      <rect x="8" y="4" width="4" height="6" fill="currentColor" />
      <rect x="13" y="14" width="4" height="6" fill="currentColor" />
    </svg>
  );
}

export function IconTrash({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="square" />
    </svg>
  );
}

export function IconChevronRight({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M9 6l6 6-6 6" strokeLinecap="square" />
    </svg>
  );
}
