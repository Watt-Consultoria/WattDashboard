import type { Timestamp } from 'firebase/firestore';

export type Tutorial = {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrls: string[];
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByMemberId?: string;
  createdByMemberName?: string;
};
