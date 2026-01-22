"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

// Types
export interface PostImage {
  url: string
  publicId: string
  sizes?: {
    thumbnail: string
    medium: string
    large: string
  }
}

export interface PlaylistPreview {
  _id: string
  name: string
  description: string
  itemCount: number
  previewItems: Array<{
    _id: string
    title: string
    contentType: string
  }>
  createdBy: string
  isPublic: boolean
}

export interface PostAuthor {
  _id: string
  firstName?: string
  lastName?: string
  email: string
  profilePicture?: string
}

export interface Post {
  _id: string
  author: string
  authorInfo?: PostAuthor
  content: {
    text: string
    images: PostImage[]
    playlists: PlaylistPreview[]
  }
  hashtags: string[]
  mentions: string[]
  visibility: 'public' | 'private'
  likeCount: number
  replyCount: number
  repostCount: number
  bookmarkCount: number
  viewCount: number
  isRepost: boolean
  originalPost?: string | Post
  repostComment?: string
  isEdited: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
  isLiked?: boolean
  isBookmarked?: boolean
  isFollowing?: boolean
}

export interface Reply {
  _id: string
  post: string
  author: string
  authorInfo?: PostAuthor
  parentReply?: string
  content: {
    text: string
    images: PostImage[]
    playlists: PlaylistPreview[]
  }
  mentions: string[]
  likeCount: number
  replyCount: number
  depth: number
  isEdited: boolean
  editedAt?: string
  createdAt: string
  isLiked?: boolean
  replies?: Reply[]
}

interface PostContextType {
  posts: Post[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  currentPage: number
  // Feed
  fetchFeed: (type?: 'explore' | 'following' | 'trending', page?: number, hashtag?: string) => Promise<void>
  fetchUserPosts: (userId: string, type?: 'posts' | 'likes' | 'reposts', page?: number) => Promise<void>
  // Post CRUD
  createPost: (data: CreatePostData) => Promise<Post>
  updatePost: (postId: string, text: string) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  // Engagement
  likePost: (postId: string) => Promise<void>
  unlikePost: (postId: string) => Promise<void>
  repost: (postId: string, comment?: string) => Promise<void>
  bookmarkPost: (postId: string) => Promise<void>
  unbookmarkPost: (postId: string) => Promise<void>
  // Replies
  getReplies: (postId: string, page?: number) => Promise<{ replies: Reply[], hasMore: boolean }>
  createReply: (postId: string, data: CreateReplyData, parentReplyId?: string) => Promise<Reply>
  likeReply: (replyId: string) => Promise<void>
  unlikeReply: (replyId: string) => Promise<void>
  // Trending
  getTrendingHashtags: () => Promise<Array<{ tag: string, count: number }>>
  // Single post
  getPost: (postId: string) => Promise<Post>
  // Bookmarks
  getBookmarks: (page?: number) => Promise<{ bookmarks: any[], hasMore: boolean }>
  // Clear
  clearPosts: () => void
}

interface CreatePostData {
  text?: string
  images?: File[]
  playlists?: string[]
  visibility?: 'public' | 'private'
}

interface CreateReplyData {
  text?: string
  images?: File[]
  playlists?: string[]
}

const PostContext = createContext<PostContextType | undefined>(undefined)

export function PostProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  // Fetch feed
  const fetchFeed = useCallback(async (
    type: 'explore' | 'following' | 'trending' = 'explore',
    page: number = 1,
    hashtag?: string
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: '20'
      })
      if (hashtag) params.append('hashtag', hashtag)

