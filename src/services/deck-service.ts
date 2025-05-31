import { and, desc, eq } from "drizzle-orm";

import { db } from "../database";
import { decks, questions } from "../database/schema";

export class DeckService {
	static async createDeck(name: string, guildId: string, description?: string) {
		const [deck] = await db.insert(decks).values({
			name,
			guildId,
			description,
		}).returning();
		return deck;
	}

	static async deleteDeck(deckId: number) {
		await db.delete(decks).where(eq(decks.id, deckId));
	}

	static async getDeck(deckId: number) {
		const [deck] = await db.select().from(decks).where(eq(decks.id, deckId));
		return deck;
	}

	static async getDeckByName(name: string, guildId: string) {
		const [deck] = await db.select().from(decks).where(
			and(
				eq(decks.name, name),
				eq(decks.guildId, guildId),
			),
		);
		return deck;
	}

	static async getAllDecks(guildId: string) {
		return db.select()
			.from(decks)
			.where(eq(decks.guildId, guildId))
			.orderBy(desc(decks.createdAt));
	}

	static async getDeckWithQuestions(deckId: number) {
		const deck = await this.getDeck(deckId);
		if (!deck) return null;

		const deckQuestions = await db.select()
			.from(questions)
			.where(eq(questions.deckId, deckId))
			.orderBy(questions.order);

		return { ...deck, questions: deckQuestions };
	}

	static async renameDeck(deckId: number, newName: string, newDescription?: string) {
		const updateData: { name: string; description?: string } = {
			name: newName,
		};

		// Only include description in the update if it's provided
		if (newDescription !== undefined) {
			updateData.description = newDescription;
		}

		const [updated] = await db.update(decks)
			.set(updateData)
			.where(eq(decks.id, deckId))
			.returning();

		return updated;
	}
}
