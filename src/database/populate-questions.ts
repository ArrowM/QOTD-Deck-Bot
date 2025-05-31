import { eq } from "drizzle-orm";

import { DeckService } from "../services/deck-service";
import { QuestionService } from "../services/question-service"; // Added import
import { db } from "./index";
import { decks, questions } from "./schema";

// Question deck data
const questionDecks = [
	{
		name: "General Conversation Starters",
		description: "Engaging questions for anyone to spark interesting discussions",
		questions: [
			"What's the most interesting conversation you've had with a stranger?",
			"If you could master any skill instantly, what would it be and why?",
			"What's a book, movie, or show that completely changed your perspective on something?",
			"If you could have dinner with any fictional character, who would you choose and what would you ask them?",
			"What's the best advice you've ever received, and who gave it to you?",
			"If you could live in any fictional world for a week, where would you go?",
			"What's a hobby or interest you have that most people don't know about?",
			"If you could solve one world problem with the snap of your fingers, what would it be?",
			"What's the most spontaneous thing you've ever done?",
			"What's a small act of kindness that really stuck with you?",
			"If you could time travel but only to observe (not change anything), where/when would you go?",
			"What's something you're passionate about that you could talk about for hours?",
			"If you could have a conversation with your pet (or any animal), what would you want to know?",
			"What's a place you've visited that felt completely different from what you expected?",
			"If you could have any job for just one day, what would you choose?",
			"What's something you do when you need to cheer yourself up?",
			"If you could instantly become fluent in any language, which would you pick?",
			"What's the most beautiful thing you've ever seen?",
			"If you could bring back one trend from the past, what would it be?",
			"If you could have a theme song that plays whenever you accomplish something, what would it be?",
			"What's the most memorable gift you've ever given or received?",
			"If you could spend a day in someone else's shoes, whose would you choose?",
			"What's something that always makes you laugh, no matter how many times you see it?",
			"If you could eliminate one minor inconvenience from daily life, what would it be?",
			"What's a question you wish people would ask you more often?",
			"If you could have perfect knowledge about one topic, what would it be?",
			"What's something you thought you'd hate but ended up loving?",
			"If you could make one change to how society works, what would it be?",
			"What's the most interesting documentary or podcast you've watched/listened to recently?",
			"If you could have any view from your bedroom window, what would you want to see?",
			"What's something you've done that you never thought you'd be brave enough to do?",
			"If you could make everyone in the world understand one thing, what would it be?",
			"If you could have dinner with any three people (living or dead), who would you choose?",
			"What's something you wish you could experience for the first time again?",
			"What's the most interesting thing about your hometown that visitors might not know?",
			"If you could guarantee one thing would happen in your lifetime, what would it be?",
		],
	},
	{
		name: "LGBTQ+ Community & Pride",
		description: "Questions celebrating queer experiences, identity, and community",
		questions: [
			"What's a piece of LGBTQ+ media (book, movie, show, etc.) that really resonated with you?",
			"If you could give one piece of advice to someone just starting to explore their identity, what would it be?",
			"What's your favorite way to show pride in your identity?",
			"Who was the first LGBTQ+ person you looked up to or felt represented by?",
			"What's something about the queer community that brings you the most joy?",
			"If you could add one thing to make the world more inclusive, what would it be?",
			"What's a tradition or celebration in your life that feels uniquely meaningful to you?",
			"If you could have dinner with any LGBTQ+ icon (past or present), who would it be?",
			"What's something you wish more people understood about your experience?",
			"What's your favorite pride flag and why does it speak to you?",
			"What's a song that makes you feel empowered or proud of who you are?",
			"What's the most affirming space or community you've been part of?",
			"What's something positive that's changed about LGBTQ+ representation in your lifetime?",
			"What's your favorite way to support other members of the community?",
			"If you could make one LGBTQ+ book/movie/show required reading/viewing, what would it be?",
			"What's a queer joy moment that really stands out in your memory?",
			"What would you want to tell your younger self about identity and self-acceptance?",
			"What's a stereotype about your identity that you'd love to debunk?",
			"If you could create a safe space, what would it look like and include?",
			"What's something you've learned about yourself through being part of the LGBTQ+ community?",
			"What's your favorite thing about Pride season?",
			"If you could magically give every LGBTQ+ person one thing, what would it be?",
			"What's a moment when you felt most connected to the queer community?",
			"What's something you wish straight/cis people knew without you having to explain it?",
			"If you could time travel and attend any historical LGBTQ+ event, which would you choose?",
			"What's a piece of queer culture (slang, tradition, etc.) that you find particularly meaningful?",
			"If you could give a TED talk about any aspect of LGBTQ+ experience, what would your topic be?",
			"What's something that makes you feel most authentically yourself?",
			"What's a way you've seen the community support someone that really moved you?",
			"What's something you're excited about for the future of LGBTQ+ rights and representation?",
			"What's your favorite piece of queer art, music, or literature?",
			"What's your favorite way to celebrate your identity in everyday life?",
			"If you could ensure one thing for future generations of LGBTQ+ people, what would it be?",
			"What's a compliment related to your identity that really meant a lot to you?",
			"What's something you've gained by being open about your identity?",
			"What's your favorite thing about the diversity within the LGBTQ+ community?",
			"If you could design the perfect Pride parade float, what would be its theme?",
			"If you could have any superpower to help the LGBTQ+ community, what would it be?",
			"What's something you love about the resilience of queer people throughout history?",
		],
	},
	{
		name: "Creative & Imagination",
		description: "Questions to spark creativity and explore imaginative scenarios",
		questions: [
			"If you could redesign how humans sleep, what would you change?",
			"If you had to create a new holiday, what would it celebrate and how?",
			"What's an invention that doesn't exist yet but really should?",
			"If you could give everyone in the world one new sense, what would it be?",
			"What would your theme song be if your life was a TV show?",
			"If you could make one rule that everyone had to follow for a day, what would it be?",
			"What's the most interesting building or structure you'd design if money was no object?",
			"If you could make any two animals swap abilities, which would you choose?",
			"What would be the worst possible superpower to have?",
			"If you had to create a new planet, what would make it unique?",
			"If you could make everyone experience one emotion for exactly 5 minutes, what would it be?",
			"What would you put in a time capsule to confuse people 100 years from now?",
			"If you could make any fictional technology real, what would cause the most chaos?",
			"What's the weirdest possible job you could have in the year 3000?",
			"If you had to completely redesign currency, what would you base it on?",
			"What would be the most ridiculous Olympic sport to add?",
			"If you could make one universal hand gesture that everyone would understand, what would it mean?",
			"If you could invent a new color, what would you name it and where would you use it?",
			"What would be the most chaotic thing to make sentient?",
			"If you could design a new human emotion, what would it be and when would people feel it?",
			"What's the most absurd museum exhibit you could create?",
			"If you could make any sound play whenever someone lies, what sound would you choose?",
			"What would be the most inconvenient superpower for a villain to have?",
			"If you had to create a new form of transportation, what would it be?",
			"If you could make any object talk, which would create the most drama?",
			"What would be the most chaotic thing to make gravity-free?",
			"If you could design a new app that does something impossible, what would it do?",
			"What's the most ridiculous thing you could make a national emergency?",
			"If you could add a new room to every house, what would its purpose be?",
			"If you could create a new phobia, what would people be irrationally afraid of?",
			"If you could make any activity an extreme sport, what would be the most entertaining?",
			"What would be the most chaotic thing to make edible?",
			"If you could create a new subscription service for something ridiculous, what would it be?",
			"If you could make any historical figure a social media influencer, who would be most entertaining?",
			"If you could create a new type of weather, what would it be like?",
			"If you could make any everyday object 10 times bigger, what would cause the most chaos?",
			"What would be the most absurd thing to make a documentary about?",
			"If you could create a new dance that everyone had to learn, what would it look like?",
			"If you could make any animal the size of an elephant, which would be most terrifying?",
			"What would be the most chaotic thing to make everyone do at exactly the same time worldwide?",
		],
	},
	{
		name: "Personal Growth & Reflection",
		description: "Thoughtful questions about life experiences, values, and personal development",
		questions: [
			"What's the most important lesson you've learned from a mistake?",
			"If you could go back and have a conversation with yourself from 5 years ago, what would you discuss?",
			"What's a fear you've overcome, and how did you do it?",
			"What's something you do now that your younger self would be surprised by?",
			"What's a compliment you've received that really stuck with you?",
			"What's something you're still learning about yourself?",
			"What's a value or principle that guides most of your decisions?",
			"What's the kindest thing someone has done for you recently?",
			"What's something you've changed your mind about completely?",
			"What's a challenge that ended up making you stronger?",
			"What's something you wish you had more courage to do?",
			"What's a moment when you felt most proud of yourself?",
			"What's the best investment you've made in yourself?",
			"What's something you do that makes you feel most like yourself?",
			"What's a boundary you've learned to set that improved your life?",
			"What's something you're grateful for that you used to take for granted?",
			"What's a small daily practice that has a big impact on your wellbeing?",
			"What's something you want to be remembered for?",
			"What's a habit you're trying to build or break, and how's it going?",
			"What's something you've learned about friendship as you've gotten older?",
			"What's something you're learning to be more patient with?",
			"What's a risk you took that was worth it?",
			"What's something you've realized you don't need to prove to anyone?",
			"What's a way you've grown in the past year that you're proud of?",
			"What's something you wish you could tell everyone who's struggling?",
			"What's a moment when you surprised yourself with your own strength?",
			"What's something you've learned about love (romantic, platonic, or self-love)?",
			"What's a belief you held strongly that you've since questioned or changed?",
			"What's a way you've learned to better support the people you care about?",
			"What's something you used to think was a weakness that you now see as a strength?",
			"What's something you've realized you have more control over than you thought?",
			"What's a way you've learned to be kinder to yourself?",
			"What's something that used to stress you out that doesn't anymore?",
			"What's something you've learned about handling disappointment?",
			"What's a way you've become more authentic in your relationships?",
			"What's something you're learning to trust about yourself?",
			"What's something you've realized about what makes you feel fulfilled?",
			"What's something you wish you had known earlier in life?",
			"What's a way you've become more comfortable with uncertainty?",
			"What's a way you've grown in your ability to listen to others?",
		],
	},
	{
		name: "Fun & Light-hearted",
		description: "Silly, fun questions to bring out laughter and playful conversation",
		questions: [
			"If your life had a soundtrack, what genre would it be?",
			"What's the weirdest thing you've ever eaten and actually liked?",
			"If animals could talk, which species would be the rudest?",
			"If you had to wear a warning label, what would it say?",
			"What's the strangest compliment you've ever received?",
			"If you could be famous for something ridiculous, what would it be?",
			"What's the most useless talent you have?",
			"If your pets could rate you as an owner, what would they say in their review?",
			"What's something you do when you're alone that you'd be embarrassed if people saw?",
			"If you had to choose one conspiracy theory to believe in, which would be the most fun?",
			"If you had to pick a theme song that plays every time you enter a room, what would it be?",
			"What's the most ridiculous thing you've ever been competitive about?",
			"If you could only eat foods that start with the same letter for the rest of your life, which letter would you choose?",
			"What's your most bizarre shower thought?",
			"If you could have any animal as a sidekick, but it had to wear a tiny costume, what would you choose?",
			"What's the most embarrassing thing you've ever said to the wrong person?",
			"If you had to survive a zombie apocalypse with only items from your junk drawer, how screwed would you be?",
			"What's the worst pickup line you've ever heard or used?",
			"If you could replace all the grass in the world with something else, what would it be?",
			"What's something you believed as a child that was completely wrong but made perfect sense at the time?",
			"If you had to live in a TV show for a month, which one would drive you crazy the fastest?",
			"What's the most ridiculous fashion trend you've ever participated in?",
			"If you could make one everyday sound much louder, what would cause the most chaos?",
			"What's the weirdest food combination you secretly enjoy?",
			"What's something you've done that made you feel like a criminal but was totally legal?",
			"If you had to get a tattoo of the last thing you googled, how embarrassed would you be?",
			"What's the weirdest thing you've ever found in your pocket that you don't remember putting there?",
			"If you could make any two animals swap sounds, which combination would be the funniest?",
			"What's something you're convinced you're the only person who does it that way?",
			"If you had to choose between having fingers as long as legs or legs as short as fingers, which would you pick?",
			"What's the most ridiculous thing you've ever done to avoid talking to someone?",
			"If you could replace your hands with any kitchen utensil, what would be most practical?",
			"If you had to communicate only in movie quotes for a week, which movie would give you the best vocabulary?",
			"What's something you do that you're pretty sure is not how it's supposed to be done, but it works for you?",
			"If you could make any noise come out of your car horn, what would cause the most confusion?",
			"What's the most absurd thing you've ever convinced someone was true?",
			"If you had to be haunted by a ghost, what would you want their personality to be like?",
			"What's the weirdest compliment you could give someone that would actually make their day?",
			"If you could make everyone in the world simultaneously do one action, what would be the most hilarious?",
			"What's something you're unreasonably proud of that most people would find completely mundane?",
		],
	},
];

async function populateDatabase(guildId: string) {
	console.log(`Starting database population for guild: ${guildId}...`);

	try {
		// Insert each deck and its questions
		for (const deckData of questionDecks) {
			console.log(`Creating deck: ${deckData.name} for guild: ${guildId}`);

			const deck = await DeckService.createDeck(deckData.name, guildId, deckData.description);

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