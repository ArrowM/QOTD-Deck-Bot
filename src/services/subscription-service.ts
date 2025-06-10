import { and, eq, sql } from "drizzle-orm";

import { db } from "../database";
import { decks, subscriptionDecks, subscriptions } from "../database/schema";
import { questionScheduler } from "../index"; // Adjusted import path assuming index.ts is in src/
import { QuestionService } from "./question-service";

export interface SubscriptionWithDecks {
	subscription: typeof subscriptions.$inferSelect;
	decks: Array<{
		deck: typeof decks.$inferSelect;
		currentQuestionIndex: number;
	}>;
}

export class SubscriptionService {
	static async subscribe(channelId: string, guildId: string, deckIds: number[], schedule: string) {

		if (deckIds.length === 0) {
			throw new Error("Cannot subscribe with an empty list of decks. This should be validated by the command.");
		}

		return await db.transaction(async (tx) => {
			const existingResult = await tx.select()
				.from(subscriptions)
				.where(eq(subscriptions.channelId, channelId))
				.limit(1);
			let subscription = existingResult.length > 0 ? existingResult[0] : undefined;

			const subscriptionData = {
				guildId, // guildId is only needed for new subscriptions
				cronSchedule: schedule,
				isActive: true,
				currentDeckIndex: 0,
			};

			if (subscription) {
				// Update existing subscription
				const [updatedSub] = await tx.update(subscriptions)
					.set({
						cronSchedule: subscriptionData.cronSchedule,
						isActive: subscriptionData.isActive,
						currentDeckIndex: subscriptionData.currentDeckIndex,
					})
					.where(eq(subscriptions.id, subscription.id))
					.returning();
				subscription = updatedSub;

				await tx.delete(subscriptionDecks)
					.where(eq(subscriptionDecks.subscriptionId, subscription.id));
			}
			else {
				// Create new subscription
				const [newSub] = await tx.insert(subscriptions).values({
					channelId,
					guildId: subscriptionData.guildId,
					cronSchedule: subscriptionData.cronSchedule,
					isActive: subscriptionData.isActive,
					currentDeckIndex: subscriptionData.currentDeckIndex,
				}).returning();
				subscription = newSub;
			}

			const deckAssociations = deckIds.map(deckId => ({
				subscriptionId: subscription!.id,
				deckId,
				currentQuestionIndex: 0, // Initialize question index for each deck
			}));

			if (deckAssociations.length > 0) {
				await tx.insert(subscriptionDecks).values(deckAssociations);
			}
			else {
				// This case should be prevented by the initial deckIds.length check
				// If somehow reached, ensure subscription is inactive
				await tx.update(subscriptions)
					.set({ isActive: false })
					.where(eq(subscriptions.id, subscription!.id));
				questionScheduler.unscheduleSubscription(channelId);
				return subscription!;
			}

			questionScheduler.scheduleSubscription(channelId, schedule);
			return subscription!;
		});
	}

	static async updateSubscription(channelId: string, updates: { schedule?: string; deckIds?: number[] }) {
		return await db.transaction(async (tx) => {
			const existingResult = await tx.select()
				.from(subscriptions)
				.where(eq(subscriptions.channelId, channelId))
				.limit(1);

			if (existingResult.length === 0) {
				throw new Error("Subscription not found for this channel.");
			}
			let subscription = existingResult[0];

			const updatePayload: Partial<Omit<typeof subscriptions.$inferInsert, "id" | "channelId" | "guildId" | "createdAt">> = {};

			let finalSchedule = subscription.cronSchedule;
			let finalIsActive = subscription.isActive; // Start with current active state

			if (updates.schedule !== undefined) {
				updatePayload.cronSchedule = updates.schedule;
				finalSchedule = updates.schedule;
			}

			if (updates.deckIds !== undefined) {
				updatePayload.currentDeckIndex = 0; // Reset deck cycle when decks change

				await tx.delete(subscriptionDecks)
					.where(eq(subscriptionDecks.subscriptionId, subscription.id));

				if (updates.deckIds.length > 0) {
					const newAssociations = updates.deckIds.map(deckId => ({
						subscriptionId: subscription.id,
						deckId: deckId,
						currentQuestionIndex: 0, // Reset question index for new/updated decks
					}));
					await tx.insert(subscriptionDecks).values(newAssociations);
					updatePayload.isActive = true; // Explicitly set active if decks are provided
					finalIsActive = true;
				}
				else {
					// Explicitly removing all decks, so deactivate
					updatePayload.isActive = false;
					finalIsActive = false;
				}
			}

			// Apply updates to the subscription record if any changes were staged
			if (Object.keys(updatePayload).length > 0) {
				const [updatedSub] = await tx.update(subscriptions)
					.set(updatePayload)
					.where(eq(subscriptions.id, subscription.id))
					.returning();
				subscription = updatedSub;
				// Refresh finalIsActive and finalSchedule from the actual updated record
				finalIsActive = subscription.isActive;
				finalSchedule = subscription.cronSchedule;
			}

			// After all potential updates, re-evaluate active status based on actual deck count
			const deckCountResult = await tx.select({ count: sql<number>`count(*)` })
				.from(subscriptionDecks)
				.where(eq(subscriptionDecks.subscriptionId, subscription.id));

			const hasDecks = deckCountResult[0].count > 0;

			// If the subscription is marked active but has no decks, it must be deactivated.
			if (finalIsActive && !hasDecks) {
				finalIsActive = false;
				// If the database state was different, update it
				if (subscription.isActive) {
					await tx.update(subscriptions).set({ isActive: false }).where(eq(subscriptions.id, subscription.id));
				}
			}
			// If it's marked inactive but gained decks through this update, it should have been set active already by updatePayload.
			// This check primarily corrects `finalIsActive` if it was true but became effectively false due to no decks.

			// Update scheduler based on the definitive final active state and schedule
			if (finalIsActive) {
				questionScheduler.scheduleSubscription(channelId, finalSchedule);
			}
			else {
				questionScheduler.unscheduleSubscription(channelId);
			}

			// Fetch the very final state of the subscription from DB to return
			const finalSubscriptionRecord = await tx.select()
				.from(subscriptions)
				.where(eq(subscriptions.id, subscription.id))
				.limit(1);

			return finalSubscriptionRecord[0]!;
		});
	}

