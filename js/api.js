// ============================================================
// VERILAY - API LAYER (api.js)
// ============================================================
// MULTI-SOURCE NEWS ENGINE (4 FREE SOURCES)
// ============================================================

var API_BASE  = "https://verilay-88625.bubbleapps.io/api/1.1/wf";
var DATA_BASE = "https://verilay-88625.bubbleapps.io/api/1.1/obj";
var NEWS_API_KEY = "pub_592aba825f6745448b3744626b1d16d6";
var GNEWS_KEY    = "aafbad8acd6c6d4afc216e9705652a61";

// ============================================================
// HELPERS
// ============================================================

function getToken() {
  return localStorage.getItem("token") || "";
}

function getUserId() {
  return localStorage.getItem("user_id") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getToken()
  };
}

async function handleResponse(res) {
  var data;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error("Request failed with status " + res.status);
    return {};
  }
  if (!res.ok) {
    var msg = "";
    if (data && data.body && data.body.message) msg = data.body.message;
    else if (data && data.message) msg = data.message;
    else if (data && data.statusMessage) msg = data.statusMessage;
    else msg = "Request failed (" + res.status + ")";
    throw new Error(msg);
  }
  return data;
}

// ============================================================
// AUTH
// ============================================================

async function signup(email, password) {
  var res = await fetch(API_BASE + "/signup_user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      password: password,
      full_name: "",
      username: "",
      bio: "",
      linkedin_url: "",
      instagram_url: "",
      twitter_url: ""
    })
  });
  return handleResponse(res);
}

async function login(email, password) {
  var res = await fetch(API_BASE + "/login_user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: password })
  });
  var data = await handleResponse(res);
  if (data.response && data.response.token) {
    localStorage.setItem("token", data.response.token);
  }
  if (data.response && data.response.user_id) {
    localStorage.setItem("user_id", data.response.user_id);
  }
  return data;
}

// ============================================================
// PROFILE
// ============================================================

async function getProfile() {
  var userId = getUserId();
  var res = await fetch(DATA_BASE + "/User/" + userId, {
    method: "GET",
    headers: authHeaders()
  });
  return handleResponse(res);
}

async function updateProfile(profileData) {
  var userId = getUserId();
  var res = await fetch(DATA_BASE + "/User/" + userId, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(profileData)
  });
  return handleResponse(res);
}

// ============================================================
// STATEMENTS (Bubble type: TruthStatement)
// ============================================================

async function getMyStatements() {
  var userId = getUserId();
  var constraints = JSON.stringify([
    { key: "Created By", constraint_type: "equals", value: userId }
  ]);
  var url = DATA_BASE + "/TruthStatement"
    + "?constraints=" + encodeURIComponent(constraints)
    + "&sort_field=Created+Date"
    + "&descending=true";
  var res = await fetch(url, {
    method: "GET",
    headers: authHeaders()
  });
  var data = await handleResponse(res);
  if (data.response && data.response.results) {
    data.response.statements = data.response.results;
  }
  return data;
}

async function addStatement(text, sourceUrl) {
  var body = { text: text, source_url: sourceUrl || "" };
  var res = await fetch(API_BASE + "/add_statement", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  return handleResponse(res);
}

async function reactStatement(statementId, action) {
  var res = await fetch(API_BASE + "/react_statement", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      statement_id: statementId,
      reaction_type: action
    })
  });
  return handleResponse(res);
}

// ============================================================
// FEED (All statements - Bubble type: TruthStatement)
// ============================================================

async function getFeed() {
  var url = DATA_BASE + "/TruthStatement"
    + "?sort_field=Created+Date"
    + "&descending=true"
    + "&limit=50";
  var res = await fetch(url, {
    method: "GET",
    headers: authHeaders()
  });
  var data = await handleResponse(res);
  if (data.response && data.response.results) {
    data.response.statements = data.response.results;
  }
  return data;
}

// ============================================================
// FOLLOW / UNFOLLOW (Bubble type: Follow)
// ============================================================

async function getFollowing() {
  var userId = getUserId();
  var constraints = JSON.stringify([
    { key: "follower", constraint_type: "equals", value: userId }
  ]);
  var url = DATA_BASE + "/Follow"
    + "?constraints=" + encodeURIComponent(constraints);
  var res = await fetch(url, {
    method: "GET",
    headers: authHeaders()
  });
  return handleResponse(res);
}

async function followUser(targetUserId) {
  var res = await fetch(API_BASE + "/follow_user", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ user_id: targetUserId })
  });
  return handleResponse(res);
}

async function unfollowUser(followId) {
  var res = await fetch(DATA_BASE + "/Follow/" + followId, {
    method: "DELETE",
    headers: authHeaders()
  });
  return handleResponse(res);
}

// ============================================================
// SEARCH USERS (Bubble type: User)
// ============================================================

