import { Request, Response } from "express";

import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { AgentService } from "./agent.service";
import pick from "../../utils/pick";
import { agentFilterableFields } from "./agent.constants";
import { IQueryParams } from "../../interfaces/query.interface";

const getAllAgents = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, agentFilterableFields) as IQueryParams;

  const result = await AgentService.getAllAgents(filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agents retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyAgentProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await AgentService.getMyAgentProfile(user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent profile retrieved successfully",
    data: result,
  });
});

const getAgentById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await AgentService.getAgentById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent retrieved successfully",
    data: result,
  });
});

const updateAgent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await AgentService.updateAgent(id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent updated successfully",
    data: result,
  });
});

const getAgentViewings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, agentFilterableFields) as IQueryParams;

  const result = await AgentService.getAgentViewings(user.userId, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent viewings retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAssignedSellerProperties = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, agentFilterableFields) as IQueryParams;

  const result = await AgentService.getAssignedSellerProperties(user.userId, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent assigned properties retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAgentEarnings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, agentFilterableFields) as IQueryParams;

  const result = await AgentService.getAgentEarnings(user.userId, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent earnings retrieved successfully",
    data: result,
  });
});

const getAgentAnalytics = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, agentFilterableFields) as IQueryParams;

  const result = await AgentService.getAgentAnalytics(user.userId, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent analytics retrieved successfully",
    data: result,
  });
});

const deleteAgent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await AgentService.deleteAgent(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent deleted successfully",
    data: result,
  });
});

export const AgentController = {
  getAllAgents,
  getAgentById,
  getMyAgentProfile,
  updateAgent,
  deleteAgent,
  getAgentViewings,
  getAssignedSellerProperties,
  getAgentEarnings,
  getAgentAnalytics,
};
