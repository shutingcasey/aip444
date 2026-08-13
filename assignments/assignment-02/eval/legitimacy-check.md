# Legitimacy Check

The legitimacy agent (`src/phase3/legitimacyAgent.ts`) uses a tool-calling loop with `web_search` (Tavily) and `whois_lookup` (raw WHOIS protocol, `src/lib/whois.ts`) before producing a structured verdict. Tested against one real, well-known posting and one synthetic scam posting.

## Case 1: Legitimate — Full Stack Developer, Compass Group Canada

Real posting, well-known company (Compass Group Canada, a large foodservice/facilities company), pulled from their own careers portal.

**Tool calls made:**
- `whois_lookup("compass-canada.com")` → registered **1999-10-06**, registrar easyDNS, privacy-redacted registrant org (expected for an established corporate domain).
- `web_search("Compass Group Canada")` → returned their LinkedIn company page and other corroborating results.

**Signals found (all green):**
| Signal | Evidence |
| :--- | :--- |
| Established web presence | LinkedIn company page + official website |
| Domain registered for years | WHOIS: registered 1999-10-06 |
| Listed on official careers page | `https://careers.compass-canada.com/job/...` |
| Contact email matches domain | Application email on `compass-canada.com` |
| Salary consistent with market | $100,000–$120,000 CAD vs. market median ~$133,047 CAD |
| Specific, real requirements | Named technologies (Vue, TypeScript, AWS) |

**Verdict produced:** `GREEN`, confidence 95/100, recommendation: *"This posting appears legitimate; proceed with confidence in applying."*

**Agreement:** Yes — every signal cited is independently verifiable and accurate (I manually confirmed the WHOIS date and the careers-page URL). No false green flags.

## Case 2: Suspicious — synthetic scam posting

I authored a fake posting myself (`eval/fixtures/generate-scam-posting.ts` generates `eval/fixtures/scam-posting.pdf`) deliberately engineered to hit most of the red-flag checklist from the assignment spec: fictional company ("Vertex Global Career Solutions"), $220,000/year for a no-experience-required data-entry role, a Gmail contact address, a request for SIN + date of birth + government ID, a refundable "$199 equipment deposit" payable by e-transfer, and a generic "duties as assigned" description with no named technology.

**Tool calls made:**
- `whois_lookup("vertexglobalcareersolutions.com")` → no registration record found (the domain doesn't exist — itself a strong signal, since the posting claims to be from a specific company but has no findable web presence).
- `web_search("Vertex Global Career Solutions")` → top result was an unrelated company ("vertexeng.com"); nothing corroborating the posting's claimed company.

**Signals found (all red):**
| Signal | Evidence |
| :--- | :--- |
| Salary far above market rate | $220,000 for an unskilled/entry role vs. ~$88k–$288k range for *software developer* roles in the market data — wildly inconsistent with the role's actual seniority |
| Sensitive PII requested upfront | SIN + date of birth required to apply |
| Upfront payment required | "$199 equipment and training deposit" via e-transfer |
| Contact email doesn't match company | `gmail.com`, not a company domain |
| Vague/generic description | "Duties as assigned," no named responsibilities or technologies |
| No WHOIS record | Domain does not resolve/is not registered |

**Verdict produced:** `RED`, confidence 75/100, recommendation: *"Do not submit personal information — multiple signs of fraud identified."*

**Agreement:** Yes, fully — this matches every red flag I deliberately wrote into the posting, plus it independently discovered the domain doesn't exist (I hadn't registered `vertexglobalcareersolutions.com` — I invented it as a plausible-sounding name, and the agent correctly treated "no WHOIS record" as a red flag rather than shrugging it off as inconclusive).

**One note on report design:** the fit-assessment step (run independently of the legitimacy agent) still scored this fake posting 85% "Strong fit — apply," because a posting with no real requirements trivially "matches" any resume. This is expected given the two steps are deliberately separate agents with different jobs, but it's exactly why the HTML report leads with the legitimacy banner in bold red *before* the fit score — a user skimming top-to-bottom sees "Likely Fraudulent — do not submit personal information" before they ever reach the encouraging 85% number.
