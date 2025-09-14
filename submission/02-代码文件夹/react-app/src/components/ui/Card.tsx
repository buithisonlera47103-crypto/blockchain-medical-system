import React, { forwardRef } from 'react';

import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      interactive = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = ['rounded-lg', 'transition-all', 'duration-200', 'ease-in-out'];

    const variantClasses = {
      default: [
        'bg-white/80',
        'border',
        'border-gray-200/60',
        'shadow-sm',
        'backdrop-blur-md',
        'dark:bg-gray-800/80',
        'dark:border-gray-700/60',
        'dark:backdrop-blur-md',
      ],
      elevated: [
        'bg-white/90',
        'shadow-xl',
        'shadow-blue-500/5',
        'border',
        'border-white/20',
        'backdrop-blur-lg',
        'dark:bg-gray-800/90',
        'dark:shadow-gray-900/20',
        'dark:border-gray-700/20',
      ],
      outlined: [
        'bg-white/60',
        'border-2',
        'border-blue-200/60',
        'shadow-none',
        'backdrop-blur-sm',
        'dark:bg-gray-800/60',
        'dark:border-blue-700/60',
      ],
      ghost: [
        'bg-gradient-to-br',
        'from-gray-50/80',
        'to-white/60',
        'border-0',
        'shadow-none',
        'backdrop-blur-sm',
        'dark:from-gray-800/60',
        'dark:to-gray-900/40',
      ],
    };

    const paddingClasses = {
      none: [],
      sm: ['p-3'],
      md: ['p-4'],
      lg: ['p-6'],
      xl: ['p-8'],
    };

    const hoverClasses = hover
      ? [
          'hover:shadow-lg',
          'hover:shadow-blue-500/10',
          'hover:-translate-y-2',
          'hover:scale-[1.02]',
          'hover:border-blue-300/60',
          'dark:hover:border-blue-600/60',
        ]
      : [];

    const interactiveClasses = interactive
      ? [
          'cursor-pointer',
          'hover:shadow-xl',
          'hover:shadow-blue-500/15',
          'hover:-translate-y-2',
          'hover:scale-[1.02]',
          'hover:border-blue-300/80',
          'active:translate-y-0',
          'active:scale-100',
          'active:shadow-lg',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-blue-500/50',
          'focus:ring-offset-2',
          'transition-all',
          'duration-300',
          'ease-out',
          'dark:hover:border-blue-600/80',
        ]
      : [];

    const allClasses = [
      ...baseClasses,
      ...variantClasses[variant],
      ...paddingClasses[padding],
      ...hoverClasses,
      ...interactiveClasses,
    ];

    return (
      <div ref={ref} className={cn(allClasses, className)} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card子组件
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, divider = false, children, ...props }, ref) => {
    const classes = [
      'flex',
      'flex-col',
      'space-y-1.5',
      divider && 'pb-4',
      divider && 'border-b',
      divider && 'border-gray-200',
      divider && 'dark:border-gray-700',
    ];

    return (
      <div ref={ref} className={cn(classes, className)} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', children, ...props }, ref) => {
    const classes = [
      'text-lg',
      'font-semibold',
      'leading-none',
      'tracking-tight',
      'text-gray-900',
      'dark:text-gray-100',
    ];

    return (
      <Component ref={ref} className={cn(classes, className)} {...props}>
        {children}
      </Component>
    );
  }
);

CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    const classes = ['text-sm', 'text-gray-600', 'dark:text-gray-400'];

    return (
      <p ref={ref} className={cn(classes, className)} {...props}>
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('pt-0', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  divider?: boolean;
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, divider = false, children, ...props }, ref) => {
    const classes = [
      'flex',
      'items-center',
      divider && 'pt-4',
      divider && 'border-t',
      divider && 'border-gray-200',
      divider && 'dark:border-gray-700',
    ];

    return (
      <div ref={ref} className={cn(classes, className)} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

export default Card;
