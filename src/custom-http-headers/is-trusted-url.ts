export type UrlCheckOptions = {
	allowedDomains: string[];   // list of allowed domains
	schemes?: string[];         // allowed protocols without ":"
	allowSubdomains?: boolean;  // WARNING: when true, allows any subdomain (e.g., evil.example.com)
	maxSubdomainDepth?: number; // max nesting level for subdomains (e.g., 1 = sub.example.com, 2 = deep.sub.example.com)
	allowedPorts?: string[] | null; // null = any port
	disallowedQueryParams?: string[]; // query parameter names that are not allowed
};

export function isTrustedUrl(
	input: string,
	options: UrlCheckOptions
): boolean {
	const {
		allowedDomains,
		schemes = ["http", "https"],
		allowSubdomains = false,
		maxSubdomainDepth = Infinity,
		allowedPorts = null,
		disallowedQueryParams = []
	} = options;

	try {
		const url = new URL(input);

		// scheme check
		const protocol = url.protocol.replace(":", "");
		if (!schemes.includes(protocol)) {
			return false;
		}

		// normalize hostname (handles punycode/IDN automatically via URL constructor)
		const hostname = url.hostname.toLowerCase();

		// check against each allowed domain
		let domainMatch = false;
		for (const allowedDomain of allowedDomains) {
			const domain = allowedDomain.toLowerCase();

			if (hostname === domain) {
				domainMatch = true;
				break;
			}

			if (allowSubdomains && hostname.endsWith("." + domain)) {
				// check subdomain depth
				const subdomain = hostname.slice(0, -(domain.length + 1)); // remove ".domain"
				const subdomainLevels = subdomain.split(".").length;

				if (subdomainLevels <= maxSubdomainDepth) {
					domainMatch = true;
					break;
				}
			}
		}

		if (!domainMatch) {
			return false;
		}

		// check for forbidden query parameters
		if (disallowedQueryParams.length > 0) {
			for (const param of disallowedQueryParams) {
				if (url.searchParams.has(param)) {
					return false;
				}
			}
		}

		// optional port validation
		if (allowedPorts) {
			const port =
				url.port ||
				(protocol === "https"
					? "443"
					: protocol === "http"
						? "80"
						: "");

			if (!allowedPorts.includes(port)) {
				return false;
			}
		}

		return true;
	} catch {
		// invalid URL throws
		return false;
	}
}