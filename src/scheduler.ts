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

			const { subscription, decks } = subscriptionData;

			// Select current deck based on currentDeckIndex (cycling through decks)
			const currentDeck = decks[subscription.currentDeckIndex % decks.length];
			const deckQuestions = await QuestionService.getQuestionsByDeck(currentDeck.deck.id);

			if (deckQuestions.length === 0) {
				// If current deck has no questions, try the next deck
				await this.tryNextDeck(channelId, subscription, decks);
				return;
			}

			const question = deckQuestions[currentDeck.currentQuestionIndex];
			if (!question) {
				// If current question doesn't exist, reset to first question
				await SubscriptionService.updateQuestionIndex(channelId, currentDeck.deck.id, 0);
				return;
			}

			// Create embed with deck cycling info
			const embed = new EmbedBuilder()
				.setTitle(question.question)
				.addFields(
					{ name: "Deck", value: currentDeck.deck.name, inline: true },
					{
						name: "Question",
						value: `${currentDeck.currentQuestionIndex + 1} of ${deckQuestions.length}`,
						inline: true,
					},
					{
						name: "Deck Progress",
						value: `${subscription.currentDeckIndex + 1} of ${decks.length} decks`,
						inline: true,
					},
				)
				.setColor(0x0099ff)
				.setTimestamp();

			await channel.send({ embeds: [embed] });

			// Update to next question in current deck
			const nextQuestionIndex = (currentDeck.currentQuestionIndex + 1) % deckQuestions.length;
			await SubscriptionService.updateQuestionIndex(channelId, currentDeck.deck.id, nextQuestionIndex);

			// If we've completed this deck (back to question 0), move to next deck
			if (nextQuestionIndex === 0) {
				const nextDeckIndex = (subscription.currentDeckIndex + 1) % decks.length;
				await SubscriptionService.updateCurrentDeckIndex(channelId, nextDeckIndex);
			}

		}
		catch (error) {
			console.error(`Failed to post question for channel ${channelId}:`, error);
		}
	}

	private async tryNextDeck(channelId: string, subscription: any, decks: any[], attempts = 0) {
		// Prevent infinite loop if all decks are empty
		if (attempts >= decks.length) {
			console.warn(`All decks empty for channel ${channelId}`);
			return;
		}

		const nextDeckIndex = (subscription.currentDeckIndex + 1) % decks.length;
		await SubscriptionService.updateCurrentDeckIndex(channelId, nextDeckIndex);

		// Try posting again with the next deck
		const nextDeck = decks[nextDeckIndex];
		const nextDeckQuestions = await QuestionService.getQuestionsByDeck(nextDeck.deck.id);

		if (nextDeckQuestions.length === 0) {
			await this.tryNextDeck(channelId, { ...subscription, currentDeckIndex: nextDeckIndex }, decks, attempts + 1);
		}
		else {
			// Post from the next deck
			await this.postQuestion(channelId);
		}
	}
}