      const response = await fetch(`${API_BASE_URL}/api/posts/feed?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()

      if (data.success) {
        if (page === 1) {
          setPosts(data.data.posts)
        } else {
          setPosts(prev => [...prev, ...data.data.posts])
        }
        setHasMore(data.data.hasMore)
        setCurrentPage(page)
      } else {
        setError(data.message || 'Failed to fetch feed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch feed')
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  // Fetch user posts
  const fetchUserPosts = useCallback(async (
    userId: string,
    type: 'posts' | 'likes' | 'reposts' = 'posts',
    page: number = 1
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: '20'
      })

      const response = await fetch(`${API_BASE_URL}/api/posts/user/${userId}?${params}`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()

      if (data.success) {
        if (page === 1) {
          setPosts(data.data.posts)
        } else {
          setPosts(prev => [...prev, ...data.data.posts])
        }
        setHasMore(data.data.hasMore)
        setCurrentPage(page)
      } else {
        setError(data.message || 'Failed to fetch user posts')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user posts')
    } finally {
      setIsLoading(false)
    }
  }, [getAuthHeaders])

  // Create post
  const createPost = useCallback(async (data: CreatePostData): Promise<Post> => {
    const formData = new FormData()
    
    if (data.text) formData.append('text', data.text)
    if (data.visibility) formData.append('visibility', data.visibility)
    if (data.playlists && data.playlists.length > 0) {
      formData.append('playlists', JSON.stringify(data.playlists))
    }
    if (data.images) {
      data.images.forEach(image => {
        formData.append('images', image)
      })
    }

    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to create post')
    }

    // Add to posts list
    setPosts(prev => [result.data.post, ...prev])
    return result.data.post
  }, [getAuthHeaders])

  // Update post
  const updatePost = useCallback(async (postId: string, text: string) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    })
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to update post')
    }

    setPosts(prev => prev.map(p => 
      p._id === postId ? { ...p, content: { ...p.content, text }, isEdited: true } : p
    ))
  }, [getAuthHeaders])

  // Delete post
  const deletePost = useCallback(async (postId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to delete post')
    }

    setPosts(prev => prev.filter(p => p._id !== postId))
  }, [getAuthHeaders])

  // Like post
  const likePost = useCallback(async (postId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    const result = await response.json()

    if (result.success) {
      setPosts(prev => prev.map(p => 
        p._id === postId ? { ...p, isLiked: true, likeCount: result.data.likeCount } : p
      ))
    }
  }, [getAuthHeaders])

  // Unlike post
  const unlikePost = useCallback(async (postId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/unlike`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    const result = await response.json()

    if (result.success) {
      setPosts(prev => prev.map(p => 
        p._id === postId ? { ...p, isLiked: false, likeCount: result.data.likeCount } : p
      ))
    }
  }, [getAuthHeaders])

  // Repost
  const repost = useCallback(async (postId: string, comment?: string) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/repost`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment })
    })
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to repost')
    }

    // Update repost count on original
    setPosts(prev => prev.map(p => 
      p._id === postId ? { ...p, repostCount: p.repostCount + 1 } : p
    ))
  }, [getAuthHeaders])

  // Bookmark post
  const bookmarkPost = useCallback(async (postId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/bookmark`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    const result = await response.json()

    if (result.success) {
      setPosts(prev => prev.map(p => 
        p._id === postId ? { ...p, isBookmarked: true, bookmarkCount: p.bookmarkCount + 1 } : p
      ))
    }
  }, [getAuthHeaders])

  // Unbookmark post
  const unbookmarkPost = useCallback(async (postId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/unbookmark`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
    const result = await response.json()

    if (result.success) {
      setPosts(prev => prev.map(p => 
        p._id === postId ? { ...p, isBookmarked: false, bookmarkCount: Math.max(0, p.bookmarkCount - 1) } : p
      ))
    }
  }, [getAuthHeaders])

  // Get replies
  const getReplies = useCallback(async (postId: string, page: number = 1) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      sortBy: 'top'
    })

    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/replies?${params}`, {
      headers: getAuthHeaders()
    })
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'Failed to get replies')
    }

    return { replies: data.data.replies, hasMore: data.data.hasMore }
  }, [getAuthHeaders])

  // Create reply
  const createReply = useCallback(async (
    postId: string,
    data: CreateReplyData,
    parentReplyId?: string
  ): Promise<Reply> => {
    const formData = new FormData()
    
    if (data.text) formData.append('text', data.text)
    if (parentReplyId) formData.append('parentReplyId', parentReplyId)
    if (data.playlists && data.playlists.length > 0) {
      formData.append('playlists', JSON.stringify(data.playlists))
    }
    if (data.images) {
      data.images.forEach(image => {
        formData.append('images', image)
      })
    }

    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/replies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || 'Failed to create reply')
    }

    // Update reply count on post
    setPosts(prev => prev.map(p => 
      p._id === postId ? { ...p, replyCount: p.replyCount + 1 } : p
    ))

    return result.data.reply
  }, [getAuthHeaders])

  // Like reply
  const likeReply = useCallback(async (replyId: string) => {
    await fetch(`${API_BASE_URL}/api/posts/replies/${replyId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
  }, [getAuthHeaders])

  // Unlike reply
  const unlikeReply = useCallback(async (replyId: string) => {
    await fetch(`${API_BASE_URL}/api/posts/replies/${replyId}/unlike`, {
      method: 'POST',
      headers: getAuthHeaders()
    })
  }, [getAuthHeaders])

  // Get trending hashtags
  const getTrendingHashtags = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/posts/trending-hashtags?limit=10`)
    const data = await response.json()

    if (!data.success) {
      return []
    }

    return data.data.hashtags
  }, [])

  // Get single post
  const getPost = useCallback(async (postId: string): Promise<Post> => {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
      headers: getAuthHeaders()
    })
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'Post not found')
    }

    return data.data.post
  }, [getAuthHeaders])

  // Get bookmarks
  const getBookmarks = useCallback(async (page: number = 1) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20'
    })

    const response = await fetch(`${API_BASE_URL}/api/posts/bookmarks?${params}`, {
      headers: getAuthHeaders()
    })
    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'Failed to get bookmarks')
    }

    return { bookmarks: data.data.bookmarks, hasMore: data.data.hasMore }
  }, [getAuthHeaders])

  // Clear posts
  const clearPosts = useCallback(() => {
    setPosts([])
    setHasMore(true)
    setCurrentPage(1)
  }, [])

  return (
    <PostContext.Provider value={{
      posts,
      isLoading,
      error,
      hasMore,
      currentPage,
      fetchFeed,
      fetchUserPosts,
      createPost,
      updatePost,
      deletePost,
      likePost,
      unlikePost,
      repost,
      bookmarkPost,
      unbookmarkPost,
      getReplies,
      createReply,
      likeReply,
      unlikeReply,
      getTrendingHashtags,
      getPost,
      getBookmarks,
      clearPosts
    }}>
      {children}
    </PostContext.Provider>
  )
}

export function usePost() {
  const context = useContext(PostContext)
  if (context === undefined) {
    throw new Error('usePost must be used within a PostProvider')
  }
  return context
}

