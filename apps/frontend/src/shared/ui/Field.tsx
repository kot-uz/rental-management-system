import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + validation message wrapper for form fields. */
export function Field({ label, htmlFor, error, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
