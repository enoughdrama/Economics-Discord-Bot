const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');

const db = require('../db');
const userController = require('../controller/user.controller');

const permsObject = {
    "helper": { mute_count: 15, kick_count: 1, ban_count: 0 },
    "moderator": { mute_count: 20, kick_count: 3, ban_count: 1 },
    "admin": { mute_count: 50, kick_count: 10, ban_count: 5 },
    "super": { mute_count: 250, kick_count: 25, ban_count: 10 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setadminperms')
        .setDescription('Устанавливает права администратора для пользователя.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Пользователь, для которого устанавливаются права')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('priority')
                .setDescription('Уровень приоритета административных прав')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Доступные типы: helper, moderator, admin, super')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const priority = interaction.options.getInteger('priority');
        const type = interaction.options.getString('type');

        const discordId = targetUser.id;
        const { ban_count, mute_count, kick_count } = permsObject[type];

        const isExists = await userController.findOneUser('admins', discordId);
        if (isExists) {
            try {
                const result = await db.query(
                    'UPDATE admins SET type = $1, priority = $2, ban_count = $3, mute_count = $4, kick_count = $5 WHERE discord_id = $6', 
                    [type, priority, ban_count, mute_count, kick_count, discordId]
                );
        
                await interaction.reply({ content: `✅ Права администратора ${type} обновлены для ${targetUser.username} с приоритетом ${priority}.`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Не удалось обновить права администратора.', ephemeral: true });
            }
        
            return;
        }

        try {
            const result = await db.query(
                'INSERT INTO admins (discord_id, type, priority, ban_count, mute_count, kick_count) VALUES ($1, $2, $3, $4, $5, $6)', 
                [discordId, type, priority, ban_count, mute_count, kick_count]
            );
            
            await interaction.reply({ content: `✅ Права администратора ${type} установлены для ${targetUser.username} с приоритетом ${priority}.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Не удалось установить права администратора.', ephemeral: true });
        }
    }
};
