import { Constants, type CommandInteraction, type ComponentInteraction } from "oceanic.js";
import { verbalTestManager } from "../classes/managers/verbalTestManager.ts";
import { verbalDuelManager } from "../classes/managers/verbalDuelManager.ts";
import { VerbalDuel } from "../classes/verbalDuel.ts";
import { VerbalTest } from "../classes/verbalTest.ts";
import { verbalTestEmbed } from "../components/embeds/verbalTestEmbed.ts";
import { verbalDuelFinishedEmbed } from "../components/embeds/verbalDuelFinishedEmbed.ts";
import { verbalTestFinishedEmbed } from "../components/embeds/verbalTestFinishedEmbed.ts";
import { verbalTestButtons } from "../components/buttons/verbalTestButtons.ts";

export default {
    name: "verbal-test-button",

    async execute(interaction: ComponentInteraction) {
        const [component, action, userId] = interaction.data.customID.split(":");

        if (interaction.user.id !== userId) {
            await interaction.createMessage({
                content: "This is not your test!",
                flags: Constants.MessageFlags.EPHEMERAL,
            });
            return;
        }

        const test = verbalTestManager.get(userId);
        if (!test) {
            await interaction.createMessage({
                content: "This test has expired or already ended.",
                flags: Constants.MessageFlags.EPHEMERAL,
            });
            return;
        }

        await interaction.deferUpdate();

        test.clearTimeouts();
        test.submitAnswer(action);

        if (test.lives <= 0) {
            await interaction.editOriginal({
                embeds: [verbalTestFinishedEmbed(test)],
                components: [],
            });

            const duel = verbalDuelManager.get(userId);
            if (duel) {
                if (duel.challenger.lives <= 0 && duel.opponent.lives <= 0) {
                    await endVerbalDuel(interaction, duel);
                }
            } else {
                await endVerbalSolo(test);
            }

        } else {    // test.lives > 0
            await interaction.editOriginal({
                embeds: [verbalTestEmbed(test)],
                components: [verbalTestButtons(test.user.id)],
            });

            startVerbalTestTimeout(test, interaction);
        }
    }
}

// Start timeout tracking for a test
export function startVerbalTestTimeout(test: VerbalTest, interaction: CommandInteraction | ComponentInteraction) {
    test.clearTimeouts();
    let warningStartTime: number;

    const warningTimeout = setTimeout(async () => {
        warningStartTime = Date.now();
    }, 20000);

    const countdownInterval = setInterval(async () => {
        if (!test.warningTimeout) {
            clearInterval(countdownInterval);
            return;
        }

        const elapsed = Date.now() - warningStartTime;
        const remaining = Math.max(1, Math.ceil(10 - elapsed / 1000));
        const displayRemaining = remaining - 1;
        
        if (remaining <= 10) {
            await updateVerbalTestWithWarning(test, interaction, displayRemaining);
        }
    }, 1000);

    const mainTimeout = setTimeout(async () => {
        clearInterval(countdownInterval);
        await handleVerbalTestTimeout(test, interaction);
    }, 30000);

    test.warningTimeout = warningTimeout;
    test.mainTimeout = mainTimeout;
    test.countdownInterval = countdownInterval;
}

// Update test embed with warning footer
async function updateVerbalTestWithWarning(test: VerbalTest, interaction: CommandInteraction | ComponentInteraction, secondsRemaining: number) {
    const embed = verbalTestEmbed(test);
    embed.footer = { text: `⏰ ${secondsRemaining} seconds remaining!` };
    
    if (verbalDuelManager.get(test.user.id) && interaction.isComponentInteraction() && interaction.data.customID.split(":")[1] == "accept") {
        if (!test.messageURL) throw new Error();
        const urlParts = test.messageURL.split('/');
        const messageId = urlParts[urlParts.length - 1];
        const channelId = urlParts[urlParts.length - 2];

        await interaction.client.rest.channels.editMessage(channelId, messageId, {
            embeds: [embed],
            components: [verbalTestButtons(test.user.id)],
        });

    } else {
        await interaction.editOriginal({
            embeds: [embed],
            components: [verbalTestButtons(test.user.id)],
        });
    }
}

// Handle test timeout (30 seconds elapsed)
async function handleVerbalTestTimeout(test: VerbalTest, interaction: CommandInteraction | ComponentInteraction) {
    test.clearTimeouts();
    // Submit wrong answer to lose a life and move to next word
    test.submitAnswer("wrong");

    if (test.lives <= 0) {
        if (verbalDuelManager.get(test.user.id) && interaction.isComponentInteraction() && interaction.data.customID.split(":")[1] == "accept") {
            if (!test.messageURL) throw new Error();
            const urlParts = test.messageURL.split('/');
            const messageId = urlParts[urlParts.length - 1];
            const channelId = urlParts[urlParts.length - 2];

            await interaction.client.rest.channels.editMessage(channelId, messageId, {
                embeds: [verbalTestFinishedEmbed(test)],
                components: [],
            });

        } else {
            await interaction.editOriginal({
                embeds: [verbalTestFinishedEmbed(test)],
                components: [],
            });
        }

        const duel = verbalDuelManager.get(test.user.id);
        if (duel) {
            if (duel.challenger.lives <= 0 && duel.opponent.lives <= 0) {
                await endVerbalDuel(interaction, duel);
            }
        } else {
            await endVerbalSolo(test);
        }

    } else {    // test.lives > 0
        if (verbalDuelManager.get(test.user.id) && interaction.isComponentInteraction() && interaction.data.customID.split(":")[1] == "accept") {
            if (!test.messageURL) throw new Error();
            const urlParts = test.messageURL.split('/');
            const messageId = urlParts[urlParts.length - 1];
            const channelId = urlParts[urlParts.length - 2];

            await interaction.client.rest.channels.editMessage(channelId, messageId, {
                embeds: [verbalTestEmbed(test)],
                components: [verbalTestButtons(test.user.id)],
            });

        } else {
            await interaction.editOriginal({
                embeds: [verbalTestEmbed(test)],
                components: [verbalTestButtons(test.user.id)],
            });
        }

        startVerbalTestTimeout(test, interaction);
    }
}

async function endVerbalSolo(test: VerbalTest) {
    verbalTestManager.end(test.user.id);
}

async function endVerbalDuel(interaction: CommandInteraction | ComponentInteraction, duel: VerbalDuel) {
    const parts = duel?.messageURL?.split("/");
    if (!parts) throw new Error();
    const channelId = parts[parts.length - 2];
    const messageId = parts[parts.length - 1];

    await interaction.client.rest.channels.editMessage(channelId, messageId, {
        embeds: [verbalDuelFinishedEmbed(duel)],
        components: [],
    });

    if (duel.challenger.messageURL) {
        const threadId = extractThreadId(duel.challenger.messageURL);
        if (!threadId) throw new Error();
        await interaction.client.rest.channels.delete(threadId);
    }

    if (duel.opponent.messageURL) {
        const threadId = extractThreadId(duel.opponent.messageURL);
        if (!threadId) throw new Error();
        await interaction.client.rest.channels.delete(threadId);
    }

    verbalDuelManager.end(duel.challenger.user.id);
    verbalTestManager.end(duel.challenger.user.id);
    verbalTestManager.end(duel.opponent.user.id);
}

function extractThreadId(messageURL: string): string | null {
    const match = messageURL.match(/channels\/\d+\/(\d+)\/\d+/);
    return match ? match[1] : null;
}