# Main Application Routes

## Module Info

| Property | Value |
|----------|-------|
| Domain | main |
| Source Files | server/routes.ts |
| Endpoint Count | 184 |

## Auth & Authorization

| Property | Value |
|----------|-------|
| Auth Required | TBD |
| Roles Allowed | TBD |

## Notes

_Add manual documentation notes here. This section is preserved during sync._


<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `GET` | `/api/admin/affiliate-invites` | server/routes.ts | 2667 |
| `POST` | `/api/admin/affiliate-invites` | server/routes.ts | 2711 |
| `DELETE` | `/api/admin/affiliate-invites/:id` | server/routes.ts | 2751 |
| `POST` | `/api/admin/affiliate-invites/send` | server/routes.ts | 2781 |
| `GET` | `/api/admin/affiliate-payouts/batches/:batchId` | server/routes.ts | 3013 |
| `POST` | `/api/admin/affiliate-payouts/run` | server/routes.ts | 2978 |
| `GET` | `/api/admin/affiliate-settings` | server/routes.ts | 2567 |
| `PATCH` | `/api/admin/affiliate-settings` | server/routes.ts | 2586 |
| `GET` | `/api/admin/affiliates` | server/routes.ts | 2596 |
| `GET` | `/api/admin/affiliates/:id` | server/routes.ts | 2615 |
| `PATCH` | `/api/admin/affiliates/:id` | server/routes.ts | 2634 |
| `POST` | `/api/admin/ai/generate-content` | server/routes.ts | 3992 |
| `GET` | `/api/admin/audit-logs` | server/routes.ts | 4539 |
| `GET` | `/api/admin/categories` | server/routes.ts | 3616 |
| `POST` | `/api/admin/categories` | server/routes.ts | 3625 |
| `PATCH` | `/api/admin/categories/:id` | server/routes.ts | 3634 |
| `DELETE` | `/api/admin/categories/:id` | server/routes.ts | 3646 |
| `GET` | `/api/admin/check-setup` | server/routes.ts | 1166 |
| `GET` | `/api/admin/coupons` | server/routes.ts | 3511 |
| `POST` | `/api/admin/coupons` | server/routes.ts | 3520 |
| `PATCH` | `/api/admin/coupons/:id` | server/routes.ts | 3532 |
| `DELETE` | `/api/admin/coupons/:id` | server/routes.ts | 3544 |
| `GET` | `/api/admin/customers/:customerId/audit-logs` | server/routes.ts | 4680 |
| `POST` | `/api/admin/customers/:customerId/disable` | server/routes.ts | 4690 |
| `POST` | `/api/admin/customers/:customerId/enable` | server/routes.ts | 4717 |
| `POST` | `/api/admin/customers/:customerId/force-logout` | server/routes.ts | 4811 |
| `GET` | `/api/admin/customers/:customerId/notes` | server/routes.ts | 4585 |
| `POST` | `/api/admin/customers/:customerId/notes` | server/routes.ts | 4594 |
| `DELETE` | `/api/admin/customers/:customerId/notes/:noteId` | server/routes.ts | 4608 |
| `GET` | `/api/admin/customers/:customerId/orders` | server/routes.ts | 4666 |
| `GET` | `/api/admin/customers/:customerId/profile` | server/routes.ts | 4618 |
| `POST` | `/api/admin/customers/:customerId/reset-password` | server/routes.ts | 4771 |
| `POST` | `/api/admin/customers/:customerId/send-password-reset` | server/routes.ts | 4745 |
| `GET` | `/api/admin/customers/:customerId/tags` | server/routes.ts | 4631 |
| `PUT` | `/api/admin/customers/:customerId/tags` | server/routes.ts | 4640 |
| `GET` | `/api/admin/dashboard` | server/routes.ts | 3490 |
| `GET` | `/api/admin/docs` | server/routes.ts | 4950 |
| `POST` | `/api/admin/docs` | server/routes.ts | 4991 |
| `GET` | `/api/admin/docs/:id` | server/routes.ts | 4965 |
| `PATCH` | `/api/admin/docs/:id` | server/routes.ts | 5019 |
| `DELETE` | `/api/admin/docs/:id` | server/routes.ts | 5048 |
| `POST` | `/api/admin/docs/:id/publish` | server/routes.ts | 5058 |
| `POST` | `/api/admin/docs/:id/restore/:versionId` | server/routes.ts | 5082 |
| `GET` | `/api/admin/docs/:id/versions` | server/routes.ts | 5072 |
| `POST` | `/api/admin/docs/generate` | server/routes.ts | 5108 |
| `GET` | `/api/admin/docs/health` | server/routes.ts | 5131 |
| `GET` | `/api/admin/docs/slug/:slug` | server/routes.ts | 4978 |
| `GET` | `/api/admin/email-events` | server/routes.ts | 4356 |
| `GET` | `/api/admin/email-templates` | server/routes.ts | 4470 |
| `POST` | `/api/admin/email-templates` | server/routes.ts | 4479 |
| `PATCH` | `/api/admin/email-templates/:id` | server/routes.ts | 4488 |
| `GET` | `/api/admin/integrations` | server/routes.ts | 1347 |
| `POST` | `/api/admin/integrations/pinterest-shopping/sync` | server/routes.ts | 1961 |
| `POST` | `/api/admin/integrations/snapchat-shopping/sync` | server/routes.ts | 2159 |
| `POST` | `/api/admin/integrations/x-shopping/sync` | server/routes.ts | 2258 |
| `POST` | `/api/admin/integrations/youtube-shopping/sync` | server/routes.ts | 2060 |
| `GET` | `/api/admin/inventory` | server/routes.ts | 4502 |
| `GET` | `/api/admin/inventory/:productId` | server/routes.ts | 4511 |
| `PATCH` | `/api/admin/inventory/:productId` | server/routes.ts | 4520 |
| `POST` | `/api/admin/jobs/:jobName/run` | server/routes.ts | 4561 |
| `GET` | `/api/admin/jobs/status` | server/routes.ts | 4551 |
| `POST` | `/api/admin/login` | server/routes.ts | 1211 |
| `POST` | `/api/admin/logout` | server/routes.ts | 1237 |
| `GET` | `/api/admin/me` | server/routes.ts | 1247 |
| `GET` | `/api/admin/orders` | server/routes.ts | 1264 |
| `POST` | `/api/admin/orders` | server/routes.ts | 2505 |
| `GET` | `/api/admin/orders/:id` | server/routes.ts | 1285 |
| `PATCH` | `/api/admin/orders/:id` | server/routes.ts | 1302 |
| `POST` | `/api/admin/orders/:orderId/refunds` | server/routes.ts | 4378 |
| `GET` | `/api/admin/orders/:orderId/shipments` | server/routes.ts | 4261 |
| `POST` | `/api/admin/orders/:orderId/shipments` | server/routes.ts | 4270 |
| `GET` | `/api/admin/page-templates` | server/routes.ts | 4037 |
| `GET` | `/api/admin/page-templates/:id` | server/routes.ts | 4046 |
| `GET` | `/api/admin/pages` | server/routes.ts | 3657 |
| `POST` | `/api/admin/pages` | server/routes.ts | 3678 |
| `GET` | `/api/admin/pages/:id` | server/routes.ts | 3666 |
| `PATCH` | `/api/admin/pages/:id` | server/routes.ts | 3703 |
| `DELETE` | `/api/admin/pages/:id` | server/routes.ts | 3737 |
| `GET` | `/api/admin/pages/:id/export` | server/routes.ts | 3771 |
| `POST` | `/api/admin/pages/:id/set-home` | server/routes.ts | 3746 |
| `POST` | `/api/admin/pages/:id/set-shop` | server/routes.ts | 3758 |
| `POST` | `/api/admin/pages/generate-seo` | server/routes.ts | 3958 |
| `POST` | `/api/admin/pages/import` | server/routes.ts | 3820 |
| `GET` | `/api/admin/payouts` | server/routes.ts | 2890 |
| `PATCH` | `/api/admin/payouts/:id` | server/routes.ts | 2927 |
| `GET` | `/api/admin/refunds` | server/routes.ts | 4369 |
| `PATCH` | `/api/admin/refunds/:id` | server/routes.ts | 4411 |
| `GET` | `/api/admin/reports/customers` | server/routes.ts | 4889 |
| `GET` | `/api/admin/reports/export` | server/routes.ts | 4913 |
| `GET` | `/api/admin/reports/products` | server/routes.ts | 4880 |
| `GET` | `/api/admin/reports/sales` | server/routes.ts | 4845 |
| `GET` | `/api/admin/saved-sections` | server/routes.ts | 4060 |
| `POST` | `/api/admin/saved-sections` | server/routes.ts | 4084 |
| `GET` | `/api/admin/saved-sections/:id` | server/routes.ts | 4072 |
| `PATCH` | `/api/admin/saved-sections/:id` | server/routes.ts | 4093 |
| `DELETE` | `/api/admin/saved-sections/:id` | server/routes.ts | 4105 |
| `POST` | `/api/admin/seed` | server/routes.ts | 3477 |
| `GET` | `/api/admin/settings` | server/routes.ts | 1334 |
| `PATCH` | `/api/admin/settings` | server/routes.ts | 1381 |
| `GET` | `/api/admin/settings/email` | server/routes.ts | 1393 |
| `PATCH` | `/api/admin/settings/email` | server/routes.ts | 1416 |
| `POST` | `/api/admin/settings/email/test` | server/routes.ts | 1466 |
| `POST` | `/api/admin/settings/email/verify` | server/routes.ts | 1487 |
| `GET` | `/api/admin/settings/instagram-shop` | server/routes.ts | 1822 |
| `PATCH` | `/api/admin/settings/instagram-shop` | server/routes.ts | 1837 |
| `DELETE` | `/api/admin/settings/instagram-shop` | server/routes.ts | 1878 |
| `POST` | `/api/admin/settings/instagram-shop/verify` | server/routes.ts | 1868 |
| `GET` | `/api/admin/settings/mailchimp` | server/routes.ts | 2292 |
| `PATCH` | `/api/admin/settings/mailchimp` | server/routes.ts | 2309 |
| `DELETE` | `/api/admin/settings/mailchimp` | server/routes.ts | 2351 |
| `POST` | `/api/admin/settings/mailchimp/verify` | server/routes.ts | 2341 |
| `GET` | `/api/admin/settings/openai` | server/routes.ts | 1602 |
| `PATCH` | `/api/admin/settings/openai` | server/routes.ts | 1618 |
| `DELETE` | `/api/admin/settings/openai` | server/routes.ts | 1650 |
| `GET` | `/api/admin/settings/pinterest-shopping` | server/routes.ts | 1896 |
| `PATCH` | `/api/admin/settings/pinterest-shopping` | server/routes.ts | 1916 |
| `DELETE` | `/api/admin/settings/pinterest-shopping` | server/routes.ts | 1971 |
| `POST` | `/api/admin/settings/pinterest-shopping/verify` | server/routes.ts | 1951 |
| `GET` | `/api/admin/settings/r2` | server/routes.ts | 1671 |
| `PATCH` | `/api/admin/settings/r2` | server/routes.ts | 1691 |
| `GET` | `/api/admin/settings/snapchat-shopping` | server/routes.ts | 2094 |
| `PATCH` | `/api/admin/settings/snapchat-shopping` | server/routes.ts | 2114 |
| `DELETE` | `/api/admin/settings/snapchat-shopping` | server/routes.ts | 2169 |
| `POST` | `/api/admin/settings/snapchat-shopping/verify` | server/routes.ts | 2149 |
| `GET` | `/api/admin/settings/stripe` | server/routes.ts | 1500 |
| `PATCH` | `/api/admin/settings/stripe` | server/routes.ts | 1521 |
| `POST` | `/api/admin/settings/stripe/validate` | server/routes.ts | 1581 |
| `GET` | `/api/admin/settings/tiktok-shop` | server/routes.ts | 1742 |
| `PATCH` | `/api/admin/settings/tiktok-shop` | server/routes.ts | 1759 |
| `DELETE` | `/api/admin/settings/tiktok-shop` | server/routes.ts | 1802 |
| `POST` | `/api/admin/settings/tiktok-shop/verify` | server/routes.ts | 1792 |
| `GET` | `/api/admin/settings/x-shopping` | server/routes.ts | 2193 |
| `PATCH` | `/api/admin/settings/x-shopping` | server/routes.ts | 2213 |
| `DELETE` | `/api/admin/settings/x-shopping` | server/routes.ts | 2268 |
| `POST` | `/api/admin/settings/x-shopping/verify` | server/routes.ts | 2248 |
| `GET` | `/api/admin/settings/youtube-shopping` | server/routes.ts | 1995 |
| `PATCH` | `/api/admin/settings/youtube-shopping` | server/routes.ts | 2015 |
| `DELETE` | `/api/admin/settings/youtube-shopping` | server/routes.ts | 2070 |
| `POST` | `/api/admin/settings/youtube-shopping/verify` | server/routes.ts | 2050 |
| `POST` | `/api/admin/setup` | server/routes.ts | 1176 |
| `PATCH` | `/api/admin/shipments/:id` | server/routes.ts | 4309 |
| `POST` | `/api/admin/shipments/:id/resend-email` | server/routes.ts | 4321 |
| `GET` | `/api/admin/shipping/rates` | server/routes.ts | 4219 |
| `POST` | `/api/admin/shipping/rates` | server/routes.ts | 4229 |
| `PATCH` | `/api/admin/shipping/rates/:id` | server/routes.ts | 4238 |
| `DELETE` | `/api/admin/shipping/rates/:id` | server/routes.ts | 4250 |
| `GET` | `/api/admin/shipping/zones` | server/routes.ts | 4180 |
| `POST` | `/api/admin/shipping/zones` | server/routes.ts | 4189 |
| `PATCH` | `/api/admin/shipping/zones/:id` | server/routes.ts | 4198 |
| `DELETE` | `/api/admin/shipping/zones/:id` | server/routes.ts | 4210 |
| `GET` | `/api/admin/team` | server/routes.ts | 2373 |
| `POST` | `/api/admin/team` | server/routes.ts | 2390 |
| `PATCH` | `/api/admin/team/:id` | server/routes.ts | 2438 |
| `DELETE` | `/api/admin/team/:id` | server/routes.ts | 2485 |
| `GET` | `/api/admin/theme` | server/routes.ts | 4440 |
| `PATCH` | `/api/admin/theme` | server/routes.ts | 4449 |
| `GET` | `/api/affiliate/agreement` | server/routes.ts | 3065 |
| `POST` | `/api/checkout` | server/routes.ts | 441 |
| `POST` | `/api/confirm-payment` | server/routes.ts | 343 |
| `POST` | `/api/coupons/validate` | server/routes.ts | 3554 |
| `POST` | `/api/create-payment-intent` | server/routes.ts | 167 |
| `GET` | `/api/customer/affiliate` | server/routes.ts | 3080 |
| `POST` | `/api/customer/affiliate` | server/routes.ts | 3198 |
| `PATCH` | `/api/customer/affiliate` | server/routes.ts | 3311 |
| `POST` | `/api/customer/affiliate/connect/start` | server/routes.ts | 3334 |
| `GET` | `/api/customer/affiliate/connect/status` | server/routes.ts | 3401 |
| `POST` | `/api/customer/affiliate/payout` | server/routes.ts | 3270 |
| `POST` | `/api/customer/change-password` | server/routes.ts | 1140 |
| `POST` | `/api/customer/link` | server/routes.ts | 1004 |
| `GET` | `/api/customer/orders` | server/routes.ts | 940 |
| `GET` | `/api/customer/orders/:id` | server/routes.ts | 966 |
| `GET` | `/api/customer/profile` | server/routes.ts | 1072 |
| `PATCH` | `/api/customer/profile` | server/routes.ts | 1089 |
| `GET` | `/api/orders/by-session/:sessionId` | server/routes.ts | 988 |
| `GET` | `/api/pages` | server/routes.ts | 4133 |
| `GET` | `/api/pages/:slug` | server/routes.ts | 4166 |
| `GET` | `/api/pages/home` | server/routes.ts | 4142 |
| `GET` | `/api/pages/shop` | server/routes.ts | 4154 |
| `GET` | `/api/site-settings` | server/routes.ts | 4115 |
| `GET` | `/api/stripe/config` | server/routes.ts | 140 |
| `GET` | `/api/theme` | server/routes.ts | 4459 |
| `GET` | `/api/validate-referral-code/:code` | server/routes.ts | 149 |
| `POST` | `/api/webhook/stripe` | server/routes.ts | 631 |
| `POST` | `/api/webhook/stripe-connect` | server/routes.ts | 781 |

_184 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
