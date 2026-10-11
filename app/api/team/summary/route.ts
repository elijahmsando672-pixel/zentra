import { prisma } from "@/lib/server/prisma";
import { ok, unauthorized, serverError } from "@/lib/server/api";
import { getCurrentUser } from "@/lib/server/session";
import { mapTeamMember } from "@/lib/server/mappers";
import { RANKS } from "@/lib/constants";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const [members, rewards] = await Promise.all([
      prisma.teamMember.findMany({ where: { ownerId: user.id } }),
      prisma.teamReward.findMany({ where: { ownerId: user.id } }),
    ]);

    const rankDef = RANKS.find((r) => r.key === user.rank) ?? RANKS[0];
    const nextRankDef = RANKS[RANKS.findIndex((r) => r.key === user.rank) + 1];

    const totalVolume = members.reduce((s, m) => s + Number(m.teamVolume), 0);
    const totalRewards = rewards
      .filter((r) => r.status === "claimed")
      .reduce((s, r) => s + Number(r.amount), 0);
    const pendingRewards = rewards
      .filter((r) => r.status === "pending")
      .reduce((s, r) => s + Number(r.amount), 0);

    const levelFor = (level: 1 | 2 | 3) => {
      const subset = members.filter((m) => m.level === level);
      return {
        level,
        label: level === 1 ? "Direct referrals" : `Level ${level}`,
        members: subset.length,
        activeMembers: subset.filter((m) => m.active).length,
        volume: subset.reduce((s, m) => s + Number(m.teamVolume), 0),
        rewards: rewards
          .filter((r) => r.level === level && r.status === "claimed")
          .reduce((s, r) => s + Number(r.amount), 0),
        ratePercent: rankDef.rewardsRate[`level${level}` as "level1" | "level2" | "level3"],
      };
    };

    const criteria = [
      {
        label: "Direct referrals",
        current: members.filter((m) => m.level === 1).length,
        required: nextRankDef?.minDirect ?? rankDef.minDirect,
      },
      { label: "Team size", current: members.length, required: nextRankDef?.minTeamSize ?? rankDef.minTeamSize },
      {
        label: "Team volume (KES)",
        current: Math.round(totalVolume),
        required: nextRankDef?.minVolume ?? rankDef.minVolume,
      },
    ];

    const rankProgress = nextRankDef
      ? Math.min(
          100,
          Math.round(
            ((Math.min(criteria[0].current / Math.max(criteria[0].required, 1), 1) +
              Math.min(criteria[1].current / Math.max(criteria[1].required, 1), 1) +
              Math.min(criteria[2].current / Math.max(criteria[2].required, 1), 1)) /
              3) *
              100
          )
        )
      : 100;

    return ok({
      totalMembers: members.length,
      directReferrals: members.filter((m) => m.level === 1).length,
      activeMembers: members.filter((m) => m.active).length,
      totalVolume,
      totalRewards,
      pendingRewards,
      currentRank: user.rank,
      nextRank: nextRankDef?.key,
      rankProgress,
      rankCriteria: criteria,
      referralCode: user.referralCode,
      referralUrl: `/register?inviteCode=${encodeURIComponent(user.referralCode)}`,
      levels: [levelFor(1), levelFor(2), levelFor(3)],
      recentMembers: members
        .slice()
        .sort((a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt))
        .slice(0, 6)
        .map(mapTeamMember),
    });
  } catch (error) {
    return serverError(error);
  }
}
