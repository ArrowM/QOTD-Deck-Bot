import { Client, EmbedBuilder, TextChannel } from "discord.js";
import * as cron from "node-cron";

import { QuestionService } from "./services/question-service";
import { SubscriptionService } from "./services/subscription-service";

export class QuestionScheduler {
	private client: Client;
	private activeCrons: Map<string, cron.ScheduledTask> = new Map();

	constructor(client: Client) {
		this.client = client;
	}

	async initialize() {
		const subscriptions = await SubscriptionService.getAllActiveSubscriptions();

		for (const { subscription } of subscriptions) {
			this.scheduleSubscription(subscription.channelId, subscription.cronSchedule);
		}

		console.log(`Initialized ${subscriptions.length} scheduled question postings`);
	}

	scheduleSubscription(channelId: string, cronSchedule: string) {
		// Remove existing task if it exists
		if (this.activeCrons.has(channelId)) {
			this.activeCrons.get(channelId)?.stop();
		}

		const task = cron.schedule(cronSchedule, async () => {
			await this.postQuestion(channelId);
		}, {
			scheduled: true,
			timezone: process.env.DEFAULT_SCHEDULE_TIMEZONE,
		});

		this.activeCrons.set(channelId, task);
	}

	unscheduleSubscription(channelId: string) {
		const task = this.activeCrons.get(channelId);

		if (task) {
			task.stop();
			this.activeCrons.delete(channelId);
		}
	}

	private async postQuestion(channelId: string) {
		try {
			const channel = await this.client.channels.fetch(channelId) as TextChannel;
			if (!channel) return;

			const subscriptionData = await SubscriptionService.getSubscription(channelId);
			if (!subscriptionData || subscriptionData.decks.length === 0) return;

			const { decks } = subscriptionData;

			// Fetch all deck questions and calculate remaining unposted questions
			const deckInfo = await Promise.all(decks.map(async (deckData) => {
				const questions = await QuestionService.getQuestionsByDeck(deckData.deck.id);
				const totalQuestions = questions.length;
				// How many questions are left before we reach the end of this deck
				const remainingQuestions = totalQuestions > 0
					? totalQuestions - deckData.currentQuestionIndex
					: 0;

				return {
					deckData,
					questions,
					remainingQuestions,
				};
			}));

			// Filter out decks with no questions
			const validDeckInfo = deckInfo.filter(info => info.questions.length > 0);

			if (validDeckInfo.length === 0) {
				console.warn(`No decks with questions for channel ${channelId}`);
				return;
			}

			// Select a deck using weighted probability based on remaining questions
			const selectedDeckInfo = this.selectDeckByWeight(validDeckInfo);
			const currentDeck = selectedDeckInfo.deckData;
			const deckQuestions = selectedDeckInfo.questions;

			// Get the current question
			const question = deckQuestions[currentDeck.currentQuestionIndex];
			if (!question) {
				// If current question doesn't exist, reset to first question
				await SubscriptionService.updateQuestionIndex(channelId, currentDeck.deck.id, 0);
				return;
			}

			// Create embed with deck information
			const embed = new EmbedBuilder()
				.setTitle(question.question)
				.addFields(
					{ name: "Deck", value: currentDeck.deck.name, inline: true },
					{
						name: "Question",
						value: `${currentDeck.currentQuestionIndex + 1} of ${deckQuestions.length}`,
						inline: true,
					}
				)
				.setColor(0x0099ff)
				.setTimestamp();

			// Add contextual information about remaining questions
			const totalRemaining = validDeckInfo.reduce((sum, info) => sum + info.remainingQuestions, 0);
			embed.addFields({
				name: "Progress",
				value: `${totalRemaining} questions remaining across ${validDeckInfo.length} decks`,
				inline: false,
			});

			await channel.send({ embeds: [embed] });

			// Update to next question in current deck
			const nextQuestionIndex = (currentDeck.currentQuestionIndex + 1) % deckQuestions.length;
			await SubscriptionService.updateQuestionIndex(channelId, currentDeck.deck.id, nextQuestionIndex);

			// If we're cycling back to the first question, update the currentDeckIndex in the subscription
			// This maintains compatibility with the subscription UI that shows current deck
			if (nextQuestionIndex === 0) {
				// Find the index of current deck in the decks array
				const currentDeckIndex = decks.findIndex(d => d.deck.id === currentDeck.deck.id);
				if (currentDeckIndex >= 0) {
					// Move to next deck in the UI display
					const nextDeckIndex = (currentDeckIndex + 1) % decks.length;
					await SubscriptionService.updateCurrentDeckIndex(channelId, nextDeckIndex);
				}
			}
		}
		catch (error) {
			console.error(`Failed to post question for channel ${channelId}:`, error);
		}
	}

	/**
	 * Select a deck using weighted probability based on remaining questions
	 */
	private selectDeckByWeight(deckInfo: Array<{
		deckData: any;
		questions: any[];
		remainingQuestions: number;
	}>) {
		// Calculate total weight (sum of all remaining questions)
		const totalWeight = deckInfo.reduce((sum, info) => sum + info.remainingQuestions, 0);

		// If all decks have completed their cycles, treat all as equal weight
		if (totalWeight === 0) {
			// All decks have used all questions, select randomly with equal probability
			const randomIndex = Math.floor(Math.random() * deckInfo.length);
			return deckInfo[randomIndex];
		}

		// Generate a random value between 0 and totalWeight
		const randomValue = Math.random() * totalWeight;

		// Select a deck based on weighted probability
		let weightSum = 0;
		for (const info of deckInfo) {
			weightSum += info.remainingQuestions;
			if (randomValue <= weightSum) {
				return info;
			}
		}

		// Fallback (should not happen unless there's a calculation error)
		return deckInfo[0];
	}
}