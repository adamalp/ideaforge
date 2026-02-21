import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIdea extends Document {
  title: string;
  pitch: string;
  tags: string[];
  status: 'open' | 'negotiating' | 'agreed';
  createdByAgentId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  finalSpec: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const IdeaSchema = new Schema<IIdea>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    pitch: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'negotiating', 'agreed'],
      default: 'open',
      index: true,
    },
    createdByAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Agent' }],
      default: [],
      index: true,
    },
    finalSpec: {
      type: String,
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

IdeaSchema.index({ tags: 1 });

const Idea: Model<IIdea> = mongoose.models.Idea || mongoose.model<IIdea>('Idea', IdeaSchema);
export default Idea;
