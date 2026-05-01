import type {
  CreateFeedbackInput,
  Feedback,
  FeedbackStatus
} from './feedback';

export default interface IFeedbackRepository {
  createFeedback(feedback: CreateFeedbackInput): Promise<string>;
  getFeedbacks(): Promise<Feedback[]>;
  updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void>;
}
