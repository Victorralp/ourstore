# Payments (Paystack)

Checkout takes real payments through Paystack, in Naira. Customers pay on Paystack's hosted page by card, bank transfer or USSD. Card details are never entered on this site.

## How a payment works

1. **Place order.** At the last checkout step, the browser sends the cart (product ids and quantities only), the delivery details and the chosen delivery option to `POST /api/payments/paystack/initialize`.
2. **Server builds the order.** The server checks the customer's Firebase sign-in, loads every product from Firestore, checks stock, and prices each item the same way the cart does (`price` minus any `discount` %). It adds shipping and 2.5% VAT (`lib/checkout-pricing.ts`). It then creates the order (`paymentStatus: "pending"`) and starts a Paystack transaction for that exact total. Prices sent by the browser are ignored.
3. **Customer pays.** The customer is redirected to Paystack, pays, and is sent back to `/checkout/verify`.
4. **Payment confirmed.** `/checkout/verify` calls `GET /api/payments/paystack/verify`, which asks Paystack for the payment's real status. If the payment succeeded and the amount and currency match the order, it marks the order `paid` and takes the items out of stock, both in one Firestore transaction. Only then is the cart cleared and the order confirmation shown.
5. **Webhook backup.** Paystack also calls `POST /api/payments/paystack/webhook` (signature-checked). That marks the order paid even if the customer closes the tab before returning. Running steps 4 and 5 twice is safe; an order is only marked paid once.

Stock is now only reduced when an order is paid, not when it's created.

## Configuration

Set these on the server (for local runs, in `.env.local`, which is git-ignored):

| Variable | What it is |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (`sk_test_...` for testing, `sk_live_...` in production). Server-only: never give it a `NEXT_PUBLIC_` (or `VITE_`) prefix, or it ships to every browser. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account email. In Firebase console → Project settings → Service accounts → Generate new private key. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | The `private_key` from the same JSON file. Keep the `\n` line breaks. |
| `PAYSTACK_CALLBACK_URL` | Optional. Where Paystack returns customers. Defaults to `/checkout/verify` on the site the request came from. |

Without the Paystack key or the Firebase Admin credentials, the payment routes return "Online payments aren't set up yet" and no order is created.

In the Paystack dashboard (Settings → API Keys & Webhooks), set the webhook URL to:

```
https://<your-domain>/api/payments/paystack/webhook
```

## Firestore rules

Orders are now created and marked paid by the server, which bypasses security rules. Customers should be able to read their own orders, and nothing else:

```
match /orders/{orderId} {
  allow read: if request.auth != null && (resource.data.userId == request.auth.uid || isAdmin());
  // Created and paid only by the server; admins update fulfilment status
  allow create: if false;
  allow update: if isAdmin()
    && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(["paymentStatus", "paymentReference", "total", "items", "userId"]);
  allow delete: if false;
}
```

(`isAdmin()` as defined in `docs/KYC.md`.) Without rules like these, a signed-in user could write `paymentStatus: "paid"` on their own order from the browser.

## Testing

Use your `sk_test_` key and Paystack's test cards, e.g. `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`. See https://paystack.com/docs/payments/test-payments.
