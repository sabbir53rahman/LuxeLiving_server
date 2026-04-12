import {
  ViewingStatus,
  PaymentStatus,
} from "../../../generated/prisma/enums";

export interface ICreateViewingPayload {
  propertyId: string;
  agentId?: string;
  viewingDate: string;
  notes?: string;
}

export interface IUpdateViewingPayload {
  status?: ViewingStatus;
  paymentStatus?: PaymentStatus;
  viewingDate?: string;
  notes?: string;
}
