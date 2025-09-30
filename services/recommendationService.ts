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
    // Seed genre weights from explicitly selected genres
    this.seedExplicitGenrePreferences(preferences.genres).catch((e) => {
      console.warn('Failed to seed genre preferences:', e);
    });
  }

  private async seedExplicitGenrePreferences(genreNames: string[]) {
    if (!genreNames || genreNames.length === 0) return;
    try {
      const ids = await movieApi.mapGenreNamesToIds(genreNames);
      // Give a baseline positive weight for selected genres
      for (const id of ids) {
        this.updateGenreWeights([id], 2);
      }
    } catch (e) {
      // Non-fatal; just log
      console.warn('Error mapping genre names to ids:', e);
    }
  }

  // Learn from liked content to improve recommendations
  private async learnFromLikedContent(likedIds: number[]) {
    if (!this.learningEnabled || likedIds.length === 0) return;
    
    // First, validate all IDs to filter out invalid ones
    console.log(`Validating ${likedIds.length} liked content IDs...`);
    const validIds = await movieApi.filterValidIds(likedIds);
    
    // Add invalid IDs to blacklist
    const invalidIds = likedIds.filter(id => !validIds.includes(id));
    invalidIds.forEach(id => {
      this.invalidIds.add(id);
      console.warn(`Liked content ID ${id} is invalid, adding to blacklist`);
    });
    
    // Learn from valid content
    for (const id of validIds) {
      if (!this.learningEnabled) break;
      
      try {
        // Validate the content type first
        const validation = await movieApi.validateContentId(id);
        if (!validation.exists) {
          this.invalidIds.add(id);
          continue;
        }
        
        if (validation.type === 'movie') {
          const movie = await movieApi.getMovieDetails(id);
          this.updateGenreWeights(movie.genre_ids, 1);
          this.typePreference.movies += 1;
        } else if (validation.type === 'tv') {
          const tvShow = await movieApi.getTVShowDetails(id);
          this.updateGenreWeights(tvShow.genre_ids, 1);
          this.typePreference.tvShows += 1;
        }
      } catch (error) {
        console.warn(`Error learning from liked content ${id}:`, error);
        this.invalidIds.add(id);
        this.errorCount++;
        if (this.errorCount >= this.maxErrors) {
          console.warn('Too many API errors, disabling learning to prevent spam');
          this.learningEnabled = false;
          break;
        }
      }
    }
  }

  // Learn from disliked content to avoid similar content
  private async learnFromDislikedContent(dislikedIds: number[]) {
    if (!this.learningEnabled || dislikedIds.length === 0) return;
    
    // First, validate all IDs to filter out invalid ones
    console.log(`Validating ${dislikedIds.length} disliked content IDs...`);
    const validIds = await movieApi.filterValidIds(dislikedIds);
    
    // Add invalid IDs to blacklist
    const invalidIds = dislikedIds.filter(id => !validIds.includes(id));
    invalidIds.forEach(id => {
      this.invalidIds.add(id);
      console.warn(`Disliked content ID ${id} is invalid, adding to blacklist`);
    });
    
    // Learn from valid content
    for (const id of validIds) {
      if (!this.learningEnabled) break;
      
      try {
        // Validate the content type first
        const validation = await movieApi.validateContentId(id);
        if (!validation.exists) {
          this.invalidIds.add(id);
          continue;
        }
        
        if (validation.type === 'movie') {
          const movie = await movieApi.getMovieDetails(id);
          this.updateGenreWeights(movie.genre_ids, -0.5);
          this.typePreference.movies -= 0.5;
        } else if (validation.type === 'tv') {
          const tvShow = await movieApi.getTVShowDetails(id);
          this.updateGenreWeights(tvShow.genre_ids, -0.5);
          this.typePreference.tvShows -= 0.5;
        }
      } catch (error) {
        console.warn(`Error learning from disliked content ${id}:`, error);
        this.invalidIds.add(id);
        this.errorCount++;
        if (this.errorCount >= this.maxErrors) {
          console.warn('Too many API errors, disabling learning to prevent spam');
          this.learningEnabled = false;
          break;
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
    limit: number = 20,
    excludeIds: number[] = []
  ): Promise<(Movie | TVShow)[]> {
    this.updatePreferences(preferences);
    
    try {
      // Get content from multiple pages to increase diversity
      const pagesToFetch = Math.ceil(limit / 20) + 2; // Fetch extra pages for variety
      const allContentPromises = [];
      
      for (let page = 1; page <= pagesToFetch; page++) {
        allContentPromises.push(movieApi.getMixedContent(page));
      }
      
      const allContentArrays = await Promise.all(allContentPromises);
      const allContent = allContentArrays.flat();
      
      // Filter out excluded IDs (swiped cards)
      const filteredContent = allContent.filter(item => !excludeIds.includes(item.id));
      
      // Shuffle the content first to add randomness
      const shuffledContent = this.shuffleArray(filteredContent);
      
      // Score and sort content
      const scoredContent = shuffledContent
        .map(item => ({
          item,
          score: this.scoreContent(item)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(scored => scored.item);
      
      console.log(`Generated ${scoredContent.length} recommendations (filtered from ${allContent.length} total, excluded ${excludeIds.length} swiped cards)`);
      
      // If we don't have enough recommendations, try to get more content from additional pages
      if (scoredContent.length < limit && excludeIds.length > 0) {
        console.log(`Only got ${scoredContent.length} recommendations, trying additional pages...`);
        const additionalPages = Math.ceil(excludeIds.length / 20) + 1;
        const additionalContentPromises = [];
        
        for (let page = pagesToFetch + 1; page <= pagesToFetch + additionalPages; page++) {
          additionalContentPromises.push(movieApi.getMixedContent(page));
        }
        
        try {
          const additionalContentArrays = await Promise.all(additionalContentPromises);
          const additionalContent = additionalContentArrays.flat();
          const additionalFiltered = additionalContent.filter(item => !excludeIds.includes(item.id));
          const additionalShuffled = this.shuffleArray(additionalFiltered);
          
          const additionalScored = additionalShuffled
            .map(item => ({
              item,
              score: this.scoreContent(item)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit - scoredContent.length)
            .map(scored => scored.item);
          
          scoredContent.push(...additionalScored);
          console.log(`Added ${additionalScored.length} more recommendations from additional pages`);
        } catch (error) {
          console.warn('Failed to load additional content:', error);
        }
      }
      
      return scoredContent;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  // Private utility method to shuffle an array using Fisher-Yates algorithm
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Get content similar to a liked item
  async getSimilarContent(
    itemId: number,
    isMovie: boolean,
    limit: number = 10
  ): Promise<(Movie | TVShow)[]> {
    try {
      // First validate that the item exists
      const validation = await movieApi.validateContentId(itemId);
      if (!validation.exists) {
        console.warn(`Cannot get similar content for invalid ID ${itemId}`);
        return [];
      }
      
      let recommendations: (Movie | TVShow)[] = [];
      
      if (validation.type === 'movie') {
        const response = await movieApi.getMovieRecommendations(itemId);
        recommendations = response.results;
      } else if (validation.type === 'tv') {
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
