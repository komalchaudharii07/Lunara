import { useEffect, useState } from "react";
import {
  getPosts,
  createPost,
  togglePostLike,
} from "../../services/api";

const categories = [
  "All",
  "Periods",
  "PCOS & PCOD",
  "Pregnancy",
  "Wellness",
];

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");

  const [showComposer, setShowComposer] = useState(false);

  const [form, setForm] = useState({
    category: "Periods",
    title: "",
    content: "",
    anonymous: true,
  });

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  // FETCH POSTS
  const loadPosts = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error("Please login again.");
      }

      const data = await getPosts(token);

      setPosts(data.posts || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // FORM CHANGE
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
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

      const token = getToken();

      if (!token) {
        throw new Error("Please login again.");
      }

      await createPost(form, token);

      setForm({
        category: "Periods",
        title: "",
        content: "",
        anonymous: true,
      });

      setShowComposer(false);

      await loadPosts();
    } catch (error) {
      setError(error.message);
    } finally {
      setPosting(false);
    }
  };

  // LIKE
  const handleLike = async (postId) => {
    try {
      const token = getToken();

      if (!token) {
        throw new Error("Please login again.");
      }

      const data = await togglePostLike(postId, token);

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id === postId
            ? {
              ...post,
              likes: Array(data.likes).fill(null),
            }
            : post
        )
      );
    } catch (error) {
      setError(error.message);
    }
  };

  const filteredPosts =
    activeCategory === "All"
      ? posts
      : posts.filter(
        (post) => post.category === activeCategory
      );

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
          onClick={() => {
            setShowComposer(!showComposer);
            setError("");
          }}
          className="h-11 rounded-xl bg-[#e58da4] px-5 text-sm font-semibold text-white transition hover:bg-[#d97d96]"
        >
          + Create Post
        </button>
      </div>

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
            <label className="mb-2 block text-sm font-medium text-[#292331]">
              Category
            </label>

            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="h-12 w-full rounded-xl border border-[#eadde1] bg-white px-4 text-sm outline-none focus:border-[#e58da4]"
            >
              <option value="Periods">Periods</option>
              <option value="PCOS & PCOD">PCOS & PCOD</option>
              <option value="Pregnancy">Pregnancy</option>
              <option value="Wellness">Wellness</option>
            </select>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-[#292331]">
              Title
            </label>

            <input
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
            <label className="mb-2 block text-sm font-medium text-[#292331]">
              Your post
            </label>

            <textarea
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

      {/* ERROR */}
      {error && (
        <p className="mb-5 text-sm text-red-500">
          {error}
        </p>
      )}

      {/* CATEGORIES */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === category
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
          {filteredPosts.map((post) => (
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

              <div className="mt-5 border-t border-[#f2e8eb] pt-4">
                <button
                  onClick={() => handleLike(post._id)}
                  className="text-sm text-gray-500 transition hover:text-[#df829b]"
                >
                  ♡ {post.likes?.length || 0} Likes
                </button>
              </div>
            </article>
          ))}

          {filteredPosts.length === 0 && (
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