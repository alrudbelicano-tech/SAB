# SAB Jewelry Security Specification

## 1. Data Invariants
1. **Exact-Amount Payment Law**: An `/orders/{orderId}` document can NEVER be created unless `amountPaid == totalAmount` and `exactAmountVerified == true` and `status == 'Confirmed'`.
2. **Identity & Ownership Law**: Orders and User Profiles are strictly isolated to `request.auth.uid` or the verified store owner (`alrud.belicano@wvsu.edu.ph` with `email_verified == true`).
3. **Catalog Integrity Law**: Non-admin customers can NEVER create, delete, or alter product prices, titles, or discounts. During checkout, a verified signed-in customer may only decrement `stock` (`incoming.stock >= 0 && incoming.stock < existing.stock`).
4. **PII Isolation Law**: Customer phone numbers, emails, and delivery addresses stored in `/users/{userId}/private/{docId}`, `/orders/{orderId}`, and `/inquiries/{inquiryId}` cannot be read or listed by other customers.
5. **Relational Review Law**: Every review must reference an existing `/products/{productId}` document and bind `userId` to `request.auth.uid`.
6. **Temporal & ID Integrity**: Every document ID must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and `createdAt`/`updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Underpayment Order**: `amountPaid: 400` when `totalAmount: 999` -> MUST FAIL (`PERMISSION_DENIED`).
2. **Overpayment / Unverified Order**: `exactAmountVerified: false` on create -> MUST FAIL (`PERMISSION_DENIED`).
3. **Identity Spoofing on Order**: Authenticated user A submits `userId: "user_B"` -> MUST FAIL (`PERMISSION_DENIED`).
4. **Shadow Field Injection on Product**: Customer adds `isVerified: true` or `discountPercent: 99` during stock decrement -> MUST FAIL (`PERMISSION_DENIED`).
5. **Price Tampering on Checkout**: Customer sets `salePrice: 1` during stock decrement -> MUST FAIL (`PERMISSION_DENIED`).
6. **Admin Privilege Escalation**: Non-admin writes to `/siteSettings/storefront` -> MUST FAIL (`PERMISSION_DENIED`).
7. **Unverified Admin Email Spoof**: User with `email: "alrud.belicano@wvsu.edu.ph"` and `email_verified: false` attempts admin write -> MUST FAIL (`PERMISSION_DENIED`).
8. **Cross-User Order Scraping**: User A runs `list` query on `/orders` without `where('userId', '==', uid)` -> MUST FAIL (`PERMISSION_DENIED`).
9. **Inquiry PII Snooping**: Signed-in non-admin tries `get` or `list` on `/inquiries` -> MUST FAIL (`PERMISSION_DENIED`).
10. **Terminal Order Mutation**: Customer tries to reopen a `'Delivered'` order back to `'Confirmed'` -> MUST FAIL (`PERMISSION_DENIED`).
11. **Orphan Review Creation**: User creates review with `productId: "non_existent_ring"` -> MUST FAIL (`PERMISSION_DENIED`).
12. **ID Poisoning / Payload Exhaustion**: Document ID with 200+ chars or invalid characters (`../admin`) -> MUST FAIL (`PERMISSION_DENIED`).
