# Identity verification (KYC)

Vendors and service providers verify their identity with their National Identification Number (NIN). An admin reviews each submission by hand and approves or rejects it.

## How it works

- **Sellers** submit their legal name, date of birth and NIN at `/verification`. Name and date of birth are what an admin checks the NIN against.
- **Vendor and service provider dashboards** show a banner until the seller is verified. Nobody is blocked: unverified sellers keep selling, but they can't receive payouts.
- **Admins** review submissions at `/admin/kyc`. The list masks NINs, and the review dialog can reveal the full number. Rejections need a reason, which the seller sees and can fix and resubmit.
- **One record per person** (`kyc/{uid}`), not per store. A seller who is both a vendor and a service provider verifies once.

## Payouts

There is no payouts flow yet. When one is built, it must check `isKycApproved(record)` from `lib/firebase-kyc.ts` and refuse to pay anyone who isn't approved. Enforce this on the server, for example in a Cloud Function or an API route using the Admin SDK. A check in the browser alone can be bypassed.

## Firestore security rules

KYC records hold personal data, so they live in their own `kyc` collection, separate from the publicly readable `vendors` and `serviceProviders` documents. Add these rules to your Firestore rules (they aren't in this repo):

```
match /kyc/{uid} {
  function isAdmin() {
    return request.auth != null && (
      request.auth.token.admin == true ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"
    );
  }

  function isOwner() {
    return request.auth != null && request.auth.uid == uid;
  }

  // What an owner is allowed to write: their own details, sent for review
  function isValidSubmission() {
    let data = request.resource.data;
    return data.keys().hasOnly(["uid", "email", "firstName", "middleName", "lastName",
                                "dateOfBirth", "nin", "status", "rejectionReason",
                                "submittedAt", "reviewedAt", "reviewedBy"])
      && data.uid == uid
      && data.status == "pending"
      && data.nin is string && data.nin.matches("^[0-9]{11}$")
      && data.rejectionReason == ""
      && data.reviewedAt == null
      && data.reviewedBy == ""
      && data.submittedAt == request.time;
  }

  allow read: if isOwner() || isAdmin();
  // Owners can submit, or resubmit after a rejection, but can never approve
  // themselves or change an approved record
  allow create: if isOwner() && isValidSubmission();
  allow update: if (isOwner() && resource.data.status != "approved" && isValidSubmission())
                || isAdmin();
  allow delete: if false;
}
```

Without these rules, depending on your current defaults, either submissions will fail or anyone signed in could read other people's NINs or approve themselves.

## Data protection

NINs are personal data under the Nigeria Data Protection Act. The form asks for consent before submitting. Only the owner and admins can read a record. Decide how long to keep records after an account closes, and say so in your privacy policy.
