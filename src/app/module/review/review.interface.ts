export interface ICreateReviewPayload {
  propertyId?: string;
  agentId?: string;
  viewingId: string;
  rating: number; // 1 to 5
  comment?: string;
}
