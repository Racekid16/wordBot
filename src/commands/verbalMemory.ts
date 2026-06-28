import { Constants, type User, type CommandInteraction } from "oceanic.js";
import { startVerbalTestTimeout } from "../componentHandlers/verbalTestButton.ts";
import { verbalTestManager } from "../classes/managers/verbalTestManager.ts";
import { verbalTestEmbed } from "../components/embeds/verbalTestEmbed.ts";
import { verbalTestButtons } from "../components/buttons/verbalTestButtons.ts";
import { verbalDuelButtons } from "../components/buttons/verbalDuelButtons.ts";

export default {
    name: "verbal-memory",
    description: "Start a verbal memory test",
    slash: true,
    options: [
        {
            type: Constants.ApplicationCommandOptionTypes.USER,
            name: "user",
            description: "Challenge another user",
            required: false,
        },
    ],

    async execute(interaction: CommandInteraction) {
        if (verbalTestManager.get(interaction.user.id)) {
            await interaction.createMessage({
                content: "You already have an ongoing test!",
                flags: Constants.MessageFlags.EPHEMERAL,
            });
            return;
        }

        const opponent = interaction.data.options?.getUser("user");

        if (!opponent) {
            await startVerbalSolo(interaction, interaction.user);
            return;
        }

        if (opponent.id === interaction.user.id) {
            await interaction.createMessage({
                content: "You cannot challenge yourself!",
                flags: Constants.MessageFlags.EPHEMERAL,
            });
            return;
        }

        if (verbalTestManager.get(opponent.id)) {
            await interaction.createMessage({
                content: "The challenged user already has an ongoing test!",
                flags: Constants.MessageFlags.EPHEMERAL,
            });
            return;
        }

        await startVerbalDuel(interaction, interaction.user, opponent);
    },
};

async function startVerbalSolo(interaction: CommandInteraction, user: User) {
    const test = verbalTestManager.start(user);

    await interaction.reply({
        embeds: [verbalTestEmbed(test)],
        components: [verbalTestButtons(test.user.id)],
    });

    const message = await interaction.getOriginal();
    test.messageURL = `https://discord.com/channels/${message.guildID ?? "@me"}/${message.channelID}/${message.id}`;
    startVerbalTestTimeout(test, interaction);
}

async function startVerbalDuel(interaction: CommandInteraction, challenger: User, opponent: User) {
    await interaction.reply({
        content: `${opponent.mention}, do you accept ${challenger.mention}'s challenge?`,
        components: [verbalDuelButtons(challenger.id, opponent.id)],
    });

    setTimeout(async () => {
        const message = await interaction.getOriginal();
        
        if (message.components && message.components.length > 0) {
            await interaction.editOriginal({
                content: `${opponent.mention} ignored the challenge 💀`,
                components: [],
            });
        }
    }, 60000);
}
