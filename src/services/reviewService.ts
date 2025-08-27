import { databases, DATABASE_ID, REVIEWS_COLLECTION_ID } from '../lib/appwrite'
import { ID, Query } from 'appwrite'

export interface Review {
  id: string
  escortId: string
  clientId: string
  bookingId: string
  rating: number // 1-5
  title: string
  comment: string
  categories: {
    communication: number
    punctuality: number
    experience: number
    wouldRecommend: boolean
  }
  response?: string // Escort's response
  responseDate?: string
  isVerified: boolean // Verified booking
  isAnonymous: boolean
  helpfulCount: number
  reportCount: number
  status: 'pending' | 'approved' | 'rejected' | 'hidden'
  createdAt: string
  updatedAt: string
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  categoryAverages: {
    communication: number
    punctuality: number
    experience: number
    recommendationRate: number
  }
}

export class ReviewService {
  // Create a new review
  async createReview(reviewData: {
    escortId: string
    clientId: string
    bookingId: string
    rating: number
    title: string
    comment: string
    categories: Review['categories']
    isAnonymous?: boolean
  }): Promise<Review> {
    try {
      // Validate rating
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5')
      }

      // Check if review already exists for this booking
      const existingReviews = await databases.listDocuments(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        [Query.equal('bookingId', reviewData.bookingId)]
      )

      if (existingReviews.documents.length > 0) {
        throw new Error('A review already exists for this booking')
      }

      // Create the review
      const review = await databases.createDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        ID.unique(),
        {
          ...reviewData,
          isVerified: true, // Should verify booking actually happened
          helpfulCount: 0,
          reportCount: 0,
          status: 'pending', // Reviews go through moderation
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      // Update escort's rating stats
      await this.updateEscortRating(reviewData.escortId)

      return review as unknown as Review
    } catch (error) {
      console.error('Error creating review:', error)
      throw error
    }
  }

  // Get reviews for an escort
  async getEscortReviews(
    escortId: string,
    options: {
      limit?: number
      offset?: number
      sortBy?: 'recent' | 'rating' | 'helpful'
      filterRating?: number
    } = {}
  ): Promise<{ reviews: Review[]; total: number }> {
    try {
      const queries = [
        Query.equal('escortId', escortId),
        Query.equal('status', 'approved'),
        Query.limit(options.limit || 10),
        Query.offset(options.offset || 0)
      ]

      // Add rating filter if specified
      if (options.filterRating) {
        queries.push(Query.equal('rating', options.filterRating))
      }

      // Add sorting
      switch (options.sortBy) {
        case 'rating':
          queries.push(Query.orderDesc('rating'))
          break
        case 'helpful':
          queries.push(Query.orderDesc('helpfulCount'))
          break
        case 'recent':
        default:
          queries.push(Query.orderDesc('createdAt'))
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        queries
      )

      return {
        reviews: response.documents as unknown as Review[],
        total: response.total
      }
    } catch (error) {
      console.error('Error fetching escort reviews:', error)
      return { reviews: [], total: 0 }
    }
  }

