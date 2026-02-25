import { buildRequestHttpHeadersWith } from 'custom-http-headers/http-header-trusted-provider';
import {
  CustomHttpRequestHeaderOptions,
  RemoteRelativeUrlResolverOptions,
} from 'custom-http-headers/http-request-header-options';
import type { Image } from 'mdast';
import {
  createGatsbyMarkdownRemarkChildImageNode,
  getThumbnailImageOnly,
} from 'utils';

import type {
  RemarkStructuredContentTransformer,
  TransformerParentType,
} from 'utils/types';

export type CreateThumbnailImageTransformerOptions = {
  keepImageInMdAST?: boolean;
  parentType?: TransformerParentType;
  staticDir?: string;
} & CustomHttpRequestHeaderOptions &
  RemoteRelativeUrlResolverOptions;

/**
 * Extract a single "thumbnail" image with special rules, then remove it from the AST.
 *
 * @param options.parentType - One of:
 *   - "gatsby-transformer-remark" (default: type MarkdownRemark)
 *   - "gatsby-plugin-mdx" (type Mdx)
 *   - { customType: string } (custom parent type)
 */
export function createThumbnailImageTransformer(
  options?: CreateThumbnailImageTransformerOptions
): RemarkStructuredContentTransformer<Image> {
  const {
    keepImageInMdAST,
    parentType = 'gatsby-transformer-remark',
    staticDir = 'static',
    resolveRemoteRelativeImageUrl,
  } = options || {};

  let parentNodeType: string;
  if (parentType === 'gatsby-transformer-remark') {
    parentNodeType = 'MarkdownRemark';
  } else if (parentType === 'gatsby-plugin-mdx') {
    parentNodeType = 'Mdx';
  } else if (typeof parentType === 'object' && parentType.customType) {
    parentNodeType = parentType.customType;
  } else {
    throw new Error('Invalid parentType for createThumbnailImageTransformer');
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
    transform: async (
      context,
      { createRemoteFileNodeWithFields, removeNodeFromMdAST, pluginOptions },
      gatsbyApis
    ) => {
      const { markdownNode: parentGatsbyNode, reporter } = gatsbyApis;

      const [thumbMdASTNode] = context.collected;

      if (!thumbMdASTNode) {
        // No thumbnail image found
        return;
      }

      await createGatsbyMarkdownRemarkChildImageNode({
        buildRequestHttpHeaders:
          options?.dangerouslyBuildRequestHttpHeaders ??
          buildRequestHttpHeadersWith(options?.httpHeaderProviders ?? []),
        createRemoteFileNodeWithFields: createRemoteFileNodeWithFields,
        gatsbyApis: gatsbyApis,
        mdastNode: thumbMdASTNode,
        nodeType: ThumbnailType,
        node: parentGatsbyNode,
        staticDir: staticDir,
        resolveRemoteRelativeImageUrl: (() => {
          if (resolveRemoteRelativeImageUrl) {
            return (relativeImageUrl: string) => {
              const result = resolveRemoteRelativeImageUrl(relativeImageUrl);
              if (!result) {
                reporter.warn(
                  `The provided callback [${resolveRemoteRelativeImageUrl.name}] returned \`${result}\` when requested to resolve the remote relative imageUrl \`${relativeImageUrl}\`. This is fine if you expect to skip the image processing for this relative imageUrl in the [gatsby-remark-structured-content] plugin at the [${createThumbnailImageTransformer.name}] transformer`
                );
              }
              return result;
            };
          }
          return (_: string) => undefined;
        })(),
      });

      if (keepImageInMdAST === true) {
        // do nothing, keep the node in the AST
      } else {
        await removeNodeFromMdAST(thumbMdASTNode);
      }
    },
  };
}
