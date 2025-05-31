import { AutocompleteInteraction } from "discord.js";

import { DeckService } from "../services/deck-service";

/**
 * Handles autocomplete for deck name selection
 */
export async function handleDeckAutocomplete(
	interaction: AutocompleteInteraction,
	focusedValue: string,
	allowMultiple = false,
) {
	try {
		const guildId = interaction.guildId!;
		const decks = await DeckService.getAllDecks(guildId);

		if (allowMultiple) {
			// Handle comma-separated values for multiple deck selection
			const parts = focusedValue.split(",");
			const currentDeckQuery = parts.pop()?.trim() || "";
			const baseValue = parts.join(",") + (parts.length > 0 ? "," : "");

			const filtered = decks
				.filter(deck => deck.name.toLowerCase().includes(currentDeckQuery.toLowerCase()))
				.slice(0, 25);

			return filtered.map(deck => ({
				name: deck.name,
				value: baseValue + deck.name,
			}));
		}
		else {
			// Single deck selection
			const filtered = decks
				.filter(deck => deck.name.toLowerCase().includes(focusedValue.toLowerCase()))
				.slice(0, 25);

			return filtered.map(deck => ({
				name: deck.name,
				value: deck.name,
			}));
		}
	}
	catch (error) {
		console.error("Error in deck autocomplete:", error);
		return [];
	}
}

/**
 * Handles autocomplete for question selection from a specific deck
 */
export async function handleQuestionAutocomplete(
	interaction: AutocompleteInteraction,
	focusedValue: string,
	deckName?: string,
) {
	try {
		const guildId = interaction.guildId!;

		if (!deckName) {
			deckName = interaction.options.getString("deck");
			if (!deckName) {
				return []; // No deck selected yet
			}
		}

		const deck = await DeckService.getDeckByName(deckName, guildId);
		if (!deck) {
			return []; // Selected deck not found
		}

		const deckWithQuestions = await DeckService.getDeckWithQuestions(deck.id);
		if (!deckWithQuestions || deckWithQuestions.questions.length === 0) {
			return [{ name: "No questions in this deck", value: -1 }];
		}

		const filteredQuestions = deckWithQuestions.questions
			.filter(q => q.question.toLowerCase().includes(focusedValue.toLowerCase()))
			.slice(0, 25);

		return filteredQuestions.map(q => ({
			name: q.question.substring(0, 100), // Discord option name limit
			value: q.id,
		}));
	}
	catch (error) {
		console.error("Error in question autocomplete:", error);
		return [];
	}
}

/**
 * Handles autocomplete for questions across all decks
 */
export async function handleGlobalQuestionAutocomplete(
	interaction: AutocompleteInteraction,
	focusedValue: string,
) {
	try {
		const guildId = interaction.guildId!;
		const decks = await DeckService.getAllDecks(guildId);
		const allQuestions = [];

		for (const deck of decks) {
			const deckWithQuestions = await DeckService.getDeckWithQuestions(deck.id);
			if (deckWithQuestions) {
				for (const question of deckWithQuestions.questions) {
					allQuestions.push({
						id: question.id,
						question: question.question,
						deckName: deck.name,
					});
				}
			}
		}

		const filtered = allQuestions
			.filter(q =>
				q.id.toString().includes(focusedValue) ||
				q.question.toLowerCase().includes(focusedValue.toLowerCase()) ||
				q.deckName.toLowerCase().includes(focusedValue.toLowerCase()),
			)
			.slice(0, 25);

		return filtered.map(q => ({
			name: `ID: ${q.id} | ${q.deckName} | ${q.question.substring(0, 60)}${q.question.length > 60 ? "..." : ""}`,
			value: q.id,
		}));
	}
	catch (error) {
		console.error("Error in global question autocomplete:", error);
		return [];
	}
}

/**
 * Common cron schedule presets for autocomplete
 */
export const SCHEDULE_PRESETS = [
	{ name: "Every minute", value: "* * * * *" },
	{ name: "Daily at 9 AM", value: "0 9 * * *" },
	{ name: "Daily at 12 PM (Noon)", value: "0 12 * * *" },
	{ name: "Daily at 6 PM", value: "0 18 * * *" },
	{ name: "Weekdays at 9 AM", value: "0 9 * * 1-5" },
	{ name: "Weekdays at 2 PM", value: "0 14 * * 1-5" },
	{ name: "Weekends at 10 AM", value: "0 10 * * 0,6" },
	{ name: "Mondays at 9 AM", value: "0 9 * * 1" },
	{ name: "Wednesdays at 12 PM", value: "0 12 * * 3" },
	{ name: "Fridays at 5 PM", value: "0 17 * * 5" },
	{ name: "Every 2 hours", value: "0 */2 * * *" },
	{ name: "Every 6 hours", value: "0 */6 * * *" },
	{ name: "Twice daily (9 AM & 6 PM)", value: "0 9,18 * * *" },
];

/**
 * Handles autocomplete for cron schedule selection
 */
export async function handleScheduleAutocomplete(
	interaction: AutocompleteInteraction,
	focusedValue: string,
) {
	const filtered = SCHEDULE_PRESETS
		.filter(preset =>
			preset.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
			preset.value.includes(focusedValue),
		)
		.slice(0, 25);

	return filtered.map(preset => ({
		name: preset.name,
		value: preset.value,
	}));
}
