import * as cronstrue from "cronstrue";
import {
	ActionRowBuilder,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
} from "discord.js";

import { DeckService } from "../services/deck-service";
import { SubscriptionService } from "../services/subscription-service";
import { handleScheduleAutocomplete } from "../utils/autocomplete-helpers";
import { checkModificationPermissions } from "./role-commands";

export const subscriptionCommands = [
	{
		data: new SlashCommandBuilder()
			.setName("subscribe")
			.setDescription("Subscribe this channel to question decks")
			.addStringOption(option =>
				option.setName("schedule")
					.setDescription("Cron schedule for questions (e.g., '0 9 * * MON-FRI' or a preset)")
					.setRequired(true)
					.setAutocomplete(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!interaction.guildId) {
				await interaction.reply({
					content: "This command can only be used in a server.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (!await checkModificationPermissions(interaction)) return;

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const scheduleInput = interaction.options.getString("schedule", true);
			const channelId = interaction.channelId;
			const guildId = interaction.guildId!;

			let cronDescription: string;
			try {
				cronDescription = cronstrue.toString(scheduleInput);
			}
			catch (error) {
				await interaction.editReply({
					content: "Invalid cron schedule format. Please check your schedule and try again.",
				});
				return;
			}

			const allDecks = await DeckService.getAllDecks(guildId); // Assumes this method exists

			if (!allDecks || allDecks.length === 0) {
				await interaction.editReply({
					content: "No decks are available in this server to subscribe to. Please create a deck first.",
				});
				return;
			}

			const options = allDecks
				.slice(0, 25) // Limit to 25 options
				.map(deck =>
					new StringSelectMenuOptionBuilder()
						.setLabel(deck.name)
						.setValue(deck.id.toString()),
				);

			if (options.length === 0) { // Should be caught by allDecks.length check, but as a safeguard
				await interaction.editReply({ content: "No suitable decks found for selection." });
				return;
			}

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId(`subscribe_deck_select_${interaction.id}`)
				.setPlaceholder("Select decks to subscribe to")
				.addOptions(options)
				.setMinValues(1)
				.setMaxValues(options.length);

			const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

			const selectMessage = await interaction.editReply({
				content: `Schedule set to: ${cronDescription}.\nPlease select the decks you want to subscribe to:`,
				components: [row],
			});

			const collectorFilter = (i: StringSelectMenuInteraction) =>
				i.customId === `subscribe_deck_select_${interaction.id}` && i.user.id === interaction.user.id;

			try {
				const selectInteraction = await selectMessage.awaitMessageComponent<ComponentType.StringSelect>({
					filter: collectorFilter,
					time: 60000, // 1 minute
				});

				const selectedDeckIds = selectInteraction.values.map(idStr => parseInt(idStr, 10));
				const selectedDecks = allDecks.filter(deck => selectedDeckIds.includes(deck.id));

				if (selectedDeckIds.length === 0) {
					await selectInteraction.update({
						content: "No decks selected. Subscription cancelled.",
						components: [],
					});
					return;
				}

				await SubscriptionService.subscribe(channelId, guildId, selectedDeckIds, scheduleInput);

				const embed = new EmbedBuilder()
					.setTitle("✅ Channel Subscribed")
					.setDescription(`This channel is now subscribed to ${selectedDecks.length} deck(s).`)
					.addFields(
						{ name: "Decks", value: selectedDecks.map(d => d.name).join(", ") || "None", inline: false },
						{ name: "Schedule", value: cronDescription, inline: false },
						{ name: "Cycling", value: "Questions will cycle through decks automatically.", inline: false },
					)
					.setColor(0x00ff00)
					.setTimestamp();

				// Make the final confirmation public
				await interaction.deleteReply(); // Delete the ephemeral select menu prompt
				await interaction.followUp({ embeds: [embed], ephemeral: false });
				// Or, if you want to update the ephemeral message:
				// await selectInteraction.update({ embeds: [embed], components: [], content: null, flags: MessageFlags.Ephemeral });


			}
			catch (error) {
				if (error instanceof Error && (error.message.includes("time") || error.name === "Error [InteractionCollectorError]")) {
					await interaction.editReply({ content: "Deck selection timed out. Subscription cancelled.", components: [] });
				}
				else {
					console.error("Subscribe command - deck selection error:", error);
					await interaction.editReply({
						content: "An error occurred during deck selection. Subscription cancelled.",
						components: [],
					});
				}
			}
		},
		async autocomplete(interaction: AutocompleteInteraction) {
			const focusedOption = interaction.options.getFocused(true);
			if (focusedOption.name === "schedule") {
				const results = await handleScheduleAutocomplete(interaction, focusedOption.value);
				await interaction.respond(results);
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("subscription")
			.setDescription("View current channel subscription details"),
		async execute(interaction: ChatInputCommandInteraction) {
			const channelId = interaction.channelId;

			try {
				const subscriptionData = await SubscriptionService.getSubscription(channelId);

				if (!subscriptionData) {
					await interaction.reply({
						content: "This channel has no active subscription.",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				const { subscription, decks } = subscriptionData;
				const cronDescription = cronstrue.toString(subscription.cronSchedule);

				const embed = new EmbedBuilder()
					.setTitle("📋 Channel Subscription")
					.setDescription(`Subscription with ${decks.length} deck(s)`)
					.addFields(
						{ name: "Schedule", value: cronDescription, inline: false },
						{
							name: "Current Deck",
							value: `${subscription.currentDeckIndex + 1} of ${decks.length}: ${decks[subscription.currentDeckIndex]?.deck.name || "Unknown"}`,
							inline: false,
						},
						{ name: "Status", value: subscription.isActive ? "🟢 Active" : "🔴 Inactive", inline: true },
					)
					.setColor(0x0099ff)
					.setTimestamp();

				const deckDetails = decks.map((deckData, index) => {
					const isCurrentDeck = index === subscription.currentDeckIndex;
					const indicator = isCurrentDeck ? "👉 " : "";
					return `${indicator}**${deckData.deck.name}** - Question ${deckData.currentQuestionIndex + 1}`;
				}).join("\n");

				embed.addFields({ name: "Decks", value: deckDetails || "No decks", inline: false });

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				console.error("Get subscription error:", error);
				await interaction.reply({ content: "Failed to get subscription details.", flags: MessageFlags.Ephemeral });
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("update-subscription")
			.setDescription("Update schedule and/or decks for this channel's subscription")
			.addStringOption(option =>
				option.setName("schedule")
					.setDescription("New cron schedule (optional)")
					.setRequired(false)
					.setAutocomplete(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!interaction.guildId) {
				await interaction.reply({
					content: "This command can only be used in a server.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (!await checkModificationPermissions(interaction)) return;

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const newScheduleInput = interaction.options.getString("schedule");
			const channelId = interaction.channelId;
			const guildId = interaction.guildId!;

			const updates: { schedule?: string; deckIds?: number[] } = {};
			const replyFields = [];

			const currentSubscriptionData = await SubscriptionService.getSubscription(channelId);
			if (!currentSubscriptionData && !newScheduleInput) {
				await interaction.editReply({
					content: "This channel has no active subscription to update, and no new schedule was provided.",
				});
				return;
			}

			if (newScheduleInput) {
				try {
					const cronDescription = cronstrue.toString(newScheduleInput);
					updates.schedule = newScheduleInput;
					replyFields.push({ name: "Schedule Updated To", value: cronDescription });
				}
				catch (error) {
					await interaction.editReply({
						content: "Invalid cron schedule format. Subscription not updated.",
					});
					return;
				}
			}

			const allDecks = await DeckService.getAllDecks(guildId); // Assumes this method exists
			const currentDeckIds = currentSubscriptionData ? currentSubscriptionData.decks.map(d => d.deck.id) : [];

			// Helper function to finalize the update
			const finalizeUpdate = async (interactionToUpdate: ChatInputCommandInteraction | StringSelectMenuInteraction, finalUpdates: typeof updates, finalReplyFields: any[]) => {
				if (Object.keys(finalUpdates).length === 0) {
					// Use editReply for ChatInputCommandInteraction, update for StringSelectMenuInteraction
					const noChangesPayload = {
						content: "No changes were specified for the subscription.",
						components: [],
					};
					if (interactionToUpdate.isMessageComponent()) {
						await interactionToUpdate.update(noChangesPayload);
					}
					else {
						// Assuming interactionToUpdate is a ChatInputCommandInteraction that has been deferred/replied
						await interactionToUpdate.editReply(noChangesPayload);
					}
					return;
				}

				try {
					await SubscriptionService.updateSubscription(channelId, finalUpdates);
					const embed = new EmbedBuilder()
						.setTitle("🔄 Subscription Updated")
						.setDescription("The channel subscription has been updated.")
						.setColor(0x00ff00)
						.setTimestamp();

					if (finalReplyFields.length > 0) {
						embed.addFields(finalReplyFields);
					}
					else {
						embed.setDescription("Subscription updated. No specific changes to detail or no changes were made.");
					}

					const successPayload = { embeds: [embed], components: [], content: null };
					if (interactionToUpdate.isMessageComponent()) {
						await interactionToUpdate.update(successPayload);
					}
					else {
						await interactionToUpdate.editReply(successPayload);
					}

				}
				catch (error) {
					console.error("Update subscription - finalize error:", error);
					let errorMessage = "Failed to update subscription.";
					if (error instanceof Error && error.message.toLowerCase().includes("cron")) {
						errorMessage += " Check your cron schedule format.";
					}
					else if (error instanceof Error && error.message.includes("Subscription not found")) {
						errorMessage = "Subscription not found for this channel. Cannot update.";
					}

					const errorPayload = { content: errorMessage, components: [], embeds: [] };
					try {
						if (interactionToUpdate.isMessageComponent()) {
							await interactionToUpdate.update(errorPayload);
						}
						else {
							await interactionToUpdate.editReply(errorPayload);
						}
					}
					catch (replyError) {
						console.error("Update subscription - failed to send error reply:", replyError);
						// If replying to the interaction fails, try a followup if it's the initial interaction
						// For component interactions, if update fails, there's less recourse.
						if (!interactionToUpdate.isMessageComponent() && interactionToUpdate.deferred) {
							await interactionToUpdate.followUp({ content: errorMessage, ephemeral: true });
						}
					}
				}
			};


			if (!allDecks || allDecks.length === 0) {
				// No decks in server. If user intended to update decks, this is an issue.
				// If only schedule was provided, it's fine.
				// If current subscription has decks, they will be removed if `updates.deckIds` is set to [].
				// If `updates.deckIds` is not set, existing decks remain (if any).
				// For "update-subscription", if no decks are available, we can't offer a choice.
				// We can choose to clear decks if `updates.deckIds` is explicitly set to `[]`.
				// If `newScheduleInput` is the only change, decks are untouched by default in `SubscriptionService`.
				// If user runs `/update-subscription` without args, and no decks exist, it's a "no-op" unless we force `deckIds = []`.

				replyFields.push({ name: "Decks", value: "No decks available in this server for selection." });
				if (currentDeckIds.length > 0 && !newScheduleInput) { // User ran command, maybe to clear decks, but no menu
					updates.deckIds = []; // Explicitly clear decks if no schedule change and no decks to pick from
					replyFields.find(f => f.name === "Decks")!.value = "No decks available in this server. Existing decks will be removed.";
				}
				// If only schedule is being updated, and no decks are available, proceed with schedule update only.
				// `updates.deckIds` will be undefined, `SubscriptionService.updateSubscription` will not touch decks.
				await finalizeUpdate(interaction, updates, replyFields);
				return;
			}

			// Decks are available, present the selection menu
			const options = allDecks
				.slice(0, 25)
				.map(deck => {
					const isCurrent = currentDeckIds.includes(deck.id);
					return new StringSelectMenuOptionBuilder()
						.setLabel(isCurrent ? `${deck.name} (Subscribed)` : deck.name)
						.setValue(deck.id.toString());
					// .setDefault(isCurrent) // setDefault is not for pre-selecting in multi-select
				});

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId(`update_deck_select_${interaction.id}`)
				.setPlaceholder("If desired, select new decks")
				.addOptions(options)
				.setMinValues(0) // Allow empty selection to remove all decks
				.setMaxValues(options.length > 0 ? options.length : 1); // Max is at least 1 if options exist, else 1 for safety (though options.length would be 0)


			const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

			const selectMessage = await interaction.editReply({
				content: "Update subscription: If desired, edit the subscribed decks. Your currently subscribed decks are indicated.",
				components: [row],
			});

			const collectorFilter = (i: StringSelectMenuInteraction) =>
				i.customId === `update_deck_select_${interaction.id}` && i.user.id === interaction.user.id;

			try {
				const selectInteraction = await selectMessage.awaitMessageComponent<ComponentType.StringSelect>({
					filter: collectorFilter,
					time: 60000, // 1 minute
				});

				const selectedDeckIds = selectInteraction.values.map(idStr => parseInt(idStr, 10));
				updates.deckIds = selectedDeckIds; // This will be an empty array if nothing selected

				const selectedDecks = allDecks.filter(deck => selectedDeckIds.includes(deck.id));
				const decksValue = selectedDecks.length > 0 ? selectedDecks.map(d => d.name).join(", ") : "None (all decks removed)";

				// Remove any previous "Decks" field if it existed (e.g. "No decks available")
				const existingDeckFieldIdx = replyFields.findIndex(f => f.name === "Decks");
				if (existingDeckFieldIdx > -1) replyFields.splice(existingDeckFieldIdx, 1);

				replyFields.push({ name: "Decks Updated To", value: decksValue });

				await finalizeUpdate(selectInteraction, updates, replyFields);

			}
			catch (error) { // Timeout or other error for select menu
				if (error instanceof Error && (error.message.includes("time") || error.name === "Error [InteractionCollectorError]")) {
					if (Object.keys(updates).length > 0 && updates.schedule) { // Schedule was set, but deck selection timed out
						await interaction.followUp({
							content: "Deck selection timed out. Updating schedule only.",
							flags: MessageFlags.Ephemeral,
						});
						// Remove deckIds from updates if it was somehow partially set
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { deckIds, ...scheduleOnlyUpdates } = updates;
						const scheduleOnlyReplyFields = replyFields.filter(f => f.name.toLowerCase().includes("schedule"));
						await finalizeUpdate(interaction, scheduleOnlyUpdates, scheduleOnlyReplyFields);
					}
					else {
						await interaction.editReply({
							content: "Deck selection timed out. No changes made to subscription.",
							components: [],
						});
					}
				}
				else {
					console.error("Update subscription - deck selection error:", error);
					await interaction.editReply({
						content: "An error occurred during deck selection. Subscription update may be incomplete or cancelled.",
						components: [],
					});
				}
			}
		},
		async autocomplete(interaction: AutocompleteInteraction) {
			const focusedOption = interaction.options.getFocused(true);
			if (focusedOption.name === "schedule") {
				const results = await handleScheduleAutocomplete(interaction, focusedOption.value);
				await interaction.respond(results);
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("unsubscribe")
			.setDescription("Remove this channel's subscription to question decks"),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!interaction.guildId) {
				await interaction.reply({
					content: "This command can only be used in a server.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			if (!await checkModificationPermissions(interaction)) return;

			await interaction.deferReply();

			const channelId = interaction.channelId;

			try {
				const subscriptionData = await SubscriptionService.getSubscription(channelId);

				if (!subscriptionData) {
					await interaction.editReply({
						content: "This channel has no active subscription to remove.",
					});
					return;
				}

				// Confirmation message with details of what's being removed
				const { subscription, decks } = subscriptionData;
				const cronDescription = cronstrue.toString(subscription.cronSchedule);

				const embed = new EmbedBuilder()
					.setTitle("🗑️ Subscription Removed")
					.setDescription("This channel's subscription has been unsubscribed.")
					.addFields(
						{ name: "Removed Schedule", value: cronDescription, inline: false },
						{ name: "Removed Decks", value: decks.map(d => d.deck.name).join(", ") || "None", inline: false }
					)
					.setColor(0xFF0000)
					.setTimestamp();

				// Remove the subscription
				await SubscriptionService.removeSubscription(channelId);

				await interaction.editReply({ embeds: [embed] });
			}
			catch (error) {
				console.error("Unsubscribe error:", error);
				await interaction.editReply({
					content: "Failed to remove subscription. Please try again later.",
				});
			}
		},
	},
];
