# Payments (Paystack)

Checkout takes real payments through Paystack, in Naira. Customers pay on Paystack's hosted page by card, bank transfer or USSD. Card details are never entered on this site.

## How a payment works

1. **Place order.** At the last checkout step, the browser sends the cart (product ids and quantities only), the delivery details, the chosen delivery option and the total the customer was shown to `POST /api/payments/paystack/initialize`.
2. **Server builds the order.** The server checks the customer's Firebase sign-in, loads every product from Firestore, checks stock, and prices each item the same way the cart does (`price` minus any `discount` %). It adds shipping and 2.5% VAT (`lib/checkout-pricing.ts`). Products from vendor stores that aren't approved are refused. If the total doesn't match what the customer was shown, nothing is created: the customer sees the new total and must confirm it. Otherwise the server creates the order (`paymentStatus: "pending"`) and starts a Paystack transaction for that exact total. Each checkout attempt carries an id from the browser (kept across reloads and tabs until the order is paid or turned down), and the order's id is derived from it and the cart, so a retried or double-clicked request gets the same order and Paystack payment back instead of a second payable one. International delivery needs the customer's country; every other option ships within Nigeria. The order stores the stores selling in it (`vendorIds`) and the delivery option's name (`shippingMethod`). Prices sent by the browser are ignored. The customer's earlier unpaid attempts are marked `paymentStatus: "abandoned"`, `status: "cancelled"`; if one of those is paid after all, it becomes a live order again.
3. **Customer pays.** The customer is redirected to Paystack, pays, and is sent back to `/checkout/verify`.
4. **Payment confirmed.** `/checkout/verify` calls `GET /api/payments/paystack/verify`, which asks Paystack for the payment's real status. If the payment succeeded and the amount charged (Paystack's `requested_amount`, so any fee passed on to the customer doesn't matter) and currency match the order, it marks the order `paid` and takes the items out of stock, both in one Firestore transaction. Only then are the order's items taken out of the cart (anything added since stays) and the order confirmation shown. Paystack's `abandoned` status isn't final (the customer can still pay on the same page), so the order stays pending until a newer checkout replaces it.
5. **Webhook backup.** Paystack also calls `POST /api/payments/paystack/webhook` (signature-checked). That marks the order paid even if the customer closes the tab before returning. Running steps 4 and 5 twice is safe; an order is only marked paid once.

Stock is only reduced when an order is paid, not when it's created, and it isn't reserved in between. If two customers pay for the last unit, the later payment is still recorded as paid, but stock isn't reduced and the order gets `needsRefund: true` (with `stockShortage` details). The same happens if an admin cancelled the order before it was paid. These orders show a **Refund needed** badge on the admin orders page; refund them from the Paystack dashboard. Unpaid Paystack orders, and orders that need a refund, can't be moved to processing, shipped or delivered.

## Configuration

Set these on the server (for local runs, in `.env.local`, which is git-ignored):

| Variable | What it is |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (`sk_test_...` for testing, `sk_live_...` in production). Server-only: never give it a `NEXT_PUBLIC_` (or `VITE_`) prefix, or it ships to every browser. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account email. In Firebase console → Project settings → Service accounts → Generate new private key. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | The `private_key` from the same JSON file. Keep the `\n` line breaks. |
| `NEXT_PUBLIC_SITE_URL` | Recommended. The site's public address, e.g. `https://ruach.store`. Paystack returns customers to `<this>/checkout/verify`. Without it, the address comes from the request's (forwarded) host. |
| `PAYSTACK_CALLBACK_URL` | Optional. Overrides the full return URL. |

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

Checkout refuses products from unapproved stores, and the vendor dashboard only lets approved stores add or edit products. Your `products` rules should enforce the same, so a pending vendor can't write products directly. For example, allow a vendor to write a product only if `get(/databases/$(database)/documents/vendors/$(request.resource.data.vendorId)).data.approved == true` and they own that store.

## Testing

Use your `sk_test_` key and Paystack's test cards, e.g. `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`. See https://paystack.com/docs/payments/test-payments.
