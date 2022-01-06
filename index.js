const { Telegraf } = require('telegraf');
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);

const db = require('./public/queries');
const func = require('./public/functions')

const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
});
client.connect();

const express = require('express');
const app = express();

app.get('/', async (req, res) => {
    res.send('Welcome !!');
});

app.listen(process.env.PORT || 5000);

/*

    VARIABLES

*/

var adding_connection = false;
var updating_timeout = false;
var allUsersDetails = [];
var hasUsersDetails = false;
var currentUser = {
    id: 0,
    is_enabled: false,
    time_out: 0,
    chat_id: 0,
    chat_type: '',
    chat_title: '',
    user_id: 0
};


/*

        BOT

*/


bot.start((ctx) => {
    startPrompt(ctx);
});

bot.help((ctx) => {
    helpPrompt(ctx);
});

bot.catch(async (err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
    const from_id = await func.getFromId(ctx);
    ctx.telegram.sendMessage(from_id, `Ooops, encountered an error ${ctx.updateType}: ${err.description ? err.description : err}`);
});

bot.use(async (ctx, next) => {
    if (ctx.callbackQuery && ctx.callbackQuery.data === 'checkTime') return next();
    const fromId = await func.getFromId(ctx);
    if (!fromId) return;
    if (process.env.SUDO_USERS == fromId) return next();
    else func.notAllowedMessage(ctx);
});


/*

        FUNCTIONS

*/


async function startPrompt(ctx) {
    const method = ctx.message ? 'reply' : 'editMessageText';

    ctx[method](`Hi *${ctx.from.first_name}*!!\n\nI can help you to delete messages from your Group/Channel after specific time.\n\n🤖️ Official private bot of @temp\\_demo`, {
        parse_mode: 'markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Help 💡️", callback_data: 'help' }
                ],
                [
                    { text: "📂 Join Our Main Channel", url: 'https://t.me/my_channels_list_official' }
                ]
            ]
        }
    });
};

async function helpPrompt(ctx) {
    const method = ctx.message ? 'reply' : 'editMessageText';

    ctx[method](`\nJust add me in your Group/Channel as an admin and configure your prefernces by sending /add\\_connection in Group for Group and in bot for Channel.`, {
        parse_mode: 'markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "Menu 🔠️", callback_data: 'menu' }
                ],
                [
                    { text: "📂 Join Our Main Channel", url: 'https://t.me/my_channels_list_official' }
                ]
            ]
        }
    });
};

async function getUserDetails(ctx, hasReturn = false, from_id = null) {
    const user_id = from_id ? parseInt(from_id) : ctx.from.id;

    const results = await db.getUserAllChatData({ user_id: user_id });
    allUsersDetails = results.data;
    hasUsersDetails = true;

    if (hasReturn) return allUsersDetails;
};

async function getCurrentUserDetails(ctx, chat_id = null, from_id = null) {
    const user_id = from_id ? parseInt(from_id) : ctx.from.id;

    if (!hasUsersDetails) await getUserDetails(ctx, null, user_id);

    if (allUsersDetails.length > 0) {
        allUsersDetails.forEach(user => {
            if (user.user_id === user_id && parseInt(user.chat_id) === (chat_id ? parseInt(chat_id) : ctx.chat.id)) {
                currentUser = user;
            } else {
                currentUser = {
                    id: 0,
                    is_enabled: false,
                    time_out: 0,
                    chat_id: 0,
                    chat_type: '',
                    chat_title: '',
                    user_id: 0
                };
            }
        });
    }
};

async function usersDetails(ctx) {
    if (!hasUsersDetails) await getUserDetails(ctx);
    return allUsersDetails;
};

async function showAllConnections(ctx) {
    if (ctx.message) {
        ctx.reply('*Fetching Data....⏳️*', {
            parse_mode: 'markdown',
            reply_to_message_id: ctx.message.message_id
        });
    }

    const message_id = ctx.message ? ctx.message.message_id : ctx.callbackQuery.message.message_id;

    const results = ctx.message ? await getUserDetails(ctx, true) : await usersDetails(ctx);
    if (results.length === 0) {
        ctx.telegram.editMessageText(ctx.chat.id, (ctx.message ? message_id + 1 : message_id), undefined, '*There is no active connections\n\nConnect your Group/Channel first.*', {
            reply_to_message_id: message_id,
            parse_mode: 'markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔗️ How To Add Connection ❓️', callback_data: 'how_to_connect' }
                    ]
                ]
            }
        });
    }

    if (results.length > 0) {
        let inline_keyboard = [];

        results.forEach((ele) => {
            inline_keyboard.push(
                [
                    { text: ele.chat_title, callback_data: `show_chat_details  ${ele.is_enabled}  ${ele.chat_id}  ${ele.time_out}` },
                    { text: 'Disconnect ️❌️', callback_data: `disconnect  ${ele.chat_id}  ${ele.chat_title}` }
                ]
            )
        });

        ctx.telegram.editMessageText(ctx.chat.id, (ctx.message ? message_id + 1 : message_id), undefined, `*Your all connections (${results.length})\n\nTap on disconnect to remove.*`, {
            reply_to_message_id: message_id,
            parse_mode: 'markdown',
            reply_markup: {
                inline_keyboard: inline_keyboard
            }
        });
    }
};

