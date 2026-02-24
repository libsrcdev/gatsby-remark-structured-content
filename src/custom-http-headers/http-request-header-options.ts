
export type HttpRequestHeaderOptions = {
	dangerouslyBuildRequestHttpHeaders?: (url: string) => Record<string, string> | undefined
	httpHeaderProviders: ((url: string) => Record<string, string> | undefined)[]
}