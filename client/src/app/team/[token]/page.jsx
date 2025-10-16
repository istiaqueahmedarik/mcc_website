import {
  getCollectionPublicByToken,
  submitTeamChoices,
  myChoiceForToken,
  getParticipationState,
} from "@/actions/team_collection";
import { getVjudgeID } from "@/lib/action";
import { revalidatePath } from "next/cache";
import { TeamSelectForm } from "@/components/TeamSelectForm";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";

export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const { token } = await params;
  const res = await getCollectionPublicByToken(token);
  if (res?.error)
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 sm:p-6"
        style={{ background: "hsl(var(--profile-bg))" }}
      >
        <div className="profile-card max-w-md w-full text-center">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "hsl(var(--profile-danger) / 0.1)" }}
          >
            <svg
              className="w-10 h-10"
              style={{ color: "hsl(var(--profile-danger))" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 
            className="text-2xl font-bold mb-3"
            style={{ color: "hsl(var(--profile-text))" }}
          >
            Invalid Link
          </h2>
          <p style={{ color: "hsl(var(--profile-text-muted))" }}>
            This team selection link is invalid or has expired.
          </p>
        </div>
      </div>
    );

  const col = res.result;
  const existing = await myChoiceForToken(token);
  const myChoice = existing?.result || null;
  const me = await getVjudgeID();
  const myVj = me?.vjudge_id || null;
  const rank = Array.isArray(col.rankOrder) ? col.rankOrder : [];
  const performance = col.performance || {};
  const myIdx = myVj ? rank.indexOf(myVj) : -1;
  // Participation (explicit) state; if request fails treat as false
  let will_participate = false;
  try {
    const partRes = col.id ? await getParticipationState(col.id) : null;
    if (partRes && partRes.success) will_participate = !!partRes.result;
  } catch (e) {}
  const isParticipant = will_participate && myIdx >= 0;
  const phase = col.phase || (col.finalized ? 3 : col.is_open ? 2 : 1);

  // Only compute eligible list during phase 2 and if participant
  let eligible = [];
  if (phase === 2 && isParticipant) {
    eligible = rank.slice(myIdx + 1);
    const myEff = performance?.[myVj]?.effectiveSolved;
    if (typeof myEff === "number") {
      let within = eligible.filter((vj) => {
        const eff = performance?.[vj]?.effectiveSolved;
        return typeof eff === "number" && eff >= myEff - 5 && eff <= myEff + 5;
      });
      if (within.length < 5) {
        for (const vj of eligible) {
          if (within.length >= 5) break;
          if (!within.includes(vj)) within.push(vj);
        }
      }
      eligible = within;
    }
  }
  const UI_MIN = 2;
  const UI_MAX = 5;
  const SUBMIT_MIN = 5;
  const SUBMIT_MAX = 5;

  async function submit(formData) {
    "use server";
    const title = formData.get("team_title");
    const choices = (formData.get("choices") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const min = SUBMIT_MIN;
    const max = SUBMIT_MAX;
    const out = await submitTeamChoices(token, title, choices, min, max);
    revalidatePath(`/team/${token}`);
    return out;
  }

  const getStatusColor = () => {
    if (col.finalized) return "hsl(var(--profile-success))";
    if (col.is_open) return "hsl(var(--profile-primary))";
    return "hsl(var(--profile-text-muted))";
  };

  const getStatusBg = () => {
    if (col.finalized) return "hsl(var(--profile-success) / 0.1)";
    if (col.is_open) return "hsl(var(--profile-primary) / 0.1)";
    return "hsl(var(--profile-surface-2))";
  };

  const getStatusBorder = () => {
    if (col.finalized) return "hsl(var(--profile-success) / 0.3)";
    if (col.is_open) return "hsl(var(--profile-primary) / 0.3)";
    return "hsl(var(--profile-border))";
  };

  const getStatusIcon = () => {
    if (col.finalized)
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    if (col.is_open)
      return (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    return (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    );
  };

  // Phase specific banners
  const PhaseBanner = () => {
    if (phase === 1) {
      return (
        <div 
          className="rounded-2xl p-6 mb-6 border transition-all duration-300 hover:shadow-md"
          style={{ 
            background: "hsl(var(--profile-primary) / 0.05)",
            borderColor: "hsl(var(--profile-primary) / 0.2)"
          }}
        >
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
              style={{ background: "hsl(var(--profile-primary) / 0.15)" }}
            >
              <svg
                className="w-7 h-7"
                style={{ color: "hsl(var(--profile-primary))" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: "hsl(var(--profile-text))" }}
              >
                Participation Phase In Progress
              </h3>
              <p 
                className="text-sm leading-relaxed mb-3"
                style={{ color: "hsl(var(--profile-text-secondary))" }}
              >
                Admin has not started team selection yet. Toggle your
                participation from your profile page. Once Phase 2 starts, you
                can submit team preferences here.
              </p>
              {col.phase1_deadline && (
                <div className="flex items-center gap-2 text-xs">
                  <DeadlineCountdown
                    iso={col.phase1_deadline}
                    mode="participation"
                  />
                  <span style={{ color: "hsl(var(--profile-text-muted))" }}>
                    Ends {new Date(col.phase1_deadline).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (phase === 2 && !isParticipant) {
      return (
        <div 
          className="rounded-2xl p-6 mb-6 border transition-all duration-300 hover:shadow-md"
          style={{ 
            background: "hsl(var(--profile-warning) / 0.05)",
            borderColor: "hsl(var(--profile-warning) / 0.2)"
          }}
        >
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
              style={{ background: "hsl(var(--profile-warning) / 0.15)" }}
            >
              <svg
                className="w-7 h-7"
                style={{ color: "hsl(var(--profile-warning))" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: "hsl(var(--profile-text))" }}
              >
                You Are Not Participating
              </h3>
              <p 
                className="text-sm leading-relaxed"
                style={{ color: "hsl(var(--profile-text-secondary))" }}
              >
                You did not opt into this contest before selection began. You
                can view information but cannot submit choices.
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (phase === 2 && isParticipant && !col.is_open && !col.finalized) {
      return (
        <div 
          className="rounded-2xl p-6 mb-6 border transition-all duration-300 hover:shadow-md"
          style={{ 
            background: "hsl(var(--profile-warning) / 0.05)",
            borderColor: "hsl(var(--profile-warning) / 0.2)"
          }}
        >
          <div className="flex items-start gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
              style={{ background: "hsl(var(--profile-warning) / 0.15)" }}
            >
              <svg
                className="w-7 h-7"
                style={{ color: "hsl(var(--profile-warning))" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: "hsl(var(--profile-text))" }}
              >
                Selection Paused
              </h3>
              <p 
                className="text-sm leading-relaxed"
                style={{ color: "hsl(var(--profile-text-secondary))" }}
              >
                Admin temporarily closed submissions. Your existing preferences
                are saved.
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (phase === 3 && !col.finalized) {
      return null;
    }
    return null;
  };

  return (
    <div 
      className="min-h-screen"
      style={{ background: "hsl(var(--profile-bg))" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-block mb-4">
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto transition-transform duration-300 hover:scale-105"
              style={{ background: "hsl(var(--profile-primary) / 0.1)" }}
            >
              <svg 
                className="w-8 h-8 sm:w-10 sm:h-10"
                style={{ color: "hsl(var(--profile-primary))" }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          
          <h1 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 transition-colors duration-200"
            style={{ color: "hsl(var(--profile-text))" }}
          >
            Team Selection
          </h1>
          
          <p 
            className="text-lg sm:text-xl mb-6 max-w-2xl mx-auto"
            style={{ color: "hsl(var(--profile-text-secondary))" }}
          >
            {col.title || "Room"}
          </p>

          {/* Status Badge */}
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all duration-300 hover:scale-105"
            style={{
              background: getStatusBg(),
              color: getStatusColor(),
              borderColor: getStatusBorder(),
            }}
          >
            {getStatusIcon()}
            {col.finalized
              ? "Finalized"
              : col.is_open
              ? "Open for Selection"
              : "Closed"}
          </div>
        </div>

        <PhaseBanner />

        {/* Current Submission Display */}
        {myChoice && (
          <div className="profile-card mb-6 sm:mb-8 transition-all duration-300 hover:shadow-lg">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110"
                style={{ background: "hsl(var(--profile-success) / 0.15)" }}
              >
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7"
                  style={{ color: "hsl(var(--profile-success))" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6"
                  style={{ color: "hsl(var(--profile-text))" }}
                >
                  Your Current Submission
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span 
                      className="text-sm font-semibold min-w-[110px]"
                      style={{ color: "hsl(var(--profile-text-secondary))" }}
                    >
                      Team Title:
                    </span>
                    <span 
                      className="font-bold px-4 py-2 rounded-xl text-sm sm:text-base break-all"
                      style={{ 
                        background: "hsl(var(--profile-primary) / 0.1)",
                        color: "hsl(var(--profile-primary))"
                      }}
                    >
                      {myChoice.team_title}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                    <span 
                      className="text-sm font-semibold min-w-[110px] mt-1"
                      style={{ color: "hsl(var(--profile-text-secondary))" }}
                    >
                      Choices:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(myChoice.ordered_choices)
                        ? myChoice.ordered_choices.map((choice, index) => (
                            <span
                              key={choice}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105"
                              style={{ 
                                background: "hsl(var(--profile-surface-2))",
                                color: "hsl(var(--profile-primary))",
                                border: "1px solid hsl(var(--profile-border))"
                              }}
                            >
                              {index + 1}. {choice}
                            </span>
                          ))
                        : null}
                    </div>
                  </div>
                </div>
                <p 
                  className="text-xs sm:text-sm mt-4 sm:mt-6 px-4 py-3 rounded-xl"
                  style={{ 
                    background: "hsl(var(--profile-surface-2))",
                    color: "hsl(var(--profile-text-muted))"
                  }}
                >
                  💡 You can resubmit to update your choices while the
                  collection remains open.
                </p>
              </div>
            </div>
          </div>
        )}

        {phase === 2 && col.is_open && !col.finalized && isParticipant && (
          <TeamSelectForm
            submitAction={submit}
            myChoice={myChoice}
            isParticipant={isParticipant}
            eligible={eligible}
            performance={performance}
            UI_MIN={UI_MIN}
            UI_MAX={UI_MAX}
            SUBMIT_MIN={SUBMIT_MIN}
            SUBMIT_MAX={SUBMIT_MAX}
            token={token}
          />
        )}
        {phase === 2 && isParticipant && !col.is_open && !col.finalized && (
          <p 
            className="text-center text-sm"
            style={{ color: "hsl(var(--profile-text-muted))" }}
          >
            Waiting for admin to reopen or finalize.
          </p>
        )}
      </div>
    </div>
  );
}
