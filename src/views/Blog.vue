<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const blogPosts = ref([
  {
    id: 1,
    title: "The Art of Sophisticated Companionship",
    excerpt: "Discover what makes a truly exceptional companion experience and how to make the most of your time together.",
    content: "In the world of elite companionship, sophistication goes beyond mere appearance...",
    author: "Elite Companions Team",
    date: "December 10, 2024",
    readTime: "5 min read",
    category: "Lifestyle",
    image: "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    featured: true
  },
  {
    id: 2,
    title: "Business Event Etiquette: Making the Right Impression",
    excerpt: "Essential tips for navigating business events with confidence and grace when accompanied by a professional companion.",
    content: "Business events require a delicate balance of professionalism and social grace...",
    author: "Sarah Johnson",
    date: "December 5, 2024",
    readTime: "7 min read",
    category: "Business",
    image: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    featured: false
  },
  {
    id: 3,
    title: "Travel Companion Guide: Making Every Journey Memorable",
    excerpt: "How to choose the perfect travel companion and create unforgettable experiences during your business or leisure trips.",
    content: "Traveling with a companion can transform an ordinary trip into an extraordinary experience...",
    author: "Michael Chen",
    date: "November 28, 2024",
    readTime: "6 min read",
    category: "Travel",
    image: "https://images.pexels.com/photos/1388030/pexels-photo-1388030.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    featured: false
  },
  {
    id: 4,
    title: "Fine Dining Experiences: A Guide to Culinary Excellence",
    excerpt: "Explore the world of fine dining and learn how to create memorable culinary experiences with your companion.",
    content: "Fine dining is an art form that combines exceptional cuisine with impeccable service...",
    author: "Emma Rodriguez",
    date: "November 20, 2024",
    readTime: "4 min read",
    category: "Dining",
    image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    featured: false
  },
  {
    id: 5,
    title: "Privacy and Discretion: Our Commitment to Confidentiality",
    excerpt: "Understanding the importance of privacy in companion services and how we protect our clients' confidentiality.",
    content: "Privacy and discretion are the cornerstones of our service philosophy...",
    author: "Elite Companions Team",
    date: "November 15, 2024",
    readTime: "3 min read",
    category: "Privacy",
    image: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    featured: false
  },
  {
    id: 6,
    title: "Cultural Events and Social Gatherings: Your Perfect Plus-One",
    excerpt: "Navigate cultural events and social gatherings with confidence when accompanied by a sophisticated companion.",
    content: "Cultural events offer unique opportunities for meaningful connections and experiences...",
    author: "Sarah Johnson",
    date: "November 8, 2024",
    readTime: "5 min read",
    category: "Culture",
    image: "https://images.pexels.com/photos/1308885/pexels-photo-1308885.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    featured: false
  }
])

const categories = ref([
  "All",
  "Lifestyle",
  "Business", 
  "Travel",
  "Dining",
  "Privacy",
  "Culture"
])

const selectedCategory = ref("All")
const filteredPosts = ref(blogPosts.value)

const filterByCategory = (category: string) => {
  selectedCategory.value = category
  if (category === "All") {
    filteredPosts.value = blogPosts.value
  } else {
    filteredPosts.value = blogPosts.value.filter(post => post.category === category)
  }
}

const navigateToContact = () => {
  router.push('/contact')
}

const readPost = (postId: number) => {
  // In a real app, this would navigate to a detailed blog post page
  console.log(`Reading post ${postId}`)
}
</script>

