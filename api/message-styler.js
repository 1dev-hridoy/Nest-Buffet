const axios = require('axios');
require('dotenv').config();


const textStyles = {

  vaporwave: text => text.split('').join(' ').toUpperCase(),
  aesthetic: text => text.split('').join(' '),
  mock: text => text.split('').map((char, i) => i % 2 ? char.toLowerCase() : char.toUpperCase()).join(''),
  clap: text => text.split(' ').join(' 👏 '),
  emojify: text => text.split('').join('😂'),
  reverse: text => text.split('').reverse().join(''),
  

  bold: text => `**${text}**`,
  italic: text => `*${text}*`,
  underline: text => `__${text}__`,
  strikethrough: text => `~~${text}~~`,
  code: text => `\`${text}\``,
  codeblock: (text, language = '') => `\`\`\`${language}\n${text}\n\`\`\``,
  quote: text => text.split('\n').map(line => `> ${line}`).join('\n'),
  spoiler: text => `||${text}||`,
};


const emojiCategories = {
  happy: ['😀', '😃', '😄', '😁', '😆', '😊', '🙂', '😉', '😍', '🥰'],
  sad: ['😔', '😢', '😭', '😞', '😟', '😕', '☹️', '🙁', '😣', '😖'],
  angry: ['😠', '😡', '🤬', '😤', '😾', '👿', '💢', '💥'],
  love: ['❤️', '💕', '💓', '💗', '💖', '💘', '💝', '💞', '💟', '🧡'],
  celebration: ['🎉', '🎊', '🎈', '🎂', '🎁', '🎆', '🎇', '✨', '🎐', '🎀'],
  gaming: ['🎮', '🕹️', '👾', '🎲', '♟️', '🎯', '🎪', '🎭', '🎨'],
};


const activePolls = {};

