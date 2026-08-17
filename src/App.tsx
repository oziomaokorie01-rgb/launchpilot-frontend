import { useState } from "react";
import "./App.css";

const API_BASE = "https://launchpilot-backend.onrender.com";
  
type AppForm = {
  name: string;
  url: string;
  description: string;
  audience: string;
  goal: string;
};

type SavedApp = AppForm & {
  id: number;
};

type Mission = {
  id: number;
  order: number;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  status: string;
  completed: boolean;
};

type Campaign = {
  id: number;
  channel: string;
  title: string;
  content: string;
  tracking_code: string;
};

type CampaignAnalytics = {
  campaign_id: number;
  channel: string;
  title: string;
  tracking_code: string;
  clicks: number;
};

type CreatorOpportunity = {
  id: number;
  name: string;
  platform: string;
  url: string;
  description: string;
  relevance_score: number;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  why_match: string;
  recommended_action: string;
  matched_queries: string[];
};

type OutreachResult = {
  opportunity_id: number;
  app_name: string;
  type: string;
  platform: string;
  target: string;
  message: string;
};

type Screen = "landing" | "form" | "workspace";

function App() {
  const [screen, setScreen] = useState<Screen>("landing");

  const [form, setForm] = useState<AppForm>({
    name: "",
    url: "",
    description: "",
    audience: "",
    goal: "",
  });

  const [savedApp, setSavedApp] = useState<SavedApp | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);

  const [analytics, setAnalytics] = useState<CampaignAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [creators, setCreators] = useState<CreatorOpportunity[]>([]);
  const [creatorLoading, setCreatorLoading] = useState(false);

  const [outreach, setOutreach] = useState<
    Record<number, OutreachResult>
  >({});

  const [outreachLoadingId, setOutreachLoadingId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof AppForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function formatNumber(value: number) {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }

    return String(value);
  }

  async function loadAnalytics(appId?: number) {
    const id = appId ?? savedApp?.id;

    if (!id) return;

    setAnalyticsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/apps/${id}/analytics`
      );

      if (!response.ok) {
        throw new Error("Could not load analytics.");
      }

      const data = await response.json();

      setAnalytics(data.campaigns ?? []);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function generateCampaigns() {
    if (!savedApp) return;

    setCampaignLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/apps/${savedApp.id}/generate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Could not generate campaigns.");
      }

      const data = await response.json();

      setCampaigns(data.campaigns ?? []);

      await loadAnalytics(savedApp.id);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Campaign generation failed."
      );
    } finally {
      setCampaignLoading(false);
    }
  }

  async function discoverCreators() {
    if (!savedApp) return;

    setCreatorLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/apps/${savedApp.id}/discover/youtube`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Could not discover creators.");
      }

      const data = await response.json();

      setCreators(data.creators ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Creator discovery failed."
      );
    } finally {
      setCreatorLoading(false);
    }
  }

  async function generateOutreach(opportunityId: number) {
    setOutreachLoadingId(opportunityId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/api/opportunities/${opportunityId}/outreach`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Could not generate outreach.");
      }

      const data = await response.json();

      setOutreach((current) => ({
        ...current,
        [opportunityId]: data,
      }));
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Outreach generation failed."
      );
    } finally {
      setOutreachLoadingId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const appResponse = await fetch(`${API_BASE}/api/apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!appResponse.ok) {
        throw new Error("Could not create your app.");
      }

      const appData = await appResponse.json();

      const roadmapResponse = await fetch(
        `${API_BASE}/api/apps/${appData.id}/roadmap`,
        {
          method: "POST",
        }
      );

      if (!roadmapResponse.ok) {
        throw new Error(
          "App created, but roadmap generation failed."
        );
      }

      const roadmapData = await roadmapResponse.json();

      setSavedApp({
        id: appData.id,
        name: appData.name,
        url: appData.url,
        description: appData.description,
        audience: appData.audience,
        goal: appData.goal,
      });

      setMissions(roadmapData.missions ?? []);

      setCampaigns([]);
      setAnalytics([]);
      setCreators([]);
      setOutreach({});

      setScreen("workspace");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <nav className="nav">
        <button
          className="logo-button"
          onClick={() => setScreen("landing")}
        >
          LaunchPilot
        </button>

        <span className="badge">HackOnVibe 2026</span>
      </nav>

      {screen === "landing" && (
        <>
          <section className="hero">
            <p className="eyebrow">
              AI DISTRIBUTION AGENT
            </p>

            <h1>
              Launch your app.
              <br />
              Find your <span>first users.</span>
            </h1>

            <p className="description">
              LaunchPilot builds your promotion roadmap,
              finds distribution opportunities, creates
              measurable campaigns, and helps you learn
              what actually brings users.
            </p>

            <button
              className="primary-button"
              onClick={() => setScreen("form")}
            >
              Build My Launch Plan
            </button>
          </section>

          <section className="flow">
            <div>
              <strong>01</strong>
              <h3>Understand your product</h3>
              <p>
                Tell LaunchPilot what you built, who it is
                for, and what you want to achieve.
              </p>
            </div>

            <div>
              <strong>02</strong>
              <h3>Find distribution</h3>
              <p>
                Discover campaigns, creators and other
                paths to your target users.
              </p>
            </div>

            <div>
              <strong>03</strong>
              <h3>Track what works</h3>
              <p>
                Measure campaign traffic and use the
                results to choose your next move.
              </p>
            </div>
          </section>
        </>
      )}

      {screen === "form" && (
        <section className="form-page">
          <button
            className="back-button"
            onClick={() => setScreen("landing")}
          >
            Back
          </button>

          <div className="form-header">
            <p className="eyebrow">
              START YOUR LAUNCH
            </p>

            <h2>What did you build?</h2>

            <p>
              LaunchPilot will use this information to
              create your first distribution roadmap.
            </p>
          </div>

          <form
            className="app-form"
            onSubmit={handleSubmit}
          >
            <label>
              App name
              <input
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value
                  )
                }
                placeholder="Nayssa"
                required
              />
            </label>

            <label>
              App URL
              <input
                type="url"
                value={form.url}
                onChange={(event) =>
                  updateField(
                    "url",
                    event.target.value
                  )
                }
                placeholder="https://yourapp.com"
                required
              />
            </label>

            <label>
              What does your app do?
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                placeholder="AI study assistant that turns PDFs and notes into summaries, flashcards, quizzes and tutoring."
                required
              />
            </label>

            <label>
              Who is it for?
              <input
                value={form.audience}
                onChange={(event) =>
                  updateField(
                    "audience",
                    event.target.value
                  )
                }
                placeholder="University students"
                required
              />
            </label>

            <label>
              What is your launch goal?
              <input
                value={form.goal}
                onChange={(event) =>
                  updateField(
                    "goal",
                    event.target.value
                  )
                }
                placeholder="Get my first 100 users"
                required
              />
            </label>

            {error && (
              <p className="error-message">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="primary-button submit-button"
              disabled={loading}
            >
              {loading
                ? "Building launch plan..."
                : "Build My Launch Plan"}
            </button>
          </form>
        </section>
      )}

      {screen === "workspace" && savedApp && (
        <section className="workspace">
          <header className="workspace-header">
            <div>
              <p className="eyebrow">
                LAUNCH WORKSPACE
              </p>

              <h2>{savedApp.name}</h2>

              <p className="workspace-description">
                {savedApp.description}
              </p>
            </div>

            <div className="goal-card">
              <span>Launch goal</span>
              <strong>{savedApp.goal}</strong>
            </div>
          </header>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <div className="workspace-grid">
            <section className="roadmap-panel">
              <div className="section-heading">
                <div>
                  <p className="section-label">
                    YOUR ROADMAP
                  </p>

                  <h3>
                    Path to your first users
                  </h3>
                </div>

                <span>
                  {missions.length} missions
                </span>
              </div>

              <div className="mission-list">
                {missions.map((mission) => (
                  <article
                    className="mission-card"
                    key={mission.id}
                  >
                    <div className="mission-number">
                      {String(
                        mission.order
                      ).padStart(2, "0")}
                    </div>

                    <div className="mission-content">
                      <div className="mission-top">
                        <h4>
                          {mission.title}
                        </h4>

                        <span
                          className={`mission-status ${
                            mission.completed
                              ? "complete"
                              : "pending"
                          }`}
                        >
                          {mission.completed
                            ? "Completed"
                            : mission.status}
                        </span>
                      </div>

                      <p>
                        {mission.description}
                      </p>

                      <div className="mission-progress">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${
                                mission.target > 0
                                  ? Math.min(
                                      (mission.progress /
                                        mission.target) *
                                        100,
                                      100
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <span>
                          {mission.progress}/
                          {mission.target}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="side-panel">
              <div className="next-action-card">
                <p className="section-label">
                  NEXT ACTION
                </p>

                <h3>
                  Test your positioning
                </h3>

                <p>
                  Start with a few measurable
                  campaigns before scaling
                  distribution.
                </p>

                <button
                  className="primary-button"
                  onClick={generateCampaigns}
                  disabled={campaignLoading}
                >
                  {campaignLoading
                    ? "Generating..."
                    : "Generate Campaigns"}
                </button>
              </div>

              <div className="audience-card">
                <span>
                  Target audience
                </span>

                <strong>
                  {savedApp.audience}
                </strong>
              </div>

              <div className="status-card">
                <span className="live-dot" />
                Backend connected
              </div>
            </aside>
          </div>

          {campaigns.length > 0 && (
            <section className="campaign-section">
              <div className="section-heading campaign-heading">
                <div>
                  <p className="section-label">
                    CONTENT EXPERIMENTS
                  </p>

                  <h3>
                    Your first campaigns
                  </h3>
                </div>

                <div className="analytics-controls">
                  <span>
                    {campaigns.length} generated
                  </span>

                  <button
                    className="refresh-button"
                    onClick={() =>
                      loadAnalytics()
                    }
                    disabled={
                      analyticsLoading
                    }
                  >
                    {analyticsLoading
                      ? "Refreshing..."
                      : "Refresh Analytics"}
                  </button>
                </div>
              </div>

              <div className="campaign-grid">
                {campaigns.map((campaign) => {
                  const trackingUrl =
                    `${API_BASE}/r/${campaign.tracking_code}`;

                  const campaignStats =
                    analytics.find(
                      (item) =>
                        item.campaign_id ===
                        campaign.id
                    );

                  const clicks =
                    campaignStats?.clicks ?? 0;

                  return (
                    <article
                      key={campaign.id}
                      className="campaign-card"
                    >
                      <div className="campaign-top">
                        <span className="channel-badge">
                          {campaign.channel}
                        </span>

                        <span className="tracking-label">
                          {clicks}{" "}
                          {clicks === 1
                            ? "click"
                            : "clicks"}
                        </span>
                      </div>

                      <h4>
                        {campaign.title}
                      </h4>

                      <p className="campaign-content">
                        {campaign.content}
                      </p>

                      <div className="tracking-box">
                        <span>
                          Tracking link
                        </span>

                        <code>
                          {trackingUrl}
                        </code>
                      </div>

                      <div className="campaign-actions">
                        <button
                          className="secondary-button"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `${campaign.content}\n\n${trackingUrl}`
                            )
                          }
                        >
                          Copy Campaign
                        </button>

                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="link-button"
                        >
                          Preview Tracked Visit
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <section className="creator-section">
            <div className="section-heading">
              <div>
                <p className="section-label">
                  CREATOR DISCOVERY
                </p>

                <h3>
                  Find people who already reach
                  your users
                </h3>
              </div>

              <button
                className="primary-button"
                onClick={discoverCreators}
                disabled={creatorLoading}
              >
                {creatorLoading
                  ? "Searching YouTube..."
                  : creators.length > 0
                  ? "Refresh Creators"
                  : "Find Creators"}
              </button>
            </div>

            {creators.length === 0 ? (
              <div className="empty-state">
                <p>
                  LaunchPilot can search YouTube
                  for creators whose audiences
                  overlap with{" "}
                  <strong>
                    {savedApp.audience}
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <div className="creator-grid">
                {creators.map(
                  (creator, index) => (
                    <article
                      className="creator-card"
                      key={creator.id}
                    >
                      <div className="creator-top">
                        <div>
                          <span className="creator-rank">
                            #{index + 1}
                          </span>

                          <h4>
                            {creator.name}
                          </h4>
                        </div>

                        <div className="match-score">
                          {
                            creator.relevance_score
                          }
                          %
                        </div>
                      </div>

                      <div className="creator-stats">
                        <span>
                          {formatNumber(
                            creator.subscriber_count
                          )}{" "}
                          subscribers
                        </span>

                        <span>
                          {creator.video_count}{" "}
                          videos
                        </span>

                        <span>
                          {formatNumber(
                            creator.view_count
                          )}{" "}
                          views
                        </span>
                      </div>

                      <p className="creator-description">
                        {creator.description ||
                          "No channel description available."}
                      </p>

                      <div className="creator-insight">
                        <span>
                          Why this match
                        </span>

                        <p>
                          {creator.why_match}
                        </p>
                      </div>

                      <div className="creator-actions">
                        <a
                          href={creator.url}
                          target="_blank"
                          rel="noreferrer"
                          className="secondary-button creator-link"
                        >
                          View Channel
                        </a>

                        <button
                          className="primary-button"
                          onClick={() =>
                            generateOutreach(
                              creator.id
                            )
                          }
                          disabled={
                            outreachLoadingId ===
                            creator.id
                          }
                        >
                          {outreachLoadingId ===
                          creator.id
                            ? "Generating..."
                            : "Generate Outreach"}
                        </button>
                      </div>

                      {outreach[creator.id] && (
                        <div className="outreach-box">
                          <div className="outreach-heading">
                            <span>
                              Suggested Outreach
                            </span>

                            <button
                              className="copy-outreach-button"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  outreach[
                                    creator.id
                                  ].message
                                )
                              }
                            >
                              Copy
                            </button>
                          </div>

                          <p>
                            {
                              outreach[creator.id]
                                .message
                            }
                          </p>
                        </div>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

export default App;