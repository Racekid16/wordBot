import "dotenv/config";
import { Client, Constants } from "oceanic.js";
import { loadAndRegisterAllCommands, getCommand } from "./utils/registerCommands.ts";
import { loadAllComponentHandlers, getComponentHandler } from "./utils/loadComponentHandlers.ts"

if (!process.env.TOKEN) {
    console.error("No token provided!");
    process.exit(1);
}

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

const client = new Client({
    auth: `Bot ${process.env.TOKEN}`
});

client.on("ready", async () => {
    if (!client.user) return;
    console.log("Ready as", client.user.tag);

    await loadAndRegisterAllCommands(client);
    await loadAllComponentHandlers();
});

client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isCommandInteraction()) {
            const command = getCommand(interaction.data.name);
            if (!command) return;

            await command.execute(interaction);
            return;
        }

        if (interaction.isComponentInteraction()) {
            const component = interaction.data.customID.split(":")[0];
            const componentHandler = getComponentHandler(component);
            if (!componentHandler) return;

            await componentHandler.execute(interaction);
        }
    } catch (err) {
        console.error("Interaction error:", err);

        if (!interaction.acknowledged && interaction.isCommandInteraction()) {
            await interaction.reply({
                content: "An error occurred!",
                flags: Constants.MessageFlags.EPHEMERAL,
            });
        }
    }
});

client.on("error", (err: string | Error) => {
    console.error("Something broke!", err);
});

try {
    await client.connect();
} catch (err) {
    console.error("Failed to connect!");
    console.error(err);
    process.exit(1);
}
