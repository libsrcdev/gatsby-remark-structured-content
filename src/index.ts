import { createRemoteFileNode } from 'gatsby-source-filesystem';
import { visit } from 'unist-util-visit';
import type { Node as UnistNode } from 'unist';
import type { Image } from 'mdast';
import {
  RemarkPluginApi,
  RemarkStructuredContentPluginOptions,
  TransformerContext,
} from './utils/types';
import { removeNodeFromMdAST } from 'utils';

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
  } = remarkPluginApi;

  const { createNode, createNodeField } = actions;
  const { transformers } = pluginOptions;

  reporter.verbose(
    `[remark-structured-content] Processing markdown node ${markdownNode.id} with ${transformers?.length ?? 0} transformer(s)`
  );

  if (!transformers || transformers.length === 0) {
    reporter.warn(`[remark-structured-content] No transformers configured — nothing to do`);
    return markdownAST;
  }

  async function createRemoteFileNodeWithFields(
    mdastNode: Image,
    extraFields: Record<string, unknown> = {},
    parentNodeId?: string,
    httpHeaders?: Record<string, string>
  ) {
    const imageUrl = mdastNode.url;

    reporter.verbose(`[remark-structured-content] Downloading remote image: ${imageUrl}`);

    const fileNode = await createRemoteFileNode({
      url: imageUrl,
      parentNodeId: parentNodeId,
      getCache,
      createNode,
      createNodeId,
      httpHeaders,
    });

    reporter.verbose(
      `[remark-structured-content] Created remote file node ${fileNode?.id} for ${mdastNode.url}`
    );

    for (const [key, value] of Object.entries(extraFields)) {
      createNodeField({ node: fileNode, name: key, value });
    }

    return fileNode;
  }

  for (let i = 0; i < transformers.length; i++) {
    const transformer = transformers[i];
    const context: TransformerContext<any> = {
      collected: [],
      collect(item) {
        this.collected.push(item);
      },
      meta: {},
    };

    reporter.verbose(`[remark-structured-content] Running transformer ${i + 1}/${transformers.length} — traverse phase`);
    transformer.traverse(markdownAST, { visit }, context);
    reporter.verbose(`[remark-structured-content] Transformer ${i + 1} collected ${context.collected.length} node(s)`);

    reporter.verbose(`[remark-structured-content] Running transformer ${i + 1}/${transformers.length} — transform phase`);
    await transformer.transform(
      context,
      { createRemoteFileNodeWithFields, removeNodeFromMdAST, pluginOptions },
      remarkPluginApi
    );
    reporter.verbose(`[remark-structured-content] Transformer ${i + 1} — transform phase complete`);
  }

  reporter.verbose(`[remark-structured-content] Finished processing markdown node ${markdownNode.id}`);

  return markdownAST;
}

export { sourceNodes } from './gatsby-apis/source-nodes';
export { onCreateNode } from './gatsby-apis/on-create-node';
export { createSchemaCustomization } from './gatsby-apis/create-schema-customization';
export { pluginOptionsSchema } from './gatsby-apis/plugin-options-schema';
export * from './transformers/index';
export * from './custom-http-headers/http-header-trusted-provider';
export * from './custom-http-headers/http-request-header-options';
export * from './custom-http-headers/is-trusted-url';