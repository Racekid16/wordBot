import { Constants, type CommandInteraction } from "oceanic.js";
import { wordleWordManager } from "../classes/managers/wordleWordManager.ts";

export default {
    name: "wordle",
    description: "Play a Wordle",
    slash: true,
    options: [
        {
            type: Constants.ApplicationCommandOptionTypes.INTEGER,
            name: "number",
            description: "Play a specific Wordle.",
            required: false,
        },
    ],

    async execute(interaction: CommandInteraction) {
        const number = interaction.data.options?.getInteger("number") || null;
        const word = wordleWordManager.getWord(number);

        if (word === "") {
            await interaction.reply({
                content: "Invalid number!",
                flags: Constants.MessageFlags.EPHEMERAL,
            });
            return;
        }
       
        await interaction.reply({
            content: `${word}`
        });
    }
};
