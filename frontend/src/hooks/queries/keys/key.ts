export const QueryType = Object.freeze({
  LIST: 'list',
  ONE: 'one',
} as const);
export type QueryType = (typeof QueryType)[keyof typeof QueryType];

export const QueryGroup = Object.freeze({
  HEALTH_CHECK: 'health-check',
  AUTH: 'auth',
  EMAIL: 'email',
  DRIVE: 'drive',
  ATTACHMENTS: 'attachments',
  USER: 'user',
  CATEGORIES: 'categories',
} as const);
export type QueryGroup = (typeof QueryGroup)[keyof typeof QueryGroup];

export const getQueryKey = (params: {
  group: QueryGroup;
  type: QueryType;
  subTypes?: string[];
  key: string | Record<string, unknown>;
}): (string | object)[] => {
  const { group, key, type, subTypes } = params;

  return [group, type, ...(subTypes ?? []), key] as const;
};

// Attachment-specific query key generators
export const attachmentQueryKeys = {
  all: () => [QueryGroup.ATTACHMENTS] as const,
  lists: () =>
    getQueryKey({
      group: QueryGroup.ATTACHMENTS,
      type: QueryType.LIST,
      key: 'all',
    }),
  list: (claimId: string) =>
    getQueryKey({
      group: QueryGroup.ATTACHMENTS,
      type: QueryType.LIST,
      key: { claimId },
    }),
  detail: (attachmentId: string) =>
    getQueryKey({
      group: QueryGroup.ATTACHMENTS,
      type: QueryType.ONE,
      key: { attachmentId },
    }),
  upload: (claimId: string, filename: string) =>
    getQueryKey({
      group: QueryGroup.ATTACHMENTS,
      type: QueryType.ONE,
      subTypes: ['upload'],
      key: { claimId, filename },
    }),
} as const;

// Category-specific query key generators
export const categoryQueryKeys = {
  all: () => [QueryGroup.CATEGORIES] as const,
  lists: () =>
    getQueryKey({
      group: QueryGroup.CATEGORIES,
      type: QueryType.LIST,
      key: 'all',
    }),
  list: (params?: { includeDisabled?: boolean; includeDeleted?: boolean }) =>
    getQueryKey({
      group: QueryGroup.CATEGORIES,
      type: QueryType.LIST,
      key: { params },
    }),
} as const;
