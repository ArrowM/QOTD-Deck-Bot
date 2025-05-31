import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

export const helpCommands = {
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Show help information for the Question of the Day bot"),
	async execute(interaction: ChatInputCommandInteraction) {
		const embed = new EmbedBuilder()
			.setTitle("🤖 Question of the Day Bot Help")
			.setDescription("A bot that automatically posts questions from customizable decks on a schedule.")
			.setColor(0x0099ff)
			.addFields(
				{
					name: "📚 Deck Management",
					value: "`/deck-create` - Create a new question deck\n" +
						"`/deck-delete` - Delete a deck and all its questions\n" +
						"`/deck-list` - List all available decks\n" +
						"`/deck-show` - Display all questions in a deck\n" +
						"`/deck-rename` - Rename a deck and optionally update its description\n" +
						"`/deck-replace` - Replace all questions in a deck with a new set",
					inline: false,
				},
				{
					name: "❓ Question Management",
					value: "`/question-add` - Add a question to a deck\n" +
						"`/question-delete` - Delete a question by ID from a specific deck\n" +
						"`/question-edit` - Edit an existing question by ID",
					inline: false,
				},
				{
					name: "🔔 Subscription Management",
					value: "`/subscribe` - Subscribe this channel to question decks with a schedule\n" +
						"`/subscription` - View current channel subscription details\n" +
      "`/update-subscription` - Update schedule and/or decks for this channel's subscription\n" +
      "`/unsubscribe` - Remove this channel's subscription to question decks",
					inline: false,
				},
				{
					name: "🔐 Permission Management (Admin Only)",
					value: "`/role-add` - Add a role that can use modification commands\n" +
						"`/role-remove` - Remove a role from privileged access\n" +
						"`/role-list` - List all roles with modification permissions",
					inline: false,
				},
				{
					name: "🔄 How It Works",
					value: "1. Create a deck with `/deck-create`\n" +
						"2. Add questions with `/question-add` or replace all with `/deck-replace`\n" +
						"3. Subscribe a channel with `/subscribe`, providing decks and a cron schedule\n" +
						"4. Questions will be posted automatically based on the schedule!\n" +
						"5. The bot cycles through questions in order for each subscribed deck.",
					inline: false,
				},
				{
					name: "💡 Example Usage",
					value: "```\n" +
						"/deck-create name:\"Daily Icebreakers\" description:\"Fun questions\"\n" +
						"/question-add deck:\"Daily Icebreakers\" question:\"What's your favorite hobby?\"\n" +
						"/subscribe decks:\"Daily Icebreakers\" schedule:\"0 9 * * *\"\n" +
						"```",
					inline: false,
				},
			)
			.setFooter({ text: "Questions will be posted with rich embeds showing deck info and progress! 🔒 Some commands require Admin or privileged role permissions." })
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};