import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-[#27705c]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-[#174c42] text-white hover:bg-[#123e39]',
        outline:
          'border-[#dfe7e3] bg-white text-[#2d453e] hover:bg-[#f0f5f2]',
        secondary:
          'bg-[#eaf5ef] text-[#174d43] hover:bg-[#d5e9df]',
        ghost:
          'hover:bg-[#f0f5f2] text-[#6c7d78] hover:text-[#15221f]',
        destructive:
          'bg-[#fae6e0] text-[#a55342] hover:bg-[#f7d6cd]',
        link: 'text-[#174c42] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 gap-1.5 px-3 text-xs',
        xs: 'h-6 gap-1 rounded-md px-2 text-[11px]',
        sm: 'h-7 gap-1 rounded-lg px-2.5 text-xs',
        lg: 'h-9 gap-2 px-4 text-sm',
        icon: 'size-8',
        'icon-sm': 'size-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
