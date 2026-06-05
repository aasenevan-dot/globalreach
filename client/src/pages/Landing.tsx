import { useState } from "react";
import { Search, Send, LayoutDashboard, Layers, GitBranch, BarChart3, Globe, Star, Check, ChevronRight, Users, Zap, Mail } from "lucide-react";

export default function Landing() {
  const goToApp = () => { window.location.hash = '#/'; };
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistDone, setWaitlistDone] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* STICKY NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-gray-900/95 backdrop-blur border-b border-white/10 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-teal-400" />
            <span className="font-bold text-lg text-white">GlobalReach</span>
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
              className="bg-gradient-to-r from-red-500 to-teal-500 hover:from-teal-500 hover:to-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1"
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
              <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
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
                className="bg-gradient-to-r from-red-500 to-teal-500 hover:from-teal-500 hover:to-blue-500 text-white font-bold px-8 py-4 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-900/30"
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

      {/* FEATURES */}
      <section className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Everything you need to close more deals
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              One platform to find leads, automate outreach, manage your pipeline, and track ROI.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Lead Finder */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Lead Finder</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                4.89M verified B2B contacts with AI-powered filters and lead scoring
              </p>
            </div>

            {/* Email Campaigns */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4">
                <Send className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Email Campaigns</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Multi-step sequences with real SMTP, open tracking, and reply detection
              </p>
            </div>

            {/* Sales Pipeline */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Sales Pipeline</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Drag-and-drop kanban across 6 deal stages with win rate analytics
              </p>
            </div>

            {/* Forms & Funnels */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Forms &amp; Funnels</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Build high-converting landing pages that auto-feed your CRM in real time
              </p>
            </div>

            {/* Workflow Automation */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Workflow Automation</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                No-code trigger &rarr; condition &rarr; action automations that run 24/7
              </p>
            </div>

            {/* Analytics & ROI */}
            <div className="bg-gray-900 border border-white/[0.08] rounded-2xl p-6 hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Analytics &amp; ROI</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Referral source ROI, funnel conversion rates, and channel performance
              </p>
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

          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-0 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center flex-1 px-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-red-900/40">
                1
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Find Leads</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Use AI filters to discover verified contacts from 4.89M+ database
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-start pt-7 flex-shrink-0">
              <ChevronRight className="w-8 h-8 text-teal-400/50" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center flex-1 px-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-red-900/40">
                2
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Automate Outreach</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Launch multi-step email/SMS/LinkedIn sequences automatically
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-start pt-7 flex-shrink-0">
              <ChevronRight className="w-8 h-8 text-teal-400/50" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center flex-1 px-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-teal-500 flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-red-900/40">
                3
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Close &amp; Track ROI</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Manage deals in pipeline and track referral source revenue
              </p>
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
                {["Unlimited leads", "All features included", "Local SQLite database", "No account needed", "Full source code"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={goToApp}
                className="w-full bg-gradient-to-r from-red-500 to-teal-500 hover:from-teal-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all"
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
                {["Cloud hosting", "Team seats", "Integrations", "Priority support"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {waitlistDone ? (
                <div className="text-center py-3 text-teal-400 text-sm font-semibold">You're on the list!</div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500/50 placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => {
                      if (!waitlistEmail) return;
                      fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: waitlistEmail, plan: 'Pro' }) })
                        .then(() => setWaitlistDone(true));
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
                {["Everything in Pro", "Custom integrations", "SLA guarantee", "Dedicated support", "On-premise option"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {waitlistDone ? (
                <div className="text-center py-3 text-teal-400 text-sm font-semibold">We'll be in touch!</div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-teal-500/50 placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => {
                      if (!waitlistEmail) return;
                      fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: waitlistEmail, plan: 'Enterprise' }) })
                        .then(() => setWaitlistDone(true));
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
      <footer className="bg-gray-950 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-teal-400" />
            <div>
              <span className="font-bold text-white">GlobalReach</span>
              <span className="text-gray-500 text-sm ml-2">The open-source sales OS</span>
            </div>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; 2025 GlobalReach. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
