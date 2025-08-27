export interface ServiceOption {
  value: string
  label: string
  featured?: boolean
  description?: string
}

export const availableServices: ServiceOption[] = [
  { 
    value: 'dinner-dates', 
    label: 'Dinner Dates',
    featured: true,
    description: 'Elegant dining experiences at fine restaurants' 
  },
  { 
    value: 'travel-companion', 
    label: 'Travel Companion',
    featured: true,
    description: 'Professional companionship for business or leisure travel' 
  },
  { 
    value: 'event-accompaniment', 
    label: 'Event Accompaniment',
    description: 'Sophisticated presence at social gatherings and events' 
  },
  { 
    value: 'vip-events', 
    label: 'VIP Events',
    featured: true,
    description: 'Exclusive access to high-profile events and galas' 
  },
  { 
    value: 'private-experiences', 
    label: 'Private Experiences',
    description: 'Personalized and intimate companionship services' 
  },
  { 
    value: 'business-functions', 
    label: 'Business Functions',
    description: 'Professional presence at corporate events and meetings' 
  },
  { 
    value: 'weekend-getaways', 
    label: 'Weekend Getaways',
    description: 'Relaxing companion for short trips and retreats' 
  }
]

export const getServiceLabel = (value: string): string => {
  const service = availableServices.find(s => s.value === value)
  return service ? service.label : value
}

export const getServiceValue = (label: string): string => {
  const service = availableServices.find(s => s.label === label)
  return service ? service.value : label.toLowerCase().replace(/\s+/g, '-')
}
