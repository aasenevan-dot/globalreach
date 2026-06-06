import { useState } from "react";
import { Search, Send, LayoutDashboard, Layers, GitBranch, BarChart3, Star, Check, ChevronRight, Users, Zap, Mail, Globe, Target, Webhook, TrendingUp, Briefcase } from "lucide-react";

export default function Landing() {
  const goToApp = () => { window.location.hash = '#/'; };
  const [proEmail, setProEmail] = useState("");
  const [proDone, setProDone] = useState(false);
  const [enterpriseEmail, setEnterpriseEmail] = useState("");
  const [enterpriseDone, setEnterpriseDone] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* STICKY NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-gray-900/95 backdrop-blur border-b border-white/10 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo-transparent.png" alt="GlobalReach" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={goToApp}
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Features
            </button>
            <button
              onClick={goToApp}
              className="text-gray-300 hover:text-white transition-colors text-sm"
            >
              Pricing
            </button>
            <button
              onClick={goToApp}
              className="bg-gradient-to-r from-red-500 to-teal-500 hover:from-teal-500 hover:to-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1"
            >
              Open App <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section
        className="min-h-screen flex items-center pt-16"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          backgroundColor: "#030712",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-teal-900/50 border border-teal-500/30 text-teal-300 text-sm font-medium px-4 py-2 rounded-full mb-8">
              <Zap className="w-4 h-4" />
              AI-Powered Sales Platform
            </div>

            {/* H1 */}
            <h1 className="text-5xl font-black text-white leading-tight mb-6">
              Find, Reach &amp; Close<br />
              <span className="bg-gradient-to-r from-red-400 to-teal-400 bg-clip-text text-transparent">
                Every Deal — On Autopilot
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-gray-400 text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
              Access 4.89M verified B2B contacts, automate multi-channel outreach, and close deals faster with AI-powered sequences.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={goToApp}
                className="bg-gradient-to-r from-red-500 to-teal-500 hover:from-teal-500 hover:to-red-500 text-white font-bold px-8 py-4 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-900/30"
              >
                Get Started Free <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={goToApp}
                className="border border-white/20 text-white hover:bg-white/5 font-semibold px-8 py-4 rounded-xl transition-all"
              >
                See How It Works
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/10 mt-16 pt-8">
              <div className="text-center">
                <div className="text-3xl font-black text-white">4.89M+</div>
                <div className="text-gray-400 text-sm mt-1">Contacts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-white">200+</div>
                <div className="text-gray-400 text-sm mt-1">Countries</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-white">98%</div>
                <div className="text-gray-400 text-sm mt-1">Delivery Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-white">6</div>
                <div className="text-gray-400 text-sm mt-1">Channels</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="bg-gray-900 border-b border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="flex-1 text-center py-6 md:py-0">
              <div className="text-4xl font-black text-white">4.89M+</div>
              <div className="text-gray-400 text-sm mt-1">Contacts</div>
            </div>
            <div className="flex-1 text-center py-6 md:py-0">
              <div className="text-4xl font-black text-white">30+</div>
              <div className="text-gray-400 text-sm mt-1">Countries</div>
            </div>
            <div className="flex-1 text-center py-6 md:py-0">
              <div className="text-4xl font-black text-white">16</div>
              <div className="text-gray-400 text-sm mt-1">Outreach Channels</div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES GRID */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Everything you need to close more deals</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">One platform to find leads, automate outreach, manage your pipeline, and track ROI.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4"><Search className="w-6 h-6 text-white" /></div>
              <h3 className="text-white font-bold text-lg mb-2">Lead Finder</h3>
              <p className="text-gray-400 text-sm leading-relaxed">4.89M verified B2B contacts with AI-powered filters and real-time lead scoring.</p>
            </div>
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4"><Target className="w-6 h-6 text-white" /></div>
              <h3 className="text-white font-bold text-lg mb-2">Campaign Automation</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Multi-step sequences across email, SMS, and LinkedIn — scheduled and sent automatically.</p>
            </div>
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4"><Briefcase className="w-6 h-6 text-white" /></div>
              <h3 className="text-white font-bold text-lg mb-2">Pipeline CRM</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Drag-and-drop kanban across 6 deal stages with win-rate analytics baked in.</p>
            </div>
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4"><Globe className="w-6 h-6 text-white" /></div>
              <h3 className="text-white font-bold text-lg mb-2">Multi-Language</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Reach prospects in 30+ countries with localized templates and regional compliance.</p>
            </div>
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4"><TrendingUp className="w-6 h-6 text-white" /></div>
              <h3 className="text-white font-bold text-lg mb-2">Analytics</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Referral ROI, funnel conversion rates, and per-channel performance in one dashboard.</p>
            </div>
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4"><Webhook className="w-6 h-6 text-white" /></div>
              <h3 className="text-white font-bold text-lg mb-2">Webhooks &amp; Integrations</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Connect to any tool via webhooks or native integrations — Zapier, Slack, HubSpot, and more.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Get from zero to closed deals in three steps</p>
          </div>
          <div className="relative flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-0 max-w-4xl mx-auto">
            {/* connector line — only on md+ */}
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-px bg-gradient-to-r from-red-500/30 via-teal-500/30 to-red-500/30" />
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center flex-1 px-6 relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-red-900/40 z-10">1</div>
              <h3 className="text-white font-bold text-xl mb-3">Find Leads</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Use AI filters to discover verified contacts from the 4.89M+ B2B database.</p>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center flex-1 px-6 relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-red-900/40 z-10">2</div>
              <h3 className="text-white font-bold text-xl mb-3">Launch Campaigns</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Send automated multi-channel sequences across email, SMS, and LinkedIn.</p>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center text-center flex-1 px-6 relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-red-900/40 z-10">3</div>
              <h3 className="text-white font-bold text-xl mb-3">Close Deals</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Track replies, manage deals in the pipeline, and measure revenue by channel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Loved by sales teams</h2>
            <p className="text-gray-400 text-lg">See what our customers are saying</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4">
              <div className="text-amber-400 text-xl tracking-wider">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p className="text-gray-300 text-sm leading-relaxed flex-1">
                "We went from 0 to 40 qualified meetings in 30 days."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  MT
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Marcus T.</div>
                  <div className="text-gray-500 text-xs">VP Sales, DataFlow Inc</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4">
              <div className="text-amber-400 text-xl tracking-wider">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p className="text-gray-300 text-sm leading-relaxed flex-1">
                "The Lead Finder alone is worth it. 4.89M contacts with real email addresses."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  SK
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Sarah K.</div>
                  <div className="text-gray-500 text-xs">Founder, NextLevel SaaS</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4">
              <div className="text-amber-400 text-xl tracking-wider">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
              <p className="text-gray-300 text-sm leading-relaxed flex-1">
                "Finally a CRM that actually does the outreach. Set it up in 20 minutes."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  JR
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">James R.</div>
                  <div className="text-gray-500 text-xs">CRO, Pinnacle Corp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when you need more</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-gray-950 border border-white/[0.08] rounded-2xl p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">Free</h3>
                <div className="text-gray-400 text-sm mb-4">Self-hosted</div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-white">$0</span>
                  <span className="text-gray-400 text-sm mb-2">/mo</span>
                </div>
                <div className="text-teal-400 text-sm font-semibold mt-1">Forever Free</div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["Unlimited leads & contacts", "Lead Finder with AI filters", "Campaign automation (email/SMS)", "Pipeline CRM — 6 deal stages", "Workflow automation builder", "Analytics & ROI dashboard", "Local SQLite database", "Full source code included"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={goToApp}
                className="w-full bg-gradient-to-r from-red-500 to-teal-500 hover:from-teal-500 hover:to-red-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro */}
            <div className="bg-gray-950 border border-teal-500/30 rounded-2xl p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-teal-600/30 text-teal-300 text-xs font-semibold px-3 py-1 rounded-full border border-teal-500/30">
                  Coming Soon
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">Pro</h3>
                <div className="text-gray-400 text-sm mb-4">Cloud-hosted</div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-white">$49</span>
                  <span className="text-gray-400 text-sm mb-2">/mo</span>
                </div>
                <div className="text-teal-400 text-sm font-semibold mt-1">Everything in Free, plus:</div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["Everything in Free", "Cloud-hosted — no setup", "Up to 10 team seats", "16 outreach channels", "Native Zapier & Slack integrations", "Webhook builder", "Multi-language templates", "Priority email support"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {proDone ? (
                <div className="text-center py-3 text-teal-400 text-sm font-semibold">You're on the list!</div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={proEmail}
                    onChange={e => setProEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500/50 placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => {
                      if (!proEmail) return;
                      fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: proEmail, plan: 'Pro' }) })
                        .then(() => setProDone(true));
                    }}
                    className="bg-gradient-to-r from-red-500 to-teal-500 text-white font-bold px-5 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Join Waitlist
                  </button>
                </div>
              )}
            </div>

            {/* Enterprise */}
            <div className="bg-gray-950 border border-white/[0.08] rounded-2xl p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">Enterprise</h3>
                <div className="text-gray-400 text-sm mb-4">For large teams</div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-black text-white">Custom</span>
                </div>
                <div className="text-gray-400 text-sm font-semibold mt-1">Volume pricing available</div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {["Everything in Pro", "Unlimited team seats", "Custom API integrations", "SSO / SAML login", "99.9% uptime SLA", "Dedicated account manager", "On-premise deployment option", "Custom contract & billing"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {enterpriseDone ? (
                <div className="text-center py-3 text-teal-400 text-sm font-semibold">We'll be in touch!</div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={enterpriseEmail}
                    onChange={e => setEnterpriseEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500/50 placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => {
                      if (!enterpriseEmail) return;
                      fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: enterpriseEmail, plan: 'Enterprise' }) })
                        .then(() => setEnterpriseDone(true));
                    }}
                    className="border border-white/20 hover:bg-white/5 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all whitespace-nowrap"
                  >
                    Contact Us
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-24 bg-gradient-to-r from-red-900 to-teal-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-white mb-4">
            Ready to build your pipeline?
          </h2>
          <p className="text-white/70 text-xl mb-10 max-w-2xl mx-auto">
            Join thousands of sales teams closing more deals with GlobalReach.
          </p>
          <button
            onClick={goToApp}
            className="bg-gradient-to-r from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 border border-white/30 text-white font-bold px-10 py-5 rounded-xl text-lg transition-all shadow-xl"
          >
            Get Started Free — It's Yours to Keep
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand column */}
            <div className="md:col-span-1">
              <img src="/logo-transparent.png" alt="GlobalReach" className="h-8 w-auto mb-3" />
              <p className="text-gray-500 text-sm leading-relaxed">The open-source sales OS for modern B2B teams.</p>
            </div>
            {/* Product */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                {["Features", "Pricing", "How It Works", "Changelog"].map(link => (
                  <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-3">
                {["About", "Blog", "Careers", "Contact"].map(link => (
                  <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(link => (
                  <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-gray-500 text-sm">&copy; 2026 GlobalReach. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
