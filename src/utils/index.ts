import { visit, EXIT } from "unist-util-visit";
import type { Node as UnistNode, Parent as UnistParent } from "unist";
import type { Image } from "mdast";
import { CreateRemoteFileNodeWithFields, RemarkPluginApi } from "./types";
import { Node } from "gatsby";


/**
 * Helpers
 */
export function getAllImagesFromMarkdownAST(markdownAST: UnistNode): Image[] {
  const images: Image[] = [];

  visit(markdownAST, "image", (node) => {
    images.push(node as Image);
  });

  return images;
}

/// Return an image node only if there is no text content before the image
/// or if the content after the image is only whitespace
export function getThumbnailImageOnly(markdownAST: UnistNode): Image | null {
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


export async function removeNodeFromMdAST(node: UnistNode): Promise<void> {
  // Simple strategy: blank out the node but keep its place in the tree.
  (node as any).type = "html";
  (node as any).children = [];
  (node as any).value = "";
}


export type MarkdownRemarkChildRemoteImageNodeParams = {
  mdastNode: Image;
  gatsbyApis: RemarkPluginApi;
  parentNode: Node;
  nodeType: string;
  createRemoteFileNodeWithFields: CreateRemoteFileNodeWithFields;
};

export async function createMarkdownRemarkChildRemoteImageNode({
  mdastNode,
  gatsbyApis,
  parentNode,
  nodeType,
  createRemoteFileNodeWithFields,
}: MarkdownRemarkChildRemoteImageNodeParams): Promise<void> {
  const { actions, createNodeId, createContentDigest } = gatsbyApis;

  const { createNode, createParentChildLink } = actions;

  const content = mdastNode.url || "";
  const contentDigest = createContentDigest(content);

  const childImageNode: Node = {
    id: createNodeId(`${nodeType} >>> ${parentNode.id}`),
    parent: parentNode.id,
    children: [],
    url: mdastNode.url,
    internal: {
      type: nodeType,
      contentDigest: contentDigest,
      owner: '',
      content: content,
    },
  }

  await createNode(childImageNode);

  createParentChildLink({ parent: parentNode, child: childImageNode });

  // Create the File node for the thumbnail image

  const childImageFileNode = await createRemoteFileNodeWithFields(mdastNode, {}, childImageNode.id);

  createParentChildLink({ parent: childImageNode, child: childImageFileNode });
}
