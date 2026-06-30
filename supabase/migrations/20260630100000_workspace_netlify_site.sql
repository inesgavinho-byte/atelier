-- Timeline GitHub/Netlify (Bloco F). A workspace can link a Netlify site (like
-- it links a GitHub repo) so its deploys land on the Timeline. The token stays
-- server-side; only the site id is stored per workspace.

alter table public.workspaces add column if not exists netlify_site_id text;
