const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits, MessageActionRow, MessageButton } = require('discord.js');

const userController = require('../controller/user.controller');

const determineWinner = (userChoice, botChoice) => {
    if (userChoice === botChoice) return 'draw';
    if (userChoice === 'rock' && botChoice === 'scissors' ||
        userChoice === 'paper' && botChoice === 'rock' ||
        userChoice === 'scissors' && botChoice === 'paper') return 'user';
    return 'bot';
};

const choices = ['rock', 'paper', 'scissors'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription("Play Rock-Paper-Scissors and wager your balance")
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Your choice: rock, paper, or scissors')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to wager')
                .setRequired(true)),

    async execute(interaction) {
        const userChoice = interaction.options.getString('choice').toLowerCase();
        if (!choices.includes(userChoice)) {
            return await interaction.reply({ content: `❌ Invalid choice. Please choose rock, paper, or scissors.`, ephemeral: true });
        }

        const wagerAmount = interaction.options.getInteger('amount');
        const userId = interaction.user.id;
        const user = await userController.findOneUser('person', userId);

        if (!user || user.balance < wagerAmount) {
            return await interaction.reply({ content: `❌ You don't have enough funds or haven't activated your account.`, ephemeral: true });
        }

        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const result = determineWinner(userChoice, botChoice);

        let contentResponse = `Your choice: ${userChoice}. Bot's choice: ${botChoice}. `;
        if (result === 'draw') {
            contentResponse += "It's a draw!";
        } else if (result === 'user') {
            user.balance += wagerAmount;
            contentResponse += `You win! Your balance has been increased by ${wagerAmount}.`;
        } else {
            user.balance -= wagerAmount;
            contentResponse += `You lose! Your balance has been decreased by ${wagerAmount}.`;
        }

        const updateBalance = await userController.updateUserParam(userId, 'balance', user.balance, 'person');

        if (updateBalance) {
            await interaction.reply({ content: contentResponse, ephemeral: true });
        } else {
            await interaction.reply({ content: `❌ There was an issue updating your balance. Please try again.`, ephemeral: true });
        }
    }
};