async function deletetionDetails(ctx) {
    const isEnabledOrDisabledQuery = ctx.callbackQuery.data.includes('show_chat_details') ? false : true;
    const chat_details = ctx.callbackQuery.data.split('  ');
    const chat_id = chat_details[isEnabledOrDisabledQuery ? 1 : 2];
    const isAutoDeletion = !isEnabledOrDisabledQuery ? chat_details[1] : (ctx.callbackQuery.data.includes('enabled') ? 'true' : 'false');

    await getCurrentUserDetails(ctx, chat_id);
    const current_chat_details = await ctx.telegram.getChat(parseInt(chat_id));

    if (isEnabledOrDisabledQuery) {
        const dbMethod = currentUser.user_id && currentUser.chat_id ? 'updateUserChatDataBy' : 'addUserChatStatus';
        const values = currentUser.user_id && currentUser.chat_id
            ?
            { update_by: 'is_enabled', update_by_value: Boolean((ctx.callbackQuery.data.includes('enabled') ? 1 : 0)), user_id: ctx.from.id, chat_id: current_chat_details.id }
            :
            { user_id: ctx.from.id, chat_title: current_chat_details.title, chat_id: current_chat_details.id, time_out: 60, is_enabled: 1 };

        await db[dbMethod](values);
        hasUsersDetails = false; // refresh purpose
    }

    if (!hasUsersDetails) await getCurrentUserDetails(ctx, chat_id);

    const callback_data = isAutoDeletion == 'false' ? 'enabled' : 'disabled';
    const icon = isAutoDeletion == 'false' ? '❌️' : '✅️';

    const inline_keyboard = [
        [
            { text: "🗑️ Deletion Status", callback_data: 'no_callback' },
            { text: (icon + ' ' + (isAutoDeletion == 'true' ? 'Enabled' : 'Disabled')), callback_data: `${callback_data}  ${current_chat_details.id}  ${current_chat_details.type}` }
        ],
        [
            { text: "⏰️ Deletion Time", callback_data: 'no_callback' },
            { text: currentUser.time_out + ' s', callback_data: `set_timeout  ${current_chat_details.title}  ${current_chat_details.id}` }
        ],
        [
            { text: '◀️ Back', callback_data: 'go_back' },
            { text: 'Close ❌️', callback_data: 'close' }
        ]
    ];

    if (isEnabledOrDisabledQuery) {
        ctx.editMessageReplyMarkup({ inline_keyboard: inline_keyboard })
    } else {
        ctx.editMessageText(`Current deletions criteria of *${current_chat_details.title}* are :`, {
            parse_mode: 'markdown',
            reply_markup: {
                inline_keyboard: inline_keyboard
            }
        });
    }
};


/*

        ADMIN ONLY COMMANDS

*/


bot.command('create', async (ctx) => {
    if (ctx.chat.type === 'supergroup') return ctx.reply('Perform this action in bot !!!');
    await client.query('CREATE TABLE tg_auto_delete_messages_data (id SERIAL PRIMARY KEY, user_id INT, chat_id NUMERIC, message_id INT, created_at INT)');
    ctx.reply('Sucessfully Created !!');
});

bot.command('create2', async (ctx) => {
    client.connect();
    await client.query('CREATE TABLE tg_auto_delete_messages_user_status (id SERIAL PRIMARY KEY, user_id INT, chat_title VARCHAR, chat_id NUMERIC, chat_type VARCHAR, time_out INT, is_enabled BOOLEAN)');
    ctx.reply('Sucessfully Created 2!!');
});

