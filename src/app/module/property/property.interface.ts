export interface ICreatePropertyPayload {
  title: string;
  description?: string;
  price: number;
  location: string;
  images?: string[];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  type: string;
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
}