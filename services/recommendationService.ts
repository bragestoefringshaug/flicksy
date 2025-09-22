/**
 * Recommendation Service
 * 
 * Provides personalized movie and TV show recommendations based on user preferences.
 * Uses machine learning algorithms to analyze user behavior and improve recommendations over time.
 * 
 * Features:
 * - Genre-based recommendations
 * - Content type preferences (movies vs TV shows)
 * - Learning from user interactions
 * - Error handling and fallback mechanisms
 * 
 * @author Flicksy Team
 * @version 1.0.0
 */

import { Movie, TVShow, movieApi } from './movieApi';

/**
 * User preferences interface for recommendation system
 */
export interface UserPreferences {
  genres: string[]; // User's preferred genres
  likedMovies: number[]; // Array of liked movie IDs
  dislikedMovies: number[]; // Array of disliked movie IDs
  watchlist: number[]; // Array of watchlist item IDs
}

/**
 * RecommendationService class
 * 
 * Handles all recommendation logic including learning from user preferences,
 * generating personalized content, and managing recommendation quality.
 */
export class RecommendationService {
  // ==================== PRIVATE PROPERTIES ====================
  
  private genreWeights: Map<string, number> = new Map(); // Genre preference weights
  private typePreference: { movies: number; tvShows: number } = { movies: 0, tvShows: 0 }; // Content type preferences
  private learningEnabled: boolean = true; // Whether to learn from user interactions
  private errorCount: number = 0; // Track consecutive errors
  private maxErrors: number = 5; // Maximum errors before disabling learning
  private invalidIds: Set<number> = new Set(); // Track IDs that don't exist in TMDB

  // ==================== PUBLIC METHODS ====================
  
  /**
   * Update user preferences and learn from their choices
   * 
   * This method processes user preferences to improve future recommendations.
   * It learns from both liked and disliked content to build a preference profile.
   * 
   * @param preferences - User's current preferences
   */
  updatePreferences(preferences: UserPreferences) {
    // Only learn from preferences if there are valid items and learning is enabled
    if (this.learningEnabled && preferences.likedMovies.length > 0) {
      this.learnFromLikedContent(preferences.likedMovies);
    }
    if (this.learningEnabled && preferences.dislikedMovies.length > 0) {
      this.learnFromDislikedContent(preferences.dislikedMovies);
    }
    this.updateTypePreferences(preferences);
  }

  // Learn from liked content to improve recommendations
  private async learnFromLikedContent(likedIds: number[]) {
    for (const id of likedIds) {
      if (!this.learningEnabled) break;
      
      // Skip if we already know this ID is invalid
      if (this.invalidIds.has(id)) {
        console.warn(`Skipping invalid movie ID ${id} (already blacklisted)`);
        continue;
      }
      
      try {
        // Try to get as movie first
        const movie = await movieApi.getMovieDetails(id);
        this.updateGenreWeights(movie.genre_ids, 1);
        this.typePreference.movies += 1;
      } catch (error) {
        // If it's a 404, the movie doesn't exist - skip it silently
        if (error instanceof Error && (error.message.includes('not found') || error.message.includes('404'))) {
          console.warn(`Liked movie ${id} no longer exists in TMDB database, skipping...`);
          this.invalidIds.add(id); // Add to blacklist
          this.errorCount++;
          if (this.errorCount >= this.maxErrors) {
            console.warn('Too many API errors, disabling learning to prevent spam');
            this.learningEnabled = false;
            break;
          }
          continue;
        }
        try {
          // If not a movie, try as TV show
          const tvShow = await movieApi.getTVShowDetails(id);
          this.updateGenreWeights(tvShow.genre_ids, 1);
          this.typePreference.tvShows += 1;
        } catch (tvError) {
          // If it's a 404, the TV show doesn't exist - skip it silently
          if (tvError instanceof Error && (tvError.message.includes('not found') || tvError.message.includes('404'))) {
            console.warn(`Liked TV show ${id} no longer exists in TMDB database, skipping...`);
            this.invalidIds.add(id); // Add to blacklist
            this.errorCount++;
            if (this.errorCount >= this.maxErrors) {
              console.warn('Too many API errors, disabling learning to prevent spam');
              this.learningEnabled = false;
              break;
            }
            continue;
          }
          console.warn(`Could not load details for liked item ${id}:`, tvError);
        }
      }
    }
  }

