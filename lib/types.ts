export interface User {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  weekly_goal: number;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  fdc_id: number;                  // USDA FoodData Central ID
  food_name: string;
  food_data_type?: string;         // SR_Legacy, Branded, etc.
  food_nutrients?: Record<string, any>;
  logged_date: string; // DATE
  logged_at: string;   // TIMESTAMP
  created_at: string;
}

export interface Food {
  id: string;
  fdc_id: number;                  // USDA FoodData Central ID
  name: string;
  data_type?: string;              // SR_Legacy, Branded, etc.
  food_nutrients?: Record<string, any>;
  created_at: string;
}

export interface ShareLog {
  id: string;
  user_id: string;
  week_starting_date: string;
  week_ending_date: string;
  foods_count: number;
  goal_count: number;
  platform?: string; // 'instagram' | 'twitter' | 'facebook' | 'copied' | null
  shared_at: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  requested_at: string;
  responded_at?: string;
  created_at: string;
}

export interface WeeklyReaction {
  id: string;
  from_user_id: string;
  to_user_id: string;
  week_starting_date: string;
  emoji: string;
  created_at: string;
}

export interface FriendWithProgress {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  weekly_goal: number;
  foods_count: number;
  reaction?: WeeklyReaction;
}

export interface EdamamFoodResult {
  food: {
    uri: string;
    label: string;
    knownAs?: string;
    category?: string;
    categoryLabel?: string;
    image?: string;
    nutrients?: Record<string, any>;
  };
}

// USDA FoodData Central API Types
export interface USDAFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: USDAFoodNutrient[];
}

export interface USDASearchResponse {
  foods: USDAFood[];
  totalHits?: number;
  currentPage?: number;
  totalPages?: number;
}

// Helper function to format date in local timezone as YYYY-MM-DD
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function for week calculations (Monday-Sunday)
export function getWeekDates(date: Date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday

  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    week_starting_date: formatLocalDate(monday), // YYYY-MM-DD in local timezone
    week_ending_date: formatLocalDate(sunday),   // YYYY-MM-DD in local timezone
  };
}