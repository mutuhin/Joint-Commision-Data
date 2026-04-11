(function () {
  const $ = (id) => document.getElementById(id);

  let posts = [];

  const statusEl = $("load-status");
  const msgEl = $("admin-msg");
  const afterEl = $("after-generate");
  const jsonOutEl = $("json-output");

  function showMsg(text, type) {
    if (!text) {
      msgEl.textContent = "";
      msgEl.className = "admin-msg";
      msgEl.style.display = "none";
      return;
    }
    msgEl.style.display = "block";
    msgEl.textContent = text;
    msgEl.className = "admin-msg is-" + (type || "ok");
  }

  function slugify(input) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function plainToHtml(text) {
    const chunks = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!chunks.length) return "";
    return chunks
      .map((chunk, i) => {
        const trimmed = chunk.trim();
        const firstLine = trimmed.split(/\r?\n/)[0];
        if (/^##\s+/.test(firstLine)) {
          const afterHash = trimmed.replace(/^##\s+/, "").trim();
          const lines = afterHash.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          if (!lines.length) return "";
          const title = escapeHtml(lines[0]);
          const more = lines.slice(1);
          let html = `<h3 class="blog-section-heading">${title}</h3>`;
          if (more.length) {
            html += `<p>${more.map((l) => escapeHtml(l)).join("<br>")}</p>`;
          }
          return html;
        }
        const inner = trimmed
          .split(/\r?\n/)
          .map((line) => escapeHtml(line))
          .join("<br>");
        return i === 0
          ? `<p class="blog-lead">${inner}</p>`
          : `<p>${inner}</p>`;
      })
      .join("");
  }

  function setDefaults() {
    const d = new Date();
    $("field-date").value = d.toISOString().slice(0, 10);
  }

  function applyPosts(data) {
    if (!data || !Array.isArray(data.posts)) {
      throw new Error("ফাইলে posts অ্যারে নেই।");
    }
    posts = data.posts;
    statusEl.textContent = `${posts.length} টি পোস্ট লোড হয়েছে। নতুন যোগ করলে সবার উপরে বসবে।`;
    showMsg("");
  }

  async function tryFetchExisting() {
    try {
      const r = await fetch("data/blog-posts.json", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      applyPosts(data);
    } catch {
      statusEl.textContent =
        "অটো লোড হয়নি (লোকাল ফাইল খুললে এমন হতে পারে)। নিচে বর্তমান JSON ফাইল আপলোড করুন।";
    }
  }

  $("file-existing").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        applyPosts(data);
        showMsg("ফাইল ঠিক আছে।", "ok");
      } catch (err) {
        showMsg("JSON পার্স করা যায়নি: " + err.message, "error");
      }
    };
    reader.readAsText(file, "UTF-8");
  });

  $("btn-download").addEventListener("click", () => {
    showMsg("");
    const slugRaw = $("field-slug").value.trim();
    const title = $("field-title").value.trim();
    const date = $("field-date").value.trim();
    const readMinutes = parseInt($("field-read").value, 10);
    const excerpt = $("field-excerpt").value.trim();
    let body = $("field-body").value.trim();

    if (!title) {
      showMsg("শিরোনাম লিখুন।", "error");
      return;
    }
    const slug = slugRaw || slugify(title);
    if (!slug) {
      showMsg("slug লিখুন (ইংরেজি ছোট হাতের অক্ষর, হাইফেন)।", "error");
      return;
    }
    if (posts.some((p) => p.slug === slug)) {
      showMsg(
        "এই slug আগে আছে। অন্য slug দিন বা JSON থেকে পুরনোটি মুছে আবার লোড করুন।",
        "error"
      );
      return;
    }
    if (!date) {
      showMsg("তারিখ দিন।", "error");
      return;
    }

    if ($("plain-mode").checked) {
      body = plainToHtml(body);
    }
    if (!body) {
      showMsg("লেখার ভিতর (body) দিন।", "error");
      return;
    }

    const newPost = {
      slug,
      title,
      date,
      excerpt: excerpt || title.slice(0, 120),
      body,
    };
    if (Number.isFinite(readMinutes) && readMinutes > 0) {
      newPost.readMinutes = readMinutes;
    }

    const out = { posts: [newPost, ...posts] };
    const json = JSON.stringify(out, null, 2);

    posts = out.posts;
    jsonOutEl.value = json;
    afterEl.hidden = false;
    afterEl.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "blog-posts.json";
    a.click();
    URL.revokeObjectURL(a.href);

    showMsg(
      "ডাউনলোড হয়েছে। উপরের ধাপ অনুসারে কপি করে GitHub-ে কমিট করুন — অথবা আবার ফর্ম পূরণ করে আরেকটি পোস্ট যোগ করতে পারবেন।",
      "ok"
    );
  });

  $("btn-copy-json").addEventListener("click", async () => {
    const text = jsonOutEl.value;
    if (!text) {
      showMsg("আগে ফর্ম থেকে JSON তৈরি করুন।", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showMsg("ক্লিপবোর্ডে কপি হয়েছে। এখন GitHub লিংকে গিয়ে পেস্ট করুন।", "ok");
    } catch {
      jsonOutEl.focus();
      jsonOutEl.select();
      showMsg("অটো কপি হয়নি — টেক্সটবক্স সিলেক্ট করে ম্যানুয়াল কপি করুন (Cmd/Ctrl+C)।", "ok");
    }
  });

  setDefaults();
  tryFetchExisting();
})();