module.exports = {
  meta: {
    name: "Message Styler for Bot Developers",
    method: "GET",
    path: "/message-styler",
    category: "utility",
    params: [
      { name: "text", type: "string", required: true, description: "Text to style" },
      { name: "style", type: "string", required: false, description: "Style to apply (vaporwave, aesthetic, mock, clap, emojify, reverse, bold, italic, underline, strikethrough, code, codeblock, quote, spoiler)" },
      { name: "language", type: "string", required: false, description: "Language for code blocks (js, python, etc.)" },
    ],
  },
  onStart: async ({ req, res }) => {
    console.log('Incoming styling request:', req.query);

    const { text, style = 'bold', language = '' } = req.query || {};

    if (!text) {
      return res.status(400).json({
        status: 'failed',
        error: "Missing required parameter: text",
        availableStyles: Object.keys(textStyles),
      });
    }

    try {
    
      if (textStyles[style]) {
        const styledText = style === 'codeblock' 
          ? textStyles[style](text, language)
          : textStyles[style](text);
        
        return res.json({
          status: 'success',
          original: text,
          styled: styledText,
          style: style
        });
      } else {
        return res.status(400).json({
          status: 'failed',
          error: `Style '${style}' not found`,
          availableStyles: Object.keys(textStyles),
        });
      }
    } catch (error) {
      console.error('Error styling text:', error.message);
      
      res.status(500).json({
        status: 'failed',
        error: 'Failed to style text.',
        details: error.message,
      });
    }
  },
  
  
  randomEmoji: {
    meta: {
      name: "Random Emoji",
      method: "GET",
      path: "/random-emoji",
      category: "fun",
      params: [
        { name: "category", type: "string", required: false, description: "Emoji category (happy, sad, angry, love, celebration, gaming)" },
        { name: "count", type: "number", required: false, description: "Number of emojis to return (default: 1)" },
      ],
    },
    onStart: async ({ req, res }) => {
      const { category, count = 1 } = req.query || {};
      
      try {
        let emojis = [];
        
        if (category && emojiCategories[category]) {
  
            
          const categoryEmojis = emojiCategories[category];
          for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * categoryEmojis.length);
            emojis.push(categoryEmojis[randomIndex]);
          }
        } else if (category) {
          return res.status(400).json({
            status: 'failed',
            error: `Category '${category}' not found`,
            availableCategories: Object.keys(emojiCategories),
          });
        } else {
         
            
          const allCategories = Object.values(emojiCategories).flat();
          for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * allCategories.length);
            emojis.push(allCategories[randomIndex]);
          }
        }
        
        return res.json({
          status: 'success',
          emojis: emojis,
          count: emojis.length,
        });
      } catch (error) {
        console.error('Error getting random emojis:', error.message);
        
        res.status(500).json({
          status: 'failed',
          error: 'Failed to get random emojis.',
          details: error.message,
        });
      }
    }
  },
  

  

  createPoll: {
    meta: {
      name: "Create Poll",
      method: "GET",
      path: "/create-poll",
      category: "utility",
      params: [
        { name: "question", type: "string", required: true, description: "Poll question" },
        { name: "options", type: "string", required: true, description: "Comma-separated poll options" },
        { name: "duration", type: "number", required: false, description: "Poll duration in minutes (default: 60)" },
      ],
    },
    onStart: async ({ req, res }) => {
      const { question, options, duration = 60 } = req.query || {};
      
      if (!question || !options) {
        return res.status(400).json({
          status: 'failed',
          error: "Missing required parameters: question and options",
        });
      }
      
      try {
        const pollOptions = options.split(',').map(option => option.trim());
        
        if (pollOptions.length < 2) {
          return res.status(400).json({
            status: 'failed',
            error: "At least 2 options are required for a poll",
          });
        }
        
       
        

        const pollId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
      
        
        const poll = {
          id: pollId,
          question: question,
          options: pollOptions.map(option => ({ text: option, votes: 0 })),
          voters: [],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + duration * 60 * 1000),
        };
        

        activePolls[pollId] = poll;
        

        setTimeout(() => {
          delete activePolls[pollId];
        }, duration * 60 * 1000);

        const formattedPoll = formatPollForChat(poll);
        
        return res.json({
          status: 'success',
          poll: {
            id: pollId,
            question: question,
            options: poll.options,
            expiresAt: poll.expiresAt,
          },
          formatted: formattedPoll,
        });
      } catch (error) {
        console.error('Error creating poll:', error.message);
        
        res.status(500).json({
          status: 'failed',
          error: 'Failed to create poll.',
          details: error.message,
        });
      }
    }
  },
  

  votePoll: {
    meta: {
      name: "Vote on Poll",
      method: "GET",
      path: "/vote-poll",
      category: "utility",
      params: [
        { name: "pollId", type: "string", required: true, description: "Poll ID" },
        { name: "optionIndex", type: "number", required: true, description: "Option index to vote for (0-based)" },
        { name: "userId", type: "string", required: true, description: "Unique user ID to prevent duplicate votes" },
      ],
    },
    onStart: async ({ req, res }) => {
      const { pollId, optionIndex, userId } = req.query || {};
      
      if (!pollId || optionIndex === undefined || !userId) {
        return res.status(400).json({
          status: 'failed',
          error: "Missing required parameters: pollId, optionIndex, and userId",
        });
      }
      
      try {

        if (!activePolls[pollId]) {
          return res.status(404).json({
            status: 'failed',
            error: "Poll not found or expired",
          });
        }
        
        const poll = activePolls[pollId];
  
        if (new Date() > poll.expiresAt) {
          delete activePolls[pollId];
          return res.status(400).json({
            status: 'failed',
            error: "Poll has expired",
          });
        }
        

        if (optionIndex < 0 || optionIndex >= poll.options.length) {
          return res.status(400).json({
            status: 'failed',
            error: "Invalid option index",
          });
        }
        
    
        if (poll.voters.includes(userId)) {
          return res.status(400).json({
            status: 'failed',
            error: "User has already voted",
          });
        }
        
       
        poll.options[optionIndex].votes++;
        poll.voters.push(userId);
        
        const formattedPoll = formatPollForChat(poll);
        
        return res.json({
          status: 'success',
          poll: {
            id: pollId,
            question: poll.question,
            options: poll.options,
            expiresAt: poll.expiresAt,
          },
          formatted: formattedPoll,
        });
      } catch (error) {
        console.error('Error voting on poll:', error.message);
        
        res.status(500).json({
          status: 'failed',
          error: 'Failed to vote on poll.',
          details: error.message,
        });
      }
    }
  },
  
  
  getPoll: {
    meta: {
      name: "Get Poll Results",
      method: "GET",
      path: "/get-poll",
      category: "utility",
      params: [
        { name: "pollId", type: "string", required: true, description: "Poll ID" },
      ],
    },
    onStart: async ({ req, res }) => {
      const { pollId } = req.query || {};
      
      if (!pollId) {
        return res.status(400).json({
          status: 'failed',
          error: "Missing required parameter: pollId",
        });
      }
      
      try {
   
        if (!activePolls[pollId]) {
          return res.status(404).json({
            status: 'failed',
            error: "Poll not found or expired",
          });
        }
        
        const poll = activePolls[pollId];
        

        const formattedPoll = formatPollForChat(poll);
        
        return res.json({
          status: 'success',
          poll: {
            id: pollId,
            question: poll.question,
            options: poll.options,
            expiresAt: poll.expiresAt,
            totalVotes: poll.voters.length,
          },
          formatted: formattedPoll,
        });
      } catch (error) {
        console.error('Error getting poll results:', error.message);
        
        res.status(500).json({
          status: 'failed',
          error: 'Failed to get poll results.',
          details: error.message,
        });
      }
    }
  },
  

  rollDice: {
    meta: {
      name: "Roll Dice",
      method: "GET",
      path: "/roll-dice",
      category: "fun",
      params: [
        { name: "dice", type: "string", required: false, description: "Dice notation (e.g., 2d6, 1d20, etc.). Default: 1d6" },
      ],
    },
    onStart: async ({ req, res }) => {
      const { dice = "1d6" } = req.query || {};
      
      try {

        const diceRegex = /^(\d+)d(\d+)$/;
        const match = dice.match(diceRegex);
        
        if (!match) {
          return res.status(400).json({
            status: 'failed',
            error: "Invalid dice notation. Use format like '2d6', '1d20', etc.",
          });
        }
        
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        
        if (count <= 0 || sides <= 0 || count > 100 || sides > 1000) {
          return res.status(400).json({
            status: 'failed',
            error: "Invalid dice parameters. Count must be 1-100, sides must be 1-1000.",
          });
        }
        
 
        const rolls = [];
        let total = 0;
        
        for (let i = 0; i < count; i++) {
          const roll = Math.floor(Math.random() * sides) + 1;
          rolls.push(roll);
          total += roll;
        }
        

        let formattedResult = `🎲 **Dice Roll (${dice})**: `;
        
        if (count === 1) {
          formattedResult += `**${total}**`;
        } else {
          formattedResult += `${rolls.join(' + ')} = **${total}**`;
        }
        
        return res.json({
          status: 'success',
          dice: dice,
          rolls: rolls,
          total: total,
          formatted: formattedResult,
        });
      } catch (error) {
        console.error('Error rolling dice:', error.message);
        
        res.status(500).json({
          status: 'failed',
          error: 'Failed to roll dice.',
          details: error.message,
        });
      }
    }
  },
  

  randomNumber: {
    meta: {
      name: "Random Number Generator",
      method: "GET",
      path: "/random-number",
      category: "utility",
      params: [
        { name: "min", type: "number", required: false, description: "Minimum value (default: 1)" },
        { name: "max", type: "number", required: false, description: "Maximum value (default: 100)" },
        { name: "count", type: "number", required: false, description: "Number of random numbers to generate (default: 1)" },
      ],
    },
    onStart: async ({ req, res }) => {
      const { min = 1, max = 100, count = 1 } = req.query || {};
      
      try {
        const minNum = parseInt(min);
        const maxNum = parseInt(max);
        const countNum = parseInt(count);
        
        if (isNaN(minNum) || isNaN(maxNum) || isNaN(countNum)) {
          return res.status(400).json({
            status: 'failed',
            error: "Parameters must be valid numbers",
          });
        }
        
        if (minNum >= maxNum) {
          return res.status(400).json({
            status: 'failed',
            error: "Min must be less than max",
          });
        }
        
        if (countNum <= 0 || countNum > 1000) {
          return res.status(400).json({
            status: 'failed',
            error: "Count must be between 1 and 1000",
          });
        }

        const numbers = [];
        
        for (let i = 0; i < countNum; i++) {
          const randomNum = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
          numbers.push(randomNum);
        }
        
    
        let formattedResult = `🔢 **Random Number${countNum > 1 ? 's' : ''}**: `;
        
        if (countNum === 1) {
          formattedResult += `**${numbers[0]}**`;
        } else {
          formattedResult += `**${numbers.join(', ')}**`;
        }
        
        return res.json({
          status: 'success',
          min: minNum,
          max: maxNum,
          count: countNum,
          numbers: numbers,
          formatted: formattedResult,
        });
      } catch (error) {
        console.error('Error generating random numbers:', error.message);
        
        res.status(500).json({
          status: 'failed',
          error: 'Failed to generate random numbers.',
          details: error.message,
        });
      }
    }
  },
};


function formatPollForChat(poll) {
  let formatted = `📊 **POLL: ${poll.question}**\n\n`;
  

  const totalVotes = poll.voters.length;
  

  poll.options.forEach((option, index) => {
    const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
    const progressBar = createProgressBar(percentage);
    
    formatted += `${index + 1}. ${option.text} - ${option.votes} vote${option.votes !== 1 ? 's' : ''} (${percentage}%)\n`;
    formatted += `${progressBar}\n\n`;
  });

  const timeLeft = Math.max(0, Math.floor((poll.expiresAt - new Date()) / 60000));
  formatted += `Total votes: ${totalVotes} | Time left: ${timeLeft} minute${timeLeft !== 1 ? 's' : ''}`;
  
  return formatted;
}


function createProgressBar(percentage, length = 20) {
  const filledLength = Math.round((percentage / 100) * length);
  const emptyLength = length - filledLength;
  
  return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
}