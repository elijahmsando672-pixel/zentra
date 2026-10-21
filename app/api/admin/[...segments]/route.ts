import { prisma } from "@/lib/server/prisma";
import { fail, ok, unauthorized, serverError, notFound } from "@/lib/server/api";
import { getAdminStaff } from "@/lib/server/admin-session";
import {
  mapAuditLog, mapCoupon, mapDeposit, mapInvestment, mapLedgerJournal,
  mapRiskFlag, mapSupportTicket, mapUser, mapWithdrawal, mapAdminStaff, mapCampaign, mapProduct,
  mapTeamMember, mapTeamReward, mapCommissionRule, mapReferralActivity,
} from "@/lib/server/mappers";
import { canAccess } from "@/lib/server/permissions";
import { settleDeposit } from "@/lib/server/deposit-settlement";
import { postJournal, toCents, withdrawalPaidEntries, withdrawalReleaseEntries } from "@/lib/server/ledger";
import { requestIp } from "@/lib/server/rate-limit";
import { Prisma } from "@prisma/client";

const n = (v: unknown) => Number(v ?? 0);
const pageData = <T,>(items: T[], page: number, pageSize: number) => ({
  items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length,
  page, pageSize, hasMore: page * pageSize < items.length,
});
const queryOf = (req: Request) => new URL(req.url).searchParams;
const pathOf = (params: { segments: string[] }) => params.segments;

