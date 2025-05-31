import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

export const helpCommands = {
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Show help information for the Question of the Day bot"),
	async execute(interaction: ChatInputCommandInteraction) {
		const embed = new EmbedBuilder()
			.setTitle("🤖 Question of the Day Bot Help")
			.setDescription("A bot that automatically posts questions from customizable decks on a schedule. Below are the available commands and how to use them.")
			.setColor(0x0099ff)
			.addFields(
				{
					name: "🔑 Permissions Explained",
					value: "• **General Commands:** Usable by everyone (e.g., `/deck-list`, `/deck-show`, `/subscription`).\n" +
						"• **Modification Commands:** Most commands for managing decks, questions, and subscriptions. Require **Administrator** permission or a role granted access via `/role-add`.\n" +
						"• **Permission Management Commands:** `/role-add`, `/role-remove`, `/role-list`. Require **Administrator** permission.",
					inline: false,
				},
				{
					name: "📚 Deck Management",
					value: "`/deck-create` - Create a new question deck\n" +
						"`/deck-delete` - Delete a deck and all its questions\n" +
						"`/deck-list` - List all available decks (General)\n" +
						"`/deck-show` - Display all questions in a deck (General)\n" +
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
						"`/subscription` - View current channel subscription details (General)\n" +
						"`/update-subscription` - Update schedule and/or decks for this channel's subscription\n" +
						"`/unsubscribe` - Remove this channel's subscription to question decks",
					inline: false,
				},
				{
					name: "🔐 Permission Management (Administrator Only)",
					value: "`/role-add` - Add a role that can use modification commands\n" +
						"`/role-remove` - Remove a role from privileged access\n" +
						"`/role-list` - List all roles with modification permissions",
					inline: false,
				},
				{
					name: "🔄 How It Works",
					value: "1. **Create Decks:** Use `/deck-create name:<name> [description:<desc>]`.\n" +
						"2. **Add Questions:** Use `/question-add deck:<deck_name> question:<text>` or `/deck-replace name:<deck_name> all_questions:<q1? q2?>`.\n" +
						"3. **Subscribe Channels:** Use `/subscribe schedule:<cron_schedule>`. You'll then be prompted to select decks.\n" +
						"4. **View Subscription:** Check status with `/subscription`.\n" +
						"5. **Automatic Posting:** Questions are posted on schedule. The bot cycles through questions for each deck. If multiple decks are subscribed, it alternates between them for each post.",
					inline: false,
				},
				{
					name: "🗓️ Cron Schedules",
					value: "The bot uses cron syntax for scheduling (e.g., `0 9 * * *` for 9 AM daily).\n" +
						"Common presets like `@daily`, `@weekly` are available via autocomplete.\n" +
						"Examples:\n" +
						"  • `0 9 * * *` - Every day at 9:00 AM\n" +
						"  • `0 12 * * MON-FRI` - Weekdays at 12:00 PM\n" +
						"  • `@weekly` - Every Sunday at midnight\n" +
						"Use an online tool like [crontab.guru](https://crontab.guru/) to build schedules.",
					inline: false,
				},
				{
					name: "💡 Example Usage",
					value: "```\n" +
						"/deck-create name:\"Team Trivia\" description:\"Weekly trivia\"\n" +
						"/question-add deck:\"Team Trivia\" question:\"Capital of France?\"\n" +
						"/deck-replace name:\"Team Trivia\" all_questions:\"What is 2+2?? Who painted the Mona Lisa?\"\n" +
						"/subscribe schedule:\"0 10 * * MON-FRI\"\n" +
						"```\n" +
						"After `/subscribe`, you'll be prompted to select decks for the subscription.",
					inline: false,
				},
			)
			.setFooter({ text: "Questions are posted with rich embeds showing deck info and progress!" })
			.setTimestamp();

		await interaction.reply({ embeds: [embed] });
	},
};