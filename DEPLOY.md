# Putting the new Vestia website live

This guide is for whoever looks after the website and the domain. You don't need to be technical, but you will need to log in to GitHub and to the company that manages the **vestiamediation.co.uk** domain (often Wix itself, or a registrar such as 123-reg, GoDaddy or Namecheap).

> **⚠️ Email warning: do not touch the MX records.**
> Your email (enquiries@, complaints@, bookings@ and so on) depends on the domain's **MX** records, plus some **TXT** records (SPF, DKIM, DMARC) and sometimes CNAMEs such as `autodiscover`. Leave all of these exactly as they are. You only change the website records described in step 3. **Take a screenshot of every DNS record before you change anything**, so you can put things back if needed.

---

## 1. Turn on the free preview (GitHub Pages)

1. Go to **github.com/ovr2u/vestia-website** and click **Settings** (top right of the repository).
2. In the left-hand menu, click **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
5. Wait two or three minutes and refresh the page. A box will show the address:
   **https://ovr2u.github.io/vestia-website/**

The preview works fully, but Google is told not to list it (every page carries a temporary "noindex" tag), so it won't compete with your current site.

## 2. Connect your domain in GitHub

1. Still in **Settings → Pages**, under **Custom domain**, type `www.vestiamediation.co.uk` and click **Save**.
2. Recommended: verify the domain so nobody else can claim it. Click your profile picture → **Settings → Pages → Add a domain**, enter `vestiamediation.co.uk`, and GitHub will show you one **TXT** record to add in step 3. Adding this TXT record does not affect email.

## 3. Change the website records at your domain provider

Log in where the domain's DNS is managed (in Wix: **Domains → ⋯ → Manage DNS Records**). Change **only** these:

| Type | Host / Name | Value | What to do |
|---|---|---|---|
| CNAME | `www` | `ovr2u.github.io` | Replace the existing `www` record (it currently points to Wix) |
| A | `@` (the bare domain) | `185.199.108.153` | Replace the Wix A record(s) with these four |
| A | `@` | `185.199.109.153` | |
| A | `@` | `185.199.110.153` | |
| A | `@` | `185.199.111.153` | |
| TXT | as shown by GitHub | as shown by GitHub | Only if you did the verification in step 2 |

Do not delete or edit anything else, and **never the MX records**.

Changes usually take effect within an hour but can take up to 48 hours. Then go back to **Settings → Pages** in GitHub and tick **Enforce HTTPS** once it becomes available.

## 4. Let Google index the new site (important)

While the site was a preview, every page told Google "don't index me". At go-live you must remove that, or the new site will drop out of Google.

- **Simplest:** ask your developer (or Claude) to "set `NOINDEX = False` in `_build/build.py`, rebuild and push".
- **By hand:** in every `.html` file, delete the line `<meta name="robots" content="noindex">` and the comment line above it marked `PRE-LAUNCH`.

Then, in **Google Search Console**, submit the sitemap `https://www.vestiamediation.co.uk/sitemap.xml` and use **URL Inspection** on the home page to request indexing.

All the old page addresses (for example `/our-mediators`, `/fees`, `/lucie-annerhodes`, `/post/how-to-prepare-for-mediation`) work on the new site, so existing Google rankings and links carry over.

## 5. After go-live

1. Check the site and **send yourself a test email** to confirm email still works.
2. Only then downgrade or cancel the Wix website plan. If the domain itself was bought through Wix, keep paying for the domain (or transfer it first).
3. Optional upgrades, each marked in the code with comments:
   - **Forms:** see "Setting up Formspree" below.
   - **Booking:** to use Calendly, follow the `SCHEDULER SLOT` comment in `_build/pages/book-a-call.html`. Mention Calendly's cookies in the Privacy Policy.
   - **Privacy Policy:** the cookies paragraph was copied from the old site. The new site sets no cookies and uses no analytics, so you may want to update it.

Need help? Any developer can follow this guide, and the `README.md` file explains how the site is built.

---

## Setting up Formspree (everyday forms)

The booking forms, contact form, booking request form and mediation intake can send straight to your inbox through Formspree. The confidential pre-mediation form deliberately does **not** use Formspree: it stays on email, with the option to save the answers as a Word document first.

1. Go to **formspree.io** and sign up for the free plan, using **enquiries@vestiamediation.co.uk** as the account email. Click the link in the confirmation email Formspree sends.
2. Click **+ New Form** (if asked for a project, call it **Vestia Mediation**).
   - **Form name:** `Vestia website`
   - **Send emails to:** `enquiries@vestiamediation.co.uk`
3. Formspree shows the form's address, for example `https://formspree.io/f/abcdwxyz`. The last part (`abcdwxyz`) is the **form ID**. Send it to your developer (or Claude).
4. Open the form's **Settings** tab:
   - **Spam protection:** turn **reCAPTCHA off**. The website sends forms in the background, and reCAPTCHA would block them. The site has its own hidden spam trap (a field called `_gotcha`); if Formspree asks for a honeypot field name, enter `_gotcha`.
   - **Email notifications:** leave on.
   - **Restrict to domain** (if your plan offers it): leave empty while testing on the preview. After go-live, set it to `vestiamediation.co.uk`.
   - Leave **redirect** settings empty: the website shows its own thank-you message.
5. Once the ID is in the site, send a test from the footer booking form on the preview and check it arrives. If Formspree emails you asking to confirm the form, click the link.

**Good to know:** at the time of writing, Formspree's free plan covers 50 submissions a month across all forms, keeps submissions for about 30 days, and doesn't include automatic replies to the sender. You'll get emails as you approach the limit. Formspree is a US company, so mention it in the Privacy Policy.

**For a developer:** the ID goes in `FORMSPREE_FORM_ID` near the top of `_build/build.py`. Run `python3 _build/build.py` and push. Leaving it empty keeps the forms on the visitor's email app.

