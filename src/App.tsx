import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import LogoIcon from "./icons/logo";
import SearchIcon from "./icons/Search";
import "react-loading-skeleton/dist/skeleton.css";
import "./index.css";

interface GifItem {
  id: string;
  uuid: string;
  file: {
    md: {
      webp: {
        url: string;
      };
      gif: {
        url: string;
        width: number;
        height: number;
      };
    };
    sm: {
      webp: {
        url: string;
      };
      gif: {
        url: string;
        width: number;
        height: number;
      };
    };
  };
  title: string;
}

interface VideoItem {
  id: string;
  uuid: string;
  slug: string;
  file: {
    thumbnail_url_webp: string;
    webp: string;
    mp4: string;
  };
  title: string;
}

const fetchItems = async ({
  pageParam = 1,
  queryKey,
}: {
  pageParam?: number;
  queryKey: [string, "GIF" | "Clip" | "Sticker"];
}) => {
  const [searchQuery, activeTab] = queryKey;
  const baseUrls: Record<"GIF" | "Clip" | "Sticker", string> = {
    GIF: "https://api.klipy.co/api/v1/c9UrScczWCLK1n8DLmh7HQAcVx3lc3E6Njip3ACHnlqMT1JoPKCV7hGkZUsk4X1u/gifs",
    Clip: "https://api.klipy.co/api/v1/c9UrScczWCLK1n8DLmh7HQAcVx3lc3E6Njip3ACHnlqMT1JoPKCV7hGkZUsk4X1u/clips",
    Sticker:
      "https://api.klipy.co/api/v1/c9UrScczWCLK1n8DLmh7HQAcVx3lc3E6Njip3ACHnlqMT1JoPKCV7hGkZUsk4X1u/stickers",
  };

  const endpoint = searchQuery
    ? `search/?page=${pageParam}&per_page=50&q=${encodeURIComponent(
        searchQuery
      )}`
    : `trending?page=${pageParam}&per_page=50`;

  const url = baseUrls[activeTab] ? `${baseUrls[activeTab]}/${endpoint}` : "";

  const response = await fetch(url);
  const json = await response.json();
  return json.data.data || [];
};

export const App = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"GIF" | "Clip" | "Sticker">("GIF");
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const insertHtmlToEmailBody = (html: string) => {
    if (Office.context.mailbox.item?.body) {
      Office.context.mailbox.item.body.setSelectedDataAsync(
        html,
        { coercionType: Office.CoercionType.Html },
        (result) => {
          if (result.status !== Office.AsyncResultStatus.Succeeded) {
            console.error(result.error);
          }
        }
      );
    }
  };

  const insertGif = (url: string, alt: string) => {
    const imgHtml = `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;" />`;
    insertHtmlToEmailBody(imgHtml);
  };

  const insertVideo = (mp4Url: string, posterUrl: string) => {
    const html = `
      <a href="${mp4Url}" target="_blank" rel="noopener noreferrer">
        <img src="${posterUrl}" alt="Video thumbnail" style="max-width:100%;height:auto;" />
        <p>Click to watch video</p>
      </a>
    `;
    insertHtmlToEmailBody(html);
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [searchQuery, activeTab],
      queryFn: ({ pageParam = 1 }) =>
        fetchItems({ pageParam, queryKey: [searchQuery, activeTab] }),
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === 50 ? pages.length + 1 : undefined,
      initialPageParam: 1,
    });

  const items = data?.pages.flat() || [];

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);

    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="main-container">
      <div className="app-container">
        <div className="logo-container">
        <LogoIcon />
      </div>
        <div className="input-container">
        <div className="search-icon">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search for anything..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        </div>
        <div id="firstFilter" className="filter-switch">
          <input
            type="radio"
            id="option1"
            name="value-radio"
            value="GIF"
            checked={activeTab === "GIF"}
            onChange={() => setActiveTab("GIF")}
          />
          <label className="option" htmlFor="option1">
            GIF
          </label>

          <input
            type="radio"
            id="option2"
            name="value-radio"
            value="Sticker"
            checked={activeTab === "Sticker"}
            onChange={() => setActiveTab("Sticker")}
          />
          <label className="option" htmlFor="option2">
            Sticker
          </label>

          <input
            type="radio"
            id="option3"
            name="value-radio"
            value="Clip"
            checked={activeTab === "Clip"}
            onChange={() => setActiveTab("Clip")}
          />
          <label className="option" htmlFor="option3">
            Clip
          </label>

          <span className="background"></span>
        </div>

        {isLoading ? (
          <div className="main-container-for-center">
            <div className="grid-container">
              {Array.from({ length: 12 }).map((_, i) => (
                <>
                  <Skeleton
                    key={i}
                    height={150}
                    width="100px"
                    style={{ borderRadius: "8px" }}
                  />
                </>
              ))}
            </div>
          </div>
        ) : (
          <div className="main-container-for-center">
  <div className="grid-container">
    {items.map((item, index) => {
      if (activeTab === "GIF" || activeTab === "Sticker") {
        const gif = item as GifItem;
        return (
          <div key={index} className="media-wrapper" onClick={() => insertGif(gif.file.md.gif.url, gif.title)}>
            <img
              src={gif.file.sm.webp.url}
              alt={gif.title}
              className="gif-image"
            />
            <div className="media-overlay">{activeTab}</div>
          </div>
        );
      } else if (activeTab === "Clip") {
        const video = item as VideoItem;
        return (
          <div
            key={index}
            className="media-wrapper"
            onClick={() => insertVideo(video.file.mp4, video.file.webp)}
          >
            <img
              src={video.file.webp}
              alt={video.title}
              className="video-thumbnail"
            />
            <div className="play-icon">▶</div>
            <div className="media-overlay">{activeTab}</div>
          </div>
        );
      }
      return null;
    })}
  </div>
</div>

        )}

        <div ref={loaderRef} style={{ height: "40px", marginTop: "20px" }}>
          {isFetchingNextPage && (
            <div className="grid-container" style={{ marginTop: "20px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={`next-${i}`}
                  height={150}
                  width="100px"
                  style={{ borderRadius: "8px" }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
