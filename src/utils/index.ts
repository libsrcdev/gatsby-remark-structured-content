import { visit, EXIT } from 'unist-util-visit';
import type { Node as UnistNode, Parent as UnistParent } from 'unist';
import type { Image } from 'mdast';
import { CreateRemoteFileNodeWithFields, RemarkPluginApi } from './types';
import { Node, Store } from 'gatsby';
import isRelativeUrl from 'is-relative-url';
import slash from 'slash';
import path from 'path';
import { FileSystemNode } from 'gatsby-source-filesystem';
import { stat, statSync } from 'fs';
import { resolveFullUrl, resolveRelativeUrl } from './resolve-url';
/**
 * Helpers
 */
export function getAllImagesFromMarkdownAST(markdownAST: UnistNode): Image[] {
  const images: Image[] = [];

  visit(markdownAST, 'image', (node) => {
    images.push(node as Image);
  });

  return images;
}

/**
 * Finds the nearest File parent node by traversing up the node tree.
 * Returns the File node if found, otherwise returns the original parent node.
 */
export function findNearestFileParentNodeOf(
  node: Node,
  getNode: (id: string) => Node | undefined
): FileSystemNode | undefined {
  let parentNode = node.parent ? getNode(node.parent) : undefined;

  if (
    parentNode &&
    parentNode.internal &&
    parentNode.internal.type !== 'File'
  ) {
    let tempParentNode: Node | undefined = parentNode;
    while (
      tempParentNode &&
      tempParentNode.internal &&
      tempParentNode.internal.type !== 'File'
    ) {
      tempParentNode = getNode(tempParentNode.parent as string);
    }
    if (
      tempParentNode &&
      tempParentNode.internal &&
      tempParentNode.internal.type === 'File'
    ) {
      parentNode = tempParentNode;
    }
  }

  if (!parentNode) return undefined;

  return 'absolutePath' in parentNode
    ? (parentNode as FileSystemNode)
    : undefined;
}

export function getThumbnailImageOnly(markdownAST: UnistNode): Image | null {
  let thumbnailImage: Image | null = null;

  visit(markdownAST, 'image', (node, index, parent) => {
    thumbnailImage = node as Image;
    return [EXIT];
    if (!parent || typeof index !== 'number') {
      return;
    }

    const p = parent as UnistParent & { children: UnistNode[] };
    const nodesBefore = p.children.slice(0, index);
    const nodesAfter = p.children.slice(index + 1);

    const hasTextBefore = nodesBefore.some(
      (n: any) =>
        n.type === 'text' &&
        typeof n.value === 'string' &&
        n.value.trim().length > 0
    );
    const hasTextAfter = nodesAfter.some(
      (n: any) =>
        n.type === 'text' &&
        typeof n.value === 'string' &&
        n.value.trim().length > 0
    );

    if (!hasTextBefore && !hasTextAfter) {
      thumbnailImage = node as Image;
      return [EXIT];
    }
  });

  return thumbnailImage;
}

export async function removeNodeFromMdAST(node: UnistNode): Promise<void> {
  // Simple strategy: blank out the node but keep its place in the tree.
  (node as any).type = 'html';
  (node as any).children = [];
  (node as any).value = '';
}

export type MarkdownRemarkChildRemoteImageNodeParams = {
  mdastNode: Image;
  gatsbyApis: RemarkPluginApi;
  node: Node;
  staticDir?: string;
  nodeType: string;
  createRemoteFileNodeWithFields: CreateRemoteFileNodeWithFields;
  resolveRemoteRelativeImageUrl: (relativeUrl: string) => string | undefined;
	buildRequestHttpHeaders: (url: string) => Record<string, string> | undefined;
};

export async function createGatsbyMarkdownRemarkChildImageNode({
  mdastNode,
  gatsbyApis,
  node,
  resolveRemoteRelativeImageUrl,
  staticDir = 'static',
  nodeType,
  createRemoteFileNodeWithFields,
	buildRequestHttpHeaders,
}: MarkdownRemarkChildRemoteImageNodeParams): Promise<void> {
  const {
    actions,
    createNodeId,
    createContentDigest,
    store,
    getNode,
    getNodesByType,
    reporter,
  } = gatsbyApis;

  const { createNode, createParentChildLink } = actions;

  const imageUrl = mdastNode.url || '';

  reporter.verbose(`[remark-structured-content] Processing image node — url: "${imageUrl}", nodeType: ${nodeType}`);

  const content = imageUrl;

  const contentDigest = createContentDigest(content);

  const createChildImageNode = async () => {
    const childImageNode: Node = {
      id: createNodeId(`${nodeType} >>> ${node.id} >>> ${contentDigest}`),
      parent: node.id,
      children: [],
      url: mdastNode.url,
      internal: {
        type: nodeType,
        contentDigest: contentDigest,
        owner: '',
        content: content,
      },
    };

    await createNode(childImageNode);

    createParentChildLink({ parent: node, child: childImageNode });

    return childImageNode;
  };

  const remoteImageUrl = resolveFullUrl(imageUrl);
  const relativeImageUrl = resolveRelativeUrl(imageUrl);

  if (relativeImageUrl) {
    reporter.verbose(`[remark-structured-content] Resolving relative image URL: "${relativeImageUrl}"`);
    // gatsby parent file node of this parent-node
    const nearestFileParentNodeDir =
      // try find the nearest parent node of the parentNode of the given Gatsby plugin custom Image Node
      findNearestFileParentNodeOf(node, getNode)?.dir;

    // Has no FileSystemNode parent
    const isLocalNode = !!nearestFileParentNodeDir;

    const { directory } = store.getState().program;

    let filePath: string;

    if (isLocalNode) {
      // relative URL with local node (most common case when posts and images are in localsystem)
      // handle relative path (./image.png, ../image.png)
      filePath = path.resolve(
        path.join(nearestFileParentNodeDir, relativeImageUrl)
      );
    } else {
      // handle path returned from netlifyCMS & friends (/assets/image.png)
      const resolvedFilePath = resolveRemoteRelativeImageUrl(relativeImageUrl);

      if (resolvedFilePath) {
        filePath = resolvedFilePath;
      } else {
        filePath = path.isAbsolute(staticDir)
          ? path.resolve(path.join(staticDir, relativeImageUrl))
          : path.resolve(path.join(directory, staticDir, relativeImageUrl));
      }
    }

    const files = getNodesByType('File') as FileSystemNode[];

    const childImageFileNode = files.find(
      (fileNode) => fileNode.absolutePath && fileNode.absolutePath === filePath
    );

    if (childImageFileNode) {
      reporter.verbose(`[remark-structured-content] Found local file node for "${filePath}"`);
      const childImageNode = await createChildImageNode();

      createParentChildLink({
        parent: childImageNode,
        child: childImageFileNode,
      });
    }

    reporter.warn(
      `[remark-structured-content] No local file node found with absolutePath "${filePath}" — skipping image`
    );
  } else if (remoteImageUrl) {
    reporter.verbose(`[remark-structured-content] Resolving remote image URL: "${remoteImageUrl}"`);
    const childImageNode = await createChildImageNode();
    // Create the File node for the thumbnail image

    const childImageFileNode = await createRemoteFileNodeWithFields(
      mdastNode,
      {},
      childImageNode.id,
      buildRequestHttpHeaders(imageUrl)
    );

    createParentChildLink({
      parent: childImageNode,
      child: childImageFileNode,
    });
  } else {
    reporter.warn(
      `[remark-structured-content] Image URL "${imageUrl}" is neither relative nor remote — skipping`
    );
  }
}