export async function GET(req: Request, ctx: { params: Promise<{ segments: string[] }> }) {
  try {
    const staff=await getAdminStaff();
    if (!staff) return unauthorized();
    const parts = pathOf(await ctx.params);
    const path = parts[0] ?? "";
    if (!canAccess(staff.role, path)) return fail("Your staff role cannot access this area.", "insufficient_permissions", undefined, 403);
    const q = queryOf(req);
    const page = Math.max(1, Number(q.get("page") || 1));
    const size = Math.min(200, Math.max(1, Number(q.get("pageSize") || 12)));
    const search = (q.get("search") || "").toLowerCase();
    if (path === "dashboard") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [users, deposits, withdrawals, investments, products, rewards, tickets, flags, moneyTransactions, ledgerRefs, recentAudit] = await Promise.all([
        prisma.user.findMany(), prisma.deposit.findMany(), prisma.withdrawal.findMany(),
        prisma.investment.findMany(), prisma.product.findMany(), prisma.teamReward.findMany(),
        prisma.supportTicket.findMany(), prisma.riskFlag.findMany(),
        prisma.transaction.findMany({ where: { type: { in: ["deposit", "withdrawal"] }, status: "successful" }, select: { reference: true, type: true } }),
        prisma.ledgerJournal.findMany({ where: { type: { in: ["deposit", "withdrawal"] } }, select: { reference: true } }),
        prisma.auditLog.findMany({ orderBy: { at: "desc" }, take: 6 }),
      ]);
      /* A successful money transaction without a matching posted journal is a
         genuine reconciliation exception that finance must investigate. */
      const postedRefs = new Set(ledgerRefs.map((row) => row.reference));
      const reconciliationMismatches = moneyTransactions.filter((tx) =>
        tx.type === "deposit" ? !postedRefs.has(tx.reference) : !postedRefs.has(`${tx.reference}-PAY`)
      ).length;
      const summary = {
        totalUsers: users.length, newUsersToday: users.filter(x => x.joinedAt >= today).length,
        verifiedUsers: users.filter(x => x.verificationStatus === "verified").length,
        activeUsers: users.filter(x => x.status === "active").length,
        totalDeposits: deposits.filter(x => x.status === "completed").reduce((s,x)=>s+n(x.amount),0),
        depositsToday: deposits.filter(x => x.status === "completed" && x.createdAt >= today).reduce((s,x)=>s+n(x.amount),0),
        pendingDeposits: deposits.filter(x => x.status === "pending" || x.status === "initiated").length,
        failedDeposits: deposits.filter(x => x.status === "failed").length,
        totalWithdrawals: withdrawals.filter(x => x.status === "paid").reduce((s,x)=>s+n(x.amount),0),
        pendingWithdrawals: withdrawals.filter(x => x.status === "pending_approval").length,
        failedWithdrawals: withdrawals.filter(x => x.status === "rejected" || x.status === "failed").length,
        totalInvestments: investments.reduce((s,x)=>s+n(x.amount),0),
        activeInvestments: investments.filter(x=>x.status === "active" || x.status === "maturing").length,
        dailyEarningsCredited: investments.filter(x=>x.status === "active" || x.status === "maturing").reduce((s,x)=>s+n(x.dailyEarning),0),
        teamRewardsIssued: rewards.filter(x=>x.status === "claimed").reduce((s,x)=>s+n(x.amount),0),
        openTickets: tickets.filter(x=>x.status !== "resolved" && x.status !== "closed").length,
        pendingVerifications: users.filter(x => x.verificationStatus === "pending" || x.kycStatus === "pending").length,
        highRiskAccounts: users.filter(x=>x.riskLevel === "high").length,
        reconciliationMismatches,
      };
      const txSeries = Array.from({length:30}, (_, i) => {
        const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate()-(29-i));
        const next = new Date(date); next.setDate(next.getDate()+1);
        return {
          date: date.toISOString(),
          deposits: deposits.filter(x=>x.status==="completed"&&x.createdAt>=date&&x.createdAt<next).reduce((s,x)=>s+n(x.amount),0),
          withdrawals: withdrawals.filter(x=>x.status==="paid"&&x.createdAt>=date&&x.createdAt<next).reduce((s,x)=>s+n(x.amount),0),
          investments: investments.filter(x=>x.createdAt>=date&&x.createdAt<next).reduce((s,x)=>s+n(x.amount),0),
          newUsers: users.filter(x=>x.joinedAt>=date&&x.joinedAt<next).length,
        };
      });
      const [recentWithdrawals, recentDeposits, recentFlags, recentTickets] = await Promise.all([
        prisma.withdrawal.findMany({take:6,orderBy:{createdAt:"desc"},include:{payoutAccount:true,user:true}}),
        prisma.deposit.findMany({take:6,orderBy:{createdAt:"desc"}}),
        prisma.riskFlag.findMany({where:{status:{in:["open","reviewing"]}},take:5,orderBy:{createdAt:"desc"}}),
        prisma.supportTicket.findMany({where:{status:{notIn:["resolved","closed"]}},take:5,orderBy:{updatedAt:"desc"},include:{messages:true}}),
      ]);
      return ok({...summary,txSeries,productPerf:products.map(p=>({name:p.name,commitments:n(p.capacityUsed),capacity:n(p.capacityTotal),activeInvestments:investments.filter(i=>i.productId===p.id).length})),recentWithdrawals:recentWithdrawals.map(mapWithdrawal),recentDeposits:recentDeposits.map(mapDeposit),riskFlags:recentFlags.map(mapRiskFlag),tickets:recentTickets.map(mapSupportTicket),recentActivity:recentAudit.map(mapAuditLog)});
    }
    if (path === "users") {
      if (parts[1]) { const u = await prisma.user.findFirst({where:{OR:[{id:parts[1]},{accountNumber:parts[1]}]}}); return u ? ok(mapUser(u)) : notFound("User not found."); }
      const rows = await prisma.user.findMany({orderBy:{joinedAt:"desc"}});
      const filtered=rows.filter(u=>(!search||`${u.fullName} ${u.accountNumber} ${u.phone} ${u.email}`.toLowerCase().includes(search))&&(!q.get("status")||q.get("status")==="all"||u.status===q.get("status"))&&(!q.get("risk")||q.get("risk")==="all"||u.riskLevel===q.get("risk")));
      return ok(pageData(filtered.map(mapUser),page,size));
    }
    if (path === "withdrawals") {
      const rows=await prisma.withdrawal.findMany({orderBy:{createdAt:"desc"},include:{payoutAccount:true,user:true}});
      const filtered=rows.filter(w=>(!search||`${w.reference} ${w.user.fullName} ${w.user.accountNumber}`.toLowerCase().includes(search))&&(!q.get("status")||q.get("status")==="all"||w.status===q.get("status"))&&(!q.get("risk")||q.get("risk")==="all"||w.riskLevel===q.get("risk")));
      return ok(pageData(filtered.map(mapWithdrawal),page,size));
    }
    if (path === "deposits") {
      const rows=await prisma.deposit.findMany({orderBy:{createdAt:"desc"}});
      const filtered=rows.filter(d=>(!search||`${d.reference} ${d.phone} ${d.checkoutRequestId}`.toLowerCase().includes(search))&&(!q.get("status")||q.get("status")==="all"||d.status===q.get("status")));
      return ok(pageData(filtered.map(mapDeposit),page,size));
    }
    if (path === "investments") {
      const rows=await prisma.investment.findMany({include:{product:true},orderBy:{startDate:"desc"}});
      return ok(rows.filter(i=>!search||`${i.reference} ${i.product.name}`.toLowerCase().includes(search)).map(mapInvestment));
    }
    if (path === "risk") {
      const rows=await prisma.riskFlag.findMany({orderBy:{createdAt:"desc"}});
      return ok(rows.filter(x=>(!q.get("status")||q.get("status")==="all"||x.status===q.get("status"))&&(!q.get("level")||q.get("level")==="all"||x.level===q.get("level"))).map(mapRiskFlag));
    }
    if (path === "staff") return ok((await prisma.adminStaff.findMany({orderBy:{fullName:"asc"}})).map(mapAdminStaff));
    if (path === "audit") {
      const rows=await prisma.auditLog.findMany({orderBy:{at:"desc"}});
      const filtered=rows.filter(x=>(!search||`${x.actor} ${x.entityId} ${x.action}`.toLowerCase().includes(search))&&(!q.get("action")||q.get("action")==="all"||x.action.startsWith(q.get("action")!)));
      return ok(pageData(filtered.map(mapAuditLog),page,size));
    }
    if (path === "coupons") return ok((await prisma.coupon.findMany({orderBy:{createdAt:"desc"}})).map(mapCoupon));
    if (path === "ledger") {
      const rows=await prisma.ledgerJournal.findMany({include:{entries:true},orderBy:{createdAt:"desc"}});
      if(parts[1]) {const one=rows.find(x=>x.id===parts[1]||x.reference===parts[1]);return one?ok(mapLedgerJournal(one)):notFound("Ledger entry not found.");}
      return ok(pageData(rows.filter(x=>(!search||`${x.reference} ${x.description}`.toLowerCase().includes(search))&&(!q.get("type")||q.get("type")==="all"||x.type===q.get("type"))).map(mapLedgerJournal),page,size));
    }
    if (path === "settings") { const setting=await prisma.systemSetting.findUnique({where:{key:"global"}}); return ok(setting?.value ?? {}); }
    if (path === "reconciliation") return ok(await prisma.reconciliationReview.findMany({orderBy:{reviewedAt:"desc"}}));
    if (path === "campaigns") return ok((await prisma.campaign.findMany({orderBy:{startsAt:"desc"}})).map(mapCampaign));
    if (path === "team-members") return ok((await prisma.teamMember.findMany({orderBy:{joinedAt:"desc"}})).map(mapTeamMember));
    if (path === "team-rewards") return ok((await prisma.teamReward.findMany({orderBy:{createdAt:"desc"}})).map(mapTeamReward));
    if (path === "commission-rules") return ok((await prisma.commissionRule.findMany({orderBy:{level:"asc"}})).map(mapCommissionRule));
    if (path === "referral-activity") return ok((await prisma.referralActivity.findMany({orderBy:{at:"desc"},take:200})).map(mapReferralActivity));
    if (path === "tickets") {
      const rows=await prisma.supportTicket.findMany({include:{messages:true},orderBy:{updatedAt:"desc"}});
      return ok(rows.map(mapSupportTicket));
    }
    if (path === "announcements") return ok(await prisma.announcement.findMany({orderBy:{publishedAt:"desc"}}));
    return notFound("Admin resource not found.");
  } catch (error) { return serverError(error); }
}

