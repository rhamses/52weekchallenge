type MockHandler = {
	match: RegExp;
	handle: (binds: unknown[]) => unknown;
};

export function createMockD1(handlers: MockHandler[]): D1Database {
	const prepare = (sql: string) => {
		let binds: unknown[] = [];
		const stmt = {
			bind: (...args: unknown[]) => {
				binds = args;
				return stmt;
			},
			all: async <T>() => {
				for (const handler of handlers) {
					if (handler.match.test(sql)) {
						return handler.handle(binds) as { results: T[] };
					}
				}
				return { results: [] };
			},
			first: async () => {
				for (const handler of handlers) {
					if (handler.match.test(sql)) {
						return handler.handle(binds);
					}
				}
				return null;
			},
			run: async () => {
				for (const handler of handlers) {
					if (handler.match.test(sql)) {
						handler.handle(binds);
						break;
					}
				}
				return { success: true, meta: {} };
			},
		};
		return stmt;
	};

	return { prepare } as unknown as D1Database;
}
