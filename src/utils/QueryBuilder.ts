import { PrismaClient } from "../generated/prisma/client";

export interface IQueryParams {
  searchTerm?: string;
  limit?: string | number;
  page?: string | number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  minPrice?: string | number;
  maxPrice?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  location?: string;
  type?: string;
  agentId?: string;
  status?: string;
  [key: string]: any;
}

export interface IQueryResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class QueryBuilder<T> {
  private model: any;
  private query: IQueryParams;
  private options: {
    searchableFields: string[];
  };
  private prismaQuery: any = {};

  constructor(
    model: any,
    query: IQueryParams,
    options: { searchableFields: string[] }
  ) {
    this.model = model;
    this.query = query;
    this.options = options;
  }

  search() {
    const { searchTerm } = this.query;
    if (searchTerm) {
      this.prismaQuery.where = {
        ...this.prismaQuery.where,
        OR: this.options.searchableFields.map((field) => ({
          [field]: {
            contains: searchTerm,
            mode: "insensitive",
          },
        })),
      };
    }
    return this;
  }

  filter() {
    const {
      searchTerm,
      limit,
      page,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      location,
      type,
      agentId,
      status,
      ...filters
    } = this.query;

    // Handle price range
    if (minPrice || maxPrice) {
      this.prismaQuery.where = {
        ...this.prismaQuery.where,
        price: {
          ...(minPrice && { gte: parseFloat(minPrice as string) }),
          ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
        },
      };
    }

    // Handle other filters
    const filterConditions: any = {};

    if (bedrooms) {
      filterConditions.bedrooms = { gte: parseInt(bedrooms as string) };
    }

    if (bathrooms) {
      filterConditions.bathrooms = { gte: parseInt(bathrooms as string) };
    }

    if (location) {
      filterConditions.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    if (type) {
      filterConditions.type = type;
    }

    if (agentId) {
      filterConditions.agentId = agentId;
    }

    if (status) {
      filterConditions.status = status;
    }

    // Add any additional filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
        filterConditions[key] = filters[key];
      }
    });

    if (Object.keys(filterConditions).length > 0) {
      this.prismaQuery.where = {
        ...this.prismaQuery.where,
        ...filterConditions,
      };
    }

    return this;
  }

  paginate() {
    const limit = parseInt(this.query.limit as string) || 10;
    const page = parseInt(this.query.page as string) || 1;
    const skip = (page - 1) * limit;

    this.prismaQuery.take = limit;
    this.prismaQuery.skip = skip;

    return this;
  }

  sort() {
    const sortBy = this.query.sortBy || "createdAt";
    const sortOrder = this.query.sortOrder || "desc";

    this.prismaQuery.orderBy = {
      [sortBy]: sortOrder,
    };

    return this;
  }

  include(includeOptions: any) {
    this.prismaQuery.include = includeOptions;
    return this;
  }

  where(whereConditions: any) {
    this.prismaQuery.where = {
      ...this.prismaQuery.where,
      ...whereConditions,
    };
    return this;
  }

  async execute(): Promise<IQueryResult<T>> {
    const [data, total] = await Promise.all([
      this.model.findMany(this.prismaQuery),
      this.model.count({ where: this.prismaQuery.where }),
    ]);

    const limit = parseInt(this.query.limit as string) || 10;
    const page = parseInt(this.query.page as string) || 1;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  getQuery() {
    return this.prismaQuery;
  }
}