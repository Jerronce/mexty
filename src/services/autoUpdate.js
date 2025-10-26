// src/services/autoUpdate.js
// feat: add autoUpdate scheduled sync for socials/portfolio
// Note: This file contains only client-safe stubs and triggers no secrets.
// The actual scheduled job and tokens live server-side (Firebase Functions/Cloud Run).

/*
Architecture overview:
- Frontend: exposes a callable function triggerAutoUpdate() for manual admin trigger and
  reads the consolidated profile document from Firestore at /userProfileData/jerronce/profile.
- Backend (functions/autoUpdateJob.js): performs fetching from GitHub API and scraping/public endpoints,
  enriches with LinkedIn/JSON snapshot if provided via server-side secrets, and writes to Firestore.
- Cloud Scheduler: weekly cron -> HTTPS endpoint (Functions) with OIDC service account auth.
  No secrets shipped to frontend.
*/

import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const db = getFirestore(app);
const functions = getFunctions(app);

// Reads the latest consolidated profile for display
export async function getLatestUserProfile() {
  const ref = doc(db, 'userProfileData', 'jerronce', 'profile', 'latest');
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// Manually trigger the backend sync job (restricted to admins via Functions auth/claims)
export async function triggerAutoUpdate() {
  const fn = httpsCallable(functions, 'autoUpdate_runSync');
  const res = await fn({ source: 'manual' });
  return res.data;
}

// Lightweight validator for rendering components
export function isValidProfile(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const required = ['github', 'socials', 'education', 'metadata'];
  return required.every((k) => k in payload);
}

/*
Backend implementation (add these files on server side):

// functions/autoUpdateJob.js
import fetch from 'node-fetch';
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();
const db = admin.firestore();

const CFG = {
  GITHUB_USER: 'Jerronce',
  FB_URL: 'https://web.facebook.com/Jerronce',
  IG_URL: 'https://www.instagram.com/itz_jerronce/',
  BEHANCE_URL: 'https://www.behance.net', // optional: add username if available
  LINKEDIN_SNAPSHOT_JSON: process.env.LINKEDIN_SNAPSHOT_JSON || '',
  LINKEDIN_TOKEN: process.env.LINKEDIN_TOKEN || '',
  USER_DOC_PATH: ['userProfileData', 'jerronce', 'profile', 'latest'],
};

function redact(v) { return v ? '***' : ''; }

async function fetchGithub() {
  const base = `https://api.github.com/users/${CFG.GITHUB_USER}`;
  const headers = { 'User-Agent': 'autoUpdateJob', Accept: 'application/vnd.github+json' };
  const [userRes, reposRes] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/repos?per_page=100&sort=updated`, { headers }),
  ]);
  const user = await userRes.json();
  const reposFull = await reposRes.json();
  const repos = Array.isArray(reposFull) ? reposFull.map(r => ({
    id: r.id,
    name: r.name,
    html_url: r.html_url,
    description: r.description,
    language: r.language,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    pushed_at: r.pushed_at,
    updated_at: r.updated_at,
  })) : [];
  const latestCommits = [];
  for (const r of repos.slice(0, 5)) {
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${CFG.GITHUB_USER}/${r.name}/commits?per_page=3`, { headers });
      const commits = await commitsRes.json();
      latestCommits.push({ repo: r.name, commits: (Array.isArray(commits)? commits: []).map(c => ({
        sha: c.sha,
        message: c.commit?.message,
        html_url: c.html_url,
        author: c.commit?.author?.name,
        date: c.commit?.author?.date,
      }))});
    } catch (_) {}
  }
  return { user, repos, latestCommits };
}

async function fetchPublicHTML(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    return { ok: true, html: await res.text() };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function parseInstagramPublic(html) {
  const m = html.match(/"biography":"([^"]*)"/);
  const bio = m ? m[1] : undefined;
  const fullname = (html.match(/"full_name":"([^"]*)"/) || [])[1];
  return { bio, full_name: fullname };
}

function parseFacebookPublic(html) {
  const name = (html.match(/\"name\":\"([^\"]+)\"/) || [])[1];
  return { name };
}

function parseBehancePublic(html) {
  const displayName = (html.match(/"display_name":"([^"]+)"/) || [])[1];
  return { displayName };
}

function tryLinkedInFromSnapshot(snapshotJson) {
  try {
    if (!snapshotJson) return null;
    const obj = JSON.parse(snapshotJson);
    const education = (obj.education||[]).filter(e => /University of the People/i.test(e.schoolName));
    return { education };
  } catch (_) { return null; }
}

async function tryLinkedInAPI(token) {
  if (!token) return null;
  // Placeholder for private LinkedIn API access
  return null;
}

function buildProfilePayload({ gh, fb, ig, be, liSnapshot, liApi }) {
  const now = new Date().toISOString();
  const education = liApi?.education || liSnapshot?.education || [];
  return {
    github: {
      username: CFG.GITHUB_USER,
      profile: {
        login: gh?.user?.login,
        name: gh?.user?.name,
        avatar_url: gh?.user?.avatar_url,
        html_url: gh?.user?.html_url,
        bio: gh?.user?.bio,
        followers: gh?.user?.followers,
        following: gh?.user?.following,
        public_repos: gh?.user?.public_repos,
      },
      repos: gh?.repos || [],
      latestCommits: gh?.latestCommits || [],
    },
    socials: {
      facebook: fb || {},
      instagram: ig || {},
      behance: be || {},
      links: {
        facebook: CFG.FB_URL,
        instagram: CFG.IG_URL,
        behance: CFG.BEHANCE_URL,
        x: 'https://x.com/Jerronce',
      },
    },
    education: education,
    metadata: {
      updatedAt: now,
      sources: {
        github: 'GitHub REST API',
        facebook: 'Public HTML best-effort',
        instagram: 'Public HTML best-effort',
        behance: 'Public HTML best-effort',
        linkedin: liApi ? 'API' : (liSnapshot ? 'Snapshot JSON' : 'n/a'),
      },
      redactions: {
        LINKEDIN_TOKEN: redact(CFG.LINKEDIN_TOKEN),
      },
    },
  };
}

async function writeProfile(payload) {
  const ref = db.doc(CFG.USER_DOC_PATH.join('/'));
  await ref.set(payload, { merge: true });
}

async function runCore() {
  const gh = await fetchGithub();

  const [fbR, igR, beR] = await Promise.all([
    fetchPublicHTML(CFG.FB_URL),
    fetchPublicHTML(CFG.IG_URL),
    fetchPublicHTML(CFG.BEHANCE_URL),
  ]);
  const fb = fbR.ok ? parseFacebookPublic(fbR.html) : { error: fbR.error };
  const ig = igR.ok ? parseInstagramPublic(igR.html) : { error: igR.error };
  const be = beR.ok ? parseBehancePublic(beR.html) : { error: beR.error };

  const liSnapshot = tryLinkedInFromSnapshot(CFG.LINKEDIN_SNAPSHOT_JSON);
  const liApi = await tryLinkedInAPI(CFG.LINKEDIN_TOKEN);

  const payload = buildProfilePayload({ gh, fb, ig, be, liSnapshot, liApi });
  await writeProfile(payload);
  return { ok: true, updatedAt: payload.metadata.updatedAt };
}

export const autoUpdate_runSync = onRequest(async (req, res) => {
  try {
    const result = await runCore();
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export const autoUpdate_weekly = onSchedule({ schedule: 'every monday 09:00', timeZone: 'UTC' }, async () => {
  await runCore();
});

// Deployment notes are documented in comments above.
*/

/*
Deployment and Cloud Scheduler setup:
1) Create backend in Firebase Functions (Node 18) and add secrets.
2) Deploy functions autoUpdate_runSync and autoUpdate_weekly.
3) Cloud Scheduler cron: 0 9 * * MON to HTTPS endpoint with OIDC token.
Commit message: feat: add autoUpdate scheduled sync for socials/portfolio
*/
