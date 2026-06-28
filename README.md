# Word Bot

Verbal Memory Test Wordlist taken from https://humanbenchmark.com/tests/verbal-memory.

Wordle wordlist taken from https://wordfinder.yourdictionary.com/wordle/answers/.

Made using Oceanic, a NodeJS library for interfacing with Discord. Learn more at https://oceanic.ws/.

## Requirements

- NodeJS 18+ and npm

Install using package managers:
- Ubuntu/Debian: `apt install nodejs npm`
- macOS: `brew install node`

## Setup

First, create a Discord bot and obtain its token. It should have the following permissions:
- Send Messages
- Create Public Threads (needed only for Verbal Memory Duels)
- Send Messages in Threads (needed only for Verbal Memory Duels)
- Manage Threads (needed only for Verbal Memory Duels)

Then, install the required node dependencies with:

```
npm install
```

Next, rename ``.env.sample`` to ``.env`` and update it to include your bot token. Never share your bot token.

## Run

Run with:

```
npm start
```

Stop with Ctrl + C.