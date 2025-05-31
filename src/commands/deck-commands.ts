import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";

import { DeckService } from "../services/deck-service";
import { QuestionService } from "../services/question-service.ts";
import { handleDeckAutocomplete } from "../utils/autocomplete-helpers";
import { checkModificationPermissions } from "./role-commands";

export const deckCommands = [
	{
		data: new SlashCommandBuilder()
			.setName("deck-create")
			.setDescription("Create a new question deck")
			.addStringOption(option =>
				option.setName("name")
					.setDescription("Name of the deck")
					.setRequired(true))
			.addStringOption(option =>
				option.setName("description")
					.setDescription("Description of the deck")
					.setRequired(false)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!await checkModificationPermissions(interaction)) return;

			const name = interaction.options.getString("name", true);
			const description = interaction.options.getString("description") || undefined;
			const guildId = interaction.guildId!;

			try {
				const deck = await DeckService.createDeck(name, guildId, description);
				const embed = new EmbedBuilder()
					.setTitle("✅ Deck Created")
					.setDescription(`Created deck "${deck.name}" with ID ${deck.id}`)
					.setColor(0x00ff00)
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({
					content: "Failed to create deck. Name might already exist in this server.",
					flags: MessageFlags.Ephemeral,
				});
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("deck-delete")
			.setDescription("Delete a question deck")
			.addStringOption(option =>
				option.setName("name")
					.setDescription("Name of the deck to delete")
					.setRequired(true)
					.setAutocomplete(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!await checkModificationPermissions(interaction)) return;

			const name = interaction.options.getString("name", true);
			const guildId = interaction.guildId!;

			try {
				const deck = await DeckService.getDeckByName(name, guildId);
				if (!deck) {
					await interaction.reply({ content: "Deck not found.", flags: MessageFlags.Ephemeral });
					return;
				}

				await DeckService.deleteDeck(deck.id); // This also deletes questions due to cascade or explicit delete in service
				const embed = new EmbedBuilder()
					.setTitle("🗑️ Deck Deleted")
					.setDescription(`Deleted deck "${name}" and all its questions`)
					.setColor(0xff0000)
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({ content: "Failed to delete deck.", flags: MessageFlags.Ephemeral });
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
			.setName("deck-list")
			.setDescription("List all available decks"),
		async execute(interaction: ChatInputCommandInteraction) {
			const guildId = interaction.guildId!;

			try {
				const decks = await DeckService.getAllDecks(guildId);

				if (decks.length === 0) {
					await interaction.reply({
						content: "No decks found. Create one with `/deck-create`",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				const embed = new EmbedBuilder()
					.setTitle("📚 Available Decks")
					.setColor(0x0099ff)
					.setTimestamp();

				for (const deck of decks) {
					embed.addFields({
						name: `${deck.name}`,
						value: deck.description || "No description",
						inline: false,
					});
				}

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({ content: "Failed to list decks.", flags: MessageFlags.Ephemeral });
			}
		},
	},
	{
		data: new SlashCommandBuilder()
			.setName("deck-show")
			.setDescription("Show all questions in a deck")
			.addStringOption(option =>
				option.setName("name")
					.setDescription("Name of the deck to show")
					.setRequired(true)
					.setAutocomplete(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			const name = interaction.options.getString("name", true);
			const guildId = interaction.guildId!;

			try {
				const deck = await DeckService.getDeckByName(name, guildId);
				if (!deck) {
					await interaction.reply({ content: "Deck not found.", flags: MessageFlags.Ephemeral });
					return;
				}

				const deckWithQuestions = await DeckService.getDeckWithQuestions(deck.id);
				if (!deckWithQuestions || deckWithQuestions.questions.length === 0) {
					await interaction.reply({ content: "This deck has no questions.", flags: MessageFlags.Ephemeral });
					return;
				}

				let descriptionContent = deckWithQuestions.description || "No description";
				descriptionContent += "\n\n**Questions:**\n";
				descriptionContent += deckWithQuestions.questions.map((q) => `${q.question}`).join("\n\n");

				const mainEmbed = new EmbedBuilder()
					.setTitle(`📝 ${deckWithQuestions.name}`)
					.setDescription(descriptionContent)
					.setColor(0x0099ff)
					.setTimestamp();

				await interaction.reply({ embeds: [mainEmbed] });
			}
			catch (error) {
				console.error("Error in deck-show command:", error);
				await interaction.reply({ content: "Failed to show deck.", flags: MessageFlags.Ephemeral });
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
			.setName("deck-rename")
			.setDescription("Rename an existing question deck and optionally update its description")
			.addStringOption(option =>
				option.setName("old_name")
					.setDescription("Current name of the deck")
					.setRequired(true)
					.setAutocomplete(true))
			.addStringOption(option =>
				option.setName("new_name")
					.setDescription("New name for the deck")
					.setRequired(true))
			.addStringOption(option =>
				option.setName("description")
					.setDescription("New description for the deck (leave empty to keep current)")
					.setRequired(false)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!await checkModificationPermissions(interaction)) return;

			const oldName = interaction.options.getString("old_name", true);
			const newName = interaction.options.getString("new_name", true);
			const newDescription = interaction.options.getString("description");
			const guildId = interaction.guildId!;

			try {
				const deck = await DeckService.getDeckByName(oldName, guildId);
				if (!deck) {
					await interaction.reply({ content: "Deck not found.", flags: MessageFlags.Ephemeral });
					return;
				}

				await DeckService.renameDeck(
					deck.id,
					newName,
					newDescription !== null ? newDescription : undefined,
				);

				const embed = new EmbedBuilder()
					.setTitle("✏️ Deck Updated")
					.setDescription(`Updated deck "${oldName}"`)
					.addFields({ name: "New Name", value: newName })
					.setColor(0x00ff00)
					.setTimestamp();

				if (newDescription !== null) {
					embed.addFields({
						name: "New Description",
						value: newDescription || "*No description*",
					});
				}

				await interaction.reply({ embeds: [embed] });
			}
			catch (error) {
				await interaction.reply({
					content: "Failed to update deck. The new name might already exist in this server.",
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
			.setName("deck-replace")
			.setDescription("Replace all questions in a deck with a new set of questions.")
			.addStringOption(option =>
				option.setName("name")
					.setDescription("Name of the deck to modify")
					.setRequired(true)
					.setAutocomplete(true))
			.addStringOption(option =>
				option.setName("all_questions")
					.setDescription("All questions, separated by a question mark (?)")
					.setRequired(true)),
		async execute(interaction: ChatInputCommandInteraction) {
			if (!await checkModificationPermissions(interaction)) return;

			const deckName = interaction.options.getString("name", true);
			const allQuestionsString = interaction.options.getString("all_questions", true);
			const guildId = interaction.guildId!;

			try {
				const deck = await DeckService.getDeckByName(deckName, guildId);
				if (!deck) {
					await interaction.reply({ content: `Deck "${deckName}" not found.`, flags: MessageFlags.Ephemeral });
					return;
				}

				// Delete all existing questions from the deck
				await QuestionService.deleteAllQuestionsFromDeck(deck.id);

				// Split the input string into individual questions using '?' as a delimiter
				// and re-append '?' to each question.
				const newQuestionTexts = allQuestionsString
					.split("?")
					.map(q => q.trim())
					.filter(q => q.length > 0)
					.map(q => `${q}?`);

				if (newQuestionTexts.length === 0 && allQuestionsString.trim() !== "") {
					// This case handles if the user only entered '?' or ' ? ? '
					// If allQuestionsString was empty, it would be caught by the next block.
					await interaction.reply({
						content: "No valid questions found after processing. Please ensure questions are properly separated by '?'.",
						flags: MessageFlags.Ephemeral,
					});
					return;
				}

				if (newQuestionTexts.length === 0) {
					const embed = new EmbedBuilder()
						.setTitle("🔄 Deck Questions Replaced")
						.setDescription(`All questions removed from deck "${deck.name}". The deck is now empty.`)
						.setColor(0xFFA500) // Orange color for warning/empty
						.setTimestamp();
					await interaction.reply({ embeds: [embed] });
					return;
				}

				// Add new questions
				let questionsAddedCount = 0;
				for (const questionText of newQuestionTexts) {
					const addedQuestion = await QuestionService.addQuestion(deck.id, questionText);
					if (addedQuestion) {
						questionsAddedCount++;
					}
				}

				const embed = new EmbedBuilder()
					.setTitle("🔄 Deck Questions Replaced")
					.setDescription(`Replaced all questions in deck "${deck.name}".`)
					.addFields({ name: "New Questions Added", value: questionsAddedCount.toString() })
					.setColor(0x00FF00) // Green for success
					.setTimestamp();

				await interaction.reply({ embeds: [embed] });

			}
			catch (error) {
				console.error("Error in deck-replace command:", error);
				await interaction.reply({ content: "Failed to replace questions in the deck.", flags: MessageFlags.Ephemeral });
			}
		},
		async autocomplete(interaction: AutocompleteInteraction) {
			const focusedOption = interaction.options.getFocused(true);

			if (focusedOption.name === "name") {
				const results = await handleDeckAutocomplete(interaction, focusedOption.value);
				await interaction.respond(results);
			}
		},
	},
];
