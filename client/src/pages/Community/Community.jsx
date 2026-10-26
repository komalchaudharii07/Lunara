import { useEffect, useRef, useState } from "react";
import {
  getPosts,
  createPost,
  togglePostLike,
  deletePost,
  reportPost,
} from "../../services/api";

const categories = [
  "All",
  "Periods",
  "PCOS & PCOD",
  "Pregnancy",
  "Wellness",
];

const REPORT_REASONS = [
  ["spam", "Spam"],
  ["harassment", "Harassment"],
  ["misinformation", "Misinformation"],
  ["self-harm", "Self-harm concern"],
  ["other", "Other"],
];

const emptyForm = {
  category: "Periods",
  title: "",
  content: "",
  anonymous: true,
};

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [reportingId, setReportingId] = useState(null);

  const likingRef = useRef(new Set());

  // ignores answers that arrive after the person picked another category
  const postsRequest = useRef(0);

  // FETCH POSTS (the category filter is applied by the server)
  const loadPosts = async (category) => {
    const mine = ++postsRequest.current;
    try {
      setLoading(true);
      setError("");

      const data = await getPosts(category === "All" ? {} : { category });
      if (mine === postsRequest.current) setPosts(data.posts || []);
    } catch (err) {
      if (mine === postsRequest.current) setError(err.message);
    } finally {
      if (mine === postsRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(activeCategory);
  }, [activeCategory]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // CREATE POST
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      setError("Please enter a title and post content.");
      return;
    }

    try {
      setPosting(true);
      setError("");

      const data = await createPost(form);

      // add the new post to the top without reloading the list
      if (activeCategory === "All" || data.post.category === activeCategory) {
        setPosts((current) => [data.post, ...current]);
      }

      setCrisis(!!data.crisis);
      setForm(emptyForm);
      setShowComposer(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  // LIKE / UNLIKE
  const handleLike = async (postId) => {
    // ignore double clicks while a request for this post is running
    if (likingRef.current.has(postId)) return;
    likingRef.current.add(postId);

    try {
      const data = await togglePostLike(postId);

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likesCount: data.likesCount,
                liked: data.liked,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      likingRef.current.delete(postId);
    }
  };

  // DELETE MY POST
  const handleDelete = async (postId) => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;

    try {
      setError("");
      await deletePost(postId);
      setPosts((current) => current.filter((post) => post._id !== postId));
    } catch (err) {
      setError(err.message);
    }
  };

  // REPORT A POST
  const handleReport = async (postId, reason) => {
    try {
      setError("");
      const data = await reportPost(postId, reason);
      setReportingId(null);
      setNotice(data.message || "Thank you. Our team will review this post.");
      if (reason === "self-harm") setCrisis(true);
    } catch (err) {
      setReportingId(null);
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#df829b]">
            A safe space for women
          </p>

          <h1 className="mt-1 font-serif text-4xl font-semibold text-[#292331]">
            Community
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Connect, share experiences, and learn from other women
            in a supportive and respectful space.
          </p>
        </div>

        <button
          aria-expanded={showComposer}
          onClick={() => {
            setShowComposer(!showComposer);
            setError("");
          }}
          className="h-11 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white transition hover:bg-[#d97d96]"
        >
          {showComposer ? "Cancel" : "+ Create Post"}
        </button>
      </div>

      {/* COMMUNITY GUIDELINES */}
      <p className="mb-5 rounded-2xl bg-white px-5 py-3 text-xs leading-5 text-gray-500">
        Be kind and respectful. Posts here are from other members, not doctors,
        so don't treat them as medical advice. Never share phone numbers or
        addresses. You can report any post that worries you.
      </p>

      {/* CRISIS SUPPORT (shown after a sensitive post or report) */}
      {crisis && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-[#f3c9d4] bg-[#fff0f3] px-5 py-4 text-sm leading-6 text-[#7e4053]"
        >
          <p className="font-semibold">You are not alone.</p>
          <p className="mt-1">
            If you are thinking about hurting yourself, please talk to someone
            right now: call Tele-MANAS at <strong>14416</strong>, or call{" "}
            <strong>112</strong> for emergency help.
          </p>
          <button
            type="button"
            onClick={() => setCrisis(false)}
            className="mt-2 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* CREATE POST */}
      {showComposer && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)]"
        >
          <h2 className="text-lg font-semibold text-[#292331]">
            Share with the community
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            Share your thoughts or experiences with others.
          </p>

          <div className="mt-5">
            <label
              htmlFor="category"
              className="mb-2 block text-sm font-medium text-[#292331]"
            >
              Category
            </label>

            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="h-12 w-full rounded-xl border border-[#eadde1] bg-white px-4 text-sm outline-none focus:border-[#e58da4]"
            >
              {categories.slice(1).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-[#292331]"
            >
              Title
            </label>

            <input
              id="title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Give your post a title"
              maxLength={150}
              required
              className="h-12 w-full rounded-xl border border-[#eadde1] px-4 text-sm outline-none focus:border-[#e58da4]"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="content"
              className="mb-2 block text-sm font-medium text-[#292331]"
            >
              Your post
            </label>

            <textarea
              id="content"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="What's on your mind?"
              rows="4"
              maxLength={2000}
              required
              className="w-full resize-none rounded-xl border border-[#eadde1] p-4 text-sm outline-none focus:border-[#e58da4]"
            />
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-500">
              <input
                type="checkbox"
                name="anonymous"
                checked={form.anonymous}
                onChange={handleChange}
                className="accent-[#e58da4]"
              />
              Post anonymously
            </label>

            <button
              type="submit"
              disabled={posting}
              className="rounded-xl bg-[#e58da4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d97d96] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      )}

      {/* NOTICE */}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-[#f0faf3] px-4 py-3 text-sm text-green-600"
        >
          {notice}
        </p>
      )}

      {/* ERROR */}
      {error && (
        <p role="alert" className="mb-5 text-sm text-red-500">
          {error}
        </p>
      )}

      {/* CATEGORIES */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setActiveCategory(category);
              setNotice("");
              setReportingId(null);
            }}
            aria-pressed={activeCategory === category}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCategory === category
                ? "bg-[#e58da4] text-white"
                : "bg-white text-gray-500 hover:bg-[#fdf1f4]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="rounded-3xl bg-white p-10 text-center">
          <p className="text-sm text-gray-400">
            Loading community posts...
          </p>
        </div>
      )}

      {/* POSTS */}
      {!loading && (
        <div className="space-y-5">
          {posts.map((post) => (
            <article
              key={post._id}
              className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(170,95,120,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#292331]">
                    {post.anonymous
                      ? "Anonymous"
                      : post.user?.name || "User"}
                  </p>

                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <span className="rounded-full bg-[#fdf1f4] px-3 py-1 text-xs font-medium text-[#d77f97]">
                  {post.category}
                </span>
              </div>

              <h2 className="mt-5 text-lg font-semibold text-[#292331]">
                {post.title}
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-500">
                {post.content}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-[#f2e8eb] pt-4">
                <button
                  onClick={() => handleLike(post._id)}
                  aria-pressed={post.liked}
                  className={`text-sm transition hover:text-[#df829b] ${
                    post.liked ? "text-[#df829b]" : "text-gray-500"
                  }`}
                >
                  {post.liked ? "♥" : "♡"} {post.likesCount ?? 0} Likes
                </button>

                {post.isOwner ? (
                  <button
                    onClick={() => handleDelete(post._id)}
                    className="text-sm text-gray-400 transition hover:text-red-500"
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setReportingId(reportingId === post._id ? null : post._id)
                    }
                    aria-expanded={reportingId === post._id}
                    className="text-sm text-gray-400 transition hover:text-[#df829b]"
                  >
                    Report
                  </button>
                )}
              </div>

              {reportingId === post._id && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-400">Why?</span>
                  {REPORT_REASONS.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => handleReport(post._id, value)}
                      className="rounded-full border border-[#eadde1] px-3 py-1 text-xs text-gray-500 transition hover:border-[#e58da4]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}

          {posts.length === 0 && (
            <div className="rounded-3xl bg-white p-10 text-center">
              <p className="text-sm text-gray-400">
                No posts in this category yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}