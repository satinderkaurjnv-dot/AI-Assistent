const { MongoClient } = require("mongodb");

const mongoClient =
    new MongoClient(
        process.env.MONGODB_URI
    );

let conversationsCollection;

// ============================================================
// CONNECT MONGODB
// ============================================================

async function connectMongoDB() {

    if (conversationsCollection) {
        return;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is missing.");
    }

    console.log("Connecting to MongoDB...");

    await mongoClient.connect();

    const database =
        mongoClient.db("mining_discovery");

    conversationsCollection =
        database.collection("conversations");

    console.log("MongoDB collection initialized successfully.");
}
// ============================================================
// GET CONVERSATION
// ============================================================

async function getConversation(conversationId) {

    if (!conversationsCollection) {
        console.log("MongoDB collection not initialized. Connecting...");
        await connectMongoDB();
    }

    if (!conversationsCollection) {
        throw new Error("MongoDB collection is still undefined after connection.");
    }

    let conversation =
        await conversationsCollection.findOne({
            id: conversationId
        });

    if (!conversation) {

        conversation = {

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
    }

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