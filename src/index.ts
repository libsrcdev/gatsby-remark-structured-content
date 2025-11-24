import { createRemoteFileNode } from "gatsby-source-filesystem";
import { visit, EXIT } from "unist-util-visit";
import type { Node as UnistNode, Parent as UnistParent } from "unist";
import type { Image } from "mdast";
import { RemarkPluginApi, RemarkStructuredContentTransformer, StructuredContentPluginOptions as RemarkStructuredContentPluginOptions, TransformerContext } from "./types.ts";


/**
 * Extract ALL images from the markdown AST and save them to File nodes.
 */
export function createImageExtractorTransformer(): RemarkStructuredContentTransformer<Image> {
  return {
    createSchemaCustomization: ({ actions }) => {
      const { createTypes } = actions;
      const typeDefs = `
        type MarkdownRemark implements Node {
          embeddedImages: [File!] @link(by: "parent.id", from: "id")
        }
      `;
      createTypes(typeDefs);
    },
    traverse: (markdownAST, _utils, context) => {
      getAllImagesFromMarkdownAST(markdownAST).forEach((imageNode) => {
        context.scheduleTransformOf(imageNode);
      });
    },
    transform: async (node, { saveNodeToFile }) => {
      await saveNodeToFile(node, { transformer: true });
    },
  };
}

export type CreateThumbnailImageTransformerOptions = {
  keepImageInMdAST?: boolean;
};

/**
 * Extract a single "thumbnail" image with special rules, then remove it from the AST.
 */
export function createThumbnailImageTransformer({ keepImageInMdAST }: CreateThumbnailImageTransformerOptions): RemarkStructuredContentTransformer<Image> {
  return {
    createSchemaCustomization: ({ actions }) => {
      const { createTypes } = actions;
      const typeDefs = `
        type MarkdownRemark implements Node {
          thumbnailImage: File @link(by: "parent.id", from: "id")
        }
      `;
      createTypes(typeDefs);
    },
    traverse: (markdownAST, _utils, context) => {
      const thumbImgNode = getThumbnailImageOnly(markdownAST);

      if (thumbImgNode) {
        context.scheduleTransformOf(thumbImgNode);
      }
    },
    transform: async (node, { saveNodeToFile, removeNodeFromMdAST }) => {
      await saveNodeToFile(node, { isThumbnail: true });

      if (keepImageInMdAST === true) {
        // do nothing, keep the node in the AST
      } else {
        await removeNodeFromMdAST(node);
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
    createNodeId,
    ...rest
  } = remarkPluginApi;

  const { createNode, createNodeField } = actions;
  const { transformers } = pluginOptions;

  async function saveNodeToFile(
    node: Image,
    extraFields: Record<string, unknown> = {}
  ) {
    const fileNode = await createRemoteFileNode({
      url: node.url,
      parentNodeId: markdownNode.id,
      getCache,
      createNode,
      createNodeId,
    });

    for (const [key, value] of Object.entries(extraFields)) {
      await createNodeField({ node: fileNode, name: key, value });
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
      scheduleTransformOf(item) {
        this.collected.push(item);
      },
    };

    transformer.traverse(markdownAST, { visit }, context);

    for (const collectedItem of context.collected) {
      await transformer.transform(
        collectedItem,
        { saveNodeToFile, removeNodeFromMdAST },
        remarkPluginApi
      );
    }
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
        return EXIT;
      }
    }
  );

  return thumbnailImage;
}
