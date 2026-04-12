export interface IUpdateProfilePayload {
  name?: string;
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
}

export interface IUpdateAgentProfilePayload extends IUpdateProfilePayload {
  licenseNumber?: string;
  experience?: number;
  bio?: string;
  specialization?: string;
  commissionRate?: number;
  isAvailable?: boolean;
}

export interface IUpdateBuyerProfilePayload extends IUpdateProfilePayload {
  budget?: number;
  preferredPropertyType?: string[];
  preferredLocation?: string[];
  isLookingForInvestment?: boolean;
}

export interface IUpdateSellerProfilePayload extends IUpdateProfilePayload {
  propertyCount?: number;
  averagePropertyValue?: number;
  isProfessionalSeller?: boolean;
  companyName?: string;
}
