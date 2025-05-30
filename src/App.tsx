import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Skeleton from "react-loading-skeleton";
import LogoIcon from "./icons/logo";
import SearchIcon from "./icons/Search";
import "react-loading-skeleton/dist/skeleton.css";
import "./index.css";
import MediaItem from "./MediaItem"; // Import the new MediaItem component

// Interface for GIF and Sticker items
interface GifItem {
  id: string;
  uuid: string;
  file: {
    md: {
      webp: {
        url: string;
        width: number;
        height: number;
      };
      gif: { // Used for inserting the full GIF
        url: string;
        width: number;
        height: number;
      };
    };
    sm: { // Used for displaying the thumbnail in the masonry layout
      webp: {
        url: string;
      };
    };
  };
  title: string;
}

// Interface for Video (Clip) items
interface VideoItem {
  id: string;
  uuid: string;
  slug: string;
  file: {
    thumbnail_url_webp: string;
    webp: string; // Used for displaying the thumbnail in the masonry layout
    mp4: string; // Used for inserting the video
  };
  title: string;
  // Add an optional 'hasAudio' property if your API provides it
  hasAudio?: boolean;
}

// Define a type that can be either GifItem or VideoItem for flexibility in masonry logic
type Item = GifItem | VideoItem;

// Constants for masonry layout calculations
const containerWidth = 280; // Fixed width for the masonry container
const gap = 5; // Gap between items in the masonry layout
const itemMinHeight = 50; // Minimum height for a masonry item
const itemMaxHeight = 380; // Maximum height for a masonry item
const maxItemsPerRow = 3; // Maximum number of items to consider for a single row calculation
const maxItemWidth = 280; // New constant: Maximum width for an individual item

/**
 * Precalculates the optimal layout for a single row of masonry items.
 * It tries different heights to find the best fit within the containerWidth.
 * @param possibleItemsInRow An array of items to potentially include in the row.
 * @returns An array of items with calculated width, height, and display URL for the row.
 */
function precalculateSingleRow(possibleItemsInRow: Item[]): any[] {
  let minimumChange = Number.MAX_SAFE_INTEGER; // Tracks the smallest difference from containerWidth
  let currentRow: any[] = []; // Stores the best combination of items for the current row
  let itemsHeightInRow = 0; // Stores the optimal height for items in the current row

  // Iterate through possible heights for the row
  for (let height = itemMinHeight; height <= itemMaxHeight; height++) {
    let itemsInRow: any[] = []; // Items considered for the current height iteration
    for (let i = 0; i < possibleItemsInRow.length; i++) {
      const item = { ...possibleItemsInRow[i] }; // Create a shallow copy to add new properties
      itemsInRow.push(item);

      let itemWidth, itemHeight;

      // Determine width and height based on item type (GifItem or VideoItem)
      if ("md" in item.file && item.file.md?.webp) {
        // This is a GifItem (GIF or Sticker)
        const gifFile = item.file as GifItem["file"];
        itemWidth = gifFile.md.webp.width;
        itemHeight = gifFile.md.webp.height;
      } else if ("webp" in item.file && "mp4" in item.file) {
        // This is a VideoItem (Clip)
        // Placeholder dimensions for video thumbnails as they are not provided in the interface.
        // If your API provides thumbnail dimensions, update VideoItem interface and use them here for accuracy.
        itemWidth = 160; // Example width, assume a common video aspect ratio for thumbs
        itemHeight = 90; // Example height (16:9 aspect ratio)
      } else {
        // Skip if item type is not recognized or lacks necessary dimension data
        continue;
      }

      // Ensure valid dimensions before proceeding
      if (!itemWidth || !itemHeight) continue;

      // Calculate the new width based on the current row height and item's aspect ratio
      let newWidth = Math.round((itemWidth * height) / itemHeight);
      // Ensure the new width does not exceed the maximum allowed width
      newWidth = Math.min(newWidth, maxItemWidth); // Apply max-width constraint here

      itemsInRow[itemsInRow.length - 1].newWidth = newWidth;

      // Calculate the total width of items in the current iteration, including gaps
      const totalWidth =
        itemsInRow.reduce((sum, currentItem) => sum + currentItem.newWidth, 0) +
        (itemsInRow.length - 1) * gap;
      const change = containerWidth - totalWidth; // Difference from the target container width

      // Check if this combination is a better fit
      // Prioritize smaller absolute change, or single item rows if current best is also single item
      if (
        Math.abs(change) < Math.abs(minimumChange) ||
        (currentRow.length === 1 && itemsInRow.length !== 1) // Handles edge case for single item rows
      ) {
        if (itemsInRow.length !== 1 || currentRow.length === 0) {
          minimumChange = change;
          currentRow = [...itemsInRow];
          itemsHeightInRow = height;
        }
      }
    }
  }

  // Apply the calculated height and adjusted width to the chosen items in the row
  currentRow.forEach((item) => {
    item.height = itemsHeightInRow;
    // Distribute the 'change' (difference from containerWidth) evenly among items
    item.width = item.newWidth + minimumChange / currentRow.length;
    // Ensure the final width also respects the maxItemWidth
    item.width = Math.min(item.width, maxItemWidth);

    // Set the URL for display based on the item type
    if ("md" in item.file && item.file.md?.webp) {
      item.url = (item as GifItem).file.md.webp.url;
    } else if ("webp" in item.file && "mp4" in item.file) {
      item.url = (item as VideoItem).file.webp; // Use thumbnail for display
    }
  });

  return currentRow;
}

