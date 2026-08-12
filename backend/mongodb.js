const { MongoClient } = require("mongodb");

let mongoClient = null;
let conversationsCollection = null;

// ============================================================
// CONNECT MONGODB
// ============================================================

async function connectMongoDB() {

    if (conversationsCollection) {
        return;
    }

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error(
            "MONGODB_URI environment variable is missing on Vercel."
        );
    }

    console.log("MONGODB_URI found.");
    console.log("Connecting to MongoDB...");

    mongoClient = new MongoClient(uri);

    await mongoClient.connect();

    const database =
        mongoClient.db("mining_discovery");

    conversationsCollection =
        database.collection("conversations");

    console.log(
        "MongoDB collection initialized successfully."
    );
}


// ============================================================
// GET CONVERSATION
// ============================================================

async function getConversation(conversationId) {

    if (!conversationsCollection) {
        await connectMongoDB();
    }

    return await conversationsCollection.findOne({
        id: conversationId
    }) || await createConversation(conversationId);
}


// ============================================================
// CREATE CONVERSATION
// ============================================================

async function createConversation(conversationId) {

    const conversation = {

        id: conversationId,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString(),

        messages: []

    };

    await conversationsCollection.insertOne(
        conversation
    );

    return conversation;
}


// ============================================================
// SAVE CONVERSATION
// ============================================================

async function saveConversation(conversation) {

    if (!conversationsCollection) {
        await connectMongoDB();
    }

    conversation.updatedAt =
        new Date().toISOString();

    await conversationsCollection.updateOne(

        {
            id: conversation.id
        },

        {
            $set: {
                createdAt:
                    conversation.createdAt,

                updatedAt:
                    conversation.updatedAt,

                messages:
                    conversation.messages
            }
        },

        {
            upsert: true
        }
    );
}


// ============================================================
// GET ALL CONVERSATIONS
// ============================================================

async function getAllConversations() {

    if (!conversationsCollection) {
        await connectMongoDB();
    }

    return await conversationsCollection
        .find({})
        .sort({
            updatedAt: -1
        })
        .toArray();
}


// ============================================================
// DELETE CONVERSATION
// ============================================================

async function deleteConversation(conversationId) {

    if (!conversationsCollection) {
        await connectMongoDB();
    }

    return await conversationsCollection.deleteOne({
        id: conversationId
    });
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    connectMongoDB,

    getConversation,

    saveConversation,

    getAllConversations,

    deleteConversation

};