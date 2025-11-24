import type { Actions, PluginOptions } from "gatsby";
import { visit, EXIT } from "unist-util-visit";
import type { Node as UnistNode, Parent as UnistParent } from "unist";
import type { Image } from "mdast";

export interface RemarkStructuredContentTransformer<T = any> {
  createSchemaCustomization?: (args: { actions: Actions }) => void | Promise<void>;
  traverse: (
    markdownAST: UnistNode,
    utils: { visit: typeof visit },
    context: TransformerContext<T>
  ) => void;
  transform: (
    collected: T,
    helpers: {
      saveNodeToFile: (node: Image, extraFields?: Record<string, unknown>) => Promise<any>;
      removeNodeFromMdAST: (node: UnistNode) => Promise<void>;
    },
    api: RemarkPluginApi
  ) => Promise<void>;
}

export interface RemarkPluginApi {
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
  scheduleTransformOf: (item: T) => void;
}

export interface StructuredContentPluginOptions extends PluginOptions {
  transformers: RemarkStructuredContentTransformer[];
}
