import { accessFor, type Access } from '../../../src/lib/access';
import { readStatus } from './conference';
import { emergencyRoleOf } from './emergency';
import type { Env } from './env';
import { isOwner } from './owners';
import type { SheetUser } from './sheets';
import { statusSeenBy } from './testing';

/**
 * What this account may do right now: its sheet row, read against whether Day
 * 2 has begun on THIS server's clock (or by the Secretariat's override). Every
 * permission check goes through here, so a Day 1 chair's write access ends at
 * 08:30 on Day 2 whatever their browser thinks the time is.
 */
export async function accessOf(env: Env, user: SheetUser): Promise<Access> {
  const status = statusSeenBy(await readStatus(env), user);
  return accessFor(
    {
      role: user.Role,
      committeeId: user['Committee ID'],
      emergencyRole: emergencyRoleOf(user),
      owner: isOwner(env, user.Email),
    },
    status.day2,
  );
}
