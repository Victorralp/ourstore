# Stripe Integration (PAUSED)

The Stripe payment integration has been temporarily paused in this project. This document provides information about the current status and how to re-enable it when needed.

## Current Status

- The Stripe integration components have been disabled but are still present in the codebase
- The checkout page has been reverted to use the original simulated payment flow
- All Stripe-related components and files have been marked with comments indicating they are temporarily disabled

## Disabled Components

The following components have been temporarily disabled:

1. **Stripe Provider**: `components/stripe-provider.tsx`
2. **Stripe Checkout**: `components/stripe-checkout.tsx`
3. **Payment Form**: `components/payment-form.tsx`
4. **Stripe Server Library**: `lib/stripe/stripe-server.ts`
5. **Payment API Route**: `app/api/payments/create-intent/route.ts`

## Re-enabling Stripe Integration

To re-enable the Stripe integration:

1. Ensure you have valid Stripe API keys in your environment variables:
   - `STRIPE_SECRET_KEY` - For server-side operations
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - For client-side operations

2. Update `app/checkout/page.tsx`:
   - Uncomment the Stripe Checkout import
   - Restore a Stripe payment flow alongside Paystack (see `docs/PAYMENTS.md` for how payments now work)

3. Restore `app/api/payments/create-intent/route.ts`:
   - Remove the 503 response
   - Uncomment the original implementation

4. Test the integration thoroughly before deploying to production

## Required Environment Variables

When re-enabling Stripe, ensure these environment variables are set:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Replace the test keys with production keys in production environments.

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe React Components](https://stripe.com/docs/stripe-js/react)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
