// ============================================================
// VERILAY - API LAYER (api.js)
// ============================================================
// MULTI-SOURCE NEWS ENGINE (4 FREE SOURCES)
// ============================================================

var API_BASE  = "httpsheaders: authHeaders(),var API_BASE  = "https://verilay-88625.bubbleapps.io/api/1.1/wf";
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
// ✅ MULTI-SOURCE NEWS ENGINE (4 FREE SOURCES)
// ============================================================

// ---------- SOURCE 1: NewsData.io ----------
async function searchNewsData(query) {
  try {
    var url = "https://newsdata.io/api/1/news"
      + "?apikey=" + NEWS_API_KEY
      + "&q=" + encodeURIComponent(query)
      + "&language=en";
    var res = await fetch(url);
    var data = await res.json();
    return (data.results || []).map(function(item) {
      return {
        title: item.title || "",
        description: item.description || "",
        url: item.link || "",
        image: item.image_url || "",
        source: item.source_id || "NewsData",
        date: item.pubDate || ""
      };
    });
  } catch (e) {
    console.error("NewsData error:", e);
    return [];
  }
}

// ---------- SOURCE 2: GNews.io ----------
async function searchGNews(query) {
  try {
    var url = "https://gnews.io/api/v4/search"
      + "?q=" + encodeURIComponent(query)
      + "&lang=en"
      + "&max=10"
      + "&apikey=" + GNEWS_KEY;
    var res = await fetch(url);
    var data = await res.json();
    return (data.articles || []).map(function(item) {
      return {
        title: item.title || "",
        description: item.description || "",
        url: item.url || "",
        image: item.image || "",
        source: (item.source && item.source.name) || "GNews",
        date: item.publishedAt || ""
      };
    });
  } catch (e) {
    console.error("GNews error:", e);
    return [];
  }
}

// ---------- SOURCE 3: Google News RSS (FREE UNLIMITED) ----------
async function searchGoogleNews(query) {
  try {
    var rssUrl = "https://news.google.com/rss/search?q="
      + encodeURIComponent(query)
      + "&hl=en-IN&gl=IN&ceid=IN:en";
    var proxyUrl = "https://api.rss2json.com/v1/api.json?rss_url="
      + encodeURIComponent(rssUrl);
    var res = await fetch(proxyUrl);
    var data = await res.json();
    return (data.items || []).map(function(item) {
      return {
        title: item.title || "",
        description: (item.description || "").replace(/<[^>]*>/g, "").substring(0, 200),
        url: item.link || "",
        image: item.thumbnail || "",
        source: "Google News",
        date: item.pubDate || ""
      };
    });
  } catch (e) {
    console.error("Google News error:", e);
    return [];
  }
}

// ---------- SOURCE 4: Reddit (FREE NO KEY NEEDED) ----------
async function searchReddit(query) {
  try {
    var url = "https://www.reddit.com/search.json"
      + "?q=" + encodeURIComponent(query)
      + "&sort=new"
      + "&limit=10"
      + "&t=month";
    var res = await fetch(url);
    var data = await res.json();
    var posts = (data.data && data.data.children) || [];
    return posts.map(function(child) {
      var p = child.data || {};
      return {
        title: p.title || "",
        description: (p.selftext || "").substring(0, 200),
        url: p.url_overridden_by_dest || ("https://reddit.com" + (p.permalink || "")),
        image: (p.thumbnail && p.thumbnail.startsWith("http")) ? p.thumbnail : "",
        source: "Reddit · r/" + (p.subreddit || ""),
        date: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : ""
      };
    });
  } catch (e) {
    console.error("Reddit error:", e);
    return [];
  }
}

// ============================================================
// ✅ MASTER: Merge + Deduplicate + Sort All Sources
// ============================================================

async function searchNews(query) {

  // Fire all 4 sources at once (parallel)
  var results = await Promise.all([
    searchNewsData(query),
    searchGNews(query),
    searchGoogleNews(query),
    searchReddit(query)
  ]);

  // Flatten all results
  var all = [];
  for (var i = 0; i < results.length; i++) {
    all = all.concat(results[i]);
  }

  // Deduplicate by title (first 50 chars)
  var seen = {};
  var unique = [];
  for (var j = 0; j < all.length; j++) {
    var item = all[j];
    if (!item.title) continue;
    var key = item.title.toLowerCase().substring(0, 50).trim();
    if (!seen[key]) {
      seen[key] = true;
      unique.push(item);
    }
  }

  // Sort newest first
  unique.sort(function(a, b) {
    var da = a.date ? new Date(a.date).getTime() : 0;
    var db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  // Return in same format dashboard expects
  return { articles: unique };
}

// ============================================================
// END OF API LAYER
// ============================================================
var DATA_BASE = "https://verilay-88625.bubbleapps.io/api/1.1/obj";

// NEWS API KEYS
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
    body: JSON.stringify({ email: email, password: password, full_name: "", username: "", bio: "", linkedin_url: "", instagram_url: "", twitter_url: "" })
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
