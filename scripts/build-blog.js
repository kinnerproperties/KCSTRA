// Generates the blog from markdown files in content/posts/.
// Output: blog/index.html (post list) and blog/<slug>/index.html (articles).
// Run automatically by Vercel on deploy (see vercel.json), or locally: npm run build
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'blog');

const SHARED_CSS = `
  :root {
    --navy: #1B3A5C; --navy-dark: #0f2235; --sky: #4BA3D4; --sky-light: #7ec4eb;
    --sky-pale: #e8f4fb; --white: #f8f9fa; --off-white: #f0f4f8;
    --text: #2c3e50; --text-light: #5a6c7d;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; color: var(--text); background: var(--white); line-height: 1.7; }
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(15, 34, 53, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    padding: 0 2.5rem; display: flex; align-items: center; justify-content: space-between;
    height: 70px; border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .nav-logo { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; }
  .nav-logo img { height: 44px; }
  .nav-logo span { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; color: #fff; letter-spacing: 2px; }
  .nav-links { display: flex; list-style: none; gap: 1.8rem; align-items: center; }
  .nav-links a { color: rgba(255,255,255,0.85); text-decoration: none; font-size: 0.92rem; font-weight: 500; }
  .nav-links a:hover { color: #fff; }
  main { max-width: 760px; margin: 0 auto; padding: 120px 1.5rem 4rem; }
  .blog-eyebrow { font-family: 'Bebas Neue', sans-serif; letter-spacing: 3px; color: var(--sky); font-size: 1.1rem; }
  h1 { font-family: 'Playfair Display', serif; color: var(--navy); font-size: 2.4rem; line-height: 1.2; margin: 0.4rem 0 0.6rem; }
  .post-meta { color: var(--text-light); font-size: 0.92rem; margin-bottom: 2rem; }
  .post-body h2 { font-family: 'Playfair Display', serif; color: var(--navy); margin: 2rem 0 0.8rem; font-size: 1.5rem; }
  .post-body h3 { color: var(--navy); margin: 1.6rem 0 0.6rem; }
  .post-body p, .post-body ul, .post-body ol { margin-bottom: 1.1rem; }
  .post-body ul, .post-body ol { padding-left: 1.4rem; }
  .post-body a { color: var(--sky); font-weight: 600; }
  .post-body img { max-width: 100%; border-radius: 10px; margin: 1rem 0; }
  .post-body blockquote { border-left: 4px solid var(--sky); padding: 0.4rem 1.2rem; background: var(--sky-pale); border-radius: 0 8px 8px 0; margin-bottom: 1.1rem; }
  .post-card { display: block; text-decoration: none; color: inherit; background: #fff; border: 1px solid #e3e9ef; border-radius: 14px; padding: 1.8rem; margin-bottom: 1.4rem; transition: box-shadow .2s, transform .2s; }
  .post-card:hover { box-shadow: 0 10px 30px rgba(27,58,92,0.12); transform: translateY(-2px); }
  .post-card h2 { font-family: 'Playfair Display', serif; color: var(--navy); font-size: 1.4rem; margin-bottom: 0.3rem; }
  .post-card .post-meta { margin-bottom: 0.6rem; }
  .post-card p { color: var(--text-light); }
  .back-link { display: inline-block; margin-top: 2.5rem; color: var(--sky); text-decoration: none; font-weight: 600; }
  footer { background: var(--navy-dark); color: rgba(255,255,255,0.7); text-align: center; padding: 2rem 1.5rem; font-size: 0.9rem; }
  footer a { color: var(--sky-light); text-decoration: none; }
  @media (max-width: 640px) { .nav-links { gap: 1rem; } h1 { font-size: 1.9rem; } nav { padding: 0 1.2rem; } }
`;

function page({ title, description, body, url }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — KCSTRA</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://kcstra.com${url}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>${SHARED_CSS}</style>
</head>
<body>
  <nav>
    <a href="/" class="nav-logo">
      <img src="/KCSTRA Logo.png" alt="KCSTRA">
      <span>KCSTRA</span>
    </a>
    <ul class="nav-links">
      <li><a href="/#mission">Mission</a></li>
      <li><a href="/#board">Board</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/#contact">Get Involved</a></li>
    </ul>
  </nav>
  <main>
${body}
  </main>
  <footer>
    <p>&copy; ${new Date().getFullYear()} Kansas City Short Term Rental Alliance. All rights reserved.</p>
    <p style="margin-top:0.5rem;"><a href="mailto:KCSTRA.info@gmail.com">KCSTRA.info@gmail.com</a></p>
  </footer>
</body>
</html>
`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Read and parse all posts
const posts = fs.existsSync(POSTS_DIR)
  ? fs.readdirSync(POSTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const { data, content } = matter(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
        const slug = f.replace(/\.md$/, '');
        if (!data.title || !data.date) throw new Error(`Post ${f} is missing a title or date in its frontmatter`);
        return { slug, title: data.title, date: (data.date instanceof Date ? data.date.toISOString() : String(data.date)).slice(0, 10), author: data.author || 'KCSTRA', description: data.description || '', html: marked.parse(content) };
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  : [];

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// Article pages
for (const p of posts) {
  const body = `    <p class="blog-eyebrow">KCSTRA Blog</p>
    <h1>${escapeHtml(p.title)}</h1>
    <p class="post-meta">${formatDate(p.date)} · ${escapeHtml(p.author)}</p>
    <div class="post-body">${p.html}</div>
    <a class="back-link" href="/blog/">&larr; Back to all posts</a>`;
  fs.mkdirSync(path.join(OUT_DIR, p.slug), { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, p.slug, 'index.html'),
    page({ title: p.title, description: p.description || p.title, body, url: `/blog/${p.slug}/` })
  );
}

// Blog index
const cards = posts
  .map(
    (p) => `    <a class="post-card" href="/blog/${p.slug}/">
      <h2>${escapeHtml(p.title)}</h2>
      <p class="post-meta">${formatDate(p.date)} · ${escapeHtml(p.author)}</p>
      <p>${escapeHtml(p.description)}</p>
    </a>`
  )
  .join('\n');
const indexBody = `    <p class="blog-eyebrow">KCSTRA Blog</p>
    <h1>News &amp; Updates</h1>
    <p class="post-meta">Regulation updates, meeting recaps, and hosting tips from the KC short-term rental community.</p>
${cards || '    <p>No posts yet — check back soon!</p>'}`;
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), page({ title: 'Blog', description: 'News and updates from the Kansas City Short Term Rental Alliance.', body: indexBody, url: '/blog/' }));

// Feed for the homepage "Latest from the Blog" section
fs.writeFileSync(
  path.join(OUT_DIR, 'posts.json'),
  JSON.stringify(posts.slice(0, 3).map(({ slug, title, date, author, description }) => ({ slug, title, date: formatDate(date), author, description })))
);

console.log(`Built ${posts.length} post(s) into blog/`);
