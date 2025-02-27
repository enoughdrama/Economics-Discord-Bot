const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, ChannelType } = require('discord.js');
const userController = require('../controller/user.controller'); // Ensure this path is correct

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createrole')
        .setDescription('Создает новую роль на сервере, также добавляет ее в список к покупке')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Название')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('cost')
                .setDescription('Стоимость')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('desc')
                .setDescription('Описание')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('color')
                    .setDescription('Цвет, используй HEX(например: #00FF00)')
                    .setRequired(true))
        .addStringOption(option => 
            option.setName('icon')
                    .setDescription('Эмодзи для иконки роли (необходим ID эмодзи)')
                    .setRequired(false)),

    async execute(interaction) {
        const user = await userController.findOneUser('person', interaction.user.id);

        if (!user || user.balance < 10000) {
            return interaction.reply({ content: 'You do not have enough balance to create roles.', ephemeral: true });
        }

        const name = interaction.options.getString('name');
        const cost = interaction.options.getNumber('cost');
        const desc = interaction.options.getString('desc');
        const colorInput = interaction.options.getString('color');

        const emojiInput = interaction.options.getString('icon');
        let roleIconUrl = null;

        try {
            const role = await interaction.guild.roles.create({
                name: name,
                color: colorInput,
                reason: 'Role created through bot command',
            });

            const emojiIdMatch = emojiInput.match(/:(\d+)>$/);
            const emojiId = emojiIdMatch ? emojiIdMatch[1] : null;

            if (emojiInput) {
                if (emojiId) {
                    const emojiToSet = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
                    
                    if (emojiToSet) {
                        await role.setIcon(emojiToSet, 'Role icon set through bot command');
                    }
                } else {
                    await role.setUnicodeEmoji(emojiInput, 'Role icon set through bot command');
                }
            }

            const creationTimestamp = new Date(role.createdTimestamp).toISOString();
            await userController.createRoleMenuItem(name, cost, desc, role.id, creationTimestamp, interaction.user.id);

            await interaction.member.roles.add(role.id);
            await interaction.reply({ content: `Роль "${name}" успешно создана!`, ephemeral: true });
        } catch (error) {
            console.error('Failed to create role:', error);
            await interaction.reply({ content: 'Не удалось создать роль.', ephemeral: true });
        }
    },
};
