export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface PaginationQuery {
  cursor?: string;
  limit?: number;
  search?: string;
}
