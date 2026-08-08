Python Sniper (FastAPI) lives here so Vercel does not treat `/api` as a Python serverless root
(that was breaking the Next.js deployment with 404 on `/`).

To expose it on Vercel later, wire a dedicated serverless entry or external service and point
`SKLYVO_API_URL` / rewrites at it.
