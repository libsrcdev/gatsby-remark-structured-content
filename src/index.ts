import { createRemoteFileNode } from "gatsby-source-filesystem";
import { visit } from "unist-util-visit";
import type { Node as UnistNode } from "unist";
import type { Image } from "mdast";
import { RemarkPluginApi, StructuredContentPluginOptions as RemarkStructuredContentPluginOptions, TransformerContext } from "./utils/types";
import { removeNodeFromMdAST } from "utils";


/**
 * Main remark plugin entrypoint.
 */
export default async function remarkStructuredContentPlugin(
  remarkPluginApi: RemarkPluginApi,
  pluginOptions: RemarkStructuredContentPluginOptions
): Promise<UnistNode> {
  const {
    markdownAST,
    markdownNode,
    getCache,
    actions,
    reporter,
    createNodeId,
    ...rest
  } = remarkPluginApi;

  reporter.info("Starting remark-structured-content plugin for a markdown node with id: " + markdownNode.id);

  const { createNode, createNodeField } = actions;
  const { transformers } = pluginOptions;

  async function createRemoteFileNodeWithFields(
    mdastNode: Image,
    extraFields: Record<string, unknown> = {},
    parentNodeId?: string
  ) {
    reporter.info(`Saving remote file node for image: ${mdastNode.url}`);

    const fileNode = await createRemoteFileNode({
      url: mdastNode.url,
      parentNodeId: parentNodeId,
      getCache,
      createNode,
      createNodeId,
    });

    reporter.info(`Created file node with id: ${fileNode?.id} for image: ${mdastNode.url}`);

    for (const [key, value] of Object.entries(extraFields)) {
      createNodeField({ node: fileNode, name: key, value });
    }

    return fileNode;
  }

  for (const transformer of transformers) {
    const context: TransformerContext<any> = {
      collected: [],
      collect(item) {
        this.collected.push(item);
      },
      meta: {},
    };

    transformer.traverse(markdownAST, { visit }, context);

    await transformer.transform(
      context,
      { createRemoteFileNodeWithFields, removeNodeFromMdAST },
      remarkPluginApi,
    );
  }

  return markdownAST;
}


export { sourceNodes } from "./gatsby-apis/source-nodes";
export { onCreateNode } from "./gatsby-apis/on-create-node";
export { createSchemaCustomization } from "./gatsby-apis/create-schema-customization";
export { pluginOptionsSchema } from "./gatsby-apis/plugin-options-schema";
export * from "./transformers/index";
