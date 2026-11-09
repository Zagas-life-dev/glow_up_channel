# Bundle Size Optimization Guide

## Current Status
The application uses Next.js 16 with automatic code splitting. However, there are opportunities for further optimization.

## Implemented Optimizations

### 1. Dynamic Imports
Next.js automatically code-splits pages and components. Consider adding dynamic imports for:
- Heavy UI components (charts, editors)
- Third-party libraries that aren't needed on initial load

### 2. Image Optimization
- Next.js Image component is configured
- Images are unoptimized in config (consider enabling for production)

## Recommended Optimizations

### 1. Lazy Load Heavy Components

```typescript
// Instead of:
import { Chart } from 'recharts'

// Use:
const Chart = dynamic(() => import('recharts').then(mod => mod.Chart), {
  ssr: false,
  loading: () => <ChartSkeleton />
})
```

**Components to lazy load:**
- `resource-media-player.tsx` - Only needed on resource pages
- Chart components in analytics
- Rich text editors (if added)

### 2. Tree Shaking

Ensure unused exports are removed:
```typescript
// Good - imports only what's needed
import { Button } from '@/components/ui/button'

// Bad - imports entire library
import * as UI from '@/components/ui'
```

### 3. Bundle Analysis

Run bundle analysis:
```bash
npm run build
npx @next/bundle-analyzer
```

### 4. Optimize Dependencies

**Large dependencies to review:**
- `recharts` - Only import needed chart types
- `lucide-react` - Use tree-shaking (already done)
- `@radix-ui/*` - Already optimized

### 5. Code Splitting Strategies

**Route-based splitting (automatic):**
- Each page in `app/` is automatically split
- Dashboard pages are separate bundles

**Component-based splitting:**
```typescript
// For heavy modals/dialogs
const HeavyModal = dynamic(() => import('./heavy-modal'), {
  loading: () => <ModalSkeleton />
})
```

### 6. Reduce Initial Bundle

**Move to client-side only:**
- Analytics (already using Vercel Analytics)
- Third-party widgets
- Non-critical features

### 7. Optimize Fonts

Current: Using `next/font/google` with Inter - already optimized

### 8. Remove Unused Code

**Check for:**
- Unused imports
- Dead code paths
- Unused dependencies in package.json

## Monitoring

### Build Size Monitoring
```bash
# Check build output
npm run build

# Look for:
# - Large chunks (> 200KB)
# - Duplicate dependencies
# - Unused code warnings
```

### Runtime Performance
- Use Next.js Analytics
- Monitor Core Web Vitals
- Check Lighthouse scores

## Target Metrics

- **Initial JS Bundle**: < 200KB (gzipped)
- **Total JS**: < 500KB (gzipped)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s

## Next Steps

1. ✅ Enable image optimization in production
2. ⏳ Add dynamic imports for heavy components
3. ⏳ Run bundle analyzer and identify large chunks
4. ⏳ Review and optimize large dependencies
5. ⏳ Set up bundle size monitoring in CI/CD
