// Import Mongoose
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const participant = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    //unique: true,
  },
  avatar: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
});

// message
const message = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  attachments: [String],
  body: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
    //required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// chat Thread
const ThreadSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  clientId: {
    type: String,
    required: true,
  },
  messages: [message],
  participants: [participant],
  type: {
    type: String,
    required: true,
  },
  unreadCount: {
    type: Number,
  },
});

// Create a pre-save hook to generate a unique code
// ThreadSchema.pre("save", function (next) {
//   const thread = this;
//   thread.id = uuidv4();
//   next();
// });

// Create a new model for the user schema
const Thread = mongoose.model("Thread", ThreadSchema);
const Participant = mongoose.model("Participant", participant);
const Message = mongoose.model("Message", message);

// Export the Thread model
module.exports = { Thread, Participant, Message };
