const { SlashCommandBuilder } = require('@discordjs/builders');
const { Events, ChannelType, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, PermissionOverwrites, Permissions  } = require('discord.js');
const userController = require('../controller/user.controller');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createlocalvoice')
        .setDescription("Create a voice channel with admin permissions for the issuer and a rental fee")
        .addStringOption(option => 
            option.setName('name')
            .setDescription('The name for the voice channel')
            .setRequired(true)),

    async execute(interaction) {
        const channelName = interaction.options.getString('name');
        const guild = interaction.guild;
        const member = interaction.member;
        const userId = member.id;

        const user = await userController.findOneUser('person', userId);
        if (user.balance < 1000) {
            return interaction.reply({ content: `❌ You do not have enough funds to create a voice channel.`, ephemeral: true });
        }

        user.balance -= 1000;
        await userController.updateUserParam(userId, 'balance', user.balance, 'person');

        const categoryId = '1222128438370893874';
        try {
            const voiceChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.Connect],
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.Speak,
                        ],
                    },
                ],
            });            

            await interaction.reply({ content: `✅ Voice channel created: ${voiceChannel.name}. You have admin permissions in this channel.`, ephemeral: true });
        } catch (error) {
            console.error("Failed to create voice channel:", error);
            await interaction.reply({ content: `❌ Failed to create the voice channel.`, ephemeral: true });
        }
    }
};
