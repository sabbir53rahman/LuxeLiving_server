import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const getApiDocs = catchAsync(async (req: Request, res: Response) => {
  const apiDocs = {
    title: "LuxeLiving Real Estate API",
    version: "1.0.0",
    description: "API documentation for LuxeLiving real estate platform",
    baseUrl: `${req.protocol}://${req.get("host")}/api/v1`,
    endpoints: {
      auth: {
        "POST /auth/register-buyer": {
          description: "Register a new buyer account",
          body: {
            name: "string (required)",
            email: "string (required)",
            password: "string (required, min 6 chars)",
          },
        },
        "POST /auth/register-agent": {
          description: "Register a new agent account",
          body: {
            name: "string (required)",
            email: "string (required)",
            password: "string (required, min 6 chars)",
          },
        },
        "POST /auth/register-seller": {
          description: "Register a new seller account",
          body: {
            name: "string (required)",
            email: "string (required)",
            password: "string (required, min 6 chars)",
          },
        },
        "POST /auth/login": {
          description: "Login user",
          body: {
            email: "string (required)",
            password: "string (required)",
          },
        },
      },
      properties: {
        "GET /properties": {
          description: "Get all properties with filtering and pagination",
          query: {
            searchTerm: "string (optional)",
            location: "string (optional)",
            type: "string (optional)",
            minPrice: "number (optional)",
            maxPrice: "number (optional)",
            bedrooms: "number (optional)",
            bathrooms: "number (optional)",
            limit: "number (optional, default 10)",
            page: "number (optional, default 1)",
            sortBy: "string (optional)",
            sortOrder: "asc|desc (optional)",
          },
        },
        "GET /properties/:id": {
          description: "Get property details by ID",
        },
        "POST /properties": {
          description: "Create new property (Agent only)",
          auth: "Required (Agent)",
          body: {
            title: "string (required)",
            description: "string (optional)",
            price: "number (required)",
            location: "string (required)",
            images: "string[] (optional)",
            bedrooms: "number (optional)",
            bathrooms: "number (optional)",
            area: "number (optional)",
            type: "string (required)",
          },
        },
        "GET /properties/me": {
          description: "Get agent's own properties",
          auth: "Required (Agent)",
        },
      },
      viewings: {
        "POST /viewings": {
          description: "Schedule a property viewing (Buyer only)",
          auth: "Required (Buyer)",
          body: {
            propertyId: "string (required)",
            viewingDate: "Date (required)",
            notes: "string (optional)",
          },
        },
        "GET /viewings/me": {
          description: "Get user's viewings",
          auth: "Required",
        },
        "PATCH /viewings/:id/status": {
          description: "Update viewing status (Agent/Admin only)",
          auth: "Required (Agent/Admin)",
          body: {
            status: "SCHEDULED|COMPLETED|CANCELLED (required)",
          },
        },
      },
      payments: {
        "POST /payments/create-session/:viewingId": {
          description: "Create Stripe checkout session for viewing payment",
          auth: "Required",
        },
        "POST /payments/webhook": {
          description: "Stripe webhook for payment confirmation",
          auth: "Not required (webhook)",
        },
      },
      reviews: {
        "POST /reviews": {
          description: "Create review after completed viewing (Buyer only)",
          auth: "Required (Buyer)",
          body: {
            viewingId: "string (required)",
            propertyId: "string (optional)",
            agentId: "string (optional)",
            rating: "number 1-5 (required)",
            comment: "string (optional)",
          },
        },
        "GET /reviews": {
          description: "Get all reviews with filtering",
        },
      },
      upload: {
        "POST /upload/single": {
          description: "Upload single image",
          auth: "Required",
          contentType: "multipart/form-data",
          body: "image: File (required)",
        },
        "POST /upload/multiple": {
          description: "Upload multiple images",
          auth: "Required",
          contentType: "multipart/form-data",
          body: "images: File[] (required, max 10)",
        },
      },
      dashboard: {
        "GET /meta/dashboard": {
          description: "Get dashboard statistics based on user role",
          auth: "Required",
        },
      },
      profile: {
        "GET /users/me": {
          description: "Get current user profile",
          auth: "Required",
        },
        "PATCH /users/me": {
          description: "Update user profile",
          auth: "Required",
        },
        "PATCH /users/agent": {
          description: "Update agent profile (Agent only)",
          auth: "Required (Agent)",
        },
      },
    },
    authentication: {
      type: "JWT Bearer Token",
      header: "Authorization: Bearer <token>",
      cookie: "accessToken (httpOnly cookie)",
    },
    userRoles: ["BUYER", "AGENT", "SELLER", "ADMIN", "SUPER_ADMIN"],
    responseFormat: {
      success: "boolean",
      message: "string",
      data: "object (response data)",
      meta: "object (pagination info, optional)",
      errors: "array (validation errors, optional)",
    },
    errorCodes: {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      500: "Internal Server Error",
    },
  };

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "API documentation retrieved successfully",
    data: apiDocs,
  });
});

export const DocsController = {
  getApiDocs,
};