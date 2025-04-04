/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Document } from '@langchain/core/documents';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
export type IndicesQuerySourceFields = Record<string, QuerySourceFields>;

export enum MessageRole {
  'user' = 'human',
  'assistant' = 'assistant',
  'system' = 'system',
}

interface ModelField {
  field: string;
  model_id: string;
  indices: string[];
}

interface ELSERQueryFields extends ModelField {
  sparse_vector: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface SemanticField {
  field: string;
  inferenceId: string;
  embeddingType: 'sparse_vector' | 'dense_vector';
  indices: string[];
}

export interface QuerySourceFields {
  elser_query_fields: ELSERQueryFields[];
  dense_vector_query_fields: ModelField[];
  bm25_query_fields: string[];
  source_fields: string[];
  semantic_fields: SemanticField[];
  skipped_fields: number;
}

export enum APIRoutes {
  POST_API_KEY = '/internal/search_playground/api_key',
  POST_CHAT_MESSAGE = '/internal/search_playground/chat',
  POST_QUERY_SOURCE_FIELDS = '/internal/search_playground/query_source_fields',
  GET_INDICES = '/internal/search_playground/indices',
  POST_SEARCH_QUERY = '/internal/search_playground/search',
  GET_INDEX_MAPPINGS = '/internal/search_playground/mappings',
  POST_QUERY_TEST = '/internal/search_playground/query_test',
}

export enum LLMs {
  openai = 'openai',
  openai_azure = 'openai_azure',
  openai_other = 'openai_other',
  bedrock = 'bedrock',
  gemini = 'gemini',
  inference = 'inference',
}

export interface ChatRequestData {
  connector_id: string;
  prompt: string;
  indices: string;
  citations: boolean;
  elasticsearch_query: string;
  summarization_model?: string;
  source_fields: string;
  doc_size: number;
}

export interface SearchPlaygroundConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface ModelProvider {
  name: string;
  model: string;
  promptTokenLimit: number;
  provider: LLMs;
}

export interface Pagination {
  from: number;
  size: number;
  total: number;
}

export interface QueryTestResponse {
  documents?: Document[];
  searchResponse: SearchResponse;
}
