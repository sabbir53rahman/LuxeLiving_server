export interface ICreatePropertyPayload {
  title: string;
  description?: string;
  price: number;
  location: string;
  images: string[];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  type: string;
  agentId?: string;
}

export interface IUpdatePropertyPayload {
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  images?: string[];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  type?: string;
  status?: string;
  agentId?: string;
}

export interface IUpdateSellerProfilePayload {
  name?: string;
  email?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  propertyCount?: number;
  averagePropertyValue?: number;
  isProfessionalSeller?: boolean;
  companyName?: string;
}

export interface IUpdateViewingStatusPayload {
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface IAgentRequestPayload {
  agentId: string;
  message?: string;
}

export interface ISellerStats {
  totalProperties: number;
  availableProperties: number;
  soldProperties: number;
  rentedProperties: number;
  totalViewings: number;
  completedViewings: number;
  totalRevenue: number;
  averagePropertyValue: number;
}
