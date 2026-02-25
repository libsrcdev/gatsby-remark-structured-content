export type CustomHttpRequestHeaderOptions = {
  dangerouslyBuildRequestHttpHeaders?: (
    url: string
  ) => Record<string, string> | undefined;
  httpHeaderProviders?: HttpRequestHeaderProvider[];
};

export type HttpRequestHeaderProvider = (
  url: string
) => Record<string, string> | undefined;

export type RemoteRelativeUrlResolverOptions = {
  resolveRemoteRelativeImageUrl?: (relativeUrl: string) => string | undefined;
};