/**
 * Creates a complete set of masonry rows from a flat list of items.
 * It iteratively calls precalculateSingleRow to build each row.
 * @param items A flat array of GifItem or VideoItem.
 * @returns A 2D array representing the masonry rows.
 */
function createRows(items: Item[]): any[][] {
  let rows: any[][] = [];
  let currentIndex = 0;

  // Continue creating rows until all items are processed
  while (currentIndex < items.length) {
    // Take a slice of items to consider for the next row (up to maxItemsPerRow)
    const itemsForRow = items.slice(currentIndex, currentIndex + maxItemsPerRow);
    // If no items are left to process, break to prevent infinite loop
    if (itemsForRow.length === 0) break;

    const adjustedRow = precalculateSingleRow(itemsForRow);

    // If no valid items could form a row (e.g., due to missing dimensions), advance index to prevent infinite loop
    if (adjustedRow.length === 0) {
      currentIndex++;
      continue;
    }
    rows.push(adjustedRow);
    currentIndex += adjustedRow.length; // Move index past the items used in the current row
  }

  return rows;
}

/**
 * Fetches items from the API based on the active tab and search query.
 * @param pageParam The current page number for pagination.
 * @param queryKey An array containing the search query and active tab.
 * @returns A promise that resolves to an array of fetched items.
 */
const fetchItems = async ({
  pageParam = 1,
  queryKey,
}: {
  pageParam?: number;
  queryKey: [string, "GIF" | "Clip" | "Sticker"];
}) => {
  const [searchQuery, activeTab] = queryKey;
  // Base URLs for different content types
  const baseUrls: Record<"GIF" | "Clip" | "Sticker", string> = {
    GIF: "https://api.klipy.co/api/v1/dpqErE0iyRRA9IyEJ3pweUzCPoWePs33Cm8W6GxRiiT7CFB8Ka4bPeKd6V5DLI0I/gifs",
    Clip: "https://api.klipy.co/api/v1/dpqErE0iyRRA9IyEJ3pweUzCPoWePs33Cm8W6GxRiiT7CFB8Ka4bPeKd6V5DLI0I/clips",
    Sticker: "https://api.klipy.co/api/v1/dpqErE0iyRRA9IyEJ3pweUzCPoWePs33Cm8W6GxRiiT7CFB8Ka4bPeKd6V5DLI0I/stickers",
  };

  // Determine the API endpoint (search or trending)
  const endpoint = searchQuery
    ? `search/?page=${pageParam}&per_page=50&q=${encodeURIComponent(
        searchQuery
      )}`
    : `trending?page=${pageParam}&per_page=50`;

  // Construct the full URL
  const url = baseUrls[activeTab] ? `${baseUrls[activeTab]}/${endpoint}` : "";

  const response = await fetch(url);
  const json = await response.json();
  return json.data.data || [];
};

/**
 * The main application component.
 * Manages search, tab selection, data fetching, masonry layout, and Office.js integration.
 */