bot.command('delete', async (ctx) => {
    if (ctx.chat.type === 'supergroup') return ctx.reply('Perform this action in bot !!!');
    await client.query('DROP TABLE IF EXISTS tg_auto_delete_messages_data');
    ctx.reply('Sucessfully Deleted !!');
});

bot.command('delete2', async (ctx) => {
    if (ctx.chat.type === 'supergroup') return ctx.reply('Perform this action in bot !!!');
    await client.query('DROP TABLE IF EXISTS tg_auto_delete_messages_user_status');
    ctx.reply('Sucessfully Deleted 2 !!');
});

bot.command('get', async (ctx) => {
    if (ctx.chat.type === 'supergroup') return ctx.reply('Perform this action in bot !!!');
    const response = await db.getUserData();
    console.log('get-res=====>', response);
    ctx.reply('Please check your response !!');
});

bot.command('get2', async (ctx) => {
    if (ctx.chat.type === 'supergroup') return ctx.reply('Perform this action in bot !!!');
    const response = await db.getUserChatData();
    console.log('get2-res=====>', response);
    ctx.reply('Please check your response !!');
});

bot.command('tc', async (ctx) => {
    if (ctx.chat.type === 'supergroup') return ctx.reply('Perform this action in bot !!!');
    await client.query('TRUNCATE tg_auto_delete_messages_data');
    ctx.reply('Sucessfully Truncated !!');
});

bot.command('tc2', async (ctx) => {
    if (ctx.chat.type === 'supergroup') return ctx.reply('Perform this action in bot !!!');
    await client.query('TRUNCATE tg_auto_delete_messages_user_status');
    ctx.reply('Sucessfully Truncated 2 !!');
});


/*

        CALLBACK_QUERIES

*/


bot.on('callback_query', async (ctx) => {
    if (ctx.callbackQuery.data === 'menu') {
        await startPrompt(ctx);
    }

    if (ctx.callbackQuery.data === 'help') {
        await helpPrompt(ctx);
    }

    if (ctx.callbackQuery.data === 'how_to_connect') {
        await ctx.answerCbQuery('Add me in your Group|Channel as an admin and configure your prefernces by sending /add_connection in Group for Group and in bot for Channel', true);
    }

    if (ctx.callbackQuery.data === 'go_back') {
        await showAllConnections(ctx);
    }

    if (ctx.callbackQuery.data === 'do_nothing') {
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    }

    if (ctx.callbackQuery.data === 'close') {
        await ctx.deleteMessage();
    }

    if (ctx.callbackQuery.data.match(/show_chat_details(.*)/)) {
        await deletetionDetails(ctx);
    }

    if (ctx.callbackQuery.data.match(/enabled(.*)/)) {
        await deletetionDetails(ctx);
    }

    if (ctx.callbackQuery.data.match(/disabled(.*)/)) {
        await deletetionDetails(ctx);
    }

    if (ctx.callbackQuery.data.match(/auto_delete(.*)/)) {
        await db.addUserData({
            user_id: ctx.from.id,
            chat_id: ctx.chat.id,
            message_id: ctx.callbackQuery.message.message_id,
            created_at: ctx.callbackQuery.message.date
        });

        await getCurrentUserDetails(ctx);

        ctx.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    { text: "Check Time Left ⏰️ To Delete Message 🗑️", callback_data: 'checkTime' }
                ],
                [
                    { text: "📂 Back-Up Channel", url: 'https://t.me/joinchat/ojOOaC4tqkU5MTVl' },
                    { text: "✨ Other Channels", url: 'https://t.me/my_channels_list_official' },
                ]
            ]
        }).then(() => {
            setTimeout(async () => {
                if (process.env.BIN_CHANNEL_ID) {
                    try {
                        await ctx.telegram.sendCopy(parseInt(process.env.BIN_CHANNEL_ID), ctx.callbackQuery.message, {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        { text: "📂 Back-Up Channel", url: 'https://t.me/joinchat/ojOOaC4tqkU5MTVl' },
                                        { text: "✨ Other Channels", url: 'https://t.me/my_channels_list_official' },
                                    ]
                                ]
                            }
                        });
                    } catch (error) {
                        ctx.telegram.sendMessage(ctx.from.id, `Error In Bin Channel :\n\n${error.description ? error.description : error}`);
                    };
                }
                ctx.telegram.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
                await db.deleteUserDataByMsgId({ user_id: ctx.from.id, chat_id: ctx.chat.id, message_id: ctx.callbackQuery.message.message_id })
            }, Number(currentUser.time_out) * 1000);
        });
    }

    if (ctx.callbackQuery.data.match(/disconnect(.*)/)) {
        hasUsersDetails = false;
        currentUser = {
            id: 0,
            is_enabled: false,
            time_out: 0,
            chat_id: 0,
            chat_type: '',
            chat_title: '',
            user_id: 0
        };
        const chat_details = ctx.callbackQuery.data.split('  ');

        await db.deleteUserChatStatus({ user_id: ctx.from.id, chat_id: chat_details[1] });
        await db.deleteUserData({ user_id: ctx.from.id, chat_id: chat_details[1] });

        await ctx.editMessageText(`Successfully removed *${chat_details[2]}* from being auto delete messages !!`, {
            parse_mode: 'markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '◀️ Back', callback_data: 'go_back' },
                        { text: 'Close ❌️', callback_data: 'close' }
                    ]
                ]
            }
        });
    };

    if (ctx.callbackQuery.data === 'checkTime') {
        await getCurrentUserDetails(ctx);

        const toBeRemovedTimeStamp = (ctx.callbackQuery.message.edit_date + Number(currentUser.time_out));
        const date1 = new Date(toBeRemovedTimeStamp * 1000);
        const date2 = new Date((Date.now() / 1000 | 0) * 1000);

        if (date1 < date2) {
            ctx.telegram.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
            return await db.deleteUserDataByMsgId({ user_id: ctx.from.id, chat_id: ctx.chat.id, message_id: ctx.callbackQuery.message.message_id })
        }

        const diff = date1.getTime() - date2.getTime();

        let msec = diff;
        let hh = Math.floor(msec / 1000 / 60 / 60);
        msec -= hh * 1000 * 60 * 60;
        let mm = Math.floor(msec / 1000 / 60);
        msec -= mm * 1000 * 60;
        let ss = Math.floor(msec / 1000);
        msec -= ss * 1000;

        const days = hh > 24 ? Math.floor(hh / 24) : 0;

        const message = `⚠️ ${days > 0 ? days + ' d, ' : ''}${hh} h, ${mm} m, ${ss}s remains to be removed this message.`;
        await ctx.answerCbQuery(message, true);
    }

    if (ctx.callbackQuery.data.match(/set_timeout(.*)/)) {
        const chat_details = ctx.callbackQuery.data.split('  ');
        await getCurrentUserDetails(ctx, chat_details[1]);

        updating_timeout = true;
        await ctx.editMessageText(`You're editing configuration of\n*${chat_details[1]} (${chat_details[2]})*\n\n➥ Send new timeout in seconds in reply.`, {
            parse_mode: 'markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '◀️ Back', callback_data: 'go_back' },
                        { text: 'Close ❌️', callback_data: 'close' }
                    ]
                ]
            }
        });
    }

    ctx.answerCbQuery();
});


