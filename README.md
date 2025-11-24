# gatsby-remark-structured-content

This plugin extracts images from markdown files that are parsed with [`gatsby-transformer-remark`](https://www.gatsbyjs.org/packages/gatsby-transformer-remark/).

## How to install

```sh
npm i --save @libsrcdev/gatsby-remark-structured-content
```

## Capatibilities

- List embedded images of markdown content based on custom logic.
- Remove embedded images of markdown content based on custom logic.

## Usecases

- Extract the first embedded image to use it as a thumbnail.
- Create a gallery of all images used in a post.

## Usage

Example:

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-transformer-remark`,
    options: {
      plugins: [
        {
          resolve: `gatsby-remark-structured-content`,
          options: {
            // You can optionally provide a function to infer language from code block content when language is not specified
            shouldExtractImage: async (code) => { ... }, // Optional
          },
        },
      ],
    },
  },
];
```
