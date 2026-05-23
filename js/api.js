// ============================================================
// VERILAY - API LAYER (api.js)
// ============================================================
// REPLACE NEWS_API_KEY with your actual NewsData.io key
// ============================================================

var API_BASE  = "https://verilay-88625.bubbleapps.io/api/1.1/wf";
var DATA_BASE = "https://verilay-88625.bubbleapps.io/api/1.1/obj";
var NEWS_API_KEY = "pub_592aba825f6745448b3744626b1d16d6";

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
    body: JSON.stringify({ email: email, password: password })
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
// NEWS (NewsData.io)
// ============================================================

async function searchNews(query) {
  var url = "https://newsdata.io/api/1/news"
    + "?apikey=" + NEWS_API_KEY
    + "&q=" + encodeURIComponent(query)
    + "&language=en";
  try {
    var res = await fetch(url);
    var data = await res.json();
    var articles = [];
    if (data.results && data.results.length > 0) {
      for (var i = 0; i < data.results.length; i++) {
        var item = data.results[i];
        articles.push({
          title: item.title || "",
          description: item.description || "",
          url: item.link || "",
          image: item.image_url || ""
        });
      }
    }
    return { articles: articles };
  } catch (err) {
    console.error("News API error:", err);
    return { articles: [] };
  }
}

// ============================================================
// END OF API LAYER
// ============================================================
