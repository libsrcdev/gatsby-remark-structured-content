import {
  HttpRequestHeaderProvider,
} from './http-request-header-options';
import { isTrustedUrl, UrlCheckOptions } from './is-trusted-url';

export function httpHeaderTrustedProvider(
  options: UrlCheckOptions,
  headerBuilder: (url: string) => Record<string, string> | undefined
): (url: string) => Record<string, string> | undefined {
  return (url: string) => {
    if (!isTrustedUrl(url, options)) {
      return undefined;
    }
    return headerBuilder(url);
  };
}

export function forTrustedDomains(
  domains: string[],
  headerBuilder: (url: string) => Record<string, string> | undefined
): (url: string) => Record<string, string> | undefined {
  return httpHeaderTrustedProvider(
    { allowedDomains: domains, allowSubdomains: false },
    headerBuilder
  );
}

export const buildRequestHttpHeadersWith =
  (httpHeaderProviders: HttpRequestHeaderProvider[]) => (url: string) => {
    for (const httpHeaderProvider of httpHeaderProviders ?? []) {
      const httpHeaders = httpHeaderProvider(url);
      if (httpHeaders) {
        return httpHeaders;
      }
    }
    return undefined;
  };
