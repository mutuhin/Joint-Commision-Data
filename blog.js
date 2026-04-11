(function () {
  const root = document.getElementById("blog-root");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("p");

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function renderList(posts) {
    if (!posts.length) {
      root.innerHTML =
        '<div class="blog-empty">এখনও কোনো পোস্ট নেই। <code>data/blog-posts.json</code> ফাইলে লিখুন।</div>';
      return;
    }

    const cards = posts
      .map(
        (post) => `
      <a class="blog-card" href="blog.html?p=${encodeURIComponent(post.slug)}">
        <div class="blog-card__meta">
          <span><span class="blog-card__meta-dot" aria-hidden="true"></span>${esc(post.date)}</span>${
          post.readMinutes
            ? `<span>${esc(String(post.readMinutes))} মিনিট পড়া</span>`
            : ""
        }
        </div>
        <h2 class="blog-card__title">${esc(post.title)}</h2>
        <p class="blog-card__excerpt">${esc(post.excerpt || "")}</p>
        <div class="blog-card__arrow">পড়ুন →</div>
      </a>
    `
      )
      .join("");

    root.innerHTML = `
      <section class="blog-hero">
        <p class="blog-hero__eyebrow">Journal · খাবারের কথা</p>
        <h1 class="blog-hero__title"><span class="bangla">লেখা ও পুষ্টি</span></h1>
        <p class="blog-hero__lede bangla">অর্গানিক খাবার, পাউডার ও রান্নার ধারণা—নিজের ভাষায়, পরিষ্কারভাবে।</p>
      </section>
      <div class="blog-list">${cards}</div>
    `;
  }

  function renderPost(post) {
    document.title = post.title + " — Dried Depot Blog";
    const metaParts = [formatDate(post.date)];
    if (post.readMinutes) metaParts.push(`${post.readMinutes} মিনিট পড়া`);

    root.innerHTML = `
      <article class="blog-article">
        <a class="blog-article__back" href="blog.html">← সব লেখা</a>
        <p class="blog-article__meta">${metaParts.map(esc).join(" · ")}</p>
        <h1 class="blog-article__title">${esc(post.title)}</h1>
        <div class="blog-article__body">${post.body || ""}</div>
      </article>
    `;
  }

  fetch("data/blog-posts.json")
    .then((r) => {
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    })
    .then((data) => {
      const posts = data.posts || [];
      if (slug) {
        const post = posts.find((p) => p.slug === slug);
        if (!post) {
          root.innerHTML =
            '<div class="blog-article"><p class="blog-empty">পোস্ট পাওয়া যায়নি।</p><a class="blog-article__back" href="blog.html">← ফিরে যান</a></div>';
          return;
        }
        renderPost(post);
      } else {
        renderList(posts);
      }
    })
    .catch(() => {
      root.innerHTML =
        '<div class="blog-empty">ব্লগ লোড করা যায়নি। ইন্টারনেট চেক করুন বা পরে চেষ্টা করুন।</div>';
    });
})();
