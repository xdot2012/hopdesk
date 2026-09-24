import {
  KNOWLEDGE_BASE_ARTICLES_PATH,
  KNOWLEDGE_BASE_ARTICLES_REORDER_PATH,
  KNOWLEDGE_BASE_ARTICLES_SUGGEST_PATH,
  KNOWLEDGE_BASE_ARTICLES_TREE_PATH,
  knowledgeBaseArticleImagePath,
  knowledgeBaseArticlePath,
} from '~/api';
import useImmutableQuery from '~/hooks/useImmutableQuery';
import useMutation from '~/hooks/useMutation';
import { formDataUploadConfig } from '~/lib/formDataUpload';
import http from '~/services/http';
import useSWR from 'swr';
import { mutate as swrMutate } from 'swr';

export type KnowledgeBaseArticleListItem = {
  id: string;
  parentId?: string | null;
  rootId?: string | null;
  title: string;
  slug: string;
  status: string;
  publishedAt?: string | null;
  viewCount: number;
  sortOrder: number;
  childrenCount: number;
  visibility?: string | null;
};

export type KnowledgeBaseArticleBreadcrumbItem = {
  id: string;
  title: string;
  slug: string;
};

export type KnowledgeBaseArticleChild = {
  id: string;
  title: string;
  slug: string;
  status: string;
  sortOrder: number;
  childrenCount: number;
};

export type KnowledgeBaseArticle = KnowledgeBaseArticleListItem & {
  body: string;
  keywords: string[];
  authorId: string;
  authorName?: string | null;
  createdAt: string;
  updatedAt: string;
  breadcrumb: KnowledgeBaseArticleBreadcrumbItem[];
  children: KnowledgeBaseArticleChild[];
};

export type KnowledgeBaseArticleTreeNode = KnowledgeBaseArticleListItem & {
  children: KnowledgeBaseArticleTreeNode[];
};

export type KnowledgeBaseArticleSuggestion = KnowledgeBaseArticleListItem & {
  keywords: string[];
  score: number;
};

export type SuggestKnowledgeBaseArticlesRequest = {
  text?: string;
  subject?: string;
  description?: string;
  ticketId?: string;
  limit?: number;
};

export type CreateKnowledgeBaseArticleRequest = {
  title: string;
  slug?: string;
  body: string;
  status?: string;
  parentId?: string | null;
  sortOrder?: number;
  visibility?: string | null;
};

export type UpdateKnowledgeBaseArticleRequest = {
  title?: string;
  slug?: string;
  body?: string;
  status?: string;
  parentId?: string | null;
  sortOrder?: number;
  visibility?: string | null;
  clearParent?: boolean;
};

export type ReorderKnowledgeBaseArticlesRequest = {
  articleIds: string[];
  parentId?: string;
};

export type UploadKnowledgeBaseFileResponse = {
  key: string;
  url: string;
};

function useListKnowledgeBaseArticles(
  options?: {
    search?: string;
    rootOnly?: boolean;
    parentId?: string;
    limit?: number;
  } | null,
) {
  const enabled = options !== null;
  const params = new URLSearchParams();
  if (options?.search?.trim()) {
    params.set('search', options.search.trim());
  } else if (options) {
    if (options.rootOnly) {
      params.set('rootOnly', 'true');
    }
    if (options.parentId) {
      params.set('parentId', options.parentId);
    }
  }
  if (options?.limit) {
    params.set('limit', String(options.limit));
  }
  const query = params.toString();
  const url = !enabled
    ? null
    : query
      ? `${KNOWLEDGE_BASE_ARTICLES_PATH}?${query}`
      : KNOWLEDGE_BASE_ARTICLES_PATH;
  const { data, ...rest } = useImmutableQuery<KnowledgeBaseArticleListItem[]>(url, {
    method: 'get',
  });
  return { articles: enabled ? (data?.data ?? []) : [], ...rest };
}

function useListKnowledgeBaseArticleTree(enabled = true) {
  const { data, ...rest } = useImmutableQuery<KnowledgeBaseArticleTreeNode[]>(
    enabled ? KNOWLEDGE_BASE_ARTICLES_TREE_PATH : null,
    { method: 'get' },
  );
  return { tree: data?.data ?? [], ...rest };
}

function useGetKnowledgeBaseArticle(articleRef: string | undefined) {
  const path = articleRef ? knowledgeBaseArticlePath(articleRef) : null;
  const { data, ...rest } = useSWR(
    path,
    (url: string) =>
      http.get<KnowledgeBaseArticle>(url, { method: 'get' }).then(({ data, status }) => ({
        data,
        status,
      })),
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  return { article: data?.data, ...rest };
}

function useCreateKnowledgeBaseArticle() {
  return useMutation<CreateKnowledgeBaseArticleRequest, KnowledgeBaseArticle>(
    KNOWLEDGE_BASE_ARTICLES_PATH,
    { method: 'post' },
  );
}

function useUpdateKnowledgeBaseArticle(articleId: string) {
  return useMutation<UpdateKnowledgeBaseArticleRequest, KnowledgeBaseArticle>(
    knowledgeBaseArticlePath(articleId),
    { method: 'patch' },
  );
}

function useDeleteKnowledgeBaseArticle(articleId: string) {
  return useMutation<Record<string, never>, void>(knowledgeBaseArticlePath(articleId), {
    method: 'delete',
  });
}

function useSuggestKnowledgeBaseArticles() {
  return useMutation<SuggestKnowledgeBaseArticlesRequest, KnowledgeBaseArticleSuggestion[]>(
    KNOWLEDGE_BASE_ARTICLES_SUGGEST_PATH,
    { method: 'post' },
  );
}

async function reorderKnowledgeBaseArticles(
  data: ReorderKnowledgeBaseArticlesRequest,
): Promise<void> {
  await http.post(KNOWLEDGE_BASE_ARTICLES_REORDER_PATH, data);
}

async function uploadKnowledgeBaseInlineImage(
  articleId: string,
  file: File,
): Promise<UploadKnowledgeBaseFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await http.post<UploadKnowledgeBaseFileResponse>(
    knowledgeBaseArticleImagePath(articleId),
    formData,
    formDataUploadConfig,
  );

  return data;
}

async function refreshKnowledgeBaseCaches(): Promise<void> {
  await swrMutate(
    (key) => typeof key === 'string' && key.startsWith(KNOWLEDGE_BASE_ARTICLES_PATH),
    undefined,
    { revalidate: true },
  );
}

export {
  useListKnowledgeBaseArticles,
  useListKnowledgeBaseArticleTree,
  useGetKnowledgeBaseArticle,
  useCreateKnowledgeBaseArticle,
  useUpdateKnowledgeBaseArticle,
  useDeleteKnowledgeBaseArticle,
  useSuggestKnowledgeBaseArticles,
  reorderKnowledgeBaseArticles,
  uploadKnowledgeBaseInlineImage,
  refreshKnowledgeBaseCaches,
};
