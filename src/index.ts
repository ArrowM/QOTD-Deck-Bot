import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	REST,
	Routes,
	type SlashCommandOptionsOnlyBuilder,
} from "discord.js";

import { deckCommands } from "./commands/deck-commands";
import { helpCommands } from "./commands/help-commands";
import { questionCommands } from "./commands/question-commands";
import { roleCommands } from "./commands/role-commands";
import { subscriptionCommands } from "./commands/subscription-commands";
import { initializeDatabase } from "./database";
import { ensureDecksExist } from "./database/populate-questions";
import { QuestionScheduler } from "./scheduler";

interface Command {
	data: SlashCommandOptionsOnlyBuilder,

	execute(interaction: ChatInputCommandInteraction): Promise<void>,

	autocomplete?(interaction: AutocompleteInteraction): Promise<void>
}

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

export const questionScheduler = new QuestionScheduler(client);

// Command collection
const commands = new Collection<string, Command>();
const commandsData = [];

// Register all commands
for (const command of [...deckCommands, ...questionCommands, ...subscriptionCommands, ...roleCommands, helpCommands]) {
	commands.set(command.data.name, command);
	commandsData.push(command.data.toJSON());
}

client.once(Events.ClientReady, async (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

	// Initialize database
	initializeDatabase();

	// Initialize scheduler
	await questionScheduler.initialize();
});

// Handle when bot joins a new guild
client.on(Events.GuildCreate, async (guild) => {
	console.log(`Joined new guild: ${guild.name} (ID: ${guild.id})`);

	// Ensure decks are available (in case this is the first guild and bot just started)
	await ensureDecksExist(guild.id);

	// Send a welcome message to the system channel or first available text channel
	try {
		const systemChannel = guild.systemChannel;
		const welcomeChannel = systemChannel || guild.channels.cache.find(
			channel => channel.isTextBased() &&
				channel.permissionsFor(guild.members.me!)?.has(["SendMessages", "ViewChannel"]),
		);

		if (welcomeChannel && welcomeChannel.isTextBased()) {
			await welcomeChannel.send({
				embeds: [{
					title: "👋 Thanks for adding me to your server!",
					description: "I'm a Question of the Day bot that helps spark conversations in your community!\n\n" +
						"**Getting Started:**\n" +
						"• Use `/subscription add` to set up daily questions in a channel\n" +
						"• Use `/deck list` to see available question decks\n" +
						"• Use `/help` for all available commands\n\n" +
						"I've automatically loaded 5 starter question decks with 100 total questions covering:\n" +
						"• General conversation starters\n" +
						"• LGBTQ+ community & pride topics\n" +
						"• Creative & imagination prompts\n" +
						"• Personal growth & reflection\n" +
						"• Fun & light-hearted questions",
					color: 0x5865F2,
					footer: {
						text: "Ready to start meaningful conversations!",
					},
				}],
			});
		}
	}
	catch (error) {
		console.error(`Failed to send welcome message to guild ${guild.name}:`, error);
	}
});

// Handle when bot leaves a guild
client.on(Events.GuildDelete, (guild) => {
	console.log(`Left guild: ${guild.name} (ID: ${guild.id})`);
	// Note: You might want to clean up subscriptions for this guild here
	// but keeping them in case the bot is re-added later might be preferred
});

client.on(Events.InteractionCreate, async (interaction) => {
	await ensureDecksExist(interaction.guildId);

	// Handle autocomplete interactions
	if (interaction.isAutocomplete()) {
		const command = commands.get(interaction.commandName);
		if (!command || !command.autocomplete) return;

		try {
			await command.autocomplete(interaction);
		}
		catch (error) {
			console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
		}
		return;
	}

	if (!interaction.isChatInputCommand()) return;

	const command = commands.get(interaction.commandName);
	if (!command) return;

	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error("Error executing command:", error);
		const reply = { content: "There was an error while executing this command!", ephemeral: true };

		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(reply);
		}
		else {
			await interaction.reply(reply);
		}
	}
});

// Deploy commands
async function deployCommands() {
	const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

	try {
		console.log("Started refreshing application (/) commands.");

		await rest.put(
			Routes.applicationCommands(process.env.CLIENT_ID!),
			{ body: commandsData },
		);

		console.log("Successfully reloaded application (/) commands.");
	}
	catch (error) {
		console.error(error);
	}
}

// Start the bot
async function start() {
	await deployCommands();
	await client.login(process.env.DISCORD_TOKEN);
}

start().catch(console.error);