/*

        COMMANDS/MESSAGES

*/


bot.command('add_connection', async (ctx) => {
    ctx.reply('*Intializing....⏳️*', {
        parse_mode: 'markdown',
        reply_to_message_id: ctx.message.message_id
    });

    if (ctx.chat) {
        await getCurrentUserDetails(ctx);
        if (currentUser.chat_id && currentUser.user_id) {
            return ctx.telegram.editMessageText(ctx.chat.id, (ctx.message.message_id + 1), undefined, `This ${currentUser.chat_type} is already connected.\n\n➥ You can change configuration from bot only.`, {
                parse_mode: 'markdown'
            });
        }
    }

    const chat_type = ctx.message.chat.type === 'supergroup' ? 'supergroup' : 'channel';
    const additional_message = ctx.message.chat.type === 'supergroup' ? '➥ Reply Yes for confirmation & No for cancel the process' : '➥ Send me id of your channel (Ex: -100126256)';

    ctx.telegram.editMessageText(ctx.chat.id, (ctx.message.message_id + 1), undefined, `➕️ First add me to your ${chat_type} as an *Admin*.\n\n${additional_message}`, {
        parse_mode: 'markdown'
    });

    adding_connection = true;
});

bot.command('my_connections', async (ctx) => {
    if (ctx.chat.type !== 'private') {
        ctx.deleteMessage();
        return ctx.telegram.sendMessage(ctx.from.id, 'Please change your chat configuration from here by\n/my\_connections command.')
    }
    await showAllConnections(ctx);
});

