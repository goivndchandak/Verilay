/* =========================
   Verilay Frontend API Layer
   - Keeps previous structure (external js/api.js)
   - Fixes: getMyStatements/searchNews/getFeed undefined
   - Uses Newsdata.io API for Scan News
   - Fixes link preview showing GitHub by fetching OG tags from source_url
   ========================= */

/* ========= CONFIG (EDIT THESE) ========= */
var BUBBLE = 'https://verilay.bubbleapps.io';      // <-- CHANGE to your Bubble app URL if different
var API_BASE = BUBBLE + '/api/1.1/obj';            // Bubble Data API
var NEWS_API_KEY = 'pub_592aba825f6745448b3744626b1d16d6';                              // <-- Paste your Newsdata.io key here
var NEWS_LANGUAGE = 'en';                           // en/hi etc
/* ====================================== */

/* ---------- Helpers ---------- */
function $(id) { return document.getElementById(id); }

function esc(s) {
  var d = document.createElement('div');
  d.textContent = (s === undefined || s === null) ? '' : String(s);
  return d.innerHTML;
}

function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('user_id'); }
function getUserName() { return localStorage.getItem('username') || 'User'; }

function requireAuth() {
  if (!getToken()) window.location.href = 'login.html';
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

/* Try direct fetch; if blocked by CORS, retry via allorigins */
async function fetchJsonSmart(url, options) {
  try {
    var r = await fetch(url, options);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    // Retry via proxy (works on GitHub Pages)
    var proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    var r2 = await fetch(proxy, options);
    if (!r2.ok) throw new Error('Proxy HTTP ' + r2.status);
    return await r2.json();
  }
}

/* ---------- Bubble: Statements ---------- */

/**
 * Loads statements created by the logged-in user (Created By = user_id).
 * Expects a container with id="stmtBox"
 */
async function getMyStatements() {
  var box = $('stmtBox');
  if (!box) return;

  box.innerHTML = '<div class="loading">Loading...</div>';

  try {
    var uid = getUserId();
    var constraints = encodeURIComponent(JSON.stringify([
      { key: "Created By", constraint_type: "equals", value: uid }
    ]));

    var url = API_BASE + '/statement?constraints=' + constraints + '&sort_field=Created%20Date&descending=true';

    var r = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);

    var data = await r.json();
    var items = (data && data.response && data.response.results) ? data.response.results : [];

    if (!items.length) {
      box.innerHTML = '<div class="empty">No statements yet. Post your first one!</div>';
      return;
    }

    box.innerHTML = items.map(function (s) {
      var reaction = (s.reaction || 'pending').toLowerCase();
      var badgeClass = reaction === 'accepted' ? 'b-accepted'
                    : reaction === 'modified' ? 'b-modified'
                    : reaction === 'denied'   ? 'b-denied'
                    : 'b-pending';

      return (
        '<div class="card">' +
          '<div class="stmt">' + esc(s.statement || '') + '</div>' +
          (s.source_url ? '<a class="source" href="' + s.source_url + '" target="_blank">🔗 Source</a>' : '') +
          '<div class="meta">' +
            '<span class="badge ' + badgeClass + '">' + esc(reaction.toUpperCase()) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="error-msg">Error loading statements</div>';
  }
}

/**
 * Creates a statement (New Post)
 * Expects: textarea#postText, input#postUrl, div#postStatus (optional)
 */
async function submitPost() {
  var textEl = $('postText');
  var urlEl = $('postUrl');
  var statusEl = $('postStatus');

  var statement = textEl ? textEl.value.trim() : '';
  var sourceUrl = urlEl ? urlEl.value.trim() : '';

  if (!statement) {
    if (statusEl) statusEl.innerHTML = '<span style="color:#c62828">Please write a statement.</span>';
    return;
  }

  if (statusEl) statusEl.innerHTML = '<span style="color:#888">Posting...</span>';

  try {
    var r = await fetch(API_BASE + '/statement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify({
        statement: statement,
        source_url: sourceUrl,
        username: getUserName()
      })
    });

    if (!r.ok) throw new Error('HTTP ' + r.status);

    if (statusEl) statusEl.innerHTML = '<span style="color:#2e7d32">✅ Posted!</span>';

    if (textEl) textEl.value = '';
    if (urlEl) urlEl.value = '';

    // refresh statements if on dashboard statements tab
    if ($('stmtBox')) getMyStatements();

    setTimeout(function () { if (statusEl) statusEl.innerHTML = ''; }, 1800);

  } catch (e) {
    console.error(e);
    if (statusEl) statusEl.innerHTML = '<span style="color:#c62828">Error posting.</span>';
  }
}

/* ---------- Feed ---------- */

/**
 * Public feed: loads latest statements
 * Expects a container with id="feedBox"
 */
