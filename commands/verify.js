const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const userController = require('../controller/user.controller')
const { adminLogging } = require('../settings.json')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Подтверждает пользователя и назначает роли в зависимости от пола.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Пользователь для подтверждения')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('gender')
                .setDescription('Пол пользователя')
                .setRequired(true)
                .addChoices(
                    { name: 'Мужской', value: 'male' },
                    { name: 'Женский', value: 'female' }
                )
        ),
        
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const gender = interaction.options.getString('gender');
        const member = await interaction.guild.members.fetch(targetUser.id);
        const loggingChannel = interaction.guild.channels.cache.get(adminLogging);

        const verifiedRoleId = '1125575021805453474';
        const rolesBasedOnGender = {
            male: '1116782222205259947',
            female: '1116782222205259947'
        };

        try {
            await member.roles.add(verifiedRoleId);

            if (rolesBasedOnGender[gender]) {
                await member.roles.add(rolesBasedOnGender[gender]);
            }

            await userController.updateUserParam(targetUser.id, 'gender', gender, 'person');
            await interaction.reply({ content: `✅ ${targetUser.username} был подтвержден и получил соответствующие роли!`, ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Пользователь подтвержден')
                .setDescription(`Пользователь **${member.user.username}** был подтвержден и получил роли от **${interaction.user.username}**.`)
                .addFields(
                    { name: 'ID пользователя', value: member.user.id },
                    { name: 'Выбранный пол', value: gender.charAt(0).toUpperCase() + gender.slice(1) }, // Первая буква в верхнем регистре
                    { name: 'Назначенные роли', value: `- Подтвержден\n- ${gender.charAt(0).toUpperCase() + gender.slice(1)}` }
                )
                .setTimestamp();

            loggingChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Произошла ошибка в процессе подтверждения:', error);
            interaction.followUp({ content: '❌ Произошла ошибка при попытке подтвердить пользователя.', ephemeral: true });
        }
    }
};
