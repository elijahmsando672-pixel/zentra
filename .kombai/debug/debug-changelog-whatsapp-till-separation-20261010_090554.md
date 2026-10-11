# Debug changelog — WhatsApp and M-Pesa Till separation

## Changes made

These are permanent changes requested by the engineer, not temporary diagnostic instrumentation.

1. **Separate the WhatsApp contact number from the M-Pesa Till number.**
   - **Files:** `lib/constants/index.ts`, `lib/server/payments.ts`, `lib/services/deposits.ts`, `lib/services/admin.ts`, `prisma/seed.mts`
   - **Change:** Added `whatsappNumber` and `mpesaTillNumber` to the system-settings contact object. The former `contact.mpesaNumber` is treated as a legacy WhatsApp number; it is never treated as a Till. Defaults preserve the old number as WhatsApp and leave the Till blank. Seeded settings start with M-Pesa deposits disabled.
   - **Revert:** Restore the prior `mpesaNumber` schema/type/constants and seeded settings only if the engineer explicitly requests reverting this product behavior.

2. **Configure and gate M-Pesa in admin and deposit flows.**
   - **Files:** `app/admin/(console)/settings/page.tsx`, `app/api/deposits/route.ts`, `app/(dashboard)/wallet/deposit/page.tsx`, `app/(dashboard)/wallet/page.tsx`, `app/(dashboard)/wallet/history/page.tsx`
   - **Change:** Added WhatsApp/Till fields; require a valid Kenyan WhatsApp number; allow Till to remain blank; prevent enabling or initiating M-Pesa deposits until a Till is saved; select PayPal by default when it is the only available method; show an unconfigured notice and the Till where payment instructions appear; made wallet copy neutral when methods vary.
   - **Revert:** Restore prior field names and M-Pesa default behavior only with explicit approval; the admin JSON settings may also need a deliberate migration if reverting persisted data.

3. **Use configured WhatsApp number across contact/support surfaces.**
   - **Files:** `components/shared/whatsapp-contact-link.tsx` (new), `components/layout/public-footer.tsx`, `app/(public)/contact/page.tsx`, `app/(dashboard)/support/page.tsx`
   - **Change:** Public contact, support, and footer links now use the configured WhatsApp value, normalized to an international `wa.me` number. The contact Till card clearly says “Not configured” until populated.
   - **Revert:** Restore static WhatsApp constants and remove the shared link component only with explicit approval.

4. **Align public payment guidance.**
   - **Files:** `app/(public)/page.tsx`, `app/(public)/how-it-works/page.tsx`, `app/(public)/faq/page.tsx`, `app/(public)/terms/page.tsx`, `lib/constants/index.ts`
   - **Change:** Reworded payment claims to reflect configurable methods and the Till requirement; updated M-Pesa method description.
   - **Revert:** Restore previous marketing copy only if the old claim is intended.

## Temporary diagnostics

None. No logging, mock data, route stubs, or temporary code changes were added.

## Revert status

No temporary debugging changes require cleanup. The listed changes implement the engineer-approved behavior and should not be reverted as debug instrumentation.