  // Get review statistics for an escort
  async getEscortReviewStats(escortId: string): Promise<ReviewStats> {
    try {
      const allReviews = await databases.listDocuments(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        [
          Query.equal('escortId', escortId),
          Query.equal('status', 'approved'),
          Query.limit(1000) // Get all reviews for accurate stats
        ]
      )

      const reviews = allReviews.documents as unknown as Review[]

      if (reviews.length === 0) {
        return {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          categoryAverages: {
            communication: 0,
            punctuality: 0,
            experience: 0,
            recommendationRate: 0
          }
        }
      }

      // Calculate rating distribution
      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      let totalRating = 0
      let totalCommunication = 0
      let totalPunctuality = 0
      let totalExperience = 0
      let recommendCount = 0

      reviews.forEach(review => {
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++
        totalRating += review.rating
        totalCommunication += review.categories.communication
        totalPunctuality += review.categories.punctuality
        totalExperience += review.categories.experience
        if (review.categories.wouldRecommend) recommendCount++
      })

      return {
        totalReviews: reviews.length,
        averageRating: Number((totalRating / reviews.length).toFixed(2)),
        ratingDistribution,
        categoryAverages: {
          communication: Number((totalCommunication / reviews.length).toFixed(2)),
          punctuality: Number((totalPunctuality / reviews.length).toFixed(2)),
          experience: Number((totalExperience / reviews.length).toFixed(2)),
          recommendationRate: Number((recommendCount / reviews.length * 100).toFixed(1))
        }
      }
    } catch (error) {
      console.error('Error calculating review stats:', error)
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categoryAverages: {
          communication: 0,
          punctuality: 0,
          experience: 0,
          recommendationRate: 0
        }
      }
    }
  }

  // Update escort's overall rating
  private async updateEscortRating(escortId: string): Promise<void> {
    try {
      const stats = await this.getEscortReviewStats(escortId)
      
      // Update the escort's profile with new rating stats
      await databases.updateDocument(
        DATABASE_ID,
        'profiles', // Assuming profiles collection
        escortId,
        {
          statsRating: stats.averageRating,
          statsReviewCount: stats.totalReviews,
          updatedAt: new Date().toISOString()
        }
      )
    } catch (error) {
      console.error('Error updating escort rating:', error)
    }
  }

  // Add escort response to a review
  async addEscortResponse(
    reviewId: string,
    escortId: string,
    response: string
  ): Promise<Review> {
    try {
      // Verify the review belongs to this escort
      const review = await databases.getDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        reviewId
      )

      if (review.escortId !== escortId) {
        throw new Error('Unauthorized to respond to this review')
      }

      if (review.response) {
        throw new Error('A response has already been added to this review')
      }

      // Update the review with response
      const updatedReview = await databases.updateDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        reviewId,
        {
          response,
          responseDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      return updatedReview as unknown as Review
    } catch (error) {
      console.error('Error adding escort response:', error)
      throw error
    }
  }

  // Mark review as helpful
  async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
    try {
      // In production, track which users marked as helpful to prevent duplicates
      const review = await databases.getDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        reviewId
      )

      await databases.updateDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        reviewId,
        {
          helpfulCount: (review.helpfulCount || 0) + 1,
          updatedAt: new Date().toISOString()
        }
      )
    } catch (error) {
      console.error('Error marking review as helpful:', error)
    }
  }

  // Report a review
  async reportReview(
    reviewId: string,
    reporterId: string,
    reason: string
  ): Promise<void> {
    try {
      const review = await databases.getDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        reviewId
      )

      const newReportCount = (review.reportCount || 0) + 1

      // Auto-hide if too many reports
      const status = newReportCount >= 5 ? 'hidden' : review.status

      await databases.updateDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        reviewId,
        {
          reportCount: newReportCount,
          status,
          updatedAt: new Date().toISOString()
        }
      )

      // In production, also create a report record for moderation
    } catch (error) {
      console.error('Error reporting review:', error)
    }
  }

  // Get reviews by client
  async getClientReviews(clientId: string): Promise<Review[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        [
          Query.equal('clientId', clientId),
          Query.orderDesc('createdAt'),
          Query.limit(100)
        ]
      )

      return response.documents as unknown as Review[]
    } catch (error) {
      console.error('Error fetching client reviews:', error)
      return []
    }
  }

  // Moderate review (admin function)
  async moderateReview(
    reviewId: string,
    action: 'approve' | 'reject' | 'hide',
    moderatorNotes?: string
  ): Promise<void> {
    try {
      const statusMap = {
        approve: 'approved',
        reject: 'rejected',
        hide: 'hidden'
      }

      await databases.updateDocument(
        DATABASE_ID,
        REVIEWS_COLLECTION_ID,
        reviewId,
        {
          status: statusMap[action],
          moderatorNotes,
          moderatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      )

      // If approved, update escort rating
      if (action === 'approve') {
        const review = await databases.getDocument(
          DATABASE_ID,
          REVIEWS_COLLECTION_ID,
          reviewId
        )
        await this.updateEscortRating(review.escortId)
      }
    } catch (error) {
      console.error('Error moderating review:', error)
      throw error
    }
  }
}

export const reviewService = new ReviewService()