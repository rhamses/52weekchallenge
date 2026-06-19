import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/better-auth';

export const ALL: APIRoute = ({ request }) => {
	return createAuth().handler(request);
};
