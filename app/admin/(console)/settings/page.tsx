"use client";

import * as React from "react";
import { toast } from "sonner";
import { CreditCard, Database, Gauge, Info, Save, Settings2, ShieldAlert, SlidersHorizontal, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DemoDataBadge } from "@/components/shared/demo-data-badge";
import { CardSkeleton, ErrorState } from "@/components/shared/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useApiQuery } from "@/hooks/use-api";
import { getSystemSettings, saveSystemSettings, type AdminSystemSettings } from "@/lib/services/admin";
import {
  ADMIN_EMAIL,
  ADMIN_NAME,
  DEFAULT_MPESA_TILL_NUMBER,
  DEFAULT_WHATSAPP_NUMBER,
} from "@/lib/constants";
import { formatKES, normalizePhoneKE } from "@/lib/utils";


const GENERAL_TOGGLES = [
  { key: "registrationsOpen" as const, label: "Open registrations", description: "Allow new members to sign up." },
  { key: "depositsEnabled" as const, label: "Deposits enabled", description: "Accept deposits through enabled payment methods." },
  { key: "withdrawalsEnabled" as const, label: "Withdrawals enabled", description: "Accept and process payout requests." },
  { key: "referralRewardsEnabled" as const, label: "Referral rewards", description: "Issue team rewards on referrals." },
];

