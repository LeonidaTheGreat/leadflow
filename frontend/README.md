# LeadFlow Form Components

A reusable, type-safe form component library built with React, TypeScript, React Hook Form, Zod, and Tailwind CSS.

## Features

- **Type-Safe**: Full TypeScript support with strict type checking
- **Validation**: Powered by Zod schema validation
- **Accessible**: ARIA labels, keyboard navigation, and screen reader support
- **Styled**: Tailwind CSS with customizable design tokens
- **Tested**: Comprehensive test coverage with Vitest
- **Composable**: Mix and match components for flexible form layouts

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run tests
npm test

# Run tests with UI
npm run test:ui
```

## Components

### TextField

A text input component with label, validation, and error display.

```tsx
import { TextField } from '@/components/forms'

<TextField
  name="email"
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  required
  helperText="We'll never share your email"
/>
```

### SelectField

A dropdown select component with options, label, and validation.

```tsx
import { SelectField } from '@/components/forms'

const options = [
  { value: "us", label: "United States" },
  { value: "ca", label: "Canada" },
]

<SelectField
  name="country"
  label="Country"
  options={options}
  placeholder="Select a country"
  required
/>
```

### CheckboxField

A checkbox component with label and validation support.

```tsx
import { CheckboxField } from '@/components/forms'

<CheckboxField
  name="terms"
  label="I agree to the terms and conditions"
  required
/>
```

### FormWizard

A multi-step form wizard with progress indicator and navigation.

```tsx
import { FormWizard, FormStep } from '@/components/forms'

const steps: FormStep[] = [
  {
    id: "personal",
    title: "Personal Info",
    fields: ["firstName", "lastName"],
    component: (
      <>
        <TextField name="firstName" label="First Name" />
        <TextField name="lastName" label="Last Name" />
      </>
    ),
  },
  // ... more steps
]

<FormWizard
  steps={steps}
  onComplete={(data) => console.log(data)}
  onCancel={() => console.log('Cancelled')}
/>
```

### FormProvider

Wrap your form with FormProvider to enable React Hook Form context.

```tsx
import { FormProvider } from '@/components/forms'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

<FormProvider
  schema={schema}
  onSubmit={(data) => console.log(data)}
>
  {/* Your form fields */}
</FormProvider>
```

## Validation

Validation is handled by Zod schemas. Define your schema and pass it to FormProvider:

```tsx
import { z } from 'zod'
import { agentOnboardingSchema } from '@/lib/validation'

// Or create your own
const mySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  age: z.number().min(18, "Must be 18 or older"),
})
```

## Example: Agent Onboarding

See `src/examples/AgentOnboardingWizard.tsx` for a complete example of a 4-step onboarding flow.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── forms/          # Form components
│   │   │   ├── TextField.tsx
│   │   │   ├── SelectField.tsx
│   │   │   ├── CheckboxField.tsx
│   │   │   ├── FormWizard.tsx
│   │   │   ├── FormProvider.tsx
│   │   │   └── index.ts
│   │   └── ui/             # Base UI components
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── checkbox.tsx
│   │       └── label.tsx
│   ├── lib/
│   │   ├── utils.ts        # Utility functions (cn)
│   │   └── validation.ts   # Zod schemas
│   ├── examples/
│   │   └── AgentOnboardingWizard.tsx
│   ├── main.tsx
│   └── index.css
├── __tests__/              # Test files
│   ├── setup.ts
│   ├── TextField.test.tsx
│   ├── SelectField.test.tsx
│   ├── CheckboxField.test.tsx
│   └── FormWizard.test.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Design System

The components use Tailwind CSS with a design system based on CSS variables:

- `--background`: Page background
- `--foreground`: Primary text color
- `--primary`: Primary button/brand color
- `--secondary`: Secondary elements
- `--muted`: Subdued text/backgrounds
- `--border`: Border colors
- `--destructive`: Error states

All components support dark mode via the `.dark` class.

## Testing

Tests are written with Vitest and React Testing Library:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Private - LeadFlow Internal Use