	static async getSubscription(channelId: string): Promise<SubscriptionWithDecks | null> {
		const result = await db.select({
			subscription: subscriptions,
			deck: decks,
			currentQuestionIndex: subscriptionDecks.currentQuestionIndex,
		})
			.from(subscriptions)
			.innerJoin(subscriptionDecks, eq(subscriptions.id, subscriptionDecks.subscriptionId))
			.innerJoin(decks, eq(subscriptionDecks.deckId, decks.id))
			.where(eq(subscriptions.channelId, channelId));

		if (result.length === 0) return null;

		const subscription = result[0].subscription;
		const subscribedDecks = result.map(row => ({
			deck: row.deck,
			currentQuestionIndex: row.currentQuestionIndex,
		}));

		return { subscription, decks: subscribedDecks };
	}

	static async getAllActiveSubscriptions(): Promise<SubscriptionWithDecks[]> {
		const result = await db.select({
			subscription: subscriptions,
			deck: decks,
			currentQuestionIndex: subscriptionDecks.currentQuestionIndex,
		})
			.from(subscriptions)
			.innerJoin(subscriptionDecks, eq(subscriptions.id, subscriptionDecks.subscriptionId))
			.innerJoin(decks, eq(subscriptionDecks.deckId, decks.id))
			.where(eq(subscriptions.isActive, true));

		const subscriptionMap = new Map<number, SubscriptionWithDecks>();

		for (const row of result) {
			const subId = row.subscription.id;

			if (!subscriptionMap.has(subId)) {
				subscriptionMap.set(subId, {
					subscription: row.subscription,
					decks: [],
				});
			}

			subscriptionMap.get(subId)!.decks.push({
				deck: row.deck,
				currentQuestionIndex: row.currentQuestionIndex,
			});
		}

		return Array.from(subscriptionMap.values());
	}

	static async updateCurrentDeckIndex(channelId: string, newDeckIndex: number) {
		await db.update(subscriptions)
			.set({ currentDeckIndex: newDeckIndex })
			.where(eq(subscriptions.channelId, channelId));
	}

	static async updateQuestionIndex(channelId: string, deckId: number, newQuestionIndex: number) {
		const subResult = await db.select({ id: subscriptions.id })
			.from(subscriptions)
			.where(eq(subscriptions.channelId, channelId))
			.limit(1);

		if (subResult.length === 0) return;
		const subscriptionId = subResult[0].id;

		await db.update(subscriptionDecks)
			.set({ currentQuestionIndex: newQuestionIndex })
			.where(and(
				eq(subscriptionDecks.subscriptionId, subscriptionId),
				eq(subscriptionDecks.deckId, deckId),
			));
	}

	static async removeSubscription(channelId: string): Promise<boolean> {
		return await db.transaction(async (tx) => {
			const existingResult = await tx.select()
				.from(subscriptions)
				.where(eq(subscriptions.channelId, channelId))
				.limit(1);

			if (existingResult.length === 0) {
				return false; // Nothing to remove
			}

			const subscription = existingResult[0];

			// First delete subscription deck associations
			await tx.delete(subscriptionDecks)
				.where(eq(subscriptionDecks.subscriptionId, subscription.id));

			// Then delete the subscription itself
			await tx.delete(subscriptions)
				.where(eq(subscriptions.id, subscription.id));

			// Unschedule any pending jobs for this subscription
			questionScheduler.unscheduleSubscription(channelId);

			return true;
		});
	}

	static async getUnpostedQuestionCount(deckId: number, currentQuestionIndex: number) {
		const questions = await QuestionService.getQuestionsByDeck(deckId);
		const total = questions.length;
		const remaining = total > 0 ? total - currentQuestionIndex : 0;

		return { total, remaining };
	}
}