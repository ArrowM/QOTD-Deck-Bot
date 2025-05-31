import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder, MessageFlags,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";

import { PermissionService } from "../services/permission-service";

export const roleCommands = [
	{
		data: new SlashCommandBuilder()
			.setName("role-add")
			.setDescription("Add a role that can use modification commands")
			.addRoleOption(option =>
				option.setName("role")
					.setDescription("Role to add as privileged")
					.setRequired(true))
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!interaction.member || !interaction.guildId) {
				await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
				return;
			}

			// Double-check permissions
			const member = interaction.member as any;
			if (!member.permissions?.has(PermissionFlagsBits.Administrator)) {
				await interaction.reply({
					content: "❌ You need Administrator permissions to manage privileged roles.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const role = interaction.options.getRole("role", true);

			try {
				await PermissionService.addPrivilegedRole(interaction.guildId, role.id);

				const embed = new EmbedBuilder()
					.setTitle("✅ Privileged Role Added")
					.setDescription(`Role ${role} can now use modification commands`)
					.setColor(0x00ff00)
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({
					content: "Failed to add privileged role. It might already be added.",
					flags: MessageFlags.Ephemeral,
				});
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("role-remove")
			.setDescription("Remove a role from being able to use modification commands")
			.addStringOption(option =>
				option.setName("role")
					.setDescription("Role to remove from privileged")
					.setRequired(true)
					.setAutocomplete(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!interaction.member || !interaction.guildId) {
				await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
				return;
			}

			// Double-check permissions
			const member = interaction.member as any;
			if (!member.permissions?.has(PermissionFlagsBits.Administrator)) {
				await interaction.reply({
					content: "❌ You need Administrator permissions to manage privileged roles.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const roleInput = interaction.options.getString("role", true);

			try {
				const privilegedRoles = await PermissionService.getPrivilegedRoles(interaction.guildId);
				const roleToRemove = privilegedRoles.find(r => r.roleId === roleInput);

				if (!roleToRemove) {
					await interaction.reply({ content: "This role is not currently privileged.", flags: MessageFlags.Ephemeral });
					return;
				}

				await PermissionService.removePrivilegedRole(interaction.guildId, roleToRemove.roleId);

				// Try to get the role from the guild to display its name
				const guildRole = interaction.guild?.roles.cache.get(roleToRemove.roleId);
				const roleName = guildRole ? `<@&${guildRole.id}>` : `Role ID: ${roleToRemove.roleId}`;

				const embed = new EmbedBuilder()
					.setTitle("🗑️ Privileged Role Removed")
					.setDescription(`Role ${roleName} can no longer use modification commands`)
					.setColor(0xff0000)
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({ content: "Failed to remove privileged role.", flags: MessageFlags.Ephemeral });
			}
		},
		async autocomplete(interaction: AutocompleteInteraction) {
			if (!interaction.guildId) {
				await interaction.respond([]);
				return;
			}

			const focusedValue = interaction.options.getFocused();

			try {
				const privilegedRoles = await PermissionService.getPrivilegedRoles(interaction.guildId);

				if (privilegedRoles.length === 0) {
					await interaction.respond([]);
					return;
				}

				const choices = [];
				for (const privilegedRole of privilegedRoles) {
					const guildRole = interaction.guild?.roles.cache.get(privilegedRole.roleId);
					const roleName = guildRole ? guildRole.name : `Unknown Role (${privilegedRole.roleId})`;

					if (roleName.toLowerCase().includes(focusedValue.toLowerCase())) {
						choices.push({
							name: roleName,
							value: privilegedRole.roleId,
						});
					}
				}

				await interaction.respond(choices.slice(0, 25)); // Discord limits to 25 options
			}
			catch (error) {
				console.error("Error in role-remove autocomplete:", error);
				await interaction.respond([]);
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("role-list")
			.setDescription("List all roles that can use modification commands")
			.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!interaction.member || !interaction.guildId) {
				await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
				return;
			}

			// Double-check permissions
			const member = interaction.member as any;
			if (!member.permissions?.has(PermissionFlagsBits.Administrator)) {
				await interaction.reply({
					content: "❌ You need Administrator permissions to view privileged roles.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			try {
				const privilegedRoles = await PermissionService.getPrivilegedRoles(interaction.guildId);

				const embed = new EmbedBuilder()
					.setTitle("🔐 Privileged Roles")
					.setDescription("Roles that can use modification commands (in addition to Administrators)")
					.setColor(0x0099ff)
					.setTimestamp();

				if (privilegedRoles.length === 0) {
					embed.addFields({
						name: "No Privileged Roles",
						value: "Only server administrators can use modification commands.",
					});
				}
				else {
					const roleList = privilegedRoles.map(role => `<@&${role.roleId}>`).join("\n");
					embed.addFields({ name: "Privileged Roles", value: roleList });
				}

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({ content: "Failed to list privileged roles.", flags: MessageFlags.Ephemeral });
			}
		},
	},
];

// Helper function to check permissions for modification commands
export async function checkModificationPermissions(interaction: ChatInputCommandInteraction): Promise<boolean> {
	if (!interaction.member || !interaction.guildId) {
		await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
		return false;
	}

	const hasPermission = await PermissionService.hasPermission(interaction.member as any);

	if (!hasPermission) {
		await interaction.reply({
			content: "❌ You need Administrator permissions or a privileged role to use this command.",
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	return true;
}