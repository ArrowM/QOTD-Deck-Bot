import { GuildMember, PermissionFlagsBits } from "discord.js";
import { and, eq } from "drizzle-orm";

import { db } from "../database";
import { privilegedRoles } from "../database/schema";

export class PermissionService {
	static async addPrivilegedRole(guildId: string, roleId: string): Promise<void> {
		try {
			await db.insert(privilegedRoles).values({
				guildId,
				roleId,
			});
		}
		catch (error) {
			// If it's a unique constraint error, throw a more specific error
			if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
				throw new Error("Role is already privileged");
			}
			throw error;
		}
	}

	static async removePrivilegedRole(guildId: string, roleId: string): Promise<void> {
		const result = await db
			.delete(privilegedRoles)
			.where(
				and(
					eq(privilegedRoles.guildId, guildId),
					eq(privilegedRoles.roleId, roleId),
				),
			);

		// If no rows were affected, the role wasn't found
		if (result.changes === 0) {
			throw new Error("Privileged role not found");
		}
	}

	static async getPrivilegedRoles(guildId: string) {
		return await db
			.select()
			.from(privilegedRoles)
			.where(eq(privilegedRoles.guildId, guildId))
			.orderBy(privilegedRoles.createdAt);
	}

	static async hasPermission(member: GuildMember): Promise<boolean> {
		// Check if member has administrator permissions
		if (member.permissions.has(PermissionFlagsBits.Administrator)) {
			return true;
		}

		// Check if member has any privileged roles
		if (!member.guild?.id) {
			return false;
		}

		const privilegedRolesList = await this.getPrivilegedRoles(member.guild.id);
		const privilegedRoleIds = privilegedRolesList.map(role => role.roleId);

		// Check if the member has any of the privileged roles
		return member.roles.cache.some(role => privilegedRoleIds.includes(role.id));
	}

	static async isRolePrivileged(guildId: string, roleId: string): Promise<boolean> {
		const result = await db
			.select()
			.from(privilegedRoles)
			.where(
				and(
					eq(privilegedRoles.guildId, guildId),
					eq(privilegedRoles.roleId, roleId),
				),
			)
			.limit(1);

		return result.length > 0;
	}

	static async clearPrivilegedRoles(guildId: string): Promise<number> {
		const result = await db
			.delete(privilegedRoles)
			.where(eq(privilegedRoles.guildId, guildId));

		return result.changes;
	}

	static async getPrivilegedRoleCount(guildId: string): Promise<number> {
		const roles = await this.getPrivilegedRoles(guildId);
		return roles.length;
	}
}