export const App = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"GIF" | "Clip" | "Sticker">("GIF");
  const loaderRef = useRef<HTMLDivElement | null>(null); // Ref for the infinite scroll loader element

  /**
   * Inserts HTML content into the email body using Office.js.
   * @param html The HTML string to insert.
   */
  const insertHtmlToEmailBody = (html: string) => {
    // Check if Office.js is loaded and the mailbox item body is available
    if (typeof Office !== "undefined" && Office.context.mailbox.item?.body) {
      Office.context.mailbox.item.body.setSelectedDataAsync(
        html,
        { coercionType: Office.CoercionType.Html },
        (result) => {
          if (result.status !== Office.AsyncResultStatus.Succeeded) {
            console.error("Error inserting data:", result.error);
          }
        }
      );
    } else {
      console.warn(
        "Office.js is not initialized or not in an Outlook environment. Cannot insert content."
      );
    }
  };

  /**
   * Inserts a GIF image into the email body.
   * @param url The URL of the GIF.
   * @param alt The alt text for the GIF.
   */
  const insertGif = (url: string, alt: string) => {
    const imgHtml = `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;" />`;
    insertHtmlToEmailBody(imgHtml);
  };

  /**
   * Inserts a video (as a clickable thumbnail linking to the MP4) into the email body.
   * @param mp4Url The URL of the MP4 video.
   * @param posterUrl The URL of the video thumbnail (poster image).
   */
  const insertVideo = (mp4Url: string, posterUrl: string) => {
    const html = `
      <a href="${mp4Url}" target="_blank" rel="noopener noreferrer">
        <img src="${posterUrl}" alt="Video thumbnail" style="max-width:100%;height:auto;" />
        <p style="font-size:10px; color:#555;">Click to watch video</p>
      </a>
    `;
    insertHtmlToEmailBody(html);
  };

  // useInfiniteQuery hook for fetching data with infinite scrolling
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [searchQuery, activeTab], // Query key changes when search query or active tab changes, triggering refetch
    queryFn: ({ pageParam = 1 }) =>
      fetchItems({ pageParam, queryKey: [searchQuery, activeTab] }),
    // Determines the next page parameter for infinite scrolling
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 50 ? pages.length + 1 : undefined, // If last page has 50 items, there might be more
    initialPageParam: 1, // Start fetching from page 1
  });

  // Flatten the fetched data pages into a single array of items
  const items = data?.pages.flat() || [];
  // Create masonry rows from the flattened items
  const rows = createRows(items);

  // useEffect hook for setting up the Intersection Observer for infinite scrolling
  useEffect(() => {
    // If there's no next page or we're already fetching, do nothing
    if (!hasNextPage || isFetchingNextPage) return;

    // Create a new Intersection Observer instance
    const observer = new IntersectionObserver(
      (entries) => {
        // If the loader element is intersecting the viewport, fetch the next page
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    ); // Trigger when 100% of the loader is visible

    const loader = loaderRef.current;
    // If the loader element exists, observe it
    if (loader) observer.observe(loader);

    // Cleanup function: disconnect the observer when the component unmounts or dependencies change
    return () => {
      if (loader) observer.unobserve(loader);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]); // Dependencies for the effect

  return (
    <div className="main-container">
      <div className="app-container">
        {/* Logo Section */}
        <div className="logo-container">
          <LogoIcon />
        </div>

        {/* Search Input Section */}
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

        {/* Filter Switch for GIF, Sticker, Clip */}
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
            GIFs
          </label>

          <input
            type="radio"
            id="option2"
            name="value-radio"
            value="Stickers"
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
            Clips
          </label>

          <span className="background"></span>{" "}
          {/* Visual background for the active tab */}
        </div>

        {/* Conditional rendering for loading state (Skeletons) or actual content */}
        {isLoading ? (
          <div className="main-container-for-center">
            <div className="grid-container">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  height={150}
                  width="100%" // Skeleton width should fill its grid column
                  style={{ borderRadius: "8px" }}
                />
              ))}
            </div>
          </div>
        ) : (
          // Masonry Container for displaying fetched items
          <div
            className="masonry-container"
            style={{ position: "relative", width: containerWidth }}
          >
            {rows.map((row, rowIndex) => {
              let currentX = 0; // X-position for items in the current row
              // Calculate the top position for the current row based on previous rows' heights and gaps
              const rowTop =
                rowIndex === 0
                  ? 0
                  : rows
                      .slice(0, rowIndex)
                      .reduce((sum, r) => sum + r[0].height + gap, 0);

              return row.map((item, i) => {
                const left = currentX; // Left position for the current item
                const top = rowTop; // Top position for the current item
                currentX += item.width + gap; // Update X-position for the next item in the row

                // Render the MediaItem component
                return (
                  <MediaItem
                    key={item.id} // Essential for React list rendering
                    item={item}
                    activeTab={activeTab}
                    insertGif={insertGif}
                    insertVideo={insertVideo}
                    width={item.width}
                    height={item.height}
                    top={top}
                    left={left}
                  />
                );
              });
            })}
          </div>
        )}

        {/* Loader element for infinite scrolling */}
        <div ref={loaderRef} style={{ height: "40px", marginTop: "20px" }}>
          {isFetchingNextPage && (
            <div className="main-container-for-center">
              <div className="grid-container" style={{ marginTop: "20px" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={`next-${i}`}
                    height={150}
                    width="100%" // Skeleton width should fill its grid column
                    style={{ borderRadius: "8px" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};