import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import React, { forwardRef } from 'react';

import { cn } from '../../lib/utils';


// 卡片变体定义
const cardVariants = cva(
  'rounded-lg border bg-white text-neutral-950 transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50',
  {
    variants: {
      variant: {
        default: 'border-neutral-200 shadow-sm hover:shadow-md',
        elevated: 'border-neutral-200 shadow-md hover:shadow-lg hover:-translate-y-1',
        outlined: 'border-2 border-neutral-300 shadow-none hover:border-medical-primary',
        filled: 'bg-neutral-50 border-neutral-200 dark:bg-neutral-900',
        glass: 'bg-glass border-white/20 backdrop-blur-md dark:bg-glass-dark',
        medical:
          'border-medical-primary/20 bg-gradient-to-br from-medical-primary/5 to-medical-secondary/5',
        gradient:
          'bg-gradient-to-br from-white to-neutral-50 border-neutral-200 dark:from-neutral-950 dark:to-neutral-900',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      hover: {
        none: '',
        lift: 'hover:-translate-y-1 hover:shadow-lg',
        scale: 'hover:scale-[1.02]',
        glow: 'hover:shadow-lg hover:shadow-medical-primary/25',
        border: 'hover:border-medical-primary/50',
      },
      clickable: {
        true: 'cursor-pointer transition-transform active:scale-[0.98]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
      hover: 'none',
      clickable: false,
    },
  }
);

const cardHeaderVariants = cva('flex flex-col space-y-1.5', {
  variants: {
    padding: {
      none: 'p-0',
      sm: 'p-4 pb-2',
      default: 'p-6 pb-3',
      lg: 'p-8 pb-4',
      xl: 'p-10 pb-5',
    },
  },
  defaultVariants: {
    padding: 'default',
  },
});

const cardContentVariants = cva('', {
  variants: {
    padding: {
      none: 'p-0',
      sm: 'p-4',
      default: 'p-6 pt-0',
      lg: 'p-8 pt-0',
      xl: 'p-10 pt-0',
    },
  },
  defaultVariants: {
    padding: 'default',
  },
});

const cardFooterVariants = cva('flex items-center', {
  variants: {
    padding: {
      none: 'p-0',
      sm: 'p-4 pt-2',
      default: 'p-6 pt-3',
      lg: 'p-8 pt-4',
      xl: 'p-10 pt-5',
    },
  },
  defaultVariants: {
    padding: 'default',
  },
});

// 主卡片组件
export interface ModernCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  animated?: boolean;
  children?: React.ReactNode;
}

const ModernCard = forwardRef<HTMLDivElement, ModernCardProps>(
  (
    { className, variant, padding, hover, clickable, animated = false, children, ...props },
    ref
  ) => {
    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(cardVariants({ variant, padding, hover, clickable, className }))}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={hover === 'scale' ? { scale: 1.02 } : undefined}
          {...(props as any)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, hover, clickable, className }))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

// 卡片标题组件
export interface ModernCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

const ModernCardHeader = forwardRef<HTMLDivElement, ModernCardHeaderProps>(
  ({ className, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardHeaderVariants({ padding, className }))} {...props} />
  )
);

// 卡片标题文字组件
const ModernCardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  )
);

// 卡片描述组件
const ModernCardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
));

// 卡片内容组件
export interface ModernCardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

const ModernCardContent = forwardRef<HTMLDivElement, ModernCardContentProps>(
  ({ className, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardContentVariants({ padding, className }))} {...props} />
  )
);

// 卡片底部组件
export interface ModernCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const ModernCardFooter = forwardRef<HTMLDivElement, ModernCardFooterProps>(
  ({ className, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardFooterVariants({ padding, className }))} {...props} />
  )
);

ModernCard.displayName = 'ModernCard';
ModernCardHeader.displayName = 'ModernCardHeader';
ModernCardTitle.displayName = 'ModernCardTitle';
ModernCardDescription.displayName = 'ModernCardDescription';
ModernCardContent.displayName = 'ModernCardContent';
ModernCardFooter.displayName = 'ModernCardFooter';

export {
  ModernCard,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
  ModernCardContent,
  ModernCardFooter,
  cardVariants,
};
