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
  const [isMuted, setIsMuted] = useState(true);
  const [isTrulyPlaying, setIsTrulyPlaying] = useState(false);

  let imageUrl: string;
  let insertionDetails: { url: string; alt: string; mp4?: string; poster?: string; } | null = null;
  let showSoundIcon = false;
  let isVideo = false;

  if (activeTab === "GIF" || activeTab === "Sticker") {
    const gifItem = item as GifItem;
    imageUrl = gifItem.file.sm.webp.url;
    insertionDetails = {
      url: gifItem.file.md.gif.url,
      alt: gifItem.title
    };
  } else { // activeTab === "Clip"
    const videoItem = item as VideoItem;
    imageUrl = videoItem.file.webp;
    insertionDetails = {
      url: videoItem.file.webp,
      alt: videoItem.title,
      mp4: videoItem.file.mp4
    };
    showSoundIcon = videoItem.hasAudio ?? true;
    isVideo = true;
  }

  // Effect to update `isTrulyPlaying` state based on video element's play/pause events
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handlePlay = () => setIsTrulyPlaying(true);
    const handlePause = () => setIsTrulyPlaying(false);

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [isVideo]);

  // Handle click on the main media item area (only for insertion)
  const handleMediaClick = (e: React.MouseEvent) => {
    if (isVideo) {
      if (insertionDetails?.mp4 && imageUrl) {
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
    e.stopPropagation(); // Prevent the parent div's click handler (handleMediaClick) from firing
    const videoElement = videoRef.current;
    if (isVideo && videoElement) {
      if (videoElement.muted || videoElement.paused) {
        videoElement.muted = false;
        setIsMuted(false);
        videoElement.play().catch(error => console.warn("Play on sound click failed:", error));
      } else {
        videoElement.muted = true;
        setIsMuted(true);
        videoElement.pause();
      }
    }
  };

  // New handler for mouse entering the media item area
  const handleMouseEnter = () => {
    const videoElement = videoRef.current;
    if (isVideo && videoElement) {
      videoElement.muted = false; // Unmute
      setIsMuted(false);
      videoElement.play().catch(error => console.warn("Autoplay on hover failed:", error));
    }
  };

  // New handler for mouse leaving the media item area
  const handleMouseLeave = () => {
    const videoElement = videoRef.current;
    if (isVideo && videoElement) {
      videoElement.muted = true; // Mute
      setIsMuted(true);
      videoElement.pause();
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
      onClick={handleMediaClick}
      onMouseEnter={handleMouseEnter} // Add onMouseEnter handler
      onMouseLeave={handleMouseLeave} // Add onMouseLeave handler
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={insertionDetails?.mp4}
          poster={imageUrl}
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          controls={false}
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

      {/* Play Icon: Only show if video is paused and not currently playing (on hover it will be playing) */}
      {isVideo && !isTrulyPlaying && (
        <div className="play-icon">▶</div>
      )}

      {/* Sound Icon Overlay: visible for videos, handles mute and playback */}
      {isVideo && showSoundIcon && (
        <div className="sound-icon-overlay" onClick={handleSoundIconClick}>
          {isMuted ? <MuteIcon /> : <VolumeIcon />}
        </div>
      )}
    </div>
  );
};

export default MediaItem;