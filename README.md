<div align="center">
   <h1>QOTD Deck Bot</h1>
   <p>A Discord bot that automatically posts questions from customizable decks on a schedule.</p>
</div>

## About

The QOTD (Question of the Day) Deck Bot allows server members to engage with questions posted automatically from various "decks" (collections of questions). Users can create and manage these decks, add questions, and subscribe channels to receive questions based on a cron schedule.

## Permissions

*   **General Commands:** Usable by everyone.
*   **Modification Commands:** Require the user to have **Administrator** permission OR a role that has been granted privileged access via the `/role-add` command.
*   **Permission Management Commands:** Require the user to have **Administrator** permission.

## Commands

The bot uses slash commands. Here's a list of available commands:

### General Commands (Usable by Everyone)

*   `/help` - Show help information for the Question of the Day bot.
*   `/deck-list` - List all available decks in the server.
*   `/deck-show name:<deck_name>` - Display all questions in a specific deck.
*   `/subscription` - View current channel's subscription details.

### Modification Commands (Require Admin or Privileged Role)

#### 📚 Deck Management
*   `/deck-create name:<name> [description:<description>]` - Create a new question deck.
*   `/deck-delete name:<deck_name>` - Delete a deck and all its questions.
*   `/deck-rename old_name:<current_name> new_name:<new_name> [description:<new_description>]` - Rename a deck and optionally update its description.
*   `/deck-replace name:<deck_name> all_questions:<questions_separated_by_?>` - Replace all questions in a deck with a new set. (e.g., `question1? question2? question3?`)

#### ❓ Question Management
*   `/question-add deck:<deck_name> question:<question_text>` - Add a question to a deck.
*   `/question-delete deck:<deck_name> question:<question_id_or_text_for_autocomplete>` - Delete a question by ID from a specific deck.
*   `/question-edit id:<question_id_for_autocomplete> question:<new_question_text>` - Edit an existing question by ID.

#### 🔔 Subscription Management
*   `/subscribe schedule:<cron_schedule_or_preset>` - Subscribe this channel to selected question decks with a schedule. You'll be prompted to select decks.
*   `/update-subscription [schedule:<new_cron_schedule>]` - Update the schedule and/or decks for this channel's subscription. You'll be prompted to select/deselect decks.
*   `/unsubscribe` - Remove this channel's subscription to question decks.

### 🔐 Permission Management Commands (Administrator Only)

*   `/role-add role:<role_mention>` - Add a role that can use modification commands.
*   `/role-remove role:<role_name_or_id_for_autocomplete>` - Remove a role from privileged access.
*   `/role-list` - List all roles with modification permissions.

## How It Works

1.  **Create a Deck:** Use `/deck-create` to make a new collection for your questions.
    *   Example: `/deck-create name:"Team Trivia" description:"Weekly trivia questions"`
2.  **Add Questions:** Populate your deck using `/question-add` for individual questions or `/deck-replace` to add many at once.
    *   Example: `/question-add deck:"Team Trivia" question:"What is the capital of France?"`
    *   Example: `/deck-replace name:"Team Trivia" all_questions:"What is 2+2?? Who painted the Mona Lisa?"`
3.  **Subscribe a Channel:** Use `/subscribe` to set up automatic question posting in the current channel.
    *   You'll provide the decks to use and a **schedule**.
    *   Example: `/subscribe schedule:"0 10 * * MON-FRI"` (This means "At 10:00 AM, Monday through Friday")
    *   You will then be prompted to select one or more decks for this subscription.
4.  **Automatic Posting:** The bot will post questions from the subscribed decks according to the schedule. It cycles through questions in order for each subscribed deck. If multiple decks are subscribed, it will post one question from one deck, then the next time from the next deck in the cycle, and so on.

---
*Questions will be posted with rich embeds showing deck info and progress!*