<template>
  <div class="blog-page">
    <!-- Header section -->
    <div class="page-header">
      <div class="container">
        <h1>Elite Insights Blog</h1>
        <p>Expert advice, tips, and insights from the world of elite companionship</p>
      </div>
    </div>
    
    <div class="container">
      <!-- Featured post -->
      <section class="featured-section section">
        <div v-if="blogPosts.find(post => post.featured)" class="featured-post">
          <div class="featured-image">
            <img :src="blogPosts.find(post => post.featured)?.image" alt="Featured post">
            <div class="featured-badge">Featured</div>
          </div>
          <div class="featured-content">
            <div class="post-meta">
              <span class="category">{{ blogPosts.find(post => post.featured)?.category }}</span>
              <span class="date">{{ blogPosts.find(post => post.featured)?.date }}</span>
              <span class="read-time">{{ blogPosts.find(post => post.featured)?.readTime }}</span>
            </div>
            <h2>{{ blogPosts.find(post => post.featured)?.title }}</h2>
            <p class="excerpt">{{ blogPosts.find(post => post.featured)?.excerpt }}</p>
            <div class="author-info">
              <span class="author">By {{ blogPosts.find(post => post.featured)?.author }}</span>
            </div>
            <button @click="readPost(blogPosts.find(post => post.featured)?.id)" class="btn btn-primary">
              Read Full Article
            </button>
          </div>
        </div>
      </section>
      
      <!-- Category filter -->
      <section class="filter-section">
        <div class="category-filters">
          <button 
            v-for="category in categories" 
            :key="category"
            :class="['filter-btn', { active: selectedCategory === category }]"
            @click="filterByCategory(category)"
          >
            {{ category }}
          </button>
        </div>
      </section>
      
      <!-- Blog posts grid -->
      <section class="posts-section section">
        <div class="posts-grid">
          <article 
            v-for="post in filteredPosts.filter(p => !p.featured)" 
            :key="post.id" 
            class="post-card"
          >
            <div class="post-image">
              <img :src="post.image" :alt="post.title">
              <div class="post-category">{{ post.category }}</div>
            </div>
            <div class="post-content">
              <div class="post-meta">
                <span class="date">{{ post.date }}</span>
                <span class="read-time">{{ post.readTime }}</span>
              </div>
              <h3 class="post-title">{{ post.title }}</h3>
              <p class="post-excerpt">{{ post.excerpt }}</p>
              <div class="post-footer">
                <span class="author">By {{ post.author }}</span>
                <button @click="readPost(post.id)" class="read-more-btn">Read More</button>
              </div>
            </div>
          </article>
        </div>
      </section>
      
      <!-- Newsletter signup -->
      <section class="newsletter-section section">
        <div class="newsletter-content">
          <h2>Stay Updated</h2>
          <p>Subscribe to our newsletter for the latest insights, tips, and exclusive content.</p>
          <form class="newsletter-form">
            <input type="email" placeholder="Enter your email address" required>
            <button type="submit" class="btn btn-primary">Subscribe</button>
          </form>
          <p class="newsletter-note">We respect your privacy. Unsubscribe at any time.</p>
        </div>
      </section>
      
      <!-- Topics we cover -->
      <section class="topics-section section">
        <div class="section-header">
          <h2>Topics We Cover</h2>
          <p>Explore our comprehensive range of topics designed to enhance your companion experience</p>
        </div>
        
        <div class="topics-grid">
          <div class="topic-item">
            <div class="topic-icon">🎭</div>
            <h3>Event Etiquette</h3>
            <p>Master the art of social grace at business events, galas, and cultural gatherings.</p>
          </div>
          
          <div class="topic-item">
            <div class="topic-icon">✈️</div>
            <h3>Travel Tips</h3>
            <p>Make the most of your travel experiences with expert companion travel advice.</p>
          </div>
          
          <div class="topic-item">
            <div class="topic-icon">🍷</div>
            <h3>Fine Dining</h3>
            <p>Navigate the world of haute cuisine and create memorable dining experiences.</p>
          </div>
          
          <div class="topic-item">
            <div class="topic-icon">💼</div>
            <h3>Business Protocol</h3>
            <p>Professional guidance for business functions and corporate entertainment.</p>
          </div>
          
          <div class="topic-item">
            <div class="topic-icon">🔒</div>
            <h3>Privacy & Discretion</h3>
            <p>Understanding confidentiality and maintaining privacy in all interactions.</p>
          </div>
          
          <div class="topic-item">
            <div class="topic-icon">🌟</div>
            <h3>Lifestyle Enhancement</h3>
            <p>Tips for elevating your social experiences and personal development.</p>
          </div>
        </div>
      </section>
      
      <!-- CTA section -->
      <section class="cta-section">
        <div class="cta-content">
          <h2>Have Questions?</h2>
          <p>Our team is here to provide personalized advice and answer any questions about our services.</p>
          <button @click="navigateToContact" class="btn btn-primary btn-lg">Contact Our Experts</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.blog-page {
  padding-top: 70px;
}

.page-header {
  background-color: var(--color-primary-dark);
  color: white;
  padding: var(--spacing-xl) 0;
  margin-bottom: var(--spacing-xl);
  
  h1 {
    color: white;
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1.1rem;
  }
}

.featured-section {
  margin-bottom: var(--spacing-xxl);
}

.featured-post {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
  background-color: white;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.featured-image {
  position: relative;
  height: 400px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .featured-badge {
    position: absolute;
    top: var(--spacing-md);
    left: var(--spacing-md);
    background-color: var(--color-accent);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius-sm);
    font-weight: 600;
    font-size: 0.9rem;
  }
}

