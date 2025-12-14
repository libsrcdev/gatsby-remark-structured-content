import type { Image } from "mdast";
import { createMarkdownRemarkChildRemoteImageNode, getThumbnailImageOnly } from "utils";

import type { RemarkStructuredContentTransformer, TransformerParentType } from "utils/types";

export type CreateThumbnailImageTransformerOptions = {
  keepImageInMdAST?: boolean;
  parentType?: TransformerParentType;
};

/**
 * Extract a single "thumbnail" image with special rules, then remove it from the AST.
 *
 * @param options.parentType - One of:
 *   - "gatsby-transformer-remark" (default: type MarkdownRemark)
 *   - "gatsby-plugin-mdx" (type Mdx)
 *   - { customType: string } (custom parent type)
 */
export function createThumbnailImageTransformer(options?: CreateThumbnailImageTransformerOptions): RemarkStructuredContentTransformer<Image> {
  const { keepImageInMdAST, parentType = "gatsby-transformer-remark" } = options || {};

  let parentNodeType: string;
  if (parentType === "gatsby-transformer-remark") {
    parentNodeType = "MarkdownRemark";
  } else if (parentType === "gatsby-plugin-mdx") {
    parentNodeType = "Mdx";
  } else if (typeof parentType === "object" && parentType.customType) {
    parentNodeType = parentType.customType;
  } else {
    throw new Error("Invalid parentType for createThumbnailImageTransformer");
  }

  const ThumbnailType = `${parentNodeType}Thumbnail`;

  return {
    createSchemaCustomization: ({ actions, schema }) => {
      const { createTypes } = actions;
      const typeDefs = `
        type ${parentNodeType} implements Node {
          id: ID!
        }
        type ${ThumbnailType} implements Node @infer @childOf(types: ["${parentNodeType}"]) {
          id: ID!
          url: String
        }
        type File implements Node @infer @childOf(types: ["${ThumbnailType}"]) {
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
      const { markdownNode: parentGatsbyNode } = gatsbyApis;

      const [thumbMdASTNode] = context.collected;

      if (!thumbMdASTNode) {
        // No thumbnail image found
        return;
      }

      await createMarkdownRemarkChildRemoteImageNode({
        createRemoteFileNodeWithFields: createRemoteFileNodeWithFields,
        gatsbyApis: gatsbyApis,
        mdastNode: thumbMdASTNode,
        nodeType: ThumbnailType,
        parentNode: parentGatsbyNode,
      });

      if (keepImageInMdAST === true) {
        // do nothing, keep the node in the AST
      } else {
        await removeNodeFromMdAST(thumbMdASTNode);
      }
    },
  };
}
