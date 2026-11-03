let me = null;
const app = document.getElementById('app');
const nav = document.getElementById('nav');



// ---------- helpers ----------
async function api(url, method = 'GET', data) {
  const isForm = data instanceof FormData;
  const res = await fetch('/api/' + url, {
    method,
    headers: isForm ? {} : { 'Content-Type': 'application/json' },
    body: data ? (isForm ? data : JSON.stringify(data)) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  kids.flat().filter(c => c != null && c !== false).forEach(c => e.append(c));
  return e;
}

// ---------- navbar ----------
function renderNav() {
  nav.replaceChildren(
    el('span', { class: 'brand' }, 'Mini Social'),
    el('div', {},
      me && el('a', { onclick: showFeed }, 'Home'),
      me && el('a', { onclick: () => showProfile(me) }, 'My Profile'),
      me && el('a', { onclick: logout }, 'Logout (' + me + ')')
    )
  );
}

// ---------- auth ----------
function showAuth() {
  renderNav();
  const user = el('input', { placeholder: 'Username' });
  const pass = el('input', { type: 'password', placeholder: 'Password' });
  const err = el('div', { class: 'error' });

  async function submit(path) {
    try {
      const r = await api(path, 'POST', { username: user.value, password: pass.value });
      me = r.username;
      showFeed();
    } catch (e) {
      err.textContent = e.message;
    }
  }

  app.replaceChildren(el('div', { class: 'card' },
    el('h2', {}, 'Welcome'), err, user, pass,
    el('button', { onclick: () => submit('login/') }, 'Login'),
    el('button', { class: 'secondary', onclick: () => submit('register/') }, 'Register')
  ));
}

async function logout() {
  await api('logout/', 'POST');
  me = null;
  showAuth();
}

// ---------- feed ----------
async function showFeed() {
  renderNav();
  const box = el('textarea', { rows: '3', placeholder: "What's on your mind?" });
  const list = el('div');

  const compose = el('div', { class: 'card' }, box,
    el('button', { onclick: async () => {
      if (!box.value.trim()) return;
      await api('posts/create/', 'POST', { content: box.value });
      showFeed();
    } }, 'Post')
  );

  app.replaceChildren(compose, list);
  const { posts } = await api('feed/');
  renderPosts(list, posts);
}

function renderPosts(container, posts) {
  if (!posts.length) container.append(el('div', { class: 'card' }, 'No posts yet.'));
  posts.forEach(p => container.append(postCard(p)));
}

function postCard(p) {
  const likeBtn = el('button', { class: p.liked ? 'liked' : '' }, `♥ ${p.likes}`);
  likeBtn.addEventListener('click', async () => {
    const r = await api(`posts/${p.id}/like/`, 'POST');
    likeBtn.textContent = `♥ ${r.likes}`;
    likeBtn.className = r.liked ? 'liked' : '';
  });

  const commentsBox = el('div');
  let open = false;
  const commentBtn = el('button', { class: 'secondary' }, `Comments (${p.comments})`);

  commentBtn.addEventListener('click', async () => {
    open = !open;
    if (!open) return commentsBox.replaceChildren();

    const { comments } = await api(`posts/${p.id}/comments/`);
    const list = el('div', {}, comments.map(commentRow));
    const input = el('input', { placeholder: 'Write a comment...' });
    const addBtn = el('button', {}, 'Send');

    addBtn.addEventListener('click', async () => {
      if (!input.value.trim()) return;
      const c = await api(`posts/${p.id}/comments/add/`, 'POST', { text: input.value });
      input.value = '';
      list.append(commentRow(c));
      commentBtn.textContent = `Comments (${list.children.length})`;
    });

    commentsBox.replaceChildren(list, input, addBtn);
  });

  return el('div', { class: 'card post' },
    el('div', { class: 'post-head' },
      p.author_avatar
  ? el('img', { class: 'mini-avatar', src: p.author_avatar })
  : el('div', { class: 'mini-avatar' }, p.author[0].toUpperCase()),
      el('div', {},
        el('span', { class: 'author', onclick: () => showProfile(p.author) }, p.author),
        el('div', { class: 'time' }, new Date(p.created_at).toLocaleString())
      )
    ),
    el('div', { class: 'content' }, p.content),
    el('div', { class: 'post-actions' }, likeBtn, commentBtn),
    commentsBox
  );
}

function commentRow(c) {
  return el('div', { class: 'comment' }, el('b', {}, c.author + ': '), c.text);
}

// ---------- profile ----------
async function showProfile(username) {
  renderNav();
  const p = await api(`profile/${username}/`);

  const avatar = p.avatar_url
    ? el('img', { class: 'avatar', src: p.avatar_url })
    : el('div', { class: 'avatar' }, p.username[0].toUpperCase());

  const followInfo = el('div', {}, `${p.followers} followers · ${p.following} following`);
  const head = el('div', { class: 'card' },
    el('div', { class: 'profile-head' }, avatar,
      el('div', {}, el('h2', {}, p.username), followInfo, el('p', {}, p.bio || 'No bio yet.'))
    )
  );

  if (p.username !== me) {
    const fbtn = el('button', {}, p.is_following ? 'Unfollow' : 'Follow');
    fbtn.addEventListener('click', async () => {
      const r = await api(`follow/${p.username}/`, 'POST');
      fbtn.textContent = r.following ? 'Unfollow' : 'Follow';
      followInfo.textContent = `${r.followers} followers · ${p.following} following`;
    });
    head.append(fbtn);
    } else {
    // own profile: hidden edit form
    const bio = el('textarea', { rows: '2', placeholder: 'Bio' });
    bio.value = p.bio;
    const file = el('input', { type: 'file', accept: 'image/*' });

    const form = el('div', { style: 'display:none; margin-top:12px;' },
      bio, file,
      el('button', { onclick: async () => {
        const fd = new FormData();
        fd.append('bio', bio.value);
        if (file.files[0]) fd.append('avatar', file.files[0]);
        await api('profile/update/', 'POST', fd);
        showProfile(me);
      } }, 'Save profile'),
      el('button', { class: 'secondary', onclick: () => {
        form.style.display = 'none';
        editBtn.style.display = '';
      } }, 'Cancel')
    );

    const editBtn = el('button', { onclick: () => {
      form.style.display = 'block';
      editBtn.style.display = 'none';
    } }, 'Edit profile');

    head.append(editBtn, form);
  }

  const list = el('div');
  app.replaceChildren(head, list);
  const { posts } = await api(`users/${username}/posts/`);
  renderPosts(list, posts);
}

// ---------- start ----------
(async function init() {
  try {
    const r = await api('me/');
    me = r.username;
  } catch (e) {
    me = null;
  }
  me ? showFeed() : showAuth();
})();