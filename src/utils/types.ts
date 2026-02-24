import type {
  Actions,
  CreateSchemaCustomizationArgs,
  PluginOptions,
} from 'gatsby';
import { visit } from 'unist-util-visit';
import type { Node as UnistNode } from 'unist';
import type { Image } from 'mdast';
import { HttpRequestHeaderOptions } from 'custom-http-headers/http-request-header-options';
// Common parent type for image transformers
export type TransformerParentType =
  | 'gatsby-transformer-remark'
  | 'gatsby-plugin-mdx'
  | { customType: string };

export interface RemarkStructuredContentTransformer<T = any> {
  createSchemaCustomization?: (
    args: CreateSchemaCustomizationArgs
  ) => void | Promise<void>;
  traverse: (
    markdownAST: UnistNode,
    utils: { visit: typeof visit },
    context: TransformerContext<T>
  ) => void;
  transform: (
    context: TransformerContext<T>,
    helpers: {
      createRemoteFileNodeWithFields: CreateRemoteFileNodeWithFields;
      removeNodeFromMdAST: (node: UnistNode) => Promise<void>;
    },
    api: RemarkPluginApi
  ) => Promise<void>;
}

export type CreateRemoteFileNodeWithFields = (
  mdastNode: Image,
  extraFields?: Record<string, unknown>,
  parentNodeId?: string
) => Promise<any>;

export type ImageRequestHttpHeadersProviderOptions = {
  domain?: string;
  pattern?: RegExp;
  headers?: Record<string, string>;
  buildHeaders?: (url: string) => Record<string, string>;
};

export function imageRequestHttpHeadersProvider(
  options: ImageRequestHttpHeadersProviderOptions
): (url: string) => Record<string, string> | undefined {
  return (url: string) => {
    const { domain, pattern, headers, buildHeaders } = options;

    if (domain && !url.startsWith(domain)) {
      return undefined;
    }

    if (pattern.test(url)) {
      return httpHeaders;
    }
    return undefined;
  };
}

export interface RemarkPluginApi
  extends CreateSchemaCustomizationArgs, HttpRequestHeaderOptions {
  markdownAST: UnistNode;
  markdownNode: any;
  getCache: (id: string) => any;
  actions: Actions;
  createNodeId: (id: string) => string;
  // Gatsby passes more stuff, we don't need to fully type it
  [key: string]: unknown;
}

export interface TransformerContext<T = any> {
  collected: T[];
  collect: (item: T) => void;
  meta: Record<string, unknown>;
}

export interface StructuredContentPluginOptions extends PluginOptions {
  transformers: RemarkStructuredContentTransformer[];
}