const FLAG_TOGGLES = [
  { key: "newProductCatalogue" as const, label: "New product catalogue", description: "Serve the refreshed product catalogue." },
  { key: "darkModeForMembers" as const, label: "Member dark mode", description: "Allow members to switch to dark mode." },
  { key: "betaCharts" as const, label: "Beta charts", description: "Expose experimental charting features." },
  { key: "instantPayouts" as const, label: "Instant payouts", description: "Bypass the review queue for low-risk payouts." },
];

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const settings = useApiQuery(["admin", "settings"], getSystemSettings);
  const data = settings.data;
  const hasConfiguredTill = Boolean(data?.contact?.mpesaTillNumber?.trim());

  const [general, setGeneral] = React.useState<Record<string, boolean>>({});
  const [flags, setFlags] = React.useState<Record<string, boolean>>({});
  const [limits, setLimits] = React.useState({
    maxWithdrawalLimit: "",
    minDeposit: "",
    supportSlaHours: "",
  });
  const [contact, setContact] = React.useState({
    adminName: ADMIN_NAME,
    adminEmail: ADMIN_EMAIL,
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    mpesaTillNumber: DEFAULT_MPESA_TILL_NUMBER,
  });
  const [payments, setPayments] = React.useState({ mpesa: false, paypal: true });
  const [contactError, setContactError] = React.useState("");

  React.useEffect(() => {
    if (!data) return;
    setGeneral({
      registrationsOpen: data.registrationsOpen ?? false,
      depositsEnabled: data.depositsEnabled ?? false,
      withdrawalsEnabled: data.withdrawalsEnabled ?? false,
      referralRewardsEnabled: data.referralRewardsEnabled ?? false,
    });
    setFlags({
      newProductCatalogue: data.featureFlags?.newProductCatalogue ?? false,
      darkModeForMembers: data.featureFlags?.darkModeForMembers ?? false,
      betaCharts: data.featureFlags?.betaCharts ?? false,
      instantPayouts: data.featureFlags?.instantPayouts ?? false,
    });
    setLimits({
      maxWithdrawalLimit: String(data.maxWithdrawalLimit ?? 0),
      minDeposit: String(data.minDeposit ?? 0),
      supportSlaHours: String(data.supportSlaHours ?? 0),
    });
    setContact({
      adminName: data.contact?.adminName || ADMIN_NAME,
      adminEmail: data.contact?.adminEmail || ADMIN_EMAIL,
      whatsappNumber:
        data.contact?.whatsappNumber || data.contact?.mpesaNumber || DEFAULT_WHATSAPP_NUMBER,
      mpesaTillNumber: data.contact?.mpesaTillNumber || DEFAULT_MPESA_TILL_NUMBER,
    });
    setPayments({
      mpesa: (data.payments?.mpesa ?? false) && hasConfiguredTill,
      paypal: data.payments?.paypal ?? true,
    });
  }, [data, hasConfiguredTill]);

  const toggleGeneral = async (key: string, value: boolean) => {
    setGeneral((g) => ({ ...g, [key]: value }));
    const res = await saveSystemSettings({ [key]: value });
    if (!res.ok) { toast.error(res.message); void settings.refetch(); } else toast.success("Setting saved.");
  };

  const toggleFlag = async (key: string, value: boolean) => {
    setFlags((f) => ({ ...f, [key]: value }));
    const res = await saveSystemSettings({ featureFlags: { ...flags, [key]: value } as AdminSystemSettings["featureFlags"] });
    if (!res.ok) { toast.error(res.message); void settings.refetch(); } else toast.success("Feature flag saved.");
  };

  const saveLimits = async () => {
    const res = await saveSystemSettings({ maxWithdrawalLimit: Number(limits.maxWithdrawalLimit), minDeposit: Number(limits.minDeposit), supportSlaHours: Number(limits.supportSlaHours) });
    if (!res.ok) toast.error(res.message); else toast.success("Limits and thresholds saved.");
  };

  const togglePaymentMethod = async (key: keyof AdminSystemSettings["payments"], value: boolean) => {
    setPayments((p) => ({ ...p, [key]: value }));
    const res = await saveSystemSettings({ payments: { ...payments, [key]: value } });
    if (!res.ok) { toast.error(res.message); void settings.refetch(); } else toast.success("Payment method updated.");
  };

  const saveContactAndPayments = async () => {
    const name = contact.adminName.trim();
    const email = contact.adminEmail.trim();
    const whatsappNumber = normalizePhoneKE(contact.whatsappNumber);
    const mpesaTillNumber = contact.mpesaTillNumber.replace(/\D/g, "");
    if (!name) { setContactError("Enter the administrator name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setContactError("Enter a valid administrator email."); return; }
    if (!/^254(7|1)\d{8}$/.test(whatsappNumber)) { setContactError("Enter a valid Kenyan WhatsApp number (e.g. 0751 249 339)."); return; }
    if (mpesaTillNumber && !/^\d{5,10}$/.test(mpesaTillNumber)) { setContactError("Enter a valid 5–10 digit M-Pesa Till number, or leave it blank."); return; }
    setContactError("");
    const nextPayments = { ...payments, mpesa: Boolean(mpesaTillNumber) && payments.mpesa };
    setPayments(nextPayments);
    const res = await saveSystemSettings({
      contact: { adminName: name, adminEmail: email, whatsappNumber, mpesaTillNumber },
      payments: nextPayments,
    });
    if (!res.ok) toast.error(res.message);
    else {
      toast.success("Payments & contact details saved.");
      void settings.refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Platform configuration, limits and feature toggles. Changes are recorded in the operations database."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
        actions={<DemoDataBadge />}
      />

      {settings.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      ) : settings.error ? (
        <ErrorState
          title="Could not load settings"
          description={settings.error.message}
          onRetry={() => void settings.refetch()}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="size-4 text-muted-foreground" />
                General & operations
              </CardTitle>
              <CardDescription>Core operational toggles for the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {GENERAL_TOGGLES.map((t, i) => (
                <React.Fragment key={t.key}>
                  {i > 0 && <Separator />}
                  <SettingRow label={t.label} description={t.description}>
                    <Switch
                      checked={general[t.key] ?? data?.[t.key] ?? false}
                      onCheckedChange={(v) => toggleGeneral(t.key, v)}
                      aria-label={t.label}
                    />
                  </SettingRow>
                </React.Fragment>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                Limits & thresholds
              </CardTitle>
              <CardDescription>Configurable limits used by the wallet and support flows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingRow
                label="Max withdrawal limit"
                description={`Current value: ${formatKES(data?.maxWithdrawalLimit ?? 0)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">KES</span>
                  <Input
                    type="number"
                    value={limits.maxWithdrawalLimit}
                    onChange={(e) => setLimits((l) => ({ ...l, maxWithdrawalLimit: e.target.value }))}
                    className="numeric h-9 w-36 text-right"
                    aria-label="Max withdrawal limit"
                  />
                </div>
              </SettingRow>
              <SettingRow
                label="Minimum deposit"
                description={`Current value: ${formatKES(data?.minDeposit ?? 0)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">KES</span>
                  <Input
                    type="number"
                    value={limits.minDeposit}
                    onChange={(e) => setLimits((l) => ({ ...l, minDeposit: e.target.value }))}
                    className="numeric h-9 w-36 text-right"
                    aria-label="Minimum deposit"
                  />
                </div>
              </SettingRow>
              <SettingRow
                label="Support SLA (hours)"
                description="Target first-response window for new tickets."
              >
                <Input
                  type="number"
                  value={limits.supportSlaHours}
                  onChange={(e) => setLimits((l) => ({ ...l, supportSlaHours: e.target.value }))}
                  className="numeric h-9 w-36 text-right"
                  aria-label="Support SLA hours"
                />
              </SettingRow>
              <Separator />
              <div className="flex justify-end pt-3">
                <Button size="sm" onClick={() => void saveLimits()}>
                  <Save />
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                Payments & contact
              </CardTitle>
              <CardDescription>
                Acceptable payment methods and the contact details shown to members when they pay.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingRow
                label="Administrator name"
                description="Displayed as the payment contact on member payment screens."
              >
                <Input
                  type="text"
                  value={contact.adminName}
                  onChange={(e) => setContact((c) => ({ ...c, adminName: e.target.value }))}
                  className="h-9 w-64 sm:w-72"
                  aria-label="Administrator name"
                />
              </SettingRow>
              <SettingRow
                label="Administrator email / PayPal account"
                description="The PayPal account members send payments to."
              >
                <Input
                  type="email"
                  value={contact.adminEmail}
                  onChange={(e) => setContact((c) => ({ ...c, adminEmail: e.target.value }))}
                  className="h-9 w-64 sm:w-72"
                  aria-label="Administrator email"
                />
              </SettingRow>
              <SettingRow
                label="WhatsApp contact number"
                description="Used by public Contact and member Support links."
              >
                <Input
                  type="tel"
                  value={contact.whatsappNumber}
                  onChange={(e) => setContact((c) => ({ ...c, whatsappNumber: e.target.value }))}
                  className="h-9 w-40 sm:w-44 numeric text-right"
                  aria-label="WhatsApp contact number"
                />
              </SettingRow>
              <SettingRow
                label="M-Pesa Till number"
                description="Optional. M-Pesa deposits remain unavailable until a Till number is configured."
              >
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={contact.mpesaTillNumber}
                  onChange={(e) => {
                    const mpesaTillNumber = e.target.value;
                    setContact((c) => ({ ...c, mpesaTillNumber }));
                    if (!mpesaTillNumber.trim()) setPayments((current) => ({ ...current, mpesa: false }));
                  }}
                  className="h-9 w-40 sm:w-44 numeric text-right"
                  aria-label="M-Pesa Till number"
                  placeholder="Not configured"
                />
              </SettingRow>
              <Separator />
              <SettingRow
                label="M-Pesa deposits"
                description={
                  !contact.mpesaTillNumber.trim()
                    ? "Add a Till number before M-Pesa deposits can be enabled."
                    : !hasConfiguredTill
                      ? "Save the Till number before enabling M-Pesa deposits."
                      : "Allow members to fund their wallet via the configured Till."
                }
              >
                <Switch
                  checked={payments.mpesa && Boolean(contact.mpesaTillNumber.trim())}
                  onCheckedChange={(v) => togglePaymentMethod("mpesa", v)}
                  disabled={!contact.mpesaTillNumber.trim() || !hasConfiguredTill}
                  aria-label="Enable M-Pesa deposits"
                />
              </SettingRow>
              <SettingRow
                label="PayPal deposits"
                description="Allow members to fund their wallet via PayPal."
              >
                <Switch
                  checked={payments.paypal}
                  onCheckedChange={(v) => togglePaymentMethod("paypal", v)}
                  aria-label="Enable PayPal deposits"
                />
              </SettingRow>
              {contactError && (
                <p role="alert" className="text-xs font-semibold text-danger">
                  {contactError}
                </p>
              )}
              <Separator />
              <div className="flex justify-end pt-3">
                <Button size="sm" onClick={() => void saveContactAndPayments()}>
                  <Save />
                  Save payments & contact
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="size-4 text-muted-foreground" />
                Feature flags
              </CardTitle>
              <CardDescription>Preview flags controlling which capabilities are visible.</CardDescription>
            </CardHeader>
            <CardContent>
              {FLAG_TOGGLES.map((t, i) => (
                <React.Fragment key={t.key}>
                  {i > 0 && <Separator />}
                  <SettingRow label={t.label} description={t.description}>
                    <Switch
                      checked={flags[t.key] ?? data?.featureFlags?.[t.key] ?? false}
                      onCheckedChange={(v) => toggleFlag(t.key, v)}
                      aria-label={t.label}
                    />
                  </SettingRow>
                </React.Fragment>
              ))}
            </CardContent>
          </Card>

          <Card className="border-danger/25">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-danger">
                <ShieldAlert className="size-4" />
                Danger zone
              </CardTitle>
              <CardDescription>
                Maintenance mode suspends member-facing flows while operations check the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="danger">
                <Info className="size-4" />
                <AlertTitle>Maintenance mode {data?.maintenanceMode ? "is on" : "is off"}</AlertTitle>
                <AlertDescription>
                  When enabled, members cannot initiate deposits, withdrawals or new investments. Existing
                  earnings continue to credit.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <SettingRow
                  label="Enable maintenance mode"
                  description="Temporarily suspend member facing money movement flows."
                >
                  <Switch
                    checked={data?.maintenanceMode ?? false}
                    onCheckedChange={async (value) => { const res = await saveSystemSettings({ maintenanceMode: value }); if (!res.ok) toast.error(res.message); else { toast.success("Maintenance setting saved."); void settings.refetch(); } }}
                    aria-label="Enable maintenance mode"
                  />
                </SettingRow>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                System info
              </CardTitle>
              <CardDescription>Application runtime information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1.5 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <span className="text-muted-foreground">Version</span>
                <span className="font-semibold">Zentra</span>
              </div>
              <div className="flex justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <span className="text-muted-foreground">Environment</span>
                <Badge variant="outline">{process.env.NODE_ENV === "production" ? "Production" : "Development"}</Badge>
              </div>
              <div className="flex justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <span className="text-muted-foreground">Data store</span>
                <span className="font-semibold">PostgreSQL</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end">
            <DemoDataBadge label="Sample financial data" />
          </div>
        </>
      )}
    </div>
  );
}
