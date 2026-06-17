// ============================================================
// VERILAY PATCH v3 — dynamic Profile, Bio editing, Create Card
// Add <script src="verilay_patch.js"></script> before </body>
// ============================================================

(function() {
    function waitForAPI(cb) {
        if (typeof API !== "undefined" && API.auth && API.helpers) cb();
        else setTimeout(() => waitForAPI(cb), 100);
    }

    waitForAPI(function() {
        const BASE = "https://verilay-backend.onrender.com/api";
        const H = () => {
            const h = { "Content-Type": "application/json" };
            const t = localStorage.getItem("verilay_token");
            if (t) h["Authorization"] = "Bearer " + t;
            return h;
        };
        const get = (path) => fetch(BASE + path, { headers: H() }).then(r => r.json());
        const post = (path, body) => fetch(BASE + path, {
            method: "POST", headers: H(), body: JSON.stringify(body || {})
        }).then(async r => {
            if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || ("HTTP " + r.status)); }
            return r.json();
        });

        // ─────────────────────────────────────────────
        // 1. DYNAMIC CARDS GRID (with working "Create New Card")
        // ─────────────────────────────────────────────
        async function loadCardsGrid() {
            const container = document.getElementById("pc");
            if (!container || !API.auth.isLoggedIn()) return;
            const user = API.auth.getUser();
            if (!user) return;

            const addTile = '<div class="cmc" onclick="vpCreateCard()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg><p>Create New Card</p></div>';

            container.innerHTML = '<div style="text-align:center;padding:40px;color:#9CA3AF;">Loading cards...</div>';
            try {
                const cards = await get("/users/" + user.username + "/truth-log");
                if (!cards || cards.length === 0) {
                    container.innerHTML = '<div class="cg">' + addTile + '</div>';
                    return;
                }
                const grid = cards.map(c => {
                    const sc = c.status==="DENIED"?"rs-d":c.status==="ACCEPTED"?"rs-a":"rs-m";
                    const sl = c.status==="DENIED"?"Denied":c.status==="ACCEPTED"?"Accepted":"Modified";
                    const si = c.status==="DENIED"?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>':c.status==="ACCEPTED"?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>';
                    const tp = c.trust_percentage||0;
                    const tc = tp>=70?"var(--grn)":tp>=40?"var(--yel)":"var(--red)";
                    const shares = (c.vouch_count||0)+(c.counter_count||0);
                    return '<div class="cm2"><div class="cms '+sc+'">'+si+' '+sl+'</div><div class="cmt">"'+(c.news_headline||c.statement||"")+'"</div><div class="cmf"><span class="cmp" style="color:'+tc+'">'+tp+'%</span><span class="cmsh"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg> '+shares+'</span></div></div>';
                }).join("") + addTile;
                container.innerHTML = '<div class="cg">' + grid + '</div>';
            } catch(e) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#9CA3AF;">Could not load cards</div>';
            }
        }

        // ─────────────────────────────────────────────
        // 2. DYNAMIC ABOUT SECTION (with Bio edit button)
        // ─────────────────────────────────────────────
        async function loadAboutSection() {
            const container = document.getElementById("pab");
            if (!container || !API.auth.isLoggedIn()) return;
            const user = API.auth.getUser();
            if (!user) return;

            try {
                const p = await get("/users/" + user.username);
                const joinDate = new Date(p.created_at||Date.now()).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
                const bioBtnLabel = (p.bio && p.bio.trim()) ? "Edit Bio" : "Add Bio";
                container.innerHTML =
                    '<div class="asec"><div class="alab">Bio</div>'+
                    '<div class="atxt" id="vp-bio-text">'+(p.bio||"No bio added yet.")+'</div>'+
                    '<button onclick="vpEditBio()" style="margin-top:10px;padding:8px 16px;border-radius:100px;border:1.5px solid var(--g2);background:#fff;font-size:12px;font-weight:600;color:var(--saff);cursor:pointer;font-family:inherit">'+bioBtnLabel+'</button></div>'+
                    '<div class="asec"><div class="alab">Verification</div>'+
                    '<div class="arow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>'+
                    '<span class="arowt">'+(p.is_verified?"Identity Verified":"Not Yet Verified")+'</span>'+
                    '<span class="arows">'+(p.is_verified?"Verified":"Pending")+'</span></div></div>'+
                    '<div class="asec"><div class="alab">Trust Stats</div>'+
                    '<div class="arow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg><span class="arowt">Member since '+joinDate+'</span></div>'+
                    '<div class="arow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg><span class="arowt">'+(p.claims_resolved||0)+' claims addressed</span></div>'+
                    '<div class="arow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg><span class="arowt">'+(p.vouch_rate||0)+'% average vouch rate</span></div></div>'+
                    '<div class="asec"><div class="alab">Links</div>'+
                    '<div class="arow"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span class="arowt" style="color:var(--saff)">verilay.co.in/@'+(p.username||"")+'</span></div></div>';
            } catch(e) {
                container.innerHTML = '<div style="text-align:center;padding:40px;color:#9CA3AF;">Could not load profile info</div>';
            }
        }

        // ─────────────────────────────────────────────
        // 3. BIO EDIT (uses existing API.profile.editBio, then refresh)
        // ─────────────────────────────────────────────
        window.vpEditBio = async function() {
            try {
                await API.profile.editBio();      // prompts + PUT /users/me
            } catch (e) { /* editBio handles its own errors */ }
            setTimeout(loadAboutSection, 300);    // refresh the About panel
        };

        // ─────────────────────────────────────────────
        // 4. CREATE TRUTH CARD — modal + submit
        // ─────────────────────────────────────────────
        let _ccStatus = "DENIED";

        function buildCCModal() {
            if (document.getElementById("vp-cc-sheet")) return;
            const wrap = document.createElement("div");
            wrap.innerHTML =
                '<div id="vp-cc-overlay" onclick="vpCloseCard()" style="position:fixed;inset:0;background:rgba(10,22,40,.5);z-index:80;display:none"></div>'+
                '<div id="vp-cc-sheet" style="position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:100%;max-width:430px;background:#fff;border-radius:20px 20px 0 0;padding:20px;padding-bottom:max(20px,env(safe-area-inset-bottom));z-index:81;display:none;max-height:88vh;overflow-y:auto;box-sizing:border-box">'+
                  '<div style="width:36px;height:4px;background:#C8CDD3;border-radius:2px;margin:0 auto 16px"></div>'+
                  '<div style="font-size:17px;font-weight:700;color:#0A1628;margin-bottom:16px">Create Truth Card</div>'+
                  '<div style="font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Your response</div>'+
                  '<div id="vp-cc-status" style="display:flex;gap:8px;margin-bottom:16px">'+
                    '<button type="button" data-s="DENIED" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid #E2E5E9;background:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Deny</button>'+
                    '<button type="button" data-s="ACCEPTED" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid #E2E5E9;background:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Accept</button>'+
                    '<button type="button" data-s="MODIFIED" style="flex:1;padding:10px;border-radius:10px;border:1.5px solid #E2E5E9;background:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Modify</button>'+
                  '</div>'+
                  '<textarea id="vp-cc-statement" rows="3" placeholder="Your statement — what is the truth?" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid #E2E5E9;font-size:14px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;margin-bottom:12px"></textarea>'+
                  '<input id="vp-cc-headline" type="text" placeholder="News headline (optional)" style="width:100%;padding:12px;border-radius:100px;border:1.5px solid #E2E5E9;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:10px">'+
                  '<input id="vp-cc-source" type="text" placeholder="Source, e.g. Economic Times (optional)" style="width:100%;padding:12px;border-radius:100px;border:1.5px solid #E2E5E9;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:10px">'+
                  '<input id="vp-cc-url" type="url" placeholder="Article link (optional)" style="width:100%;padding:12px;border-radius:100px;border:1.5px solid #E2E5E9;font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;margin-bottom:16px">'+
                  '<div id="vp-cc-err" style="color:#EF4444;font-size:12px;margin-bottom:10px;display:none"></div>'+
                  '<button id="vp-cc-submit" type="button" onclick="vpSubmitCard()" style="width:100%;padding:14px;border-radius:100px;background:#FF9933;color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:inherit;margin-bottom:8px">Publish Card</button>'+
                  '<button type="button" onclick="vpCloseCard()" style="width:100%;padding:12px;border-radius:100px;background:#fff;color:#6B7280;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit">Cancel</button>'+
                '</div>';
            document.body.appendChild(wrap);

            // status selector highlight
            wrap.querySelectorAll("#vp-cc-status button").forEach(btn => {
                btn.addEventListener("click", function() {
                    _ccStatus = this.getAttribute("data-s");
                    wrap.querySelectorAll("#vp-cc-status button").forEach(b => {
                        b.style.borderColor = "#E2E5E9"; b.style.background = "#fff"; b.style.color = "#0A1628";
                    });
                    this.style.borderColor = "#FF9933"; this.style.background = "rgba(255,153,51,.1)"; this.style.color = "#FF9933";
                });
            });
        }

        window.vpCreateCard = function() {
            if (!API.auth.isLoggedIn()) { return; }
            buildCCModal();
            _ccStatus = "DENIED";
            ["vp-cc-statement","vp-cc-headline","vp-cc-source","vp-cc-url"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
            const err = document.getElementById("vp-cc-err"); if (err) err.style.display = "none";
            const first = document.querySelector('#vp-cc-status button[data-s="DENIED"]'); if (first) first.click();
            document.getElementById("vp-cc-overlay").style.display = "block";
            document.getElementById("vp-cc-sheet").style.display = "block";
        };

        window.vpCloseCard = function() {
            const o = document.getElementById("vp-cc-overlay"), s = document.getElementById("vp-cc-sheet");
            if (o) o.style.display = "none";
            if (s) s.style.display = "none";
        };

        window.vpSubmitCard = async function() {
            const statement = (document.getElementById("vp-cc-statement").value || "").trim();
            const err = document.getElementById("vp-cc-err");
            if (!statement) { if (err) { err.textContent = "Please enter your statement."; err.style.display = "block"; } return; }

            const body = {
                status: _ccStatus,
                statement: statement,
                news_headline: (document.getElementById("vp-cc-headline").value || "").trim() || null,
                news_source: (document.getElementById("vp-cc-source").value || "").trim() || null,
                news_url: (document.getElementById("vp-cc-url").value || "").trim() || null,
            };
            const btn = document.getElementById("vp-cc-submit");
            if (btn) { btn.textContent = "Publishing..."; btn.disabled = true; }
            try {
                await post("/cards/", body);
                window.vpCloseCard();
                loadCardsGrid();
                try { API.feed.load("following"); } catch (e) {}
            } catch (e) {
                if (err) { err.textContent = e.message || "Could not create card."; err.style.display = "block"; }
            } finally {
                if (btn) { btn.textContent = "Publish Card"; btn.disabled = false; }
            }
        };

        // ─────────────────────────────────────────────
        // 5. HOOK INTO TAB SWITCHING
        // ─────────────────────────────────────────────
        const _origSpt = window.spt;
        window.spt = function(el, id) {
            _origSpt(el, id);
            if (id === "pc") loadCardsGrid();
            if (id === "pab") loadAboutSection();
        };

        const _origSw = window.sw;
        window.sw = function(tab, el) {
            _origSw(tab, el);
            if (tab === "p") {
                setTimeout(() => {
                    loadAboutSection();
                    const active = document.querySelector(".psti.on");
                    if (active && active.textContent.trim() === "Cards") loadCardsGrid();
                }, 200);
            }
        };

        // ─────────────────────────────────────────────
        // 6. Reload feed after responding to a mention
        // ─────────────────────────────────────────────
        const _origRespond = API.radar.respond;
        API.radar.respond = async function(mentionId, action) {
            await _origRespond(mentionId, action);
            try { API.feed.load("following"); } catch (e) {}
        };

        // Load About on first Profile visit
        setTimeout(() => {
            const profileActive = document.querySelector("#tp.on");
            if (profileActive) loadAboutSection();
        }, 500);

        console.log("Verilay Patch v3 loaded — Bio editing + Create Card + dynamic Profile");
    });
})();
