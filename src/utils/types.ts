import type { Actions, CreateSchemaCustomizationArgs, PluginOptions } from "gatsby";
import { visit } from "unist-util-visit";
import type { Node as UnistNode } from "unist";
import type { Image } from "mdast";

export interface RemarkStructuredContentTransformer<T = any> {
  createSchemaCustomization?: (args: CreateSchemaCustomizationArgs) => void | Promise<void>;
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

export type CreateRemoteFileNodeWithFields = (mdastNode: Image, extraFields?: Record<string, unknown>, parentNodeId?: string) => Promise<any>;

export interface RemarkPluginApi extends CreateSchemaCustomizationArgs {
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
