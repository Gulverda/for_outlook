import React, { useState, useRef, useEffect } from "react";
import MuteIcon from "./icons/MuteIcon";
import VolumeIcon from "./icons/VolumeIcon";

// Re-import your interfaces here (or ensure they are globally available if using a separate types file)
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
  hasAudio?: boolean;
}

type Item = GifItem | VideoItem;

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
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [isTrulyPlaying, setIsTrulyPlaying] = useState(false); // Tracks actual playback state of the video element

  let imageUrl: string;
  let insertionDetails: { url: string; alt: string; mp4?: string; poster?: string; } | null = null;
  let showSoundIcon = false;
  let isVideo = false;

  // Determine item type and set appropriate properties for display and insertion
  if (activeTab === "GIF" || activeTab === "Sticker") {
    const gifItem = item as GifItem;
    imageUrl = gifItem.file.sm.webp.url; // Display thumbnail
    insertionDetails = {
      url: gifItem.file.md.gif.url, // Full GIF for insertion
      alt: gifItem.title
    };
  } else { // activeTab === "Clip"
    const videoItem = item as VideoItem;
    imageUrl = videoItem.file.webp; // Thumbnail for the video display
    insertionDetails = {
      url: videoItem.file.webp, // This might not be used directly for video insertion, but for consistent interface
      alt: videoItem.title,
      mp4: videoItem.file.mp4 // MP4 URL for insertion
    };
    showSoundIcon = videoItem.hasAudio ?? true;
    isVideo = true;
  }

  // Effect for auto-play (muted) when component mounts or `isVideo` becomes true
  useEffect(() => {
    const videoElement = videoRef.current;
    if (isVideo && videoElement) {
      videoElement.muted = true; // Ensure it's muted for autoplay
      videoElement.play().catch(error => {
        console.warn("Video autoplay blocked or failed:", error);
      });
    }
  }, [isVideo]); // Dependency on isVideo to ensure it runs only when it's a video item

  // Effect to update `isTrulyPlaying` state based on video element's play/pause events
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = () => setIsTrulyPlaying(true);
    const handlePause = () => setIsTrulyPlaying(false);

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    // Cleanup: remove event listeners when component unmounts or deps change
    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [isVideo]); // Re-attach listeners if the item type ever changes (unlikely for same component instance)


  // Handle click on the main media item area (only for insertion)
  const handleMediaClick = (e: React.MouseEvent) => {
    if (isVideo) {
      if (insertionDetails?.mp4 && imageUrl) { // Use imageUrl as posterUrl
          insertVideo(insertionDetails.mp4, imageUrl);
      }
    } else { // GIF or Sticker
      if (insertionDetails?.url && insertionDetails?.alt) {
          insertGif(insertionDetails.url, insertionDetails.alt);
      }
    }
  };

  // Handle click on the sound icon specifically (toggles mute and playback)
  const handleSoundIconClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // VERY IMPORTANT: Prevent the parent div's click handler (handleMediaClick) from firing
    const videoElement = videoRef.current;
    if (isVideo && videoElement) {
      if (videoElement.muted || videoElement.paused) {
        // If muted or paused, unmute and play
        videoElement.muted = false;
        setIsMuted(false);
        videoElement.play().catch(error => console.warn("Play on sound click failed:", error));
      } else {
        // If unmuted and playing, mute and pause
        videoElement.muted = true;
        setIsMuted(true);
        videoElement.pause();
      }
    }
  };

  return (
    <div
      key={item.id}
      className="media-wrapper"
      style={{
        position: "absolute",
        width: `${width}px`,
        height: `${height}px`,
        top,
        left,
        cursor: "pointer",
        overflow: "hidden",
        borderRadius: "8px",
      }}
      onClick={handleMediaClick} // Main click handler for insertion
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={insertionDetails?.mp4}
          poster={imageUrl} // Use display thumbnail as poster
          loop // Keep video looping for continuous display
          muted={isMuted} // Controlled by our state, starts muted
          playsInline // Crucial for inline playback on iOS Safari
          preload="metadata" // Load enough data to show thumbnail and duration
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          controls={false} // We provide custom controls (sound icon)
          // onPlay and onPause event listeners are now handled via a separate useEffect
        />
      ) : (
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

      {/* Play Icon: Visible ONLY if video is paused (and it's a video) */}
      {/* It uses pointer-events: none in CSS so clicks on it fall through to the parent for insertion */}
      {isVideo && !isTrulyPlaying && (
        <div className="play-icon">▶</div>
      )}

      {/* Sound Icon Overlay: visible for videos, handles mute and playback */}
      {isVideo && showSoundIcon && (
        <div className="sound-icon-overlay" onClick={handleSoundIconClick}>
          {isMuted ? <MuteIcon /> : <VolumeIcon />}
        </div>
      )}

      {/* REMOVED: Overlay to display the content type (e.g., "Clip") */}
      {/* <div className="media-overlay">{activeTab}</div> */}
    </div>
  );
};

export default MediaItem;