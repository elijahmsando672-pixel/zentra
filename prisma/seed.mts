import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const now = Date.now();

const iso = (ts) => new Date(ts).toISOString();
const dAgo = (n, h = 10, m = 15) => {
  const d = new Date(now - n * DAY);
  d.setHours(h, m, 0, 0);
  return d;
};
const ahead = (n, h = 10, m = 15) => {
  const d = new Date(now + n * DAY);
  d.setHours(h, m, 0, 0);
  return d;
};
const round2 = (n) => Number(n.toFixed(2));

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const baseTerms = [
  "Earnings accrue daily and are credited to your Earnings Wallet each day at 00:00 EAT.",
  "Entry amounts must fall within the product's minimum and maximum limits.",
  "Capital is released to your Deposit Wallet on the maturity date.",
  "Early exit is not available while a plan is active.",
  "Figures shown are illustrative projections based on the published daily rate.",
];
const baseEligibility = [
  "Account holder must be 18 years or older.",
  "Phone number must be verified.",
  "Identity verification (KYC) must be approved.",
  "Account must be in good standing with no active restrictions.",
];
const baseFaq = [
  {
    question: "When are daily earnings credited?",
    answer:
      "Earnings are calculated on your invested amount each day and credited to your Earnings Wallet shortly after midnight EAT.",
  },
  {
    question: "Can I withdraw my capital before maturity?",
    answer:
      "No. Capital committed to an active plan is locked until the maturity date, at which point it returns to your Deposit Wallet.",
  },
  {
    question: "Are the projected figures guaranteed?",
    answer:
      "Projections are based on the product's published daily rate and are provided for illustration. They are not a promise of returns.",
  },
];

const products = [
  {
    id: "prd_starter",
    slug: "zentra-starter",
    name: "Zentra Starter",
    tagline: "A focused entry point for building a daily earning habit.",
    description:
      "Zentra Starter is a 30-day plan designed for members beginning their journey on Zentra. Commit an amount between KES 1,000 and KES 40,000 and track daily earnings credited straight to your Earnings Wallet, with capital returned at maturity.",
    tier: "starter",
    status: "active",
    featured: true,
    badge: "popular",
    minEntry: 1_000,
    maxEntry: 40_000,
    stepAmount: 500,
    durationDays: 30,
    dailyRate: 0.8,
    dailyEarningAtEntry: 8,
    totalPayoutMultiplier: 1.24,
    capacityTotal: 5_000_000,
    capacityUsed: 3_180_000,
    icon: "seedling",
    riskNote: "Daily rates are variable product parameters, not guarantees. Review the risk disclosure before committing funds.",
    version: 3,
    createdAt: dAgo(320),
  },
  {
    id: "prd_growth",
    slug: "zentra-growth",
    name: "Zentra Growth",
    tagline: "Sixty days of steady daily earning on a larger commitment.",
    description:
      "Zentra Growth is our most popular mid-tier plan. With entries from KES 10,000 to KES 250,000 across 60 days, it suits members who want a longer earning window with a higher daily rate than Starter.",
    tier: "growth",
    status: "active",
    featured: true,
    badge: "popular",
    minEntry: 10_000,
    maxEntry: 250_000,
    stepAmount: 1_000,
    durationDays: 60,
    dailyRate: 1.1,
    dailyEarningAtEntry: 110,
    totalPayoutMultiplier: 1.66,
    capacityTotal: 12_000_000,
    capacityUsed: 8_420_000,
    icon: "trending-up",
    riskNote: "Longer durations increase exposure to rate changes. Projections assume the current daily rate holds for the full term.",
    version: 4,
    createdAt: dAgo(280),
  },
  {
    id: "prd_elite",
    slug: "zentra-elite",
    name: "Zentra Elite",
    tagline: "Our flagship ninety-day plan for serious commitments.",
    description:
      "Zentra Elite is a 90-day flagship plan with entries from KES 50,000 to KES 1,000,000. It carries the highest published daily rate on Zentra and includes priority support and early access to new campaigns.",
    tier: "elite",
    status: "active",
    featured: true,
    badge: "limited",
    minEntry: 50_000,
    maxEntry: 1_000_000,
    stepAmount: 5_000,
    durationDays: 90,
    dailyRate: 1.45,
    dailyEarningAtEntry: 725,
    totalPayoutMultiplier: 2.305,
    capacityTotal: 20_000_000,
    capacityUsed: 15_760_000,
    icon: "gem",
    riskNote: "Capacity is limited per cohort. Commitments above KES 500,000 are subject to enhanced review.",
    version: 2,
    createdAt: dAgo(190),
  },
  {
    id: "prd_flex",
    slug: "flex-saver-14",
    name: "Flex Saver 14",
    tagline: "A short two-week plan with quick capital turnover.",
    description:
      "Flex Saver 14 is a compact 14-day plan with a low entry of KES 500. It is built for members who prefer short commitments and fast capital rotation.",
    tier: "starter",
    status: "active",
    featured: false,
    badge: "new",
    minEntry: 500,
    maxEntry: 25_000,
    stepAmount: 100,
    durationDays: 14,
    dailyRate: 0.5,
    dailyEarningAtEntry: 2.5,
    totalPayoutMultiplier: 1.07,
    capacityTotal: 2_000_000,
    capacityUsed: 640_000,
    icon: "layers",
    riskNote: "Short plans carry a lower rate. Projections are illustrative only.",
    version: 1,
    createdAt: dAgo(36),
  },
  {
    id: "prd_horizon",
    slug: "horizon-90",
    name: "Horizon 90",
    tagline: "A ninety-day growth plan currently at full capacity.",
    description:
      "Horizon 90 offered a 90-day growth-tier commitment. Current cohort capacity is fully subscribed — join the waitlist to be notified when a new cohort opens.",
    tier: "growth",
    status: "sold_out",
    featured: false,
    badge: "sold_out",
    minEntry: 25_000,
    maxEntry: 500_000,
    stepAmount: 2_500,
    durationDays: 90,
    dailyRate: 1.2,
    dailyEarningAtEntry: 300,
    totalPayoutMultiplier: 2.08,
    capacityTotal: 8_000_000,
    capacityUsed: 8_000_000,
    icon: "trending-up",
    riskNote: "This cohort is closed. Historical figures shown for reference only.",
    version: 2,
    createdAt: dAgo(140),
  },
  {
    id: "prd_reserve",
    slug: "zentra-reserve",
    name: "Zentra Reserve",
    tagline: "An institutional-tier plan, paused for reconfiguration.",
    description:
      "Zentra Reserve is an elite-tier plan currently paused while its rate structure is reconfigured. Existing holders' terms are unaffected.",
    tier: "elite",
    status: "paused",
    featured: false,
    badge: null,
    minEntry: 200_000,
    maxEntry: 3_000_000,
    stepAmount: 20_000,
    durationDays: 120,
    dailyRate: 1.6,
    dailyEarningAtEntry: 3_200,
    totalPayoutMultiplier: 2.92,
    capacityTotal: 30_000_000,
    capacityUsed: 0,
    icon: "zap",
    riskNote: "Paused plans are not open for new commitments.",
    version: 1,
    createdAt: dAgo(60),
  },
];

