require('dotenv').config();

const getFromId = async (ctx) => {
    if (ctx.from) {
        return ctx.from.id;
    } else if (ctx.channelPost) {
        const res = await ctx.telegram.getChatAdministrators(parseInt(ctx.channelPost.sender_chat.id));
        return res[res.length-1].user.id;
    } else return null;
};

const captalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const notAllowedMessage = async (ctx) => {
    if (ctx.updateType === 'callback_query') {
        return ctx.telegram.answerCbQuery(ctx.callbackQuery.id, '⚠️  You\'re not allowed 🚫️ to select an option !!', true);
    }
    
//     await ctx.deleteMessage();
    const chat_id = await getFromId(ctx);
    console.log('chat_id----', chat_id);
    
    return ctx.telegram.sendMessage(chat_id,`This bot is official private bot of @temp_demo\n\nDo you want this premium feature then message my owner @temp_demo`, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📂 Join Our Main Channel", url: 'https://t.me/my_channels_list_official' }
                ]
            ]
        }
    });
};

module.exports = {
    getFromId,
    captalize,
    notAllowedMessage
};