  // Learn from disliked content to avoid similar content
  private async learnFromDislikedContent(dislikedIds: number[]) {
    for (const id of dislikedIds) {
      if (!this.learningEnabled) break;
      
      // Skip if we already know this ID is invalid
      if (this.invalidIds.has(id)) {
        console.warn(`Skipping invalid movie ID ${id} (already blacklisted)`);
        continue;
      }
      
      try {
        // Try to get as movie first
        const movie = await movieApi.getMovieDetails(id);
        this.updateGenreWeights(movie.genre_ids, -0.5);
        this.typePreference.movies -= 0.5;
      } catch (error) {
        // If it's a 404, the movie doesn't exist - skip it silently
        if (error instanceof Error && (error.message.includes('not found') || error.message.includes('404'))) {
          console.warn(`Disliked movie ${id} no longer exists in TMDB database, skipping...`);
          this.invalidIds.add(id); // Add to blacklist
          this.errorCount++;
          if (this.errorCount >= this.maxErrors) {
            console.warn('Too many API errors, disabling learning to prevent spam');
            this.learningEnabled = false;
            break;
          }
          continue;
        }
        try {
          // If not a movie, try as TV show
          const tvShow = await movieApi.getTVShowDetails(id);
          this.updateGenreWeights(tvShow.genre_ids, -0.5);
          this.typePreference.tvShows -= 0.5;
        } catch (tvError) {
          // If it's a 404, the TV show doesn't exist - skip it silently
          if (tvError instanceof Error && (tvError.message.includes('not found') || tvError.message.includes('404'))) {
            console.warn(`Disliked TV show ${id} no longer exists in TMDB database, skipping...`);
            this.invalidIds.add(id); // Add to blacklist
            this.errorCount++;
            if (this.errorCount >= this.maxErrors) {
              console.warn('Too many API errors, disabling learning to prevent spam');
              this.learningEnabled = false;
              break;
            }
            continue;
          }
          console.warn(`Could not load details for disliked item ${id}:`, tvError);
        }
      }
    }
  }

  // Update genre weights based on user feedback
  private updateGenreWeights(genreIds: number[], weight: number) {
    // In a real app, you would map genre IDs to genre names
    // For now, we'll use a simple approach
    for (const genreId of genreIds) {
      const genreKey = genreId.toString();
      const currentWeight = this.genreWeights.get(genreKey) || 0;
      this.genreWeights.set(genreKey, currentWeight + weight);
    }
  }

  // Update type preferences (movies vs TV shows)
  private updateTypePreferences(preferences: UserPreferences) {
    const totalLiked = preferences.likedMovies.length + preferences.watchlist.length;
    const totalDisliked = preferences.dislikedMovies.length;
    
    if (totalLiked > 0) {
      this.typePreference.movies = preferences.likedMovies.length / totalLiked;
      this.typePreference.tvShows = preferences.watchlist.length / totalLiked;
    }
  }

  // Score content based on user preferences
  scoreContent(item: Movie | TVShow): number {
    let score = 0;
    
    // Base score from rating
    score += item.vote_average * 0.3;
    
    // Genre preference score
    const genreScore = this.calculateGenreScore(item.genre_ids);
    score += genreScore * 0.4;
    
    // Type preference score
    const isMovie = 'title' in item;
    const typeScore = isMovie ? this.typePreference.movies : this.typePreference.tvShows;
    score += typeScore * 0.2;
    
    // Popularity score (normalized)
    score += Math.min(item.popularity / 100, 1) * 0.1;
    
    return Math.max(0, Math.min(10, score));
  }

  // Calculate genre score based on learned preferences
  private calculateGenreScore(genreIds: number[]): number {
    if (genreIds.length === 0) return 0;
    
    let totalScore = 0;
    for (const genreId of genreIds) {
      const genreKey = genreId.toString();
      const weight = this.genreWeights.get(genreKey) || 0;
      totalScore += weight;
    }
    
    return totalScore / genreIds.length;
  }

  // Get personalized recommendations
  async getPersonalizedRecommendations(
    preferences: UserPreferences,
    limit: number = 20
  ): Promise<(Movie | TVShow)[]> {
    this.updatePreferences(preferences);
    
    try {
      // Get mixed content
      const allContent = await movieApi.getMixedContent(1);
      
      // Score and sort content
      const scoredContent = allContent
        .map(item => ({
          item,
          score: this.scoreContent(item)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(scored => scored.item);
      
      return scoredContent;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  // Get content similar to a liked item
  async getSimilarContent(
    itemId: number,
    isMovie: boolean,
    limit: number = 10
  ): Promise<(Movie | TVShow)[]> {
    try {
      let recommendations: (Movie | TVShow)[] = [];
      
      if (isMovie) {
        const response = await movieApi.getMovieRecommendations(itemId);
        recommendations = response.results;
      } else {
        const response = await movieApi.getTVRecommendations(itemId);
        recommendations = response.results;
      }
      
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error getting similar content:', error);
      return [];
    }
  }

  // Reset all learned preferences
  resetPreferences() {
    this.genreWeights.clear();
    this.typePreference = { movies: 0, tvShows: 0 };
    this.learningEnabled = true;
    this.errorCount = 0;
    this.invalidIds.clear(); // Clear the blacklist
  }

  // Get current preference summary
  getPreferenceSummary() {
    return {
      genreWeights: Object.fromEntries(this.genreWeights),
      typePreference: this.typePreference,
      learningEnabled: this.learningEnabled,
      errorCount: this.errorCount,
    };
  }

  // Check if learning is enabled
  isLearningEnabled(): boolean {
    return this.learningEnabled;
  }
}

export const recommendationService = new RecommendationService();