/* ------------------------------------------------------------------ */
/* Investments + earning schedules                                     */
/* ------------------------------------------------------------------ */

const invSeeds = [
  { id: "inv_001", ref: "INV-20260901-K3M9C", productId: "prd_growth", amount: 120_000, startDaysAgo: 41, status: "active" },
  { id: "inv_002", ref: "INV-20260925-P8X2D", productId: "prd_starter", amount: 25_000, startDaysAgo: 18, status: "active" },
  { id: "inv_003", ref: "INV-20260928-R4T7B", productId: "prd_flex", amount: 8_000, startDaysAgo: 10, status: "maturing" },
  { id: "inv_004", ref: "INV-20260812-J6N1W", productId: "prd_starter", amount: 15_000, startDaysAgo: 72, status: "completed" },
  { id: "inv_005", ref: "INV-20260615-H2Q8L", productId: "prd_growth", amount: 50_000, startDaysAgo: 124, status: "completed" },
];

/* ------------------------------------------------------------------ */
/* Deposits + withdrawals seeds                                        */
/* ------------------------------------------------------------------ */

const depositSeeds = [
  { daysAgo: 43, amount: 130_000, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 41, amount: 120_000, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 19, amount: 30_000, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 18, amount: 25_000, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 11, amount: 10_000, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 10, amount: 8_000, status: "completed", phone: "254733981204", method: "mpesa" },
  { daysAgo: 6, amount: 45_000, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 3, amount: 15_000, status: "failed", phone: "254712345678", reason: "Request cancelled by user", method: "mpesa" },
  { daysAgo: 2, amount: 20_000, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 1, amount: 12_500, status: "completed", phone: "254712345678", method: "mpesa" },
  { daysAgo: 0, amount: 35_000, status: "pending", phone: "254712345678", method: "paypal", providerReference: "8XK92034PP773104M" },
];

const payoutAccounts = [
  { id: "po_001", nickname: "My Safaricom", phone: "254712345678", isPrimary: true, verified: true, createdAt: dAgo(200), lastUsedAt: dAgo(5) },
  { id: "po_002", nickname: "Business line", phone: "254733981204", isPrimary: false, verified: true, createdAt: dAgo(88), lastUsedAt: dAgo(29) },
];

const wdSeeds = [
  { daysAgo: 62, amount: 8_000, fee: 145, status: "paid", account: 0, paid: true },
  { daysAgo: 44, amount: 15_000, fee: 250, status: "paid", account: 0, paid: true },
  { daysAgo: 29, amount: 22_500, fee: 362.5, status: "paid", account: 1, paid: true },
  { daysAgo: 12, amount: 5_000, fee: 100, status: "rejected", account: 0, rejection: "Payout account name does not match the verified account holder." },
  { daysAgo: 5, amount: 30_000, fee: 475, status: "paid", account: 0, paid: true },
  { daysAgo: 1, amount: 12_000, fee: 205, status: "pending_approval", account: 0 },
];

const mask = (phone) => phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2");