export async function POST(req: Request, ctx: { params: Promise<{ segments: string[] }> }) {
  try {
    const staff=await getAdminStaff(); if(!staff) return unauthorized();
    const parts=pathOf(await ctx.params); const body=await req.json().catch(()=>({})); const id=parts[1] ?? String(body.id ?? "");
    if(!canAccess(staff.role,parts[0]??"",true)) return fail("Your staff role cannot make changes in this area.","insufficient_permissions",undefined,403);
    const reason=String(body.reason ?? "").trim(); const now=new Date(); const ip=requestIp(req);
    const audit=async(action:string,entityType:string,entityId:string,why:string,oldValue?:unknown,newValue?:unknown)=>prisma.auditLog.create({data:{actor:staff.fullName,actorRole:staff.role,action,entityType,entityId,reason:why,oldValue:oldValue===undefined?null:JSON.stringify(oldValue),newValue:newValue===undefined?null:JSON.stringify(newValue),ip,at:now}});
    if(parts[0]==="users"&&id){
      const action=String(body.action); if(!reason) return fail("A reason is required for this action.","reason_required");
      const user=await prisma.user.findUnique({where:{id}}); if(!user) return notFound("User not found.");
      const status=action==="freeze"?"frozen":action==="unfreeze"?"active":["restrict_withdrawals","restrict_deposits","restrict_referrals"].includes(action)?"restricted":user.status;
      await prisma.$transaction(async tx=>{await tx.user.update({where:{id},data:{status,riskLevel:action==="clear_flags"?"low":user.riskLevel}});if(action==="clear_flags"){await tx.riskFlag.updateMany({where:{userAccountNumber:user.accountNumber,status:{not:"cleared"}},data:{status:"cleared",resolvedAt:now,resolution:reason}});}await tx.auditLog.create({data:{actor:staff.fullName,actorRole:staff.role,action:`user.${action}`,entityType:"user",entityId:id,reason,oldValue:JSON.stringify({status:user.status}),newValue:JSON.stringify({status}),ip}});}); return ok({done:true as const});
    }
    if(parts[0]==="withdrawals"&&id){
      const decision=body.decision==="reject"?"reject":"approve"; if(decision==="reject"&&!reason)return fail("A reason is required to reject a withdrawal.","reason_required");
      const w=await prisma.withdrawal.findUnique({where:{id},include:{payoutAccount:true,user:true}});if(!w)return notFound("Withdrawal not found.");if(w.status!=="pending_approval")return fail("This withdrawal has already been reviewed.","already_reviewed",undefined,409);
      const events=Array.isArray(w.events)?w.events as Record<string,unknown>[]:[];events.push({id:`${id}_${Date.now()}`,label:decision==="approve"?"Approved":"Rejected",description:reason||"Approved by operations.",timestamp:now.toISOString(),status:decision==="approve"?"done":"current"});
      const approvals=Array.isArray(w.approvals)?w.approvals as Record<string,unknown>[]:[];const nextApprovals=approvals.map(a=>({...a,action:decision==="approve"?"approved":"rejected",at:now.toISOString(),...(decision==="reject"?{reason}:{})}));
      const updated=await prisma.$transaction(async tx=>{
        const changed=await tx.withdrawal.updateMany({where:{id,status:"pending_approval"},data:{status:decision==="approve"?"paid":"rejected",paidAt:decision==="approve"?now:null,rejectionReason:decision==="reject"?reason:null,approvals:nextApprovals as Prisma.InputJsonValue,events:events as Prisma.InputJsonValue}});
        if(changed.count===0)return false;
        const pendingDebit=await tx.wallet.updateMany({where:{userId:w.userId,wallet:"pending_withdrawal",balance:{gte:w.amount}},data:{balance:{decrement:w.amount}}});
        if(pendingDebit.count===0)throw new Error("Pending withdrawal wallet balance is inconsistent.");
        if(decision==="reject") await tx.wallet.update({where:{userId_wallet:{userId:w.userId,wallet:w.wallet}},data:{balance:{increment:w.amount}}});
        await tx.transaction.updateMany({where:{withdrawalId:id},data:{status:decision==="approve"?"successful":"rejected",events:events as Prisma.InputJsonValue}});
        await postJournal(tx, decision==="approve" ? {
          type: "withdrawal",
          description: `Withdrawal ${w.reference} approved and paid`,
          actor: staff.fullName,
          userAccountNumber: w.user.accountNumber,
          reference: `${w.reference}-PAY`,
          entries: withdrawalPaidEntries(w.user.accountNumber, "mpesa", toCents(w.amount), toCents(w.fee)),
        } : {
          type: "withdrawal",
          description: `Withdrawal ${w.reference} rejected — hold released`,
          actor: staff.fullName,
          userAccountNumber: w.user.accountNumber,
          reference: `${w.reference}-RELEASE`,
          entries: withdrawalReleaseEntries(w.user.accountNumber, w.wallet, toCents(w.amount)),
        });
        await tx.auditLog.create({data:{actor:staff.fullName,actorRole:staff.role,action:`withdrawal.${decision}`,entityType:"withdrawal",entityId:w.reference,reason:reason||"Approved within review policy.",oldValue:JSON.stringify({status:w.status}),newValue:JSON.stringify({status:decision==="approve"?"paid":"rejected"}),ip}});
        return true;
      });
      if(!updated)return fail("This withdrawal has already been reviewed.","already_reviewed",undefined,409);
      return ok({done:true as const});
    }
    if(parts[0]==="deposits"&&id){
      const d=await prisma.deposit.findUnique({where:{id}});if(!d)return notFound("Deposit not found.");
      if(body.action==="confirm"||body.action==="reject"){
        /* Operator-verified resolution for manual/reference payments (e.g. PayPal).
           Funds are NEVER credited from a customer-submitted reference alone. */
        const action=body.action==="confirm"?"confirm":"reject";
        if(!reason)return fail("A note is required to record this decision.","reason_required");
        if(d.status!=="pending")return fail("This deposit is no longer pending verification.","already_reviewed",undefined,409);
        const ts=new Date();
        const events=Array.isArray(d.events)?[...d.events as Record<string,unknown>[]]:[];
        events.push({id:`${d.id}_ev_${ts.getTime()}`,label:action==="confirm"?"Payment verified":"Payment rejected",description:action==="confirm"?`Verified by ${staff.fullName}. Deposit Wallet credited.`:reason,timestamp:ts.toISOString(),status:action==="confirm"?"done":"current"});
        try{
          if(action==="confirm"){
            const settled=await settleDeposit({
              depositId:d.id,
              provider:d.method==="paypal"?"paypal":"mpesa",
              actor:staff.fullName,
              label:"Payment verified",
              description:`Verified by ${staff.fullName}. Deposit Wallet credited.`,
              providerReference:d.providerReference,
              audit:{actor:staff.fullName,actorRole:staff.role,reason,ip},
            });
            if(!settled.settled)return fail("This deposit was updated by someone else.","already_reviewed",undefined,409);
          }else{
            await prisma.$transaction(async tx=>{
              const res=await tx.deposit.updateMany({where:{id:d.id,status:"pending"},data:{status:"failed",failureReason:reason,events:events as Prisma.InputJsonValue}});
              if(res.count===0)throw new Error("concurrent_update");
              await tx.auditLog.create({data:{actor:staff.fullName,actorRole:staff.role,action:"deposit.reject",entityType:"deposit",entityId:d.reference,reason,oldValue:JSON.stringify({status:d.status}),newValue:JSON.stringify({status:"failed"}),ip}});
            });
          }
        }catch(err){if(String(err).includes("concurrent_update"))return fail("This deposit was updated by someone else.","already_reviewed",undefined,409);throw err;}
        return ok({done:true as const});
      }
      await audit("deposit.manual_review","deposit",d.reference,reason||"Manual review completed.");return ok({done:true as const});
    }
    if(parts[0]==="risk"&&id){const status=String(body.status) as "open"|"reviewing"|"cleared"|"escalated";if(!["open","reviewing","cleared","escalated"].includes(status))return fail("Choose a valid risk status.","invalid_status");const before=await prisma.riskFlag.findUnique({where:{id}});if(!before)return notFound("Risk flag not found.");const row=await prisma.riskFlag.update({where:{id},data:{status,...(["cleared","escalated"].includes(status)?{resolvedAt:now,resolution:reason||null}:{})}});await audit("risk.status_update","risk_flag",id,reason||"Risk flag reviewed.",{status:before.status},{status});return ok(mapRiskFlag(row));}
    if(parts[0]==="coupons"){
      const code=String(body.code??"").trim().toUpperCase();if(!code)return fail("Enter a coupon code.","invalid_code");
      if(await prisma.coupon.findUnique({where:{code}}))return fail("That coupon code already exists.","duplicate",undefined,409);
      const expiresAt=body.expiresAt?new Date(String(body.expiresAt)):new Date(Date.now()+30*86400000);
      const maxRedemption=body.maxRedemption===""||body.maxRedemption===undefined||body.maxRedemption===null?null:Number(body.maxRedemption);
      if(Number.isNaN(expiresAt.getTime())||expiresAt<=now)return fail("Choose a future expiry date.","invalid_expiry");
      if(maxRedemption!==null&&(!Number.isInteger(maxRedemption)||maxRedemption<1))return fail("Redemption limit must be a positive whole number.","invalid_limit");
      const coupon=await prisma.coupon.create({data:{code,title:String(body.title).trim(),description:String(body.description??"").trim(),type:body.type,value:Number(body.value),expiresAt,maxRedemption,active:true}});
      await audit("coupon.create","coupon",coupon.id,"Coupon created.",undefined,{code,title:coupon.title,type:coupon.type,value:Number(coupon.value)});
      return ok(mapCoupon(coupon),201);
    }
    if(parts[0]==="settings") {const current=await prisma.systemSetting.findUnique({where:{key:"global"}});const old=(current?.value??{}) as Record<string,unknown>;const featureFlags={...((old.featureFlags??{}) as Record<string,unknown>),...((body.featureFlags??{}) as Record<string,unknown>)};const {reason:_settingsReason,...settingsBody}=body as Record<string,unknown>;const value={...old,...settingsBody,featureFlags};const saved=await prisma.systemSetting.upsert({where:{key:"global"},create:{key:"global",value:value as Prisma.InputJsonValue},update:{value:value as Prisma.InputJsonValue}});await audit("settings.update","settings","global",String(body.reason??"Settings updated."),old,value);return ok(saved.value);}
    if(parts[0]==="staff"&&id){
      const target=await prisma.adminStaff.findUnique({where:{id}});if(!target)return notFound("Staff member not found.");
      if(target.role==="super_admin"&&staff.role!=="super_admin")return fail("Only a super admin can change another super admin account.","insufficient_permissions",undefined,403);
      const action=String(body.action);
      if(action==="revoke_sessions"){
        if(id===staff.id)return fail("You cannot revoke your own active session here.","self_action");
        const result=await prisma.adminSession.updateMany({where:{staffId:id,revokedAt:null},data:{revokedAt:now}});
        await audit("staff.revoke_sessions","staff",id,reason||"Staff sessions revoked.",{activeSessions:result.count},{activeSessions:0});
      } else if(action==="activate"||action==="suspend"){
        if(id===staff.id&&action==="suspend")return fail("You cannot suspend your own account.","self_action");
        const status=action==="activate"?"active":"suspended";
        await prisma.adminStaff.update({where:{id},data:{status}});
        if(action==="suspend")await prisma.adminSession.updateMany({where:{staffId:id,revokedAt:null},data:{revokedAt:now}});
        await audit(`staff.${action}`,"staff",id,reason||`Staff account ${status}.`,{status:target.status},{status});
      } else return fail("Choose a valid staff action.","invalid_action");
      return ok({done:true as const});
    }
    if(parts[0]==="products"&&id){
      const status=String(body.status);
      if(!["active","paused","sold_out","retired","draft"].includes(status))return fail("Choose a valid product status.","invalid_status");
      const current=await prisma.product.findUnique({where:{id}});if(!current)return notFound("Product not found.");
      const updated=await prisma.product.update({where:{id},data:{status:status as "active"|"paused"|"sold_out"|"retired"|"draft",version:{increment:1}}});
      await audit("product.status_update","product",id,"Product availability changed.",{status:current.status},{status});return ok(mapProduct(updated));
    }
    if(parts[0]==="campaigns"&&id){
      const status=String(body.status);
      if(!["scheduled","active","ended","draft"].includes(status))return fail("Choose a valid campaign status.","invalid_status");
      const current=await prisma.campaign.findUnique({where:{id}});if(!current)return notFound("Campaign not found.");
      const updated=await prisma.campaign.update({where:{id},data:{status:status as "scheduled"|"active"|"ended"|"draft"}});
      await audit("campaign.status_update","campaign",id,reason||"Campaign status changed.",{status:current.status},{status});return ok(mapCampaign(updated));
    }
    if(parts[0]==="commission-rules"&&id){
      const percent=Number(body.percent);const active=Boolean(body.active);
      if(!Number.isFinite(percent)||percent<0||percent>100)return fail("Commission rate must be between 0 and 100.","invalid_rate");
      const current=await prisma.commissionRule.findUnique({where:{id}});if(!current)return notFound("Commission rule not found.");
      const updated=await prisma.commissionRule.update({where:{id},data:{percent,active}});
      await audit("commission_rule.update","commission_rule",id,reason||"Commission rule updated.",{percent:Number(current.percent),active:current.active},{percent,active});return ok(mapCommissionRule(updated));
    }
    if(parts[0]==="coupons"&&id){
      const current=await prisma.coupon.findUnique({where:{id}});if(!current)return notFound("Coupon not found.");
      const updated=await prisma.coupon.update({where:{id},data:{active:Boolean(body.active)}});
      await audit("coupon.status_update","coupon",id,"Coupon availability changed.",{active:current.active},{active:updated.active});return ok(mapCoupon(updated));
    }
    if(parts[0]==="reconciliation"){
      const key=String(body.dayKey??"").trim();if(!key)return fail("Choose a reconciliation day.","invalid_day");
      const review=await prisma.reconciliationReview.upsert({where:{dayKey:key},create:{dayKey:key,reviewer:staff.fullName},update:{reviewer:staff.fullName,reviewedAt:now}});
      await audit("reconciliation.review","reconciliation",key,"Daily reconciliation reviewed.");return ok(review);
    }
    if(parts[0]==="tickets"&&id&&body.action==="close"){const ticket=await prisma.supportTicket.findUnique({where:{id}});if(!ticket)return notFound("Ticket not found.");await prisma.supportTicket.update({where:{id},data:{status:"closed"}});await audit("ticket.close","support_ticket",ticket.reference,reason||"Ticket closed by support.",{status:ticket.status},{status:"closed"});return ok({done:true as const});}
    if(parts[0]==="tickets"&&id){const message=String(body.message??"").trim();if(!message)return fail("Enter a reply.","invalid");const ticket=await prisma.supportTicket.findUnique({where:{id}});if(!ticket)return notFound("Ticket not found.");await prisma.supportMessage.create({data:{ticketId:id,author:staff.fullName,authorRole:"agent",body:message}});await prisma.supportTicket.update({where:{id},data:{status:"waiting_on_you",lastReplyBy:"agent"}});await audit("ticket.reply","support_ticket",ticket.reference,"Support agent replied to the ticket.");return ok({done:true as const});}
    if(parts[0]==="announcements") {const title=String(body.title??"").trim(),text=String(body.body??"").trim();if(!title||!text)return fail("Title and body are required.","invalid");const item=await prisma.announcement.create({data:{title,body:text,severity:String(body.severity??"info"),audience:String(body.audience??"All members")}});await audit("announcement.create","announcement",item.id,"Announcement published.",undefined,{title,severity:item.severity,audience:item.audience});return ok(item,201);}
    return notFound("Admin action not found.");
  } catch(error){return serverError(error);}
}

export async function DELETE(req: Request, ctx: { params: Promise<{ segments: string[] }> }) {
  try {
    const staff=await getAdminStaff();
    if (!staff) return unauthorized();
    const parts=pathOf(await ctx.params);
    if(!canAccess(staff.role,parts[0]??"",true)) return fail("Your staff role cannot make changes in this area.","insufficient_permissions",undefined,403);
    if(parts[0]!=="announcements"||!parts[1])return notFound("Announcement not found.");
    const existing=await prisma.announcement.findUnique({where:{id:parts[1]}});
    if(!existing)return notFound("Announcement not found.");
    const result=await prisma.announcement.deleteMany({where:{id:parts[1]}});
    if(result.count)await prisma.auditLog.create({data:{actor:staff.fullName,actorRole:staff.role,action:"announcement.delete",entityType:"announcement",entityId:parts[1],reason:"Announcement removed.",oldValue:JSON.stringify({title:existing.title}),newValue:null,ip:requestIp(req)}});
    return result.count?ok({done:true as const}):notFound("Announcement not found.");
  } catch(error){return serverError(error);}
}
