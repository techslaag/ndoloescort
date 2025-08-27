// Temporary mock data service for escorts
// In a production app, this would connect to an API

interface Escort {
  id: number;
  name: string;
  age: number;
  location: string;
  rating: number;
  rate: string;
  profileImage: string;
  gallery: string[];
  description: string;
  services: string[];
  languages: string[];
  availability: string[];
  height: string;
  measurements: string;
  hairColor: string;
  eyeColor: string;
  nationality: string;
}

const mockEscorts: Escort[] = [
  {
    id: 1,
    name: "Sophia",
    age: 25,
    location: "New York",
    rating: 4.9,
    rate: "$400/hr",
    profileImage: "https://images.pexels.com/photos/1839248/pexels-photo-1839248.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    gallery: [
      "https://images.pexels.com/photos/1839248/pexels-photo-1839248.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1642228/pexels-photo-1642228.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    ],
    description: "Sophisticated and elegant companion with a passion for fine dining and cultural events. I'm well-traveled, educated, and enjoy stimulating conversation as much as quiet moments.",
    services: ["Dinner Dates", "Cultural Events", "Weekend Getaways", "Private Parties"],
    languages: ["English", "French", "Italian"],
    availability: ["Mon-Fri: 7PM-12AM", "Weekends: All day"],
    height: "5'8\"",
    measurements: "34-26-36",
    hairColor: "Blonde",
    eyeColor: "Blue",
    nationality: "American"
  },
  {
    id: 2,
    name: "Isabella",
    age: 27,
    location: "Los Angeles",
    rating: 4.8,
    rate: "$350/hr",
    profileImage: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    gallery: [
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1308885/pexels-photo-1308885.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    ],
    description: "Vivacious and charming with a love for adventure and new experiences. I'm the perfect companion for clients seeking both excitement and meaningful connection. Let me bring joy to your special occasion.",
    services: ["Event Accompaniment", "Travel Companion", "Dinner Dates", "Private Experiences"],
    languages: ["English", "Spanish"],
    availability: ["Tue-Sun: 6PM-2AM"],
    height: "5'7\"",
    measurements: "36-24-36",
    hairColor: "Brunette",
    eyeColor: "Brown",
    nationality: "Spanish-American"
  },
  {
    id: 3,
    name: "Victoria",
    age: 29,
    location: "Miami",
    rating: 5.0,
    rate: "$500/hr",
    profileImage: "https://images.pexels.com/photos/1987301/pexels-photo-1987301.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    gallery: [
      "https://images.pexels.com/photos/1987301/pexels-photo-1987301.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1139612/pexels-photo-1139612.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1136563/pexels-photo-1136563.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    ],
    description: "Elite, high-class companion with sophistication and grace. I combine beauty, intelligence, and a warm personality to provide the ultimate companion experience. Perfectly suited for VIP events.",
    services: ["VIP Events", "Luxury Travel", "Weekend Companions", "Business Functions"],
    languages: ["English", "Russian", "French"],
    availability: ["By appointment only"],
    height: "5'9\"",
    measurements: "34-24-36",
    hairColor: "Black",
    eyeColor: "Green",
    nationality: "Russian-American"
  },
  {
    id: 4,
    name: "Olivia",
    age: 24,
    location: "Chicago",
    rating: 4.7,
    rate: "$300/hr",
    profileImage: "https://images.pexels.com/photos/573299/pexels-photo-573299.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    gallery: [
      "https://images.pexels.com/photos/573299/pexels-photo-573299.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1771383/pexels-photo-1771383.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
      "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
    ],
    description: "Fresh, vibrant personality with a genuine interest in connecting with others. I provide a girlfriend experience that will make you feel comfortable and special. Perfect for those seeking authenticity.",
    services: ["Dinner Dates", "Cultural Events", "Private Experiences", "Local Exploration"],
    languages: ["English"],
    availability: ["Wed-Sun: 5PM-1AM"],
    height: "5'6\"",
    measurements: "34-25-35",
    hairColor: "Auburn",
    eyeColor: "Hazel",
    nationality: "American"
  }
];

// Service functions
export const fetchAllEscorts = (): Promise<Escort[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockEscorts);
    }, 800);
  });
};

export const fetchFeaturedEscorts = (): Promise<Escort[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockEscorts.slice(0, 3));
    }, 800);
  });
};

export const fetchEscortById = (id: number): Promise<Escort | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const escort = mockEscorts.find(e => e.id === id);
      resolve(escort);
    }, 500);
  });
};

export const searchEscorts = (query: string): Promise<Escort[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const results = mockEscorts.filter(escort => 
        escort.name.toLowerCase().includes(query.toLowerCase()) ||
        escort.location.toLowerCase().includes(query.toLowerCase()) ||
        escort.services.some(service => service.toLowerCase().includes(query.toLowerCase()))
      );
      resolve(results);
    }, 600);
  });
};

export const filterEscortsByLocation = (location: string): Promise<Escort[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const results = mockEscorts.filter(escort => 
        escort.location.toLowerCase() === location.toLowerCase()
      );
      resolve(results);
    }, 600);
  });
};

export const filterEscortsByService = (service: string): Promise<Escort[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const results = mockEscorts.filter(escort => 
        escort.services.some(s => s.toLowerCase() === service.toLowerCase())
      );
      resolve(results);
    }, 600);
  });
};