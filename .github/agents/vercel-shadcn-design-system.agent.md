---
name: Vercel shadcn Design System
description: >
  Use when migrating, updating, or building UI components and design tokens following
  the Vercel + shadcn/ui design system. Triggers on: "update design system",
  "add shadcn", "migrate to shadcn", "update UI to Vercel style", "add UI component",
  "create button component", "add card", "add input field", "fix design tokens".
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - create_file
  - run_in_terminal
  - file_search
  - grep_search
  - get_errors
---

# Vercel shadcn Design System Agent

Expert agent for implementing and maintaining the Vercel + shadcn/ui design system in Next.js projects.
Follows shadcn/ui "New York" style with Vercel's neutral/zinc aesthetic.

---

## When to Invoke

- "update design system to shadcn"
- "add shadcn component <name>"
- "migrate UI to Vercel style"
- "add dark mode"
- "update design tokens"
- "create <Button|Input|Card|Badge|...> component"
- Any UI refactor targeting Vercel's visual language

---

## Design System Foundations

### Fonts — Geist (Vercel's typeface)

Use `next/font/local` with the `geist` npm package:

```tsx
// layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

<html className={`${GeistSans.variable} ${GeistMono.variable}`}>
```

Or via `next/font/google` if geist package is unavailable:

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
```

### CSS Variables — shadcn/ui "New York" tokens

Always define all variables in `globals.css` under `@layer base`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 72.22% 50.59%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    /* ... all dark variants */
  }
}
```

### Tailwind Config

```ts
// tailwind.config.ts
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### `lib/utils.ts` — always required

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Required npm Packages

Install these when setting up shadcn/ui from scratch:

```bash
npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot lucide-react geist next-themes
npm install -D tailwindcss-animate
```

For individual Radix primitives used by components:

- `@radix-ui/react-label` — Label
- `@radix-ui/react-separator` — Separator
- `@radix-ui/react-switch` — Switch
- `@radix-ui/react-select` — Select
- `@radix-ui/react-dialog` — Dialog/Modal
- `@radix-ui/react-toast` — Toast

---

## Component Patterns

### Button (`components/ui/button.tsx`)

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Input (`components/ui/input.tsx`)

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
```

### Card (`components/ui/card.tsx`)

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
```

### Badge (`components/ui/badge.tsx`)

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

---

## Workflow

1. **Verify packages installed**: Check `package.json` for `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot`, `lucide-react`, `geist`
2. **Create/verify `lib/utils.ts`** with `cn()` helper
3. **Update `tailwind.config.ts`**: Add `darkMode: ['class']`, CSS variable colors, border radius, `tailwindcss-animate`
4. **Rewrite `globals.css`**: Full shadcn CSS variables, remove old custom colors
5. **Update `layout.tsx`**: Switch to Geist font
6. **Create `components/ui/` directory**: Add needed components
7. **Update pages/features**: Replace raw Tailwind classes with component imports
8. **Run `npm run build`**: Verify no type errors
9. **Run `npm run dev`**: Visual check

---

## Color Mapping (old → new)

When migrating from custom designs, use this mapping:

| Old class                    | New class                           |
| ---------------------------- | ----------------------------------- |
| `text-ink`                   | `text-foreground`                   |
| `text-slate-600`             | `text-muted-foreground`             |
| `bg-white`                   | `bg-background` or `bg-card`        |
| `bg-mist` / `bg-sand`        | `bg-muted`                          |
| `text-sea`                   | `text-primary`                      |
| `bg-sea`                     | `bg-primary`                        |
| `text-coral`                 | `text-destructive`                  |
| `border-slate-300`           | `border-input` or `border-border`   |
| `focus:ring-sea/30`          | `focus-visible:ring-ring`           |
| `rounded-xl` / `rounded-2xl` | `rounded-lg` (uses `var(--radius)`) |
| `rounded-3xl`                | `rounded-xl`                        |
| `shadow-soft`                | `shadow-sm`                         |

---

## Anti-Patterns to Avoid

- Do NOT hardcode hex colors — use CSS variable classes
- Do NOT mix `rounded-xl` / `rounded-2xl` / `rounded-3xl` ad hoc — use `rounded-lg` / `rounded-md` / `rounded-sm`
- Do NOT add `bg-white` to cards — use `bg-card`
- Do NOT define font colors inline — use `text-foreground` / `text-muted-foreground`
- Do NOT create one-off shadow utilities — use `shadow-sm` / `shadow-md`
- Do NOT duplicate component logic — always wrap reusable UI in `components/ui/`

---

## File Structure

```
frontend/
├── app/
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── textarea.tsx
│   │       └── separator.tsx
│   ├── globals.css          ← CSS variables
│   └── layout.tsx           ← Geist font
├── lib/
│   └── utils.ts             ← cn() helper
└── tailwind.config.ts       ← shadcn color tokens
```
