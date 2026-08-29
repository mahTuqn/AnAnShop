# Storefront/customer feature status

Updated: 2026-08-29

## Implemented and wired to server

- Customer profile: load/update name, phone and HTTPS avatar URL.
- Password change: current/new password, all sessions revoked by the server.
- Address book: list, create, edit, delete and default address; checkout can select a saved address.
- Catalog: keyword, category, size, price range, rating fallback, sorting and pagination across all backend catalog pages.
- Cart: select/unselect, select all, quantity, remove one, sequential bulk removal, subtotal/shipping estimate, coupon forwarded for server validation.
- Wishlist: add/remove locally and move an in-stock persisted variant to the real cart.
- Checkout: real cart, empty-cart guard, saved/manual address, STANDARD shipping, note, coupon, COD-only payment gate, idempotency and server-side total validation.
- Orders: history/detail plus customer cancel, return request and rebuy actions.
- Reviews: approved reviews list and create flow; server only accepts a product from the customer's delivered order and queues it for moderation.
- Merchandising: related products and recently viewed products. Popular/newest/bestseller/rating sorting is available.

## Deliberate safety gates / remaining external work

- Avatar binary upload is not claimed as complete. The UI accepts an HTTPS URL until S3-compatible object storage, signed upload URLs, malware scanning and lifecycle rules are configured.
- MoMo, VNPay, ZaloPay, Stripe and PayPal remain disabled until provider credentials, signed callbacks/webhooks and reconciliation jobs exist. COD is the only enabled method.
- Express delivery and GHN/GHTK/Viettel Post are not enabled; STANDARD shipping is the only server-supported method.
- Rating/trending labels fall back to display metadata when persisted aggregate review/ranking data is unavailable. Reviews themselves are persisted.
- Wishlist remains device-local. Cross-device wishlist synchronization needs a persisted wishlist table/API.
- Push/SMS/email delivery requires provider configuration; the application must report provider availability rather than fake delivery success.
- Review image uploads currently accept validated HTTPS URLs; binary object-storage upload is the same external dependency as avatar upload.
