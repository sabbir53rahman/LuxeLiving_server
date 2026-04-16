import {
  ViewingStatus,
  PaymentStatus,
} from "../../../generated/prisma/enums";

export interface ICreateViewingPayload {
  propertyId: string;
  agentId?: string;
  viewingDate?: string;
  date?: string; // For separate date field from frontend form
  time?: string; // For separate time field from frontend form
  preferredDate?: string; // Alternative field name from frontend
  preferredTime?: string; // Alternative field name from frontend
  notes?: string;
}

export interface IUpdateViewingPayload {
  status?: ViewingStatus;
  paymentStatus?: PaymentStatus;
  viewingDate?: string;
  notes?: string;
}
