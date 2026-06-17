// ============================================================
// VERILAY — Frontend API Layer (api.js) v2
// Connects verilay_app_v2.html to FastAPI backend
// ============================================================

const API = (() => {
    const BASE = "https://verilay-backend.onrender.com/api";
    let currentUser = JSON.parse(localStorage.getItem("verilay_user") || "null");

    // ============================================================
    // HELPERS
    // ============================================================

    function getInitials(name) {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function getAvatarColor(name) {
        const colors = [
            "linear-gradient(135deg,#FF9933,#FF6B00)",
            "linear-gradient(135deg,#2563EB,#1E40AF)",
            "linear-gradient(135deg,#6366F1,#4338CA)",
            "linear-gradient(135deg,#059669,#047857)",
            "linear-gradient(135deg,#DC2626,#991B1B)",
            "linear-gradient(135deg,#7C3AED,#5B21B6)",
            "linear-gradient(135deg,#DB2777,#9D174D)",
            "linear-gradient(135deg,#0891B2,#0E7490)",
        ];
        let hash = 0;
        for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }

    function timeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    }

    function formatNumber(n) {
        if (!n) return "0";
        if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
        if (n >= 1000) return (n / 1000).toFixed(1) + "K";
        return n.toString();
    }

    // ============================================================
    // HTTP HELPERS
    // ============================================================

    function getHeaders() {
        const h = { "Content-Type": "application/json" };
        const token = localStorage.getItem("verilay_token");
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
    }

    async function apiGet(path) {
        const res = await fetch(`${BASE}${path}`, { headers: getHeaders() });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`); }
        return await res.json();
    }

    async function apiPost(path, body = {}) {
        const res = await fetch(`${BASE}${path}`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`); }
        return await res.json();
    }

    async function apiPut(path, body = {}) {
        const res = await fetch(`${BASE}${path}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`); }
        return await res.json();
    }

    async function apiDelete(path) {
        const res = await fetch(`${BASE}${path}`, { method: "DELETE", headers: getHeaders() });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `HTTP ${res.status}`); }
        return await res.json();
    }

    // ============================================================
    // AUTH MODULE
    // ============================================================

    function isLoggedIn() { return !!localStorage.getItem("verilay_token"); }

    function saveToken(token, user) {
        localStorage.setItem("verilay_token", token);
        localStorage.setItem("verilay_user", JSON.stringify(user));
        currentUser = user;
    }

    function logout() {
        localStorage.removeItem("verilay_token");
        localStorage.removeItem("verilay_user");
        currentUser = null;
        showLoginScreen();
    }

    function getUser() { return currentUser; }

    function showLoginScreen() {
        const existing = document.getElementById("verilay-auth-overlay");
        if (existing) existing.remove();
        const overlay = document.createElement("div");
        overlay.id = "verilay-auth-overlay";
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,22,40,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;`;
        overlay.innerHTML = `
            <div style="background:white;border-radius:20px;padding:32px;width:90%;max-width:380px;text-align:center;">
                <div style="font-family:'DM Serif Display',serif;font-size:28px;color:#0A1628;margin-bottom:4px;">Veri<span style="color:#FF9933;">lay</span></div>
                <p style="font-size:13px;color:#9CA3AF;margin-bottom:24px;">The Layer of Truth the Internet Needs</p>
                <div id="auth-step-1">
                    <input id="auth-email" type="email" placeholder="Enter your email" style="width:100%;padding:14px 16px;border-radius:100px;border:1.5px solid #E2E5E9;font-size:15px;font-family:'Inter',sans-serif;outline:none;margin-bottom:12px;box-sizing:border-box;" />
                    <button onclick="API.auth.handleSendOTP()" style="width:100%;padding:14px;border-radius:100px;background:#FF9933;color:white;font-size:14px;font-weight:600;border:none;cursor:pointer;">Send OTP</button>
                </div>
                <div id="auth-step-2" style="display:none;">
                    <p style="font-size:13px;color:#6B7280;margin-bottom:12px;">OTP sent to <strong id="auth-email-display"></strong></p>
                    <input id="auth-otp" type="text" placeholder="Enter 6-digit OTP" maxlength="6" style="width:100%;padding:14px 16px;border-radius:100px;border:1.5px solid #E2E5E9;font-size:18px;font-family:'Inter',sans-serif;outline:none;margin-bottom:12px;text-align:center;letter-spacing:8px;box-sizing:border-box;" />
                    <button onclick="API.auth.handleVerifyOTP()" style="width:100%;padding:14px;border-radius:100px;background:#FF9933;color:white;font-size:14px;font-weight:600;border:none;cursor:pointer;">Verify OTP</button>
                </div>
                <div id="auth-step-3" style="display:none;">
                    <p style="font-size:13px;color:#6B7280;margin-bottom:12px;">Create your Verilay profile</p>
                    <input id="auth-fullname" type="text" placeholder="Full Name" style="width:100%;padding:14px 16px;border-radius:100px;border:1.5px solid #E2E5E9;font-size:15px;font-family:'Inter',sans-serif;outline:none;margin-bottom:10px;box-sizing:border-box;" />
                    <input id="auth-username" type="text" placeholder="Username (e.g. govind)" style="width:100%;padding:14px 16px;border-radius:100px;border:1.5px solid #E2E5E9;font-size:15px;font-family:'Inter',sans-serif;outline:none;margin-bottom:12px;box-sizing:border-box;" />
                    <button onclick="API.auth.handleRegister()" style="width:100%;padding:14px;border-radius:100px;background:#FF9933;color:white;font-size:14px;font-weight:600;border:none;cursor:pointer;">Create Account</button>
                </div>
                <div id="auth-error" style="color:#EF4444;font-size:12px;margin-top:12px;display:none;"></div>
                <p style="font-size:11px;color:#C8CDD3;margin-top:16px;">OTP will appear in the server terminal</p>
            </div>`;
        document.body.appendChild(overlay);
    }

    function showAuthError(msg) { const el = document.getElementById("auth-error"); if (el) { el.textContent = msg; el.style.display = "block"; } }
    let authEmail = "";

    async function handleSendOTP() {
        const email = document.getElementById("auth-email").value.trim();
        if (!email) return showAuthError("Please enter your email");
        try {
            await apiPost("/auth/send-otp", { email });
            authEmail = email;
            document.getElementById("auth-step-1").style.display = "none";
            document.getElementById("auth-step-2").style.display = "block";
            document.getElementById("auth-email-display").textContent = email;
            document.getElementById("auth-error").style.display = "none";
        } catch (e) { showAuthError(e.message); }
    }

    async function handleVerifyOTP() {
        const otp = document.getElementById("auth-otp").value.trim();
        if (!otp) return showAuthError("Please enter the OTP");
        try {
            const res = await apiPost("/auth/verify-otp", { email: authEmail, otp });
            if (res.needs_registration) {
                document.getElementById("auth-step-2").style.display = "none";
                document.getElementById("auth-step-3").style.display = "block";
                document.getElementById("auth-error").style.display = "none";
            } else {
                saveToken(res.access_token, res.user);
                document.getElementById("verilay-auth-overlay").remove();
                init();
            }
        } catch (e) { showAuthError(e.message); }
    }

    async function handleRegister() {
        const full_name = document.getElementById("auth-fullname").value.trim();
        const username = document.getElementById("auth-username").value.trim().toLowerCase();
        if (!full_name || !username) return showAuthError("Please fill in all fields");
        try { await apiPost("/auth/send-otp", { email: authEmail }); } catch (e) { /* ignore */ }
        const otp = prompt("A new OTP was sent to your terminal.\nPlease enter the 6-digit OTP:");
        if (!otp) return;
        try {
            const res = await apiPost("/auth/register", { email: authEmail, otp, full_name, username });
            saveToken(res.access_token, res.user);
            document.getElementById("verilay-auth-overlay").remove();
            init();
        } catch (e) { showAuthError(e.message); }
    }

    // ============================================================
    // FEED MODULE
    // ============================================================

    let currentFeedType = "following";

    async function loadFeed(type = "following") {
        currentFeedType = type;
        const feedEl = document.querySelector("#tf .feed");
        if (!feedEl) return;
        feedEl.innerHTML = `<div style="text-align:center;padding:40px;color:#9CA3AF;font-size:13px;">Loading feed...</div>`;
        try {
            let data;
            if (type === "trending") { data = await apiGet("/feed/trending?page=1&page_size=20"); }
            else {
                if (!isLoggedIn()) { feedEl.innerHTML = `<div style="text-align:center;padding:40px;color:#9CA3AF;">Sign in to see your feed</div>`; return; }
                data = await apiGet("/feed/following?page=1&page_size=20");
            }
            renderFeedCards(data.cards, feedEl);
        } catch (e) { feedEl.innerHTML = `<div style="text-align:center;padding:40px;color:#9CA3AF;">No cards yet. Create your first truth card!</div>`; }
    }

    function renderFeedCards(cards, container) {
        if (!cards || cards.length === 0) { container.innerHTML = `<div style="text-align:center;padding:40px;color:#9CA3AF;">No truth cards yet.</div>`; return; }
        container.innerHTML = cards.map((card, i) => {
            const u = card.user || {};
            const sc = card.status === "DENIED" ? "rs-d" : card.status === "ACCEPTED" ? "rs-a" : "rs-m";
            const si = card.status === "DENIED" ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
                : card.status === "ACCEPTED" ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>`;
            const tp = card.trust_percentage || 0;
            const tc = tp >= 70 ? "var(--grn)" : tp >= 40 ? "var(--yel)" : "var(--red)";
            return `<div class="tc" data-card-id="${card.id}" style="animation-delay:${i*0.08}s">
                <div class="ch"><div class="av" style="background:${getAvatarColor(u.full_name)}">${getInitials(u.full_name)}</div><div><div class="cn">${u.full_name||"Unknown"} ${u.is_verified?`<span class="vb"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg></span>`:""}</div><div class="cm">${u.is_verified?"Verified · ":""}${timeAgo(card.created_at)}</div></div></div>
                <div class="rs ${sc}">${si} ${card.status}</div>
                <div class="ts">"${card.statement}"</div>
                ${card.news_headline?`<div class="np"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg><div><div class="nh">"${card.news_headline}"</div><div class="ns">${card.news_source||""}</div></div></div>`:""}
                <div class="tb"><div class="tbg"><div class="tbf" style="width:${tp}%;background:${tc}"></div></div><div class="tl"><span class="tp" style="color:${tc}">${tp}%</span><span class="tt"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg> ${formatNumber(card.vouch_count)} &nbsp;<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/></svg> ${formatNumber(card.counter_count)}</span></div></div>
                <div class="ar"><button class="ab ${card.user_reaction==="VOUCH"?"va":""}" onclick="API.reactions.vouch('${card.id}',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg> ${card.user_reaction==="VOUCH"?"Vouched":"Vouch"}</button><button class="ab ${card.user_reaction==="COUNTER"?"ca":""}" onclick="API.reactions.counter('${card.id}',this)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/></svg> ${card.user_reaction==="COUNTER"?"Countered":"Counter"}</button><button class="ab sh" onclick="API.reactions.share('${card.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg></button></div>
            </div>`;
        }).join("");
    }

    // ============================================================
    // REACTIONS MODULE
    // ============================================================

    async function vouchCard(cardId, btn) {
        if (!isLoggedIn()) return showLoginScreen();
        try { const res = await apiPost(`/cards/${cardId}/vouch`); updateCardUI(cardId, res); } catch (e) { console.error("Vouch failed:", e.message); }
    }
    async function counterCard(cardId, btn) {
        if (!isLoggedIn()) return showLoginScreen();
        try { const res = await apiPost(`/cards/${cardId}/counter`); updateCardUI(cardId, res); } catch (e) { console.error("Counter failed:", e.message); }
    }
    function updateCardUI(cardId, res) {
        const card = document.querySelector(`[data-card-id="${cardId}"]`);
        if (!card) return;
        const tbf = card.querySelector(".tbf"), tp = card.querySelector(".tp");
        if (tbf) { const p=res.trust_percentage, c=p>=70?"var(--grn)":p>=40?"var(--yel)":"var(--red)"; tbf.style.width=p+"%"; tbf.style.background=c; if(tp){tp.textContent=p+"%";tp.style.color=c;} }
        const btns = card.querySelectorAll(".ar .ab:not(.sh)");
        if (res.message.includes("removed")) { btns[0].classList.remove("va"); btns[1].classList.remove("ca"); }
        else if (res.message.includes("VOUCH")) { btns[0].classList.add("va"); btns[1].classList.remove("ca"); }
        else { btns[1].classList.add("ca"); btns[0].classList.remove("va"); }
    }
    async function shareCardAction(cardId) {
        if (!isLoggedIn()) return showLoginScreen();
        try { await apiPost(`/cards/${cardId}/share`); if(navigator.share) navigator.share({title:"Verilay Truth Record",text:"Check this verified truth record",url:`https://verilay.co.in/card/${cardId}`}); } catch(e){}
    }

    // ============================================================
    // RADAR MODULE (FULLY DYNAMIC)
    // ============================================================

    async function loadRadar() {
        if (!isLoggedIn()) return;
        const rsc = document.querySelector("#tr .rsc");
        if (!rsc) return;

        // Replace entire Radar content with dynamic structure
        rsc.innerHTML = `
            <div class="rc rh" id="radar-circle"><div class="rv" id="radar-score">...</div><div class="rl" id="radar-level">Scanning</div></div>
            <div class="rsp" id="radar-spike">Scanning for mentions...</div>
            <div class="rst"><div><div class="rsn" id="radar-mentions-today">-</div><div class="rsl">Mentions today</div></div><div><div class="rsn" id="radar-reach">-</div><div class="rsl">Reach this week</div></div></div>
            <button class="shb" onclick="API.radar.scan()" style="margin-bottom:20px">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><circle cx="12" cy="12" r="2"/></svg>
                Scan for New Mentions
            </button>
            <div id="radar-mentions-container"><div style="text-align:center;padding:20px;color:#9CA3AF;">Loading mentions...</div></div>
            <div id="radar-weekly-container"></div>
        `;

        // First trigger a scan, then load everything
        try { await apiGet("/radar/scan"); } catch (e) { console.log("Scan:", e.message); }
        await Promise.all([loadRiskScore(), loadMentions(), loadWeeklyStats()]);
    }

    async function loadRiskScore() {
        try {
            const d = await apiGet("/radar/risk-score");
            const scoreEl = document.getElementById("radar-score");
            const levelEl = document.getElementById("radar-level");
            const spikeEl = document.getElementById("radar-spike");
            const todayEl = document.getElementById("radar-mentions-today");
            const reachEl = document.getElementById("radar-reach");
            const circleEl = document.getElementById("radar-circle");

            if (scoreEl) scoreEl.textContent = d.score;
            if (levelEl) levelEl.textContent = d.level;
            if (spikeEl) spikeEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg> Risk spike: ${d.spike}`;
            if (todayEl) todayEl.textContent = d.mentions_today;
            if (reachEl) reachEl.textContent = formatNumber(d.reach_this_week);

            if (circleEl) {
                circleEl.classList.remove("rh");
                if (d.score >= 60) circleEl.classList.add("rh");
                if (d.score < 60 && d.score >= 30) { circleEl.style.borderColor = "var(--yel)"; circleEl.style.background = "var(--yel-l)"; }
                if (d.score < 30) { circleEl.style.borderColor = "var(--navy)"; circleEl.style.background = "var(--off)"; }
            }
        } catch (e) { console.error("Risk score:", e.message); }
    }

    async function loadMentions() {
        const container = document.getElementById("radar-mentions-container");
        if (!container) return;

        try {
            const mentions = await apiGet("/radar/mentions");

            if (mentions.length === 0) {
                container.innerHTML = `<div style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C8CDD3" stroke-width="1.5" style="margin-bottom:8px"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg><br>
                    No mentions found yet.<br>Click "Scan for New Mentions" to search.</div>`;
                return;
            }

            const pending = mentions.filter(m => m.status === "PENDING");
            const responded = mentions.filter(m => m.status !== "PENDING");

            let html = "";

            if (pending.length > 0) {
                html += `<div class="stt">Needs Your Response</div>`;
                html += pending.map(m => renderMentionCard(m, true)).join("");
            }

            if (responded.length > 0) {
                html += `<div class="stt" style="margin-top:24px">Responded</div>`;
                html += responded.map(m => renderMentionCard(m, false)).join("");
            }

            container.innerHTML = html;

        } catch (e) {
            console.error("Mentions:", e.message);
            container.innerHTML = `<div style="text-align:center;padding:20px;color:#9CA3AF;">Could not load mentions</div>`;
        }
    }

    function renderMentionCard(m, showActions) {
        const sevColor = m.severity === "URGENT" ? "var(--red)" : m.severity === "MODERATE" ? "var(--yel)" : "var(--grn)";
        const statusBadge = m.status !== "PENDING" ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;background:${m.status==="ACCEPTED"?"var(--grn-l)":"var(--red-l)"};color:${m.status==="ACCEPTED"?"var(--grn)":"var(--red)"}">${m.status}</span>` : "";
        const urgentBadge = m.severity === "URGENT" && m.status === "PENDING" ?
            `<div class="abg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg> Urgent</div>` : "";
        const _pbm={"Google News":{c:"mpb-gn",i:'<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/>'},"Twitter / X":{c:"mpb-tw",i:'<path d="M4 4l11.733 16h4.267l-11.733-16z"/><path d="M4 20l6.768-6.768m2.46-2.46L20 4"/>'},"Reddit":{c:"mpb-rd",i:'<circle cx="12" cy="12" r="10"/><path d="M14.5 15c-.83.83-2.17.83-3 0"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>'},"LinkedIn":{c:"mpb-li",i:'<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>'},"Instagram":{c:"mpb-ig",i:'<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>'}};
        const src=(m.source||"").toLowerCase();
        const plist=[];
        if(src.includes("twitter")||src.includes(" x ")||src==="x") plist.push("Twitter / X");
        if(src.includes("reddit")) plist.push("Reddit");
        if(src.includes("linkedin")) plist.push("LinkedIn");
        if(src.includes("instagram")) plist.push("Instagram");
        if(plist.length===0) plist.push("Google News");
        const platformBadges='<div class="mpi">'+plist.map(p=>{const d=_pbm[p];return`<span class="mpb ${d.c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d.i}</svg>${p}</span>`;}).join("")+'</div>';

        return `<div class="mc" style="${m.severity==="URGENT"&&m.status==="PENDING"?"border-left:3px solid var(--red)":""}">
            ${urgentBadge}
            ${statusBadge}
            <div class="mh"><div class="rd" style="background:${sevColor}"></div><div class="ms">${m.source}</div><div class="mt">${timeAgo(m.created_at)}</div></div>
            <div class="mhl">"${m.headline}"</div>
            <div class="mr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> ${formatNumber(m.reach)} reach ${m.url ? `&nbsp;&middot;&nbsp; <a href="${m.url}" target="_blank" style="color:var(--saff);font-size:11px;">View source</a>` : ""}</div>
            ${platformBadges}
            ${m.response_statement ? `<div style="font-size:12px;color:var(--g6);font-style:italic;margin:8px 0;padding:8px;background:var(--g1);border-radius:8px;">"${m.response_statement}"</div>` : ""}
            ${showActions ? `<div class="ma">
                <button class="mb mba" onclick="API.radar.respond('${m.id}','ACCEPTED')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg> Accept</button>
                <button class="mb mbd" onclick="API.radar.respond('${m.id}','DENIED')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Deny</button>
                <button class="mb mbm" onclick="API.radar.respond('${m.id}','MODIFIED')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg> Modify</button>
            </div>` : ""}
            <button class="shb" style="margin-top:8px" onclick="API.shield.openForMention('${m.id}')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg> Shield Options</button>
        </div>`;
    }

    async function respondToMention(mentionId, action) {
        if (!isLoggedIn()) return showLoginScreen();
        let statement = prompt(`Enter your ${action.toLowerCase()} statement:`);
        if (statement === null) return;
        try {
            const body = { action };
            if (statement) body.statement = statement;
            const res = await apiPost(`/radar/mentions/${mentionId}/respond`, body);
            await loadMentions();
            await loadRiskScore();
var feedC = document.querySelector("#tf .feed");
            if (feedC && currentUser && statement && statement.trim()) {
                var _sc = action==="DENIED"?"rs-d":action==="ACCEPTED"?"rs-a":"rs-m";
                var _hl = (res && res.headline) || "";
                var _src = (res && res.source) || "";
                var _el = document.createElement("div");
                _el.className = "tc";
                var _h = '<div class="ch"><div class="av" style="background:'+getAvatarColor(currentUser.full_name)+'">'+getInitials(currentUser.full_name)+'</div><div><div class="cn">'+currentUser.full_name+'</div><div class="cm">Just now</div></div></div>';
                _h += '<div class="rs '+_sc+'">'+action+'</div>';
                _h += '<div class="ts">"'+statement.trim()+'"</div>';
                if (_hl) _h += '<div class="np"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg><div><div class="nh">"'+_hl+'"</div><div class="ns">'+_src+'</div></div></div>';
                _h += '<div class="ar"><button class="ab" onclick="tv(this)">Vouch</button><button class="ab" onclick="tc2(this)">Counter</button></div>';
                _el.innerHTML = _h;
                feedC.prepend(_el);
            }
            try { loadFeed(currentFeedType); } catch(e2) {}
        } catch (e) { console.error("Respond failed:", e.message); alert("Failed: " + e.message); }
    }

    async function loadWeeklyStats() {
        const container = document.getElementById("radar-weekly-container");
        if (!container) return;
        try {
            const d = await apiGet("/radar/weekly-stats");
            container.innerHTML = `<div class="ws"><div class="stt" style="margin-bottom:8px">This Week</div>
                <div class="wr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg> Sentiment: <strong style="color:var(--grn);margin-left:4px">${d.sentiment_positive_pct}% Positive</strong></div>
                <div class="wr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg> Mentions: <strong style="color:var(--navy);margin-left:4px">${d.mention_change_pct>=0?"+":""}${d.mention_change_pct}% vs last week</strong></div>
                <div class="wr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> Top Source: <strong style="margin-left:4px">${d.top_source}</strong></div>
            </div>`;
        } catch (e) { console.error("Weekly stats:", e.message); }
    }

    async function scanNews() {
        if (!isLoggedIn()) return showLoginScreen();
        const btn = document.querySelector("#tr .shb");
        if (btn) { btn.innerHTML = `Scanning...`; btn.disabled = true; }
        try {
            const res = await apiGet("/radar/scan");
            alert(`Scan complete!\n${res.new_mentions} new mentions found\nTotal: ${res.total_mentions} mentions`);
            await Promise.all([loadRiskScore(), loadMentions(), loadWeeklyStats()]);
        } catch (e) { console.error("Scan:", e.message); alert("Scan failed: " + e.message); }
        if (btn) { btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><circle cx="12" cy="12" r="2"/></svg> Scan for New Mentions`; btn.disabled = false; }
    }

    // ============================================================
    // PROFILE MODULE
    // ============================================================

    async function loadProfile() {
        if (!isLoggedIn() || !currentUser) return;
        try {
            const p = await apiGet(`/users/${currentUser.username}`);
            const pa = document.querySelector("#tp .pa"); if (pa) pa.textContent = getInitials(p.full_name);
            const pn = document.querySelector("#tp .pn"); if (pn) pn.textContent = p.full_name;
            const pt = document.querySelector("#tp .pt"); if (pt) pt.textContent = p.bio || "";
            const stats = document.querySelectorAll("#tp .psn");
            if (stats[0]) stats[0].textContent = p.claims_resolved;
            if (stats[1]) { stats[1].textContent = p.vouch_rate + "%"; stats[1].style.color = "var(--grn)"; }
            if (stats[2]) stats[2].textContent = p.trust_score;
            const fr = document.querySelector("#tp .fr"); if (fr) fr.innerHTML = `<strong>${p.followers_count}</strong> Followers &middot; <strong>${p.following_count}</strong> Following`;
            loadAboutSection(p);
            loadCardsSection();
        } catch (e) { console.error("Profile:", e.message); }
    }

    async function loadTruthLog() {
        if (!isLoggedIn() || !currentUser) return;
        try {
            const cards = await apiGet(`/users/${currentUser.username}/truth-log`);
            const container = document.getElementById("pl"); if (!container) return;
            if (cards.length === 0) { container.innerHTML = `<div style="text-align:center;padding:40px;color:#9CA3AF;">No truth records yet</div>`; return; }
            container.innerHTML = cards.map(card => {
                const sc = card.status==="DENIED"?"rs-d":card.status==="ACCEPTED"?"rs-a":"rs-m";
                const sl = card.status==="DENIED"?"Denied":card.status==="ACCEPTED"?"Accepted":"Modified";
                const si = card.status==="DENIED"?`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`:card.status==="ACCEPTED"?`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>`:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>`;
                const tp = card.trust_percentage||0, tc = tp>=70?"var(--grn)":tp>=40?"var(--yel)":"var(--red)";
                const dt = new Date(card.created_at).toLocaleDateString("en-IN",{month:"short",day:"numeric",year:"numeric"});
                return `<div class="le"><span class="rs ${sc}" style="font-size:11px;padding:3px 10px">${si} ${sl}</span><span class="ld">${dt}</span><div class="lc">"${card.news_headline||card.statement}"</div>${card.news_source?`<div class="lso">${card.news_source}</div>`:""}<div class="tb"><div class="tbg"><div class="tbf" style="width:${tp}%;background:${tc}"></div></div><div class="tl"><span class="tp" style="color:${tc}">${tp}%</span><span class="tt">${formatNumber(card.vouch_count)} vouches · ${formatNumber(card.counter_count)} counters</span></div></div></div>`;
            }).join("");
        } catch (e) { console.error("Truth log:", e.message); }
    }

    // ============================================================
    // ABOUT & CARDS (DYNAMIC PROFILE SECTIONS)
    // ============================================================
    function loadAboutSection(p) {
        const el = document.getElementById("pab");
        if (!el) return;
        const d = new Date(p.created_at || Date.now()).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        el.innerHTML = '<div class="asec"><div class="alab">Bio</div><div class="atxt" id="bio-text">' + (p.bio || "No bio added yet.") + '</div><button style="margin-top:8px;padding:8px 16px;border-radius:100px;border:1.5px solid var(--g2);background:white;font-size:12px;font-weight:600;color:var(--saff);cursor:pointer;font-family:inherit" onclick="API.profile.editBio()">Edit Bio</button></div>' +
            '<div class="asec"><div class="alab">Verification</div><div class="arow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg><span class="arowt">' + (p.is_verified ? "Identity Verified" : "Not Yet Verified") + '</span><span class="arows">' + (p.is_verified ? "Verified" : "Pending") + '</span></div></div>' +
            '<div class="asec"><div class="alab">Trust Stats</div><div class="arow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg><span class="arowt">Member since ' + d + '</span></div><div class="arow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg><span class="arowt">' + (p.claims_resolved || 0) + ' claims addressed</span></div><div class="arow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg><span class="arowt">' + (p.vouch_rate || 0) + '% average vouch rate</span></div></div>' +
            '<div class="asec"><div class="alab">Links</div><div class="arow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span class="arowt" style="color:var(--saff)">verilay.in/@' + (p.username || "") + '</span></div></div>';
    }
    async function editBio() {
        const newBio = prompt("Enter your bio:");
        if (newBio === null || !newBio.trim()) return;
        try {
            await apiPut("/users/me", { bio: newBio.trim() });
            const el = document.getElementById("bio-text");
            if (el) el.textContent = newBio.trim();
            const pt = document.querySelector("#tp .pt");
            if (pt) pt.textContent = newBio.trim();
        } catch (e) { alert("Could not update bio: " + e.message); }
    }
    async function loadCardsSection() {
        const el = document.getElementById("pc");
        if (!el) return;
        try {
            const mentions = await apiGet("/radar/mentions");
            const responded = (mentions || []).filter(m => m.status !== "PENDING");
            if (responded.length === 0) {
                el.innerHTML = '<div class="cg"><div class="cmc"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg><p>Create New Card</p></div></div>';
                return;
            }
            el.innerHTML = '<div class="cg">' + responded.map(function(m) {
                var sc = m.status === "DENIED" ? "rs-d" : m.status === "ACCEPTED" ? "rs-a" : "rs-m";
                var sl = m.status === "DENIED" ? "Denied" : m.status === "ACCEPTED" ? "Accepted" : "Modified";
                return '<div class="cm2"><div class="cms ' + sc + '">' + sl + '</div><div class="cmt">"' + m.headline + '"</div><div class="cmf"><span class="cmp">' + m.source + '</span></div></div>';
            }).join("") + '<div class="cmc"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg><p>Create New Card</p></div></div>';
        } catch (e) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9CA3AF">Could not load cards</div>'; }
    }

    // ============================================================
    // SHIELD MODULE
    // ============================================================

    let _currentShieldMentionId = null;
    function openForMention(mentionId) {
        _currentShieldMentionId = mentionId;
        document.getElementById('bso').classList.add('on');
        document.getElementById('bss').classList.add('on');
    }
    async function generateResponseCard(mentionId) { try { const r = await apiPost(`/shield/response-card?mention_id=${mentionId}`); alert("Response card created!"); return r; } catch(e) { alert("Failed: "+e.message); } }
    async function draftDenialStatement(mentionId) { try { const r = await apiPost(`/shield/denial-statement?mention_id=${mentionId}`); alert("Denial Statement:\n\n"+r.drafted_statement); return r; } catch(e) { alert("Failed: "+e.message); } }
    async function fileTakedown(mentionId) { try { const r = await apiPost(`/shield/takedown?mention_id=${mentionId}`); alert("Takedown request filed!"); return r; } catch(e) { alert("Failed: "+e.message); } }
    async function setAlert(mentionId) { try { const r = await apiPost(`/shield/alert?mention_id=${mentionId}`); alert("Alert set!"); return r; } catch(e) { alert("Failed: "+e.message); } }

    // ============================================================
    // SEARCH & NOTIFICATIONS
    // ============================================================

    async function searchQuery(q) { if (!q) return; try { return await apiGet(`/search?q=${encodeURIComponent(q)}`); } catch(e) { console.error("Search:",e.message); } }

    async function loadUnreadCount() {
        if (!isLoggedIn()) return;
        try { const d = await apiGet("/notifications/unread-count"); const b = document.querySelector(".badge"); if(b){b.textContent=d.unread_count;b.style.display=d.unread_count>0?"flex":"none";} } catch(e){}
    }

    async function markAllRead() { try { await apiPut("/notifications/read"); loadUnreadCount(); } catch(e){} }

    // ============================================================
    // TAB SWITCHING
    // ============================================================

    window.sw = function(tab, el) {
        document.querySelectorAll(".pnl").forEach(p => p.classList.remove("on"));
        document.querySelectorAll(".ni").forEach(n => n.classList.remove("on"));
        document.getElementById("t" + tab).classList.add("on");
        el.classList.add("on");
        if (tab === "f") loadFeed(currentFeedType);
        if (tab === "r") loadRadar();
        if (tab === "p") { loadProfile(); loadTruthLog(); }
    };

    window.sft = function(el) {
        el.parentElement.querySelectorAll(".st").forEach(t => t.classList.remove("on"));
        el.classList.add("on");
        loadFeed(el.textContent.trim().toLowerCase());
    };

    window.spt = function(el, id) {
        el.parentElement.querySelectorAll(".psti").forEach(t => t.classList.remove("on"));
        el.classList.add("on");
        document.querySelectorAll(".pcp").forEach(p => p.classList.remove("on"));
        document.getElementById(id).classList.add("on");
        if (id === "pl") loadTruthLog();
    };

    // ============================================================
    // INIT
    // ============================================================

    function init() {
        if (!isLoggedIn()) { showLoginScreen(); return; }
        loadFeed("following");
        loadUnreadCount();
        setInterval(loadUnreadCount, 30000);
        console.log("Verilay API connected — logged in as:", currentUser?.full_name);
    }

    document.addEventListener("DOMContentLoaded", () => { init(); });

    // ============================================================
    // PUBLIC API
    // ============================================================

    return {
        auth: { handleSendOTP, handleVerifyOTP, handleRegister, isLoggedIn, logout, getUser },
        feed: { load: loadFeed },
        reactions: { vouch: vouchCard, counter: counterCard, share: shareCardAction },
        radar: { load: loadRadar, scan: scanNews, respond: respondToMention },
        profile: { load: loadProfile, truthLog: loadTruthLog, about: loadAboutSection, cards: loadCardsSection, editBio: editBio },
        shield: { responseCard: generateResponseCard, denialStatement: draftDenialStatement, takedown: fileTakedown, alert: setAlert, openForMention: openForMention, get _mid(){return _currentShieldMentionId;} },
        search: searchQuery,
        notifications: { loadCount: loadUnreadCount, markAllRead },
        helpers: { getInitials, getAvatarColor, timeAgo, formatNumber },
    };
})();
