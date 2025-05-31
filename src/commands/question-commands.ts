import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";

import { DeckService } from "../services/deck-service";
import { QuestionService } from "../services/question-service";
import {
	handleDeckAutocomplete,
	handleGlobalQuestionAutocomplete,
	handleQuestionAutocomplete,
} from "../utils/autocomplete-helpers";
import { checkModificationPermissions } from "./role-commands";

export const questionCommands = [
	{
		data: new SlashCommandBuilder()
			.setName("question-add")
			.setDescription("Add a question to a deck")
			.addStringOption(option =>
				option.setName("deck")
					.setDescription("Name of the deck")
					.setRequired(true)
					.setAutocomplete(true))
			.addStringOption(option =>
				option.setName("question")
					.setDescription("The question to add")
					.setRequired(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!await checkModificationPermissions(interaction)) return;

			const deckName = interaction.options.getString("deck", true);
			const questionText = interaction.options.getString("question", true);
			const guildId = interaction.guildId!;

			try {
				const deck = await DeckService.getDeckByName(deckName, guildId);
				if (!deck) {
					await interaction.reply({ content: "Deck not found.", flags: MessageFlags.Ephemeral });
					return;
				}

				const question = await QuestionService.addQuestion(deck.id, questionText);
				const embed = new EmbedBuilder()
					.setTitle("✅ Question Added")
					.setDescription(`Added question to deck "${deckName}"`)
					.addFields({ name: "Question", value: question.question })
					.setColor(0x00ff00)
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({
					content: "Failed to add question. This question might already exist in the deck.",
					flags: MessageFlags.Ephemeral,
				});
			}
		},
		async autocomplete(interaction: AutocompleteInteraction) {
			const focusedValue = interaction.options.getFocused();
			const results = await handleDeckAutocomplete(interaction, focusedValue);
			await interaction.respond(results);
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("question-delete")
			.setDescription("Delete a question from a specific deck")
			.addStringOption(option =>
				option.setName("deck")
					.setDescription("Name of the deck to delete a question from")
					.setRequired(true)
					.setAutocomplete(true))
			.addIntegerOption(option =>
				option.setName("question")
					.setDescription("The question to delete (ID will be used)")
					.setRequired(true)
					.setAutocomplete(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!await checkModificationPermissions(interaction)) return;

			const deckName = interaction.options.getString("deck", true);
			const questionId = interaction.options.getInteger("question", true);
			const guildId = interaction.guildId!;

			try {
				const deck = await DeckService.getDeckByName(deckName, guildId);
				if (!deck) {
					await interaction.reply({ content: `Deck "${deckName}" not found.`, flags: MessageFlags.Ephemeral });
					return;
				}

				const question = await QuestionService.getQuestion(questionId);
				if (!question || question.deckId !== deck.id) {
					await interaction.reply({
						content: "Question not found in the specified deck or does not exist.",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				await QuestionService.deleteQuestion(questionId);
				const embed = new EmbedBuilder()
					.setTitle("🗑️ Question Deleted")
					.setDescription(`Question has been deleted from deck "${deckName}"`)
					.addFields({ name: "Deleted Question", value: question.question })
					.setColor(0xff0000)
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				console.error("Error in question-delete execute:", error);
				await interaction.reply({ content: "Failed to delete question.", flags: MessageFlags.Ephemeral });
			}
		},
		async autocomplete(interaction: AutocompleteInteraction) {
			const focusedOption = interaction.options.getFocused(true);

			if (focusedOption.name === "deck") {
				const results = await handleDeckAutocomplete(interaction, focusedOption.value);
				await interaction.respond(results);
			}
			else if (focusedOption.name === "question") {
				const results = await handleQuestionAutocomplete(interaction, focusedOption.value.toString());
				await interaction.respond(results);
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("question-edit")
			.setDescription("Edit a question by ID")
			.addIntegerOption(option =>
				option.setName("id")
					.setDescription("ID of the question to edit")
					.setRequired(true)
					.setAutocomplete(true))
			.addStringOption(option =>
				option.setName("question")
					.setDescription("New question text")
					.setRequired(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!await checkModificationPermissions(interaction)) return;

			const questionId = interaction.options.getInteger("id", true);
			const newQuestionText = interaction.options.getString("question", true);

			try {
				const oldQuestion = await QuestionService.getQuestion(questionId);
				if (!oldQuestion) {
					await interaction.reply({ content: "Question not found.", flags: MessageFlags.Ephemeral });
					return;
				}

				const updatedQuestion = await QuestionService.editQuestion(questionId, newQuestionText);
				const embed = new EmbedBuilder()
					.setTitle("✏️ Question Updated")
					.setDescription("Question has been updated")
					.addFields(
						{ name: "Old Question", value: oldQuestion.question },
						{ name: "New Question", value: updatedQuestion?.question || newQuestionText },
					)
					.setColor(0xffaa00)
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({
					content: "Failed to edit question. This question might already exist in the deck.",
					flags: MessageFlags.Ephemeral,
				});
			}
		},
		async autocomplete(interaction: AutocompleteInteraction) {
			const focusedValue = interaction.options.getFocused().toString();
			const results = await handleGlobalQuestionAutocomplete(interaction, focusedValue);
			await interaction.respond(results);
		},
	},
];
