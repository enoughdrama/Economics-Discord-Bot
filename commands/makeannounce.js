const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('makeannounce')
        .setDescription("Отправляет объявление с меню выбора роли 📣")
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Канал для отправки объявления')
                .setRequired(true)),
    
    async execute(interaction) {
        // Определение канала для отправки объявления
        const channel = interaction.options.getChannel('channel');

        // Проверка, что выбранный канал - текстовый
        if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: 'Пожалуйста, выберите текстовый канал.', ephemeral: true });
        }

        // Создание встраиваемого сообщения
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📢 Объявление сервера 📢')
            .setDescription('Мы ищем новых сотрудников! Если вы заинтересованы, пожалуйста, выберите роль из выпадающего меню ниже и отправьте нам ваше резюме.')
            .setFooter({ text: 'Станьте частью нашей команды! 🌟' })
            .setImage('https://media1.tenor.com/m/zIitUa0l_6MAAAAC/kyoukai-no-kanata.gif');

        // Меню выбора роли
        const row = new ActionRowBuilder()
            .addComponents(
                new SelectMenuBuilder()
                    .setCustomId('select-role')
                    .setPlaceholder('Выберите роль...')
                    .addOptions([
                        {
                            label: 'Модератор',
                            description: 'Подать заявку на роль Модератора',
                            value: 'moderator',
                            emoji: '🔨',
                        },
                        {
                            label: 'Помощник',
                            description: 'Подать заявку на роль Помощника',
                            value: 'helper',
                            emoji: '🆘',
                        },
                        {
                            label: 'Координатор мероприятий',
                            description: 'Подать заявку на роль Координатора мероприятий',
                            value: 'event_coordinator',
                            emoji: '🎉',
                        },
                    ]),
            );

        // Отправка сообщения
        await channel.send({ embeds: [embed], components: [row] });

        // Подтверждение отправителю команды
        await interaction.reply({ content: `Объявление отправлено в ${channel.name}.`, ephemeral: true });
    }
};
