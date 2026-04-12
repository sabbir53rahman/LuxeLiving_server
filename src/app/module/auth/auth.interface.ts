export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IRegisterBuyerPayload {
  name: string;
  email: string;
  password: string;
}

export interface IRegisterAgentPayload {
  name: string;
  email: string;
  password: string;
}

export interface IRegisterSellerPayload {
  name: string;
  email: string;
  password: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
