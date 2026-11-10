import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema(
  {
    code: String,
    label: String,
    type: { type: String, default: 'text' },
    required: { type: Boolean, default: false }
  },
  { _id: false }
);

const StepSchema = new mongoose.Schema(
  {
    code: String,
    label: String,
    fields: [FieldSchema]
  },
  { _id: false }
);

// An action names a whitelisted operation (see executor). `call` selects WHICH
// server operation runs; it is never a URL. `needs`/`capture` thread ids.
const ActionSchema = new mongoose.Schema(
  {
    call: String,
    needs: [String],
    capture: String
  },
  { _id: false }
);

const JourneySchema = new mongoose.Schema(
  {
    journeyType: { type: String, required: true, unique: true },
    label: String,
    stepsKey: String,
    steps: [StepSchema],
    actions: [ActionSchema]
  },
  { timestamps: true }
);

export default mongoose.model('Journey', JourneySchema);
