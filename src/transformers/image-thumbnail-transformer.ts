import type { Image } from "mdast";
import { createMarkdownRemarkChildRemoteImageNode, getThumbnailImageOnly } from "utils";
import { RemarkStructuredContentTransformer } from "utils/types";

export type CreateThumbnailImageTransformerOptions = {
  keepImageInMdAST?: boolean;
};

/**
 * Extract a single "thumbnail" image with special rules, then remove it from the AST.
 */
export function createThumbnailImageTransformer(options?: CreateThumbnailImageTransformerOptions): RemarkStructuredContentTransformer<Image> {
  const { keepImageInMdAST } = options || {};

  const MarkdownRemarkThumbnailType = "MarkdownRemarkThumbnail";

  return {
    createSchemaCustomization: ({ actions, schema }) => {
      const { createTypes } = actions;
      const typeDefs = `
        type MarkdownRemark implements Node {
          id: ID!
        }
        type ${MarkdownRemarkThumbnailType} implements Node @infer @childOf(types: ["MarkdownRemark"]) {
          id: ID!
          url: String
        }
        type File implements Node @infer @childOf(types: ["${MarkdownRemarkThumbnailType}"]) {
          id: ID!
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
    transform: async (context, { createRemoteFileNodeWithFields, removeNodeFromMdAST }, gatsbyApis) => {
      const { markdownNode: markdownRemarkGatsbyNode } = gatsbyApis;

      const [thumbMdASTNode] = context.collected;

      if (!thumbMdASTNode) {
        // No thumbnail image found
        return;
      }

      await createMarkdownRemarkChildRemoteImageNode({
        createRemoteFileNodeWithFields: createRemoteFileNodeWithFields,
        gatsbyApis: gatsbyApis,
        mdastNode: thumbMdASTNode,
        nodeType: MarkdownRemarkThumbnailType,
        parentNode: markdownRemarkGatsbyNode,
      });

      if (keepImageInMdAST === true) {
        // do nothing, keep the node in the AST
      } else {
        await removeNodeFromMdAST(thumbMdASTNode);
      }
    },
  };
}
