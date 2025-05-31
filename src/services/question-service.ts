import { eq, max } from "drizzle-orm";

import { db } from "../database";
import { questions } from "../database/schema";

export class QuestionService {
	static async addQuestion(deckId: number, question: string) {
		// Get the next order number
		const [maxOrder] = await db.select({ max: max(questions.order) })
			.from(questions)
			.where(eq(questions.deckId, deckId));

		const nextOrder = (maxOrder?.max || 0) + 1;

		const [newQuestion] = await db.insert(questions).values({
			deckId,
			question,
			order: nextOrder,
		}).returning();
		return newQuestion;
	}

	static async deleteQuestion(questionId: number) {
		await db.delete(questions).where(eq(questions.id, questionId));
	}

	static async deleteAllQuestionsFromDeck(deckId: number) {
		await db.delete(questions).where(eq(questions.deckId, deckId));
	}

	static async editQuestion(questionId: number, newQuestion: string) {
		const [updated] = await db.update(questions)
			.set({ question: newQuestion })
			.where(eq(questions.id, questionId))
			.returning();
		return updated;
	}

	static async getQuestion(questionId: number) {
		const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
		return question;
	}

	static async getQuestionsByDeck(deckId: number) {
		return await db.select()
			.from(questions)
			.where(eq(questions.deckId, deckId))
			.orderBy(questions.order);
	}
}
