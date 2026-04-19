import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../components/AuthContext";
import { apiFetch } from "../lib/api";

interface FeedbackItem {
  _id: string;
  message: string;
  type: "feedback" | "bug";
  status: "new" | "read" | "replied";
  adminReply?: string;
  adminRepliedAt?: string;
  createdAt: string;
}

export default function OwnerFeedbackPage() {
  const { restaurant, token } = useAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"feedback" | "bug">("feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchFeedback = useCallback(async () => {
    if (!restaurant?._id || !token) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: FeedbackItem[] }>(
        `/api/restaurants/${restaurant._id}/feedback`,
        { token },
      );
      setItems(data.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [restaurant?._id, token]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!restaurant?._id || !token || !message.trim()) return;
    setSending(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch(`/api/restaurants/${restaurant._id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ type, message: message.trim() }),
        token,
      });
      setSuccess(true);
      setMessage("");
      fetchFeedback();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Feedback / Bug reports
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Send feedback or report a bug. The platform admin can see your
          messages and reply here.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Send new</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Type
            </label>
            <div className="mt-1 flex gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="feedbackType"
                  checked={type === "feedback"}
                  onChange={() => setType("feedback")}
                  className="rounded-full border-slate-300 text-slate-900"
                />
                <span className="text-sm">Feedback</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="feedbackType"
                  checked={type === "bug"}
                  onChange={() => setType("bug")}
                  className="rounded-full border-slate-300 text-slate-900"
                />
                <span className="text-sm">Bug report</span>
              </label>
            </div>
          </div>
          <div>
            <label
              htmlFor="feedback-message"
              className="block text-xs font-medium text-slate-700"
            >
              Message
            </label>
            <textarea
              id="feedback-message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback or the bug you encountered…"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && (
            <p className="text-sm font-medium text-emerald-600">
              Thank you! Your message has been sent.
            </p>
          )}
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Your feedback
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            All messages you sent. Status shows whether support has seen or
            replied.
          </p>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">
              No feedback sent yet. Use the form above to send your first
              message.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item._id}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={
                        item.type === "bug"
                          ? "rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800"
                          : "rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700"
                      }
                    >
                      {item.type === "bug" ? "Bug" : "Feedback"}
                    </span>
                    <span
                      className={
                        (item.status ?? "new") === "replied"
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800"
                          : (item.status ?? "new") === "read"
                            ? "rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800"
                            : "rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800"
                      }
                    >
                      {(item.status ?? "new") === "new"
                        ? "New"
                        : (item.status ?? "new") === "read"
                          ? "Seen"
                          : "Replied"}
                    </span>
                    <span className="text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {item.message}
                  </p>
                  {(item.status ?? "new") === "replied" && item.adminReply && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
                      <p className="text-xs font-medium text-emerald-800">
                        Reply from support
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {item.adminReply}
                      </p>
                      {item.adminRepliedAt && (
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(item.adminRepliedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
