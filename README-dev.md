<div align="center">
   <h1>Developer Readme</h1>
</div>

### Getting Started
Create a Discord bot application and invite it to your server.
See [Discord.js guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html).

Update the `.env` file with your bot's `DISCORD_TOKEN` and `CLIENT_ID`.


## Installation

Clone, install dependencies, and create the database
```shell
git clone https://github.com/ArrowM/QOTD-Deck-Bot
npm install
db:generate
db:migrate
```

### Running the bot
Plain
```shell
npm run start
```

Docker (linux/macOS)
```shell
./launch-docker.sh
```

Docker (Windows)
```shell
.\launch-docker.bat
```