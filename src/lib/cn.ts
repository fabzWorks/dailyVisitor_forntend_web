// cn()  -  joins class names and fixes Tailwind conflicts.   cn('p-2', isOn && 'bg-blue-600', className)
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
