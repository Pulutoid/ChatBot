# Chat Bot

A  chat bot that interacts with twtich.tv,( or a [Twtich emulator](https://github.com/Pulutoid/Chat-Interface)), using EventSub WebSocket + Helix API, with AI replies and some mini-games. 

## Try it here: 

https://api.abdullah-darwish.com/chatInterface

## Local Setup:
1. Install dependencies:
```bash
	  npm install
```
   
  2. Create a `.env` file (see .env_sample for example).
  3. Run it:
```bash
     node bot.js
```

## Commands

Uses your configured bot prefix (BOTKEYWORD / BOT_KEYWORD).
- `ask <text>` (or `q <text>`)
- `help`
- `roll <dice>` (example: `roll d20+2`)
- `rpg ...`
- `trivia`
- `hint`
- `fact`
- `advice`


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


