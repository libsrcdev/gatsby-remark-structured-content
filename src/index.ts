import { createRemoteFileNode } from "gatsby-source-filesystem";
import { visit, EXIT } from "unist-util-visit";
import type { Node as UnistNode, Parent as UnistParent } from "unist";
import type { Image } from "mdast";
import { RemarkPluginApi, RemarkStructuredContentTransformer, StructuredContentPluginOptions as RemarkStructuredContentPluginOptions, TransformerContext } from "./types";

/**
 * Extract ALL images from the markdown AST and save them to File nodes.
 */
export function createImageExtractorTransformer(): RemarkStructuredContentTransformer<Image> {
  return {
    createSchemaCustomization: ({ reporter, actions, schema }) => {
      const { createTypes } = actions;

      reporter.info("Creating schema customization for createImageExtractorTransformer");

      const typeDefs = [
        `
        type MarkdownRemark implements Node {
          embeddedImages: [File] @link(by: "fields.imageExtractedFromMarkdownRemarkId", from: "id")
        }
      `,
      ]

      createTypes(typeDefs);
    },
    traverse: (markdownAST, _utils, context) => {
      getAllImagesFromMarkdownAST(markdownAST).forEach((imageNode) => {
        context.collect(imageNode);
      });
    },
    transform: async (context, { createFileNode }, { markdownNode: markdownRemarkGatsbyNode }) => {
      for (const node of context.collected) {
        await createFileNode(node, { imageExtractedFromMarkdownRemarkId: markdownRemarkGatsbyNode.id });
      }
    },
  };
}

export type CreateThumbnailImageTransformerOptions = {
  keepImageInMdAST?: boolean;
};

/**
 * Extract a single "thumbnail" image with special rules, then remove it from the AST.
 */
export function createThumbnailImageTransformer(options?: CreateThumbnailImageTransformerOptions): RemarkStructuredContentTransformer<Image> {
  const { keepImageInMdAST } = options || {};

  const LINK_FIELD_NAME = "thumbnailImage";

  return {
    createSchemaCustomization: ({ actions, schema }) => {
      const { createTypes } = actions;
      const typeDefs = `
        type MarkdownRemark implements Node {
          ${LINK_FIELD_NAME}: File @link(from: "fields.${LINK_FIELD_NAME}", by: "id")
        }
      `;
      createTypes(typeDefs);
    },
    traverse: (markdownAST, _utils, context) => {
      const thumbImgNode = getThumbnailImageOnly(markdownAST);

      if (thumbImgNode) {
        context.collect(thumbImgNode);
      }
    },
    transform: async (context, { createFileNode, removeNodeFromMdAST }, gatsbyApis) => {
      const { markdownNode: markdownRemarkGatsbyNode, actions } = gatsbyApis;

      const [thumbMdASTNode] = context.collected;

      if (!thumbMdASTNode) {
        // No thumbnail image found
        return;
      }

      const { createNodeField } = actions;

      const thumbImgGatsbyNode = await createFileNode(thumbMdASTNode);

      createNodeField({ node: markdownRemarkGatsbyNode, name: LINK_FIELD_NAME, value: thumbImgGatsbyNode.id });

      if (keepImageInMdAST === true) {
        // do nothing, keep the node in the AST
      } else {
        await removeNodeFromMdAST(thumbMdASTNode);
      }
    },
  };
}

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

  async function createFileNode(
    node: Image,
    extraFields: Record<string, unknown> = {}
  ) {
    reporter.info(`Saving remote file node for image: ${node.url}`);

    const fileNode = await createRemoteFileNode({
      url: node.url,
      parentNodeId: markdownNode.id,
      getCache,
      createNode,
      createNodeId,
    });

    reporter.info(`Created file node with id: ${fileNode?.id} for image: ${node.url}`);

    for (const [key, value] of Object.entries(extraFields)) {
      createNodeField({ node: fileNode, name: key, value });
    }

    return fileNode;
  }

  async function removeNodeFromMdAST(node: UnistNode): Promise<void> {
    // Simple strategy: blank out the node but keep its place in the tree.
    (node as any).type = "html";
    (node as any).children = [];
    (node as any).value = "";
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
      { createFileNode, removeNodeFromMdAST },
      remarkPluginApi,
    );
  }

  return markdownAST;
}

/**
 * Helpers
 */

function getAllImagesFromMarkdownAST(markdownAST: UnistNode): Image[] {
  const images: Image[] = [];

  visit(markdownAST, "image", (node) => {
    images.push(node as Image);
  });

  return images;
}

/// Return an image node only if there is no text content before the image
/// or if the content after the image is only whitespace
function getThumbnailImageOnly(markdownAST: UnistNode): Image | null {
  let thumbnailImage: Image | null = null;

  visit(
    markdownAST,
    "image",
    (node, index, parent) => {
      thumbnailImage = node as Image;
      return [EXIT];
      if (!parent || typeof index !== "number") {
        return;
      }

      const p = parent as UnistParent & { children: UnistNode[] };
      const nodesBefore = p.children.slice(0, index);
      const nodesAfter = p.children.slice(index + 1);

      const hasTextBefore = nodesBefore.some(
        (n: any) => n.type === "text" && typeof n.value === "string" && n.value.trim().length > 0
      );
      const hasTextAfter = nodesAfter.some(
        (n: any) => n.type === "text" && typeof n.value === "string" && n.value.trim().length > 0
      );

      if (!hasTextBefore && !hasTextAfter) {
        thumbnailImage = node as Image;
        return [EXIT];
      }
    }
  );

  return thumbnailImage;
}

export { sourceNodes } from "./source-nodes";
export { onCreateNode } from "./on-create-node";
export { createSchemaCustomization } from "./create-schema-customization";
export { pluginOptionsSchema } from "./plugin-options-schema";
