// Family member management.

import { prisma } from '../config/prisma.js';
import { getHousehold } from './household.service.js';
import { badRequest, conflict, notFound } from '../utils/http-error.js';
import { localDateToUtcMidnight, todayLocalDate } from '../../../shared/dates.js';
import { memberToDTO } from './mappers.js';
import type {
  createMemberSchema,
  updateMemberSchema,
  deactivateMemberSchema,
} from '../validation/schemas.js';
import type { z } from 'zod';

export async function listMembers(includeInactive = true) {
  const household = await getHousehold();
  const members = await prisma.familyMember.findMany({
    where: {
      householdId: household.id,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
  });
  return members.map(memberToDTO);
}

export async function createMember(
  input: z.infer<typeof createMemberSchema>,
  { force = false }: { force?: boolean } = {},
) {
  const household = await getHousehold();
  const name = input.name.trim();

  const existing = await prisma.familyMember.findFirst({
    where: { householdId: household.id, isActive: true, name },
  });
  if (existing && !force) {
    throw conflict(
      `An active member named "${name}" already exists. Confirm to add anyway.`,
      { field: 'name' },
    );
  }

  const member = await prisma.familyMember.create({
    data: {
      householdId: household.id,
      name,
      color: input.color ?? null,
      emoji: input.emoji ?? null,
    },
  });
  return memberToDTO(member);
}

export async function updateMember(
  id: string,
  input: z.infer<typeof updateMemberSchema>,
) {
  const member = await prisma.familyMember.findUnique({ where: { id } });
  if (!member) throw notFound('Member not found');

  const updated = await prisma.familyMember.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.color !== undefined ? { color: input.color ?? null } : {}),
      ...(input.emoji !== undefined ? { emoji: input.emoji ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return memberToDTO(updated);
}

export async function deactivateMember(
  id: string,
  input: z.infer<typeof deactivateMemberSchema>,
) {
  const household = await getHousehold();
  const member = await prisma.familyMember.findUnique({ where: { id } });
  if (!member) throw notFound('Member not found');

  const today = localDateToUtcMidnight(todayLocalDate(household.timezone));

  if (input.futureAssignments === 'transfer' && !input.transferToMemberId) {
    throw badRequest('transferToMemberId is required when transferring assignments');
  }
  if (input.futureAssignments === 'transfer') {
    const target = await prisma.familyMember.findUnique({
      where: { id: input.transferToMemberId },
    });
    if (!target || !target.isActive) {
      throw badRequest('Transfer target must be an active member');
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.familyMember.update({ where: { id }, data: { isActive: false } });

    if (input.futureAssignments === 'leave') return;

    const newMemberId =
      input.futureAssignments === 'transfer' ? input.transferToMemberId! : null;

    // Future default assignment rules (open-ended or ending in the future).
    await tx.assignmentRule.updateMany({
      where: {
        familyMemberId: id,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: today } }],
      },
      data: { familyMemberId: newMemberId },
    });

    // Future per-date overrides.
    await tx.choreOccurrenceOverride.updateMany({
      where: { assignedMemberId: id, occurrenceDate: { gte: today } },
      data: {
        assignedMemberId: newMemberId,
        hasAssignment: newMemberId != null,
      },
    });
  });

  const updated = await prisma.familyMember.findUnique({ where: { id } });
  return memberToDTO(updated!);
}

export async function reactivateMember(id: string) {
  const member = await prisma.familyMember.findUnique({ where: { id } });
  if (!member) throw notFound('Member not found');
  const updated = await prisma.familyMember.update({
    where: { id },
    data: { isActive: true },
  });
  return memberToDTO(updated);
}

/** How many future recurring/default assignments does this member hold? */
export async function futureAssignmentCount(id: string) {
  const household = await getHousehold();
  const today = localDateToUtcMidnight(todayLocalDate(household.timezone));
  const [rules, overrides] = await Promise.all([
    prisma.assignmentRule.count({
      where: {
        familyMemberId: id,
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: today } }],
      },
    }),
    prisma.choreOccurrenceOverride.count({
      where: { assignedMemberId: id, occurrenceDate: { gte: today } },
    }),
  ]);
  return rules + overrides;
}