.featured-content {
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  justify-content: center;
  
  .post-meta {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    font-size: 0.9rem;
    
    .category {
      background-color: var(--color-primary);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: var(--border-radius-sm);
      font-weight: 500;
    }
    
    .date, .read-time {
      color: var(--color-text-light);
    }
  }
  
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
    font-size: 1.75rem;
  }
  
  .excerpt {
    color: var(--color-text);
    line-height: 1.6;
    margin-bottom: var(--spacing-lg);
    font-size: 1.1rem;
  }
  
  .author-info {
    margin-bottom: var(--spacing-lg);
    
    .author {
      color: var(--color-text-light);
      font-style: italic;
    }
  }
}

.filter-section {
  margin-bottom: var(--spacing-xl);
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  justify-content: center;
}

.filter-btn {
  background-color: white;
  border: 2px solid var(--color-primary-light);
  color: var(--color-primary);
  padding: 0.5rem 1.5rem;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  
  &:hover, &.active {
    background-color: var(--color-primary);
    color: white;
  }
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-xl);
}

.post-card {
  background-color: white;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
}

.post-image {
  position: relative;
  height: 200px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .post-category {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    background-color: var(--color-primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: var(--border-radius-sm);
    font-size: 0.8rem;
    font-weight: 500;
  }
}

.post-content {
  padding: var(--spacing-lg);
  
  .post-meta {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    font-size: 0.9rem;
    color: var(--color-text-light);
  }
  
  .post-title {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
    font-size: 1.3rem;
    line-height: 1.3;
  }
  
  .post-excerpt {
    color: var(--color-text);
    line-height: 1.6;
    margin-bottom: var(--spacing-md);
  }
  
  .post-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .author {
      color: var(--color-text-light);
      font-style: italic;
      font-size: 0.9rem;
    }
    
    .read-more-btn {
      background: none;
      border: none;
      color: var(--color-primary);
      font-weight: 600;
      cursor: pointer;
      transition: color 0.2s ease;
      
      &:hover {
        color: var(--color-primary-light);
      }
    }
  }
}

.newsletter-section {
  background-color: var(--color-background-alt);
  padding: var(--spacing-xxl) 0;
  margin: var(--spacing-xxl) calc(-50vw + 50%);
  text-align: center;
}

.newsletter-content {
  max-width: 600px;
  margin: 0 auto;
  
  h2 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-md);
  }
  
  p {
    color: var(--color-text);
    margin-bottom: var(--spacing-lg);
    font-size: 1.1rem;
  }
}

.newsletter-form {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  
  input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid #ddd;
    border-radius: var(--border-radius-md);
    font-size: 1rem;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
  
  button {
    padding: 0.75rem 2rem;
    white-space: nowrap;
  }
}

.newsletter-note {
  color: var(--color-text-light);
  font-size: 0.9rem;
  margin: 0;
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  
  h2 {
    color: var(--color-primary-dark);
    position: relative;
    display: inline-block;
    padding-bottom: var(--spacing-sm);
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 3px;
      background-color: var(--color-accent);
    }
  }
  
  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
    max-width: 600px;
    margin: var(--spacing-md) auto 0;
  }
}

.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.topic-item {
  background-color: white;
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .topic-icon {
    font-size: 2.5rem;
    margin-bottom: var(--spacing-md);
  }
  
  h3 {
    color: var(--color-primary-dark);
    margin-bottom: var(--spacing-sm);
  }
  
  p {
    color: var(--color-text-light);
    line-height: 1.6;
  }
}

.cta-section {
  background-image: linear-gradient(to right, rgba(106, 13, 173, 0.9), rgba(150, 74, 84, 0.9)), url('https://images.pexels.com/photos/2117256/pexels-photo-2117256.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2');
  background-size: cover;
  background-position: center;
  color: white;
  padding: var(--spacing-xxl) 0;
  margin: var(--spacing-xxl) calc(-50vw + 50%);
  text-align: center;
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
  
  h2 {
    color: white;
    margin-bottom: var(--spacing-md);
  }
  
  p {
    margin-bottom: var(--spacing-lg);
    font-size: 1.2rem;
  }
  
  .btn-lg {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
  }
}

@media (max-width: 992px) {
  .featured-post {
    grid-template-columns: 1fr;
  }
  
  .featured-image {
    height: 300px;
  }
  
  .newsletter-form {
    flex-direction: column;
    
    button {
      width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }
  
  .topics-grid {
    grid-template-columns: 1fr;
  }
  
  .category-filters {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: var(--spacing-sm);
  }
  
  .filter-btn {
    white-space: nowrap;
  }
  
  .newsletter-section,
  .cta-section {
    margin: var(--spacing-xl) calc(-50vw + 50% + var(--spacing-md));
  }
}
</style>