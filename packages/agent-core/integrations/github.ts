const GITHUB_API = "https://api.github.com";

interface GithubFile {
  path: string;
  content: string;
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(\.git)?\/?$/);
  const owner = match?.[1];
  const repo = match?.[2];
  if (!owner || !repo) return null;
  return { owner, repo };
}

async function gh(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Ouvre une pull request sur le dépôt du projet : crée une branche depuis la branche par défaut,
 * commite les fichiers fournis (créés ou mis à jour), puis ouvre la PR vers la branche par défaut.
 * Nécessite GITHUB_TOKEN (token d'accès avec droits d'écriture sur le dépôt cible).
 */
export async function openPullRequest(params: {
  repoUrl: string;
  branch: string;
  title: string;
  body: string;
  files: GithubFile[];
}): Promise<{ url: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN manquant — impossible d'ouvrir une PR.");

  const parsed = parseRepoUrl(params.repoUrl);
  if (!parsed) throw new Error(`repoUrl invalide, attendu une URL GitHub : ${params.repoUrl}`);
  const { owner, repo } = parsed;

  const repoInfo = await gh(`/repos/${owner}/${repo}`, token);
  const defaultBranch = repoInfo.default_branch as string;

  const baseRef = await gh(`/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, token);
  const baseSha = baseRef.object.sha as string;

  await gh(`/repos/${owner}/${repo}/git/refs`, token, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${params.branch}`, sha: baseSha }),
  });

  for (const file of params.files) {
    let existingSha: string | undefined;
    try {
      const existing = await gh(
        `/repos/${owner}/${repo}/contents/${file.path}?ref=${params.branch}`,
        token
      );
      existingSha = existing.sha;
    } catch {
      // Le fichier n'existe pas encore sur cette branche — création plutôt que mise à jour.
    }

    await gh(`/repos/${owner}/${repo}/contents/${file.path}`, token, {
      method: "PUT",
      body: JSON.stringify({
        message: `${params.title} — ${file.path}`,
        content: Buffer.from(file.content, "utf-8").toString("base64"),
        branch: params.branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });
  }

  const pr = await gh(`/repos/${owner}/${repo}/pulls`, token, {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      head: params.branch,
      base: defaultBranch,
    }),
  });

  return { url: pr.html_url as string };
}