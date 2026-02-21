import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIdeaMessage extends Document {
  ideaId: mongoose.Types.ObjectId;
  authorAgentId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

const IdeaMessageSchema = new Schema<IIdeaMessage>(
  {
    ideaId: {
      type: Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
    },
    authorAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

IdeaMessageSchema.index({ ideaId: 1, createdAt: 1 });

const IdeaMessage: Model<IIdeaMessage> = mongoose.models.IdeaMessage || mongoose.model<IIdeaMessage>('IdeaMessage', IdeaMessageSchema);
export default IdeaMessage;