async function searchUsers(query) {
  var constraints = JSON.stringify([
    { key: "full_name", constraint_type: "text contains", value: query }
  ]);
  var url = DATA_BASE + "/User"
    + "?constraints=" + encodeURIComponent(constraints)
    + "&limit=20";
  var res = await fetch(url, {
    method: "GET",
    headers: authHeaders()
  });
  return handleResponse(res);
}

// ============================================================
// ✅ MULTI-SOURCE NEWS (4 FREE SOURCES)
// ============================================================

// SOURCE 1: NewsData.io
async function _newsdata(query) {
  try {
    var url = "https://newsdata.io/api/1/news"
      + "?apikey=" + NEWS_API_KEY
      + "&q=" + encodeURIComponent(query)
      + "&language=en";
    var res = await fetch(url);
    var data = await res.json();
    var out = [];
    var list = data.results || [];
    for (var i = 0; i < list.length; i++) {
      out.push({
        title: list[i].title || "",
        description: list[i].description || "",
        url: list[i].link || "",
        image: list[i].image_url || "",
        source: list[i].source_id || "NewsData",
        date: list[i].pubDate || ""
      });
    }
    return out;
  } catch (e) {
    console.error("NewsData err:", e);
    return [];
  }
}

// SOURCE 2: GNews.io
async function _gnews(query) {
  try {
    var url = "https://gnews.io/api/v4/search"
      + "?q=" + encodeURIComponent(query)
      + "&lang=en"
      + "&max=10"
      + "&apikey=" + GNEWS_KEY;
    var res = await fetch(url);
    var data = await res.json();
    var out = [];
    var list = data.articles || [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      out.push({
        title: a.title || "",
        description: a.description || "",
        url: a.url || "",
        image: a.image || "",
        source: (a.source && a.source.name) ? a.source.name : "GNews",
        date: a.publishedAt || ""
      });
    }
    return out;
  } catch (e) {
    console.error("GNews err:", e);
    return [];
  }
}

// SOURCE 3: Google News RSS (FREE UNLIMITED)
async function _googlenews(query) {
  try {
    var rssUrl = "https://news.google.com/rss/search?q="
      + encodeURIComponent(query)
      + "&hl=en-IN&gl=IN&ceid=IN:en";
    var proxyUrl = "https://api.rss2json.com/v1/api.json?rss_url="
      + encodeURIComponent(rssUrl);
    var res = await fetch(proxyUrl);
    var data = await res.json();
    var out = [];
    var list = data.items || [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var desc = (item.description || "").replace(/<[^>]*>/g, "");
      if (desc.length > 200) desc = desc.substring(0, 200);
      out.push({
        title: item.title || "",
        description: desc,
        url: item.link || "",
        image: item.thumbnail || "",
        source: "Google News",
        date: item.pubDate || ""
      });
    }
    return out;
  } catch (e) {
    console.error("Google News err:", e);
    return [];
  }
}

// SOURCE 4: Reddit (FREE NO KEY)
async function _reddit(query) {
  try {
    var url = "https://www.reddit.com/search.json"
      + "?q=" + encodeURIComponent(query)
      + "&sort=new"
      + "&limit=10"
      + "&t=month";
    var res = await fetch(url);
    var data = await res.json();
    var out = [];
    var children = (data.data && data.data.children) ? data.data.children : [];
    for (var i = 0; i < children.length; i++) {
      var p = children[i].data || {};
      var thumb = (p.thumbnail && p.thumbnail.indexOf("http") === 0) ? p.thumbnail : "";
      var purl = p.url_overridden_by_dest || ("https://reddit.com" + (p.permalink || ""));
      var pdate = p.created_utc ? new Date(p.created_utc * 1000).toISOString() : "";
      var pdesc = (p.selftext || "");
      if (pdesc.length > 200) pdesc = pdesc.substring(0, 200);
      out.push({
        title: p.title || "",
        description: pdesc,
        url: purl,
        image: thumb,
        source: "Reddit",
        date: pdate
      });
    }
    return out;
  } catch (e) {
    console.error("Reddit err:", e);
    return [];
  }
}

// ============================================================
// ✅ MASTER: searchNews() — Merge + Deduplicate + Sort
// ============================================================

async function searchNews(query) {
  var r = await Promise.all([
    _newsdata(query),
    _gnews(query),
    _googlenews(query),
    _reddit(query)
  ]);

  var all = [];
  for (var i = 0; i < r.length; i++) {
    for (var j = 0; j < r[i].length; j++) {
      all.push(r[i][j]);
    }
  }

  var seen = {};
  var unique = [];
  for (var k = 0; k < all.length; k++) {
    if (!all[k].title) continue;
    var key = all[k].title.toLowerCase().substring(0, 50).trim();
    if (!seen[key]) {
      seen[key] = true;
      unique.push(all[k]);
    }
  }

  unique.sort(function(a, b) {
    var da = a.date ? new Date(a.date).getTime() : 0;
    var db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return { articles: unique };
}

// ============================================================
// END OF API LAYER
// ============================================================