async function getFeed() {
  var box = $('feedBox');
  if (!box) return;

  box.innerHTML = '<div class="loading">Loading...</div>';

  try {
    // Public list; if your Bubble privacy rules require auth, this still supports token if present
    var headers = {};
    if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();

    var url = API_BASE + '/statement?sort_field=Created%20Date&descending=true&limit=50';

    var r = await fetch(url, { headers: headers });
    if (!r.ok) throw new Error('HTTP ' + r.status);

    var data = await r.json();
    var items = (data && data.response && data.response.results) ? data.response.results : [];

    if (!items.length) {
      box.innerHTML = '<div class="empty">No posts yet.</div>';
      return;
    }

    box.innerHTML = '';
    items.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'feed-card';

      var prefix = s.reaction ? ('<span class="prefix">' + esc(s.reaction.toUpperCase()) + ':</span> ') : '';
      var previewId = 'pv_' + s._id;

      card.innerHTML =
        '<div class="feed-user">' + esc(s.username || 'Anonymous') + '</div>' +
        '<div class="feed-stmt">' + prefix + esc(s.statement || '') + '</div>' +
        '<div id="' + previewId + '"></div>' +
        (s.source_url ? '<a class="source" href="' + s.source_url + '" target="_blank">🔗 Source</a>' : '') +
        '<div class="reactions">' +
          '<button class="react-btn accept" onclick="react(\'' + s._id + '\',\'accepted\',this)">✅ Accept</button>' +
          '<button class="react-btn modify" onclick="react(\'' + s._id + '\',\'modified\',this)">✏️ Modify</button>' +
          '<button class="react-btn deny" onclick="react(\'' + s._id + '\',\'denied\',this)">❌ Deny</button>' +
        '</div>';

      box.appendChild(card);

      // Real preview for the actual news URL (NOT GitHub)
      if (s.source_url) fetchPreview(s.source_url, previewId);
    });

  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="error-msg">Error loading feed</div>';
  }
}

/**
 * Reaction PATCH
 */
async function react(statementId, reaction, btn) {
  try {
    var r = await fetch(API_BASE + '/statement/' + statementId, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify({ reaction: reaction })
    });

    if (!r.ok) throw new Error('HTTP ' + r.status);

    // Replace buttons with label
    if (btn && btn.parentElement) {
      btn.parentElement.innerHTML =
        '<div class="reacted-label">This is marked ' + esc(reaction.toUpperCase()) + '</div>';
    }
  } catch (e) {
    console.error(e);
    alert('Reaction failed. Check login/token & Bubble privacy rules.');
  }
}

/* ---------- Scan News (Newsdata.io) ---------- */

var savedArticles = [];

/**
 * News search using Newsdata.io
 * Expects: input#newsQ, div#newsResults, div#newsErr (optional)
 */
async function searchNews() {
  var qEl = $('newsQ');
  var resEl = $('newsResults');
  var errEl = $('newsErr');

  var q = qEl ? qEl.value.trim() : '';
  if (!q) {
    if (errEl) errEl.innerHTML = '<span style="color:#c62828">Enter a topic</span>';
    return;
  }
  if (!NEWS_API_KEY) {
    if (errEl) errEl.innerHTML = '<span style="color:#c62828">Add Newsdata API key in js/api.js</span>';
    return;
  }

  if (errEl) errEl.innerHTML = '';
  if (resEl) resEl.innerHTML = '<div class="loading">Searching...</div>';

  try {
    var url =
      'https://newsdata.io/api/1/news' +
      '?apikey=' + encodeURIComponent(NEWS_API_KEY) +
      '&q=' + encodeURIComponent(q) +
      '&language=' + encodeURIComponent(NEWS_LANGUAGE);

    var data = await fetchJsonSmart(url);

    savedArticles = (data && data.results) ? data.results : [];

    if (!savedArticles.length) {
      if (resEl) resEl.innerHTML = '<div class="empty">No news found</div>';
      return;
    }

    if (!resEl) return;

    resEl.innerHTML = savedArticles.slice(0, 15).map(function (a, i) {
      var title = a.title || '';
      var desc  = a.description || a.content || '';
      var img   = a.image_url || '';
      var link  = a.link || '';
      var src   = a.source_id || (a.creator && a.creator[0]) || '';

      return (
        '<div class="ncard">' +
          (img ? '<img src="' + img + '" onerror="this.style.display=\'none\'">' : '') +
          '<div class="nbody">' +
            '<div class="ntitle">' + esc(title) + '</div>' +
            (desc ? '<div class="ndesc">' + esc(desc) + '</div>' : '') +
            (src ? '<div class="nsrc">' + esc(src) + '</div>' : '') +
            (link ? '<a class="nlink" href="' + link + '" target="_blank">Read ↗</a>' : '') +
            '<button class="npost-btn" onclick="postFromNews(' + i + ')">Post to Verilay</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

  } catch (e) {
    console.error(e);
    if (resEl) resEl.innerHTML = '';
    if (errEl) errEl.innerHTML = '<span style="color:#c62828">Search failed</span>';
  }
}

/**
 * Fills New Post with selected news item
 * Expects: textarea#postText, input#postUrl
 */
function postFromNews(i) {
  var a = savedArticles[i];
  if (!a) return;

  var title = a.title || '';
  var link = a.link || '';

  if ($('postText')) $('postText').value = title;
  if ($('postUrl')) $('postUrl').value = link;

  // If dashboard has tabs, try switching to New Post
  if (typeof switchTab === 'function') switchTab('newpost');
}

/* ---------- OG Link Preview (Fix GitHub preview issue) ---------- */

/**
 * Fetch OG tags from the ACTUAL page HTML using allorigins (CORS-safe)
 * Renders a card into containerId
 */
async function fetchPreview(url, containerId) {
  try {
    // Use allorigins to get raw HTML
    var proxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
    var r = await fetch(proxy);
    if (!r.ok) return;

    var j = await r.json();
