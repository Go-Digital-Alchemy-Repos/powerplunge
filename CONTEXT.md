# Power Plunge Commerce

Commerce language for Power Plunge customer orders, payment completion, fulfillment readiness, and related post-payment obligations.

## Language

**Order finalization**:
The business moment when a payable Order has become paid and the store owes the post-payment obligations associated with that sale. These obligations include customer confirmation, fulfillment readiness, attribution, and discount redemption.
_Avoid_: Payment confirmation, checkout completion

**Payment authority**:
A trusted payment-system fact that proves a payable Order has been paid. Stripe webhook events are the reliable authority; server-verified Stripe state can also support immediate customer-facing completion.
_Avoid_: Client callback, browser confirmation

**Post-payment obligations**:
The business obligations Power Plunge owes after an Order becomes paid. They include notifying the customer, notifying fulfillment, recording attribution, recording discount redemption, and preparing the Order for fulfillment.
_Avoid_: Side effects, after-payment tasks

**Finalization claim**:
A durable claim that one process owns finalizing an Order. The claim prevents concurrent payment triggers from performing the same Order finalization more than once.
_Avoid_: Status check, webhook dedupe

**Account linking**:
Reassignment of pre-auth Orders from other customer rows with the same normalized email to the authenticated customer. Account linking also marks the donor customer rows as merged into the authenticated customer. It is unrelated to the Finalization claim.
_Avoid_: Order claim, finalization claim

**Obligation ledger**:
A durable per-Order record of post-payment obligations and whether each one has been completed. The ledger lets finalization resume safely without repeating obligations that already succeeded.
_Avoid_: Side-effect flags, email sent checks

**Delivery dedupe**:
Protection against processing the same external event delivery more than once. Delivery dedupe is not the same as business idempotency for Order finalization.
_Avoid_: Idempotency, finalization lock

**Paid-state gate**:
The payment proof required before an Order may become paid. For Stripe payments, this means trusted server-side Stripe state showing success for the expected Order, amount, and currency.
_Avoid_: Successful checkout page, client success

**Retryable obligation**:
A post-payment obligation that can fail after an Order becomes paid and should be attempted again without changing whether the Order is paid.
_Avoid_: Blocking side effect, best-effort task

**Manual reconciliation**:
Human review required when a retryable obligation reaches a terminal failure or cannot be safely completed automatically.
_Avoid_: Silent failure, ignored error

**Fulfillment notification**:
The internal notice that a paid Order is ready for fulfillment work.
_Avoid_: Admin email, order notification

**Commission decision**:
The outcome of evaluating affiliate credit for a paid Order. A commission decision may create a pending commission, flag a commission for review, block it, or record that no commission applies.
_Avoid_: Commission insert, referral row