async function main() {
  console.log("Clearing existing data...");
  await prisma.$transaction([
    prisma.supportMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.teamReward.deleteMany(),
    prisma.referralActivity.deleteMany(),
    prisma.bonusAward.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.commissionRule.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.ledgerJournal.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.riskFlag.deleteMany(),
    prisma.adminStaff.deleteMany(),
    prisma.systemSetting.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.earningEntry.deleteMany(),
    prisma.withdrawal.deleteMany(),
    prisma.deposit.deleteMany(),
    prisma.investment.deleteMany(),
    prisma.payoutAccount.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.portfolioPoint.deleteMany(),
    prisma.session.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("Seeding user...");
  const passwordHash = await bcrypt.hash("zentra123", 10);
  const pinHash = await bcrypt.hash("1234", 10);

  await prisma.user.create({
    data: {
      id: "usr_demo_001",
      accountNumber: "NX-100284",
      fullName: "Alex Mwangi",
      phone: "254712345678",
      email: "alex.mwangi@example.com",
      passwordHash,
      joinedAt: dAgo(214, 9, 42),
      phoneVerified: true,
      emailVerified: true,
      kycStatus: "approved",
      verificationStatus: "verified",
      referralCode: "ALEX2026",
      referredBy: "Grace Wanjiku (NX-098115)",
      rank: "gold",
      status: "active",
      riskLevel: "low",
      twoFactorEnabled: true,
      hasTransactionPin: true,
      transactionPinHash: pinHash,
      profileCompletion: 92,
      lastLoginAt: new Date(now - 2 * 3_600_000),
      lastLoginIp: "197.232.91.14",
      device: "Chrome · Android 14",
      notificationPreferences: {
        email: true,
        sms: true,
        push: true,
        withdrawals: true,
        earnings: true,
        team: true,
        promotions: false,
      },
    },
  });

  console.log("Seeding products...");
  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        tier: p.tier,
        status: p.status,
        featured: p.featured,
        badge: p.badge,
        minEntry: p.minEntry,
        maxEntry: p.maxEntry,
        stepAmount: p.stepAmount,
        durationDays: p.durationDays,
        dailyRate: p.dailyRate,
        dailyEarningAtEntry: p.dailyEarningAtEntry,
        totalPayoutMultiplier: p.totalPayoutMultiplier,
        capacityTotal: p.capacityTotal,
        capacityUsed: p.capacityUsed,
        icon: p.icon,
        terms: baseTerms,
        eligibility: p.tier === "elite" ? [...baseEligibility, "Minimum Gold rank or a personal referral to Elite is required."] : baseEligibility,
        faq: baseFaq,
        riskNote: p.riskNote,
        version: p.version,
        createdAt: p.createdAt,
      },
    });
  }

  console.log("Seeding wallets...");
  const walletSeeds = [
    { wallet: "deposit", balance: 84_500, locked: false },
    { wallet: "investment", balance: 218_000, locked: true },
    { wallet: "earnings", balance: 23_450, locked: false },
    { wallet: "team_rewards", balance: 41_200, locked: false },
    { wallet: "bonus", balance: 5_750, locked: false },
    { wallet: "pending_withdrawal", balance: 12_000, locked: true },
    { wallet: "locked", balance: 3_000, locked: true },
  ];
  for (const w of walletSeeds) {
    await prisma.wallet.create({ data: { userId: "usr_demo_001", wallet: w.wallet, balance: w.balance, locked: w.locked } });
  }

  console.log("Seeding investments + earnings...");
  const investments = [];
  const earningsByInv = {};
  for (const seed of invSeeds) {
    const product = products.find((p) => p.id === seed.productId);
    const dailyEarning = round2((seed.amount * product.dailyRate) / 100);
    const projectedEarnings = round2(dailyEarning * product.durationDays);
    const startDate = dAgo(seed.startDaysAgo, 11, 24);
    const maturityDate = new Date(startDate.getTime() + product.durationDays * DAY);
    const daysElapsed = seed.status === "completed" ? product.durationDays : Math.min(product.durationDays, seed.startDaysAgo);
    const earnedToDate = round2(dailyEarning * daysElapsed);

    await prisma.investment.create({
      data: {
        id: seed.id,
        reference: seed.ref,
        userId: "usr_demo_001",
        productId: product.id,
        amount: seed.amount,
        dailyEarning,
        projectedEarnings,
        projectedPayout: round2(seed.amount + projectedEarnings),
        earnedToDate,
        startDate,
        maturityDate,
        status: seed.status,
        wallet: "investment",
        createdAt: startDate,
      },
    });

    const items = Array.from({ length: product.durationDays }, (_, i) => {
      const date = new Date(startDate.getTime() + i * DAY);
      const credited = i < daysElapsed;
      return {
        investmentId: seed.id,
        day: i + 1,
        date,
        amount: dailyEarning,
        status: credited ? "credited" : "scheduled",
        creditedAt: credited ? new Date(date.getTime() + 5 * 60_000) : null,
      };
    });
    await prisma.earningEntry.createMany({ data: items });
    earningsByInv[seed.id] = items;

    investments.push({
      id: seed.id,
      ref: seed.ref,
      productId: product.id,
      productName: product.name,
      amount: seed.amount,
      dailyEarning,
      startDate,
      status: seed.status,
      daysElapsed,
      schedule: items,
    });
  }

  console.log("Seeding payout accounts...");
  for (const a of payoutAccounts) {
    await prisma.payoutAccount.create({
      data: {
        id: a.id,
        userId: "usr_demo_001",
        nickname: a.nickname,
        phone: a.phone,
        provider: "mpesa",
        isPrimary: a.isPrimary,
        verified: a.verified,
        createdAt: a.createdAt,
        lastUsedAt: a.lastUsedAt,
      },
    });
  }

  console.log("Seeding deposits + transactions...");
  let txSeq = 0;
  const txRows = [];
  const pushTx = (tx) => {
    txSeq += 1;
    txRows.push({ id: `txn_${String(txSeq).padStart(4, "0")}`, ...tx });
  };

  const deposits = depositSeeds.map((s, i) => {
    const createdAt = dAgo(s.daysAgo, 9 + (i % 8), (i * 17) % 60);
    const completed = s.status === "completed";
    const method = s.method ?? "mpesa";
    const isMpesa = method === "mpesa";
    const events = isMpesa
      ? [
          { id: `dep_${i}_ev1`, label: "STK push requested", description: `Payment prompt sent to ${mask(s.phone)}.`, timestamp: createdAt.toISOString(), status: "done" },
          {
            id: `dep_${i}_ev2`,
            label: completed ? "Payment confirmed" : "Payment failed",
            description: completed ? "M-Pesa receipt confirmed and wallet credited." : s.reason ?? "The payment could not be completed.",
            timestamp: iso(createdAt.getTime() + 48_000),
            status: completed ? "done" : "current",
          },
          ...(completed
            ? [{ id: `dep_${i}_ev3`, label: "Wallet credited", description: `${s.amount.toLocaleString()} KES available in your Deposit Wallet.`, timestamp: iso(createdAt.getTime() + 50_000), status: "done" }]
            : []),
        ]
      : [
          { id: `dep_${i}_ev1`, label: "PayPal reference submitted", description: `Reference ${s.providerReference} submitted for manual verification.`, timestamp: createdAt.toISOString(), status: "done" },
          { id: `dep_${i}_ev2`, label: "Awaiting verification", description: "A team member will confirm this PayPal payment before the wallet is credited.", timestamp: iso(createdAt.getTime() + 48_000), status: "current" },
        ];
    return {
      id: `dep_${String(i + 1).padStart(3, "0")}`,
      reference: `DEP-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${1000 + i * 37}`,
      amount: s.amount,
      fee: 0,
      wallet: "deposit",
      phone: s.phone,
      method,
      providerReference: s.providerReference ?? null,
      status: s.status,
      checkoutRequestId: isMpesa ? `ws_CO_${20261000 + i}_DEMO` : null,
      merchantRequestId: isMpesa ? `mer_${20260000 + i * 7}` : null,
      createdAt,
      completedAt: completed ? new Date(createdAt.getTime() + 48_000) : null,
      failureReason: s.reason ?? null,
      events,
    };
  });

  for (const d of deposits) {
    await prisma.deposit.create({
      data: {
        id: d.id,
        reference: d.reference,
        userId: "usr_demo_001",
        amount: d.amount,
        fee: d.fee,
        wallet: d.wallet,
        phone: d.phone,
        method: d.method,
        providerReference: d.providerReference,
        status: d.status,
        checkoutRequestId: d.checkoutRequestId,
        merchantRequestId: d.merchantRequestId,
        createdAt: d.createdAt,
        completedAt: d.completedAt,
        failureReason: d.failureReason,
        events: d.events,
      },
    });

    pushTx({
      reference: d.reference,
      type: "deposit",
      status: d.status === "completed" ? "successful" : d.status === "failed" ? "failed" : "pending",
      direction: "incoming",
      amount: d.amount,
      fee: d.fee,
      netAmount: d.amount - d.fee,
      wallet: "deposit",
      description: d.method === "mpesa" ? `M-Pesa deposit from ${mask(d.phone)}` : `PayPal deposit · ref ${d.providerReference}`,
      counterparty: d.method === "mpesa" ? "Safaricom M-Pesa" : "PayPal",
      createdAt: d.createdAt,
      depositId: d.id,
      events: d.events,
    });
  }

  console.log("Seeding withdrawals + transactions...");
  const withdrawals = wdSeeds.map((s, i) => {
    const createdAt = dAgo(s.daysAgo, 14 + (i % 6), (i * 23) % 60);
    const account = payoutAccounts[s.account];
    const net = round2(s.amount - s.fee);
    const riskScore = s.status === "rejected" ? 62 : 8 + ((i * 11) % 27);
    const approvals = [
      { id: `apr_${i}_1`, step: 1, approver: "Risk Engine", role: "system", action: s.status === "rejected" ? "rejected" : s.status === "pending_approval" ? "pending" : "approved", reason: s.rejection, at: s.status === "pending_approval" ? undefined : iso(createdAt.getTime() + 900_000) },
      { id: `apr_${i}_2`, step: 2, approver: "Finance Desk", role: "finance", action: s.status === "paid" ? "approved" : "pending", at: s.status === "paid" ? iso(createdAt.getTime() + 2_700_000) : undefined },
    ];
    const events = [
      { id: `wd_${i}_ev1`, label: "Withdrawal requested", description: `Request for ${s.amount.toLocaleString()} KES created.`, timestamp: createdAt.toISOString(), status: "done" },
      { id: `wd_${i}_ev2`, label: "PIN verified", description: "Transaction PIN confirmed for this request.", timestamp: iso(createdAt.getTime() + 60_000), status: "done" },
      {
        id: `wd_${i}_ev3`,
        label: s.status === "paid" ? "Sent to M-Pesa" : s.status === "rejected" ? "Rejected" : "Awaiting approval",
        description: s.status === "paid" ? `Funds sent to ${mask(account.phone)}.` : s.status === "rejected" ? s.rejection : "This request is in the review queue.",
        timestamp: s.status === "paid" ? iso(createdAt.getTime() + 3_000_000) : s.status === "rejected" ? iso(createdAt.getTime() + 1_200_000) : iso(createdAt.getTime() + 60_000),
        status: s.status === "pending_approval" ? "current" : "done",
      },
    ];
    return {
      id: `wd_${String(i + 1).padStart(3, "0")}`,
      reference: `WDR-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${2000 + i * 53}`,
      amount: s.amount,
      fee: s.fee,
      netAmount: net,
      wallet: "earnings",
      payoutAccountId: account.id,
      status: s.status,
      riskScore,
      riskLevel: riskScore > 55 ? "high" : riskScore > 30 ? "medium" : "low",
      pinVerified: true,
      otpVerified: s.status !== "pending_approval",
      approvals,
      createdAt,
      paidAt: s.paid ? new Date(createdAt.getTime() + 3_000_000) : null,
      rejectionReason: s.rejection ?? null,
      events,
    };
  });

  for (const wd of withdrawals) {
    await prisma.withdrawal.create({
      data: {
        id: wd.id,
        reference: wd.reference,
        userId: "usr_demo_001",
        amount: wd.amount,
        fee: wd.fee,
        netAmount: wd.netAmount,
        wallet: wd.wallet,
        payoutAccountId: wd.payoutAccountId,
        status: wd.status,
        riskScore: wd.riskScore,
        riskLevel: wd.riskLevel,
        pinVerified: wd.pinVerified,
        otpVerified: wd.otpVerified,
        approvals: wd.approvals,
        events: wd.events,
        createdAt: wd.createdAt,
        paidAt: wd.paidAt,
        rejectionReason: wd.rejectionReason,
      },
    });

    const statusMap = { paid: "successful", rejected: "rejected", pending_approval: "pending", processing: "processing", failed: "failed" };
    const account = payoutAccounts.find((a) => a.id === wd.payoutAccountId);
    pushTx({
      reference: wd.reference,
      type: "withdrawal",
      status: statusMap[wd.status],
      direction: "outgoing",
      amount: wd.amount,
      fee: wd.fee,
      netAmount: wd.netAmount,
      wallet: wd.wallet,
      description: `Withdrawal to ${account.nickname}`,
      counterparty: account.phone,
      createdAt: wd.createdAt,
      withdrawalId: wd.id,
      events: wd.events,
    });
  }

  console.log("Seeding investment + earning transactions...");
  for (const inv of investments) {
    pushTx({
      reference: inv.ref,
      type: "investment",
      status: "successful",
      direction: "outgoing",
      amount: inv.amount,
      fee: 0,
      netAmount: inv.amount,
      wallet: "investment",
      description: `Investment in ${inv.productName}`,
      counterparty: inv.productName,
      createdAt: inv.startDate,
      productId: inv.productId,
      events: [
        { id: `${inv.id}_txev1`, label: "Commitment created", description: `${inv.amount.toLocaleString()} KES committed to ${inv.productName}.`, timestamp: inv.startDate.toISOString(), status: "done" },
        { id: `${inv.id}_txev2`, label: "Capital debited", description: "Funds moved from your Deposit Wallet.", timestamp: inv.startDate.toISOString(), status: "done" },
      ],
    });
  }

  const activeInv = investments.filter((i) => i.status === "active" || i.status === "maturing");
  for (let day = 0; day < 16; day++) {
    for (const inv of activeInv) {
      const schedule = inv.schedule[inv.daysElapsed - 1 - day];
      if (!schedule || schedule.status !== "credited") continue;
      pushTx({
        reference: `ERN-${schedule.date.toISOString().slice(0, 10).replace(/-/g, "")}-${inv.id.slice(-3).toUpperCase()}${day}`,
        type: "earning",
        status: "successful",
        direction: "incoming",
        amount: schedule.amount,
        fee: 0,
        netAmount: schedule.amount,
        wallet: "earnings",
        description: `Daily earning · ${inv.productName} · Day ${schedule.day}`,
        counterparty: inv.productName,
        createdAt: schedule.creditedAt ?? schedule.date,
        productId: inv.productId,
        events: [{ id: `${inv.id}_${schedule.day}_txev`, label: "Earning credited", description: `Day ${schedule.day} earning of ${schedule.amount.toLocaleString()} KES credited.`, timestamp: (schedule.creditedAt ?? schedule.date).toISOString(), status: "done" }],
      });
    }
  }

  for (const inv of investments) {
    const weekCount = Math.floor(Math.max(0, inv.daysElapsed - 16) / 7);
    for (let w = 0; w < weekCount; w++) {
      const daysInChunk = Math.min(7, inv.daysElapsed - 16 - w * 7);
      if (daysInChunk <= 0) continue;
      const amount = round2(inv.dailyEarning * daysInChunk);
      const createdAt = dAgo(16 + w * 7 + 1, 23, 58);
      pushTx({
        reference: `ERN-WK-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${inv.id.slice(-3).toUpperCase()}`,
        type: "earning",
        status: "successful",
        direction: "incoming",
        amount,
        fee: 0,
        netAmount: amount,
        wallet: "earnings",
        description: `Weekly earning summary · ${inv.productName}`,
        counterparty: inv.productName,
        createdAt,
        productId: inv.productId,
        events: [{ id: `${inv.id}_wkev_${w}`, label: "Weekly summary", description: `${daysInChunk} days of earnings consolidated (${amount.toLocaleString()} KES).`, timestamp: createdAt.toISOString(), status: "done" }],
      });
    }
  }

  await prisma.transaction.createMany({
    data: txRows.map((t) => ({
      id: t.id,
      reference: t.reference,
      userId: "usr_demo_001",
      type: t.type,
      status: t.status,
      direction: t.direction,
      amount: t.amount,
      fee: t.fee,
      netAmount: t.netAmount,
      wallet: t.wallet,
      description: t.description,
      counterparty: t.counterparty ?? null,
      productId: t.productId ?? null,
      depositId: t.depositId ?? null,
      withdrawalId: t.withdrawalId ?? null,
      events: t.events,
      createdAt: t.createdAt,
    })),
  });

  console.log("Seeding portfolio history...");
  let invested = 40_000;
  let earnings = 0;
  const points = Array.from({ length: 130 }, (_, i) => {
    const dayIndex = 129 - i;
    const date = dAgo(dayIndex, 23, 55);
    const progress = i / 129;
    const wobble = Math.sin(i / 5) * 1_400 + ((i * 137) % 900);
    const invVal = 40_000 + progress * 178_000 + (wobble - 1_500);
    const earnVal = progress * 34_500 + Math.sin(i / 3) * 260;
    return {
      userId: "usr_demo_001",
      date,
      portfolio: round2(invVal + earnVal),
      earnings: round2(earnVal),
      invested: round2(invVal),
    };
  });
  await prisma.portfolioPoint.createMany({ data: points });

  console.log("Seeding notifications...");
  const notifications = [
    { category: "transaction", title: "Deposit confirmed", message: "Your deposit of KES 12,500.00 has been confirmed.", read: false, actionUrl: "/records", actionLabel: "View record", createdAt: dAgo(1, 10, 20) },
    { category: "account", title: "Withdrawal in review", message: "Your request WDR is being reviewed. You will be notified once it is processed.", read: false, actionUrl: "/wallet", actionLabel: "View wallet", createdAt: dAgo(1, 14, 5) },
    { category: "transaction", title: "Daily earnings credited", message: "Daily earnings from your active plans were credited to your Earnings Wallet.", read: false, actionUrl: "/records", actionLabel: "View record", createdAt: dAgo(0, 0, 10) },
    { category: "team", title: "Rank upgraded to Gold", message: "Congratulations! You have reached the Gold rank and unlocked new team reward rates.", read: false, actionUrl: "/team", actionLabel: "View team", createdAt: dAgo(3, 9, 0) },
    { category: "team", title: "New team member joined", message: "A new member joined your team using your referral code.", read: true, actionUrl: "/team", actionLabel: "View team", createdAt: dAgo(4, 11, 30) },
    { category: "security", title: "New device sign-in", message: "A new sign-in was detected on Chrome · Android 14 from Nairobi, Kenya.", read: true, actionUrl: "/profile/security", actionLabel: "Security centre", createdAt: dAgo(5, 8, 15) },
    { category: "transaction", title: "Withdrawal paid", message: "KES 29,525.00 was sent to your M-Pesa number.", read: true, actionUrl: "/records", actionLabel: "View record", createdAt: dAgo(5, 16, 40) },
    { category: "support", title: "Support ticket updated", message: "Your ticket about a deposit delay has received a reply from our team.", read: true, actionUrl: "/support", actionLabel: "Open support", createdAt: dAgo(7, 13, 20) },
    { category: "promotional", title: "New campaign available", message: "Refer 3 friends this month to earn a bonus reward. Terms apply.", read: true, actionUrl: "/rewards", actionLabel: "See rewards", createdAt: dAgo(9, 10, 0) },
    { category: "account", title: "Profile almost complete", message: "Complete your profile to unlock the highest account limits.", read: true, actionUrl: "/profile", actionLabel: "Complete profile", createdAt: dAgo(12, 9, 45) },
  ];
  for (const n of notifications) {
    await prisma.notification.create({ data: { userId: "usr_demo_001", ...n } });
  }

  console.log("Seeding device sessions...");
  const sessions = [
    { token: "seed_current_session", ip: "197.232.91.14", userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari", createdAt: new Date(now - 2 * 3_600_000), lastSeenAt: new Date(now - 2 * 60_000), expiresAt: ahead(28) },
    { token: "seed_session_ios", ip: "197.232.102.44", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1", createdAt: dAgo(6, 8, 20), lastSeenAt: dAgo(3, 19, 5), expiresAt: ahead(20) },
    { token: "seed_session_windows", ip: "41.90.64.12", userAgent: "Mozilla/5.0 (Windows NT 11.0) Chrome/120 Safari/537.36", createdAt: dAgo(21, 15, 10), lastSeenAt: dAgo(18, 9, 30), expiresAt: ahead(8) },
  ];
  for (const s of sessions) {
    await prisma.session.create({ data: { userId: "usr_demo_001", ...s } });
  }

  console.log("Seeding team, rewards, bonuses, support, admin...");
  const firstNames = ["Brian", "Wanjiru", "Kevin", "Aisha", "Dennis", "Mercy", "Samuel", "Faith", "Collins", "Njeri", "Peter", "Grace", "Victor", "Cynthia", "James", "Hellen", "Elvis", "Sharon", "Moses", "Lydia", "Oscar", "Purity", "Felix", "Naomi"];
  const lastNames = ["Otieno", "Kamau", "Mwangi", "Hassan", "Kiptoo", "Wanjiru", "Njoroge", "Achieng", "Barasa", "Maina", "Odhiambo", "Chebet", "Kariuki", "Were", "Kilonzo", "Muthoni", "Omondi", "Adhiambo", "Korir", "Wambui", "Mutua", "Nyambura", "Ogutu", "Atieno"];
  const levels = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3];
  const teamRows = [];
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const fullName = `${firstNames[i % firstNames.length]} ${lastNames[(i * 5 + 3) % lastNames.length]}`;
    const phone = "2547" + String(10000000 + i * 137911);
    const active = i % 7 !== 3;
    const verified = i % 5 !== 2;
    const teamVolume = level === 1 ? 180000 + ((i * 53117) % 420000) : level === 2 ? 70000 + ((i * 27117) % 210000) : 25000 + ((i * 13337) % 90000);
    const rate = level === 1 ? 0.05 : level === 2 ? 0.03 : 0.015;
    teamRows.push({
      id: `tm_${String(i + 1).padStart(3, "0")}`,
      ownerId: "usr_demo_001",
      fullName,
      level,
      parentName: level === 1 ? "Alex Mwangi" : "Alex Mwangi",
      joinedAt: dAgo(3 + i * 7 + (i % 5), 9 + (i % 8), (i * 13) % 60),
      active,
      verified,
      teamVolume,
      rewardContribution: round2(teamVolume * rate * (active ? 1 : 0.3)),
      downlineCount: level === 1 ? 2 + (i % 5) : level === 2 ? i % 3 : 0,
      maskedPhone: phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2"),
    });
  }
  for (const m of teamRows) await prisma.teamMember.create({ data: m });

  const rewardSources = ["investment", "deposit", "campaign"];
  const teamRewardRows = [];
  let trSeq = 0;
  for (const m of teamRows) {
    const count = (Number(m.id.slice(-2)) % 3) + 1;
    for (let k = 0; k < count; k++) {
      trSeq++;
      const status = trSeq % 9 === 0 ? "pending" : trSeq % 11 === 0 ? "reversed" : "claimed";
      const createdAt = dAgo(1 + ((trSeq * 3) % 120), 12, (trSeq * 7) % 60);
      teamRewardRows.push({
        id: `trw_${String(trSeq).padStart(4, "0")}`,
        reference: `TRW-${createdAt.toISOString().slice(0, 10).replace(/-/g, "")}-${1000 + trSeq * 29}`,
        ownerId: "usr_demo_001",
        sourceMember: m.fullName,
        level: m.level,
        sourceType: rewardSources[trSeq % 3],
        amount: round2(300 + ((trSeq * 617) % 6500)),
        commissionRate: m.level === 1 ? 5 : m.level === 2 ? 3 : 1.5,
        status,
        reversedReason: status === "reversed" ? "Source transaction reversed." : null,
        createdAt,
      });
    }
  }
  for (const r of teamRewardRows) await prisma.teamReward.create({ data: r });

  const activityEvents = ["signup", "verified", "invested", "reward"];
  const activityRows = teamRows.slice(0, 18).map((m, i) => {
    const event = activityEvents[i % 4];
    return {
      ownerId: "usr_demo_001",
      memberName: m.fullName,
      level: m.level,
      event,
      detail:
        event === "signup"
          ? `${m.fullName} joined using your invite link.`
          : event === "verified"
            ? `${m.fullName} completed verification.`
            : event === "invested"
              ? `${m.fullName} committed to a plan.`
              : `You earned a reward from ${m.fullName}.`,
      amount: event === "reward" || event === "invested" ? round2(400 + ((i * 371) % 5200)) : null,
      at: dAgo(1 + i * 4, 10, (i * 11) % 60),
    };
  });
  for (const a of activityRows) await prisma.referralActivity.create({ data: a });

  for (const r of [
    { id: "cr_1", name: "Direct referral commission", level: 1, percent: 5, minRank: "member", active: true },
    { id: "cr_2", name: "Level 2 commission", level: 2, percent: 3, minRank: "bronze", active: true },
    { id: "cr_3", name: "Level 3 commission", level: 3, percent: 1.5, minRank: "silver", active: true },
  ]) {
    await prisma.commissionRule.create({ data: r });
  }

  for (const c of [
    { id: "cp_welcome", code: "WELCOME10", title: "Welcome bonus", description: "10% bonus on your first commitment.", type: "bonus_percent", value: 750, minAmount: 5000, maxRedemption: 500, redemptions: 132, expiresAt: ahead(45), active: true },
    { id: "cp_lime", code: "LIME500", title: "Lime starter bonus", description: "Flat KES 500 bonus credited to your Bonus Wallet.", type: "bonus_flat", value: 500, maxRedemption: 1000, redemptions: 388, expiresAt: ahead(20), active: true },
    { id: "cp_feefree", code: "FEEFREE", title: "Withdrawal fee waiver", description: "Waive one withdrawal fee up to KES 100.", type: "fee_waiver", value: 100, redemptions: 57, expiresAt: ahead(10), active: true },
    { id: "cp_cashx2", code: "CASHX2", title: "Cashback boost", description: "Extra cashback on qualifying transactions.", type: "cashback", value: 250, redemptions: 210, expiresAt: dAgo(4), active: false },
  ]) {
    await prisma.coupon.create({ data: c });
  }

  for (const camp of [
    { id: "camp_01", name: "Refer 3, Earn More", description: "Refer three active members this month to unlock an extra bonus.", startsAt: dAgo(12), endsAt: ahead(18), status: "active", audience: "All members", awardsIssued: 412, budget: 250000, spent: 138400, accent: "lime" },
    { id: "camp_02", name: "Elite Season", description: "Boosted rates for Elite-tier commitments during the season.", startsAt: dAgo(30), endsAt: ahead(6), status: "active", audience: "Gold+ members", awardsIssued: 88, budget: 500000, spent: 462000, accent: "gold" },
    { id: "camp_03", name: "Welcome Wave", description: "Sign-up bonus wave for newly verified members.", startsAt: ahead(5), endsAt: ahead(40), status: "scheduled", audience: "New members", awardsIssued: 0, budget: 180000, spent: 0, accent: "blue" },
  ]) {
    await prisma.campaign.create({ data: camp });
  }

  for (const b of [
    { id: "ba_001", reference: "BON-20260930-1001", title: "Rank upgrade bonus", description: "Reward for reaching the Gold rank.", amount: 5000, status: "claimed", wallet: "bonus", source: "Rank milestone", awardedAt: dAgo(3, 9, 0), expiresAt: null, campaignId: null },
    { id: "ba_002", reference: "BON-20261001-1002", title: "Referral streak", description: "Three referrals in a week.", amount: 1500, status: "claimed", wallet: "bonus", source: "Referral streak", awardedAt: dAgo(6, 11, 30), expiresAt: null, campaignId: null },
    { id: "ba_003", reference: "BON-20261004-1003", title: "Elite Season booster", description: "Campaign award credited to your Bonus Wallet.", amount: 3000, status: "claimed", wallet: "bonus", source: "Elite Season", awardedAt: dAgo(2, 14, 10), expiresAt: null, campaignId: "camp_02" },
    { id: "ba_004", reference: "BON-20261007-1004", title: "Daily login streak", description: "Seven-day activity streak reward.", amount: 750, status: "available", wallet: "bonus", source: "Activity streak", awardedAt: dAgo(1, 8, 45), expiresAt: ahead(14), campaignId: null },
    { id: "ba_005", reference: "BON-20261008-1005", title: "Refer 3, Earn More", description: "Campaign award pending review.", amount: 2000, status: "pending", wallet: "bonus", source: "Refer 3, Earn More", awardedAt: dAgo(0, 12, 0), expiresAt: ahead(20), campaignId: "camp_01" },
    { id: "ba_006", reference: "BON-20260915-1006", title: "Welcome bonus", description: "Sign-up bonus (expired).", amount: 500, status: "expired", wallet: "bonus", source: "Welcome", awardedAt: dAgo(40, 10, 0), expiresAt: dAgo(10), campaignId: null },
  ]) {
    await prisma.bonusAward.create({ data: { ownerId: "usr_demo_001", ...b } });
  }

  const ticketSeed = [
    {
      id: "tkt_001", reference: "NX-TKT-100001", subject: "Deposit not reflected", category: "deposits", status: "in_progress", priority: "high", slaDueAt: ahead(0, 16, 0), lastReplyBy: "agent", satisfaction: null, createdAt: dAgo(1, 9, 15), updatedAt: dAgo(0, 11, 20),
      messages: [
        { author: "Alex Mwangi", authorRole: "user", body: "I made a deposit of KES 12,500 but it is not showing in my wallet yet.", at: dAgo(1, 9, 15) },
        { author: "Support Team", authorRole: "agent", body: "Thanks for reaching out. We can see the STK request and are confirming with M-Pesa. This usually resolves within a few minutes.", at: dAgo(0, 11, 20) },
      ],
    },
    {
      id: "tkt_002", reference: "NX-TKT-100002", subject: "Withdrawal limits question", category: "withdrawals", status: "waiting_on_you", priority: "normal", slaDueAt: ahead(1, 12, 0), lastReplyBy: "agent", satisfaction: null, createdAt: dAgo(4, 13, 5), updatedAt: dAgo(3, 10, 0),
      messages: [
        { author: "Alex Mwangi", authorRole: "user", body: "What is my daily withdrawal limit and how can I increase it?", at: dAgo(4, 13, 5) },
        { author: "Support Team", authorRole: "agent", body: "Your current daily limit is KES 100,000. Higher tiers are available once your KYC and rank requirements are met. Is there a specific amount you need?", at: dAgo(3, 10, 0) },
      ],
    },
    {
      id: "tkt_003", reference: "NX-TKT-100003", subject: "Referral reward not credited", category: "rewards", status: "resolved", priority: "normal", slaDueAt: dAgo(2, 12, 0), lastReplyBy: "agent", satisfaction: 5, createdAt: dAgo(9, 15, 40), updatedAt: dAgo(7, 9, 30),
      messages: [
        { author: "Alex Mwangi", authorRole: "user", body: "My friend joined using my code last week but I have not received the referral reward.", at: dAgo(9, 15, 40) },
        { author: "Support Team", authorRole: "agent", body: "We have located the referral and credited the reward to your Team Rewards wallet. Apologies for the delay.", at: dAgo(7, 9, 30) },
      ],
    },
  ];
  for (const t of ticketSeed) {
    const { messages, ...ticket } = t;
    await prisma.supportTicket.create({
      data: {
        ...ticket,
        userId: "usr_demo_001",
        messages: { create: messages.map((m) => ({ ...m, attachments: [] })) },
      },
    });
  }

  const adminPasswordHash = await bcrypt.hash("zentra123", 10);
  for (const s of [
    { id: "adm_001", fullName: "ANNABELLE Wendy", email: "annabellewendy572@gmail.com", role: "super_admin", status: "active", lastActiveAt: dAgo(0, 8, 30), permissions: ["users.manage", "withdrawals.review", "ledger.view", "settings.manage"] },
    { id: "adm_002", fullName: "Brian Otieno", email: "brian.otieno@zentra.demo", role: "finance", status: "active", lastActiveAt: dAgo(0, 9, 10), permissions: ["withdrawals.review", "ledger.view"] },
    { id: "adm_003", fullName: "Cherono Mutai", email: "cherono.mutai@zentra.demo", role: "analyst", status: "active", lastActiveAt: dAgo(1, 16, 45), permissions: ["deposits.review", "reports.view"] },
    { id: "adm_004", fullName: "David Kimani", email: "david.kimani@zentra.demo", role: "agent", status: "invited", lastActiveAt: dAgo(5, 11, 0), permissions: ["support.tickets", "users.view"] },
    { id: "adm_005", fullName: "Esther Wambui", email: "esther.wambui@zentra.demo", role: "admin", status: "suspended", lastActiveAt: dAgo(20, 14, 0), permissions: ["support.tickets"] },
  ]) {
    await prisma.adminStaff.create({ data: { ...s, passwordHash: adminPasswordHash } });
  }

  const auditActions = ["user.freeze", "withdrawal.approve", "withdrawal.reject", "deposit.manual_review", "settings.update", "coupon.create", "user.clear_flags", "ledger.export", "risk.escalate", "staff.invite", "user.restrict_withdrawals", "withdrawal.approve"];
  for (let i = 0; i < auditActions.length; i++) {
    const actor = ["ANNABELLE Wendy", "Brian Otieno", "Cherono Mutai"][i % 3];
    const actorRole = ["super_admin", "finance", "analyst"][i % 3];
    await prisma.auditLog.create({
      data: {
        actor,
        actorRole,
        action: auditActions[i],
        entityType: auditActions[i].split(".")[0],
        entityId: `NX-1002${String(80 + i).slice(-2)}`,
        reason: ["Routine review", "Flagged by risk engine", "Customer request", "Scheduled audit"][i % 4],
        oldValue: JSON.stringify({ status: "pending" }),
        newValue: JSON.stringify({ status: "approved" }),
        ip: `10.10.${1 + (i % 4)}.${20 + i}`,
        at: dAgo(i, 9 + (i % 8), (i * 7) % 60),
      },
    });
  }

  const riskThresholds = [
    { rule: "Multiple accounts, same device", level: "high", detail: "Three accounts authenticated from one device fingerprint." },
    { rule: "Rapid deposit-withdraw cycle", level: "medium", detail: "Deposit and withdrawal completed within 10 minutes." },
    { rule: "Velocity breach", level: "medium", detail: "Unusual transaction frequency over a 24-hour window." },
    { rule: "Mismatched payout name", level: "high", detail: "Payout account name differs from verified holder." },
    { rule: "Impossible travel", level: "low", detail: "Sign-ins from two distant locations in a short period." },
    { rule: "New device large withdrawal", level: "high", detail: "Large withdrawal requested from a recently added device." },
    { rule: "Shared bank details", level: "medium", detail: "Payout details reused across multiple members." },
    { rule: "Chargeback signal", level: "low", detail: "Customer dispute raised with the payment provider." },
  ];
  for (let i = 0; i < riskThresholds.length; i++) {
    const status = i % 4 === 0 ? "reviewing" : i % 5 === 0 ? "escalated" : "open";
    await prisma.riskFlag.create({
      data: {
        userAccountNumber: `NX-1002${String(90 + i).slice(-2)}`,
        userName: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
        rule: riskThresholds[i].rule,
        level: riskThresholds[i].level,
        detail: riskThresholds[i].detail,
        status,
        createdAt: dAgo(2 + i * 2, 11, (i * 9) % 60),
        resolvedAt: status === "cleared" ? dAgo(i, 15, 0) : null,
        resolution: status === "cleared" ? "Reviewed and cleared." : null,
      },
    });
  }

  const ledgerTx = txRows.slice(0, 20);
  for (let i = 0; i < ledgerTx.length; i++) {
    const t = ledgerTx[i];
    await prisma.ledgerJournal.create({
      data: {
        id: `led_${String(i + 1).padStart(3, "0")}`,
        reference: `JRN-${t.reference}`,
        type: t.type,
        description: t.description,
        totalAmount: t.amount,
        actor: "System Ledger",
        userAccountNumber: "NX-100284",
        immutable: true,
        createdAt: t.createdAt,
        entries: {
          create: [
            { account: "Member Wallet", accountCode: "2100", direction: "debit", amount: t.amount },
            { account: "Company Float", accountCode: "1000", direction: "credit", amount: t.amount },
          ],
        },
      },
    });
  }

  await prisma.systemSetting.create({
    data: {
      key: "global",
      value: {
        maintenanceMode: false,
        registrationsOpen: true,
        depositsEnabled: true,
        withdrawalsEnabled: true,
        referralRewardsEnabled: true,
        maxWithdrawalLimit: 100000,
        minDeposit: 100,
        supportSlaHours: 24,
        featureFlags: {
          newProductCatalogue: true,
          darkModeForMembers: true,
          betaCharts: false,
          instantPayouts: false,
        },
        contact: {
          adminName: "ANNABELLE Wendy",
          adminEmail: "annabellewendy572@gmail.com",
          whatsappNumber: "0751249339",
          mpesaTillNumber: "",
        },
        payments: {
          mpesa: false,
          paypal: true,
        },
      },
    },
  });

  const counts = await prisma.$transaction([
    prisma.user.count(),
    prisma.product.count(),
    prisma.investment.count(),
    prisma.deposit.count(),
    prisma.withdrawal.count(),
    prisma.transaction.count(),
    prisma.notification.count(),
  ]);
  console.log("Seed complete:", {
    users: counts[0],
    products: counts[1],
    investments: counts[2],
    deposits: counts[3],
    withdrawals: counts[4],
    transactions: counts[5],
    notifications: counts[6],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
