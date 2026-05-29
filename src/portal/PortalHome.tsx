// src/portal/PortalHome.tsx
//
// Refreshed portal home dashboard. Pulls everything from client_portal_overview
// in one call and renders the welcome block + four stat cards + recent tours.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MessageSquare, BarChart3, Heart, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase"; // TODO: adjust import path

interface OverviewResponse {
  ok: boolean;
  client: { id: string; name: string; client_type: string };
  agent: { name: string | null; email: string | null } | null;
  counts: {
    saved_properties: number;
    favorites: number;
    cmas: number;
    documents: { total: number; signed: number; unsigned: number };
    tour_requests: { pending: number; confirmed: number };
    war_rooms: number;
  };
  recent: {
    saved_properties: unknown[];
    cmas: { property_address?: string }[];
    tour_requests: TourRow[];
  };
}

interface TourRow {
  id: string;
  property_address: string;
  property_photo_url?: string;
  preferred_date?: string;
  preferred_time?: string;
  scheduled_at?: string;
  status: string;
}

export default function PortalHome() {
  const navigate = useNavigate();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) {
          navigate("/");
          return;
        }
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client_portal_overview`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json.error || "Could not load portal");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) return <div className="text-[#91a1ba] text-sm">Loading your portal…</div>;
  if (error || !data) return <div className="text-red-600 text-sm">Could not load: {error}</div>;

  const firstName = data.client.name.split(" ")[0];
  const agentLabel = data.agent?.name ?? "your agent";

  return (
    <div>
      {/* Welcome */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#91a1ba] mb-3">
          Welcome
        </div>
        <h1 className="font-['Playfair_Display',Georgia,serif] text-5xl text-[#1a1f2e] leading-tight">
          Hi, {firstName}.
        </h1>
        <p className="mt-4 text-[#353535] text-base">
          You're working with <span className="font-medium text-[#1a1f2e]">{agentLabel}</span>.
          Here's where everything stands.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard
          icon={Calendar}
          label="Tour requests"
          headline={
            data.counts.tour_requests.confirmed > 0
              ? `${data.counts.tour_requests.confirmed} confirmed`
              : data.counts.tour_requests.pending > 0
              ? `${data.counts.tour_requests.pending} pending`
              : "None scheduled"
          }
          subline="View full schedule"
          onClick={() => navigate("/portal/schedule")}
        />
        <StatCard
          icon={MessageSquare}
          label="Messages"
          headline={data.counts.war_rooms > 0 ? "All caught up" : "No rooms yet"}
          subline={`${data.counts.war_rooms} room${data.counts.war_rooms === 1 ? "" : "s"} open`}
          onClick={() => navigate("/portal/war-room")}
        />
        <StatCard
          icon={BarChart3}
          label="Market analyses"
          headline={
            data.counts.cmas > 0
              ? `${data.counts.cmas} CMA${data.counts.cmas === 1 ? "" : "s"} ready`
              : "None yet"
          }
          subline={data.recent.cmas[0]?.property_address || ""}
          onClick={() => navigate("/portal/cmas")}
        />
        <StatCard
          icon={Heart}
          label="Saved properties"
          headline={`${data.counts.saved_properties} saved`}
          subline={`${data.counts.favorites} favorites`}
          onClick={() => navigate("/portal/saved")}
        />
      </div>

      {/* Recent tour requests */}
      {data.recent.tour_requests.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#91a1ba]">
              Your tour requests
            </h2>
            <button
              onClick={() => navigate("/portal/schedule")}
              className="text-xs text-[#1a1f2e] hover:underline flex items-center gap-1"
            >
              See all <ArrowRight size={12} />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {data.recent.tour_requests.slice(0, 3).map((t) => (
              <TourRow key={t.id} tour={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  headline,
  subline,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  headline: string;
  subline?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white border border-[#e8e3d8] rounded-2xl p-6 hover:border-[#91a1ba] transition-colors"
    >
      <Icon size={22} className="text-[#91a1ba] group-hover:text-[#1a1f2e] mb-6" />
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#91a1ba] mb-2">{label}</div>
      <div className="font-['Playfair_Display',Georgia,serif] text-2xl text-[#1a1f2e] mb-1">
        {headline}
      </div>
      {subline && <div className="text-sm text-[#91a1ba]">{subline}</div>}
    </button>
  );
}

function TourRow({ tour }: { tour: TourRow }) {
  const dateLabel = tour.scheduled_at
    ? new Date(tour.scheduled_at).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : tour.preferred_date
    ? `${tour.preferred_date}${tour.preferred_time ? " · " + tour.preferred_time : ""}`
    : "TBD";

  const statusClasses =
    tour.status === "confirmed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tour.status === "cancelled"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-[#f5f3ee] text-[#1a1f2e] border-[#e8e3d8]";

  return (
    <div className="bg-white border border-[#e8e3d8] rounded-xl p-4 flex items-center gap-4">
      {tour.property_photo_url ? (
        <img
          src={tour.property_photo_url}
          alt=""
          className="w-16 h-16 rounded-lg object-cover bg-[#f5f3ee]"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-[#f5f3ee]" />
      )}
      <div className="flex-1">
        <div className="font-medium text-[#1a1f2e]">{tour.property_address}</div>
        <div className="text-sm text-[#91a1ba] mt-1 flex items-center gap-2">
          <Calendar size={14} />
          {dateLabel}
        </div>
      </div>
      <div className={`text-[10px] tracking-wider uppercase px-2 py-1 rounded border ${statusClasses}`}>
        {(tour.status || "").toUpperCase()}
      </div>
    </div>
  );
}
