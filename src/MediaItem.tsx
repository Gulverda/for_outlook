import React, { useState, useRef, useEffect } from "react";
import MuteIcon from "./icons/MuteIcon"; // Ensure these paths are correct
import VolumeIcon from "./icons/VolumeIcon"; // Ensure these paths are correct

// Re-import your interfaces here to keep MediaItem self-contained
interface GifItem {
  id: string;
  uuid: string;
  file: {
    md: {
      webp: { url: string; width: number; height: number; };
      gif: { url: string; width: number; height: number; };
    };
    sm: { webp: { url: string; }; };
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
  hasAudio?: boolean; // Assume true if not provided by API
}

type Item = GifItem | VideoItem;

// Define props for the MediaItem component
interface MediaItemProps {
  item: Item;
  activeTab: "GIF" | "Clip" | "Sticker";
  insertGif: (url: string, alt: string) => void;
  insertVideo: (mp4Url: string, posterUrl: string) => void;
  width: number;
  height: number;
  top: number;
  left: number;
}

const MediaItem: React.FC<MediaItemProps> = ({
  item,
  activeTab,
  insertGif,
  insertVideo,
  width,
  height,
  top,
  left,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Start videos muted to avoid jarring audio upon load
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false); // Track if video is currently playing

  let imageUrl: string;
  let clickHandler: () => void; // This will now be primarily for inserting into email
  let showPlayIcon = false;
  let showSoundIcon = false;
  let isVideo = false;

  // Determine item type and set appropriate properties
  if (activeTab === "GIF" || activeTab === "Sticker") {
    const gifItem = item as GifItem;
    imageUrl = gifItem.file.sm.webp.url; // Use small webp for display
    clickHandler = () => insertGif(gifItem.file.md.gif.url, gifItem.title); // Use full GIF for insertion
  } else { // activeTab === "Clip"
    const videoItem = item as VideoItem;
    imageUrl = videoItem.file.webp; // Thumbnail for the video
    // The clickHandler here is now for inserting into email
    clickHandler = () => insertVideo(videoItem.file.mp4, videoItem.file.webp);
    showPlayIcon = true;
    showSoundIcon = videoItem.hasAudio ?? true; // Assume audio if not specified
    isVideo = true;
  }

  // Effect to manage video playback state for in-app video elements
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isVideo) {
      if (isPlaying) {
        videoElement.play().catch(error => {
          // Autoplay often blocked by browsers, show a warning if it fails
          console.warn("Video autoplay blocked or failed:", error);
          setIsPlaying(false); // Update state if play fails
        });
      } else {
        videoElement.pause();
      }
    }
  }, [isPlaying, isVideo]);

  // Handle click on the entire media item
  const handleMediaClick = (e: React.MouseEvent) => {
    if (isVideo && videoRef.current) {
      // If it's a video, toggle play/pause for in-app playback
      if (videoRef.current.paused) {
        videoRef.current.play().catch(error => console.warn("Video playback blocked on click:", error));
        setIsPlaying(true);
        // Automatically unmute when the user explicitly clicks to play
        setIsMuted(false);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // For GIFs/Stickers, or if the video isn't meant for in-app play, use the original insert handler
      clickHandler();
    }
  };

  // Handle click on the sound icon specifically
  const handleSoundIconClick = (e: React.MouseEvent) => {
    // Prevent the parent div's click handler from firing when clicking the sound icon
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted); // Update state to reflect new mute status
    }
  };

  return (
    <div
      // Use item.id as key for stability in lists
      key={item.id}
      className="media-wrapper" // Applies common styling for hover effects
      style={{
        position: "absolute",
        width: `${width}px`,
        height: `${height}px`,
        top,
        left,
        cursor: "pointer", // Indicates interactivity
        overflow: "hidden", // Hides overflow for rounded corners
        borderRadius: "8px", // Applies rounded corners
      }}
      onClick={handleMediaClick} // Unified click handler for the whole item
    >
      {isVideo ? (
        // Render a <video> element for Clips
        <video
          ref={videoRef}
          src={(item as VideoItem).file.mp4} // Source URL for the video
          poster={imageUrl} // Thumbnail as poster image
          loop // Keep video looping for continuous display
          muted={isMuted} // Controlled by our state
          playsInline // Crucial for inline playback on iOS Safari
          preload="metadata" // Load enough data to show thumbnail and duration, but not the whole video
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          controls={false} // We provide custom controls (play/mute icons)
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      ) : (
        // Render an <img> element for GIFs/Stickers
        <img
          src={imageUrl}
          alt={item.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* Play Icon: visible for videos when paused */}
      {isVideo && !isPlaying && (
        <div className="play-icon">▶</div>
      )}

      {/* Sound Icon Overlay: visible for videos, toggles mute */}
      {isVideo && showSoundIcon && (
        <div className="sound-icon-overlay" onClick={handleSoundIconClick}>
          {isMuted ? <MuteIcon /> : <VolumeIcon />}
        </div>
      )}

      {/* Overlay for content type (e.g., "Clip") */}
      <div className="media-overlay">{activeTab}</div>
    </div>
  );
};

export default MediaItem;