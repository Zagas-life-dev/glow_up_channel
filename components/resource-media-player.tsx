"use client"

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface ResourceMediaPlayerProps {
  resource: any
  className?: string
}

export default function ResourceMediaPlayer({ resource, className }: ResourceMediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffering, setBuffering] = useState(false)
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  const isVideo = resource.resource_type === 'video'
  const isAudio = resource.resource_type === 'audio'

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const handleLoadedMetadata = () => {
      setDuration(media.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(media.currentTime)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      setBuffering(false)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleWaiting = () => {
      setBuffering(true)
    }

    const handleCanPlay = () => {
      setBuffering(false)
    }

    const handleVolumeChange = () => {
      setVolume(media.volume)
      setIsMuted(media.muted)
    }

    media.addEventListener('loadedmetadata', handleLoadedMetadata)
    media.addEventListener('timeupdate', handleTimeUpdate)
    media.addEventListener('play', handlePlay)
    media.addEventListener('pause', handlePause)
    media.addEventListener('waiting', handleWaiting)
    media.addEventListener('canplay', handleCanPlay)
    media.addEventListener('volumechange', handleVolumeChange)

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      media.removeEventListener('timeupdate', handleTimeUpdate)
      media.removeEventListener('play', handlePlay)
      media.removeEventListener('pause', handlePause)
      media.removeEventListener('waiting', handleWaiting)
      media.removeEventListener('canplay', handleCanPlay)
      media.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [])

  useEffect(() => {
    if (isPlaying) {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying, currentTime])

  const togglePlayPause = () => {
    const media = mediaRef.current
    if (!media) return

    if (isPlaying) {
      media.pause()
    } else {
      media.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const media = mediaRef.current
    if (!media) return

    const newTime = (value[0] / 100) * duration
    media.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const media = mediaRef.current
    if (!media) return

    const newVolume = value[0] / 100
    media.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const media = mediaRef.current
    if (!media) return

    if (isMuted) {
      media.volume = volume || 1
      setIsMuted(false)
    } else {
      media.volume = 0
      setIsMuted(true)
    }
  }

  const skipTime = (seconds: number) => {
    const media = mediaRef.current
    if (!media) return

    const newTime = Math.max(0, Math.min(media.currentTime + seconds, duration))
    media.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleFullscreen = () => {
    if (!isVideo) return

    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative group bg-black rounded-2xl overflow-hidden",
        isVideo ? "aspect-video" : "h-24",
        className
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false)
          }, 3000)
        }
      }}
    >
      {/* Media Element */}
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={resource.media_url}
          poster={resource.thumbnail_url}
          className="w-full h-full object-cover"
          preload="metadata"
        />
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={resource.media_url}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Audio Visualizer for Audio Resources */}
      {isAudio && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end gap-1 h-16">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 bg-gradient-to-t from-orange-500 to-orange-600 rounded-full transition-all duration-200",
                  isPlaying ? "animate-pulse" : ""
                )}
                style={{
                  height: `${Math.random() * 40 + 20}%`,
                  animationDelay: `${i * 50}ms`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      {buffering && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">
              {resource.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isVideo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={togglePlayPause}
            size="lg"
            className="w-16 h-16 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[progressPercentage]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full"
            />
            <div className="flex items-center justify-between text-white text-sm">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Skip Backward */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skipTime(-10)}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              {/* Play/Pause */}
              <Button
                onClick={togglePlayPause}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white rounded-lg"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skipTime(10)}
                className="text-white hover:bg-white/20 rounded-lg"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 rounded-lg"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Play Button Overlay (when not playing) */}
      {!isPlaying && !showControls && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={togglePlayPause}
            size="lg"
            className="w-16 h-16 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Play className="h-8 w-8 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
} 