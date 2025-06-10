import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { DeckService } from "../services/deck-service";
import { QuestionService } from "../services/question-service";
import { db } from "./index";
import { decks, questions } from "./schema";

// Define the interface to match the JSON structure
interface DeckData {
    name: string;
    questions: string[];
}

// Function to load deck data from JSON file - export it so it can be used in index.ts
export function loadDeckData(): DeckData[] {
    try {
        // Get the current file's directory path using ES module approach
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const filePath = path.join(__dirname, '..', 'data', 'decks.json');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent) as DeckData[];
    } catch (error) {
        console.error('Error loading deck data:', error);
        // Return an empty array if file cannot be read
        return [];
    }
}

async function populateDatabase(guildId: string) {
    console.log(`Starting database population for guild: ${guildId}...`);

    try {
        // Load deck data from JSON file
        const questionDecks = loadDeckData();

        if (questionDecks.length === 0) {
            console.error('No deck data found. Check the decks.json file.');
            return;
        }

        // Insert each deck and its questions
        for (const deckData of questionDecks) {
            console.log(`Creating deck: ${deckData.name} for guild: ${guildId}`);

            const deck = await DeckService.createDeck(deckData.name, guildId);

            if (!deck) {
                console.error(`Failed to create deck: ${deckData.name} for guild: ${guildId}`);
                continue; // Skip to the next deck if creation failed
            }
            console.log(`Deck created with ID: ${deck.id}`);

            let insertedQuestionCount = 0;
            for (const questionText of deckData.questions) {
                const newQuestion = await QuestionService.addQuestion(deck.id, questionText);
                if (newQuestion) {
                    insertedQuestionCount++;
                }
                else {
                    console.error(`Failed to insert question "${questionText}" into deck "${deckData.name}" for guild ${guildId}`);
                }
            }

            if (insertedQuestionCount > 0) {
                console.log(`Inserted ${insertedQuestionCount} questions for deck: ${deckData.name}`);
            }
        }

        console.log(`Database population completed successfully for guild: ${guildId}!`);

        // Print summary for this guild
        const deckCount = await DeckService.getAllDecks(guildId);
        const questionCountResult = await db.select().from(questions)
            .leftJoin(decks, eq(questions.deckId, decks.id))
            .where(eq(decks.guildId, guildId));


        console.log(`\nSummary for guild ${guildId}:`);
        console.log(`- Created ${deckCount.length} decks`);
        console.log(`- Created ${questionCountResult.length} total questions`);

    }
    catch (error) {
        console.error(`Error populating database for guild ${guildId}:`, error);
    }
}

// Function to check if decks already exist and populate if needed
export async function ensureDecksExist(guildId: string) {
    try {
        const existingDecks = await DeckService.getAllDecks(guildId);

        if (existingDecks.length === 0) {
            console.log(`No decks found for guild ${guildId}, populating database with starter decks...`);
            await populateDatabase(guildId);
        }
    }
    catch (error) {
        console.error(`Error checking/populating decks for guild ${guildId}:`, error);
    }
}