bot.on('channel_post', async (ctx) => {
    const user_id = await func.getFromId(ctx);
    await getCurrentUserDetails(ctx, ctx.channelPost.chat.id, user_id);

    if (!currentUser.is_enabled) return;

    const params = {
        user_id: user_id,
        message_id: ctx.channelPost.message_id,
        time_out: currentUser.time_out
    };

    ctx.telegram.editMessageReplyMarkup(ctx.channelPost.chat.id, ctx.channelPost.message_id, undefined, {
        inline_keyboard: [
            [
                { text: "🗑️ Self Delete", callback_data: `auto_delete ${params.user_id} ${params.message_id} ${params.time_out}` },
                { text: "❌️ Cancel", callback_data: 'do_nothing' }
            ]
        ]
    });
});

bot.on('message', async (ctx) => {
    // connecting chat
    if (adding_connection && (ctx.message.reply_to_message && ctx.message.reply_to_message.text.includes('First add me to your'))) {
        await ctx.deleteMessage();
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.message.reply_to_message.message_id, undefined, `*Connecting...*`, {
            parse_mode: 'markdown'
        });

        const isChannel = ctx.message.reply_to_message.text.includes('supergroup') ? false : true;
        if (!isChannel && ((ctx.message.text).toLowerCase() !== 'yes')) {
            adding_connection = false;
            return await ctx.telegram.editMessageText(ctx.chat.id, ctx.message.reply_to_message.message_id, undefined, `*Cancelled ongoing process !!*`, {
                parse_mode: 'markdown'
            });
        }

        const chat = await ctx.telegram.getChat(parseInt(isChannel ? ctx.message.text : ctx.chat.id));

        await db.addUserChatStatus({ user_id: ctx.from.id, chat_title: chat.title, chat_id: chat.id, chat_type: chat.type, time_out: 60, is_enabled: 1 });

        adding_connection = false;
        hasUsersDetails = false; // refresh purpose

        return await ctx.telegram.editMessageText(ctx.chat.id, ctx.message.reply_to_message.message_id, undefined, `💥️ Successfully Connected !!\n\n➥ ${func.captalize(chat.type)} - ${chat.title}`, {
            parse_mode: 'markdown'
        });
    }

    // updating timeout
    if (updating_timeout && (ctx.message.reply_to_message && ctx.message.reply_to_message.text.includes('editing configuration'))) {
        await ctx.deleteMessage();
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.message.reply_to_message.message_id, undefined, `Updating timeout...`, {
            parse_mode: 'markdown'
        });

        const time = ctx.message.text;
        if (!time) return ctx.telegram.editMessageText(ctx.chat.id, ctx.message.reply_to_message.message_id, undefined, `*Please enter valid time in seconds*`, {
            parse_mode: 'markdown'
        });

        const regExp = /\(([^)]+)\)/g;
        const matches = regExp.exec(ctx.message.reply_to_message.text);
        const chat_id = matches[1];

        await getCurrentUserDetails(ctx);

        await db.updateUserChatDataBy({ update_by: 'time_out', update_by_value: parseInt(time), user_id: ctx.from.id, chat_id: chat_id });

        currentUser.time_out = time;

        updating_timeout = false;
        hasUsersDetails = false; // refresh purpose

        return await ctx.telegram.editMessageText(ctx.chat.id, ctx.message.reply_to_message.message_id, undefined, `Successfully Updated Timeout to ${time} seconds !!`, {
            parse_mode: 'markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '◀️ Back', callback_data: `show_chat_details  ${currentUser.is_enabled}  ${currentUser.chat_id}  ${currentUser.time_out}` },
                        { text: 'Close ❌️', callback_data: 'close' }
                    ]
                ]
            }
        });
    }

    adding_connection = !!adding_connection;
    updating_timeout = !!updating_timeout;

    const updateSubTypes = ['text', 'photo', 'video'];
    if (updateSubTypes.indexOf(ctx.updateSubTypes[0]) < 0) return;

    if (ctx.chat.type === 'private') return ctx.reply('Use this feature in any Group/Channel after completion of setup not here.')

    await getCurrentUserDetails(ctx);
    if (!currentUser.is_enabled) return;

    const params = {
        user_id: ctx.from.id,
        message_id: ctx.message.message_id,
        time_out: currentUser.time_out
    };

    await ctx.telegram.sendCopy(ctx.chat.id, ctx.message, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🗑️ Self Delete", callback_data: `auto_delete ${params.user_id} ${params.message_id} ${params.time_out}` },
                    { text: "❌️ Cancel", callback_data: 'do_nothing' }
                ]
            ]
        }
    });
    ctx.deleteMessage();
});

bot.launch();
