import { createMarkdownRemarkChildRemoteImageNode, getAllImagesFromMarkdownAST } from "utils";
import { RemarkStructuredContentTransformer } from "utils/types";
import type { Image } from "mdast";

/**
 * Extract ALL images from the markdown AST and save them to File nodes.
 */
export function createImageExtractorTransformer(): RemarkStructuredContentTransformer<Image> {
  const MarkdownRemarkEmbeddedImageType = `MarkdownRemarkEmbeddedImage`
  return {
    createSchemaCustomization: ({ reporter, actions, schema }) => {
      const { createTypes } = actions;

      reporter.info("Creating schema customization for createImageExtractorTransformer");

      const typeDefs = [
        `
        type MarkdownRemark implements Node {
          id: ID!
        }
        type ${MarkdownRemarkEmbeddedImageType} implements Node @infer @childOf(types: ["MarkdownRemark"]) {
          id: ID!
          url: String
        }
        type File implements Node @infer @childOf(types: ["${MarkdownRemarkEmbeddedImageType}"]) {
          id: ID!
        }
      `,
      ]

      createTypes(typeDefs);
    },
    traverse: (markdownAST, _utils, context) => {
      getAllImagesFromMarkdownAST(markdownAST).forEach((imageMdastNode) => {
        context.collect(imageMdastNode);
      });
    },
    transform: async (context, { createRemoteFileNodeWithFields }, gatsbyApis) => {
      for (const imageMdastNode of context.collected) {
        const { markdownNode: markdownRemarkGatsbyNode } = gatsbyApis

        await createMarkdownRemarkChildRemoteImageNode({
          createRemoteFileNodeWithFields: createRemoteFileNodeWithFields,
          gatsbyApis: gatsbyApis,
          mdastNode: imageMdastNode,
          nodeType: MarkdownRemarkEmbeddedImageType,
          parentNode: markdownRemarkGatsbyNode,
        });
      }
    },
  };
}

