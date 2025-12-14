import { createMarkdownRemarkChildRemoteImageNode, getAllImagesFromMarkdownAST } from "utils";
import { RemarkStructuredContentTransformer, TransformerParentType } from "utils/types";
import type { Image } from "mdast";

/**
 * Extract ALL images from the markdown AST and save them to File nodes.
 *
 * @param options.parentType - One of:
 *   - "gatsby-transformer-remark" (default: type MarkdownRemark)
 *   - "gatsby-plugin-mdx" (type Mdx)
 *   - { customType: string } (custom parent type)
 */
export type CreateImageExtractorTransformerOptions = {
  parentType?: TransformerParentType;
};

export function createImageExtractorTransformer(
  options?: CreateImageExtractorTransformerOptions
): RemarkStructuredContentTransformer<Image> {
  const { parentType = "gatsby-transformer-remark" } = options || {};

  let parentNodeType: string;
  if (parentType === "gatsby-transformer-remark") {
    parentNodeType = "MarkdownRemark";
  } else if (parentType === "gatsby-plugin-mdx") {
    parentNodeType = "Mdx";
  } else if (typeof parentType === "object" && parentType.customType) {
    parentNodeType = parentType.customType;
  } else {
    throw new Error("Invalid parentType for createImageExtractorTransformer");
  }

  const EmbeddedImageType = `${parentNodeType}EmbeddedImage`;

  return {
    createSchemaCustomization: ({ reporter, actions, schema }) => {
      const { createTypes } = actions;

      reporter.info(
        `Creating schema customization for createImageExtractorTransformer (parent: ${parentNodeType})`
      );

      const typeDefs = [
        `
        type ${parentNodeType} implements Node {
          id: ID!
        }
        type ${EmbeddedImageType} implements Node @infer @childOf(types: ["${parentNodeType}"]) {
          id: ID!
          url: String
        }
        type File implements Node @infer @childOf(types: ["${EmbeddedImageType}"]) {
          id: ID!
        }
      `,
      ];

      createTypes(typeDefs);
    },
    traverse: (markdownAST, _utils, context) => {
      getAllImagesFromMarkdownAST(markdownAST).forEach((imageMdastNode) => {
        context.collect(imageMdastNode);
      });
    },
    transform: async (context, { createRemoteFileNodeWithFields }, gatsbyApis) => {
      for (const imageMdastNode of context.collected) {
        const { markdownNode: parentGatsbyNode } = gatsbyApis;

        await createMarkdownRemarkChildRemoteImageNode({
          createRemoteFileNodeWithFields: createRemoteFileNodeWithFields,
          gatsbyApis: gatsbyApis,
          mdastNode: imageMdastNode,
          nodeType: EmbeddedImageType,
          parentNode: parentGatsbyNode,
        });
      }
    },
  };
}

