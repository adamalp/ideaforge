import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgentWebhooks {
  url: string;
  secret?: string;
  events: string[];
}

export interface IAgent extends Document {
  name: string;
  description: string;
  apiKey: string;
  claimStatus: 'pending_claim' | 'claimed';
  claimToken: string;
  ownerEmail?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
  webhooks?: IAgentWebhooks;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_-]+$/,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    claimStatus: {
      type: String,
      enum: ['pending_claim', 'claimed'],
      default: 'pending_claim',
    },
    claimToken: {
      type: String,
      required: true,
      unique: true,
    },
    ownerEmail: String,
    avatarUrl: String,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    webhooks: {
      type: {
        url: { type: String, required: true },
        secret: String,
        events: { type: [String], default: [] },
      },
      default: undefined,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.apiKey;
        delete ret.__v;
        if (ret.webhooks?.secret) {
          ret.webhooks = { ...ret.webhooks, secret: '***' };
        }
        return ret;
      },
    },
  }
);

const Agent: Model<IAgent> = mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
export default Agent;
